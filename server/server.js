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

// Обновляем настройки CORS
const corsOptions = {
    origin: ['https://space-point.ru', 'http://space-point.ru:3000'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept']
};

app.use(cors(corsOptions));

// Обновляем конфигурацию SSL
const sslOptions = {
    key: fs.readFileSync('/etc/letsencrypt/live/space-point.ru/privkey.pem'),
    cert: fs.readFileSync('/etc/letsencrypt/live/space-point.ru/fullchain.pem'),
    ca: fs.readFileSync('/etc/letsencrypt/live/space-point.ru/chain.pem')
};


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
        const { username, password } = req.body;

        console.log('Login attempt:', { username }); // Добавляем логирование

        if (!username || !password) {
            return res.status(400).json({ 
                success: false,
                error: 'Необходимо указать имя пользователя и пароль' 
            });
        }

        const result = await pool.query(`
            SELECT id, username, password_hash, role, avatar_url, email, created_at, last_login 
            FROM users 
            WHERE username = $1
        `, [username]);

        if (result.rows.length === 0) {
            return res.status(401).json({ 
                success: false,
                error: 'Неверное имя пользователя или пароль' 
            });
        }

        const user = result.rows[0];
        const isValidPassword = await bcrypt.compare(password, user.password_hash);
        
        if (!isValidPassword) {
            return res.status(401).json({ 
                success: false,
                error: 'Неверное имя пользователя или пароль' 
            });
        }

        // Проверяем роль пользователя
        if (user.role !== 'admin') {
            return res.status(403).json({ 
                success: false,
                error: 'Доступ запрещен. Требуются права администратора.' 
            });
        }

        // Обновляем last_login
        await pool.query(`
            UPDATE users 
            SET last_login = NOW() 
            WHERE id = $1
        `, [user.id]);

        const { password_hash: _, ...userWithoutPassword } = user;
        
        console.log('Successful login:', { 
            id: user.id, 
            username: user.username,
            role: user.role 
        });

        res.json({ 
            success: true,
            user: userWithoutPassword 
        });

    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ 
            success: false,
            error: 'Ошибка сервера при авторизации: ' + err.message 
        });
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

        // Устанавливаем заголовки в зависимост о типа файла
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
        // Сохраняем оригинальное имя файла
        const originalName = file.originalname;
        // Генерируем уникальный префикс
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        // Получаем расширение файла из оригинального имени
        const ext = path.extname(originalName);
        // Создаем новое имя файла
        const filename = `${uniqueSuffix}${ext}`;
        
        // Сохраняем оригинальное имя файла в объекте file для дальнейшего использования
        file.originalFileName = originalName;
        file.storedFileName = filename;
        
        cb(null, filename);
    }
});

// Создаем middleware для загрузки файлов
const upload = multer({
    storage: storage,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB максимальный размер файла
    },
    fileFilter: function (req, file, cb) {
        // Получаем расширение файла
        const ext = path.extname(file.originalname).toLowerCase();
        const allowedExtensions = [
            '.jpg', '.jpeg', '.png', '.gif',  // Изображения
            '.pdf',                           // PDF
            '.doc', '.docx',                 // Word
            '.xls', '.xlsx',                 // Excel
            '.ppt', '.pptx',                 // PowerPoint
            '.zip', '.rar'                   // Архивы
        ];

        if (allowedExtensions.includes(ext)) {
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

        // Возвращаем относительный путь без домена
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

// Используем обычный HTTP для локального соединения
http.createServer(app).listen(PORT, () => {
    console.log(`HTTP Server running on port ${PORT}`);
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
        res.status(500).json({ error: 'Ошибка при получении заявок в друзья' });
    }
});

// Добавляем новый endpoint для удаления из друзей
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

// Настройка хранилища для файлов сообщений
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
        res.status(500).json({ error: 'шибка при получении последнего сообщения' });
    }
});

// Получение количества непрочитанных сообщений
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

// Обновляем настройки статических путей
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

// или более детально для каждой папки
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

// Обновление профиля пользователя
app.post('/api/users/update-profile', async (req, res) => {
    try {
        const { userId, avatar_url, username, email } = req.body;
        
        console.log('1. Получены данные для обновления профиля:', {
            userId,
            avatar_url,
            username,
            email
        });

        // Проверяем сущетвование пользователя
        const userCheck = await pool.query('SELECT * FROM users WHERE id = $1', [userId]);
        console.log('2. Текущие данные пользователя:', userCheck.rows[0]);

        if (userCheck.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Пользователь не найден'
            });
        }

        // Обновляем данные пользователя (без updated_at)
        const updateQuery = `
            UPDATE users 
            SET 
                avatar_url = COALESCE($1, avatar_url),
                username = COALESCE($2, username),
                email = COALESCE($3, email)
            WHERE id = $4
            RETURNING *;
        `;

        console.log('3. Выполняем запрос обновления с параметрами:', [avatar_url, username, email, userId]);

        const result = await pool.query(updateQuery, [avatar_url, username, email, userId]);
        
        console.log('4. Результат обновления:', result.rows[0]);

        if (result.rows.length === 0) {
            throw new Error('Не удалось обновить данные пользователя');
        }

        res.json({
            success: true,
            user: result.rows[0]
        });

    } catch (err) {
        console.error('Ошибка при обновлении профиля:', err);
        res.status(500).json({
            success: false,
            error: 'Ошибка при обновлении профиля: ' + err.message
        });
    }
});

