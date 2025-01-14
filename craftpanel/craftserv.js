const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const cors = require('cors');
const path = require('path');

const app = express();
const port = 3003;

// Настройка CORS
app.use(cors({
    origin: function(origin, callback) {
        const allowedOrigins = [
            'http://localhost:3003',
            'http://localhost',
            'https://space-point.ru'
        ];
        
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true
}));

// Статические файлы для основного приложения
app.use('/', express.static(path.join(__dirname)));

// Настройка прокси для донат-панели
const proxyOptions = {
    target: 'http://188.127.241.209:25991',
    changeOrigin: true,
    ws: true,
    pathRewrite: {
        '^/donate-panel': ''
    },
    onProxyRes: function(proxyRes, req, res) {
        proxyRes.headers['access-control-allow-origin'] = '*';
        proxyRes.headers['access-control-allow-methods'] = 'GET, POST, PUT, DELETE, OPTIONS';
        proxyRes.headers['access-control-allow-headers'] = 'Origin, X-Requested-With, Content-Type, Accept';
    },
    onError: (err, req, res) => {
        console.error('Proxy Error:', err);
        res.status(500).send('Proxy Error');
    },
    logLevel: 'debug'
};

app.use('/donate-panel', createProxyMiddleware(proxyOptions));

// Маршрут для главной страницы и craft.html
app.get(['/craftpanel', '/craftpanel/craft.html'], (req, res) => {
    res.sendFile(path.join(__dirname, 'craft.html'));
});

// Запуск сервера
app.listen(port, () => {
    console.log(`Сервер запущен на порту ${port}`);
    console.log(`Путь к статическим файлам: ${path.join(__dirname)}`);
});

// Обработка ошибок
app.use((err, req, res, next) => {
    console.error('Ошибка:', err);
    res.status(500).send('Внутренняя ошибка сервера');
});

// Обработка необработанных ошибок
process.on('unhandledRejection', (reason, promise) => {
    console.error('Необработанное отклонение промиса:', reason);
});

process.on('uncaughtException', (error) => {
    console.error('Необработанная ошибка:', error);
});