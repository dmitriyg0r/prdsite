<?php
// Логирование
$logFile = '/var/log/webhook.log';

function logMessage($message) {
    global $logFile;
    $logData = date('Y-m-d H:i:s') . " - " . $message . "\n";
    file_put_contents($logFile, $logData, FILE_APPEND);
}

logMessage("Webhook received");

// Проверка секретного токена (если используется)
$secretToken = 'Gg3985502';
if ($_SERVER['HTTP_X_HUB_SIGNATURE'] !== 'sha1=' . hash_hmac('sha1', file_get_contents("php://input"), $secretToken)) {
    logMessage("Invalid secret token");
    http_response_code(403);
    exit();
}

// Вызов скрипта deploy.php
$deployScript = '/var/www/deploy.php';
logMessage("Calling deploy script: " . $deployScript);

// Используем полный путь к интерпретатору PHP
exec("/usr/bin/php " . $deployScript . " >> " . $logFile . " 2>&1");

logMessage("Webhook processing completed");
?>