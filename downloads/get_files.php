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
            if (is_dir($dir . '/' . $file)) {
                $result[$file] = scanDirectory($dir . '/' . $file);
            } else {
                // Здесь вы можете добавить логику для определения категории и папки
                $result[] = $file;
            }
        }
    }
    return $result;
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
