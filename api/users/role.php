<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);
header('Content-Type: application/json');

try {
    require_once __DIR__ . '/../config/db.php';
    
    // Проверяем авторизацию
    $headers = getallheaders();
    $token = str_replace('Bearer ', '', $headers['Authorization'] ?? '');
    
    if (empty($token)) {
        throw new Exception('Authorization required');
    }
    
    // Получаем пользователя по токену
    $stmt = $pdo->prepare('
        SELECT u.role, u.username 
        FROM users u 
        JOIN sessions s ON u.id = s.user_id 
        WHERE s.token = ? AND s.expires_at > NOW()
    ');
    $stmt->execute([$token]);
    $result = $stmt->fetch();
    
    if (!$result) {
        throw new Exception('Invalid token');
    }
    
    // Добавим отладочную информацию
    error_log("User role check - Username: " . $result['username'] . ", Role: " . $result['role']);
    
    echo json_encode([
        'success' => true,
        'data' => [
            'role' => $result['role'],
            'username' => $result['username']
        ]
    ]);
    
} catch (Exception $e) {
    error_log("Role check error: " . $e->getMessage());
    http_response_code(401);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}
