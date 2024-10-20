<?php
header('Content-Type: application/json');

// Проверяем, был ли отправлен файл
if (!isset($_FILES['file']) || $_FILES['file']['error'] !== UPLOAD_ERR_OK) {
    echo json_encode(['status' => 'error', 'message' => 'Файл не был загружен']);
    exit;
}

// Получаем данные из формы
$category = $_POST['category'] ?? '';
$folder = $_POST['folder'] ?? '';
$file = $_FILES['file'];

// Проверяем, что категория и папка не пустые
if (empty($category) || empty($folder)) {
    echo json_encode(['status' => 'error', 'message' => 'Категория или папка не выбраны']);
    exit;
}

// Создаем путь для сохранения файла
$uploadDir = __DIR__ . "/uploads/$category/$folder/";

// Создаем директории, если они не существуют
if (!file_exists($uploadDir)) {
    mkdir($uploadDir, 0777, true);
}

// Генерируем уникальное имя файла
$fileName = uniqid() . '_' . $file['name'];
$filePath = $uploadDir . $fileName;

// Пытаемся переместить загруженный файл
if (move_uploaded_file($file['tmp_name'], $filePath)) {
    echo json_encode([
        'status' => 'success',
        'message' => 'Файл успешно загружен',
        'fileName' => $fileName
    ]);
} else {
    echo json_encode(['status' => 'error', 'message' => 'Ошибка при сохранении файла']);
}

