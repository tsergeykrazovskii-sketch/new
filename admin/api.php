<?php
/*
 * Слот — серверная часть админки. Один файл, без базы данных.
 *   ?action=session  — вошёл ли владелец, задан ли пароль
 *   ?action=setup    — задать пароль при первом входе (только пока его нет)
 *   ?action=login / logout
 *   ?action=save     — сохранить data.json и index.html сайта
 *   ?action=upload   — загрузить фото мастера в /uploads
 *   ?action=book     — заявка с сайта: сохраняем и отправляем администратору
 *   ?action=bookings — последние заявки для админки
 * Настройки уведомлений — в admin/config.php (см. config.example.php).
 */
declare(strict_types=1);

session_set_cookie_params([
    'httponly' => true,
    'samesite' => 'Strict',
    'secure' => !empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off',
]);
session_name('slot_admin');
session_start();
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

$ROOT = dirname(__DIR__);
$PRIVATE = __DIR__ . '/private';
$AUTH_FILE = $PRIVATE . '/auth.php';
$BOOKINGS_FILE = $PRIVATE . '/bookings.php';
$cfg = is_file(__DIR__ . '/config.php') ? (array) require __DIR__ . '/config.php' : [];

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
    return !empty($_SESSION['slot_auth']);
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
    $_SESSION['slot_csrf'] = bin2hex(random_bytes(16));
    $_SESSION['slot_fail'] = 0;
    return $_SESSION['slot_csrf'];
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
        $pass = (string) (body()['password'] ?? '');
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
        $fails = (int) ($_SESSION['slot_fail'] ?? 0);
        $last = (int) ($_SESSION['slot_fail_at'] ?? 0);
        if ($fails >= 5 && time() - $last < 900) {
            out(['ok' => false, 'error' => 'Слишком много попыток. Попробуйте через 15 минут.'], 429);
        }
        $hash = (string) require $AUTH_FILE;
        if (!password_verify((string) (body()['password'] ?? ''), $hash)) {
            $_SESSION['slot_fail'] = $fails + 1;
            $_SESSION['slot_fail_at'] = time();
            sleep(1);
            out(['ok' => false, 'error' => 'Неверный пароль'], 401);
        }
        out(['ok' => true, 'csrf' => start_session()]);

    case 'logout':
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
        $recent = array_filter((array) ($_SESSION['slot_books'] ?? []), fn($t) => time() - (int) $t < 600);
        if (count($recent) >= 5) {
            out(['ok' => false, 'error' => 'Слишком много заявок подряд'], 429);
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
        $recent[] = time();
        $_SESSION['slot_books'] = $recent;

        $text = "Новая заявка с сайта\n"
            . "{$item['service']}" . ($item['staff'] ? " · {$item['staff']}" : '') . "\n"
            . date('d.m.Y', strtotime($item['date']) ?: time()) . " в {$item['time']}\n"
            . "{$item['name']}, {$item['phone']}\n"
            . "Подтвердить: {$item['contact']}"
            . ($extra ? "\n" . implode("\n", array_map(fn($k, $v) => "$k: $v", array_keys($extra), $extra)) : '')
            . ($item['comment'] ? "\nКомментарий: {$item['comment']}" : '');

        if (!empty($cfg['notify_email'])) {
            $subject = '=?UTF-8?B?' . base64_encode('Заявка с сайта: ' . $item['name']) . '?=';
            @mail((string) $cfg['notify_email'], $subject, $text, "Content-Type: text/plain; charset=utf-8\r\n");
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
