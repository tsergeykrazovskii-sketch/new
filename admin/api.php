<?php
/*
 * Слот — серверная часть админки. Один файл, без базы данных.
 *   ?action=session  — вошёл ли владелец, задан ли пароль
 *   ?action=setup    — задать пароль при первом входе: только пока его нет и только с кодом
 *                      первого входа из admin/config.php (иначе пароль задал бы любой посетитель)
 *   ?action=login / logout
 *   ?action=save     — сохранить data.json и index.html сайта (заодно robots.txt и sitemap.xml)
 *   ?action=password — сменить пароль (нужен старый)
 *   ?action=versions / version — прошлые версии данных сайта (резервные копии при сохранении)
 *   ?action=upload   — загрузить фото мастера в /uploads
 *   ?action=book     — заявка с сайта: сохраняем и отправляем администратору (статус «новая»)
 *   ?action=bookings — последние заявки для админки
 *   ?action=booking-status — подтвердить / отменить заявку (подтверждённая занимает время)
 *   ?action=busy     — занятое время для сайта: только подтверждённые заявки, без имён и телефонов
 *   ?action=notify-get / notify-save / notify-connect / notify-test / notify-forget
 *                    — куда присылать заявки: почта, Telegram, ВКонтакте, MAX (вкладка «Уведомления»)
 * Настройки уведомлений владелец задаёт в админке; они лежат в admin/private/notify.php.
 * Пока их нет, действуют старые поля из admin/config.php (см. config.example.php).
 */
declare(strict_types=1);

ini_set('session.use_strict_mode', '1');
ini_set('session.gc_maxlifetime', '43200');
session_set_cookie_params([
    'httponly' => true,
    'samesite' => 'Strict',
    'secure' => !empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off',
]);
session_name('slot_admin');
session_start();
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: DENY');
header('Referrer-Policy: no-referrer');

$ROOT = dirname(__DIR__);
$PRIVATE = __DIR__ . '/private';
$AUTH_FILE = $PRIVATE . '/auth.php';
$BOOKINGS_FILE = $PRIVATE . '/bookings.php';
$LIMITS_FILE = $PRIVATE . '/limits.php';
$LOG_FILE = $PRIVATE . '/errors.php';
$NOTIFY_FILE = $PRIVATE . '/notify.php';       // настройки уведомлений из админки (ключи и пароли — только здесь)
$NOTIFY_LAST = $PRIVATE . '/notify-last.php';  // чем закончилась последняя отправка
$cfg = is_file(__DIR__ . '/config.php') ? (array) require __DIR__ . '/config.php' : [];
const SESSION_IDLE = 12 * 3600; // после 12 часов без действий — войти заново

function out(array $a, int $code = 200): void
{
    http_response_code($code);
    echo json_encode($a, JSON_UNESCAPED_UNICODE);
    exit;
}

function body(): array
{
    $b = json_decode((string) file_get_contents('php://input'), true);
    return is_array($b) ? $b : [];
}

function authed(): bool
{
    if (empty($_SESSION['slot_auth'])) {
        return false;
    }
    // после смены пароля входы на других устройствах больше не действуют
    if (time() - (int) ($_SESSION['slot_seen'] ?? 0) > SESSION_IDLE || ($_SESSION['slot_pw'] ?? '') !== pw_stamp()) {
        $_SESSION = [];
        return false;
    }
    $_SESSION['slot_seen'] = time();
    return true;
}

function pw_stamp(): string
{
    global $AUTH_FILE;
    return is_file($AUTH_FILE) ? (string) md5_file($AUTH_FILE) : '';
}

function need_auth(): void
{
    $t = (string) ($_SERVER['HTTP_X_CSRF'] ?? '');
    if (!authed() || !hash_equals((string) ($_SESSION['slot_csrf'] ?? ''), $t)) {
        out(['ok' => false, 'error' => 'Нужно войти заново'], 401);
    }
}

function need_post(): void
{
    if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
        out(['ok' => false, 'error' => 'Нужен POST-запрос'], 405);
    }
}

// Запись через временный файл, чтобы сайт никогда не оказался наполовину сохранённым
function write_atomic(string $path, string $data): void
{
    $dir = dirname($path);
    if (!is_dir($dir) && !mkdir($dir, 0750, true)) {
        out(['ok' => false, 'error' => 'Не удалось создать папку ' . basename($dir)], 500);
    }
    $tmp = $path . '.tmp' . bin2hex(random_bytes(4));
    if (file_put_contents($tmp, $data, LOCK_EX) === false || !rename($tmp, $path)) {
        @unlink($tmp);
        out(['ok' => false, 'error' => 'Не удалось записать файл. Проверьте права на папку сайта.'], 500);
    }
}

// Закрытые файлы — PHP с exit в начале: даже если сервер отдаст их напрямую, содержимое не утечёт
const GUARD = "<?php exit; ?>\n";

function start_session(): string
{
    session_regenerate_id(true);
    $_SESSION['slot_auth'] = true;
    $_SESSION['slot_seen'] = time();
    $_SESSION['slot_csrf'] = bin2hex(random_bytes(16));
    $_SESSION['slot_pw'] = pw_stamp();
    return $_SESSION['slot_csrf'];
}

// Адрес посетителя. Заголовкам вроде X-Forwarded-For не верим: их может подставить кто угодно.
function client_ip(): string
{
    return (string) ($_SERVER['REMOTE_ADDR'] ?? '');
}

/*
 * Ограничения по частоте: сколько раз событие случилось за окно времени.
 * Считаем на сервере по IP (сессию бот просто не сохранит), храним в закрытом файле.
 *   limit_hits('login:' . ip, 900) — сколько неудачных входов за 15 минут
 *   limit_add('login:' . ip)       — записать ещё одно
 */
