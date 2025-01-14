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
        
        if (!origin || allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true
}));

// Статические файлы
app.use(express.static(path.join(__dirname, 'public')));

// Добавляем прокси для донат-панели
app.use('/donate-panel', createProxyMiddleware({
    target: 'http://188.127.241.209:25991',
    changeOrigin: true,
    pathRewrite: {
        '^/donate-panel': '/'
    },
    onProxyRes: function(proxyRes, req, res) {
        proxyRes.headers['Access-Control-Allow-Origin'] = '*';
    }
}));

// Маршрут для главной страницы
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'craft.html'));
});

// Запуск сервера
app.listen(port, () => {
    console.log(`Сервер запущен на порту ${port}`);
});