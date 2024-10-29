<?php
// Отключаем вывод ошибок в ответ
ini_set('display_errors', 0);
error_reporting(0);

// Устанавливаем заголовок JSON
header('Content-Type: application/json');

// Очищаем буфер вывода
ob_clean();

try {
    // Получаем данные запроса
    $data = json_decode(file_get_contents('php://input'), true);

    // Проверяем наличие необходимых данных
    if (!isset($data['meme_id']) || !isset($data['password'])) {
        throw new Exception('Missing required data');
    }

    // Проверяем пароль
    $correct_password = '123'; // Замените на ваш пароль
    if ($data['password'] !== $correct_password) {
        throw new Exception('Invalid password');
    }

    // Подключаемся к базе данных
    $db = new SQLite3('../database.db');
    
    // Получаем информацию о меме
    $stmt = $db->prepare('SELECT * FROM memes WHERE id = :id');
    $stmt->bindValue(':id', $data['meme_id'], SQLITE3_INTEGER);
    $result = $stmt->execute();
    $meme = $result->fetchArray(SQLITE3_ASSOC);
    
    if (!$meme) {
        throw new Exception('Meme not found');
    }

    // Удаляем запись из базы данных
    $stmt = $db->prepare('DELETE FROM memes WHERE id = :id');
    $stmt->bindValue(':id', $data['meme_id'], SQLITE3_INTEGER);
    $result = $stmt->execute();

    // Удаляем файл, если он существует
    if (file_exists($meme['path'])) {
        unlink($meme['path']);
    }

    // Закрываем соединение с базой данных
    $db->close();

    // Возвращаем успешный ответ
    echo json_encode([
        'status' => 'success',
        'message' => 'Мем успешно удален'
    ]);

} catch (Exception $e) {
    // Возвращаем ошибку
    echo json_encode([
        'status' => 'error',
        'message' => $e->getMessage()
    ]);
}
?> 