<?php
require_once 'config.php';

header('Content-Type: application/json');

try {
    // Подключение к PostgreSQL
    $conn = pg_connect("host=".DB_HOST." port=3306 dbname=".DB_NAME." user=".DB_USER." password=".DB_PASS);
    
    if (!$conn) {
        throw new Exception("Ошибка подключения к БД: " . pg_last_error());
    }

    // Получаем данные из POST запроса
    $data = json_decode(file_get_contents('php://input'), true);
    
    // Подготовка данных с использованием параметризованного запроса
    $minecraft_login = $data['minecraft_login'];
    $user_ip = $_SERVER['REMOTE_ADDR'];
    $payment_status = $data['payment_status'];

    // Добавляем запись в БД используя подготовленный запрос
    $query = "INSERT INTO minecraft_users (minecraft_login, ip_address, payment_status, created_at) 
              VALUES ($1, $2, $3, NOW())";
              
    $result = pg_query_params($conn, $query, array(
        $minecraft_login,
        $user_ip,
        $payment_status
    ));

    if ($result) {
        echo json_encode(['success' => true]);
    } else {
        throw new Exception("Ошибка записи в БД: " . pg_last_error());
    }

    pg_close($conn);

} catch (Exception $e) {
    http_response_code(500);
    error_log($e->getMessage()); // Логируем ошибку на сервере
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
?> 