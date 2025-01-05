<?php
require_once 'config.php';

header('Content-Type: application/json');

try {
    $conn = new mysqli(DB_HOST, DB_USER, DB_PASS, DB_NAME);
    
    if ($conn->connect_error) {
        throw new Exception("Ошибка подключения к БД: " . $conn->connect_error);
    }

    // Получаем данные из POST запроса
    $data = json_decode(file_get_contents('php://input'), true);
    $minecraft_login = $conn->real_escape_string($data['minecraft_login']);
    $user_ip = $_SERVER['REMOTE_ADDR'];
    $payment_status = $conn->real_escape_string($data['payment_status']);

    // Добавляем запись в БД
    $sql = "INSERT INTO minecraft_users (minecraft_login, ip_address, payment_status, created_at) 
            VALUES ('$minecraft_login', '$user_ip', '$payment_status', NOW())";

    if ($conn->query($sql) === TRUE) {
        echo json_encode(['success' => true]);
    } else {
        throw new Exception("Ошибка записи в БД: " . $conn->error);
    }

    $conn->close();

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
?> 