// Обновляем эндпоинт отправки сообщения с файлом
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
        // Получаем adminId из разных возможных источников
        const adminId = req.query.adminId || 
                       req.body.adminId || 
                       req.headers['x-admin-id'];
        
        console.log('Проверка прав администратора:', {
            adminId,
            headers: req.headers,
            query: req.query,
            body: req.body
        });

        if (!adminId) {
            console.log('AdminId отсутствует');
            return res.status(401).json({ 
                success: false,
                error: 'Требуется авторизация' 
            });
        }

        const userResult = await pool.query(`
            SELECT id, role, username 
            FROM users 
            WHERE id = $1 AND role = 'admin'
        `, [adminId]);

        console.log('Результат запроса пользователя:', userResult.rows[0]);

        if (userResult.rows.length === 0) {
            console.log('Пользователь не является администратором');
            return res.status(403).json({ 
                success: false,
                error: 'Доступ запрещен' 
            });
        }

        // Добавляем информацию о пользователе в request
        req.admin = userResult.rows[0];
        next();
    } catch (err) {
        console.error('Ошибка проверки прав:', err);
        res.status(500).json({ 
            success: false,
            error: 'Ошибка сервера при проверке прав' 
        });
    }
};

// Обновляем роуты админ-панели
app.get('/api/admin/stats', checkAdmin, async (req, res) => {
    try {
        console.log('Запрос статистики от админа:', req.admin);

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
        
        res.json({ 
            success: true, 
            stats: stats.rows[0] 
        });
    } catch (err) {
        console.error('Ошибка получения статистики:', err);
        res.status(500).json({ 
            success: false, 
            error: 'Ошибка при получении статистики',
            details: err.message
        });
    }
});

app.get('/api/admin/users', checkAdmin, async (req, res) => {
    try {
        console.log('Запрос списка пользователей от админа:', req.admin);
        
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
        console.error('Ошибка получения списка пользователей:', err);
        res.status(500).json({ 
            success: false, 
            error: 'Ошибка при получении списка пользователей',
            details: err.message
        });
    }
});

app.get('/api/admin/charts', checkAdmin, async (req, res) => {
    try {
        console.log('Запрос данных для графиков от админа:', req.admin);

        const [registrations, messages, roles] = await Promise.all([
            pool.query(`
                SELECT DATE(created_at) as date, COUNT(*) as count
                FROM users
                WHERE created_at > NOW() - INTERVAL '7 days'
                GROUP BY DATE(created_at)
                ORDER BY date
            `),
            pool.query(`
                SELECT DATE(created_at) as date, COUNT(*) as count
                FROM messages
                WHERE created_at > NOW() - INTERVAL '7 days'
                GROUP BY DATE(created_at)
                ORDER BY date
            `),
            pool.query(`
                SELECT role, COUNT(*) as count
                FROM users
                GROUP BY role
            `)
        ]);

        res.json({
            success: true,
            charts: {
                registrations: registrations.rows,
                messages: messages.rows,
                roles: roles.rows
            }
        });
    } catch (err) {
        console.error('Ошибка получения данных для графиков:', err);
        res.status(500).json({ 
            success: false, 
            error: 'Ошибка при получении данных для графиков',
            details: err.message
        });
    }
});

