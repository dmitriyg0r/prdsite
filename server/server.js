const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const { pool, testConnection } = require('./db');
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

// Test database connection on startup
testConnection().then(connected => {
    if (!connected) {
        console.error('Unable to connect to the database');
        process.exit(1);
    }
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
            error: 'Database connection failed',
            details: err.message
        });
    }
});

// Login route
app.post('/api/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        
        // Поиск пользователя
        const userResult = await pool.query(
            'SELECT * FROM users WHERE username = $1',
            [username]
        );

        if (userResult.rows.length === 0) {
            return res.status(401).json({ error: 'Пользователь не найден' });
        }

        const user = userResult.rows[0];

        // Проверка пароля
        const validPassword = await bcrypt.compare(password, user.password_hash);

        if (!validPassword) {
            return res.status(401).json({ error: 'Неверный пароль' });
        }

        try {
            // Обновляем время последнего входа
            await pool.query(
                'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1',
                [user.id]
            );
        } catch (updateErr) {
            console.error('Error updating last_login:', updateErr);
            // Продолжаем выполнение даже если обновление last_login не удалось
        }

        // Отправляем успешный ответ
        res.json({
            success: true,
            user: {
                id: user.id,
                username: user.username,
                role: user.role,
                created_at: user.created_at
            }
        });

    } catch (err) {
        console.error('Login error:', err);
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