<?php
header('Content-Type: application/json');

try {
    if (!isset($_FILES['image']) || !isset($_POST['postData'])) {
        throw new Exception('Missing required data');
    }

    $postData = json_decode($_POST['postData'], true);
    
    // Проверка пароля
    if (!isset($postData['password']) || $postData['password'] !== 'Gg3985502') {
        throw new Exception('Неверный пароль');
    }

    $image = $_FILES['image'];
    
    // Создаем директорию, если она не существует
    $uploadDir = __DIR__ . '/news/';
    if (!file_exists($uploadDir)) {
        mkdir($uploadDir, 0777, true);
    }

    // Генерируем уникальное имя файла
    $imageExt = pathinfo($image['name'], PATHINFO_EXTENSION);
    $imageName = uniqid() . '.' . $imageExt;
    $imagePath = $uploadDir . $imageName;

    // Сохраняем изображение
    if (!move_uploaded_file($image['tmp_name'], $imagePath)) {
        throw new Exception('Failed to upload image');
    }

    // Создаем запись о посте
    $post = [
        'id' => uniqid(),
        'type' => $postData['type'],
        'text' => $postData['text'],
        'image' => $imageName,
        'timestamp' => time()
    ];

    // Читаем существующие посты
    $postsFile = $uploadDir . 'posts.json';
    $posts = file_exists($postsFile) ? json_decode(file_get_contents($postsFile), true) : [];
    
    // Добавляем новый пост
    array_unshift($posts, $post);
    
    // Сохраняем обновленный список постов
    file_put_contents($postsFile, json_encode($posts));

    echo json_encode(['success' => true, 'post' => $post]);
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
?>