function limits_rw(callable $fn)
{
    global $LIMITS_FILE;
    $dir = dirname($LIMITS_FILE);
    if (!is_dir($dir)) {
        mkdir($dir, 0750, true);
    }
    $h = fopen($LIMITS_FILE, 'c+');
    if (!$h) {
        return $fn([])[1];
    }
    flock($h, LOCK_EX);
    $raw = stream_get_contents($h);
    $all = json_decode(substr((string) $raw, strlen(GUARD)), true);
    [$all, $result] = $fn(is_array($all) ? $all : []);
    // старше суток не нужно ни одному окну
    foreach ($all as $k => $times) {
        $all[$k] = array_values(array_filter($times, fn($t) => time() - $t < 86400));
        if (!$all[$k]) {
            unset($all[$k]);
        }
    }
    ftruncate($h, 0);
    rewind($h);
    fwrite($h, GUARD . json_encode($all));
    flock($h, LOCK_UN);
    fclose($h);
    return $result;
}

function limit_key(string $bucket): string
{
    return $bucket . ':' . substr(hash('sha256', client_ip()), 0, 16);
}

function limit_hits(string $key, int $window): int
{
    return limits_rw(fn($all) => [$all, count(array_filter($all[$key] ?? [], fn($t) => time() - $t < $window))]);
}

function limit_add(string $key): void
{
    limits_rw(function ($all) use ($key) {
        $all[$key][] = time();
        return [$all, null];
    });
}

function limit_clear(string $key): void
{
    limits_rw(function ($all) use ($key) {
        unset($all[$key]);
        return [$all, null];
    });
}

// Все заявки из закрытого файла (первая строка — защита GUARD)
function read_bookings(): array
{
    global $BOOKINGS_FILE;
    if (!is_file($BOOKINGS_FILE)) {
        return [];
    }
    $out = [];
    foreach (array_slice(file($BOOKINGS_FILE, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) ?: [], 1) as $l) {
        $j = json_decode($l, true);
        if (is_array($j)) {
            $out[] = $j;
        }
    }
    return $out;
}

function log_error(string $msg): void
{
    global $LOG_FILE;
    if (!is_file($LOG_FILE)) {
        write_atomic($LOG_FILE, GUARD);
    }
    @file_put_contents($LOG_FILE, date('d.m.Y H:i') . ' ' . $msg . "\n", FILE_APPEND | LOCK_EX);
}

/*
 * Письмо владельцу. Через почтовый ящик (Яндекс, Mail.ru — с паролем приложения) письма
 * не попадают в спам; без ящика — через mail() хостинга. Возвращает '' или понятную ошибку.
 */
function smtp_read($fp): string
{
    $resp = '';
    while (($line = fgets($fp, 1024)) !== false) {
        $resp .= $line;
        if (strlen($line) < 4 || $line[3] === ' ') {
            break;
        }
    }
    return $resp;
}

function smtp_cmd($fp, ?string $cmd, int $expect): void
{
    if ($cmd !== null) {
        fwrite($fp, $cmd . "\r\n");
    }
    $resp = smtp_read($fp);
    if ((int) substr($resp, 0, 3) !== $expect) {
        throw new RuntimeException(trim($resp) ?: 'сервер не ответил');
    }
}

function send_mail(array $m, string $to, string $subject, string $text): string
{
    $subj = '=?UTF-8?B?' . base64_encode($subject) . '?=';
    if (empty($m['smtp_host'])) {
        return @mail($to, $subj, $text, "Content-Type: text/plain; charset=utf-8\r\n")
            ? ''
            : 'Почта хостинга не отправила письмо. Выберите отправку через Яндекс Почту или Mail.ru.';
    }
    $host = (string) $m['smtp_host'];
    $port = (int) ($m['smtp_port'] ?? 465);
    $secure = (string) ($m['smtp_secure'] ?? 'ssl'); // ssl (465) | tls (587, STARTTLS) | '' (без шифрования)
    $user = (string) ($m['smtp_user'] ?? '');
    $from = $user ?: 'noreply@' . ($_SERVER['HTTP_HOST'] ?? 'localhost');
    $fp = @stream_socket_client(($secure === 'ssl' ? 'ssl://' : 'tcp://') . $host . ':' . $port, $errno, $errstr, 10);
    if (!$fp) {
        log_error("SMTP: не удалось подключиться к $host:$port ($errstr)");
        return "Не удалось подключиться к почтовому серверу $host. Попробуйте позже или выберите другой способ отправки.";
    }
    stream_set_timeout($fp, 10);
    $step = 'connect';
    try {
        $me = preg_replace('/[^a-z0-9.-]/i', '', explode(':', (string) ($_SERVER['HTTP_HOST'] ?? 'localhost'))[0]) ?: 'localhost';
        smtp_cmd($fp, null, 220);
        smtp_cmd($fp, "EHLO $me", 250);
        if ($secure === 'tls') {
            smtp_cmd($fp, 'STARTTLS', 220);
            if (!stream_socket_enable_crypto($fp, true, STREAM_CRYPTO_METHOD_TLS_CLIENT)) {
                throw new RuntimeException('не удалось включить TLS');
            }
            smtp_cmd($fp, "EHLO $me", 250);
        }
        if ($user !== '') {
            $step = 'auth';
            smtp_cmd($fp, 'AUTH LOGIN', 334);
            smtp_cmd($fp, base64_encode($user), 334);
            smtp_cmd($fp, base64_encode((string) ($m['smtp_pass'] ?? '')), 235);
        }
        $step = 'send';
        $addr = fn(string $a) => '<' . preg_replace('/[\r\n<>]/', '', $a) . '>';
        smtp_cmd($fp, 'MAIL FROM:' . $addr($from), 250);
        $step = 'rcpt';
        smtp_cmd($fp, 'RCPT TO:' . $addr($to), 250);
        $step = 'send';
        smtp_cmd($fp, 'DATA', 354);
        $body = preg_replace('/^\./m', '..', str_replace(["\r\n", "\r", "\n"], "\r\n", $text));
        $msg = 'From: ' . $addr($from) . "\r\n"
            . 'To: ' . $addr($to) . "\r\n"
            . "Subject: $subj\r\n"
            . 'Date: ' . date('r') . "\r\n"
            . "MIME-Version: 1.0\r\nContent-Type: text/plain; charset=utf-8\r\nContent-Transfer-Encoding: 8bit\r\n\r\n"
            . $body . "\r\n.";
        smtp_cmd($fp, $msg, 250);
        fwrite($fp, "QUIT\r\n");
        fclose($fp);
        return '';
    } catch (RuntimeException $e) {
        log_error('SMTP: ' . $e->getMessage());
        fclose($fp);
        if ($step === 'auth') {
            return 'Почта не приняла ящик или пароль. Нужен «пароль приложения», а не обычный пароль от почты (как его получить — в подсказке ниже).';
        }
        if ($step === 'rcpt') {
            return "Почта не принимает адрес $to — проверьте, нет ли в нём опечатки.";
        }
        return 'Почтовый сервер не принял письмо: ' . mb_substr($e->getMessage(), 0, 160);
    }
}

