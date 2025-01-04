<?php
header('Content-Type: application/json');

function checkMinecraftServer($ip, $port) {
    $socket = @fsockopen($ip, $port, $errno, $errstr, 5);
    
    if ($socket) {
        fclose($socket);
        return [
            'online' => true,
            'players' => [
                'online' => '?',
                'max' => '?'
            ]
        ];
    }
    
    return [
        'online' => false
    ];
}

// Получаем параметры из запроса
$ip = isset($_GET['ip']) ? $_GET['ip'] : '';
$port = isset($_GET['port']) ? $_GET['port'] : '';

// Проверяем валидность IP и порта
if (filter_var($ip, FILTER_VALIDATE_IP) && is_numeric($port)) {
    $status = checkMinecraftServer($ip, $port);
    echo json_encode($status);
} else {
    http_response_code(400);
    echo json_encode([
        'online' => false,
        'error' => 'Invalid IP or port'
    ]);
} 