app.delete('/api/admin/users/:id', checkAdmin, async (req, res) => {
    try {
        const userId = req.params.id;
        const adminId = req.query.adminId;

        // Начинаем транзакцию
        await pool.query('BEGIN');

        try {
            // 1. Удаляем все записи о дружбе
            await pool.query(`
                DELETE FROM friendships 
                WHERE user_id = $1 OR friend_id = $1
            `, [userId]);

            // 2. Удаляем все сообщения пользователя
            await pool.query(`
                DELETE FROM messages 
                WHERE sender_id = $1 OR receiver_id = $1
            `, [userId]);

            // 3. Теперь можно безопасно удалить пользователя
            const result = await pool.query(`
                DELETE FROM users 
                WHERE id = $1 
                RETURNING *
            `, [userId]);

            // Подтверждаем транзакцию
            await pool.query('COMMIT');

            if (result.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    error: 'Пользователь не найден'
                });
            }

            res.json({
                success: true,
                message: 'Пользователь успешно удален'
            });

        } catch (err) {
            // В случае ошибки откатываем транзакцию
            await pool.query('ROLLBACK');
            throw err;
        }

    } catch (err) {
        console.error('Admin delete user error:', err);
        res.status(500).json({
            success: false,
            error: 'Ошибка при удалении пользователя',
            details: err.message
        });
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

        console.log('Delete post request:', { postId, userId });

        // Проверяем роль пользователя
        const userResult = await pool.query(
            'SELECT role FROM users WHERE id = $1',
            [userId]
        );

        if (userResult.rows.length === 0) {
            return res.status(404).json({ error: 'Пользователь не найден' });
        }

        const isAdmin = userResult.rows[0].role === 'admin';
        console.log('User role check:', { isAdmin });

        // Проверяем существование поста
        const postResult = await pool.query(
            'SELECT user_id FROM posts WHERE id = $1',
            [postId]
        );

        if (postResult.rows.length === 0) {
            return res.status(404).json({ error: 'Пост не найден' });
        }

        const post = postResult.rows[0];
        
        // Проверяем права на удаление
        if (!isAdmin && post.user_id !== userId) {
            return res.status(403).json({ error: 'У вас нет прав на удаление этого поста' });
        }

        // Удаляем пост
        await pool.query('DELETE FROM posts WHERE id = $1', [postId]);

        res.json({ success: true });

    } catch (err) {
        console.error('Error deleting post:', err);
        res.status(500).json({ error: 'Ошибка при удалении поста' });
    }
});

// Добавляем раздачу статических файлов для постов
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

// бвление статуса пользователя
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

// Получение комментариев для поста
app.get('/api/posts/:postId/comments', async (req, res) => {
    try {
        const { postId } = req.params;
        
        const result = await pool.query(`
            SELECT 
                p.id,
                p.content,
                p.created_at,
                p.user_id,
                u.username as author_name,
                u.avatar_url as author_avatar
            FROM posts p
            JOIN users u ON p.user_id = u.id
            WHERE p.parent_id = $1 
            AND p.type = 'comment'
            ORDER BY p.created_at DESC
        `, [postId]);

        res.json({
            success: true,
            comments: result.rows
        });
    } catch (err) {
        console.error('Error getting comments:', err);
        res.status(500).json({
            success: false,
            error: 'Ошибка при получении комментариев'
        });
    }
});

// Создание комментария
app.post('/api/posts/comment', async (req, res) => {
    try {
        const { userId, postId, content } = req.body;

        // Проверяем существование поста
        const postExists = await pool.query(
            'SELECT EXISTS(SELECT 1 FROM posts WHERE id = $1 AND type = \'post\')',
            [postId]
        );

        if (!postExists.rows[0].exists) {
            return res.status(404).json({
                success: false,
                error: 'Пост не найден'
            });
        }

        // Создаем комментарий
        const result = await pool.query(`
            INSERT INTO posts (user_id, parent_id, type, content, created_at)
            VALUES ($1, $2, 'comment', $3, CURRENT_TIMESTAMP)
            RETURNING id, content, created_at
        `, [userId, postId, content]);

        // Получаем информацию об авторе комментария
        const userInfo = await pool.query(`
            SELECT username, avatar_url
            FROM users
            WHERE id = $1
        `, [userId]);

        const comment = {
            id: result.rows[0].id,
            content: result.rows[0].content,
            created_at: result.rows[0].created_at,
            author_name: userInfo.rows[0].username,
            author_avatar: userInfo.rows[0].avatar_url,
            user_id: userId
        };

        res.json({
            success: true,
            comment: comment
        });
    } catch (err) {
        console.error('Error creating comment:', err);
        res.status(500).json({
            success: false,
            error: 'Ошибка при создании комментария'
        });
    }
});

// Удалени комментария
app.delete('/api/comments/:commentId', async (req, res) => {
    try {
        const { commentId } = req.params;
        const { userId } = req.body;

        // Проверяем, является ли пользователь автором комментария
        const comment = await pool.query(
            'SELECT parent_id FROM posts WHERE id = $1 AND user_id = $2 AND type = \'comment\'',
            [commentId, userId]
        );

        if (comment.rows.length === 0) {
            return res.status(403).json({
                success: false,
                error: 'Нет прав н удаение этого комментария'
            });
        }

        // Удаляем комментарий
        await pool.query('DELETE FROM posts WHERE id = $1', [commentId]);

        res.json({ success: true });
    } catch (err) {
        console.error('Error deleting comment:', err);
        res.status(500).json({
            success: false,
            error: 'Ошибка при удалении комментария'
        });
    }
});

