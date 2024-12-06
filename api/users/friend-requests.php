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

    // Получаем входящие запросы в друзья
    $stmt = $pdo->prepare('
        SELECT 
            f.id,
            u.username,
            u.avatar_url,
            f.created_at
        FROM friendships f
        JOIN users u ON f.user_id = u.id
        WHERE f.friend_id = ? AND f.status = "pending"
    ');
    $stmt->execute([$user['id']]);
    $requests = $stmt->fetchAll();

    echo json_encode([
        'success' => true,
        'data' => $requests
    ]);

} catch (Exception $e) {
    http_response_code($e->getCode() ?: 400);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}
