const express = require('express');
const cors = require('cors');
const db = require('./maindb.js');
const app = express();

// Логирование запросов
app.use((req, res, next) => {
    console.log('=== Новый запрос ===');
    console.log('URL:', req.url);
    console.log('Метод:', req.method);
    console.log('Headers:', req.headers);
    next();
});

// CORS и JSON
app.use(cors({
    origin: ['https://space-point.ru', 'http://localhost:3000'],
    methods: ['GET', 'POST', 'DELETE'],
    credentials: true
}));

app.use(express.json());

// Маршрут для White_List
app.get('/api/WhiteList', async (req, res) => {
    console.log('=== Запрос к White_List ===');
    try {
        const [rows] = await db.query('SELECT * FROM White_List');
        console.log('Данные из БД:', rows);
        res.json({
            success: true,
            data: rows
        });
    } catch (error) {
        console.error('Ошибка БД:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Маршрут для удаления записей
app.delete('/api/WhiteList/:uuid', async (req, res) => {
    console.log('=== Запрос на удаление из White_List ===');
    try {
        const { uuid } = req.params;
        await db.query('DELETE FROM White_List WHERE UUID = ?', [uuid]);
        res.json({
            success: true,
            message: 'Запись удалена'
        });
    } catch (error) {
        console.error('Ошибка при удалении:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Тестовый маршрут
app.get('/api/test', (req, res) => {
    res.json({
        success: true,
        message: 'API работает',
        time: new Date().toISOString()
    });
});