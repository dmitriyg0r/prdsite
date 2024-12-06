<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

// Обработка OPTIONS запроса
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

try {
    // Проверяем метод запроса
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        throw new Exception('Only POST method is allowed');
    }

    // Получаем данные запроса
    $rawData = file_get_contents('php://input');
    if (empty($rawData)) {
        throw new Exception('No data received');
    }

    // Подключение к базе данных
    require_once __DIR__ . '/../config/db.php';
    
    // Декодируем JSON
    $data = json_decode($rawData, true);
    if (json_last_error() !== JSON_ERROR_NONE) {
        throw new Exception('Invalid JSON data: ' . json_last_error_msg());
    }

    $username = $data['username'] ?? '';
    $password = $data['password'] ?? '';

    // Проверяем наличие данных
    if (empty($username) || empty($password)) {
        throw new Exception('Username and password are required');
    }

    // Ищем пользователя
    $stmt = $pdo->prepare('SELECT id, username, password_hash, role FROM users WHERE username = ?');
    $stmt->execute([$username]);
    $user = $stmt->fetch();

    if (!$user) {
        throw new Exception('User not found');
    }

    // Проверяем пароль
    if (!password_verify($password, $user['password_hash'])) {
        throw new Exception('Invalid password');
    }

    // Создаем таблицу sessions если её нет
    $pdo->query("
        CREATE TABLE IF NOT EXISTS sessions (
            id INT PRIMARY KEY AUTO_INCREMENT,
            user_id INT NOT NULL,
            token VARCHAR(255) NOT NULL,
            expires_at DATETIME NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    ");

    // Генерируем токен
    $token = bin2hex(random_bytes(32));
    $expires = date('Y-m-d H:i:s', strtotime('+7 days'));

    // Удаляем старые сессии пользователя
    $stmt = $pdo->prepare('DELETE FROM sessions WHERE user_id = ?');
    $stmt->execute([$user['id']]);

    // Сохраняем новую сессию
    $stmt = $pdo->prepare('INSERT INTO sessions (user_id, token, expires_at) VALUES (?, ?, ?)');
    $stmt->execute([$user['id'], $token, $expires]);

    // Обновляем статус пользователя
    $stmt = $pdo->prepare('UPDATE users SET is_online = TRUE, last_login = CURRENT_TIMESTAMP WHERE id = ?');
    $stmt->execute([$user['id']]);

    // Возвращаем успешный ответ
    echo json_encode([
        'success' => true,
        'data' => [
            'username' => $user['username'],
            'role' => $user['role'],
            'token' => $token
        ]
    ]);

} catch (Exception $e) {
    error_log("Login error: " . $e->getMessage());
    error_log("Stack trace: " . $e->getTraceAsString());

    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}