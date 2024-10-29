<?php
header('Content-Type: application/json');

$memesDir = $_SERVER['DOCUMENT_ROOT'] . '/memesy/';
$memes = [];

if (file_exists($memesDir)) {
    $files = scandir($memesDir);
    foreach ($files as $file) {
        if ($file !== '.' && $file !== '..') {
            // Добавляем путь относительно корня сайта
            $memes[] = '/memesy/' . $file;
        }
    }
}

echo json_encode([
    'status' => 'success',
    'memes' => $memes
]);
?> 