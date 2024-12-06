<?php
header('Content-Type: application/json');
require_once __DIR__ . '/../config/db.php';

try {
    // Получаем ID пользователя из токена
    $headers = getallheaders();
    $token = str_replace('Bearer ', '', $headers['Authorization'] ?? '');
    
    $stmt = $pdo->prepare('
        SELECT u.id 
        FROM users u 
        JOIN sessions s ON u.id = s.user_id 
        WHERE s.token = ? AND s.expires_at > NOW()
    ');
    $stmt->execute([$token]);
    $user = $stmt->fetch();
    
    if (!$user) {
        throw new Exception('Unauthorized', 401);
    }

    // Создаем таблицу постов, если её нет
    $pdo->exec('
        CREATE TABLE IF NOT EXISTS posts (
            id INT PRIMARY KEY AUTO_INCREMENT,
            user_id INT NOT NULL,
            content TEXT NOT NULL,
            image_url VARCHAR(255),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    ');

    // Получаем посты
    $stmt = $pdo->prepare('
        SELECT 
            p.id,
            p.content,
            p.image_url,
            p.created_at,
            u.username as author,
            u.avatar_url as authorAvatar,
            (SELECT COUNT(*) FROM post_likes WHERE post_id = p.id) as likes,
            EXISTS(SELECT 1 FROM post_likes WHERE post_id = p.id AND user_id = ?) as liked,
            p.user_id = ? as canDelete
        FROM posts p
        JOIN users u ON p.user_id = u.id
        ORDER BY p.created_at DESC
        LIMIT 50
    ');
    $stmt->execute([$user['id'], $user['id']]);
    $posts = $stmt->fetchAll();

    echo json_encode([
        'success' => true,
        'data' => $posts
    ]);

} catch (Exception $e) {
    http_response_code($e->getCode() ?: 400);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}
