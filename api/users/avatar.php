<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);
header('Content-Type: application/json');

try {
    require_once '/var/www/adminflow.ru/api/config/db.php';
    
    // Проверяем метод запроса
    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        // Получаем username из заголовка
        $headers = getallheaders();
        $username = $headers['X-Username'] ?? null;
        
        if (!$username) {
            throw new Exception('Username is required');
        }
        
        // Получаем путь к аватару из базы данных
        $stmt = $pdo->prepare('SELECT avatar_url FROM users WHERE username = ?');
        $stmt->execute([$username]);
        $result = $stmt->fetch();
        
        if ($result && $result['avatar_url']) {
            echo json_encode([
                'success' => true,
                'data' => [
                    'avatarUrl' => $result['avatar_url']
                ]
            ]);
        } else {
            echo json_encode([
                'success' => true,
                'data' => [
                    'avatarUrl' => 'default-avatar.png'
                ]
            ]);
        }
    } else {
        throw new Exception('Method not allowed');
    }
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}
