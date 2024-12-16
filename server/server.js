const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const { pool, testConnection } = require('./db');
const https = require('https');
const fs = require('fs');
const multer = require('multer');
const path = require('path');
const nodemailer = require('nodemailer');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const PORT = 5003;
const STATUS_UPDATE_CACHE = new Map();
const STATUS_UPDATE_INTERVAL = 5000; // 5 секунд между обновлениями

// Middleware
app.use(cors({
    origin: function(origin, callback) {
        // Разрешаем запросы без origin (например, от мобильных приложений)
        if (!origin) return callback(null, true);
        
        const allowedOrigins = [
            'http://adminflow.ru',
            'https://adminflow.ru',
            'http://www.adminflow.ru',
            'https://www.adminflow.ru'
        ];
        
        if (allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
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
        res.header('Content-Type', 'application/json');
        res.json({ 
            success: true, 
            message: 'Database connection successful',
            timestamp: result.rows[0].now
        });
    } catch (err) {
        console.error('Database connection error:', err);
        res.header('Content-Type', 'application/json');
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
        console.log('Получен запрос на вход:', {
            headers: req.headers,
            body: req.body,
            ip: req.ip,
            origin: req.get('origin')
        });
        
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ 
                error: 'Необходимо указать имя пользователя и пароль' 
            });
        }

        // Изменяем запрос, используя правильное имя колонки password_hash
        const result = await pool.query(`
            SELECT id, username, password_hash, role, avatar_url, email, created_at, last_login 
            FROM users 
            WHERE username = $1
        `, [username]);

        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'Неверное имя пользователя или пароль' });
        }

        // Обновляем last_login
        await pool.query(`
            UPDATE users 
            SET last_login = NOW() 
            WHERE id = $1
        `, [user.id]);

        // Отправляем данные пользователя, исключая хеш пароля
        const { password_hash: _, ...userWithoutPassword } = user;
        res.json({ user: userWithoutPassword });

    } catch (err) {
        console.error('Детальная ошибка входа:', {
            message: err.message,
            stack: err.stack,
            headers: req.headers
        });
        res.status(500).json({ error: 'Ошибка сервера: ' + err.message });
    }
});

// Endpoint для регистрации
app.post('/api/register', async (req, res) => {
    try {
        const { username, email, password } = req.body;

        // Проверяем, существует ли пользователь с таким именем
        const userExists = await pool.query(
            'SELECT * FROM users WHERE username = $1 OR email = $2',
            [username, email]
        );

        if (userExists.rows.length > 0) {
            const existingUser = userExists.rows[0];
            if (existingUser.username === username) {
                return res.status(400).json({ error: 'Пользователь с таким именем уже существует' });
            }
            if (existingUser.email === email) {
                return res.status(400).json({ error: 'Пользователь с таким email уже существует' });
            }
        }

        // Хешируем пароль
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Создаем нового пользователя
        const newUser = await pool.query(
            'INSERT INTO users (username, email, password_hash, role, created_at) VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP) RETURNING id, username, email, role, created_at',
            [username, email, hashedPassword, 'user']
        );

        res.json({
            success: true,
            user: {
                id: newUser.rows[0].id,
                username: newUser.rows[0].username,
                email: newUser.rows[0].email,
                role: newUser.rows[0].role,
                created_at: newUser.rows[0].created_at
            }
        });

    } catch (err) {
        console.error('Registration error:', err);
        res.status(500).json({ error: 'Ошибка при регистрации' });
    }
});

// Обновляем путь к файлам
const UPLOAD_PATH = '/var/www/html/uploads';

// Роут для скачивания файлов
app.get('/api/download/:folder/:filename', (req, res) => {
    try {
        const { folder, filename } = req.params;
        const filePath = path.join(UPLOAD_PATH, folder, filename);

        console.log('Downloading file:', filePath); // Для отладки

        // Проверяем существование файла
        if (!fs.existsSync(filePath)) {
            console.error('File not found:', filePath);
            return res.status(404).json({ error: 'Файл не найден' });
        }

        // Определяем MIME-тип файла
        const ext = path.extname(filename).toLowerCase();
        const mimeTypes = {
            '.pdf': 'application/pdf',
            '.doc': 'application/msword',
            '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            '.xls': 'application/vnd.ms-excel',
            '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            '.odt': 'application/vnd.oasis.opendocument.text',
            '.txt': 'text/plain',
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.png': 'image/png',
            '.gif': 'image/gif',
            '.webp': 'image/webp'
        };

        const mimeType = mimeTypes[ext] || 'application/octet-stream';
        const isImage = mimeType.startsWith('image/');

        // Устанавливаем заголовки в зависимости от типа файла
        if (!isImage) {
            res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
        }
        res.setHeader('Content-Type', mimeType);

        // Отправляем файл как поток
        const fileStream = fs.createReadStream(filePath);
        fileStream.pipe(res);

        // Обработка ошибок потока
        fileStream.on('error', (error) => {
            console.error('Error streaming file:', error);
            if (!res.headersSent) {
                res.status(500).json({ error: 'Ошибка при скачивании файла' });
            }
        });

    } catch (err) {
        console.error('Download error:', err);
        if (!res.headersSent) {
            res.status(500).json({ error: 'Ошибка при скачивании файла' });
        }
    }
});

// Обновляем конфигурацию multer для загрузки файлов
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        let folder = 'posts'; // По умолчанию папка posts

        // Определяем папку на основе маршрута
        if (req.path.includes('avatar')) {
            folder = 'avatars';
        } else if (req.path.includes('message')) {
            folder = 'messages';
        }

        const uploadPath = path.join(UPLOAD_PATH, folder);
        
        // Создаем директорию, если она не существует
        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
        }
        
        cb(null, uploadPath);
    },
    filename: function (req, file, cb) {
        // Определяем префикс н основе типа загрузки
        let prefix = 'post-';
        if (req.path.includes('avatar')) {
            prefix = 'avatar-';
        } else if (req.path.includes('message')) {
            prefix = 'message-';
        }

        // Герируем уникальное имя файла
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, `${prefix}${uniqueSuffix}${ext}`);
    }
});

// Создаем middleware для загрузки файлов
const upload = multer({
    storage: storage,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB максимальный размер файла
    },
    fileFilter: function (req, file, cb) {
        // Разрешенные типы файлов
        const allowedTypes = [
            'image/jpeg',
            'image/png',
            'image/gif',
            'image/webp',
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'application/vnd.oasis.opendocument.text',
            'text/plain'
        ];

        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Неподдерживаемый тип файла'));
        }
    }
});

// Обновляем руты для загрузки файлов
app.post('/api/upload-avatar', upload.single('avatar'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'Файл не был загружен' });
        }

        // Формируем URL для доступа к ф��йлу
        const fileUrl = `/uploads/avatars/${req.file.filename}`;
        res.json({ success: true, avatarUrl: fileUrl });

    } catch (err) {
        console.error('Error uploading avatar:', err);
        res.status(500).json({ error: 'Ошибка при загрузке аватара' });
    }
});

