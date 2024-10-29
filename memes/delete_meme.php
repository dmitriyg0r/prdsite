<?php
// Включаем отображение всех ошибок для отладки
ini_set('display_errors', 1);
error_reporting(E_ALL);

// Устанавливаем заголовки
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type');

// Логируем входящие данные
$input = file_get_contents('php://input');
error_log("Received data: " . $input);

try {
    // Получаем и декодируем данные
    $data = json_decode($input, true);
    
    if (json_last_error() !== JSON_ERROR_NONE) {
        throw new Exception('Invalid JSON data: ' . json_last_error_msg());
    }

    // Проверяем наличие необходимых данных
    if (!isset($data['meme_id']) || !isset($data['password'])) {
        throw new Exception('Missing required fields');
    }

    // Проверяем пароль
    $correct_password = '123'; // Замените на ваш пароль
    if ($data['password'] !== $correct_password) {
        throw new Exception('Неверный пароль');
    }

    // Подключаемся к базе данных
    $db = new SQLite3('../database.db');
    
    // Получаем информацию о меме
    $stmt = $db->prepare('SELECT * FROM memes WHERE id = :id');
    $stmt->bindValue(':id', $data['meme_id'], SQLITE3_INTEGER);
    $result = $stmt->execute();
    $meme = $result->fetchArray(SQLITE3_ASSOC);
    
    if (!$meme) {
        throw new Exception('Мем не найден');
    }

    // Удаляем запись из базы данных
    $stmt = $db->prepare('DELETE FROM memes WHERE id = :id');
    $stmt->bindValue(':id', $data['meme_id'], SQLITE3_INTEGER);
    $result = $stmt->execute();

    if (!$result) {
        throw new Exception('Ошибка при удалении из базы данных');
    }

    // Удаляем файл, если он существует
    if (file_exists($meme['path'])) {
        if (!unlink($meme['path'])) {
            throw new Exception('Ошибка при удалении файла');
        }
    }

    // Закрываем соединение с базой данных
    $db->close();

    // Возвращаем успешный ответ
    echo json_encode([
        'status' => 'success',
        'message' => 'Мем успешно удален'
    ]);

} catch (Exception $e) {
    // Логируем ошибку
    error_log("Delete meme error: " . $e->getMessage());
    
    // Возвращаем ошибку
    http_response_code(400);
    echo json_encode([
        'status' => 'error',
        'message' => $e->getMessage()
    ]);
}
?> 