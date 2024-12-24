const express = require('express');
const cors = require('cors');
const { Server } = require('socket.io');
const http = require('http');

const app = express();
const httpServer = http.createServer(app);

// Настройка CORS
app.use(cors({
    origin: ['https://adminflow.ru', 'http://localhost:3000'],
    credentials: true
}));

// Парсинг JSON
app.use(express.json());

// Middleware для логирования
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});

// Тестовый маршрут
app.get('/api/test', (req, res) => {
    console.log('Test endpoint hit');
    try {
        res.status(200).json({ 
            status: 'success',
            message: 'API работает',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Ошибка в тестовом маршруте:', error);
        res.status(500).json({ 
            status: 'error',
            message: 'Внутренняя ошибка сервера',
            error: error.message
        });
    }
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