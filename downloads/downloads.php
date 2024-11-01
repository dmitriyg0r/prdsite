<?php
header('Content-Type: application/json');
error_reporting(E_ALL);
ini_set('display_errors', 1);

ob_start();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    exit(json_encode([
        'status' => 'error',
        'message' => 'Неверный метод запроса.'
    ]));
}

if (!isset($_POST['category']) || !isset($_POST['folder']) || empty($_FILES['files'])) {
    exit(json_encode([
        'status' => 'error',
        'message' => 'Отсутствуют необходимые данные.'
    ]));
}

// Проверка размера файла
$maxFileSize = 50 * 1024 * 1024; // 50 MB
foreach ($_FILES['files']['size'] as $size) {
    if ($size > $maxFileSize) {
        exit(json_encode([
            'status' => 'error',
            'message' => 'Размер файла превышает 50 MB.'
        ]));
    }
}

$uploadDir = 'uploads/';
if (!file_exists($uploadDir)) {
    if (!mkdir($uploadDir, 0777, true)) {
        exit(json_encode([
            'status' => 'error',
            'message' => 'Не удалось создать директорию для загрузки.'
        ]));
    }
}

$category = filter_var($_POST['category'], FILTER_SANITIZE_SPECIAL_CHARS);
$folder = filter_var($_POST['folder'], FILTER_SANITIZE_SPECIAL_CHARS);
$files = $_FILES['files'];

if (!isset($_POST['admin_password']) || $_POST['admin_password'] !== 'Gg3985502') {
    exit(json_encode([
        'status' => 'error',
        'message' => 'Неверный пароль администратора.'
    ]));
}

$allowed_extensions = ['pdf', 'doc', 'docx', 'txt', 'jpg', 'jpeg', 'png', 'gif', 'pptx', 'xlsx', 'zip', 'rar'];
$targetDir = $uploadDir . $category . '/' . $folder . '/';

if (!file_exists($targetDir)) {
    if (!mkdir($targetDir, 0777, true)) {
        exit(json_encode([
            'status' => 'error',
            'message' => 'Не удалось создать директорию.'
        ]));
    }
}

$uploadedFiles = [];
$errors = [];

foreach ($files['name'] as $key => $name) {
    if ($files['error'][$key] !== UPLOAD_ERR_OK) {
        $errors[] = "Ошибка загрузки файла $name: " . $files['error'][$key];
        continue;
    }

    $file_extension = strtolower(pathinfo($name, PATHINFO_EXTENSION));
    if (!in_array($file_extension, $allowed_extensions)) {
        $errors[] = "Недопустимый тип файла для $name.";
        continue;
    }

    $sanitized_name = preg_replace("/[^a-zA-Z0-9.-]/", "_", $name);
    $targetFile = $targetDir . $sanitized_name;

    if (move_uploaded_file($files['tmp_name'][$key], $targetFile)) {
        chmod($targetFile, 0644);
        $uploadedFiles[] = $sanitized_name;
    } else {
        $errors[] = "Ошибка при сохранении файла $name.";
    }
}

$output = ob_get_clean();

$response = [
    'status' => !empty($uploadedFiles) ? 'success' : 'error',
    'message' => !empty($uploadedFiles) 
        ? 'Файлы успешно загружены.' 
        : 'Не удалось загрузить ни одного файла.',
    'files' => $uploadedFiles,
    'category' => $category,
    'folder' => $folder,
    'errors' => $errors
];

if (!empty($output)) {
    $response['debug_output'] = $output;
}

echo json_encode($response);
?>
