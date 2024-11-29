const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();

// Middleware для парсинга JSON
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS middleware
app.use(cors({
    origin: ['https://adminflow.ru', 'http://localhost:3000'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
}));

// Логирование всех запросов
app.use((req, res, next) => {
    console.log('=== Новый запрос ===');
    console.log('Время:', new Date().toISOString());
    console.log('Метод:', req.method);
    console.log('URL:', req.url);
    console.log('Тело:', req.body);
    console.log('Заголовки:', req.headers);
    console.log('==================');
    next();
});

// Тестовый маршрут
app.get('/', (req, res) => {
    console.log('Получен GET запрос на /');
    res.json({ message: 'API работает' });
});

// Маршрут регистрации
app.post('/register', async (req, res) => {
    console.log('Получен POST запрос на /register');
    console.log('Тело запроса:', req.body);
    
    try {
        const { username, password } = req.body;
        
        if (!username || !password) {
            console.log('Отсутствует username или password');
            return res.status(400).json({
                success: false,
                message: 'Необходимо указать имя пользователя и пароль'
            });
        }

        // Для тестирования
        console.log('Отправка успешного ответа');
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

// Обработка OPTIONS запросов
app.options('*', cors());

// Обработка 404
app.use((req, res) => {
    console.log('404 для URL:', req.url);
    res.status(404).json({
        success: false,
        message: `Маршрут ${req.method} ${req.url} не найден`
    });
});

// Обработка ошибок
app.use((err, req, res, next) => {
    console.error('Ошибка сервера:', err);
    res.status(500).json({
        success: false,
        message: 'Внутренняя ошибка сервера'
    });
});

const PORT = process.env.PORT || 5003;
app.listen(PORT, () => {
    console.log(`Сервер запущен на порту ${PORT}`);
    console.log('Доступные маршруты:');
    console.log('GET  /');
    console.log('POST /register');
});