<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);

header('Content-Type: application/json');
require_once 'memes_data.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    die(json_encode(['status' => 'error', 'message' => 'Неверный метод запроса']));
}

if (!isset($_FILES['meme'])) {
    die(json_encode(['status' => 'error', 'message' => 'Файл не был получен']));
}

$authorName = isset($_POST['author_name']) ? $_POST['author_name'] : 'Аноним';
$description = isset($_POST['description']) ? $_POST['description'] : '';
$uploadDir = '../memesy/';

if (!file_exists($uploadDir)) {
    mkdir($uploadDir, 0777, true);
}

try {
    $files = $_FILES['meme'];
    $uploadedFiles = [];
    $memesData = new MemesData();
    
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

    foreach ($files['name'] as $key => $name) {
        if ($files['error'][$key] === UPLOAD_ERR_OK) {
            $fileExtension = strtolower(pathinfo($name, PATHINFO_EXTENSION));
            $newFileName = uniqid() . '.' . $fileExtension;
            $targetFile = $uploadDir . $newFileName;
            
            if (move_uploaded_file($files['tmp_name'][$key], $targetFile)) {
                $memeInfo = [
                    'id' => uniqid(),
                    'path' => '../memesy/' . $newFileName,
                    'author' => $authorName,
                    'description' => $description,
                    'timestamp' => time()
                ];
                
                $memesData->addMeme($memeInfo);
                $uploadedFiles[] = $memeInfo;
            }
        }
    }

    if (!empty($uploadedFiles)) {
        echo json_encode([
            'status' => 'success',
            'message' => 'Файлы успешно загружены',
            'files' => $uploadedFiles
        ]);
    } else {
        echo json_encode([
            'status' => 'error',
            'message' => 'Не удалось загрузить файлы'
        ]);
    }

} catch (Exception $e) {
    echo json_encode([
        'status' => 'error',
        'message' => 'Ошибка: ' . $e->getMessage()
    ]);
}
?> 