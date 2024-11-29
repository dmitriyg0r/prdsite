const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

const pool = new Pool({
    user: 'admin',
    host: 'localhost',
    database: 'adminflow',
    password: 'admin',
    port: 5432
});

const JWT_SECRET = 'your_secret_key';

// Весь серверный код, включая:
// - authenticateToken middleware
// - API endpoints (/api/auth/login, /api/users, etc.)
// - initDatabase function
// - app.listen

// Оставьте здесь только серверную часть, начиная с:
const authenticateToken = (req, res, next) => {
    // ... код middleware
};

// ... все API эндпоинты ...

// Инициализация базы данных и запуск сервера
initDatabase();
app.listen(3000, () => {
    console.log('Server running on port 3000');
}); 