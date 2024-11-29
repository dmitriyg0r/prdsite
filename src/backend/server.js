const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');
require('dotenv').config();

const app = express();

// Middleware
app.use(express.json());
app.use(cors({
    origin: ['https://adminflow.ru', 'http://localhost:3000'],
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
}));

// Подробное логирование
app.use((req, res, next) => {
    console.log('=== Новый запрос ===');
    console.log('Время:', new Date().toISOString());
    console.log('Метод:', req.method);
    console.log('URL:', req.url);
    console.log('Заголовки:', req.headers);
    console.log('Тело запроса:', req.body);
    console.log('==================');
    next();
});

// Тестовый endpoint
app.get('/', (req, res) => {
    res.json({ message: 'API работает' });
});

// Маршрут регистрации
app.post('/auth/register', async (req, res) => {
    try {
        const { username, password } = req.body;
        
        if (!username || !password) {
            return res.status(400).json({
                success: false,
                message: 'Необходимо указать имя пользователя и пароль'
            });
        }

        // Здесь будет код для работы с базой данных
        // Пока возвращаем успешный ответ
        res.status(201).json({
            success: true,
            message: 'Регистрация успешна',
            data: {
                username,
                role: 'User'
            }
        });
    } catch (error) {
        console.error('Ошибка при регистрации:', error);
        res.status(500).json({
            success: false,
            message: 'Ошибка при регистрации пользователя'
        });
    }
});

const PORT = process.env.PORT || 5003;
app.listen(PORT, () => {
    console.log(`Сервер запущен на порту ${PORT}`);
});