/* ---------- уведомления о заявках: почта, Telegram, ВКонтакте, MAX ---------- */

function private_read(string $file): array
{
    if (!is_file($file)) {
        return [];
    }
    $j = json_decode(substr((string) file_get_contents($file), strlen(GUARD)), true);
    return is_array($j) ? $j : [];
}

function private_write(string $file, array $a): void
{
    write_atomic($file, GUARD . json_encode($a, JSON_UNESCAPED_UNICODE));
}

const CHANNELS = ['tg' => 'Telegram', 'vk' => 'ВКонтакте', 'max' => 'MAX'];
// Почтовые сервисы, у которых есть «пароль приложения»
const MAIL_VIA = ['yandex' => ['smtp.yandex.ru', 465, 'ssl'], 'mailru' => ['smtp.mail.ru', 465, 'ssl']];

function notify_defaults(): array
{
    $ch = ['on' => false, 'token' => '', 'chat' => '', 'name' => ''];
    return ['email' => ['on' => false, 'to' => '', 'via' => 'yandex', 'user' => '', 'pass' => ''], 'tg' => $ch, 'vk' => $ch, 'max' => $ch];
}

// Настройки из админки; пока их нет — старые поля config.php, чтобы уже сданные сайты не замолчали
function notify_settings(): array
{
    global $cfg, $NOTIFY_FILE;
    $n = private_read($NOTIFY_FILE);
    if (!$n) {
        if (!empty($cfg['notify_email'])) {
            $host = (string) ($cfg['smtp_host'] ?? '');
            $via = $host === '' ? 'host' : (string) (array_search($host, array_map(fn($v) => $v[0], MAIL_VIA), true) ?: 'custom');
            $n['email'] = [
                'on' => true, 'to' => (string) $cfg['notify_email'], 'via' => $via,
                'user' => (string) ($cfg['smtp_user'] ?? ''), 'pass' => (string) ($cfg['smtp_pass'] ?? ''),
                'host' => $host, 'port' => (int) ($cfg['smtp_port'] ?? 465), 'secure' => (string) ($cfg['smtp_secure'] ?? 'ssl'),
            ];
        }
        if (!empty($cfg['telegram_bot_token']) && !empty($cfg['telegram_chat_id'])) {
            $n['tg'] = ['on' => true, 'token' => (string) $cfg['telegram_bot_token'], 'chat' => (string) $cfg['telegram_chat_id'], 'name' => ''];
        }
    }
    foreach (notify_defaults() as $k => $v) {
        $n[$k] = array_merge($v, (array) ($n[$k] ?? []));
    }
    return $n;
}

// Что видит админка: пароли и ключи не уходят обратно в браузер, только «сохранён»
function notify_public(array $n): array
{
    $e = $n['email'];
    $out = ['email' => ['on' => (bool) $e['on'], 'to' => $e['to'], 'via' => $e['via'], 'user' => $e['user'], 'hasPass' => $e['pass'] !== '']];
    foreach (CHANNELS as $ch => $_) {
        $c = $n[$ch];
        $out[$ch] = ['on' => (bool) $c['on'], 'connected' => $c['token'] !== '' && $c['chat'] !== '', 'name' => $c['name'],
            'tokenHint' => $c['token'] !== '' ? '…' . mb_substr($c['token'], -4) : ''];
    }
    return $out;
}

function mail_settings(array $e): array
{
    global $cfg;
    if ($e['via'] === 'host') {
        return [];
    }
    [$host, $port, $secure] = $e['via'] === 'custom' ? [$e['host'] ?? '', $e['port'] ?? 465, $e['secure'] ?? 'ssl'] : MAIL_VIA[$e['via']] ?? MAIL_VIA['yandex'];
    if (!empty($cfg['test_smtp'])) {
        [$host, $port, $secure] = $cfg['test_smtp']; // только для проверки на локальном сервере
    }
    return ['smtp_host' => $host, 'smtp_port' => $port, 'smtp_secure' => $secure, 'smtp_user' => $e['user'], 'smtp_pass' => $e['pass']];
}

function mail_list(string $to): array
{
    return array_values(array_filter(array_map('trim', preg_split('/[\s,;]+/', $to) ?: [])));
}

// HTTP-запрос к API мессенджера: [код, ответ-JSON, ошибка связи]
function http_json(string $method, string $url, array $headers = [], ?string $body = null): array
{
    if (function_exists('curl_init')) {
        $h = curl_init($url);
        curl_setopt_array($h, [CURLOPT_CUSTOMREQUEST => $method, CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => 8,
            CURLOPT_CONNECTTIMEOUT => 5, CURLOPT_HTTPHEADER => $headers]);
        if ($body !== null) {
            curl_setopt($h, CURLOPT_POSTFIELDS, $body);
        }
        $raw = curl_exec($h);
        $code = (int) curl_getinfo($h, CURLINFO_RESPONSE_CODE);
        $err = $raw === false ? curl_error($h) : '';
        curl_close($h);
    } else {
        $ctx = stream_context_create(['http' => ['method' => $method, 'header' => implode("\r\n", $headers), 'content' => $body ?? '',
            'timeout' => 8, 'ignore_errors' => true]]);
        $raw = @file_get_contents($url, false, $ctx);
        $code = isset($http_response_header[0]) && preg_match('/\s(\d{3})\s?/', $http_response_header[0], $mm) ? (int) $mm[1] : 0;
        $err = $raw === false ? 'нет ответа' : '';
    }
    $j = is_string($raw) ? json_decode($raw, true) : null;
    return [$code, is_array($j) ? $j : null, $err];
}