// Редактирование комментария
app.put('/api/comments/:commentId', async (req, res) => {
    try {
        const { commentId } = req.params;
        const { userId, content } = req.body;

        // Проверяем, является ли пользователь автором комментария
        const commentExists = await pool.query(
            'SELECT EXISTS(SELECT 1 FROM posts WHERE id = $1 AND user_id = $2 AND type = \'comment\')',
            [commentId, userId]
        );

        if (!commentExists.rows[0].exists) {
            return res.status(403).json({
                success: false,
                error: 'Нет прав на редактирование этого комментария'
            });
        }

        // Обновляем комментарий
        const result = await pool.query(`
            UPDATE posts 
            SET content = $1, 
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $2
            RETURNING id, content, created_at, updated_at
        `, [content, commentId]);

        res.json({
            success: true,
            comment: result.rows[0]
        });
    } catch (err) {
        console.error('Error updating comment:', err);
        res.status(500).json({
            success: false,
            error: 'Ошибка при обновлении комментария'
        });
    }
});

// Обрабтка статуса набора текста
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
let transporter = nodemailer.createTransport({
    host: 'smtp.timeweb.ru',
    port: 2525,
    secure: false,
    auth: {
        user: 'adminflow@space-point.ru',
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
        user: 'adminflow@space-point.ru',
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

// Функция для генерации кда подтверждения
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

        // Сохраняем код в базу
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
            from: '"AdminFlow" <adminflow@space-point.ru>',
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

// Запускаем HTTPS сервер на порту 5003
httpsServer.listen(5003, () => {
    console.log('HTTPS Server running on port 5003');
});

// Удаляем или комментируем старый HTTP сервер
// http.createServer(app).listen(PORT, () => {
//     console.log(`HTTP Server running on port ${PORT}`);
// });

// Создаем Map для хранения активных соединений
const activeConnections = new Map();

// Используем существующий httpsServer для Socket.IO
const io = new Server(httpsServer, {
    cors: {
        origin: [
            'https://space-point.ru',
            'https://www.space-point.ru',
            'http://space-point.ru',
            'http://www.space-point.ru'
        ],
        methods: ['GET', 'POST'],
        credentials: true
    }
});

// Удаляем middleware для Socket.IO, так как теперь используем CORS настройки выше
app.use('/socket.io', (req, res, next) => {
    next();
});

// Добавляем промежуточное ПО для предварительной проверки OPTIONS
app.options('*', cors());

// Добавляем заголовки безопасности
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Allow-Origin', req.headers.origin);
    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Content-Length, X-Requested-With, Accept, Origin');
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

            // Уведомляем отправителя о прочтнии сообщений
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

    socket.on('voice_message', async (data) => {
        try {
            const { senderId, receiverId, audioBlob } = data;
            
            // Сохраняем аудио и создаем сообщение
            // Этот код будет вызываться через HTTP эндпоинт
            
        } catch (err) {
            console.error('Error handling voice message:', err);
            socket.emit('voice_message_error', { 
                error: 'Ошибка при обработке голосового сообщения' 
            });
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

// Добавляем нвый endpoint для получения информации о пользователе
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

        // Модифицированный запрос для получения списка чатов, включая друзей без сообщений
        const result = await pool.query(`
            WITH FriendsAndChats AS (
                -- Получаем всех друзей
                SELECT 
                    CASE 
                        WHEN user_id = $1 THEN friend_id
                        ELSE user_id 
                    END as partner_id
                FROM friendships 
                WHERE (user_id = $1 OR friend_id = $1)
                AND status = 'accepted'
                
                UNION
                
                -- Добавляем собеседников из существующих чатов
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
            FROM FriendsAndChats fc
            JOIN users u ON u.id = fc.partner_id
            LEFT JOIN LastMessages lm ON lm.partner_id = u.id
            ORDER BY 
                CASE 
                    WHEN lm.created_at IS NOT NULL THEN 0
                    ELSE 1
                END,
                lm.created_at DESC NULLS LAST,
                u.username ASC
        `, [userId]);

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
            ORDER BY RANDOM()
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

// Настройка хранилища для голосовых сообщений
const voiceStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        const dir = 'uploads/voice';
        if (!fs.existsSync(dir)){
            fs.mkdirSync(dir, { recursive: true });
        }
        cb(null, dir);
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + Math.round(Math.random() * 1E9) + '.webm');
    }
});

const uploadVoice = multer({ 
    storage: voiceStorage,
    limits: {
        fileSize: 10 * 1024 * 1024 // Максимальный размер 10MB
    }
});

// Эндпоинт для отправки голосовых сообщений
app.post('/api/messages/voice', uploadVoice.single('audio'), async (req, res) => {
    try {
        const { senderId, receiverId } = req.body;
        
        if (!req.file) {
            return res.status(400).json({ 
                success: false, 
                error: 'Аудиофайл не найден' 
            });
        }

        // Сначала создаем запись в таблице messages
        const messageResult = await pool.query(`
            INSERT INTO messages 
            (sender_id, receiver_id, message_type, message, created_at, is_read)
            VALUES ($1, $2, 'voice', '[Голосовое сообщение]', NOW(), false)
            RETURNING id, created_at
        `, [senderId, receiverId]);

        const messageId = messageResult.rows[0].id;

        // Затем создаем запись в таблице voice_messages
        await pool.query(`
            INSERT INTO voice_messages 
            (message_id, duration, file_path)
            VALUES ($1, $2, $3)
        `, [messageId, 0, req.file.path]); // Длительность можно обновить позже

        const message = {
            id: messageId,
            sender_id: senderId,
            receiver_id: receiverId,
            message_type: 'voice',
            message: '[Голосовое сообщение]',
            file_path: req.file.path,
            created_at: messageResult.rows[0].created_at,
            is_read: false
        };

        // Отправляем уведомление через Socket.IO
        const receiverSocketId = activeConnections.get(receiverId);
        if (receiverSocketId) {
            io.to(receiverSocketId).emit('new_message', message);
        }

        res.json({ 
            success: true, 
            message 
        });

    } catch (err) {
        console.error('Error sending voice message:', err);
        res.status(500).json({ 
            success: false, 
            error: 'Ошибка при отправке голосового сообщения' 
        });
    }
});

// Эндпоинт для получения голосового сообщения
app.get('/api/messages/voice/:messageId', async (req, res) => {
    try {
        const { messageId } = req.params;

        const result = await pool.query(`
            SELECT vm.file_path
            FROM voice_messages vm
            JOIN messages m ON m.id = vm.message_id
            WHERE m.id = $1
        `, [messageId]);

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Голосовое сообщение не найдено'
            });
        }

        const filePath = result.rows[0].file_path;
        res.sendFile(path.resolve(filePath));

    } catch (err) {
        console.error('Error getting voice message:', err);
        res.status(500).json({
            success: false,
            error: 'Ошибка при получении голосового сообщения'
        });
    }
});

