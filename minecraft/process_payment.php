<?php
require_once 'config.php';

header('Content-Type: application/json');

try {
    // Подключение к MySQL
    $conn = new mysqli(DB_HOST, DB_USER, DB_PASS, DB_NAME);
    
    if ($conn->connect_error) {
        throw new Exception("Ошибка подключения к БД: " . $conn->connect_error);
    }

    // Устанавливаем кодировку
    $conn->set_charset("utf8");

    // Проверяем существование таблицы
    $checkTable = $conn->query("SHOW TABLES LIKE 'minecraft_users'");
    if ($checkTable->num_rows == 0) {
        // Создаем таблицу, если она не существует
        $createTable = "CREATE TABLE minecraft_users (
            id INT AUTO_INCREMENT PRIMARY KEY,
            minecraft_login VARCHAR(255) NOT NULL,
            ip_address VARCHAR(45) NOT NULL,
            payment_status VARCHAR(50) NOT NULL,
            created_at DATETIME NOT NULL
        )";
        if (!$conn->query($createTable)) {
            throw new Exception("Ошибка создания таблицы: " . $conn->error);
        }
    }

    // Получаем данные из POST запроса
    $data = json_decode(file_get_contents('php://input'), true);
    
    if (!$data || !isset($data['minecraft_login']) || !isset($data['payment_status'])) {
        throw new Exception("Неверные входные данные");
    }
    
    // Подготовка данных с использованием подготовленного запроса
    $stmt = $conn->prepare("INSERT INTO minecraft_users (minecraft_login, ip_address, payment_status, created_at) VALUES (?, ?, ?, NOW())");
    
    if (!$stmt) {
        throw new Exception("Ошибка подготовки запроса: " . $conn->error);
    }

    $minecraft_login = $data['minecraft_login'];
    $user_ip = $_SERVER['REMOTE_ADDR'];
    $payment_status = $data['payment_status'];

    $stmt->bind_param("sss", $minecraft_login, $user_ip, $payment_status);
    
    if ($stmt->execute()) {
        echo json_encode(['success' => true]);
    } else {
        throw new Exception("Ошибка записи в БД: " . $stmt->error);
    }

    $stmt->close();
    $conn->close();

} catch (Exception $e) {
    http_response_code(500);
    error_log($e->getMessage()); // Логируем ошибку на сервере
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
?> 