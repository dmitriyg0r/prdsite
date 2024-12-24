const express = require('express');
const router = express.Router();
const { pool } = require('../utils/db');

// Получение списка чатов для пользователя
router.get('/:userId', async (req, res) => {
    try {
        const userId = req.params.userId;
        console.log('Getting chats for user:', userId);

        // Упрощенный запрос для отладки
        const query = `
            SELECT DISTINCT 
                m.*,
                u1.username as sender_username,
                u2.username as receiver_username
            FROM messages m
            JOIN users u1 ON m.sender_id = u1.id
            JOIN users u2 ON m.receiver_id = u2.id
            WHERE m.sender_id = $1 OR m.receiver_id = $1
            ORDER BY m.created_at DESC;
        `;
        
        console.log('Executing query:', query);
        const result = await pool.query(query, [userId]);
        console.log('Query result:', result.rows.length, 'rows found');
        
        // Всегда возвращаем объект с полем chats
        res.json({
            success: true,
            chats: result.rows,
            count: result.rows.length
        });

    } catch (err) {
        console.error('Detailed error in /chats/:userId:', err);
        // Возвращаем структурированную ошибку
        res.status(500).json({ 
            success: false,
            error: 'Internal server error',
            details: err.message,
            chats: [] // Пустой массив чатов в случае ошибки
        });
    }
});

module.exports = router; 