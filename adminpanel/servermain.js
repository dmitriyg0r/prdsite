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
        // Проверяем подключение к БД
        if (!db) {
            throw new Error('Нет подключения к базе данных');
        }

        // Добавляем CORS заголовки
        res.header('Access-Control-Allow-Origin', ['https://space-point.ru', 'http://localhost:3000']);
        res.header('Access-Control-Allow-Methods', 'GET, POST, DELETE');
        res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
        res.header('Access-Control-Allow-Credentials', 'true');

        const [rows] = await db.query('SELECT * FROM white_list');
        
        if (!rows) {
            throw new Error('Данные не получены');
        }

        console.log('Получены данные:', rows);
        res.json({
            success: true,
            data: rows
        });
    } catch (error) {
        console.error('Ошибка при получении данных White List:', error);
        res.status(500).json({
            success: false,
            error: 'Ошибка при получении данных: ' + error.message
        });
    }
});

// Маршрут для удаления записей
app.delete('/api/WhiteList/:uuid', async (req, res) => {
    console.log('=== Запрос на удаление из White_List ===');
    try {
        const { uuid } = req.params;
        
        if (!uuid) {
            throw new Error('UUID не указан');
        }

        const [result] = await db.query('DELETE FROM white_list WHERE UUID = ?', [uuid]);
        
        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                error: 'Запись не найдена'
            });
        }

        res.json({
            success: true,
            message: 'Запись успешно удалена'
        });
    } catch (error) {
        console.error('Ошибка при удалении:', error);
        res.status(500).json({
            success: false,
            error: 'Ошибка при удалении: ' + error.message
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