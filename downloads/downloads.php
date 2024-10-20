<?php
// Включаем отображение ошибок для отладки
error_reporting(E_ALL);
ini_set('display_errors', 1);

// Проверяем, что запрос был отправлен методом POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode([
        'status' => 'error',
        'message' => 'Неверный метод запроса.'
    ]);
    exit;
}

// Проверяем наличие необходимых данных
if (!isset($_POST['category']) || !isset($_POST['folder']) || !isset($_FILES['file']) || $_FILES['file']['error'] !== UPLOAD_ERR_OK) {
    echo json_encode([
        'status' => 'error',
        'message' => 'Отсутствуют необходимые данные или ошибка загрузки файла.'
    ]);
    exit;
}

header('Content-Type: application/json');

$uploadDir = 'uploads/';
$category = $_POST['category'];
$folder = $_POST['folder'];
$file = $_FILES['file'];

$admin_password = $_POST['admin_password'];

if ($admin_password !== "Gg3985502") {
    echo json_encode([
        'status' => 'error',
        'message' => 'ха-ха-ха'
    ]);
    exit;
}

// Создаем директорию для загрузки, если она не существует
$targetDir = $uploadDir . $category . '/' . $folder . '/';
if (!file_exists($targetDir)) {
    mkdir($targetDir, 0777, true);
}

// Определяем путь к загружаемому файлу
$targetFile = $targetDir . basename($file['name']);

// Перемещаем загруженный файл в целевую директорию
if (move_uploaded_file($file['tmp_name'], $targetFile)) {
    echo json_encode([
        'status' => 'success',
        'message' => 'Файл успешно загружен.',
        'file' => basename($file['name']),
        'category' => $category,
        'folder' => $folder
    ]);
} else {
    echo json_encode([
        'status' => 'error',
        'message' => 'Ошибка при загрузке файла.'
    ]);
}
