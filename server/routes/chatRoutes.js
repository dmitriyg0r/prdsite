const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const multer = require('multer');
const fs = require('fs');
const path = require('path');

// Настройка хранилища для вложений сообщений
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const dir = 'uploads/messages';
        if (!fs.existsSync(dir)){
            fs.mkdirSync(dir, { recursive: true });
        }
        cb(null, dir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, uniqueSuffix + ext);
    }
});

const upload = multer({ 
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024 // Максимальный размер 5MB
    }
});

// Получение истории сообщений
router.get('/history/:userId/:friendId', async (req, res) => {
    try {
        const { userId, friendId } = req.params;
        
        const result = await pool.query(`
            SELECT m.*, u.username as sender_username
            FROM messages m
            JOIN users u ON m.sender_id = u.id
            WHERE (m.sender_id = $1 AND m.receiver_id = $2)
            OR (m.sender_id = $2 AND m.receiver_id = $1)
            ORDER BY m.created_at ASC
        `, [userId, friendId]);
        
        // Обработка сообщений с ответами
        const messages = await Promise.all(result.rows.map(async (message) => {
            if (message.reply_to) {
                const replyResult = await pool.query(`
                    SELECT m.*, u.username as sender_username
                    FROM messages m
                    JOIN users u ON m.sender_id = u.id
                    WHERE m.id = $1
                `, [message.reply_to]);
                
                if (replyResult.rows.length > 0) {
                    message.reply_to_message = replyResult.rows[0];
                }
            }
            return message;
        }));

        res.json({
            success: true,
            messages
        });
    } catch (err) {
        console.error('Error loading chat history:', err);
        res.status(500).json({ 
            success: false, 
            error: 'Ошибка при загрузке истории чата' 
        });
    }
});