// Обработка ошибок multer
app.use((err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ error: 'Файл слишком большой. Максимальный размер: 10MB' });
        }
        return res.status(400).json({ error: err.message });
    }
    next(err);
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
        const userId = parseInt(req.query.userId);

        // Проверяем, что userId является числом
        if (!userId || isNaN(userId)) {
            return res.status(400).json({ 
                success: false, 
                error: 'Invalid user ID' 
            });
        }

        const result = await pool.query(`
            SELECT u.id, u.username, u.avatar_url, f.status
            FROM users u
            INNER JOIN friendships f ON 
                ((f.user_id = $1 AND f.friend_id = u.id) OR 
                (f.friend_id = $1 AND f.user_id = u.id))
            WHERE f.status = 'accepted'
        `, [userId]);

        res.json({ 
            success: true, 
            friends: result.rows 
        });
    } catch (err) {
        console.error('Get friends error:', err);
        res.status(500).json({ 
            success: false, 
            error: 'Ошибка при получении списка друзей' 
        });
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
        res.status(500).json({ error: 'Ошибка пр�� получении заявок в друзья' });
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

// Настройка хран��лища для файлов сообщений
const messageStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadDir = path.join(__dirname, '../public/uploads/messages');
        if (!fs.existsSync(uploadDir)){
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const filename = 'message-' + uniqueSuffix + path.extname(file.originalname);
        file.fileUrl = `/uploads/messages/${filename}`;
        cb(null, filename);
    }
});

const messageUpload = multer({ 
    storage: messageStorage,
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB макс размер
    },
    fileFilter: (req, file, cb) => {
        // Разрешенные типы файлов
        const filetypes = /jpeg|jpg|png|gif|pdf|doc|docx|txt/;
        const mimetype = filetypes.test(file.mimetype);
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());

        if (mimetype && extname) {
            return cb(null, true);
        }
        cb(new Error('Неподдерживаемый тип файла!'));
    }
});

// Эндпоинт для отправки сообщения с файлом
app.post('/api/messages/send-with-file', upload.single('file'), async (req, res) => {
    try {
        const { senderId, receiverId, message, replyToMessageId } = req.body;
        const file = req.file;
        
        // Создаем новое сообщение
        const result = await pool.query(
            `INSERT INTO messages 
            (sender_id, receiver_id, message, attachment_url, reply_to) 
            VALUES ($1, $2, $3, $4, $5) 
            RETURNING *`,
            [senderId, receiverId, message, file?.filename, replyToMessageId]
        );

        const newMessage = result.rows[0];

        // Получаем информацию об отправителе
        const senderInfo = await pool.query(
            'SELECT username FROM users WHERE id = $1',
            [senderId]
        );

        // Формируем полные данные сообщения
        const messageData = {
            ...newMessage,
            sender_username: senderInfo.rows[0].username
        };

        // Отправляем через WebSocket получателю
        const receiverSocketId = activeConnections.get(receiverId);
        if (receiverSocketId) {
            io.to(receiverSocketId).emit('new_message', messageData);
        }

        res.json({
            success: true,
            message: messageData
        });
    } catch (err) {
        console.error('Error sending message:', err);
        res.status(500).json({ 
            success: false,
            error: 'Error sending message',
            details: err.message 
        });
    }
});

// Обновляем endpoint для загрузки истории сообщений
app.get('/api/messages/history/:userId/:friendId', async (req, res) => {
    try {
        const { userId, friendId } = req.params;

        const result = await pool.query(
            `SELECT 
                m.*,
                u.username as sender_username,
                (SELECT json_build_object(
                    'id', rm.id,
                    'message', rm.message,
                    'sender_id', rm.sender_id,
                    'sender_username', ru.username
                )
                FROM messages rm
                JOIN users ru ON rm.sender_id = ru.id
                WHERE rm.id = m.reply_to) as reply_to_message
            FROM messages m
            JOIN users u ON m.sender_id = u.id
            WHERE (m.sender_id = $1 AND m.receiver_id = $2)
                OR (m.sender_id = $2 AND m.receiver_id = $1)
            ORDER BY m.created_at ASC`,
            [userId, friendId]
        );

        res.json({
            success: true,
            messages: result.rows
        });
    } catch (err) {
        console.error('Error loading messages:', err);
        res.status(500).json({ 
            success: false,
            error: 'Error loading messages',
            details: err.message 
        });
    }
});

// Отметить сообщения как прочитанные
app.post('/api/messages/read', async (req, res) => {
    try {
        const { userId, friendId } = req.body;

        await pool.query(`
            UPDATE messages 
            SET is_read = true 
            WHERE sender_id = $1 
            AND receiver_id = $2 
            AND is_read = false
        `, [friendId, userId]);

        res.json({ success: true });
    } catch (err) {
        console.error('Error marking messages as read:', err);
        res.status(500).json({ error: 'Ошибка при отметке сообщений как прочитанных' });
    }
});

// Получение последнего сообщения с пользователем
app.get('/api/messages/last/:userId/:friendId', async (req, res) => {
    try {
        const { userId, friendId } = req.params;

        const result = await pool.query(`
            SELECT m.*, 
                   u_sender.username as sender_username
            FROM messages m
            JOIN users u_sender ON m.sender_id = u_sender.id
            WHERE (m.sender_id = $1 AND m.receiver_id = $2)
               OR (m.sender_id = $2 AND m.receiver_id = $1)
            ORDER BY m.created_at DESC
            LIMIT 1
        `, [userId, friendId]);

        res.json({ success: true, message: result.rows[0] });
    } catch (err) {
        console.error('Error getting last message:', err);
        res.status(500).json({ error: 'Ошибка при получении последнего сообщения' });
    }
});

// Получение количе��тва непрочитанных сообщений
app.get('/api/messages/unread/:userId', async (req, res) => {
    try {
        const { userId } = req.params;

        const result = await pool.query(`
            SELECT sender_id, COUNT(*) as count
            FROM messages
            WHERE receiver_id = $1 AND is_read = false
            GROUP BY sender_id
        `, [userId]);

        res.json({ success: true, unreadCounts: result.rows });
    } catch (err) {
        console.error('Error getting unread counts:', err);
        res.status(500).json({ error: 'Ошибка при получении количества непрочитанных сообщений' });
    }
});

// Поиск пользователей для чата
app.get('/api/chat/search-users', async (req, res) => {
    try {
        const { q, userId } = req.query;

        const result = await pool.query(`
            SELECT DISTINCT 
                u.id, 
                u.username, 
                u.avatar_url,
                f.status as friendship_status
            FROM users u
            LEFT JOIN friendships f ON 
                ((f.user_id = $1 AND f.friend_id = u.id) OR 
                (f.friend_id = $1 AND f.user_id = u.id))
            WHERE u.id != $1 
            AND u.username ILIKE $2
            AND (f.status = 'accepted' OR f.status IS NULL)
            ORDER BY 
                CASE WHEN f.status = 'accepted' THEN 0 ELSE 1 END,
                u.username
            LIMIT 10
        `, [userId, `%${q}%`]);

        res.json({ users: result.rows });
    } catch (err) {
        console.error('Chat search error:', err);
        res.status(500).json({ error: 'Ошибка при поиске пользователей' });
    }
});

// Обновленный эндпоинт получения списка друзей для чата
app.get('/api/chat/friends', async (req, res) => {
    try {
        const userId = req.query.userId;

        const result = await pool.query(`
            WITH LastMessages AS (
                SELECT DISTINCT ON (
                    CASE 
                        WHEN sender_id = $1 THEN receiver_id 
                        ELSE sender_id 
                    END
                )
                    CASE 
                        WHEN sender_id = $1 THEN receiver_id 
                        ELSE sender_id 
                    END as friend_id,
                    message,
                    created_at,
                    is_read
                FROM messages
                WHERE sender_id = $1 OR receiver_id = $1
                ORDER BY friend_id, created_at DESC
            )
            SELECT 
                u.id,
                u.username,
                u.avatar_url,
                f.status as friendship_status,
                lm.message as last_message,
                lm.created_at as last_message_time,
                lm.is_read,
                (
                    SELECT COUNT(*)
                    FROM messages m
                    WHERE m.sender_id = u.id 
                    AND m.receiver_id = $1 
                    AND m.is_read = false
                ) as unread_count
            FROM users u
            INNER JOIN friendships f ON 
                ((f.user_id = $1 AND f.friend_id = u.id) OR 
                (f.friend_id = $1 AND f.user_id = u.id))
            LEFT JOIN LastMessages lm ON lm.friend_id = u.id
            WHERE f.status = 'accepted'
            ORDER BY 
                CASE WHEN lm.created_at IS NULL THEN 1 ELSE 0 END,
                lm.created_at DESC
        `, [userId]);

        res.json({ 
            success: true, 
            friends: result.rows 
        });
    } catch (err) {
        console.error('Get chat friends error:', err);
        res.status(500).json({ error: 'Ошибка при получении списка друзей' });
    }
});

