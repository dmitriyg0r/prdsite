const express = require('express');
const cors = require('cors');
const { Server } = require('socket.io');
const http = require('http');
const authRoutes = require('./routes/auth');
const profileRoutes = require('./routes/profile');
const postsRoutes = require('./routes/posts');
const feedRoutes = require('./routes/feed');
const friendsRoutes = require('./routes/friends');
const healthRoutes = require('./routes/health');
const usersRoutes = require('./routes/users');
const chatsRouter = require('./routes/chats');

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
    console.log('Headers:', req.headers);
    console.log('Query:', req.query);
    console.log('Body:', req.body);
    next();
});

// CORS middleware
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    next();
});

// Подключаем маршруты
app.use('/api', authRoutes);
app.use('/api', profileRoutes);
app.use('/api', postsRoutes);
app.use('/api', feedRoutes);
app.use('/api', healthRoutes);
app.use('/api', friendsRoutes);
app.use('/api', usersRoutes);
app.use('/api/chats', chatsRouter);

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
    console.error('Server error:', err);
    res.status(500).json({
        success: false,
        error: 'Internal Server Error'
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