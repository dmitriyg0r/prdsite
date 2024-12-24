const express = require('express');
const router = express.Router();
const { pool } = require('../utils/db');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Настройка multer для загрузки файлов
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadPath = path.join(__dirname, '../../uploads/messages');
        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
        }
        cb(null, uploadPath);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'message-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB максимальный размер файла
    },
    fileFilter: function (req, file, cb) {
        const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf', 'text/plain'];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Неподдерживаемый тип файла'));
        }
    }
});

// Отправка сообщения
router.post('/messages/send', async (req, res) => {
    try {
        const { senderId, receiverId, message, replyTo } = req.body;

        // Проверяем, существуют ли пользователи
        const usersExist = await pool.query(`
            SELECT EXISTS (SELECT 1 FROM users WHERE id = $1) AS sender_exists,
                   EXISTS (SELECT 1 FROM users WHERE id = $2) AS receiver_exists
        `, [senderId, receiverId]);

        if (!usersExist.rows[0].sender_exists || !usersExist.rows[0].receiver_exists) {
            return res.status(404).json({
                success: false,
                error: 'Отправитель или получатель не найден'
            });
        }

        // Сохраняем сообщение
        const result = await pool.query(`
            INSERT INTO messages 
            (sender_id, receiver_id, message, reply_to, created_at, is_read)
            VALUES ($1, $2, $3, $4, NOW(), false)
            RETURNING id, created_at
        `, [senderId, receiverId, message, replyTo || null]);

        const newMessage = {
            id: result.rows[0].id,
            sender_id: senderId,
            receiver_id: receiverId,
            message,
            reply_to: replyTo || null,
            created_at: result.rows[0].created_at,
            is_read: false
        };

        res.json({
            success: true,
            message: newMessage
        });
    } catch (err) {
        console.error('Error sending message:', err);
        res.status(500).json({
            success: false,
            error: 'Ошибка при отправке сообщения'
        });
    }
});

// Отправка сообщения с файлом
router.post('/messages/send-with-file', upload.single('file'), async (req, res) => {
    try {
        const { senderId, receiverId, message, replyTo } = req.body;
        const file = req.file;

        // Проверяем, существуют ли пользователи
        const usersExist = await pool.query(`
            SELECT EXISTS (SELECT 1 FROM users WHERE id = $1) AS sender_exists,
                   EXISTS (SELECT 1 FROM users WHERE id = $2) AS receiver_exists
        `, [senderId, receiverId]);

        if (!usersExist.rows[0].sender_exists || !usersExist.rows[0].receiver_exists) {
            return res.status(404).json({
                success: false,
                error: 'Отправитель или получатель не найден'
            });
        }

        // Сохраняем сообщение
        const result = await pool.query(`
            INSERT INTO messages 
            (sender_id, receiver_id, message, attachment_url, reply_to, created_at, is_read)
            VALUES ($1, $2, $3, $4, $5, NOW(), false)
            RETURNING id, created_at
        `, [senderId, receiverId, message, file ? `/uploads/messages/${file.filename}` : null, replyTo || null]);

        const newMessage = {
            id: result.rows[0].id,
            sender_id: senderId,
            receiver_id: receiverId,
            message,
            attachment_url: file ? `/uploads/messages/${file.filename}` : null,
            reply_to: replyTo || null,
            created_at: result.rows[0].created_at,
            is_read: false
        };

        res.json({
            success: true,
            message: newMessage
        });
    } catch (err) {
        console.error('Error sending message with file:', err);
        res.status(500).json({
            success: false,
            error: 'Ошибка при отправке сообщения с файлом'
        });
    }
});

// Получение истории сообщений
router.get('/messages/history/:userId/:friendId', async (req, res) => {
    try {
        const { userId, friendId } = req.params;

        const result = await pool.query(`
            SELECT 
                m.*,
                u.username as sender_username,
                u.avatar_url as sender_avatar
            FROM messages m
            JOIN users u ON m.sender_id = u.id
            WHERE (m.sender_id = $1 AND m.receiver_id = $2)
                OR (m.sender_id = $2 AND m.receiver_id = $1)
            ORDER BY m.created_at ASC
        `, [userId, friendId]);

        res.json({
            success: true,
            messages: result.rows
        });
    } catch (err) {
        console.error('Error loading message history:', err);
        res.status(500).json({
            success: false,
            error: 'Ошибка при загрузке истории сообщений'
        });
    }
});

// Пометка сообщений как прочитанных
router.post('/messages/mark-as-read', async (req, res) => {
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
        res.status(500).json({
            success: false,
            error: 'Ошибка при пометке сообщений как прочитанных'
        });
    }
});

// Удаление сообщения
router.delete('/messages/:messageId', async (req, res) => {
    try {
        const { messageId } = req.params;

        // Проверяем, существует ли сообщение
        const messageExists = await pool.query(
            'SELECT * FROM messages WHERE id = $1',
            [messageId]
        );

        if (messageExists.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Сообщение не найдено'
            });
        }

        // Удаляем сообщение
        await pool.query('DELETE FROM messages WHERE id = $1', [messageId]);

        res.json({ success: true });
    } catch (err) {
        console.error('Error deleting message:', err);
        res.status(500).json({
            success: false,
            error: 'Ошибка при удалении сообщения'
        });
    }
});

module.exports = router;