function api_base(string $ch): string
{
    global $cfg;
    $d = ['tg' => 'https://api.telegram.org', 'vk' => 'https://api.vk.com', 'max' => 'https://platform-api2.max.ru'];
    return rtrim((string) ($cfg['test_api'][$ch] ?? $d[$ch]), '/'); // test_api — только для локальной проверки
}

// Каждая функция возвращает [результат, ''] или [null, понятная ошибка]
function tg_call(string $token, string $method, array $p = []): array
{
    [$code, $j, $err] = http_json('POST', api_base('tg') . '/bot' . rawurlencode($token) . '/' . $method, ['Content-Type: application/json'], json_encode($p));
    if ($err !== '' || !$j) {
        return [null, 'Нет связи с Telegram. В России Telegram ограничен, и с вашего хостинга он может быть недоступен — используйте почту, ВКонтакте или MAX.'];
    }
    if (!empty($j['ok'])) {
        return [$j['result'], ''];
    }
    $d = (string) ($j['description'] ?? '');
    if ($code === 401 || $code === 404) {
        return [null, 'Telegram не принял ключ бота. Скопируйте его из @BotFather ещё раз целиком.'];
    }
    if ($code === 403) {
        return [null, 'Бот не может вам написать: откройте бота в Telegram и нажмите «Запустить».'];
    }
    if ($code === 409) {
        return [null, 'Этот бот уже подключён к другой программе. Создайте в @BotFather отдельного бота для заявок.'];
    }
    return [null, 'Telegram ответил ошибкой: ' . $d];
}

function vk_call(string $token, string $method, array $p = []): array
{
    $p += ['access_token' => $token, 'v' => '5.199'];
    [, $j, $err] = http_json('POST', api_base('vk') . '/method/' . $method, ['Content-Type: application/x-www-form-urlencoded'], http_build_query($p));
    if ($err !== '' || !$j) {
        return [null, 'Нет связи с ВКонтакте. Попробуйте через минуту.'];
    }
    if (isset($j['response'])) {
        return [$j['response'], ''];
    }
    $c = (int) ($j['error']['error_code'] ?? 0);
    $map = [
        5 => 'ВКонтакте не принял ключ доступа. Создайте ключ заново и вставьте его целиком.',
        15 => 'У ключа нет доступа к сообщениям. Создайте ключ с галочкой «Сообщения сообщества».',
        27 => 'Нужен ключ доступа сообщества, а не личный. Возьмите его в настройках сообщества: «Работа с API».',
        901 => 'Сообщество не может вам написать: напишите сообществу любое сообщение со своей страницы.',
        945 => 'В сообществе выключены сообщения. Включите их: «Управление» → «Сообщения».',
    ];
    return [null, $map[$c] ?? 'ВКонтакте ответил ошибкой: ' . (string) ($j['error']['error_msg'] ?? $c)];
}

function max_call(string $token, string $method, string $path, array $q = [], ?array $body = null): array
{
    $url = api_base('max') . $path . ($q ? '?' . http_build_query($q) : '');
    [$code, $j, $err] = http_json($method, $url, ['Authorization: ' . $token, 'Content-Type: application/json'], $body === null ? null : json_encode($body, JSON_UNESCAPED_UNICODE));
    if ($err !== '' || ($code === 0)) {
        return [null, 'Нет связи с MAX. Попробуйте через минуту.'];
    }
    if ($code === 401 || $code === 403) {
        return [null, 'MAX не принял ключ бота. Скопируйте его ещё раз в кабинете MAX для бизнеса: раздел «Интеграция».'];
    }
    if ($code >= 400 || !is_array($j)) {
        return [null, 'MAX ответил ошибкой: ' . (string) ($j['message'] ?? $code)];
    }
    return [$j, ''];
}

// Найти, кому писать: последний, кто написал боту / сообществу
function channel_connect(string $ch, string $token): array
{
    if ($ch === 'tg') {
        [$me, $e] = tg_call($token, 'getMe');
        if ($e) {
            return [null, $e];
        }
        [$up, $e] = tg_call($token, 'getUpdates', ['limit' => 100]);
        if ($e) {
            return [null, $e];
        }
        foreach (array_reverse((array) $up) as $u) {
            $c = $u['message']['chat'] ?? $u['my_chat_member']['chat'] ?? null;
            if (isset($c['id'])) {
                return [['chat' => (string) $c['id'], 'name' => trim(($c['first_name'] ?? $c['title'] ?? '') . ' ' . ($c['last_name'] ?? ''))], ''];
            }
        }
        return [null, 'Бот ещё не получил от вас сообщений. Откройте @' . ($me['username'] ?? 'бота') . ' в Telegram, нажмите «Запустить» и снова нажмите «Подключить».'];
    }
    if ($ch === 'vk') {
        [$r, $e] = vk_call($token, 'messages.getConversations', ['count' => 5, 'extended' => 1]);
        if ($e) {
            return [null, $e];
        }
        foreach ((array) ($r['items'] ?? []) as $it) {
            $peer = $it['conversation']['peer'] ?? [];
            if (($peer['type'] ?? '') === 'user') {
                $name = '';
                foreach ((array) ($r['profiles'] ?? []) as $p) {
                    if ((int) ($p['id'] ?? 0) === (int) $peer['id']) {
                        $name = trim(($p['first_name'] ?? '') . ' ' . ($p['last_name'] ?? ''));
                    }
                }
                return [['chat' => (string) $peer['id'], 'name' => $name], ''];
            }
        }
        return [null, 'Сообществу ещё никто не писал. Напишите сообществу «Привет» со своей страницы ВКонтакте и снова нажмите «Подключить».'];
    }
    [, $e] = max_call($token, 'GET', '/me');
    if ($e) {
        return [null, $e];
    }
    [$r, $e] = max_call($token, 'GET', '/updates', ['limit' => 100, 'timeout' => 0]);
    if ($e) {
        return [null, $e];
    }
    foreach (array_reverse((array) ($r['updates'] ?? [])) as $u) {
        $chat = $u['chat_id'] ?? $u['message']['recipient']['chat_id'] ?? null;
        $who = $u['user'] ?? $u['message']['sender'] ?? [];
        if ($chat !== null) {
            return [['chat' => (string) $chat, 'name' => trim((string) ($who['name'] ?? (($who['first_name'] ?? '') . ' ' . ($who['last_name'] ?? ''))))], ''];
        }
    }
    return [null, 'Бот ещё не получил от вас сообщений. Найдите своего бота в MAX, нажмите «Начать» и снова нажмите «Подключить».'];
}

