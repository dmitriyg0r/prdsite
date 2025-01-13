const express = require('express');
const cors = require('cors');
const db = require('./maindb.js');
const app = express();

// Добавим подробное логирование
app.use((req, res, next) => {
    console.log('=== Новый запрос ===');
    console.log('URL:', req.url);
    console.log('Метод:', req.method);
    console.log('Headers:', req.headers);
    next();
});

// Настройка CORS
app.use(cors({
    origin: ['https://space-point.ru', 'http://localhost:3000'],
    methods: ['GET', 'POST', 'DELETE'],
    credentials: true
}));

app.use(express.json());

// Тестовый маршрут
app.get('/test', (req, res) => {
    res.json({ message: 'Сервер работает' });
});

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

// Обработка 404
app.use((req, res) => {
    console.log('404 для URL:', req.url);
    res.status(404).json({
        success: false,
        error: `Путь ${req.url} не найден`
    });
});

// Запуск сервера
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Сервер запущен на порту ${PORT}`);
    console.log('Доступные маршруты:');
    console.log('- GET /test');
    console.log('- GET /api/WhiteList');
});