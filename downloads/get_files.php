<?php
// Устанавливаем заголовок Content-Type перед любым выводом
header('Content-Type: application/json');

$uploadDir = 'uploads/';

// Проверяем существование директории
if (!file_exists($uploadDir)) {
    echo json_encode([]);
    exit;
}

$categories = scandir($uploadDir);
$fileStorage = [];

foreach ($categories as $category) {
    if ($category === '.' || $category === '..') continue;
    $folders = scandir($uploadDir . $category);
    foreach ($folders as $folder) {
        if ($folder === '.' || $folder === '..') continue;
        $files = scandir($uploadDir . $category . '/' . $folder);
        $fileStorage[$category][$folder] = array_diff($files, ['.', '..']);
    }
}

echo json_encode($fileStorage);