const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const app = express();

// Массив для хранения пользователей
const users = [
    { 
        username: 'dimon', 
        password: 'Gg3985502', 
        role: 'Admin',
        createdAt: new Date()
    }
];

// Middleware
app.use(cors({
    origin: ['http://localhost:3000', 'https://adminflow.ru'],
    credentials: true
}));
app.use(bodyParser.json());

// Логгер запросов
app.use((req, res, next) => {
    console.log('\n=== Новый запрос ===');
    console.log('Время:', new Date().toISOString());
    console.log('Метод:', req.method);
    console.log('URL:', req.url);
    console.log('Тело:', req.body);
    next();
});

// Маршрут для регистрации
app.post('/api/register', (req, res) => {
    console.log('POST /api/register вызван');
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({
            success: false,
            message: 'Требуются имя пользователя и пароль'
        });
    }

    if (users.find(u => u.username === username)) {
        return res.status(400).json({
            success: false,
            message: 'Пользователь уже существует'
        });
    }

    const newUser = {
        username,
        password,
        role: 'User',
        createdAt: new Date()
    };

    users.push(newUser);

    res.json({
        success: true,
        message: 'Регистрация успешна',
        data: { username: newUser.username, role: newUser.role }
    });
});

// Маршрут для входа
app.post('/api/auth/login', (req, res) => {
    console.log('POST /api/auth/login вызван');
    console.log('Тело запроса:', req.body);
    
    const { username, password } = req.body;

    const user = users.find(u => u.username === username && u.password === password);

    if (!user) {
        return res.status(401).json({
            success: false,
            message: 'Неверное имя пользователя или пароль'
        });
    }

    res.json({
        success: true,
        message: 'Вход выполнен успешно',
        data: {
            username: user.username,
            role: user.role
        }
    });
});

// Маршрут для анонимного входа
app.post('/api/auth/anonymous-login', (req, res) => {
    console.log('POST /api/auth/anonymous-login вызван');
    
    const anonymousUser = {
        username: `anonymous_${Date.now()}`,
        role: 'Anonymous'
    };

    res.json({
        success: true,
        message: 'Анонимный вход выполнен успешно',
        data: anonymousUser
    });
});

// Маршрут для получения списка пользователей
app.get('/api/users', (req, res) => {
    console.log('GET /api/users вызван');
    
    // Отправляем список пользователей без паролей
    const safeUsers = users.map(user => ({
        username: user.username,
        role: user.role,
        createdAt: user.createdAt
    }));

    res.json({
        success: true,
        data: safeUsers
    });
});

// Запуск сервера
const PORT = process.env.PORT || 5003;
app.listen(PORT, () => {
    console.log(`Сервер запущен на порту ${PORT}`);
    console.log('Доступные маршруты:');
    console.log('POST /api/register');
    console.log('POST /api/auth/login');
    console.log('POST /api/auth/anonymous-login');
    console.log('GET  /api/users');
});