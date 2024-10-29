<?php
header('Content-Type: application/json');

try {
    $postsFile = __DIR__ . '/news/posts.json';
    
    if (!file_exists($postsFile)) {
        echo json_encode([]);
        exit;
    }

    $posts = json_decode(file_get_contents($postsFile), true);
    echo json_encode($posts);
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode(['error' => $e->getMessage()]);
}
?>