function channel_send(string $ch, array $c, string $text): string
{
    if ($c['token'] === '' || $c['chat'] === '') {
        return 'Не подключено';
    }
    if ($ch === 'tg') {
        return tg_call($c['token'], 'sendMessage', ['chat_id' => $c['chat'], 'text' => $text])[1];
    }
    if ($ch === 'vk') {
        return vk_call($c['token'], 'messages.send', ['peer_id' => $c['chat'], 'random_id' => random_int(1, PHP_INT_MAX), 'message' => $text])[1];
    }
    return max_call($c['token'], 'POST', '/messages', ['chat_id' => $c['chat']], ['text' => $text])[1];
}

function email_send(array $e, string $subject, string $text): string
{
    $list = mail_list($e['to']);
    if (!$list) {
        return 'Не указан адрес почты';
    }
    foreach ($list as $to) {
        $err = send_mail(mail_settings($e), $to, $subject, $text);
        if ($err !== '') {
            return $err;
        }
    }
    return '';
}

// Разослать заявку во все включённые каналы и запомнить, как прошло
function notify_all(string $subject, string $text): void
{
    global $NOTIFY_LAST;
    $n = notify_settings();
    $res = [];
    if ($n['email']['on']) {
        $res['email'] = email_send($n['email'], $subject, $text) ?: 'ok';
    }
    foreach (CHANNELS as $ch => $label) {
        if ($n[$ch]['on']) {
            $res[$ch] = channel_send($ch, $n[$ch], $text) ?: 'ok';
        }
    }
    foreach ($res as $ch => $r) {
        if ($r !== 'ok') {
            log_error('Уведомление ' . $ch . ': ' . $r);
        }
    }
    if ($res) {
        private_write($NOTIFY_LAST, ['at' => date('d.m.Y H:i'), 'res' => $res]);
    }
}

function site_name(): string
{
    global $ROOT;
    $d = json_decode((string) @file_get_contents($ROOT . '/data.json'), true);
    return (string) ($d['brand']['name'] ?? 'сайт');
}

// robots.txt и sitemap.xml для поисковиков: адрес сайта — из «Настроек» или тот, с которого открыта админка.
// Файл robots.txt, который владелец положил сам (без нашей пометки), не трогаем.
function write_seo_files(array $data): void
{
    global $ROOT;
    $url = trim((string) ($data['seo']['url'] ?? ''));
    if (!preg_match('~^https?://[^\s"\'<>]+$~', $url)) {
        $host = (string) ($_SERVER['HTTP_HOST'] ?? '');
        if (!preg_match('/^[a-z0-9.-]+(:\d+)?$/i', $host)) {
            return;
        }
        $https = !empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off';
        $url = ($https ? 'https' : 'http') . '://' . $host . rtrim(dirname(dirname((string) $_SERVER['SCRIPT_NAME'])), '/\\');
    }
    $url = rtrim($url, '/') . '/';
    $path = (string) (parse_url($url, PHP_URL_PATH) ?: '/');
    $mark = '# Слот: файл обновляется при сохранении в админке';
    $robots = $ROOT . '/robots.txt';
    if (!is_file($robots) || strpos((string) file_get_contents($robots), $mark) !== false) {
        @file_put_contents($robots, "$mark\nUser-agent: *\nDisallow: {$path}admin/\n\nSitemap: {$url}sitemap.xml\n");
    }
    $loc = htmlspecialchars($url, ENT_XML1);
    @file_put_contents($ROOT . '/sitemap.xml', "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<urlset xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\">\n  <url><loc>$loc</loc><lastmod>" . date('Y-m-d') . "</lastmod></url>\n</urlset>\n");
}

$action = (string) ($_GET['action'] ?? '');

