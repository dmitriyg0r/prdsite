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
            // Обновляем время последнего входа и статус
            await pool.query(
                'UPDATE users SET last_login = CURRENT_TIMESTAMP, is_online = true, last_activity = CURRENT_TIMESTAMP WHERE id = $1',
                [user.id]
            );
        } catch (updateErr) {
            console.error('Error updating user status:', updateErr);
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
        // Определяем префикс на основе типа загрузки
        let prefix = 'post-';
        if (req.path.includes('avatar')) {
            prefix = 'avatar-';
        } else if (req.path.includes('message')) {
            prefix = 'message-';
        }

        // Генерируем уникальное имя файла
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

// Обновляем роуты для загрузки файлов
app.post('/api/upload-avatar', upload.single('avatar'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'Файл не был загружен' });
        }

        // Формируем URL для доступа к файлу
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
        
        // Создаем новое сообщение с правильными именами колонок
        const result = await pool.query(
            `INSERT INTO messages 
            (sender_id, receiver_id, message, attachment_url, reply_to) 
            VALUES ($1, $2, $3, $4, $5) 
            RETURNING id, created_at`,
            [senderId, receiverId, message, file?.filename, replyToMessageId]
        );

        // Получаем полную информацию о созданном сообщении
        const newMessageResult = await pool.query(
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
            WHERE m.id = $1`,
            [result.rows[0].id]
        );

        res.json({
            success: true,
            message: newMessageResult.rows[0]
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

// Получение п��следнего сообщения с пользователем
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

// Или более детально для каждой папки
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
        res.status(500).json({ error: 'Ошибка при получении списка пользователей' });
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

// Получение информации о пользователе
app.get('/api/users/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        const result = await pool.query(`
            SELECT id, username, role, created_at, last_login, avatar_url
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
        const currentUserId = req.query.currentUserId; // Д��бавляем параметр текущего пользователя

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
        res.status(500).json({ error: 'Оши��ка при обработке лайка' });
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

// Добавляем раздачу статических файлов для постов
app.use('/uploads/posts', express.static('/var/www/html/uploads/posts')); 

// Получение статуса пользователя
app.get('/api/users/status/:userId', async (req, res) => {
    try {
        const userId = parseInt(req.params.userId);

        if (!userId || isNaN(userId)) {
            return res.status(400).json({ 
                success: false, 
                error: 'Invalid user ID' 
            });
        }

        const result = await pool.query(
            'SELECT is_online, last_activity FROM users WHERE id = $1',
            [userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ 
                success: false, 
                error: 'Пользователь не найден' 
            });
        }

        res.json({
            success: true,
            is_online: result.rows[0].is_online,
            last_activity: result.rows[0].last_activity
        });
    } catch (err) {
        console.error('Error getting user status:', err);
        res.status(500).json({ 
            success: false, 
            error: 'Ошибка при получении статуса пользователя' 
        });
    }
});

// Обновление статуса пользователя
app.post('/api/users/update-status', async (req, res) => {
    try {
        const userId = parseInt(req.body.userId);
        const is_online = req.body.is_online ?? true;

        if (!userId || isNaN(userId)) {
            return res.status(400).json({ 
                success: false, 
                error: 'Invalid user ID' 
            });
        }

        await pool.query(
            'UPDATE users SET is_online = $1, last_activity = CURRENT_TIMESTAMP WHERE id = $2',
            [is_online, userId]
        );

        res.json({ success: true });
    } catch (err) {
        console.error('Error updating user status:', err);
        res.status(500).json({ 
            success: false, 
            error: 'Ошибка при обновлении статуса пользователя' 
        });
    }
});

// Добавляем автоматическое обновление статуса каждые 5 минут
setInterval(async () => {
    try {
        // Помечаем пользователей как оффлайн, если их последняя активность была более 5 минут назад
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
app.get('/api/posts/:postId/comments', async (req, res) => {
    try {
        console.log('Loading comments for post:', req.params.postId);
        
        const { postId } = req.params;
        
        // Проверяем существование поста
        const postExists = await pool.query(
            'SELECT id FROM posts WHERE id = $1 AND type = $2',
            [postId, 'post']
        );

        if (postExists.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Пост не найден'
            });
        }

        const comments = await pool.query(`
            SELECT 
                p.*,
                u.username as author_name,
                u.avatar_url as author_avatar
            FROM posts p
            JOIN users u ON p.user_id = u.id
            WHERE p.parent_id = $1 AND p.type = 'comment'
            ORDER BY p.created_at ASC
        `, [postId]);

        console.log('Found comments:', comments.rows.length);
        
        res.json({ 
            success: true, 
            comments: comments.rows 
        });
    } catch (err) {
        console.error('Error loading comments:', err);
        res.status(500).json({ 
            success: false, 
            error: 'Ошибка при загрузке комментариев',
            details: err.message 
        });
    }
});

// Создание комментария
app.post('/api/posts/comment', async (req, res) => {
    try {
        console.log('Creating comment:', req.body);
        
        const { userId, postId, content } = req.body;

        // Проверяем существование поста
        const postExists = await pool.query(
            'SELECT id FROM posts WHERE id = $1 AND type = $2',
            [postId, 'post']
        );

        if (postExists.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Пост не найден'
            });
        }

        // Создаем комментарий
        const result = await pool.query(
            'INSERT INTO posts (user_id, parent_id, type, content) VALUES ($1, $2, $3, $4) RETURNING *',
            [userId, postId, 'comment', content]
        );

        // Получаем информацию об авторе комментария
        const authorInfo = await pool.query(
            'SELECT username, avatar_url FROM users WHERE id = $1',
            [userId]
        );

        const comment = {
            ...result.rows[0],
            author_name: authorInfo.rows[0].username,
            author_avatar: authorInfo.rows[0].avatar_url
        };

        res.json({
            success: true,
            comment: comment
        });
    } catch (err) {
        console.error('Error creating comment:', err);
        res.status(500).json({ error: 'Ошибка при создании комментария' });
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