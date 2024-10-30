<?php
header('Content-Type: application/json');

$data = json_decode(file_get_contents('php://input'), true);

// Проверка пароля (замените 'ваш_пароль' на реальный пароль)
if ($data['password'] !== 'Gg3985502') {
    echo json_encode(['success' => false, 'error' => 'Неверный пароль']);
    exit;
}

$image = $data['image'];
$imagePath = __DIR__ . '/news/' . $image;

// Проверяем существование файла
if (!file_exists($imagePath)) {
    echo json_encode(['success' => false, 'error' => 'Файл не найден']);
    exit;
}

// Удаляем файл изображения
if (unlink($imagePath)) {
    // Здесь также нужно удалить запись из базы данных
    // Предполагая, что у вас есть подключение к БД
    require_once '../db_connect.php';
    
    $stmt = $pdo->prepare("DELETE FROM news WHERE image = ?");
    if ($stmt->execute([$image])) {
        echo json_encode(['success' => true]);
    } else {
        echo json_encode(['success' => false, 'error' => 'Ошибка удаления из базы данных']);
    }
} else {
    echo json_encode(['success' => false, 'error' => 'Ошибка удаления файла']);
} 