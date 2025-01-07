<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

function checkMinecraftServer($ip, $port) {
    $debug = [];
    $debug[] = "Попытка подключения к $ip:$port";
    
    $socket = @fsockopen($ip, $port, $errno, $errstr, 5);
    
    if (!$socket) {
        $debug[] = "Ошибка подключения: $errno - $errstr";
        return [
            'online' => false,
            'error' => "$errno: $errstr",
            'debug' => $debug
        ];
    }
    
    $debug[] = "Соединение установлено";
    
    // Minecraft 1.7+ ping packet
    $data = "\x00"; // packet ID
    $data .= "\x04"; // protocol version
    $data .= pack('c', strlen($ip)) . $ip; // server address length and address
    $data .= pack('n', $port); // server port
    $data .= "\x01"; // next state (1 for status)
    
    $data = pack('c', strlen($data)) . $data; // prepend length of packet
    
    $debug[] = "Отправка ping пакета";
    fwrite($socket, $data);
    
    // Send status request packet
    fwrite($socket, "\x01\x00");
    
    // Чтение ответа
    $debug[] = "Чтение ответа";
    $response = fread($socket, 2048);
    fclose($socket);
    
    $debug[] = "Длина ответа: " . strlen($response);
    
    if ($response) {
        $debug[] = "Получен ответ от сервера";
        return [
            'online' => true,
            'players' => [
                'online' => 0,
                'max' => 0
            ],
            'debug' => $debug,
            'raw_response' => bin2hex($response)
        ];
    }
    
    $debug[] = "Нет ответа от сервера";
    return [
        'online' => false,
        'debug' => $debug
    ];
}

$result = checkMinecraftServer('188.127.241.209', 25735);
echo json_encode($result, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);