// Отправка текстового сообщения
router.post('/send', async (req, res) => {
    try {
        const { senderId, receiverId, message, replyToMessageId } = req.body;
        
        // Проверка входных данных
        if (!senderId || !receiverId || !message) {
            return res.status(400).json({ 
                success: false, 
                error: 'Отсутствуют обязательные параметры' 
            });
        }

        // Сохраняем сообщение в БД
        const result = await pool.query(`
            INSERT INTO messages 
            (sender_id, receiver_id, message, reply_to, created_at, is_read) 
            VALUES ($1, $2, $3, $4, NOW(), false)
            RETURNING id, created_at
        `, [senderId, receiverId, message, replyToMessageId || null]);

        // Получаем информацию об отправителе
        const userResult = await pool.query(
            'SELECT username FROM users WHERE id = $1',
            [senderId]
        );

        const newMessage = {
            id: result.rows[0].id,
            sender_id: senderId,
            receiver_id: receiverId,
            message,
            created_at: result.rows[0].created_at,
            is_read: false,
            reply_to: replyToMessageId,
            sender_username: userResult.rows[0]?.username
        };

        // Если есть ответ на сообщение, добавляем информацию о нем
        if (replyToMessageId) {
            const replyResult = await pool.query(`
                SELECT m.*, u.username as sender_username
                FROM messages m
                JOIN users u ON m.sender_id = u.id
                WHERE m.id = $1
            `, [replyToMessageId]);
            
            if (replyResult.rows.length > 0) {
                newMessage.reply_to_message = replyResult.rows[0];
            }
        }

        // Отправляем сообщение через Socket.IO, если доступно
        if (req.app.get('io')) {
            const io = req.app.get('io');
            const activeConnections = req.app.get('activeConnections');
            
            const receiverSocketId = activeConnections.get(receiverId.toString());
            if (receiverSocketId) {
                io.to(receiverSocketId).emit('new_message', newMessage);
            }
        }

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

// Загрузка файла с сообщением
router.post('/upload', upload.single('file'), async (req, res) => {
    try {
        const { senderId, receiverId, message, replyToMessageId } = req.body;
        
        if (!senderId || !receiverId || !req.file) {
            return res.status(400).json({ 
                success: false, 
                error: 'Отсутствуют обязательные параметры' 
            });
        }

        const attachmentUrl = `/uploads/messages/${req.file.filename}`;
        
        // Сохраняем сообщение с вложением в БД
        const result = await pool.query(`
            INSERT INTO messages 
            (sender_id, receiver_id, message, attachment_url, reply_to, created_at, is_read) 
            VALUES ($1, $2, $3, $4, $5, NOW(), false)
            RETURNING id, created_at
        `, [senderId, receiverId, message || '', attachmentUrl, replyToMessageId || null]);

        // Получаем информацию об отправителе
        const userResult = await pool.query(
            'SELECT username FROM users WHERE id = $1',
            [senderId]
        );

        const newMessage = {
            id: result.rows[0].id,
            sender_id: senderId,
            receiver_id: receiverId,
            message: message || '',
            attachment_url: attachmentUrl,
            created_at: result.rows[0].created_at,
            is_read: false,
            reply_to: replyToMessageId,
            sender_username: userResult.rows[0]?.username
        };

        // Если есть ответ на сообщение, добавляем информацию о нем
        if (replyToMessageId) {
            const replyResult = await pool.query(`
                SELECT m.*, u.username as sender_username
                FROM messages m
                JOIN users u ON m.sender_id = u.id
                WHERE m.id = $1
            `, [replyToMessageId]);
            
            if (replyResult.rows.length > 0) {
                newMessage.reply_to_message = replyResult.rows[0];
            }
        }

        // Отправляем сообщение через Socket.IO, если доступно
        if (req.app.get('io')) {
            const io = req.app.get('io');
            const activeConnections = req.app.get('activeConnections');
            
            const receiverSocketId = activeConnections.get(receiverId.toString());
            if (receiverSocketId) {
                io.to(receiverSocketId).emit('new_message', newMessage);
            }
        }

        res.json({
            success: true,
            message: newMessage
        });
    } catch (err) {
        console.error('Error uploading file message:', err);
        res.status(500).json({ 
            success: false, 
            error: 'Ошибка при отправке сообщения с файлом' 
        });
    }
});

// Обработка статуса набора текста
router.post('/typing', async (req, res) => {
    try {
        const { userId, friendId, isTyping } = req.body;
        
        // Сохраняем статус в глобальной переменной
        global.typingStatus = global.typingStatus || {};
        global.typingStatus[`${userId}-${friendId}`] = {
            isTyping,
            timestamp: Date.now()
        };
        
        // Отправляем уведомление через Socket.IO, если доступно
        if (req.app.get('io')) {
            const io = req.app.get('io');
            const activeConnections = req.app.get('activeConnections');
            
            const receiverSocketId = activeConnections.get(friendId.toString());
            if (receiverSocketId) {
                io.to(receiverSocketId).emit('typing_status', { 
                    userId, 
                    isTyping 
                });
            }
        }
        
        res.json({ success: true });
    } catch (err) {
        console.error('Error updating typing status:', err);
        res.status(500).json({ error: 'Ошибка при обновлении статуса набора' });
    }
});

// Удаление сообщения
router.delete('/delete/:messageId', async (req, res) => {
    try {
        const { messageId } = req.params;
        const { userId, attachmentUrl } = req.body;

        // Проверяем, является ли пользователь отправителем сообщения
        const message = await pool.query(
            'SELECT * FROM messages WHERE id = $1 AND sender_id = $2',
            [messageId, userId]
        );

        if (message.rows.length === 0) {
            return res.status(403).json({ error: 'У вас нет прав на удаление этого сообщения' });
        }

        // Удаляем файл вложения, если он есть
        if (attachmentUrl) {
            try {
                const filePath = path.join(__dirname, '..', '..', attachmentUrl.replace(/^https?:\/\/[^\/]+/, ''));
                if (fs.existsSync(filePath)) {
                    fs.unlinkSync(filePath);
                }
            } catch (fileErr) {
                console.error('Error deleting attachment file:', fileErr);
                // Продолжаем удаление сообщения даже если файл не удалось удалить
            }
        }

        // Удаляем сообщение из БД
        await pool.query('DELETE FROM messages WHERE id = $1', [messageId]);

        // Отправляем уведомление через Socket.IO, если доступно
        if (req.app.get('io')) {
            const io = req.app.get('io');
            const activeConnections = req.app.get('activeConnections');
            
            const receiverId = message.rows[0].receiver_id;
            const receiverSocketId = activeConnections.get(receiverId.toString());
            if (receiverSocketId) {
                io.to(receiverSocketId).emit('message_deleted', { 
                    messageId 
                });
            }
        }

        res.json({ success: true });
    } catch (err) {
        console.error('Error deleting message:', err);
        res.status(500).json({ error: 'Ошибка при удалении сообщения' });
    }
});

// Получение количества непрочитанных сообщений
router.get('/unread/:userId/:friendId', async (req, res) => {
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

// Пометка сообщений как прочитанных
router.post('/mark-as-read', async (req, res) => {
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

        // Отправляем уведомление через Socket.IO, если доступно
        if (req.app.get('io')) {
            const io = req.app.get('io');
            const activeConnections = req.app.get('activeConnections');
            
            const senderSocketId = activeConnections.get(friendId.toString());
            if (senderSocketId) {
                io.to(senderSocketId).emit('messages_read', { 
                    by: userId,
                    timestamp: new Date()
                });
            }
        }

        res.json({ success: true });
    } catch (err) {
        console.error('Error marking messages as read:', err);
        res.status(500).json({ 
            success: false, 
            error: 'Error marking messages as read' 
        });
    }
});

module.exports = router; 