switch ($action) {
    case 'ping':
    case 'session':
        out([
            'ok' => true,
            'slot' => 1,
            'setup' => !is_file($AUTH_FILE),
            'auth' => authed(),
            'csrf' => authed() ? $_SESSION['slot_csrf'] : null,
        ]);

    case 'setup':
        need_post();
        if (is_file($AUTH_FILE)) {
            out(['ok' => false, 'error' => 'Пароль уже задан. Войдите с ним.'], 409);
        }
        $code = trim((string) ($cfg['setup_code'] ?? ''));
        if ($code === '') {
            out(['ok' => false, 'error' => 'Не задан код первого входа: впишите setup_code в admin/config.php'], 403);
        }
        $key = limit_key('setup');
        if (limit_hits($key, 900) >= 5) {
            out(['ok' => false, 'error' => 'Слишком много попыток. Попробуйте через 15 минут.'], 429);
        }
        $b = body();
        if (!hash_equals(mb_strtoupper($code), mb_strtoupper(trim((string) ($b['code'] ?? ''))))) {
            limit_add($key);
            sleep(1);
            out(['ok' => false, 'error' => 'Неверный код первого входа'], 403);
        }
        $pass = (string) ($b['password'] ?? '');
        if (mb_strlen($pass) < 8) {
            out(['ok' => false, 'error' => 'Пароль должен быть не короче 8 символов'], 400);
        }
        write_atomic($AUTH_FILE, "<?php return " . var_export(password_hash($pass, PASSWORD_DEFAULT), true) . ";\n");
        out(['ok' => true, 'csrf' => start_session()]);

    case 'login':
        need_post();
        if (!is_file($AUTH_FILE)) {
            out(['ok' => false, 'error' => 'Пароль ещё не задан'], 409);
        }
        // 5 ошибок с одного адреса — пауза 15 минут; 50 ошибок со всех адресов за час — пауза для всех
        $key = limit_key('login');
        if (limit_hits($key, 900) >= 5 || limit_hits('login:all', 3600) >= 50) {
            out(['ok' => false, 'error' => 'Слишком много попыток. Попробуйте через 15 минут.'], 429);
        }
        $hash = (string) require $AUTH_FILE;
        if (!password_verify((string) (body()['password'] ?? ''), $hash)) {
            limit_add($key);
            limit_add('login:all');
            sleep(1);
            out(['ok' => false, 'error' => 'Неверный пароль'], 401);
        }
        limit_clear($key);
        out(['ok' => true, 'csrf' => start_session()]);

    case 'logout':
        need_post();
        $_SESSION = [];
        session_destroy();
        out(['ok' => true]);

    case 'save':
        need_post();
        need_auth();
        $b = body();
        if (!isset($b['data']) || !is_array($b['data']) || !isset($b['html']) || !is_string($b['html'])) {
            out(['ok' => false, 'error' => 'Нечего сохранять'], 400);
        }
        if (strlen($b['html']) > 5000000 || stripos($b['html'], '<!doctype html>') !== 0) {
            out(['ok' => false, 'error' => 'Страница получилась некорректной, сохранение отменено'], 400);
        }
        // Резервная копия прошлой версии, храним последние 30
        $backups = $PRIVATE . '/backups';
        if (is_file($ROOT . '/data.json')) {
            if (!is_dir($backups)) {
                mkdir($backups, 0750, true);
            }
            copy($ROOT . '/data.json', $backups . '/data-' . date('Ymd-His') . '.json');
            $old = glob($backups . '/data-*.json') ?: [];
            sort($old);
            foreach (array_slice($old, 0, max(0, count($old) - 30)) as $f) {
                @unlink($f);
            }
        }
        write_atomic($ROOT . '/data.json', json_encode($b['data'], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT));
        write_atomic($ROOT . '/index.html', $b['html']);
        write_seo_files($b['data']);
        out(['ok' => true, 'savedAt' => date('H:i')]);

    case 'password':
        need_post();
        need_auth();
        $key = limit_key('password');
        if (limit_hits($key, 900) >= 5) {
            out(['ok' => false, 'error' => 'Слишком много попыток. Попробуйте через 15 минут.'], 429);
        }
        $b = body();
        $hash = (string) require $AUTH_FILE;
        if (!password_verify((string) ($b['old'] ?? ''), $hash)) {
            limit_add($key);
            sleep(1);
            out(['ok' => false, 'error' => 'Текущий пароль введён неверно'], 403);
        }
        $pass = (string) ($b['password'] ?? '');
        if (mb_strlen($pass) < 8) {
            out(['ok' => false, 'error' => 'Новый пароль должен быть не короче 8 символов'], 400);
        }
        write_atomic($AUTH_FILE, "<?php return " . var_export(password_hash($pass, PASSWORD_DEFAULT), true) . ";\n");
        limit_clear($key);
        out(['ok' => true, 'csrf' => start_session()]);

    case 'versions':
        need_auth();
        $items = [];
        foreach (array_reverse(glob($PRIVATE . '/backups/data-*.json') ?: []) as $f) {
            if (preg_match('/data-(\d{4})(\d{2})(\d{2})-(\d{2})(\d{2})(\d{2})\.json$/', $f, $m)) {
                $items[] = ['id' => "$m[1]$m[2]$m[3]-$m[4]$m[5]$m[6]", 'at' => "$m[3].$m[2].$m[1] в $m[4]:$m[5]:$m[6]", 'size' => filesize($f)];
            }
        }
        out(['ok' => true, 'items' => $items]);

    case 'version':
        need_auth();
        $id = (string) ($_GET['id'] ?? '');
        $file = $PRIVATE . '/backups/data-' . $id . '.json';
        if (!preg_match('/^\d{8}-\d{6}$/', $id) || !is_file($file)) {
            out(['ok' => false, 'error' => 'Такой версии нет'], 404);
        }
        $d = json_decode((string) file_get_contents($file), true);
        if (!is_array($d)) {
            out(['ok' => false, 'error' => 'Версия повреждена'], 500);
        }
        out(['ok' => true, 'data' => $d]);

    case 'upload':
        need_post();
        need_auth();
        $f = $_FILES['photo'] ?? null;
        if (!$f || ($f['error'] ?? 1) !== UPLOAD_ERR_OK) {
            out(['ok' => false, 'error' => 'Фото не загрузилось'], 400);
        }
        if ($f['size'] > 3 * 1024 * 1024) {
            out(['ok' => false, 'error' => 'Фото больше 3 МБ'], 400);
        }
        $types = ['image/jpeg' => 'jpg', 'image/png' => 'png', 'image/webp' => 'webp'];
        $mime = (string) (new finfo(FILEINFO_MIME_TYPE))->file($f['tmp_name']);
        if (!isset($types[$mime]) || !getimagesize($f['tmp_name'])) {
            out(['ok' => false, 'error' => 'Подходят только фото JPG, PNG или WebP'], 400);
        }
        $dir = $ROOT . '/uploads';
        if (!is_dir($dir) && !mkdir($dir, 0755, true)) {
            out(['ok' => false, 'error' => 'Не удалось создать папку uploads'], 500);
        }
        // в папке фото сервер не должен исполнять скрипты, даже если туда что-то попадёт
        if (!is_file($dir . '/.htaccess')) {
            @file_put_contents($dir . '/.htaccess', "Options -Indexes\n<FilesMatch \"\\.(php\\d?|phtml|phar|pl|py|cgi|sh)$\">\n  Require all denied\n</FilesMatch>\n");
        }
        $name = date('Ymd') . '-' . bin2hex(random_bytes(6)) . '.' . $types[$mime];
        if (!move_uploaded_file($f['tmp_name'], $dir . '/' . $name)) {
            out(['ok' => false, 'error' => 'Не удалось сохранить фото'], 500);
        }
        out(['ok' => true, 'url' => 'uploads/' . $name]);

    case 'book':
        need_post();
        $b = body();
        if (!empty($b['website'])) {
            out(['ok' => true]); // поле-ловушка для ботов
        }
        // 5 заявок за 10 минут с одного адреса и 60 в час со всех — защита от спама
        $key = limit_key('book');
        if (limit_hits($key, 600) >= 5 || limit_hits('book:all', 3600) >= 60) {
            out(['ok' => false, 'error' => 'Слишком много заявок подряд. Позвоните нам, пожалуйста.'], 429);
        }
        $s = fn(string $k, int $max = 200) => mb_substr(trim((string) ($b[$k] ?? '')), 0, $max);
        $phone = preg_replace('/\D/', '', $s('phone', 40));
        if ($s('name') === '' || strlen($phone) !== 11 || empty($b['consent'])) {
            out(['ok' => false, 'error' => 'Проверьте имя, телефон и согласие на обработку данных'], 400);
        }
        $extra = [];
        foreach ((array) ($b['extra'] ?? []) as $k => $v) {
            $extra[mb_substr((string) $k, 0, 40)] = mb_substr(trim((string) $v), 0, 200);
        }
        $item = [
            'id' => bin2hex(random_bytes(6)),
            'status' => 'new',
            'at' => date('d.m.Y H:i'),
            'service' => $s('service'),
            'staff' => $s('staff'),
            'staffId' => preg_replace('/[^a-zA-Z0-9_-]/', '', $s('staffId', 40)),
            'dur' => max(5, min(600, (int) ($b['dur'] ?? 30))),
            'date' => preg_match('/^\d{4}-\d{2}-\d{2}$/', $s('date', 20)) ? $s('date', 20) : '',
            'time' => preg_match('/^\d{1,2}:\d{2}$/', $s('time', 10)) ? $s('time', 10) : '',
            'name' => $s('name'),
            'phone' => '+' . $phone,
            'contact' => $s('contact', 40),
            'comment' => $s('comment', 1000),
            'extra' => $extra,
            'consent_at' => date('c'),
            'ip' => $_SERVER['REMOTE_ADDR'] ?? '',
        ];
        if (!is_file($BOOKINGS_FILE)) {
            write_atomic($BOOKINGS_FILE, GUARD);
        }
        file_put_contents($BOOKINGS_FILE, json_encode($item, JSON_UNESCAPED_UNICODE) . "\n", FILE_APPEND | LOCK_EX);
        limit_add($key);
        limit_add('book:all');

        $text = "Новая заявка с сайта\n"
            . "{$item['service']}" . ($item['staff'] ? " · {$item['staff']}" : '') . "\n"
            . date('d.m.Y', strtotime($item['date']) ?: time()) . " в {$item['time']}\n"
            . "{$item['name']}, {$item['phone']}\n"
            . "Подтвердить: {$item['contact']}"
            . ($extra ? "\n" . implode("\n", array_map(fn($k, $v) => "$k: $v", array_keys($extra), $extra)) : '')
            . ($item['comment'] ? "\nКомментарий: {$item['comment']}" : '');

        // посетителю отвечаем сразу, письмо и мессенджеры отправляем уже после ответа
        $subject = 'Заявка с сайта: ' . $item['name'];
        if (function_exists('fastcgi_finish_request') || function_exists('litespeed_finish_request')) {
            echo json_encode(['ok' => true]);
            function_exists('fastcgi_finish_request') ? fastcgi_finish_request() : litespeed_finish_request();
            notify_all($subject, $text);
            exit;
        }
        notify_all($subject, $text);
        out(['ok' => true]);

    case 'bookings':
        need_auth();
        $items = [];
        // для списка — последние 200, для выгрузки в Excel (all=1) — все
        $all = read_bookings();
        foreach (array_reverse(empty($_GET['all']) ? array_slice($all, -200) : $all) as $j) {
            unset($j['ip']);
            $items[] = $j;
        }
        out(['ok' => true, 'items' => $items]);

    case 'booking-status':
        need_post();
        need_auth();
        $b = body();
        $id = (string) ($b['id'] ?? '');
        $status = (string) ($b['status'] ?? '');
        if (!in_array($status, ['new', 'confirmed', 'cancelled'], true)) {
            out(['ok' => false, 'error' => 'Неизвестный статус'], 400);
        }
        $fp = fopen($BOOKINGS_FILE, 'c+');
        if (!$fp) {
            out(['ok' => false, 'error' => 'Заявок пока нет'], 404);
        }
        flock($fp, LOCK_EX);
        $lines = array_slice(preg_split('/\n/', (string) stream_get_contents($fp)), 1);
        $found = false;
        foreach ($lines as $k => $l) {
            $j = json_decode($l, true);
            if (!is_array($j) || ($j['id'] ?? '') !== $id) {
                continue;
            }
            $j['status'] = $status;
            if (isset($b['staffId'])) {
                $j['staffId'] = preg_replace('/[^a-zA-Z0-9_-]/', '', (string) $b['staffId']);
                $j['staff'] = mb_substr(trim((string) ($b['staff'] ?? $j['staff'] ?? '')), 0, 200);
            }
            $lines[$k] = json_encode($j, JSON_UNESCAPED_UNICODE);
            $found = true;
        }
        if ($found) {
            ftruncate($fp, 0);
            rewind($fp);
            fwrite($fp, GUARD . implode("\n", array_filter($lines, fn($l) => trim($l) !== '')) . "\n");
        }
        flock($fp, LOCK_UN);
        fclose($fp);
        out($found ? ['ok' => true] : ['ok' => false, 'error' => 'Заявка не найдена'], $found ? 200 : 404);

    case 'busy':
        // для сайта: только подтверждённые заявки на ближайшие 60 дней, без имён и телефонов
        $from = date('Y-m-d');
        $to = date('Y-m-d', time() + 60 * 86400);
        $busy = [];
        foreach (read_bookings() as $j) {
            $d = (string) ($j['date'] ?? '');
            if (($j['status'] ?? '') !== 'confirmed' || $d < $from || $d > $to || !preg_match('/^(\d{1,2}):(\d{2})$/', (string) ($j['time'] ?? ''), $t)) {
                continue;
            }
            $busy[] = ['d' => $d, 'm' => (int) $t[1] * 60 + (int) $t[2], 'dur' => (int) ($j['dur'] ?? 30), 's' => (string) ($j['staffId'] ?? '')];
        }
        out(['ok' => true, 'busy' => $busy]);

    case 'notify-get':
        need_auth();
        out(['ok' => true, 'settings' => notify_public(notify_settings()), 'last' => private_read($NOTIFY_LAST) ?: null]);

    case 'notify-save':
        need_post();
        need_auth();
        $b = body();
        $n = notify_settings();
        $e = (array) ($b['email'] ?? []);
        $list = mail_list(mb_substr((string) ($e['to'] ?? ''), 0, 300));
        foreach ($list as $a) {
            if (!filter_var($a, FILTER_VALIDATE_EMAIL)) {
                out(['ok' => false, 'error' => "Проверьте адрес почты: $a"], 400);
            }
        }
        $via = (string) ($e['via'] ?? 'yandex');
        if (!isset(MAIL_VIA[$via]) && $via !== 'host' && !($via === 'custom' && $n['email']['via'] === 'custom')) {
            $via = 'yandex';
        }
        $user = trim(mb_substr((string) ($e['user'] ?? ''), 0, 120));
        $n['email'] = array_merge($n['email'], ['on' => !empty($e['on']), 'to' => implode(', ', array_slice($list, 0, 3)), 'via' => $via, 'user' => $user]);
        if (trim((string) ($e['pass'] ?? '')) !== '') {
            $n['email']['pass'] = preg_replace('/\s+/', '', mb_substr((string) $e['pass'], 0, 120));
        }
        if ($n['email']['on']) {
            if (!$list) {
                out(['ok' => false, 'error' => 'Укажите адрес почты, куда присылать заявки'], 400);
            }
            if (isset(MAIL_VIA[$via]) && (!filter_var($user, FILTER_VALIDATE_EMAIL) || $n['email']['pass'] === '')) {
                out(['ok' => false, 'error' => 'Укажите ящик, с которого отправлять, и пароль приложения'], 400);
            }
        }
        foreach (CHANNELS as $ch => $label) {
            $on = !empty($b[$ch]['on']);
            if ($on && ($n[$ch]['token'] === '' || $n[$ch]['chat'] === '')) {
                out(['ok' => false, 'error' => "Сначала подключите $label кнопкой «Подключить»"], 400);
            }
            $n[$ch]['on'] = $on;
        }
        private_write($NOTIFY_FILE, $n);
        out(['ok' => true, 'settings' => notify_public($n)]);

    case 'notify-connect':
        need_post();
        need_auth();
        $b = body();
        $ch = (string) ($b['ch'] ?? '');
        if (!isset(CHANNELS[$ch])) {
            out(['ok' => false, 'error' => 'Неизвестный канал'], 400);
        }
        $n = notify_settings();
        $token = preg_replace('/\s+/', '', mb_substr((string) ($b['token'] ?? ''), 0, 400)) ?: $n[$ch]['token'];
        if ($token === '') {
            out(['ok' => false, 'error' => 'Вставьте ключ'], 400);
        }
        [$who, $err] = channel_connect($ch, $token);
        if ($err) {
            out(['ok' => false, 'error' => $err], 400);
        }
        $n[$ch] = ['on' => true, 'token' => $token, 'chat' => $who['chat'], 'name' => mb_substr($who['name'], 0, 80)];
        $sent = channel_send($ch, $n[$ch], 'Готово! Сюда будут приходить заявки с сайта «' . site_name() . '».');
        if ($sent !== '') {
            out(['ok' => false, 'error' => $sent], 400);
        }
        private_write($NOTIFY_FILE, $n);
        out(['ok' => true, 'settings' => notify_public($n)]);

    case 'notify-test':
        need_post();
        need_auth();
        $ch = (string) (body()['ch'] ?? '');
        $n = notify_settings();
        $text = "Проверка уведомлений с сайта «" . site_name() . "».\nЕсли вы это читаете — всё работает: заявки с сайта будут приходить сюда.\n\nПример заявки:\nНазвание услуги · 20.10.2026 в 18:30\nИван, +79990000000";
        if ($ch === 'email') {
            $err = email_send($n['email'], 'Проверка: заявки с сайта «' . site_name() . '»', $text);
        } elseif (isset(CHANNELS[$ch])) {
            $err = channel_send($ch, $n[$ch], $text);
        } else {
            out(['ok' => false, 'error' => 'Неизвестный канал'], 400);
        }
        out($err === '' ? ['ok' => true] : ['ok' => false, 'error' => $err], $err === '' ? 200 : 400);

    case 'notify-forget':
        need_post();
        need_auth();
        $ch = (string) (body()['ch'] ?? '');
        if (!isset(CHANNELS[$ch])) {
            out(['ok' => false, 'error' => 'Неизвестный канал'], 400);
        }
        $n = notify_settings();
        $n[$ch] = notify_defaults()[$ch];
        private_write($NOTIFY_FILE, $n);
        out(['ok' => true, 'settings' => notify_public($n)]);

    default:
        out(['ok' => false, 'error' => 'Неизвестное действие'], 404);
}