// Обновленная настройка статических путей
app.use('/uploads', (req, res, next) => {
    const ext = path.extname(req.path).toLowerCase();
    // Если это изображение - показываем, иначе отправляем через download API
    if (['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext)) {
        next();
    } else {
        // Перенаправляем на API скачивания
        const folder = req.path.split('/')[1];
        const filename = path.basename(req.path);
        res.redirect(`/api/download/${folder}/${filename}`);
    }
}, express.static('/var/www/html/uploads'));

// ли более детально для каждой папки
app.use('/uploads/posts', express.static('/var/www/html/uploads/posts'));
app.use('/uploads/avatars', express.static('/var/www/html/uploads/avatars'));
app.use('/uploads/messages', express.static('/var/www/html/uploads/messages'));

// Добавляем обработку ошибок для статических файлов
app.use('/uploads', (err, req, res, next) => {
    if (err) {
        console.error('Static file error:', err);
        res.status(404).json({ 
            error: 'Файл не найден',
            details: err.message 
        });
    } else {
        next();
    }
});

// Добавляем middleware для логирования запросов к файлам
app.use('/uploads', (req, res, next) => {
    console.log('File request:', req.url);
    next();
});

// Обновляем конфигурацию хранилища для файлов сообщений
messageStorage.destination = function (req, file, cb) {
    const uploadDir = path.join(__dirname, '../public/uploads/messages');
    if (!fs.existsSync(uploadDir)){
        fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
};

messageStorage.filename = function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const filename = 'message-' + uniqueSuffix + path.extname(file.originalname);
    // Сохраняем полный URL для доступа к файлу
    file.fileUrl = `/uploads/messages/${filename}`;
    cb(null, filename);
};

// Получение информации о пользователе
app.get('/api/users/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        const result = await pool.query(`
            SELECT id, username, role, created_at, last_login, avatar_url, email
            FROM users 
            WHERE id = $1
        `, [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Пользователь не найден' });
        }

        res.json({ 
            success: true,
            user: result.rows[0]
        });
    } catch (err) {
        console.error('Get user error:', err);
        res.status(500).json({ error: 'Ошибка при получении данных пользователя' });
    }
});

// О�����овле����ие п��о��иля пользователя
app.post('/api/users/update-profile', async (req, res) => {
    try {
        const { userId, username, email } = req.body;

        // Проверяем, не занят ли email другим пользователем
        if (email) {
            const emailCheck = await pool.query(
                'SELECT id FROM users WHERE email = $1 AND id != $2',
                [email, userId]
            );
            if (emailCheck.rows.length > 0) {
                return res.status(400).json({
                    success: false,
                    error: 'Это email уже используется другим пользователем'
                });
            }
        }

        // Про��ер��ем, ��е занято ли имя пользователя
        if (username) {
            const usernameCheck = await pool.query(
                'SELECT id FROM users WHERE username = $1 AND id != $2',
                [username, userId]
            );
            if (usernameCheck.rows.length > 0) {
                return res.status(400).json({
                    success: false,
                    error: 'Это имя пользователя уже занято'
                });
            }
        }

        // Формируем запрос на обновление
        let query = 'UPDATE users SET ';
        const updates = [];
        const values = [];
        let paramCount = 1;

        if (username) {
            updates.push(`username = $${paramCount}`);
            values.push(username);
            paramCount++;
        }

        if (email) {
            updates.push(`email = $${paramCount}`);
            values.push(email);
            paramCount++;
        }

        if (updates.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Нет данных для об��овления'
            });
        }

        query += updates.join(', ');
        query += ` WHERE id = $${paramCount}`;
        values.push(userId);

        await pool.query(query, values);

        // Получаем обновленные данные пользователя
        const result = await pool.query(
            'SELECT id, username, email, role, created_at, last_login, avatar_url FROM users WHERE id = $1',
            [userId]
        );

        res.json({
            success: true,
            user: result.rows[0]
        });
    } catch (err) {
        console.error('Update profile error:', err);
        res.status(500).json({
            success: false,
            error: 'Ошибка при обновлении профиля'
        });
    }
});

// Обновляем эн��поинт отправки сообщения с файлом
app.post('/api/messages/send-with-file', messageUpload.single('file'), async (req, res) => {
    try {
        const { senderId, receiverId, message, replyTo } = req.body;
        let attachmentUrl = null;

        if (req.file) {
            // Используем сохраненный URL файла
            attachmentUrl = req.file.fileUrl;
        }

        const result = await pool.query(
            'INSERT INTO messages (sender_id, receiver_id, message, attachment_url, reply_to) VALUES ($1, $2, $3, $4, $5) RETURNING *',
            [senderId, receiverId, message, attachmentUrl, replyTo]
        );

        res.json({ 
            success: true, 
            message: result.rows[0] 
        });
    } catch (err) {
        console.error('Error sending message with file:', err);
        res.status(500).json({ error: 'Ошибка при отправке сообщения с файлом' });
    }
});

// Обновляем middleware checkAdmin
const checkAdmin = async (req, res, next) => {
    try {
        // Проверяем adminId в query параметрах или в теле зпроса
        const adminId = req.query.adminId || req.body.adminId;
        
        console.log('Checking admin rights for:', adminId); // Добавляем лог

        if (!adminId) {
            return res.status(401).json({ 
                success: false,
                error: 'Требуется авторизация' 
            });
        }

        const userResult = await pool.query(
            'SELECT role FROM users WHERE id = $1',
            [adminId]
        );

        console.log('User role:', userResult.rows[0]?.role); // Добавляем лог

        if (userResult.rows.length === 0 || userResult.rows[0].role !== 'admin') {
            return res.status(403).json({ 
                success: false,
                error: 'Доступ запрещен' 
            });
        }

        next();
    } catch (err) {
        console.error('Auth error:', err);
        res.status(500).json({ 
            success: false,
            error: 'Ошибка сервера' 
        });
    }
};

// Обновленные админ роуты с middleware
app.get('/api/admin/stats', checkAdmin, async (req, res) => {
    try {
        const stats = await pool.query(`
            SELECT 
                (SELECT COUNT(*) FROM users) as total_users,
                (SELECT COUNT(*) FROM users WHERE created_at > NOW() - INTERVAL '24 HOURS') as new_users_24h,
                (SELECT COUNT(*) FROM users WHERE created_at > NOW() - INTERVAL '7 DAYS') as new_users_7d,
                (SELECT COUNT(*) FROM users WHERE role = 'admin') as admin_count,
                (SELECT COUNT(*) FROM users WHERE role = 'moderator') as moderator_count,
                (SELECT COUNT(*) FROM messages) as total_messages,
                (SELECT COUNT(*) FROM messages WHERE created_at > NOW() - INTERVAL '24 HOURS') as new_messages_24h,
                (SELECT COUNT(*) FROM messages WHERE created_at > NOW() - INTERVAL '7 DAYS') as new_messages_7d,
                (SELECT COUNT(*) FROM friendships WHERE status = 'accepted') as total_friendships,
                (SELECT COUNT(*) FROM users WHERE is_online = true) as online_users,
                (SELECT COUNT(*) FROM users WHERE last_activity > NOW() - INTERVAL '24 HOURS') as active_users_24h
        `);
        
        res.json({ success: true, stats: stats.rows[0] });
    } catch (err) {
        console.error('Admin stats error:', err);
        res.status(500).json({ error: 'Ошибка при получении статистики' });
    }
});

app.get('/api/admin/users', checkAdmin, async (req, res) => {
    try {
        const { page = 1, limit = 10, search = '' } = req.query;
        const offset = (page - 1) * limit;

        const users = await pool.query(`
            SELECT 
                u.*, 
                (SELECT COUNT(*) FROM messages WHERE sender_id = u.id) as messages_sent,
                (SELECT COUNT(*) FROM friendships WHERE (user_id = u.id OR friend_id = u.id) AND status = 'accepted') as friends_count
            FROM users u
            WHERE u.username ILIKE $1
            ORDER BY u.created_at DESC
            LIMIT $2 OFFSET $3
        `, [`%${search}%`, limit, offset]);

        const total = await pool.query(
            'SELECT COUNT(*) FROM users WHERE username ILIKE $1',
            [`%${search}%`]
        );

        res.json({
            success: true,
            users: users.rows,
            total: parseInt(total.rows[0].count),
            pages: Math.ceil(total.rows[0].count / limit)
        });
    } catch (err) {
        console.error('Admin users error:', err);
        res.status(500).json({ error: 'Оши��ка при получении списка пользователей' });
    }
});

app.delete('/api/admin/users/:id', checkAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        await pool.query('DELETE FROM users WHERE id = $1', [id]);
        res.json({ success: true });
    } catch (err) {
        console.error('Admin delete user error:', err);
        res.status(500).json({ error: 'Ошибка при удалении пользователя' });
    }
});

// Эндпоинт для изменения роли пользователя
app.post('/api/admin/role', checkAdmin, async (req, res) => {
    try {
        const { userId, role } = req.body;
        
        // Проверяем допустимые роли
        const validRoles = ['user', 'moderator', 'admin'];
        if (!validRoles.includes(role)) {
            return res.status(400).json({ 
                success: false,
                error: 'Недопустимая роль' 
            });
        }

        // Обновляем роль в базе данных
        await pool.query(
            'UPDATE users SET role = $1 WHERE id = $2',
            [role, userId]
        );
        
        res.json({ success: true });
    } catch (err) {
        console.error('Change role error:', err);
        res.status(500).json({ 
            success: false,
            error: 'Ошибка при изменении роли' 
        });
    }
});

app.get('/api/admin/charts', checkAdmin, async (req, res) => {
    try {
        console.log('Fetching charts data...');
        
        const registrationData = await pool.query(`
            SELECT 
                DATE(created_at) as date,
                COUNT(*) as count
            FROM users
            WHERE created_at > NOW() - INTERVAL '7 days'
            GROUP BY DATE(created_at)
            ORDER BY date
        `);
        console.log('Registration data:', registrationData.rows);

        const messageData = await pool.query(`
            SELECT 
                DATE(created_at) as date,
                COUNT(*) as count
            FROM messages
            WHERE created_at > NOW() - INTERVAL '7 days'
            GROUP BY DATE(created_at)
            ORDER BY date
        `);

        const userActivityData = await pool.query(`
            SELECT 
                role,
                COUNT(*) as count
            FROM users
            GROUP BY role
        `);

        const responseData = {
            success: true,
            data: {
                registrations: registrationData.rows,
                messages: messageData.rows,
                userActivity: userActivityData.rows
            }
        };
        
        console.log('Sending charts data:', responseData);
        res.json(responseData);
    } catch (err) {
        console.error('Charts data error:', err);
        res.status(500).json({ error: 'Ошибка при получении данных для графиков' });
    }
});

// Настройка хранилища для файлов постов
const postStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadDir = '/var/www/html/uploads/posts';
        if (!fs.existsSync(uploadDir)){
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'post-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const uploadPost = multer({ 
    storage: postStorage,
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB макс размер
    },
    fileFilter: (req, file, cb) => {
        // Разрешенные тип файлов
        const allowedTypes = {
            // Изображения
            'image/jpeg': true,
            'image/png': true,
            'image/gif': true,
            'image/webp': true,
            // Документы
            'application/pdf': true,
            'application/msword': true,
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document': true,
            'application/vnd.ms-excel': true,
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': true,
            'application/vnd.oasis.opendocument.text': true,
            'text/plain': true
        };

        if (allowedTypes[file.mimetype]) {
            return cb(null, true);
        }

        // Проверка по расширению для документов
        const ext = path.extname(file.originalname).toLowerCase();
        const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.odt', '.txt'];
        
        if (allowedExtensions.includes(ext)) {
            return cb(null, true);
        }

        cb(new Error('Неподдерживаемый тип файла. Разрешены: изображения, PDF, Word, Excel, ODT и текстовые файлы'));
    }
});

// Создание поста
app.post('/api/posts/create', uploadPost.single('image'), async (req, res) => {
    try {
        const { userId, content } = req.body;
        const imageUrl = req.file ? `/uploads/posts/${req.file.filename}` : null;

        const result = await pool.query(
            'INSERT INTO posts (user_id, type, content, image_url) VALUES ($1, $2, $3, $4) RETURNING *',
            [userId, 'post', content, imageUrl]
        );

        res.json({
            success: true,
            post: result.rows[0]
        });
    } catch (err) {
        console.error('Error creating post:', err);
        res.status(500).json({ error: 'Ошибка при создании поста' });
    }
});

// Получение постов пользователя
app.get('/api/posts/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const currentUserId = req.query.currentUserId; // Дбавляем параметр текущего пользователя

        const result = await pool.query(`
            SELECT 
                p.*,
                u.username as author_name,
                u.avatar_url as author_avatar,
                (SELECT COUNT(*) FROM posts WHERE parent_id = p.id AND type = 'like') as likes_count,
                (SELECT COUNT(*) FROM posts WHERE parent_id = p.id AND type = 'comment') as comments_count,
                EXISTS(
                    SELECT 1 FROM posts 
                    WHERE parent_id = p.id 
                    AND type = 'like' 
                    AND user_id = $2
                ) as is_liked
            FROM posts p
            JOIN users u ON p.user_id = u.id
            WHERE p.user_id = $1 AND p.type = 'post'
            ORDER BY p.created_at DESC
        `, [userId, currentUserId]);

        res.json({ 
            success: true, 
            posts: result.rows 
        });
    } catch (err) {
        console.error('Error loading posts:', err);
        res.status(500).json({ error: 'Ошибка при загрузке постов' });
    }
});

// Обработка лайков
app.post('/api/posts/like', async (req, res) => {
    try {
        const { userId, postId } = req.body;

        // Проверяем, существует ли уже лайк
        const existingLike = await pool.query(
            'SELECT * FROM posts WHERE parent_id = $1 AND user_id = $2 AND type = $3',
            [postId, userId, 'like']
        );

        let liked = false;
        
        if (existingLike.rows.length > 0) {
            // Если лайк существует - удаляем его
            await pool.query(
                'DELETE FROM posts WHERE parent_id = $1 AND user_id = $2 AND type = $3',
                [postId, userId, 'like']
            );
        } else {
            // Если лайка нет - создаем его
            await pool.query(
                'INSERT INTO posts (user_id, parent_id, type) VALUES ($1, $2, $3)',
                [userId, postId, 'like']
            );
            liked = true;
        }

        // Получаем обновленное количество лайков
        const likesCount = await pool.query(
            'SELECT COUNT(*) FROM posts WHERE parent_id = $1 AND type = $2',
            [postId, 'like']
        );

        res.json({ 
            success: true, 
            liked: liked,
            likes_count: parseInt(likesCount.rows[0].count)
        });
    } catch (err) {
        console.error('Error toggling like:', err);
        res.status(500).json({ error: 'Ошибка при обработке лайка' });
    }
});

// Удаление поста
app.delete('/api/posts/delete/:postId', async (req, res) => {
    try {
        const { postId } = req.params;
        const { userId } = req.body;

        // Проверяем, является ли пользователь автором поста
        const post = await pool.query(
            'SELECT * FROM posts WHERE id = $1 AND user_id = $2 AND type = $3',
            [postId, userId, 'post']
        );

        if (post.rows.length === 0) {
            return res.status(403).json({ error: 'У вас нет прав на удаление этого поста' });
        }

        // Удаляем все связанные записи (лайки, комментарии)
        await pool.query('DELETE FROM posts WHERE parent_id = $1', [postId]);
        // Удаляем сам пост
        await pool.query('DELETE FROM posts WHERE id = $1', [postId]);

        res.json({ success: true });
    } catch (err) {
        console.error('Error deleting post:', err);
        res.status(500).json({ error: 'Ошибка при удалении поста' });
    }
});

// Добавляем раздачу статическ��х файлов для постов
app.use('/uploads/posts', express.static('/var/www/html/uploads/posts')); 

// Получение статуса пользователя
app.get('/api/users/status/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        
        const result = await pool.query(`
            SELECT 
                is_online,
                last_activity,
                CASE 
                    WHEN is_online = true THEN true
                    WHEN last_activity > NOW() - INTERVAL '5 minutes' THEN true
                    ELSE false
                END as actual_online_status
            FROM users 
            WHERE id = $1
        `, [userId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ 
                success: false, 
                error: 'User not found' 
            });
        }

        res.json({
            success: true,
            status: result.rows[0]
        });
    } catch (err) {
        console.error('Error getting user status:', err);
        res.status(500).json({ 
            success: false, 
            error: 'Error getting user status' 
        });
    }
});

// Обновление статуса пользователя
app.post('/api/users/update-status', async (req, res) => {
    try {
        const { userId, is_online, last_activity } = req.body;
        
        // Проверяем входные данные
        if (!userId) {
            return res.status(400).json({
                success: false,
                error: 'Не указан ID пользователя'
            });
        }

        // Проверяем, не было ли недавнего обновления для этого пользователя
        const lastUpdate = STATUS_UPDATE_CACHE.get(userId);
        const now = Date.now();
        
        if (lastUpdate && (now - lastUpdate) < STATUS_UPDATE_INTERVAL) {
            return res.json({ success: true, cached: true });
        }

        // Обновляем статус в БД
        await pool.query(`
            UPDATE users 
            SET is_online = $2,
                last_activity = CURRENT_TIMESTAMP
            WHERE id = $1
        `, [userId, is_online]);

        // Обновляем кэш
        STATUS_UPDATE_CACHE.set(userId, now);

        // Получаем список друзей пользователя для уведомления
        const friendsResult = await pool.query(`
            SELECT friend_id as id FROM friendships 
            WHERE user_id = $1 AND status = 'accepted'
            UNION
            SELECT user_id as id FROM friendships 
            WHERE friend_id = $1 AND status = 'accepted'
        `, [userId]);

        // Отправляем уведомление через Socket.IO
        if (io) {
            friendsResult.rows.forEach(friend => {
                const friendSocketId = activeConnections.get(friend.id);
                if (friendSocketId) {
                    io.to(friendSocketId).emit('user_status_update', {
                        userId,
                        isOnline: is_online,
                        lastActivity: new Date()
                    });
                }
            });
        }

        res.json({ success: true });

    } catch (err) {
        console.error('Detailed error updating user status:', {
            error: err.message,
            stack: err.stack,
            userId: req.body.userId,
            timestamp: new Date().toISOString()
        });

        res.status(500).json({
            success: false,
            error: 'Ошибка при обновлении статуса пользователя'
        });
    }
});

// Обновляем создание таблицы user_status с дополнительными индексами
pool.query(`
    CREATE TABLE IF NOT EXISTS user_status (
        user_id INTEGER PRIMARY KEY REFERENCES users(id),
        is_online BOOLEAN DEFAULT false,
        last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    
    CREATE INDEX IF NOT EXISTS idx_user_status_last_activity 
    ON user_status(last_activity);
    
    CREATE INDEX IF NOT EXISTS idx_user_status_is_online 
    ON user_status(is_online);
`).catch(err => {
    console.error('Error creating user_status table and indexes:', err);
});

// Добавьте периодическую очистку кэша
setInterval(() => {
    const now = Date.now();
    for (const [userId, timestamp] of STATUS_UPDATE_CACHE.entries()) {
        if (now - timestamp > STATUS_UPDATE_INTERVAL) {
            STATUS_UPDATE_CACHE.delete(userId);
        }
    }
}, STATUS_UPDATE_INTERVAL);

// Добавляем автоматическое обновение статуса каждые 5 минут
setInterval(async () => {
    try {
        // Помечаем ользователей как оффлайн, если их последняя активность была более 5 минут назад
        await pool.query(`
            UPDATE users 
            SET is_online = false 
            WHERE last_activity < NOW() - INTERVAL '5 minutes'
            AND is_online = true
        `);
    } catch (err) {
        console.error('Error in auto-update status:', err);
    }
}, 5 * 60 * 1000); // Каждые 5 минут

// Получение ленты постов
app.get('/api/feed', async (req, res) => {
    try {
        const userId = req.query.userId;

        const result = await pool.query(`
            SELECT 
                p.*,
                u.username as author_name,
                u.avatar_url as author_avatar,
                (SELECT COUNT(*) FROM posts WHERE parent_id = p.id AND type = 'like') as likes_count,
                (SELECT COUNT(*) FROM posts WHERE parent_id = p.id AND type = 'comment') as comments_count,
                EXISTS(
                    SELECT 1 FROM posts 
                    WHERE parent_id = p.id 
                    AND type = 'like' 
                    AND user_id = $1
                ) as is_liked
            FROM posts p
            JOIN users u ON p.user_id = u.id
            WHERE p.type = 'post' AND (
                p.user_id IN (
                    SELECT CASE 
                        WHEN user_id = $1 THEN friend_id
                        WHEN friend_id = $1 THEN user_id
                    END
                    FROM friendships
                    WHERE (user_id = $1 OR friend_id = $1)
                    AND status = 'accepted'
                )
                OR p.user_id = $1
            )
            ORDER BY p.created_at DESC
            LIMIT 50
        `, [userId]);

        res.json({ 
            success: true, 
            posts: result.rows 
        });
    } catch (err) {
        console.error('Error loading feed:', err);
        res.status(500).json({ error: 'Ошибка при загрузке ленты' });
    }
});

// Получение комментариев к посту
// Обновленный обработчик для комментариев
app.get('/api/posts/:postId/comments', async (req, res) => {
    try {
        const { postId } = req.params;
        
        if (!postId) {
            return res.status(400).json({
                success: false,
                error: 'ID поста не указан'
            });
        }

        // Проверяем существование поста
        const postCheck = await pool.query(
            'SELECT EXISTS(SELECT 1 FROM posts WHERE id = $1)',
            [postId]
        );

        if (!postCheck.rows[0].exists) {
            return res.status(404).json({
                success: false,
                error: 'Пост не найден'
            });
        }

        // Получаем комментарии
        const result = await pool.query(`
            SELECT 
                c.id,
                c.content,
                c.created_at,
                c.user_id,
                u.username as author_name,
                u.avatar_url as author_avatar
            FROM comments c
            JOIN users u ON c.user_id = u.id
            WHERE c.post_id = $1
            ORDER BY c.created_at ASC
        `, [postId]);

        // Всегда возвращаем JSON
        res.json({
            success: true,
            comments: result.rows
        });

    } catch (err) {
        console.error('Ошибка при получении комментариев:', err);
        // Убедимся, что всегда возвращаем JSON
        res.status(500).json({
            success: false,
            error: 'Ошибка при получении комментариев'
        });
    }
});

// Добавим обработчик ошибок для express
app.use((err, req, res, next) => {
    console.error('Express error:', err);
    res.status(500).json({
        success: false,
        error: 'Внутренняя ошибка сервера'
    });
});

// Создание комментария
app.post('/api/posts/comment', async (req, res) => {
    try {
        const { userId, postId, content } = req.body;

        // Проверяем существование поста
        const postExists = await pool.query(
            'SELECT id FROM posts WHERE id = $1',
            [postId]
        );

        if (postExists.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Пост не найден'
            });
        }

        // Создаем комментарий
        const result = await pool.query(`
            INSERT INTO posts (user_id, parent_id, type, content)
            VALUES ($1, $2, 'comment', $3)
            RETURNING *
        `, [userId, postId, content]);

        // Получаем информацию об авторе
        const authorInfo = await pool.query(`
            SELECT username, avatar_url
            FROM users
            WHERE id = $1
        `, [userId]);

        const comment = {
            ...result.rows[0],
            author_name: authorInfo.rows[0].username,
            author_avatar: authorInfo.rows[0].avatar_url
        };

        res.json({
            success: true,
            comment
        });
    } catch (err) {
        console.error('Ошибка при создании комментария:', err);
        res.status(500).json({
            success: false,
            error: 'Ошибка при создании комментария'
        });
    }
});

// Обработка статуса набора текста
app.post('/api/messages/typing', async (req, res) => {
    try {
        const { userId, friendId, isTyping } = req.body;
        
        // Сохраняем статус в Redis или другом быстром хранилище
        // Здесь используем глобальную переменную для примера
        global.typingStatus = global.typingStatus || {};
        global.typingStatus[`${userId}-${friendId}`] = {
            isTyping,
            timestamp: Date.now()
        };
        
        res.json({ success: true });
    } catch (err) {
        console.error('Error updating typing status:', err);
        res.status(500).json({ error: 'Ошибка при обновлении статуса набора' });
    }
});

app.delete('/api/messages/delete/:messageId', async (req, res) => {
    try {
        const { messageId } = req.params;
        const { userId } = req.body; // ID текущего пользователя

        // Проверяем, является ли пользователь отправителем сообщения
        const message = await pool.query(
            'SELECT * FROM messages WHERE id = $1 AND sender_id = $2',
            [messageId, userId]
        );

        if (message.rows.length === 0) {
            return res.status(403).json({ error: 'У вас нет прав на удаление этого сообщения' });
        }

        // Удаляем сообщение
        await pool.query('DELETE FROM messages WHERE id = $1', [messageId]);

        res.json({ success: true });
    } catch (err) {
        console.error('Error deleting message:', err);
        res.status(500).json({ error: 'Ошибка при удалении сообщения' });
    }
});

// Endpoint для получения количества непрочитанных сообщений
app.get('/api/messages/unread/:userId/:friendId', async (req, res) => {
    try {
        const { userId, friendId } = req.params;
        
        const result = await pool.query(
            `SELECT COUNT(*) as count 
             FROM messages 
             WHERE sender_id = $1 
             AND receiver_id = $2 
             AND is_read = false`,
            [friendId, userId]
        );

        res.json({
            success: true,
            count: parseInt(result.rows[0].count)
        });
    } catch (err) {
        console.error('Error getting unread count:', err);
        res.status(500).json({ 
            success: false, 
            error: 'Error getting unread count' 
        });
    }
});

// Endpoint для пометки сообщений как прочитанных
app.post('/api/messages/mark-as-read', async (req, res) => {
    try {
        const { userId, friendId } = req.body;

        await pool.query(
            `UPDATE messages 
             SET is_read = true 
             WHERE sender_id = $1 
             AND receiver_id = $2 
             AND is_read = false`,
            [friendId, userId]
        );

        res.json({ success: true });
    } catch (err) {
        console.error('Error marking messages as read:', err);
        res.status(500).json({ 
            success: false, 
            error: 'Error marking messages as read' 
        });
    }
});

// Проверка доступности email
app.get('/api/users/check-email', async (req, res) => {
    try {
        const { email, userId } = req.query;

        const query = userId 
            ? 'SELECT id FROM users WHERE email = $1 AND id != $2'
            : 'SELECT id FROM users WHERE email = $1';
        
        const values = userId ? [email, userId] : [email];
        
        const result = await pool.query(query, values);

        res.json({
            success: true,
            available: result.rows.length === 0
        });
    } catch (err) {
        console.error('Check email error:', err);
        res.status(500).json({
            success: false,
            error: 'Ошибка при проверке email'
        });
    }
});

// Создаем трнспорт для отправки почты
const transporter = nodemailer.createTransport({
    host: 'smtp.timeweb.ru',
    port: 2525,  // еняем порт на 2525
    secure: false,
    auth: {
        user: 'adminflow@adminflow.ru',
        pass: 'Gg3985502'
    },
    tls: {
        rejectUnauthorized: false
    }
});

// Проверяем соединение при запуске сервера
transporter.verify(function(error, success) {
    if (error) {
        console.error('Ошибка подключения к SMTP:', error);
        console.log('Детали ошибки:', {
            host: transporter.options.host,
            port: transporter.options.port,
            error: error.message
        });
    } else {
        console.log('SMTP сервер готов к отправке сообщений');
    }
});

// Альтернативная конфигурация  TLS
const alternativeTransporter = nodemailer.createTransport({
    host: 'smtp.timeweb.ru',
    port: 587,              // Алтернативный порт
    secure: false,          // Для порта 587
    requireTLS: true,       // Требуем TLS
    auth: {
        user: 'adminflow@adminflow.ru',
        pass: 'Gg3985502'
    },
    tls: {
        rejectUnauthorized: false // В случае проблем с сертификатом
    }
});

// Проверяем альтернативное соединение
alternativeTransporter.verify(function(error, success) {
    if (error) {
        console.error('Ошибка подключения к альтернативному SMTP:', error);
    } else {
        console.log('Альтернативный SMTP сервер готов к отправке сообщений');
        // Если альтернативно соединение работает, используем его
        transporter = alternativeTransporter;
    }
});

// Функция для генерации кода подтверждения
function generateVerificationCode() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

// Эндпоинт для отправки кода подтверждения
app.post('/api/send-verification-code', async (req, res) => {
    try {
        const { userId, email } = req.body;

        // Проверяем наличие email в запосе
        if (!userId || !email) {
            return res.status(400).json({
                success: false,
                error: 'Отсутствует email или ID пользователя'
            });
        }

        // Проверяем, что email соответствует пользователю
        const userResult = await pool.query(`
            SELECT email FROM users WHERE id = $1
        `, [userId]);

        if (userResult.rows.length === 0 || !userResult.rows[0].email) {
            return res.status(400).json({
                success: false,
                error: 'Email не найден для данного пользователя'
            });
        }

        if (userResult.rows[0].email !== email) {
            return res.status(400).json({
                success: false,
                error: 'Указанный email не соответствует пользователю'
            });
        }

        const verificationCode = generateVerificationCode();

        // Сохрняем код в базу
        await pool.query(`
            INSERT INTO verification_codes (user_id, code, expires_at)
            VALUES ($1, $2, NOW() + INTERVAL '5 minutes')
            ON CONFLICT (user_id) 
            DO UPDATE SET 
                code = EXCLUDED.code,
                expires_at = EXCLUDED.expires_at,
                created_at = NOW()
        `, [userId, verificationCode]);

        // Отправляем email
        await transporter.sendMail({
            from: '"AdminFlow" <adminflow@adminflow.ru>',
            to: email,
            subject: 'Код подтверждения AdminFlow',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #333;">Код подтверждения</h2>
                    <p>Ваш код подтверждения для смены пароля:</p>
                    <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; text-align: center; font-size: 24px; letter-spacing: 5px;">
                        <strong>${verificationCode}</strong>
                    </div>
                    <p style="color: #666; font-size: 14px; margin-top: 20px;">
                        Код дейтвителен в течение 5 минут.<br>
                        Если вы не запрашивали код подтверждения, пригнорируйте то письмо.
                    </p>
                </div>
            `
        });

        res.json({ success: true });
    } catch (err) {
        console.error('Error sending verification code:', err);
        res.status(500).json({
            success: false,
            error: 'Ошибка при отправке кода подтверждения'
        });
    }
});

