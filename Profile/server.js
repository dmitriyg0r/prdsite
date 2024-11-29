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

// Middleware для проверки JWT
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ success: false, message: 'Токен не предоставлен' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ success: false, message: 'Недействительный токен' });
        }
        req.user = user;
        next();
    });
};

// API эндпоинты
app.post('/api/auth/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        
        const user = await pool.query(
            'SELECT * FROM users WHERE username = $1',
            [username]
        );

        if (user.rows.length === 0) {
            return res.status(401).json({ 
                success: false, 
                message: 'Неверное имя пользователя или пароль' 
            });
        }

        const validPassword = await bcrypt.compare(password, user.rows[0].password_hash);
        if (!validPassword) {
            return res.status(401).json({ 
                success: false, 
                message: 'Неверное имя пользователя или пароль' 
            });
        }

        const token = jwt.sign(
            { 
                id: user.rows[0].id, 
                username: user.rows[0].username,
                role: user.rows[0].role 
            },
            JWT_SECRET
        );

        res.json({
            success: true,
            data: {
                username: user.rows[0].username,
                role: user.rows[0].role,
                token: token
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ success: false, message: 'Ошибка сервера' });
    }
});

// Получение списка пользователей
app.get('/api/users', authenticateToken, async (req, res) => {
    try {
        if (req.user.role !== 'Admin') {
            return res.status(403).json({ success: false, message: 'Доступ запрещен' });
        }

        const result = await pool.query(
            'SELECT id, username, role, created_at FROM users'
        );
        
        res.json({ success: true, data: result.rows });
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ success: false, message: 'Ошибка сервера' });
    }
});

// Инициализация базы данных
async function initDatabase() {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                username VARCHAR(50) UNIQUE NOT NULL,
                password_hash VARCHAR(255) NOT NULL,
                role VARCHAR(20) NOT NULL DEFAULT 'User',
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            )
        `);

        const adminExists = await pool.query(
            'SELECT * FROM users WHERE username = $1',
            ['admin']
        );

        if (adminExists.rows.length === 0) {
            const passwordHash = await bcrypt.hash('admin123', 10);
            await pool.query(
                'INSERT INTO users (username, password_hash, role) VALUES ($1, $2, $3)',
                ['admin', passwordHash, 'Admin']
            );
            console.log('Admin user created');
        }

        console.log('Database initialized successfully');
    } catch (error) {
        console.error('Database initialization error:', error);
    }
}

// Запуск сервера
initDatabase();
app.listen(3000, () => {
    console.log('Server running on port 3000');
}); 