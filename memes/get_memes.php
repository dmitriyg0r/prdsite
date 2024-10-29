<?php
header('Content-Type: application/json');

$memesDir = $_SERVER['DOCUMENT_ROOT'] . '/memesy/';
$memes = [];

if (file_exists($memesDir)) {
    $files = scandir($memesDir);
    foreach ($files as $file) {
        if ($file !== '.' && $file !== '..' && !str_ends_with($file, '.meta.json')) {
            $metaFile = $memesDir . $file . '.meta.json';
            $fileInfo = [
                'path' => '/memesy/' . $file,
                'author' => 'Аноним',
                'timestamp' => 0
            ];
            
            if (file_exists($metaFile)) {
                $meta = json_decode(file_get_contents($metaFile), true);
                if ($meta) {
                    $fileInfo = array_merge($fileInfo, $meta);
                }
            }
            
            $memes[] = $fileInfo;
        }
    }
}

// Сортируем по времени загрузки (новые первые)
usort($memes, function($a, $b) {
    return $b['timestamp'] - $a['timestamp'];
});

echo json_encode([
    'status' => 'success',
    'memes' => $memes
]);
?> 