// Эндпоинт для проверки кода и смены пароля
app.post('/api/change-password', async (req, res) => {
    try {
        const { userId, code, newPassword } = req.body;

        console.log('Получен запрос на смену пароля:', { userId, code }); // Для отладки

        // Проверяем код
        const result = await pool.query(`
            SELECT * FROM verification_codes 
            WHERE user_id = $1 
            AND code = $2 
            AND expires_at > NOW()
        `, [userId, code]);

        if (result.rows.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Неверный или устаревший код подтверждения'
            });
        }

        // Хешируем новй пароль
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        // Исправляем имя колонки с password на password_hash
        await pool.query(`
            UPDATE users 
            SET password_hash = $1 
            WHERE id = $2
        `, [hashedPassword, userId]);

        // Удаляем использованный код
        await pool.query(`
            DELETE FROM verification_codes 
            WHERE user_id = $1
        `, [userId]);

        res.json({ success: true });
    } catch (err) {
        console.error('Error changing password:', err);
        res.status(500).json({
            success: false,
            error: 'Ошибка при смене пароля: ' + err.message
        });
    }
});

// Обновляем настройки HTTP и HTTPS серверов
const httpServer = http.createServer((req, res) => {
    res.writeHead(301, { Location: `https://${req.headers.host}${req.url}` });
    res.end();
});

