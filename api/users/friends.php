<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);
header('Content-Type: application/json');
require_once __DIR__ . '/../config/db.php';

try {
    // Получаем заголовки
    $headers = getallheaders();
    
    // Отладочная информация
    error_log("Headers: " . print_r($headers, true));
    
    // Проверяем наличие заголовка Authorization
    if (!isset($headers['Authorization'])) {
        throw new Exception('No authorization token provided', 401);
    }
    
    $token = str_replace('Bearer ', '', $headers['Authorization']);
    
    if (empty($token)) {
        throw new Exception('Empty authorization token', 401);
    }
    
    // Получаем пользователя по токену
    $stmt = $pdo->prepare('
        SELECT u.id 
        FROM users u 
        JOIN sessions s ON u.id = s.user_id 
        WHERE s.token = ? AND s.expires_at > NOW()
    ');
    $stmt->execute([$token]);
    $user = $stmt->fetch();
    
    if (!$user) {
        throw new Exception('Invalid or expired token', 401);
    }

    // Получаем список друзей
    $stmt = $pdo->prepare('
        SELECT u.username, u.avatar_url, u.is_online
        FROM users u
        JOIN friendships f ON (u.id = f.friend_id OR u.id = f.user_id)
        WHERE (f.user_id = ? OR f.friend_id = ?)
        AND f.status = "accepted"
        AND u.id != ?
    ');
    $stmt->execute([$user['id'], $user['id'], $user['id']]);
    $friends = $stmt->fetchAll();

    echo json_encode([
        'success' => true,
        'data' => $friends
    ]);

} catch (Exception $e) {
    error_log("Friends API Error: " . $e->getMessage());
    http_response_code($e->getCode() ?: 400);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}
