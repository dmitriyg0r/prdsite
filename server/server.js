const express = require('express');
const cors = require('cors');
const { Server } = require('socket.io');
const http = require('http');
const authRoutes = require('./routes/auth');
const profileRoutes = require('./routes/profile');
const postsRoutes = require('./routes/posts');
const feedRoutes = require('./routes/feed');
const friendsRoutes = require('./routes/friends');

const app = express();
const httpServer = http.createServer(app);

// Настройка CORS
app.use(cors({
    origin: ['https://adminflow.ru', 'http://localhost:3000'],
    credentials: true
}));

// Парсинг JSON
app.use(express.json());

// Расширенное логирование
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    if (req.method === 'POST') {
        console.log('Request body:', req.body);
    }
    if (req.method === 'GET') {
        console.log('Query params:', req.query);
    }

    // Логирование ответа
    const oldJson = res.json;
    res.json = function(data) {
        console.log('Response:', data);
        return oldJson.apply(res, arguments);
    };

    next();
});

// Подключаем маршруты
app.use('/api', authRoutes);
app.use('/api', profileRoutes);
app.use('/api', postsRoutes);
app.use('/api', feedRoutes);
app.use('/api', friendsRoutes);

// Маршрут проверки здоровья сервера
app.get('/api/health', (req, res) => {
    res.json({ 
        success: true,
        status: 'ok', 
        timestamp: new Date().toISOString(),
        services: {
            database: true,
            server: true
        }
    });
});

// Тестовый маршрут
app.get('/api/test', (req, res) => {
    console.log('Test endpoint hit');
    try {
        res.status(200).json({ 
            success: true,
            status: 'success',
            message: 'API работает',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Ошибка в тестовом маршруте:', error);
        res.status(500).json({ 
            success: false,
            status: 'error',
            message: 'Внутренняя ошибка сервера',
            error: error.message
        });
    }
});

// Обработка ошибок
app.use((err, req, res, next) => {
    console.error('Global error handler:', err);
    res.status(500).json({
        success: false,
        error: 'Внутренняя ошибка сервера',
        message: err.message
    });
});

// Настройка Socket.IO
const io = new Server(httpServer, {
    cors: {
        origin: ['https://adminflow.ru', 'http://localhost:3000'],
        methods: ['GET', 'POST'],
        credentials: true
    }
});

// Обработка WebSocket подключений
io.on('connection', (socket) => {
    console.log('New Socket.IO connection:', socket.id);
});

// Запуск сервера
const PORT = process.env.PORT || 5003;
httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`HTTP Сервер запущен на порту ${PORT}`);
});

// Обработка ошибок
process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    setTimeout(() => process.exit(1), 1000);
});

process.on('unhandledRejection', (error) => {
    console.error('Unhandled Rejection:', error);
});