const httpsServer = https.createServer(sslOptions, app);

// Создаем Map для хранения активных соединений
const activeConnections = new Map();

// Создаем экземпляр Socket.IO
const io = new Server(httpsServer, {
    path: '/socket.io/',
    transports: ['polling', 'websocket'],
    cors: {
        origin: "*",  // Разрешаем все источники
        methods: ["GET", "POST"],
        credentials: false,  // Отключаем credentials
        allowedHeaders: ["Content-Type"]
    },
    pingTimeout: 60000,
    pingInterval: 25000,
    allowEIO3: true,
    maxHttpBufferSize: 1e8
});

// Удаляем middleware для Socket.IO, так как теперь используем CORS настройки выше
app.use('/socket.io', (req, res, next) => {
    next();
});

// Обновляем обработчик подключений
io.on('connection', async (socket) => {
    console.log('New Socket.IO connection:', {
        id: socket.id,
        transport: socket.conn.transport.name,
        query: socket.handshake.query
    });

    socket.on('error', (error) => {
        console.error('Socket error:', error);
    });

    // Авторизация пользователя
    socket.on('auth', async (userId) => {
        try {
            if (!userId) return;
            
            socket.userId = userId;
            activeConnections.set(userId, socket.id);
            
            // Обновляем статус в БД
            await pool.query(`
                UPDATE users 
                SET is_online = true, 
                    last_activity = NOW() 
                WHERE id = $1
            `, [userId]);

            // Получаем список друзей пользователя
            const friendsResult = await pool.query(`
                SELECT friend_id as id FROM friendships 
                WHERE user_id = $1 AND status = 'accepted'
                UNION
                SELECT user_id as id FROM friendships 
                WHERE friend_id = $1 AND status = 'accepted'
            `, [userId]);

            // Оповещаем друзей о статусе
            for (const friend of friendsResult.rows) {
                const friendSocketId = activeConnections.get(friend.id);
                if (friendSocketId) {
                    io.to(friendSocketId).emit('user_status_update', {
                        userId: userId,
                        isOnline: true,
                        lastActivity: new Date()
                    });
                }
            }
        } catch (err) {
            console.error('Auth error:', err);
        }
    });

    // Обработка отключения
    socket.on('disconnect', async () => {
        try {
            const userId = socket.userId;
            if (!userId) return;

            activeConnections.delete(userId);

            // Обновляем статус в БД
            await pool.query(`
                UPDATE users 
                SET is_online = false, 
                    last_activity = NOW() 
                WHERE id = $1
            `, [userId]);

            // Получаем список друзей и оповещаем их
            const friendsResult = await pool.query(`
                SELECT friend_id as id FROM friendships 
                WHERE user_id = $1 AND status = 'accepted'
                UNION
                SELECT user_id as id FROM friendships 
                WHERE friend_id = $1 AND status = 'accepted'
            `, [userId]);

            for (const friend of friendsResult.rows) {
                const friendSocketId = activeConnections.get(friend.id);
                if (friendSocketId) {
                    io.to(friendSocketId).emit('user_status_update', {
                        userId: userId,
                        isOnline: false,
                        lastActivity: new Date()
                    });
                }
            }
        } catch (err) {
            console.error('Disconnect error:', err);
        }
    });

    // Добавляем обработчик сообщений в Socket.IO
    socket.on('send_message', async (data) => {
        try {
            const { senderId, receiverId, message, attachmentUrl, replyTo } = data;
            
            // Сохраняем сообщение в БД
            const result = await pool.query(`
                INSERT INTO messages 
                (sender_id, receiver_id, message, attachment_url, reply_to, created_at, is_read) 
                VALUES ($1, $2, $3, $4, $5, NOW(), false)
                RETURNING id, created_at
            `, [senderId, receiverId, message, attachmentUrl, replyTo]);

            const newMessage = {
                id: result.rows[0].id,
                sender_id: senderId,
                receiver_id: receiverId,
                message,
                attachment_url: attachmentUrl,
                created_at: result.rows[0].created_at,
                is_read: false,
                reply_to: replyTo
            };

            // Отправляем сообщение получателю через WebSocket
            const receiverSocketId = activeConnections.get(receiverId);
            if (receiverSocketId) {
                io.to(receiverSocketId).emit('new_message', newMessage);
            }

            // Подтверждаем отправку сообщения отправителю
            socket.emit('message_sent', newMessage);

        } catch (err) {
            console.error('Error sending message:', err);
            socket.emit('message_error', { error: 'Ошибка при отправке сообщения' });
        }
    });

    // Добавляем обработчик прочтения сообщений
    socket.on('mark_messages_read', async (data) => {
        try {
            const { userId, friendId } = data;
            
            // Помечаем сообщения как прочитанные
            await pool.query(`
                UPDATE messages 
                SET is_read = true 
                WHERE sender_id = $1 
                AND receiver_id = $2 
                AND is_read = false
            `, [friendId, userId]);

            // Уведомляем отправителя о прочтении сообщений
            const senderSocketId = activeConnections.get(friendId);
            if (senderSocketId) {
                io.to(senderSocketId).emit('messages_read', { 
                    by: userId,
                    timestamp: new Date()
                });
            }

        } catch (err) {
            console.error('Error marking messages as read:', err);
        }
    });
});

