<?php
header('Content-Type: application/json');
header('Cache-Control: no-cache, must-revalidate');

function checkMinecraftServer() {
    $serverIP = $_GET['ip'] ?? '188.127.241.209';
    $serverPort = $_GET['port'] ?? 25971;
    $debug = [];
    
    try {
        $socket = @fsockopen($serverIP, $serverPort, $errno, $errstr, 2);
        
        if ($socket) {
            $debug[] = "Соединение установлено";
            
            // Отправляем запрос серверу
            $data = "\x06\x00\x00\x00\x00\x00";
            fwrite($socket, $data);
            
            // Читаем ответ
            $response = fread($socket, 4096);
            fclose($socket);
            
            if ($response !== false) {
                // Парсим JSON ответ от сервера
                $serverData = json_decode(substr($response, 3), true);
                
                // Получаем информацию об игроках
                $players = [
                    'online' => $serverData['players']['online'] ?? 0,
                    'max' => $serverData['players']['max'] ?? 30
                ];
                
                echo json_encode([
                    'online' => true,
                    'debug' => $debug,
                    'players' => $players
                ]);
                exit;
            }
        }
        
        echo json_encode([
            'online' => false,
            'debug' => $debug,
            'error' => 'Не удалось получить ответ от сервера'
        ]);
        
    } catch (Exception $e) {
        echo json_encode([
            'online' => false,
            'debug' => $debug,
            'error' => $e->getMessage()
        ]);
    }
}

checkMinecraftServer();
?>