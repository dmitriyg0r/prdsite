<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);
header('Content-Type: application/json');

try {
    // Логируем начало запроса
    error_log("Registration request started");

    // Проверяем подключение к базе данных
    require_once __DIR__ . '/../config/db.php';
    error_log("Database connection successful");

    // Получаем данные из запроса
    $rawData = file_get_contents('php://input');
    error_log("Raw request data: " . $rawData);

    $data = json_decode($rawData, true);
    if (json_last_error() !== JSON_ERROR_NONE) {
        throw new Exception('Invalid JSON data: ' . json_last_error_msg());
    }

    $username = $data['username'] ?? '';
    $password = $data['password'] ?? '';

    error_log("Registration attempt for username: " . $username);

    // Проверяем наличие данных
    if (empty($username) || empty($password)) {
        throw new Exception('Username and password are required');
    }

    // Проверяем, существует ли пользователь
    $stmt = $pdo->prepare('SELECT id FROM users WHERE username = ?');
    $stmt->execute([$username]);
    if ($stmt->fetch()) {
        throw new Exception('Username already exists');
    }

    // Хешируем пароль
    $passwordHash = password_hash($password, PASSWORD_DEFAULT);

    // Создаем нового пользователя
    $stmt = $pdo->prepare('INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)');
    $stmt->execute([$username, $passwordHash, 'user']);

    error_log("User registered successfully");

    echo json_encode([
        'success' => true,
        'message' => 'Registration successful'
    ]);

} catch (Exception $e) {
    error_log("Registration error: " . $e->getMessage());
    error_log("Stack trace: " . $e->getTraceAsString());

    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage(),
        'debug' => [
            'file' => $e->getFile(),
            'line' => $e->getLine()
        ]
    ]);
}