const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const { pool, testConnection } = require('./db');
const https = require('https');
const fs = require('fs');
const multer = require('multer');
const path = require('path');

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
        }

        // Отправляем успешный ответ с добавленным avatar_url
        res.json({
            success: true,
            user: {
                id: user.id,
                username: user.username,
                role: user.role,
                created_at: user.created_at,
                avatar_url: user.avatar_url || '/uploads/avatars/default.png' // Добавляем URL аватарки
            }
        });

    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// Endpoint для регистрации
app.post('/api/register', async (req, res) => {
    try {
        const { username, password } = req.body;

        // Проверяем, существует ли пользователь
        const userExists = await pool.query(
            'SELECT * FROM users WHERE username = $1',
            [username]
        );

        if (userExists.rows.length > 0) {
            return res.status(400).json({ error: 'Пользователь уже существует' });
        }

        // Хешируем пароль
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Создаем нового пользователя
        const newUser = await pool.query(
            'INSERT INTO users (username, password_hash, role, created_at) VALUES ($1, $2, $3, CURRENT_TIMESTAMP) RETURNING *',
            [username, hashedPassword, 'user']
        );

        res.json({
            success: true,
            user: {
                id: newUser.rows[0].id,
                username: newUser.rows[0].username,
                role: newUser.rows[0].role,
                created_at: newUser.rows[0].created_at
            }
        });

    } catch (err) {
        console.error('Registration error:', err);
        res.status(500).json({ error: 'Ошибка при регистрации' });
    }
});

// Настройка хранилища для загрузки файлов
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, '/var/www/html/uploads/avatars')
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
        cb(null, 'avatar-' + uniqueSuffix + path.extname(file.originalname))
    }
});

const upload = multer({ 
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB макс размер
    },
    fileFilter: (req, file, cb) => {
        const filetypes = /jpeg|jpg|png|gif/;
        const mimetype = filetypes.test(file.mimetype);
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());

        if (mimetype && extname) {
            return cb(null, true);
        }
        cb(new Error('Разрешены только изображения!'));
    }
});

// Endpoint для загрузки аватара
app.post('/api/upload-avatar', upload.single('avatar'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'Файл не загружен' });
        }

        // Получаем ID пользователя из тела запроса
        const userId = req.body.userId;
        if (!userId) {
            return res.status(400).json({ error: 'ID пользователя не указан' });
        }

        // Обновляем путь к аватару в базе данных
        await pool.query(
            'UPDATE users SET avatar_url = $1 WHERE id = $2',
            [`/uploads/avatars/${req.file.filename}`, userId]
        );

        res.json({ 
            success: true,
            avatarUrl: `/uploads/avatars/${req.file.filename}`
        });
    } catch (err) {
        console.error('Avatar upload error:', err);
        res.status(500).json({ error: 'Ошибка при загрузке аватара' });
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

// Поиск пользователей
app.get('/api/search-users', async (req, res) => {
    try {
        const { q } = req.query;
        const userId = req.query.userId; // ID текущего пользователя

        // Поиск пользователей, исключая текущего пользователя
        const result = await pool.query(`
            SELECT u.id, u.username, u.avatar_url,
                CASE
                    WHEN f1.status IS NOT NULL THEN f1.status
                    WHEN f2.status IS NOT NULL THEN f2.status
                    ELSE 'none'
                END as friendship_status
            FROM users u
            LEFT JOIN friendships f1 ON (f1.user_id = $1 AND f1.friend_id = u.id)
            LEFT JOIN friendships f2 ON (f2.user_id = u.id AND f2.friend_id = $1)
            WHERE u.id != $1 
            AND u.username ILIKE $2
            LIMIT 10
        `, [userId, `%${q}%`]);

        res.json({ users: result.rows });
    } catch (err) {
        console.error('Search error:', err);
        res.status(500).json({ error: 'Ошибка при поиске пользователей' });
    }
});

// Отправка заявки в друзья
app.post('/api/friend-request', async (req, res) => {
    try {
        const { userId, friendId } = req.body;

        // Проверяем, нет ли уже существующей заявки
        const existingRequest = await pool.query(
            'SELECT * FROM friendships WHERE (user_id = $1 AND friend_id = $2) OR (user_id = $2 AND friend_id = $1)',
            [userId, friendId]
        );

        if (existingRequest.rows.length > 0) {
            return res.status(400).json({ error: 'Заявка уже существует' });
        }

        // Создаем новую заявку
        await pool.query(
            'INSERT INTO friendships (user_id, friend_id, status) VALUES ($1, $2, $3)',
            [userId, friendId, 'pending']
        );

        res.json({ success: true });
    } catch (err) {
        console.error('Friend request error:', err);
        res.status(500).json({ error: 'Ошибка при отправке заявки' });
    }
});

// Принятие/отклонение заявки в друзья
app.post('/api/friend-request/respond', async (req, res) => {
    try {
        const { userId, friendId, status } = req.body; // status: 'accepted' или 'rejected'

        await pool.query(
            'UPDATE friendships SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE user_id = $2 AND friend_id = $3',
            [status, friendId, userId]
        );

        res.json({ success: true });
    } catch (err) {
        console.error('Friend response error:', err);
        res.status(500).json({ error: 'Ошибка при обработке заявки' });
    }
});

// Получение списка друзей
app.get('/api/friends', async (req, res) => {
    try {
        const userId = req.query.userId;

        const result = await pool.query(`
            SELECT u.id, u.username, u.avatar_url, f.status
            FROM users u
            INNER JOIN friendships f ON 
                ((f.user_id = $1 AND f.friend_id = u.id) OR 
                (f.friend_id = $1 AND f.user_id = u.id))
            WHERE f.status = 'accepted'
        `, [userId]);

        res.json({ friends: result.rows });
    } catch (err) {
        console.error('Get friends error:', err);
        res.status(500).json({ error: 'Ошибка при получении ��писка друзей' });
    }
});

// Получение входящих заявок в друзья
app.get('/api/friend-requests', async (req, res) => {
    try {
        const userId = req.query.userId;

        const result = await pool.query(`
            SELECT u.id, u.username, u.avatar_url
            FROM users u
            INNER JOIN friendships f ON f.user_id = u.id
            WHERE f.friend_id = $1 AND f.status = 'pending'
        `, [userId]);

        res.json({ requests: result.rows });
    } catch (err) {
        console.error('Get friend requests error:', err);
        res.status(500).json({ error: 'Ошибка при получении заявок в друзья' });
    }
});

// Добавьте новый endpoint для удаления из друзей
app.post('/api/friend/remove', async (req, res) => {
    try {
        const { userId, friendId } = req.body;

        await pool.query(
            'DELETE FROM friendships WHERE ' +
            '(user_id = $1 AND friend_id = $2) OR (user_id = $2 AND friend_id = $1)',
            [userId, friendId]
        );

        res.json({ success: true });
    } catch (err) {
        console.error('Remove friend error:', err);
        res.status(500).json({ error: 'Ошибка при удалении из друзей' });
    }
}); 