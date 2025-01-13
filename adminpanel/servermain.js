const express = require('express');
const cors = require('cors');
const https = require('https');
const fs = require('fs');
const db = require('./maindb.js');
const app = express();
const path = require('path');

// Настройка CORS
app.use(cors({
    origin: ['https://space-point.ru', 'http://localhost:3000'],
    methods: ['GET', 'POST', 'DELETE', 'PUT', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
    credentials: true
}));

app.use(express.json());

// Добавить раздачу статических файлов
app.use(express.static(__dirname));

// Роуты
app.get('/test', (req, res) => {
    res.json({ message: 'Сервер работает' });
});

app.get('/api/whitelist', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM White_List');
        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('Ошибка:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

app.post('/api/whitelist', async (req, res) => {
    try {
        const { UUID, user } = req.body;
        await db.query('INSERT INTO White_List (UUID, user) VALUES (?, ?)', [UUID, user]);
        res.json({ success: true, message: 'Запись добавлена' });
    } catch (error) {
        console.error('Ошибка:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

app.delete('/api/whitelist/:uuid', async (req, res) => {
    try {
        const { uuid } = req.params;
        await db.query('DELETE FROM White_List WHERE UUID = ?', [uuid]);
        res.json({ success: true, message: 'Запись удалена' });
    } catch (error) {
        console.error('Ошибка:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Добавить маршрут для админ-панели
app.get('/adminpanel', (req, res) => {
    res.sendFile(__dirname + '/admin.html');
});

// Добавить обработку ошибок
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ 
        success: false, 
        error: 'Внутренняя ошибка сервера' 
    });
});

// Путь к SSL сертификатам
const options = {
    cert: fs.readFileSync(path.join('/etc/letsencrypt/live/space-point.ru', 'fullchain.pem')),
    key: fs.readFileSync(path.join('/etc/letsencrypt/live/space-point.ru', 'privkey.pem')),
    ca: fs.readFileSync(path.join('/etc/letsencrypt/live/space-point.ru', 'chain.pem'))
};

// Создаем HTTPS сервер
https.createServer(options, app).listen(3000, '0.0.0.0', () => {
    console.log('HTTPS Сервер запущен на порту 3000');
});

// Обработка необработанных ошибок
process.on('unhandledRejection', (error) => {
    console.error('Необработанная ошибка:', error);
});