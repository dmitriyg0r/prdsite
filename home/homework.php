<?php
require_once 'config.php';
header('Content-Type: application/json');

class HomeworkHandler {
    private $dataDir;
    private $uploadsDir;
    
    public function __construct() {
        $this->dataDir = '../home/homework_data';
        $this->uploadsDir = '../home/uploads';
        $this->ensureDirectoriesExist();
    }
    
    private function ensureDirectoriesExist() {
        foreach ([$this->dataDir, $this->uploadsDir] as $dir) {
            if (!file_exists($dir)) {
                mkdir($dir, 0777, true);
            }
        }
    }
    
    public function handleRequest() {
        try {
            $this->validateRequest();
            $files = $this->handleFileUploads();
            $homework = $this->createHomeworkEntry($files);
            $this->saveHomework($homework);
            
            return [
                'success' => true,
                'data' => $homework,
                'message' => 'Задание успешно добавлено'
            ];
        } catch (Exception $e) {
            throw $e;
        }
    }
    
    private function validateRequest() {
        if (!isset($_POST['password']) || $_POST['password'] !== PASSWORD_HASH) {
            throw new Exception('Неверный пароль');
        }
        
        if (empty($_POST['title']) || empty($_POST['subject']) || empty($_POST['deadline'])) {
            throw new Exception('Не все обязательные поля заполнены');
        }
    }
    
    private function handleFileUploads() {
        $files = [];
        if (!empty($_FILES['files'])) {
            foreach ($_FILES['files']['tmp_name'] as $key => $tmp_name) {
                $this->validateFile($_FILES['files'], $key);
                $files[] = $this->saveFile($_FILES['files'], $key);
            }
        }
        return $files;
    }
    
    private function createHomeworkEntry($files) {
        return [
            'id' => uniqid(),
            'title' => htmlspecialchars($_POST['title']),
            'description' => htmlspecialchars($_POST['description']),
            'subject' => htmlspecialchars($_POST['subject']),
            'deadline' => htmlspecialchars($_POST['deadline']),
            'files' => $files,
            'created_at' => date('Y-m-d H:i:s')
        ];
    }
    
    private function saveHomework($homework) {
        $homeworkFile = $this->dataDir . '/homework.json';
        $existingHomework = [];
        
        if (file_exists($homeworkFile)) {
            $existingHomework = json_decode(file_get_contents($homeworkFile), true) ?? [];
        }
        
        array_unshift($existingHomework, $homework);
        file_put_contents($homeworkFile, json_encode($existingHomework, JSON_PRETTY_PRINT));
    }
    
    private function validateFile($files, $key) {
        if ($files['error'][$key] !== UPLOAD_ERR_OK) {
            throw new Exception('Ошибка при загрузке файла');
        }

        $fileType = mime_content_type($files['tmp_name'][$key]);
        if (!in_array($fileType, ALLOWED_FILE_TYPES)) {
            throw new Exception('Недопустимый тип файла');
        }

        if ($files['size'][$key] > MAX_FILE_SIZE) {
            throw new Exception('Файл слишком большой');
        }
    }
    
    private function saveFile($files, $key) {
        $fileName = uniqid() . '_' . basename($files['name'][$key]);
        $filePath = $this->uploadsDir . '/' . $fileName;
        
        if (!move_uploaded_file($files['tmp_name'][$key], $filePath)) {
            throw new Exception('Ошибка при сохранении файла');
        }
        
        return [
            'name' => $files['name'][$key],
            'url' => 'uploads/' . $fileName
        ];
    }
}

try {
    $handler = new HomeworkHandler();
    $result = $handler->handleRequest();
    echo json_encode($result);
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}