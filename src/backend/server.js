const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors({
    origin: ['https://adminflow.ru', 'http://localhost:3000'],
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
}));

// Middleware для логирования всех запросов
app.use((req, res, next) => {
    console.log(`${req.method} ${req.url}`);
    console.log('Headers:', req.headers);
    console.log('Body:', req.body);
    next();
});

// Подключение к базе данных
const pool = new Pool({
    user: 'your_username',
    host: 'localhost',
    database: 'adminflow',
    password: 'your_password',
    port: 5432,
});

// Базовый маршрут для проверки API
app.get('/', (req, res) => {
    res.json({ message: 'API работает' });
});

// Маршруты аутентификации
const authRoutes = express.Router();

authRoutes.post('/register', async (req, res) => {
    try {
        console.log('Получен запрос на регистрацию:', req.body);
        
        const { username, password } = req.body;
        
        if (!username || !password) {
            return res.status(400).json({
                success: false,
                message: 'Необходимо указать имя пользователя и пароль'
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        
        const result = await pool.query(
            'INSERT INTO users (username, password_hash) VALUES ($1, $2) RETURNING id, username, role',
            [username, hashedPassword]
        );
        
        res.status(201).json({
            success: true,
            message: 'Регистрация успешна',
            data: {
                id: result.rows[0].id,
                username: result.rows[0].username,
                role: result.rows[0].role
            }
        });
    } catch (error) {
        console.error('Ошибка при регистрации:', error);
        
        if (error.code === '23505') {
            res.status(400).json({
                success: false,
                message: 'Пользователь с таким именем уже существует'
            });
        } else {
            res.status(500).json({
                success: false,
                message: 'Ошибка при регистрации пользователя'
            });
        }
    }
});

// Подключаем маршруты аутентификации
app.use('/auth', authRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Сервер запущен на порту ${PORT}`);
});