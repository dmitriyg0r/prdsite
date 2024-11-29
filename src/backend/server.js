const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();

// Middleware
app.use(bodyParser.json());
app.use(cors({
    origin: 'https://adminflow.ru',
    credentials: true
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

// Базовый маршрут
app.get('/', (req, res) => {
    console.log('GET / вызван');
    res.json({ message: 'API работает' });
});

// Маршрут регистрации (без /api префикса)
app.post('/register', (req, res) => {
    console.log('POST /register вызван');
    console.log('Тело запроса:', req.body);
    
    const { username, password } = req.body;
    
    if (!username || !password) {
        return res.status(400).json({
            success: false,
            message: 'Необходимо указать имя пользователя и пароль'
        });
    }

    // Временно для тестирования
    res.status(201).json({
        success: true,
        message: 'Регистрация успешна',
        data: {
            username,
            role: 'User'
        }
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
    console.log('GET  /');
    console.log('POST /register');
});