// Добавляем проверочный endpoint для Socket.IO
app.get('/socket.io/', (req, res) => {
    res.send('Socket.IO server is running');
});

// Добавляем обработку ошибок для Socket.IO
io.engine.on("connection_error", (err) => {
    console.log('Socket.IO connection error details:', {
        error: err.message,
        req: err.req?.url,
        code: err.code,
        context: err.context
    });
});

// Добавляем проверочный endpoint
app.get('/socket.io/test', (req, res) => {
    res.json({
        status: 'Socket.IO server is running',
        activeConnections: activeConnections.size
    });
});

// Добавляем новый endpoint для получения информации о пользователе
app.get('/api/users/:userId', async (req, res) => {
    try {
        const { userId } = req.params;

        const result = await pool.query(`
            SELECT 
                id, 
                username, 
                email, 
                role, 
                avatar_url, 
                created_at, 
                last_login,
                is_online,
                last_activity
            FROM users 
            WHERE id = $1
        `, [userId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ 
                success: false, 
                error: 'Пользователь не найден' 
            });
        }

        // Проверяем статус дружбы с текущим пользователем
        const friendshipStatus = await pool.query(`
            SELECT status 
            FROM friendships 
            WHERE (user_id = $1 AND friend_id = $2)
                OR (user_id = $2 AND friend_id = $1)
        `, [userId, req.query.currentUserId]);

        res.json({
            success: true,
            user: {
                ...result.rows[0],
                friendship_status: friendshipStatus.rows[0]?.status || 'none'
            }
        });
    } catch (err) {
        console.error('Error getting user:', err);
        res.status(500).json({ 
            success: false, 
            error: 'Ошибка при получении данных пользователя' 
        });
    }
});

