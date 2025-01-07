<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

function checkMinecraftServer($host, $port = 25735) {
    $socket = @fsockopen($host, $port, $errno, $errstr, 3);
    
    if (!$socket) {
        return [
            'online' => false,
            'error' => "$errno: $errstr"
        ];
    }

    // Minecraft server list ping packet
    $packet = "\x06\x00\xbe\x01";
    fwrite($socket, $packet);
    
    // Чтение ответа
    $response = fread($socket, 256);
    fclose($socket);
    
    if ($response) {
        return [
            'online' => true,
            'players' => [
                'online' => 0, // В будущем можно добавить парсинг реального количества игроков
                'max' => 0
            ]
        ];
    }
    
    return ['online' => false];
}

$result = checkMinecraftServer('spacepoint.aboba.host');
echo json_encode($result); 