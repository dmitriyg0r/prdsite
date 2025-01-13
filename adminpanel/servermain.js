const express = require('express');
const cors = require('cors');
const https = require('https');
const fs = require('fs');
const db = require('./maindb.js');
const app = express();

// Настройка CORS
app.use(cors({
    origin: 'https://space-point.ru',
    methods: ['GET', 'POST', 'DELETE', 'PUT', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
}));

app.use(express.json());

// Роуты
app.get('/test', (req, res) => {
    res.json({ message: 'Сервер работает' });
});

app.get('/api/whitelist', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM white_list');
        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('Ошибка:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

app.post('/api/whitelist', async (req, res) => {
    try {
        const { UUID, user } = req.body;
        await db.query('INSERT INTO white_list (UUID, user) VALUES (?, ?)', [UUID, user]);
        res.json({ success: true, message: 'Запись добавлена' });
    } catch (error) {
        console.error('Ошибка:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

app.delete('/api/whitelist/:uuid', async (req, res) => {
    try {
        const { uuid } = req.params;
        await db.query('DELETE FROM white_list WHERE UUID = ?', [uuid]);
        res.json({ success: true, message: 'Запись удалена' });
    } catch (error) {
        console.error('Ошибка:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Путь к SSL сертификатам
const options = {
    cert: fs.readFileSync('/etc/letsencrypt/live/space-point.ru/fullchain.pem'),
    key: fs.readFileSync('/etc/letsencrypt/live/space-point.ru/privkey.pem'),
    ca: fs.readFileSync('/etc/letsencrypt/live/space-point.ru/chain.pem')
};

// Создаем HTTPS сервер
https.createServer(options, app).listen(3000, '0.0.0.0', () => {
    console.log('HTTPS Сервер запущен на порту 3000');
});

// Обработка необработанных ошибок
process.on('unhandledRejection', (error) => {
    console.error('Необработанная ошибка:', error);
});