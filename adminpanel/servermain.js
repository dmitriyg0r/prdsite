const express = require('express');
const cors = require('cors');
const https = require('https');
const fs = require('fs');
const db = require('./maindb.js');
const app = express();
const path = require('path');

// Настройка CORS и middleware
app.use(cors({
    origin: ['https://space-point.ru', 'http://localhost:3000'],
    methods: ['GET', 'POST', 'DELETE', 'PUT', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
    credentials: true
}));

app.use(express.json());

// Добавьте сразу после создания app
app.use((req, res, next) => {
    console.log('Входящий запрос:', {
        method: req.method,
        url: req.url,
        headers: req.headers
    });
    next();
});

// Создаем Router для API
const apiRouter = express.Router();

// Определяем маршруты API
apiRouter.get('/whitelist', async (req, res) => {
    console.log('Получен запрос к /api/whitelist');
    try {
        const [rows] = await db.query('SELECT * FROM White_List');
        console.log('Получены данные:', rows);
        res.json({ 
            success: true, 
            data: rows 
        });
    } catch (error) {
        console.error('Ошибка при обработке запроса:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

apiRouter.post('/whitelist', async (req, res) => {
    try {
        const { UUID, user } = req.body;
        await db.query('INSERT INTO White_List (UUID, user) VALUES (?, ?)', [UUID, user]);
        res.json({ success: true, message: 'Запись добавлена' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

apiRouter.delete('/whitelist/:uuid', async (req, res) => {
    try {
        const { uuid } = req.params;
        await db.query('DELETE FROM White_List WHERE UUID = ?', [uuid]);
        res.json({ success: true, message: 'Запись удалена' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Важно: подключаем API маршруты ДО статических маршрутов
app.use('/api', apiRouter);

// Статические маршруты
app.use('/adminpanel', express.static(path.join(__dirname, 'admin')));
app.get('/adminpanel', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin.html'));
});

// Тестовый маршрут
app.get('/test', (req, res) => {
    res.json({ message: 'Сервер работает' });
});

// Обработчик 404
app.use((req, res) => {
    console.log('404 для URL:', req.url);
    res.status(404).json({
        success: false,
        error: `Путь ${req.url} не найден`
    });
});

// ... rest of the code (SSL setup and server start) ...