<?php
header('Content-Type: application/json');
require_once 'memes_data.php';

$memesData = new MemesData();
$memes = $memesData->getData();

// Сортируем по времени (новые первыми)
usort($memes, function($a, $b) {
    return ($b['timestamp'] ?? 0) - ($a['timestamp'] ?? 0);
});

echo json_encode([
    'status' => 'success',
    'memes' => $memes
]);
?> 