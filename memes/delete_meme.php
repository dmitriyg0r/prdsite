<?php
header('Content-Type: application/json');
error_reporting(E_ALL);
ini_set('display_errors', 1);

// Получаем данные запроса
$data = json_decode(file_get_contents('php://input'), true);

// Проверяем наличие необходимых данных
if (!isset($data['meme_id']) || !isset($data['password'])) {
    echo json_encode(['status' => 'error', 'message' => 'Missing required data']);
    exit;
}

// Проверяем пароль (замените на ваш реальный пароль)
$correct_password = '123'; // Установите здесь ваш пароль
if ($data['password'] !== $correct_password) {
    echo json_encode(['status' => 'error', 'message' => 'Invalid password']);
    exit;
}

try {
    $db = new SQLite3('../database.db');
    
    // Получаем информацию о меме
    $stmt = $db->prepare('SELECT * FROM memes WHERE id = :id');
    $stmt->bindValue(':id', $data['meme_id'], SQLITE3_INTEGER);
    $result = $stmt->execute();
    $meme = $result->fetchArray(SQLITE3_ASSOC);
    
    if ($meme) {
        // Путь к файлу
        $file_path = $meme['path'];
        
        // Удаляем запись из базы данных
        $stmt = $db->prepare('DELETE FROM memes WHERE id = :id');
        $stmt->bindValue(':id', $data['meme_id'], SQLITE3_INTEGER);
        $result = $stmt->execute();
        
        // Удаляем файл, если он существует
        if (file_exists($file_path)) {
            unlink($file_path);
        }
        
        echo json_encode([
            'status' => 'success',
            'message' => 'Мем успешно удален'
        ]);
    } else {
        echo json_encode([
            'status' => 'error',
            'message' => 'Мем не найден'
        ]);
    }
    
    $db->close();
    
} catch (Exception $e) {
    echo json_encode([
        'status' => 'error',
        'message' => 'Database error: ' . $e->getMessage()
    ]);
}
?> 