const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');

const authRoutes = require('./routes/authserv');
const usersRoutes = require('./routes/usersserv');
const chatRoutes = require('./routes/chatserv');
const postsRoutes = require('./routes/postsserv');
const friendsRoutes = require('./routes/friendsserv');

const app = express();

// Middleware
app.use(cors({
    origin: ['https://adminflow.ru'],
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

// Проверка авторизации (исключаем публичные маршруты)
app.use((req, res, next) => {
    const publicPaths = [
        '/api/auth/login',
        '/api/auth/register',
        '/api/auth/anonymous-login',
        '/api/uploads'
    ];
    
    if (req.path.startsWith('/api/') && 
        !publicPaths.some(path => req.path.startsWith(path))) {
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

// Маршруты API
app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/posts', postsRoutes);
app.use('/api/friends', friendsRoutes);

// Добавьте логирование для отладки
app.use((req, res, next) => {
    console.log('Request path:', req.path);
    console.log('Request method:', req.method);
    next();
});

// Статические файлы (перемещаем после маршрутов API)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/api/uploads', express.static(path.join(__dirname, 'uploads')));

// Обработка ошибок 404
app.use((req, res) => {
    console.log('404 для пути:', req.path);
    res.status(404).json({
        success: false,
        message: 'Путь не найден'
    });
});

// Запуск сервера
const PORT = process.env.PORT || 5003;
app.listen(PORT, () => {
    console.log(`Сервер запущен на порту ${PORT}`);
});

module.exports = app;