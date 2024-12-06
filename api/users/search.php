<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);
header('Content-Type: application/json');

try {
    require_once '/var/www/adminflow.ru/api/config/db.php';
    
    // Проверяем авторизацию
    $headers = getallheaders();
    $token = str_replace('Bearer ', '', $headers['Authorization'] ?? '');
    
    if (empty($token)) {
        throw new Exception('Authorization required');
    }
    
    // Получаем текущего пользователя
    $stmt = $pdo->prepare('
        SELECT u.id 
        FROM users u 
        JOIN sessions s ON u.id = s.user_id 
        WHERE s.token = ? AND s.expires_at > NOW()
    ');
    $stmt->execute([$token]);
    $currentUser = $stmt->fetch();
    
    if (!$currentUser) {
        throw new Exception('Invalid token');
    }
    
    // Получаем поисковый запрос
    $query = $_GET['query'] ?? '';
    if (strlen($query) < 3) {
        throw new Exception('Search query must be at least 3 characters long');
    }
    
    // Ищем пользователей
    $stmt = $pdo->prepare('
        SELECT id, username, avatar_url 
        FROM users 
        WHERE username LIKE ? 
        AND id != ? 
        AND id NOT IN (
            SELECT friend_id FROM friends WHERE user_id = ?
            UNION
            SELECT user_id FROM friends WHERE friend_id = ?
        )
        LIMIT 10
    ');
    $stmt->execute(["%$query%", $currentUser['id'], $currentUser['id'], $currentUser['id']]);
    $users = $stmt->fetchAll();
    
    echo json_encode([
        'success' => true,
        'data' => array_map(function($user) {
            return [
                'username' => $user['username'],
                'avatarUrl' => $user['avatar_url'] ?? 'default-avatar.png'
            ];
        }, $users)
    ]);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
} 