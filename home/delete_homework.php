<?php
header('Content-Type: application/json');

$homeworkFile = '../home/homework_data/homework.json';

try {
    if (!isset($_POST['id'])) {
        throw new Exception('ID задания не указан');
    }

    $id = $_POST['id'];
    
    if (file_exists($homeworkFile)) {
        $homework = json_decode(file_get_contents($homeworkFile), true) ?? [];
        
        // Находим индекс задания для удаления
        $index = array_search($id, array_column($homework, 'id'));
        
        if ($index !== false) {
            // Удаляем связанные файлы
            if (!empty($homework[$index]['files'])) {
                foreach ($homework[$index]['files'] as $file) {
                    $filePath = '../home/' . $file['url'];
                    if (file_exists($filePath)) {
                        unlink($filePath);
                    }
                }
            }
            
            // Удаляем задание из массива
            array_splice($homework, $index, 1);
            
            // Сохраняем обновленный список
            file_put_contents($homeworkFile, json_encode($homework, JSON_PRETTY_PRINT));
            
            echo json_encode([
                'success' => true,
                'message' => 'Задание успешно удалено'
            ]);
        } else {
            throw new Exception('Задание не найдено');
        }
    } else {
        throw new Exception('Файл с заданиями не найден');
    }
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
} 