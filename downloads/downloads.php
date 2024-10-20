<?php
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $category = $_POST['category'];
    $folder = $_POST['folder'];
    $file = $_FILES['file'];

    // Путь для сохранения файла
    $uploadDir = '/var/www/downloads/' . $category . '/' . $folder . '/';

    // Создаем директорию, если она не существует
    if (!is_dir($uploadDir)) {
        mkdir($uploadDir, 0777, true);
    }

    // Проверяем, был ли файл успешно загружен
    if ($file['error'] === UPLOAD_ERR_OK) {
        $fileName = basename($file['name']);
        $uploadFile = $uploadDir . $fileName;

        // Перемещаем загруженный файл в целевую директорию
        if (move_uploaded_file($file['tmp_name'], $uploadFile)) {
            echo json_encode(['status' => 'success', 'message' => 'Файл успешно загружен.']);
        } else {
            echo json_encode(['status' => 'error', 'message' => 'Ошибка при загрузке файла.']);
        }
    } else {
        echo json_encode(['status' => 'error', 'message' => 'Ошибка при загрузке файла.']);
    }
} else {
    echo json_encode(['status' => 'error', 'message' => 'Неверный метод запроса.']);
}
?>