// Получение списка чатов пользователя
app.get('/api/chats/:userId', async (req, res) => {
    try {
        const { userId } = req.params;

        // Модифицированный запрос для получения списка чатов
        const result = await pool.query(`
            WITH ChatPartners AS (
                -- Получаем уникальных собеседников
                SELECT DISTINCT 
                    CASE 
                        WHEN sender_id = $1 THEN receiver_id
                        ELSE sender_id 
                    END as partner_id
                FROM messages 
                WHERE sender_id = $1 OR receiver_id = $1
            ),
            LastMessages AS (
                -- Получаем последние сообщения для каждого собеседника
                SELECT DISTINCT ON (
                    CASE 
                        WHEN sender_id = $1 THEN receiver_id
                        ELSE sender_id 
                    END
                )
                    CASE 
                        WHEN sender_id = $1 THEN receiver_id
                        ELSE sender_id 
                    END as partner_id,
                    message,
                    attachment_url,
                    created_at,
                    is_read,
                    sender_id
                FROM messages
                WHERE sender_id = $1 OR receiver_id = $1
                ORDER BY partner_id, created_at DESC
            )
            SELECT 
                u.id,
                u.username,
                u.avatar_url,
                u.is_online,
                u.last_activity,
                lm.message as last_message,
                lm.attachment_url as last_message_attachment,
                lm.created_at as last_message_time,
                lm.is_read,
                lm.sender_id = $1 as is_own_message,
                (
                    SELECT COUNT(*)
                    FROM messages m
                    WHERE m.sender_id = u.id 
                    AND m.receiver_id = $1 
                    AND m.is_read = false
                ) as unread_count
            FROM ChatPartners cp
            JOIN users u ON u.id = cp.partner_id
            LEFT JOIN LastMessages lm ON lm.partner_id = u.id
            ORDER BY lm.created_at DESC NULLS LAST
        `, [userId]);

        console.log('Chats found:', result.rows.length); // Для отладки

        res.json({
            success: true,
            chats: result.rows
        });
    } catch (err) {
        console.error('Error getting chats:', err);
        res.status(500).json({
            success: false,
            error: 'Ошибка при получении списка чатов'
        });
    }
});

