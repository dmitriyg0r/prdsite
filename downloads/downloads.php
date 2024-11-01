<?php
header('Content-Type: application/json');
error_reporting(E_ALL);
ini_set('display_errors', 1);

try {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        throw new Exception('Неверный метод запроса.');
    }

    if (!isset($_POST['category']) || !isset($_POST['folder']) || empty($_FILES['files'])) {
        throw new Exception('Отсутствуют необходимые данные.');
    }

    if (!isset($_POST['admin_password']) || $_POST['admin_password'] !== 'Gg3985502') {
        throw new Exception('Неверный пароль администратора.');
    }

    $category = filter_var($_POST['category'], FILTER_SANITIZE_SPECIAL_CHARS);
    $folder = filter_var($_POST['folder'], FILTER_SANITIZE_SPECIAL_CHARS);
    
    $targetDir = 'uploads/' . $category . '/' . $folder . '/';
    if (!file_exists($targetDir)) {
        if (!mkdir($targetDir, 0777, true)) {
            throw new Exception('Не удалось создать директорию категории/папки.');
        }
    }

    $uploadedFiles = [];
    $errors = [];

    foreach ($_FILES['files']['name'] as $key => $name) {
        if ($_FILES['files']['error'][$key] !== UPLOAD_ERR_OK) {
            $errors[] = "Ошибка загрузки файла $name";
            continue;
        }

        $sanitized_name = preg_replace("/[^a-zA-Zа-яА-Я0-9.-]/u", "_", $name);
        $targetFile = $targetDir . $sanitized_name;

        if (move_uploaded_file($_FILES['files']['tmp_name'][$key], $targetFile)) {
            chmod($targetFile, 0644);
            $uploadedFiles[] = $sanitized_name;
        } else {
            $errors[] = "Ошибка при сохранении файла $name";
        }
    }

    echo json_encode([
        'status' => !empty($uploadedFiles) ? 'success' : 'error',
        'message' => !empty($uploadedFiles) 
            ? 'Файлы успешно загружены.' 
            : 'Не удалось загрузить файлы.',
        'files' => $uploadedFiles,
        'category' => $category,
        'folder' => $folder,
        'errors' => $errors
    ]);

} catch (Exception $e) {
    echo json_encode([
        'status' => 'error',
        'message' => $e->getMessage()
    ]);
}
?>
