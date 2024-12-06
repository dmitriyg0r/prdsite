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
    
    // Проверяем токен в базе данных
    $stmt = $pdo->prepare('
        SELECT u.id, u.username 
        FROM users u 
        JOIN sessions s ON u.id = s.user_id 
        WHERE s.token = ? AND s.expires_at > NOW()
    ');
    $stmt->execute([$token]);
    $user = $stmt->fetch();
    
    if (!$user) {
        throw new Exception('Invalid token');
    }

    // Проверяем загруженный файл
    if (!isset($_FILES['avatar'])) {
        throw new Exception('No file uploaded');
    }

    $file = $_FILES['avatar'];
    if ($file['error'] !== UPLOAD_ERR_OK) {
        throw new Exception('File upload failed with error code: ' . $file['error']);
    }

    // Проверяем тип файла
    $allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
    $fileInfo = finfo_open(FILEINFO_MIME_TYPE);
    $mimeType = finfo_file($fileInfo, $file['tmp_name']);
    finfo_close($fileInfo);

    if (!in_array($mimeType, $allowedTypes)) {
        throw new Exception('Invalid file type. Only JPG, PNG and GIF are allowed. Uploaded type: ' . $mimeType);
    }

    // Генерируем имя файла
    $extension = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
    $filename = $user['username'] . '_' . uniqid() . '.' . $extension;
    
    // Путь для сохранения файла
    $uploadDir = '/var/www/html/api/uploads/avatars';
    $uploadPath = $uploadDir . '/' . $filename;
    
    // Проверяем и создаем директорию
    if (!file_exists($uploadDir)) {
        if (!mkdir($uploadDir, 0755, true)) {
            error_log("Failed to create directory: " . $uploadDir);
            throw new Exception('Failed to create upload directory');
        }
    }

    // Проверяем права на запись
    if (!is_writable($uploadDir)) {
        error_log("Directory is not writable: " . $uploadDir);
        throw new Exception('Upload directory is not writable');
    }

    // Сохраняем файл
    if (!move_uploaded_file($file['tmp_name'], $uploadPath)) {
        error_log("Failed to move file. From: " . $file['tmp_name'] . " To: " . $uploadPath);
        error_log("File details: " . print_r($file, true));
        error_log("Upload error: " . error_get_last()['message']);
        throw new Exception('Failed to save file');
    }

    // Устанавливаем права на файл
    chmod($uploadPath, 0644);

    // Обновляем путь в базе данных
    $avatarUrl = '/api/uploads/avatars/' . $filename;
    $stmt = $pdo->prepare('UPDATE users SET avatar_url = ? WHERE id = ?');
    $stmt->execute([$avatarUrl, $user['id']]);

    // Проверяем успешность обновления в БД
    if ($stmt->rowCount() === 0) {
        error_log("Failed to update avatar_url in database for user ID: " . $user['id']);
        throw new Exception('Failed to update avatar in database');
    }

    echo json_encode([
        'success' => true,
        'data' => [
            'avatarUrl' => $avatarUrl
        ]
    ]);

} catch (Exception $e) {
    error_log("Avatar upload error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}