// Добавляем отдельный роут для отправки текстовых сообщений
app.post('/api/messages/send', async (req, res) => {
    try {
        const { senderId, receiverId, message, replyToMessageId } = req.body;
        
        console.log('Получены данные:', { 
            senderId, 
            receiverId, 
            message, 
            replyToMessageId,
            body: req.body 
        });

        // Проверяем и конвертируем ID в числа
        const senderIdNum = parseInt(senderId);
        const receiverIdNum = parseInt(receiverId);

        if (isNaN(senderIdNum) || isNaN(receiverIdNum)) {
            return res.status(400).json({
                success: false,
                error: 'Некорректные ID отправителя или получателя'
            });
        }

        // Проверяем существование пользователей
        const usersExist = await pool.query(`
            SELECT EXISTS (
                SELECT 1 FROM users WHERE id = $1
            ) AS sender_exists,
            EXISTS (
                SELECT 1 FROM users WHERE id = $2
            ) AS receiver_exists
        `, [senderIdNum, receiverIdNum]);

        if (!usersExist.rows[0].sender_exists || !usersExist.rows[0].receiver_exists) {
            return res.status(404).json({
                success: false,
                error: 'Отправитель или получатель не найден'
            });
        }

        // Сохраняем сообщение
        const insertQuery = `
            INSERT INTO messages 
            (sender_id, receiver_id, message, reply_to, created_at, is_read)
            VALUES ($1, $2, $3, $4, NOW(), false)
            RETURNING 
                id, 
                sender_id,
                receiver_id,
                message,
                reply_to,
                created_at,
                is_read
        `;

        console.log('Выполняем запрос:', {
            query: insertQuery,
            params: [senderIdNum, receiverIdNum, message || '', replyToMessageId || null]
        });

        const result = await pool.query(insertQuery, 
            [senderIdNum, receiverIdNum, message || '', replyToMessageId || null]
        );

        console.log('Результат запроса:', result.rows[0]);

        if (!result.rows[0]) {
            throw new Error('Сообщение не было сохранено');
        }

        const newMessage = {
            ...result.rows[0],
            sender_id: senderIdNum,
            receiver_id: receiverIdNum
        };

        // Отправляем через Socket.IO
        try {
            const receiverSocketId = activeConnections.get(receiverIdNum);
            if (receiverSocketId) {
                io.to(receiverSocketId).emit('new_message', newMessage);
            }
        } catch (socketError) {
            console.error('Ошибка Socket.IO:', socketError);
        }

        return res.status(200).json({
            success: true,
            message: newMessage
        });

    } catch (error) {
        console.error('Детальная ошибка отправки сообщения:', {
            error: error.message,
            stack: error.stack,
            code: error.code,
            detail: error.detail
        });

        return res.status(500).json({
            success: false,
            error: 'Ошибка при отправке сообщения',
            details: error.message
        });
    }
});

// Получение списка пользователей для сайдбара
app.get('/api/users-list', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT id, username, avatar_url
            FROM users
            ORDER BY created_at DESC
            LIMIT 20
        `);
        
        res.json({ 
            success: true,
            users: result.rows 
        });
    } catch (err) {
        console.error('Error loading users list:', err);
        res.status(500).json({ error: 'Ошибка при загрузке списка пользователей' });
    }
});

// Периодическая очистка устаревших записей кэша
setInterval(() => {
    const now = Date.now();
    for (const [userId, timestamp] of STATUS_UPDATE_CACHE.entries()) {
        if (now - timestamp > STATUS_UPDATE_INTERVAL * 2) {
            STATUS_UPDATE_CACHE.delete(userId);
        }
    }
}, STATUS_UPDATE_INTERVAL * 2);

