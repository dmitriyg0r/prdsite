<?php
header('Content-Type: application/json');
error_reporting(E_ALL);
ini_set('display_errors', 1);

try {
    $uploadDir = 'uploads/';
    
    if (!file_exists($uploadDir)) {
        echo json_encode([]);
        exit;
    }

    $fileStorage = [];
    $categories = array_diff(scandir($uploadDir), ['.', '..']);

    foreach ($categories as $category) {
        $categoryPath = $uploadDir . $category;
        if (is_dir($categoryPath)) {
            $folders = array_diff(scandir($categoryPath), ['.', '..']);
            foreach ($folders as $folder) {
                $folderPath = $categoryPath . '/' . $folder;
                if (is_dir($folderPath)) {
                    $files = array_diff(scandir($folderPath), ['.', '..']);
                    if (!empty($files)) {
                        $fileStorage[$category][$folder] = array_values($files);
                    }
                }
            }
        }
    }

    echo json_encode($fileStorage);

} catch (Exception $e) {
    echo json_encode([
        'status' => 'error',
        'message' => $e->getMessage()
    ]);
}