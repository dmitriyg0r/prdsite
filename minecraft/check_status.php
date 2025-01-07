<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
error_reporting(E_ALL);
ini_set('display_errors', 1);

function checkMinecraftServer() {
    $ip = '188.127.241.209';  // Жестко закодированный IP
    $port = 25735;            // Жестко закодированный порт
    
    $debug = [];
    $debug[] = "Попытка подключения к $ip:$port";
    
    try {
        // Увеличиваем таймаут до 10 секунд
        $socket = @fsockopen($ip, $port, $errno, $errstr, 10);
        
        if (!$socket) {
            $debug[] = "Ошибка подключения: $errno - $errstr";
            return [
                'online' => false,
                'error' => "$errno: $errstr",
                'debug' => $debug
            ];
        }
        
        $debug[] = "Соединение установлено";
        
        // Устанавливаем таймаут для чтения/записи
        stream_set_timeout($socket, 5);
        
        // Простой ping-пакет
        $ping = "\x01";
        fwrite($socket, $ping);
        
        $debug[] = "Ping отправлен";
        
        // Читаем ответ
        $response = fread($socket, 1024);
        $debug[] = "Получен ответ длиной: " . strlen($response);
        
        fclose($socket);
        
        if ($response !== false) {
            return [
                'online' => true,
                'debug' => $debug,
                'players' => [
                    'online' => 0,
                    'max' => 0
                ]
            ];
        } else {
            $debug[] = "Нет ответа от сервера";
            return [
                'online' => false,
                'error' => 'Нет ответа от сервера',
                'debug' => $debug
            ];
        }
        
    } catch (Exception $e) {
        $debug[] = "Исключение: " . $e->getMessage();
        return [
            'online' => false,
            'error' => $e->getMessage(),
            'debug' => $debug
        ];
    }
}

try {
    $result = checkMinecraftServer();
    echo json_encode($result, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
} catch (Exception $e) {
    echo json_encode([
        'online' => false,
        'error' => $e->getMessage(),
        'debug' => ['Критическая ошибка при выполнении скрипта']
    ]);
}