// Обновляем эндпоинт удаления сообщений
app.delete('/api/messages/:messageId', async (req, res) => {
    try {
        const { messageId } = req.params;

        // Начинаем транзакцию
        await pool.query('BEGIN');

        try {
            // Проверяем тип сообщения и получаем путь к файлу, если это голосовое сообщение
            const messageResult = await pool.query(`
                SELECT m.message_type, vm.file_path 
                FROM messages m 
                LEFT JOIN voice_messages vm ON vm.message_id = m.id 
                WHERE m.id = $1
            `, [messageId]);

            if (messageResult.rows.length === 0) {
                await pool.query('ROLLBACK');
                return res.status(404).json({
                    success: false,
                    error: 'Сообщение не найдено'
                });
            }

            const { message_type, file_path } = messageResult.rows[0];

            // Если это голосовое сообщение, удаляем файл
            if (message_type === 'voice' && file_path) {
                try {
                    fs.unlinkSync(file_path);
                } catch (fileError) {
                    console.error('Ошибка при удалении файла:', fileError);
                    // Продолжаем выполнение даже если файл не удалось удалить
                }
            }

            // Удаляем сообщение (связанная запись в voice_messages удалится автоматически)
            await pool.query('DELETE FROM messages WHERE id = $1', [messageId]);

            // Фиксируем транзакцию
            await pool.query('COMMIT');

            res.json({
                success: true,
                message: 'Сообщение успешно удаено'
            });

        } catch (err) {
            await pool.query('ROLLBACK');
            throw err;
        }

    } catch (err) {
        console.error('Error deleting message:', err);
        res.status(500).json({
            success: false,
            error: 'Ошибка при удалении сообщения'
        });
    }
});

// Обноляем конфигурацию multer для аватаров
const avatarStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadPath = '/var/www/html/uploads/avatars';
        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
        }
        cb(null, uploadPath);
    },
    filename: async function (req, file, cb) {
        try {
            const userId = req.body.userId;
            // Получаем текущий аватар пользователя
            const result = await pool.query('SELECT avatar_url FROM users WHERE id = $1', [userId]);
            let filename;
            
            if (result.rows[0]?.avatar_url) {
                // Используем существующее имя файла
                filename = path.basename(result.rows[0].avatar_url);
            } else {
                // Создаем новое имя файла
                filename = `avatar-${userId}${path.extname(file.originalname)}`;
            }
            
            // Если старый файл существует, удаляем его
            const oldPath = path.join('/var/www/html/uploads/avatars', filename);
            if (fs.existsSync(oldPath)) {
                fs.unlinkSync(oldPath);
            }
            
            cb(null, filename);
        } catch (err) {
            console.error('Error in filename generation:', err);
            // В случае ошибки используем запасной вариант
            const fallbackFilename = `avatar-${req.body.userId}${path.extname(file.originalname)}`;
            cb(null, fallbackFilename);
        }
    }
});

