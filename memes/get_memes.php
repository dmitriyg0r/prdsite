<?php
header('Content-Type: application/json');

$uploadDir = '../memesy/';
$memes = [];

if (file_exists($uploadDir)) {
    $files = scandir($uploadDir);
    foreach ($files as $file) {
        if ($file !== '.' && $file !== '..') {
            $fileExtension = strtolower(pathinfo($file, PATHINFO_EXTENSION));
            if (in_array($fileExtension, ['jpg', 'jpeg', 'png', 'gif'])) {
                $memes[] = [
                    'path' => '../memesy/' . $file,
                    'author' => 'Аноним'
                ];
            }
        }
    }
}

echo json_encode([
    'status' => 'success',
    'memes' => $memes
]);
?> 