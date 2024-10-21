<?php
// Включаем отображение ошибок для отладки
error_reporting(E_ALL);
ini_set('display_errors', 1);
header('Content-Type: application/json');

$uploadDir = 'uploads/';
$fileStorage = [];

function scanDirectory($dir) {
    $result = [];
    $files = scandir($dir);
    foreach ($files as $file) {
        if ($file !== '.' && $file !== '..') {
            $path = $dir . '/' . $file;
            if (is_dir($path)) {
                $subDir = scanDirectory($path);
                if (!empty($subDir)) {
                    $result[$file] = $subDir;
                }
            } else {
                $result[] = [
                    'name' => $file,
                    'size' => filesize($path),
                    'last_modified' => filemtime($path)
                ];
            }
        }
    }
    return $result;
}

// Проверяем существование директории
if (!is_dir($uploadDir)) {
    echo json_encode(['error' => 'Upload directory does not exist']);
    exit;
}

// Получаем структуру файлов и папок
$fileStorage = scanDirectory($uploadDir);

// Форматируем данные для возврата
$formattedStorage = [];
foreach ($fileStorage as $category => $folders) {
    if (is_array($folders)) {
        $formattedStorage[$category] = $folders;
    }
}

echo json_encode($formattedStorage);
?>
