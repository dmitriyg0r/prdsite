const express = require('express');
const router = express.Router();
const pool = require('../utils/db');

// Получение списка чатов для пользователя
router.get('/:userId', async (req, res) => {
    try {
        const userId = req.params.userId;
        
        // Получаем последние сообщения для каждого чата
        const query = `
            WITH LastMessages AS (
                SELECT DISTINCT ON (
                    CASE 
                        WHEN sender_id < receiver_id 
                        THEN sender_id || '_' || receiver_id 
                        ELSE receiver_id || '_' || sender_id 
                    END
                )
                    m.*,
                    CASE 
                        WHEN sender_id < receiver_id 
                        THEN sender_id || '_' || receiver_id 
                        ELSE receiver_id || '_' || sender_id 
                    END as chat_id
                FROM messages m
                WHERE sender_id = $1 OR receiver_id = $1
                ORDER BY chat_id, created_at DESC
            )
            SELECT 
                lm.*,
                s.username as sender_username,
                s.avatar as sender_avatar,
                r.username as receiver_username,
                r.avatar as receiver_avatar
            FROM LastMessages lm
            JOIN users s ON lm.sender_id = s.id
            JOIN users r ON lm.receiver_id = r.id
            ORDER BY lm.created_at DESC;
        `;
        
        const result = await pool.query(query, [userId]);
        res.json(result.rows);
    } catch (err) {
        console.error('Error getting chats:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router; 