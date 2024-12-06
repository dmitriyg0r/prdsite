const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const pool = require('./db');
const https = require('https');
const fs = require('fs');

const app = express();
const PORT = 5003;

// Middleware
app.use(cors({
    origin: 'https://adminflow.ru',
    credentials: true
}));
app.use(express.json());

// Logging middleware
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
});

// Test route
app.get('/api/test', async (req, res) => {
    try {
        const result = await pool.query('SELECT NOW()');
        res.json({ 
            success: true, 
            message: 'Database connection successful',
            timestamp: result.rows[0].now
        });
    } catch (err) {
        console.error('Database connection error:', err);
        res.status(500).json({ 
            success: false, 
            error: 'Database connection failed'
        });
    }
});

// Login route
app.post('/api/login', async (req, res) => {
    try {
        console.log('Получен запрос на авторизацию:', req.body);
        const { username, password } = req.body;
        
        // Поиск пользователя
        const user = await pool.query(
            'SELECT * FROM users WHERE username = $1',
            [username]
        );

        if (user.rows.length === 0) {
            console.log('Пользователь не найден:', username);
            return res.status(401).json({ error: 'Пользователь не найден' });
        }

        // Проверка пароля
        const validPassword = await bcrypt.compare(
            password,
            user.rows[0].password_hash
        );

        if (!validPassword) {
            console.log('Неверный пароль для пользователя:', username);
            return res.status(401).json({ error: 'Неверный пароль' });
        }

        console.log('Успешная авторизация пользователя:', username);
        
        // Обновляем время последнего входа
        await pool.query(
            'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1',
            [user.rows[0].id]
        );

        res.json({ 
            success: true,
            user: {
                id: user.rows[0].id,
                username: user.rows[0].username,
                role: user.rows[0].role
            }
        });

    } catch (err) {
        console.error('Ошибка при авторизации:', err);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// SSL configuration
const sslOptions = {
    key: fs.readFileSync('/etc/letsencrypt/live/adminflow.ru/privkey.pem'),
    cert: fs.readFileSync('/etc/letsencrypt/live/adminflow.ru/fullchain.pem'),
    ca: fs.readFileSync('/etc/letsencrypt/live/adminflow.ru/chain.pem')
};

// Create HTTPS server
https.createServer(sslOptions, app).listen(PORT, () => {
    console.log(`HTTPS Server running on port ${PORT}`);
});

// Error handling
process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
});

process.on('unhandledRejection', (error) => {
    console.error('Unhandled Rejection:', error);
}); 