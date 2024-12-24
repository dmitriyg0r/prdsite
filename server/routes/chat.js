const express = require('express');
const router = express.Router();
const pool = require('../utils/db');

// Получение списка чатов
router.get('/chats/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        console.log('Getting chats for userId:', userId);

        if (!userId) {
            console.error('userId is missing in request');
            return res.status(400).json({
                success: false,
                error: 'userId is required'
            });
        }

        const query = `
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
                    END as user_id,
                    message,
                    created_at,
                    sender_id
                FROM messages
                WHERE sender_id = $1 OR receiver_id = $1
                ORDER BY user_id, created_at DESC
            )
            SELECT 
                u.id,
                u.username,
                u.avatar_url,
                u.last_activity,
                lm.message as last_message,
                lm.created_at as last_message_time,
                lm.sender_id as last_message_sender_id
            FROM users u
            JOIN LastMessages lm ON lm.user_id = u.id
            ORDER BY lm.created_at DESC
        `;

        console.log('Executing query with userId:', userId);
        const result = await pool.query(query, [userId]);
        console.log(`Found ${result.rows.length} chats`);

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

// Получение голосовых сообщений
router.get('/:chatId/voice', async (req, res) => {
    try {
        const chatId = req.params.chatId;
        const query = `
            SELECT * FROM voice_messages 
            WHERE message_id IN (
                SELECT id FROM messages WHERE sender_id = $1 OR receiver_id = $1
            )
            ORDER BY created_at DESC
        `;
        
        const result = await pool.query(query, [chatId]);
        res.json(result.rows);
    } catch (err) {
        console.error('Error getting voice messages:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;