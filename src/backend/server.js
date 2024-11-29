const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();

// Временное хранилище пользователей
const users = new Map();

// Middleware
app.use(bodyParser.json());
app.use(cors({
    origin: 'https://adminflow.ru',
    credentials: true,
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Логирование
app.use((req, res, next) => {
    console.log('=== Новый запрос ===');
    console.log('Время:', new Date().toISOString());
    console.log('Метод:', req.method);
    console.log('URL:', req.url);
    console.log('Тело:', req.body);
    next();
});

// Маршрут регистрации
app.post('/api/register', (req, res) => {
    console.log('POST /api/register вызван');
    console.log('Тело запроса:', req.body);
    
    const { username, password } = req.body;
    
    // Проверка наличия необходимых полей
    if (!username || !password) {
        return res.status(400).json({
            success: false,
            message: 'Необходимо указать имя пользователя и пароль'
        });
    }
    
    // Проверка существования пользователя
    if (users.has(username)) {
        return res.status(400).json({
            success: false,
            message: 'Пользователь с таким именем уже существует'
        });
    }
    
    // Сохраняем пользователя
    users.set(username, {
        username,
        password, // В реальном приложении пароль нужно хешировать
        role: 'User',
        createdAt: new Date().toISOString()
    });
    
    console.log('Зарегистрирован новый пользователь:', username);
    console.log('Всего пользователей:', users.size);

    res.status(201).json({
        success: true,
        message: 'Регистрация успешна',
        data: {
            username,
            role: 'User'
        }
    });
});

// Маршрут для входа
app.post('/api/auth/login', (req, res) => {
    console.log('POST /api/auth/login вызван');
    console.log('Тело запроса:', req.body);
    
    const { username, password } = req.body;
    
    if (!username || !password) {
        return res.status(400).json({
            success: false,
            message: 'Необходимо указать имя пользователя и пароль'
        });
    }
    
    // Проверяем существование пользователя и правильность пароля
    const user = users.get(username);
    if (!user || user.password !== password) {
        return res.status(401).json({
            success: false,
            message: 'Неверное имя пользователя или пароль'
        });
    }

    res.status(200).json({
        success: true,
        message: 'Вход выполнен успешно',
        data: {
            username: user.username,
            role: user.role,
            token: 'token-' + Date.now()
        }
    });
});

// Маршрут для анонимного входа
app.post('/api/auth/anonymous-login', (req, res) => {
    console.log('POST /api/auth/anonymous-login вызван');
    
    const guestUsername = 'guest_' + Math.random().toString(36).substring(7);
    
    res.status(200).json({
        success: true,
        message: 'Анонимный вход выполнен успешно',
        data: {
            username: guestUsername,
            role: 'Guest',
            token: 'guest-token-' + Date.now()
        }
    });
});

// Маршрут для получения списка пользователей (для отладки)
app.get('/api/users', (req, res) => {
    const usersList = Array.from(users.values()).map(user => ({
        username: user.username,
        role: user.role,
        createdAt: user.createdAt
    }));
    
    res.json({
        success: true,
        data: usersList
    });
});

// Обработка 404
app.use((req, res) => {
    console.log('404 для URL:', req.url);
    res.status(404).json({
        success: false,
        message: `Маршрут ${req.method} ${req.url} не найден`
    });
});

const PORT = 5003;
app.listen(PORT, () => {
    console.log(`Сервер запущен на порту ${PORT}`);
    console.log('Доступные маршруты:');
    console.log('POST /api/register');
    console.log('POST /api/auth/login');
    console.log('POST /api/auth/anonymous-login');
    console.log('GET  /api/users');
});