const uploadAvatar = multer({
    storage: avatarStorage,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB
    },
    fileFilter: function (req, file, cb) {
        if (!file.originalname.match(/\.(jpg|jpeg|png|gif|webp)$/)) {
            return cb(new Error('Разрешены только изображения!'), false);
        }
        cb(null, true);
    }
});

// Обновляем маршрут загрузки аватара
app.post('/api/upload-avatar', uploadAvatar.single('avatar'), async (req, res) => {
    try {
        const userId = req.body.userId;
        console.log('1. Upload avatar request for user:', userId);

        if (!userId || !req.file) {
            console.error('2. Missing required data:', { userId, file: !!req.file });
            return res.status(400).json({ 
                success: false, 
                error: !userId ? 'ID пользователя не указан' : 'Файл не был загружен' 
            });
        }

        // Формируем имя файла с timestamp для уникальности
        const timestamp = Date.now();
        const fileExt = path.extname(req.file.originalname);
        const filename = `avatar-${timestamp}-${Math.floor(Math.random() * 1000000000)}${fileExt}`;
        const avatarUrl = `/uploads/avatars/${filename}`;
        const finalPath = path.join('/var/www/html/uploads/avatars', filename);

        console.log('3. File paths:', {
            filename,
            avatarUrl,
            finalPath
        });

        try {
            // Получаем текущий аватар пользователя
            const currentAvatarResult = await pool.query('SELECT avatar_url FROM users WHERE id = $1', [userId]);
            const currentAvatarUrl = currentAvatarResult.rows[0]?.avatar_url;

            // Удаляем старый файл аватара, если он существует и не является default.png
            if (currentAvatarUrl && !currentAvatarUrl.includes('default.png')) {
                const oldPath = path.join('/var/www/html/uploads/avatars', path.basename(currentAvatarUrl));
                if (fs.existsSync(oldPath)) {
                    fs.unlinkSync(oldPath);
                    console.log('4. Deleted old avatar file:', oldPath);
                }
            }

            // Перемещаем новый файл
            fs.renameSync(req.file.path, finalPath);
            console.log('5. Moved new file to:', finalPath);

            // Обновляем URL в базе данных
            const updateQuery = `
                UPDATE users 
                SET avatar_url = $1,
                    updated_at = NOW() 
                WHERE id = $2
                RETURNING *;
            `;
            
            const updateResult = await pool.query(updateQuery, [avatarUrl, userId]);
            console.log('6. Updated database:', updateResult.rows[0]);

            if (!updateResult.rows[0]) {
                throw new Error('Failed to update user data');
            }

            return res.json({
                success: true,
                avatarUrl,
                user: updateResult.rows[0]
            });

        } catch (err) {
            console.error('7. Database error:', err);
            // Очищаем загруженный файл в случае ошибки
            if (fs.existsSync(finalPath)) {
                fs.unlinkSync(finalPath);
            }
            throw err;
        }

    } catch (err) {
        console.error('8. Avatar upload error:', err);
        return res.status(500).json({ 
            success: false, 
            error: 'Ошибка при загрузке аватара',
            details: err.message 
        });
    }
});

// Получение информации о пользователе
app.get('/api/users/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        console.log('Запрос информации о пользователе:', id);

        const result = await pool.query(`
            SELECT 
                id, 
                username, 
                email, 
                role, 
                avatar_url, 
                created_at, 
                last_login,
                updated_at,
                is_online,
                last_activity
            FROM users 
            WHERE id = $1
        `, [id]);

        console.log('Результат запроса пользователя:', result.rows[0]);

        if (result.rows.length === 0) {
            return res.status(404).json({ 
                success: false, 
                error: 'Пользователь не найден' 
            });
        }

        res.json({
            success: true,
            user: result.rows[0]
        });
    } catch (err) {
        console.error('Error getting user:', err);
        res.status(500).json({ 
            success: false, 
            error: 'Ошибка при получении данных пользователя' 
        });
    }
});

// Обновляем настройки раздачи статических файлов
app.use('/uploads/avatars', (req, res, next) => {
    console.log('Запрос аватара:', req.url);
    
    // Отключаем кэширование для аватаров
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    
    // Добавляем обработку ошибок
    const filePath = path.join('/var/www/html/uploads/avatars', req.url.split('?')[0]);
    if (!fs.existsSync(filePath)) {
        console.log('Файл аватара не найден:', filePath);
        return res.status(404).sendFile(path.join('/var/www/html/uploads/avatars', 'default.png'));
    }
    
    next();
}, express.static('/var/www/html/uploads/avatars'));

