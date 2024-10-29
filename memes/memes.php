<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    die(json_encode(['status' => 'error', 'message' => 'Неверный метод запроса']));
}

// Проверяем загрузку файла
if (!isset($_FILES['meme'])) {
    die(json_encode(['status' => 'error', 'message' => 'Файл не был получен']));
}

// Путь к папке memesy на сервере
$uploadDir = $_SERVER['DOCUMENT_ROOT'] . '/memesy/';

// Создаем директорию если не существует
if (!file_exists($uploadDir)) {
    mkdir($uploadDir, 0777, true);
}

$response = ['status' => 'error', 'message' => 'Неизвестная ошибка'];

try {
    $files = $_FILES['meme'];
    $uploadedFiles = [];
    
    // Если загружен один файл
    if (!is_array($files['name'])) {
        $files = array(
            'name' => array($files['name']),
            'type' => array($files['type']),
            'tmp_name' => array($files['tmp_name']),
            'error' => array($files['error']),
            'size' => array($files['size'])
        );
    }

    // Обрабатываем каждый файл
    foreach ($files['name'] as $key => $name) {
        if ($files['error'][$key] === UPLOAD_ERR_OK) {
            // Генерируем уникальное имя файла
            $fileExtension = strtolower(pathinfo($name, PATHINFO_EXTENSION));
            $newFileName = uniqid() . '.' . $fileExtension;
            $targetFile = $uploadDir . $newFileName;
            
            if (move_uploaded_file($files['tmp_name'][$key], $targetFile)) {
                // Сохраняем путь относительно корня сайта
                $uploadedFiles[] = '/memesy/' . $newFileName;
            }
        }
    }

    if (!empty($uploadedFiles)) {
        $response = [
            'status' => 'success',
            'message' => 'Файлы успешно загружены',
            'filePaths' => $uploadedFiles
        ];
    }

} catch (Exception $e) {
    $response = [
        'status' => 'error',
        'message' => 'Ошибка: ' . $e->getMessage()
    ];
}

echo json_encode($response);
?> 