<?php
header('Content-Type: application/json');

$homeworkFile = '../home/homework_data/homework.json';

if (file_exists($homeworkFile)) {
    $homework = json_decode(file_get_contents($homeworkFile), true) ?? [];
    echo json_encode($homework);
} else {
    echo json_encode([]);
} 