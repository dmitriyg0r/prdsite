<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type');

try {
    // Получаем данные запроса
    $data = json_decode(file_get_contents('php://input'), true);
    
    // Проверяем учетные данные админа
    $admin_username = 'admin';
    $admin_password = 'Gg3985502';
    
    if (!isset($data['username']) || !isset($data['password'])) {
        throw new Exception('Необходимо указать логин и пароль');
    }
    
    if ($data['username'] === $admin_username && $data['password'] === $admin_password) {
        // Генерируем специальный админ-токен
        $admin_token = bin2hex(random_bytes(32));
        
        // Сохраняем токен в сессии
        session_start();
        $_SESSION['admin_token'] = $admin_token;
        
        echo json_encode([
            'success' => true,
            'data' => [
                'token' => $admin_token,
                'message' => 'Авторизация успешна'
            ]
        ]);
    } else {
        throw new Exception('Неверный логин или пароль');
    }
    
} catch (Exception $e) {
    http_response_code(401);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}