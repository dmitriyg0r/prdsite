const express = require('express');
const router = express.Router();
const { pool } = require('../utils/db');

// Получение списка чатов
router.get('/chats/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const result = await pool.query(`
            SELECT 
                u.id,
                u.username,
                u.avatar_url,
                m.message as last_message,
                m.created_at as last_message_time
            FROM users u
            JOIN messages m ON (m.sender_id = u.id OR m.receiver_id = u.id)
            WHERE (m.sender_id = $1 OR m.receiver_id = $1)
            ORDER BY m.created_at DESC
        `, [userId]);

        res.json({ chats: result.rows });
    } catch (err) {
        console.error('Error getting chats:', err);
        res.status(500).json({ error: 'Ошибка при получении списка чатов' });
    }
});

// Получение истории сообщений
router.get('/messages/history/:userId/:friendId', async (req, res) => {
    try {
        const { userId, friendId } = req.params;
        const result = await pool.query(`
            SELECT * FROM messages
            WHERE (sender_id = $1 AND receiver_id = $2)
                OR (sender_id = $2 AND receiver_id = $1)
            ORDER BY created_at ASC
        `, [userId, friendId]);

        res.json({ messages: result.rows });
    } catch (err) {
        console.error('Error getting message history:', err);
        res.status(500).json({ error: 'Ошибка при получении истории сообщений' });
    }
});

module.exports = router;