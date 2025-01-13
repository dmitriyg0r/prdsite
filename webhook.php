<?php
// Логирование
$logFile = '/var/log/webhook.log';

function logMessage($message) {
    global $logFile;
    $logData = date('Y-m-d H:i:s') . " - " . $message . "\n";
    file_put_contents($logFile, $logData, FILE_APPEND);
}

logMessage("Request Method: " . $_SERVER['REQUEST_METHOD']);
logMessage("Request Headers: " . json_encode(getallheaders()));

logMessage("Webhook received");

// Проверка метода запроса
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    logMessage("Invalid request method: " . $_SERVER['REQUEST_METHOD']);
    http_response_code(405);
    exit('Method Not Allowed');
}

// Проверка наличия входных данных
$payload = file_get_contents("php://input");
if (empty($payload)) {
    logMessage("Empty payload received");
    http_response_code(400);
    exit('Bad Request');
}

// Проверка секретного токена
$secretToken = 'Gg3985502';
$signature = $_SERVER['HTTP_X_HUB_SIGNATURE'] ?? '';
$expectedSignature = 'sha1=' . hash_hmac('sha1', $payload, $secretToken);

if ($signature !== $expectedSignature) {
    logMessage("Invalid secret token");
    logMessage("Received signature: " . $signature);
    logMessage("Expected signature: " . $expectedSignature);
    http_response_code(403);
    exit('Forbidden');
}

// Вызов скрипта deploy.php
$deployScript = '/var/www/deploy.php';
logMessage("Calling deploy script: " . $deployScript);

// Используем полный путь к интерпретатору PHP
exec("/usr/bin/php " . $deployScript . " >> " . $logFile . " 2>&1");

logMessage("Webhook processing completed");
?>