// Получение списка отзывов
app.get('/api/reviews', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT 
                r.id,
                r.text,
                r.created_at as timestamp,
                u.username,
                u.avatar_url as avatar
            FROM reviews r
            JOIN users u ON r.user_id = u.id
            ORDER BY r.created_at ASC
            LIMIT 100
        `);

        res.json({
            success: true,
            reviews: result.rows
        });
    } catch (err) {
        console.error('Error loading reviews:', err);
        res.status(500).json({
            success: false,
            error: 'Ошибка при загрузке отзывов'
        });
    }
});

// Добавление нового отзыва
app.post('/api/reviews', async (req, res) => {
    try {
        const { text, userId } = req.body;
        
        // Добавляем подробное логирование
        console.log('Получен запрос на добавление отзыва:', {
            body: req.body,
            text: text,
            userId: userId,
            headers: req.headers
        });

        // Проверяем наличие текста и ID пользователя
        if (!text || !userId) {
            console.log('Отсутствуют обязательные поля:', { text, userId });
            return res.status(400).json({
                success: false,
                error: 'Необходимо указать текст отзыва и ID пользователя',
                receivedData: { text, userId }
            });
        }

        // Получаем информацию о пользователе
        const userResult = await pool.query(`
            SELECT username, avatar_url 
            FROM users 
            WHERE id = $1
        `, [userId]);

        if (userResult.rows.length === 0) {
            console.log('Пользователь не найден:', userId);
            return res.status(404).json({
                success: false,
                error: 'Пользователь не найден',
                userId: userId
            });
        }

        // Добавляем отзыв в базу данных
        const result = await pool.query(`
            INSERT INTO reviews (user_id, text, created_at)
            VALUES ($1, $2, NOW())
            RETURNING id, text, created_at as timestamp
        `, [userId, text]);

        // Формируем ответ с полной информацией об отзыве
        const review = {
            ...result.rows[0],
            username: userResult.rows[0].username,
            avatar: userResult.rows[0].avatar_url
        };

        console.log('Отзыв успешно добавлен:', review);

        res.json({
            success: true,
            review
        });

    } catch (err) {
        console.error('Детальная ошибка при добавлении отзыва:', {
            error: err,
            stack: err.stack,
            body: req.body
        });
        res.status(500).json({
            success: false,
            error: 'Ошибка при добавлении отзыва',
            details: err.message
        });
    }
});

// Удаление отзыва (опционально, для модераторов)
app.delete('/api/reviews/:reviewId', async (req, res) => {
    try {
        const { reviewId } = req.params;
        const { userId } = req.body; // ID пользователя, который пытается удалить отзыв

        // Проверяем права пользователя (например, является ли он модератором)
        const userResult = await pool.query(`
            SELECT role FROM users WHERE id = $1
        `, [userId]);

        if (userResult.rows[0]?.role !== 'admin' && userResult.rows[0]?.role !== 'moderator') {
            return res.status(403).json({
                success: false,
                error: 'Недостаточно прав для удаления отзыва'
            });
        }

        // Удаляем отзыв
        await pool.query('DELETE FROM reviews WHERE id = $1', [reviewId]);

        res.json({
            success: true,
            message: 'Отзыв успешно удален'
        });

    } catch (err) {
        console.error('Error deleting review:', err);
        res.status(500).json({
            success: false,
            error: 'Ошибка при удалении отзыва'
        });
    }
});

// Добавляем эндпоинт для получения статистики
app.get('/api/stats', checkAdmin, async (req, res) => {
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
        
        res.json({ 
            success: true, 
            stats: stats.rows[0] 
        });
    } catch (err) {
        console.error('Ошибка получения статистики:', err);
        res.status(500).json({ 
            success: false, 
            error: 'Ошибка при получении статистики',
            details: err.message
        });
    }
});

// Обновляем эндпоинт для получения списка пользователей
app.get('/api/users', checkAdmin, async (req, res) => {
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
        console.error('Ошибка получения списка пользователей:', err);
        res.status(500).json({ 
            success: false, 
            error: 'Ошибка при получении списка пользователей',
            details: err.message
        });
    }
});

// Добавляем эндпоинт для получения данных графиков
app.get('/api/charts', checkAdmin, async (req, res) => {
    try {
        const [registrations, messages, roles] = await Promise.all([
            pool.query(`
                SELECT DATE(created_at) as date, COUNT(*) as count
                FROM users
                WHERE created_at > NOW() - INTERVAL '7 days'
                GROUP BY DATE(created_at)
                ORDER BY date
            `),
            pool.query(`
                SELECT DATE(created_at) as date, COUNT(*) as count
                FROM messages
                WHERE created_at > NOW() - INTERVAL '7 days'
                GROUP BY DATE(created_at)
                ORDER BY date
            `),
            pool.query(`
                SELECT role, COUNT(*) as count
                FROM users
                GROUP BY role
            `)
        ]);

        res.json({
            success: true,
            charts: {
                registrations: registrations.rows,
                messages: messages.rows,
                roles: roles.rows
            }
        });
    } catch (err) {
        console.error('Ошибка получения данных для графиков:', err);
        res.status(500).json({ 
            success: false, 
            error: 'Ошибка при получении данных для графиков',
            details: err.message
        });
    }
});

// Обновляем endpoint для получения структуры таблицы White_List
app.get('/api/database/structure', checkAdmin, async (req, res) => {
    try {
        // Получаем информацию о колонках таблицы White_List
        const columns = await pool.query(`
            SELECT 
                COLUMN_NAME,
                DATA_TYPE,
                IS_NULLABLE,
                COLUMN_KEY,
                COLUMN_DEFAULT,
                EXTRA
            FROM information_schema.COLUMNS 
            WHERE TABLE_SCHEMA = 'maincraft' 
            AND TABLE_NAME = 'White_List'
            ORDER BY ORDINAL_POSITION
        `);

        // Получаем количество записей в таблице
        const count = await pool.query(`
            SELECT COUNT(*) as count 
            FROM "White_List"
        `);

        const databaseStructure = {
            'White_List': {
                columns: columns.rows,
                rowCount: count.rows[0].count
            }
        };

        res.json({
            success: true,
            structure: databaseStructure
        });
    } catch (err) {
        console.error('Ошибка получения структуры базы данных:', err);
        res.status(500).json({
            success: false,
            error: 'Ошибка при получении структуры базы данных',
            details: err.message
        });
    }
});

// Обновляем endpoint для получения данных таблицы White_List (без проверки авторизации)
app.get('/api/database/table/White_List', async (req, res) => {
    try {
        const { page = 1, limit = 10 } = req.query;
        const offset = (page - 1) * limit;

        console.log('Fetching White_List data...'); // Добавляем лог

        // Получаем данные таблицы
        const rows = await pool.query(`
            SELECT * 
            FROM maincraft."White_List"  
            LIMIT $1 OFFSET $2
        `, [parseInt(limit), offset]);

        console.log('Fetched rows:', rows.rows); // Логируем результат

        // Получаем общее количество записей
        const count = await pool.query(`
            SELECT COUNT(*) as total 
            FROM maincraft."White_List"
        `);

        console.log('Total count:', count.rows[0].total); // Логируем количество

        res.json({
            success: true,
            data: {
                rows: rows.rows,
                total: count.rows[0].total,
                pages: Math.ceil(count.rows[0].total / parseInt(limit))
            }
        });
    } catch (err) {
        console.error('Ошибка получения данных таблицы:', err);
        res.status(500).json({
            success: false,
            error: 'Ошибка при получении данных таблицы',
            details: err.message
        });
    }
});

// Добавляем endpoint для добавления записи
app.post('/api/database/table/White_List', checkAdmin, async (req, res) => {
    try {
        const { UUID, user } = req.body;

        if (!UUID || !user) {
            return res.status(400).json({
                success: false,
                error: 'UUID и user обязательны для заполнения'
            });
        }

        const result = await pool.query(`
            INSERT INTO "White_List" (UUID, user)
            VALUES ($1, $2)
            RETURNING *
        `, [UUID, user]);

        res.json({
            success: true,
            data: result.rows[0]
        });
    } catch (err) {
        console.error('Ошибка добавления записи:', err);
        res.status(500).json({
            success: false,
            error: 'Ошибка при добавлении записи',
            details: err.message
        });
    }
});

// Добавляем endpoint для удаления записи
app.delete('/api/database/table/White_List/:uuid', checkAdmin, async (req, res) => {
    try {
        const { uuid } = req.params;

        const result = await pool.query(`
            DELETE FROM "White_List"
            WHERE UUID = $1
            RETURNING *
        `, [uuid]);

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Запись не найдена'
            });
        }

        res.json({
            success: true,
            data: result.rows[0]
        });
    } catch (err) {
        console.error('Ошибка удаления записи:', err);
        res.status(500).json({
            success: false,
            error: 'Ошибка при удалении записи',
            details: err.message
        });
    }
});

// Добавим endpoint для проверки структуры таблицы
app.get('/api/database/check-whitelist', checkAdmin, async (req, res) => {
    try {
        // Проверяем структуру таблицы
        const tableInfo = await pool.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_schema = 'maincraft' 
            AND table_name = 'White_List'
        `);

        // Проверяем наличие данных
        const sampleData = await pool.query(`
            SELECT * FROM maincraft."White_List" LIMIT 1
        `);

        res.json({
            success: true,
            structure: tableInfo.rows,
            hasSampleData: sampleData.rows.length > 0,
            sampleData: sampleData.rows
        });
    } catch (err) {
        console.error('Ошибка проверки таблицы:', err);
        res.status(500).json({
            success: false,
            error: 'Ошибка при проверке таблицы',
            details: err.message
        });
    }
});