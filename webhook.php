<?php
$payload = file_get_contents('php://input');
$secret = 'Gg3985502';
$header = $_SERVER['HTTP_X_HUB_SIGNATURE'] ?? null;
$eventType = $_SERVER['HTTP_X_GITHUB_EVENT'] ?? null;

// Логирование
$logFile = '/var/log/webhook.log';
$logMessage = date('Y-m-d H:i:s') . " - Webhook received\n";
file_put_contents($logFile, $logMessage, FILE_APPEND | LOCK_EX);

// Проверка типа события
if ($eventType !== 'push') {
    $logMessage = date('Y-m-d H:i:s') . " - Not a push event\n";
    file_put_contents($logFile, $logMessage, FILE_APPEND | LOCK_EX);
    http_response_code(200);
    die('Not a push event');
}

// Проверка подписи (если секрет указан)
if ($secret && $header) {
    list($algo, $hash) = explode('=', $header, 2);
    if (!hash_equals($hash, hash_hmac($algo, $payload, $secret))) {
        $logMessage = date('Y-m-d H:i:s') . " - Invalid signature\n";
        file_put_contents($logFile, $logMessage, FILE_APPEND | LOCK_EX);
        http_response_code(403);
        die('Invalid signature');
    }
} else {
    $logMessage = date('Y-m-d H:i:s') . " - Missing signature\n";
    file_put_contents($logFile, $logMessage, FILE_APPEND | LOCK_EX);
    http_response_code(400);
    die('Missing signature');
}

// Декодируем JSON, чтобы убедиться, что это push-событие
$data = json_decode($payload, true);
if (json_last_error() !== JSON_ERROR_NONE) {
    $logMessage = date('Y-m-d H:i:s') . " - JSON decode error: " . json_last_error_msg() . "\n";
    file_put_contents($logFile, $logMessage, FILE_APPEND | LOCK_EX);
    http_response_code(400);
    die('JSON decode error');
}

if ($data['ref'] === 'refs/heads/main') {
    // Вызываем скрипт деплоя
    $deployScript = '/var/www/html/deploy.sh';
    if (!file_exists($deployScript) || !is_executable($deployScript)) {
        $logMessage = date('Y-m-d H:i:s') . " - Deploy script not found or not executable\n";
        file_put_contents($logFile, $logMessage, FILE_APPEND | LOCK_EX);
        http_response_code(500);
        die('Deploy script error');
    }

    exec("sh $deployScript 2>&1", $output, $returnCode);
    if ($returnCode !== 0) {
        $logMessage = date('Y-m-d H:i:s') . " - Deploy script execution failed with code $returnCode\n";
        file_put_contents($logFile, $logMessage, FILE_APPEND | LOCK_EX);
        http_response_code(500);
        die('Deploy script execution failed');
    }

    $output = implode("\n", $output);
    $logMessage = date('Y-m-d H:i:s') . " - Deploy script output:\n$output\n";
    file_put_contents($logFile, $logMessage, FILE_APPEND | LOCK_EX);
} else {
    $logMessage = date('Y-m-d H:i:s') . " - Not a main branch push\n";
    file_put_contents($logFile, $logMessage, FILE_APPEND | LOCK_EX);
}

http_response_code(200);
echo 'Deployment successful';
?>