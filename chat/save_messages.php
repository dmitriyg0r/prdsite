<?php
header('Content-Type: application/json');

$messagesFile = 'messages.json';

// Получаем текущие сообщения
if (file_exists($messagesFile)) {
    $messages = json_decode(file_get_contents($messagesFile), true) ?? [];
} else {
    $messages = [];
}

// Добавляем новое сообщение
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $newMessage = json_decode(file_get_contents('php://input'), true);
    
    // Удаляем сообщения старше 24 часов
    $messages = array_filter($messages, function($msg) {
        return (time() - ($msg['timestamp'] / 1000)) < 86400; // 86400 секунд = 24 часа
    });
    
    // Добавляем новое сообщение
    $messages[] = $newMessage;
    
    // Сохраняем обновленный список сообщений
    file_put_contents($messagesFile, json_encode($messages));
}

echo json_encode($messages);
?> 