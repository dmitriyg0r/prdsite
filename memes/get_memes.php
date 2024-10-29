<?php
// Устанавливаем заголовок Content-Type
header('Content-Type: application/json');

$uploadDir = '../memesy/';
$memes = [];

// Проверяем существование директории
if (file_exists($uploadDir)) {
    $files = scandir($uploadDir);
    // Фильтруем . и .. и формируем массив путей к файлам
    $memes = array_values(array_filter($files, function($file) {
        return $file !== '.' && $file !== '..' && 
               in_array(strtolower(pathinfo($file, PATHINFO_EXTENSION)), ['jpg', 'jpeg', 'png', 'gif']);
    }));
    
    // Добавляем полный путь к файлам
    $memes = array_map(function($file) {
        return '../memesy/' . $file;
    }, $memes);
}

echo json_encode([
    'status' => 'success',
    'memes' => $memes
]);
?> 