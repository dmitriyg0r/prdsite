<?php
$payload = file_get_contents('php://input');
$secret = 'Gg3985502'; 
$header = $_SERVER['HTTP_X_HUB_SIGNATURE'];

// Проверка подписи (если секрет указан)
if ($secret && $header) {
    $hash = 'sha1=' . hash_hmac('sha1', $payload, $secret);
    if (!hash_equals($hash, $header)) {
        die('Invalid signature');
    }
}

// Декодируем JSON, чтобы убедиться, что это push-событие
$data = json_decode($payload, true);
if ($data['ref'] === 'refs/heads/main') {
    // Вызываем скрипт деплоя
    shell_exec('sh /var/www/html/deploy.sh');
}
?>
