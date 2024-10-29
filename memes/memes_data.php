<?php
class MemesData {
    private $dataFile = '../memesy/memes_data.json';
    
    public function __construct() {
        if (!file_exists($this->dataFile)) {
            file_put_contents($this->dataFile, json_encode([]));
        }
    }
    
    public function getData() {
        return json_decode(file_get_contents($this->dataFile), true) ?? [];
    }
    
    public function saveData($data) {
        file_put_contents($this->dataFile, json_encode($data, JSON_PRETTY_PRINT));
    }
    
    public function addMeme($memeInfo) {
        $data = $this->getData();
        $data[] = $memeInfo;
        $this->saveData($data);
    }
}
?> 