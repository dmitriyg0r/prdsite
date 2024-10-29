<?php
header('Content-Type: application/json');
error_reporting(E_ALL);
ini_set('display_errors', 1);

try {
    // Получаем данные запроса
    $data = json_decode(file_get_contents('php://input'), true);

    // Проверяем наличие необходимых данных
    if (!isset($data['meme_id']) || !isset($data['password'])) {
        throw new Exception('Отсутствуют необходимые данные');
    }

    // Проверяем пароль
    $correct_password = 'Gg3985502'; // Замените на ваш пароль
    if ($data['password'] !== $correct_password) {
        throw new Exception('Неверный пароль');
    }

    // Путь к JSON файлу с данными - исправлен на правильный
    $json_file = '../memesy/memes_data.json';
    
    // Проверяем существование файла
    if (!file_exists($json_file)) {
        throw new Exception('Файл базы данных не найден: ' . $json_file);
    }

    // Читаем данные
    $json_content = file_get_contents($json_file);
    if ($json_content === false) {
        throw new Exception('Ошибка чтения файла данных');
    }

    $memes = json_decode($json_content, true);
    if ($memes === null) {
        throw new Exception('Ошибка декодирования JSON: ' . json_last_error_msg());
    }

    // Ищем мем по ID
    $meme_index = null;
    $meme = null;
    foreach ($memes as $index => $m) {
        if ($m['id'] == $data['meme_id']) {
            $meme_index = $index;
            $meme = $m;
            break;
        }
    }

    if ($meme === null) {
        throw new Exception('Мем не найден');
    }

    // Удаляем файл изображения
    $file_path = $meme['path'];
    if (file_exists($file_path)) {
        if (!unlink($file_path)) {
            throw new Exception('Ошибка удаления файла изображения: ' . $file_path);
        }
    }

    // Удаляем запись из массива
    array_splice($memes, $meme_index, 1);

    // Сохраняем обновленные данные
    if (file_put_contents($json_file, json_encode($memes, JSON_PRETTY_PRINT)) === false) {
        throw new Exception('Ошибка сохранения данных в файл');
    }

    echo json_encode([
        'status' => 'success',
        'message' => 'Мем успешно удален'
    ]);

} catch (Exception $e) {
    error_log("Delete meme error: " . $e->getMessage());
    http_response_code(400);
    echo json_encode([
        'status' => 'error',
        'message' => $e->getMessage()
    ]);
}
?> 