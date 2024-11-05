<?php
header('Content-Type: application/json');

$VALID_PASSWORD = 'Gg3985502';

try {
    // Отладочная информация
    error_log('Received POST data: ' . print_r($_POST, true));
    
    // Проверка пароля
    if (!isset($_POST['password'])) {
        throw new Exception('Пароль не был передан');
    }
    
    if ($_POST['password'] !== $VALID_PASSWORD) {
        throw new Exception('Неверный пароль: ' . $_POST['password']);
    }

    $dataDir = '../home/homework_data';
    $uploadsDir = '../home/uploads';

    // Создаем директории, если они не существуют
    if (!file_exists($dataDir)) {
        mkdir($dataDir, 0777, true);
    }
    if (!file_exists($uploadsDir)) {
        mkdir($uploadsDir, 0777, true);
    }

    // Проверка обязательных полей
    if (empty($_POST['title']) || empty($_POST['subject']) || empty($_POST['deadline'])) {
        throw new Exception('Не все обязательные поля заполнены');
    }
    
    $files = [];
    // Обработка загруженных файлов
    if (!empty($_FILES['files'])) {
        foreach ($_FILES['files']['tmp_name'] as $key => $tmp_name) {
            if ($_FILES['files']['error'][$key] === UPLOAD_ERR_OK) {
                $fileName = $_FILES['files']['name'][$key];
                $safeFileName = time() . '_' . preg_replace("/[^a-zA-Z0-9.]/", "_", $fileName);
                $filePath = $uploadsDir . '/' . $safeFileName;
                
                if (move_uploaded_file($tmp_name, $filePath)) {
                    $files[] = [
                        'name' => $fileName,
                        'url' => 'uploads/' . $safeFileName
                    ];
                }
            }
        }
    }
    
    // Создаем запись о задании
    $homework = [
        'id' => uniqid(),
        'title' => $_POST['title'],
        'subject' => $_POST['subject'],
        'deadline' => $_POST['deadline'],
        'description' => $_POST['description'] ?? '',
        'files' => $files,
        'created_at' => date('Y-m-d H:i:s')
    ];
    
    // Сохраняем задание в JSON файл
    $homeworkFile = $dataDir . '/homework.json';
    $existingData = [];
    
    if (file_exists($homeworkFile)) {
        $existingData = json_decode(file_get_contents($homeworkFile), true) ?? [];
    }
    
    array_unshift($existingData, $homework); // Добавляем новое задание в начало массива
    file_put_contents($homeworkFile, json_encode($existingData, JSON_PRETTY_PRINT));
    
    echo json_encode([
        'success' => true,
        'data' => $homework,
        'message' => 'Задание успешно добавлено'
    ]);
    
} catch (Exception $e) {
    error_log('Error: ' . $e->getMessage());
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}