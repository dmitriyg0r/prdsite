<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
error_reporting(E_ALL);
ini_set('display_errors', 1);

function checkMinecraftServer() {
    // Получаем IP и порт из GET параметров
    $ip = $_GET['ip'] ?? '188.127.241.209';  // Используем значение из параметра или значение по умолчанию
    $port = intval($_GET['port'] ?? 25971);   // Преобразуем в число
    
    $debug = [];
    $debug[] = "Попытка подключения к $ip:$port";
    
    try {
        // Увеличиваем таймаут и добавляем дополнительные параметры
        $socket = @stream_socket_client(
            "tcp://$ip:$port", 
            $errno, 
            $errstr, 
            5,
            STREAM_CLIENT_CONNECT
        );
        
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
        stream_set_timeout($socket, 3);
        
        // Формируем правильный handshake пакет
        $packet = "\x06\x00"; // Packet ID для Server List Ping
        $packet .= "\x00\x00"; // Protocol version (пустой)
        $packet .= pack('c', strlen($ip)) . $ip; // Длина IP + IP
        $packet .= pack('n', $port); // Порт
        $packet .= "\x01"; // Next state (1 для status)
        
        // Отправляем размер пакета
        $data = pack('c', strlen($packet)) . $packet;
        fwrite($socket, $data);
        
        // Отправляем запрос статуса
        fwrite($socket, "\x01\x00");
        
        $debug[] = "Handshake отправлен";
        
        // Читаем ответ
        $response = fread($socket, 1024);
        $debug[] = "Получен ответ длиной: " . strlen($response);
        
        fclose($socket);
        
        if ($response !== false) {
            // Парсим JSON ответ от сервера
            $data = json_decode(substr($response, 3), true);
            
            // Получаем информацию об игроках
            $players = [
                'online' => $data['players']['online'] ?? 0,
                'max' => $data['players']['max'] ?? 30  // Значение по умолчанию 30
            ];
            
            return [
                'online' => true,
                'debug' => $debug,
                'players' => $players
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
    header('Content-Type: application/json');
    echo json_encode($result, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
    exit;
} catch (Exception $e) {
    header('Content-Type: application/json');
    echo json_encode([
        'online' => false,
        'error' => $e->getMessage(),
        'debug' => ['Критическая ошибка при выполнении скрипта']
    ]);
    exit;
}