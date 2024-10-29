<?php
// Создайте новый файл delete_meme.php
header('Content-Type: application/json');

// Получаем данные запроса
$data = json_decode(file_get_contents('php://input'), true);

// Проверяем наличие необходимых данных
if (!isset($data['meme_id']) || !isset($data['password'])) {
    echo json_encode(['status' => 'error', 'message' => 'Missing required data']);
    exit;
}

// Проверяем пароль (замените 'your_secure_password' на реальный пароль)
$correct_password = 'Delete'; // Измените на ваш пароль
if ($data['password'] !== $correct_password) {
    echo json_encode(['status' => 'error', 'message' => 'Invalid password']);
    exit;
}

// Получаем информацию о меме из базы данных
try {
    $db = new SQLite3('../database.db');
    
    // Получаем путь к файлу перед удалением записи
    $stmt = $db->prepare('SELECT path FROM memes WHERE id = :id');
    $stmt->bindValue(':id', $data['meme_id'], SQLITE3_INTEGER);
    $result = $stmt->execute();
    $meme = $result->fetchArray(SQLITE3_ASSOC);
    
    if ($meme) {
        // Удаляем файл
        if (file_exists($meme['path'])) {
            unlink($meme['path']);
        }
        
        // Удаляем запись из базы данных
        $stmt = $db->prepare('DELETE FROM memes WHERE id = :id');
        $stmt->bindValue(':id', $data['meme_id'], SQLITE3_INTEGER);
        $stmt->execute();
        
        echo json_encode(['status' => 'success']);
    } else {
        echo json_encode(['status' => 'error', 'message' => 'Meme not found']);
    }
    
    $db->close();
} catch (Exception $e) {
    echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
}
?> 