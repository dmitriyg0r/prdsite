const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors({
    origin: 'https://adminflow.ru',
    credentials: true
}));

// Подключение к базе данных
const pool = new Pool({
    user: 'your_username',
    host: 'localhost',
    database: 'adminflow',
    password: 'your_password',
    port: 5432,
});

// Регистрация
app.post('/api/auth/register', async (req, res) => {
    try {
        const { username, password } = req.body;
        const hashedPassword = await bcrypt.hash(password, 10);
        
        const result = await pool.query(
            'INSERT INTO users (username, password_hash) VALUES ($1, $2) RETURNING *',
            [username, hashedPassword]
        );
        
        res.json({ success: true, message: 'Регистрация успешна' });
    } catch (error) {
        res.status(400).json({ success: false, message: 'Ошибка при регистрации' });
    }
});

// Вход
app.post('/api/auth/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        
        const result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
        const user = result.rows[0];
        
        if (!user || !(await bcrypt.compare(password, user.password_hash))) {
            return res.status(401).json({ success: false, message: 'Неверные учетные данные' });
        }
        
        const token = jwt.sign(
            { id: user.id, username: user.username, role: user.role },
            'your_jwt_secret',
            { expiresIn: '24h' }
        );
        
        res.json({
            success: true,
            data: {
                username: user.username,
                role: user.role,
                token: token
            }
        });
    } catch (error) {
        res.status(400).json({ success: false, message: 'Ошибка при входе' });
    }
});

// Получение списка пользователей (только для админов)
app.get('/api/users', authenticateToken, async (req, res) => {
    try {
        if (req.user.role !== 'Admin') {
            return res.status(403).json({ success: false, message: 'Доступ запрещен' });
        }
        
        const result = await pool.query('SELECT id, username, role, created_at FROM users');
        res.json({ success: true, data: result.rows });
    } catch (error) {
        res.status(400).json({ success: false, message: 'Ошибка при получении пользователей' });
    }
});

// Middleware для проверки JWT токена
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
        return res.status(401).json({ success: false, message: 'Требуется авторизация' });
    }
    
    try {
        const user = jwt.verify(token, 'your_jwt_secret');
        req.user = user;
        next();
    } catch (error) {
        res.status(403).json({ success: false, message: 'Неверный токен' });
    }
} 