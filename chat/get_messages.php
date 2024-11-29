<?php
header('Content-Type: application/json');

$messagesFile = 'messages.json';

if (file_exists($messagesFile)) {
    $messages = json_decode(file_get_contents($messagesFile), true) ?? [];
    
    // Удаляем сообщения старше 24 часов
    $messages = array_filter($messages, function($msg) {
        return (time() - ($msg['timestamp'] / 1000)) < 86400;
    });
    
    // Сохраняем очищенный список сообщений
    file_put_contents($messagesFile, json_encode($messages));
} else {
    $messages = [];
}

echo json_encode($messages);
?> 