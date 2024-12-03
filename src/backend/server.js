const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');

const authRoutes = require('./routes/auth');
const usersRoutes = require('./routes/users');
const chatRoutes = require('./routes/chat');

const app = express();

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

// Проверка авторизации
app.use((req, res, next) => {
    if (req.path.startsWith('/api/') && !req.path.includes('/auth/')) {
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            return res.status(401).json({
                success: false,
                message: 'Требуется авторизация'
            });
        }
    }
    next();
});

// Маршруты
app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/chat', chatRoutes);

// Статические файлы
app.use('/api/uploads', express.static(path.join(__dirname, 'uploads')));

// Запуск сервера
const PORT = process.env.PORT || 5003;
app.listen(PORT, () => {
    console.log(`Сервер запущен на порту ${PORT}`);
});