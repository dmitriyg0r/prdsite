<?php
// Включаем отображение ошибок для отладки
error_reporting(E_ALL);
ini_set('display_errors', 1);

// Устанавливаем заголовок Content-Type перед любым выводом
header('Content-Type: application/json');

// Буферизируем вывод
ob_start();

// Проверяем, что запрос был отправлен методом POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode([
        'status' => 'error',
        'message' => 'Неверный метод запроса.'
    ]);
    exit;
}

// Проверяем наличие необходимых данных
if (!isset($_POST['category']) || !isset($_POST['folder']) || empty($_FILES['files'])) {
    echo json_encode([
        'status' => 'error',
        'message' => 'Отсутствуют необходимые данные.'
    ]);
    exit;
}

$uploadDir = 'uploads/';
$category = filter_var($_POST['category'], FILTER_SANITIZE_STRING);
$folder = filter_var($_POST['folder'], FILTER_SANITIZE_STRING);
$files = $_FILES['files'];

// Use environment variable for admin password
$admin_password = getenv('ADMIN_PASSWORD');

if ($_POST['admin_password'] !== $admin_password) {
    echo json_encode([
        'status' => 'error',
        'message' => 'Invalid admin password.'
    ]);
    exit;
}

// Improve file type validation
$allowed_extensions = ['pdf', 'doc', 'docx', 'txt', 'jpg', 'png'];

// Создаем директорию для загрузки, если она не существует
$targetDir = $uploadDir . $category . '/' . $folder . '/';
if (!file_exists($targetDir)) {
    mkdir($targetDir, 0777, true);
}

$uploadedFiles = [];
$errors = [];

// Обрабатываем каждый загруженный файл
foreach ($files['name'] as $key => $name) {
    $file_extension = strtolower(pathinfo($name, PATHINFO_EXTENSION));
    if (!in_array($file_extension, $allowed_extensions)) {
        $errors[] = "File type not allowed for $name.";
        continue;
    }

    if ($files['error'][$key] === UPLOAD_ERR_OK) {
        $targetFile = $targetDir . basename(filter_var($name, FILTER_SANITIZE_STRING));
        
        // Перемещаем загруженный файл в целевую директорию
        if (move_uploaded_file($files['tmp_name'][$key], $targetFile)) {
            $uploadedFiles[] = basename($name);
        } else {
            $errors[] = "Ошибка при загрузке файла $name.";
        }
    } else {
        $errors[] = "Ошибка загрузки файла $name: " . $files['error'][$key];
    }
}

if (!empty($uploadedFiles)) {
    $response = [
        'status' => 'success',
        'message' => 'Файлы успешно загружены.',
        'files' => $uploadedFiles,
        'category' => $category,
        'folder' => $folder,
        'errors' => $errors
    ];
} else {
    $response = [
        'status' => 'error',
        'message' => 'Не удалось загрузить ни одного файла.',
        'errors' => $errors
    ];
}

// Получаем буферизированный вывод
$output = ob_get_clean();

// Проверяем, есть ли какой-либо вывод перед нашим JSON
if (!empty($output)) {
    // Если есть, добавляем его к ответу
    $response['debug_output'] = $output;
}

// Отправляем JSON-ответ
echo json_encode($response);