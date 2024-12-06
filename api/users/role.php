<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Headers: Authorization, Content-Type');

try {
    require_once __DIR__ . '/../config/db.php';
    
    // Получаем все заголовки и логируем их
    $headers = getallheaders();
    error_log("All headers received: " . print_r($headers, true));
    
    // Получаем заголовок авторизации
    $authHeader = null;
    foreach ($headers as $name => $value) {
        if (strtolower($name) === 'authorization') {
            $authHeader = $value;
            break;
        }
    }
    
    error_log("Authorization header found: " . ($authHeader ?? 'not found'));
    
    // Проверяем наличие заголовка авторизации
    if (!$authHeader) {
        error_log("No Authorization header present");
        throw new Exception('Authorization header required');
    }
    
    // Извлекаем токен
    $token = trim(str_replace('Bearer', '', $authHeader));
    error_log("Extracted token: " . substr($token, 0, 10) . "...");
    
    if (empty($token)) {
        error_log("Empty token after extraction");
        throw new Exception('Valid token required');
    }
    
    // Проверяем токен в базе данных с получением ID пользователя
    $stmt = $pdo->prepare("
        SELECT 
            u.id,
            u.role, 
            u.username
        FROM users u 
        JOIN sessions s ON u.id = s.user_id 
        WHERE s.token = ? 
    ");
    
    $stmt->execute([$token]);
    $result = $stmt->fetch(PDO::FETCH_ASSOC);
    
    error_log("Database query result: " . print_r($result, true));
    
    if (!$result) {
        error_log("No valid session found for token");
        throw new Exception('Invalid or expired token');
    }
    
    // Проверяем наличие всех необходимых данных
    if (!isset($result['id']) || !isset($result['username']) || !isset($result['role'])) {
        error_log("Missing required user data in result: " . print_r($result, true));
        throw new Exception('Incomplete user data');
    }
    
    // Логируем успешную проверку роли
    error_log("Successful role check for user: " . $result['username'] . " with role: " . $result['role'] . " and ID: " . $result['id']);
    
    // Отправляем успешный ответ со всеми данными
    echo json_encode([
        'success' => true,
        'data' => [
            'id' => $result['id'],
            'role' => $result['role'],
            'username' => $result['username']
        ]
    ]);
    
} catch (PDOException $e) {
    error_log("Database error: " . $e->getMessage());
    error_log("Stack trace: " . $e->getTraceAsString());
    
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Database error occurred'
    ]);
} catch (Exception $e) {
    error_log("Role check error: " . $e->getMessage());
    error_log("Stack trace: " . $e->getTraceAsString());
    
    http_response_code(401);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}