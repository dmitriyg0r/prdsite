<?php
// Логирование
$logFile = '/var/log/webhook.log';
$logData = date('Y-m-d H:i:s') . " - Webhook received\n";
file_put_contents($logFile, $logData, FILE_APPEND);

// Получаем данные вебхука
$input = file_get_contents('php://input');
$data = json_decode($input, true);

// Логируем данные вебхука
$logData = date('Y-m-d H:i:s') . " - Webhook data: " . print_r($data, true) . "\n";
file_put_contents($logFile, $logData, FILE_APPEND);

// Обработка данных вебхука
if (isset($data['ref']) && $data['ref'] == 'refs/heads/main') {
    // Выполняем скрипт деплоя
    $output = [];
    $return_var = 0;
    exec('/var/www/deploy.sh', $output, $return_var);

    // Логируем вывод и статус выполнения скрипта
    $logData = date('Y-m-d H:i:s') . " - Deployment script output: " . implode("\n", $output) . "\n";
    file_put_contents($logFile, $logData, FILE_APPEND);

    if ($return_var !== 0) {
        $logData = date('Y-m-d H:i:s') . " - Deployment script failed with return code: " . $return_var . "\n";
        file_put_contents($logFile, $logData, FILE_APPEND);
    } else {
        $logData = date('Y-m-d H:i:s') . " - Deployment script executed successfully\n";
        file_put_contents($logFile, $logData, FILE_APPEND);
    }
} else {
    $logData = date('Y-m-d H:i:s') . " - Not a main branch update\n";
    file_put_contents($logFile, $logData, FILE_APPEND);
}
?>