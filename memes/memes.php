<?php
// Включаем отображение ошибок для отладки
error_reporting(E_ALL);
ini_set('display_errors', 1);

// Устанавливаем заголовок Content-Type
header('Content-Type: application/json');

// Буферизируем вывод
ob_start();

// Проверяем метод запроса
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode([
        'status' => 'error',
        'message' => 'Неверный метод запроса.'
    ]);
    exit;
}

// Проверяем наличие файлов
if (empty($_FILES['meme'])) {
    echo json_encode([
        'status' => 'error',
        'message' => 'Файл не был загружен.'
    ]);
    exit;
}

$uploadDir = '../memesy/';
$files = $_FILES['meme'];

// Проверка пароля администратора
$admin_password = 'Gg3985502';
if ($_POST['admin_password'] !== $admin_password) {
    echo json_encode([
        'status' => 'error',
        'message' => 'Invalid admin password.'
    ]);
    exit;
}

// Разрешенные типы файлов
$allowed_extensions = ['jpg', 'jpeg', 'png', 'gif'];

// Создаем директорию если не существует
if (!file_exists($uploadDir)) {
    mkdir($uploadDir, 0777, true);
}

$uploadedFiles = [];
$errors = [];

// Обработка загруженных файлов
foreach ($files['name'] as $key => $name) {
    $file_extension = strtolower(pathinfo($name, PATHINFO_EXTENSION));
    
    // Проверка расширения файла
    if (!in_array($file_extension, $allowed_extensions)) {
        $errors[] = "Недопустимый тип файла для $name.";
        continue;
    }

    if ($files['error'][$key] === UPLOAD_ERR_OK) {
        $targetFile = $uploadDir . basename(filter_var($name, FILTER_SANITIZE_SPECIAL_CHARS));

        if (move_uploaded_file($files['tmp_name'][$key], $targetFile)) {
            $uploadedFiles[] = basename($name);
        } else {
            $errors[] = "Ошибка при загрузке файла $name.";
        }
    } else {
        $errors[] = "Ошибка загрузки файла $name: " . $files['error'][$key];
    }
}

// Формируем ответ
if (!empty($uploadedFiles)) {
    $response = [
        'status' => 'success',
        'message' => 'Мемы успешно загружены.',
        'files' => $uploadedFiles,
        'filePaths' => array_map(function($file) use ($uploadDir) {
            return '../memesy/' . $file;
        }, $uploadedFiles),
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

// Добавляем отладочную информацию если есть
if (!empty($output)) {
    $response['debug_output'] = $output;
}

// Отправляем JSON-ответ
echo json_encode($response);
?> 