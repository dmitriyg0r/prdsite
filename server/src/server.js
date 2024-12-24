const express = require('express');
const cors = require('cors');
const { pool, testConnection } = require('./utils/db');
const https = require('https');
const fs = require('fs');
const path = require('path');
const { Server } = require('socket.io');

const app = express();
const PORT = 5003;

// Middleware
app.use(cors({
    origin: ['https://adminflow.ru', 'http://adminflow.ru'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
}));
app.use(express.json());

// SSL Configuration
const sslOptions = {
    key: fs.readFileSync('/etc/letsencrypt/live/adminflow.ru/privkey.pem'),
    cert: fs.readFileSync('/etc/letsencrypt/live/adminflow.ru/fullchain.pem'),
    ca: fs.readFileSync('/etc/letsencrypt/live/adminflow.ru/chain.pem')
};

// Улучшаем тестирование соединения с базой данных
let dbConnected = false;
testConnection().then(connected => {
    if (!connected) {
        console.error('Не удалось подключиться к базе данных');
        process.exit(1);
    }
    if (!dbConnected) {
        dbConnected = true;
        console.log('Успешное подключение к базе данных');
    }
}).catch(err => {
    console.error('Ошибка подключения к базе данных:', err);
    process.exit(1);
});

// Routes
app.use('/api', require('./routes/auth'));
app.use('/api', require('./routes/profile'));
app.use('/api', require('./routes/chat'));
app.use('/api', require('./routes/feed'));
app.use('/api', require('./routes/admin'));
app.use('/api', require('./routes/upload'));
app.use('/api', require('./routes/messages'));

// Добавляем тестовый маршрут
app.get('/api/test', (req, res) => {
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
            message: 'Внутренняя ошибка сервера'
        });
    }
});

// HTTPS Server с обработкой ошибок
const httpsServer = https.createServer(sslOptions, app);

httpsServer.on('error', (error) => {
    console.error('Ошибка HTTPS сервера:', error);
    process.exit(1);
});

try {
    httpsServer.listen(PORT, '0.0.0.0', () => {
        console.log(`HTTPS Сервер запущен на порту ${PORT} (0.0.0.0:${PORT})`);
    });
} catch (error) {
    console.error('Ошибка при запуске сервера:', error);
    process.exit(1);
}

// Добавляем проверку SSL сертификатов
try {
    const sslFiles = {
        key: '/etc/letsencrypt/live/adminflow.ru/privkey.pem',
        cert: '/etc/letsencrypt/live/adminflow.ru/fullchain.pem',
        ca: '/etc/letsencrypt/live/adminflow.ru/chain.pem'
    };

    for (const [key, path] of Object.entries(sslFiles)) {
        if (!fs.existsSync(path)) {
            console.error(`SSL файл не найден: ${path}`);
            process.exit(1);
        }
    }
} catch (error) {
    console.error('Ошибка при проверке SSL сертификатов:', error);
    process.exit(1);
}

// Socket.IO
const io = new Server(httpsServer, {
    cors: {
        origin: ['https://adminflow.ru', 'http://adminflow.ru'],
        methods: ['GET', 'POST'],
        credentials: true
    }
});

io.on('connection', (socket) => {
    console.log('New Socket.IO connection:', socket.id);
});

// Error handling
process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
});

process.on('unhandledRejection', (error) => {
    console.error('Unhandled Rejection:', error);
});

// Обновляем обработчик ошибок
app.use((err, req, res, next) => {
    console.error('Express error:', err);
    res.status(500).json({ 
        status: 'error',
        message: 'Внутренняя ошибка сервера',
        details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

// Проверяем логи nginx
console.log('Checking nginx logs...');
console.log('=====================');
console.log(require('child_process').execSync('tail -f /var/log/nginx/error.log').toString());
console.log('=====================');