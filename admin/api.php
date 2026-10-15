<?php
/*
 * Слот — серверная часть админки. Один файл, без базы данных.
 *   ?action=session  — вошёл ли владелец, задан ли пароль
 *   ?action=setup    — задать пароль при первом входе: только пока его нет и только с кодом
 *                      первого входа из admin/config.php (иначе пароль задал бы любой посетитель)
 *   ?action=login / logout
 *   ?action=save     — сохранить data.json и index.html сайта
 *   ?action=upload   — загрузить фото мастера в /uploads
 *   ?action=book     — заявка с сайта: сохраняем и отправляем администратору
 *   ?action=bookings — последние заявки для админки
 * Настройки уведомлений — в admin/config.php (см. config.example.php).
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
    if (time() - (int) ($_SESSION['slot_seen'] ?? 0) > SESSION_IDLE) {
        $_SESSION = [];
        return false;
    }
    $_SESSION['slot_seen'] = time();
    return true;
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

function log_error(string $msg): void
{
    global $LOG_FILE;
    if (!is_file($LOG_FILE)) {
        write_atomic($LOG_FILE, GUARD);
    }
    @file_put_contents($LOG_FILE, date('d.m.Y H:i') . ' ' . $msg . "\n", FILE_APPEND | LOCK_EX);
}

/*
 * Письмо владельцу. Если в config.php задан SMTP (например, ящик на Яндексе с паролем приложения),
 * отправляем через него: такие письма не попадают в спам. Иначе — через mail() хостинга.
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

function send_mail(array $cfg, string $to, string $subject, string $text): bool
{
    $subj = '=?UTF-8?B?' . base64_encode($subject) . '?=';
    if (empty($cfg['smtp_host'])) {
        return @mail($to, $subj, $text, "Content-Type: text/plain; charset=utf-8\r\n");
    }
    $host = (string) $cfg['smtp_host'];
    $port = (int) ($cfg['smtp_port'] ?? 465);
    $secure = (string) ($cfg['smtp_secure'] ?? 'ssl'); // ssl (465) | tls (587, STARTTLS) | '' (без шифрования)
    $user = (string) ($cfg['smtp_user'] ?? '');
    $from = $user ?: 'noreply@' . ($_SERVER['HTTP_HOST'] ?? 'localhost');
    $fp = @stream_socket_client(($secure === 'ssl' ? 'ssl://' : 'tcp://') . $host . ':' . $port, $errno, $errstr, 10);
    if (!$fp) {
        log_error("SMTP: не удалось подключиться к $host:$port ($errstr)");
        return false;
    }
    stream_set_timeout($fp, 10);
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
            smtp_cmd($fp, 'AUTH LOGIN', 334);
            smtp_cmd($fp, base64_encode($user), 334);
            smtp_cmd($fp, base64_encode((string) ($cfg['smtp_pass'] ?? '')), 235);
        }
        $addr = fn(string $a) => '<' . preg_replace('/[\r\n<>]/', '', $a) . '>';
        smtp_cmd($fp, 'MAIL FROM:' . $addr($from), 250);
        smtp_cmd($fp, 'RCPT TO:' . $addr($to), 250);
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
        return true;
    } catch (RuntimeException $e) {
        log_error('SMTP: ' . $e->getMessage());
        fclose($fp);
        return false;
    }
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
        out(['ok' => true, 'savedAt' => date('H:i')]);

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
            'at' => date('d.m.Y H:i'),
            'service' => $s('service'),
            'staff' => $s('staff'),
            'date' => $s('date', 20),
            'time' => $s('time', 10),
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

        if (!empty($cfg['notify_email'])) {
            send_mail($cfg, (string) $cfg['notify_email'], 'Заявка с сайта: ' . $item['name'], $text);
        }
        if (!empty($cfg['telegram_bot_token']) && !empty($cfg['telegram_chat_id'])) {
            $ctx = stream_context_create(['http' => [
                'method' => 'POST',
                'header' => "Content-Type: application/json\r\n",
                'content' => json_encode(['chat_id' => $cfg['telegram_chat_id'], 'text' => $text]),
                'timeout' => 5,
            ]]);
            @file_get_contents('https://api.telegram.org/bot' . $cfg['telegram_bot_token'] . '/sendMessage', false, $ctx);
        }
        out(['ok' => true]);

    case 'bookings':
        need_auth();
        $items = [];
        if (is_file($BOOKINGS_FILE)) {
            $lines = array_slice(file($BOOKINGS_FILE, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) ?: [], 1);
            foreach (array_reverse(array_slice($lines, -100)) as $l) {
                $j = json_decode($l, true);
                if (is_array($j)) {
                    unset($j['ip']);
                    $items[] = $j;
                }
            }
        }
        out(['ok' => true, 'items' => $items]);

    default:
        out(['ok' => false, 'error' => 'Неизвестное действие'], 404);
}
