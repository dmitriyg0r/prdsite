const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const app = express();

// Настройка CORS
app.use(cors({
    origin: 'https://adminflow.ru',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// Логирование всех запросов
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} ${req.method} ${req.url}`);
    console.log('Headers:', req.headers);
    if (req.body) console.log('Body:', req.body);
    next();
});

// Конфигурация базы данных
const pool = new Pool({
    user: 'admin',
    host: 'localhost',
    database: 'adminflow',
    password: 'admin123',
    port: 5432
});

// Middleware для проверки токена
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ success: false, message: 'Токен не предоставлен' });
    }

    jwt.verify(token, 'your_secret_key', (err, user) => {
        if (err) {
            return res.status(403).json({ success: false, message: 'Недействительный токен' });
        }
        req.user = user;
        next();
    });
};

// Маршруты API
app.get('/api/users', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM users');
        res.json({ success: true, data: result.rows });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ success: false, message: 'Ошибка сервера' });
    }
});

app.post('/api/users', authenticateToken, async (req, res) => {
    console.log('Получен POST запрос на /api/users');
    console.log('Headers:', req.headers);
    console.log('Body:', req.body);
    
    try {
        const { username, password, role } = req.body;
        
        if (!username || !password || !role) {
            return res.status(400).json({
                success: false,
                message: 'Все поля обязательны'
            });
        }

        const passwordHash = await bcrypt.hash(password, 10);

        const result = await pool.query(
            'INSERT INTO users (username, password_hash, role) VALUES ($1, $2, $3) RETURNING id, username, role',
            [username, passwordHash, role]
        );

        console.log('Пользователь успешно создан:', result.rows[0]);

        res.status(201).json({
            success: true,
            data: result.rows[0],
            message: 'Пользователь успешно создан'
        });

    } catch (error) {
        console.error('Ошибка при создании пользователя:', error);
        res.status(500).json({
            success: false,
            message: 'Ошибка при создании пользователя',
            error: error.message
        });
    }
});

app.put('/api/users/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { username, role } = req.body;

        const result = await pool.query(
            'UPDATE users SET username = $1, role = $2 WHERE id = $3 RETURNING *',
            [username, role, id]
        );

        res.json({ success: true, data: result.rows[0] });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ success: false, message: 'Ошибка сервера' });
    }
});

app.delete('/api/users/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        await pool.query('DELETE FROM users WHERE id = $1', [id]);
        res.json({ success: true, message: 'Пользователь удален' });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ success: false, message: 'Ошибка сервера' });
    }
});

// Запуск сервера
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});