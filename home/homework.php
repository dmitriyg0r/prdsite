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
        if (!isset($_POST['password']) || !password_verify($_POST['password'], PASSWORD_HASH)) {
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
    
    // ... Additional methods for file handling and data saving
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