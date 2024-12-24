const express = require('express');
const router = express.Router();
const { pool } = require('../utils/db');

// Получение списка пользователей
router.get('/users-list', async (req, res) => {
    try {
        const { userId } = req.query;
        console.log('Getting users list for:', userId);

        // Добавляем подробное логирование
        const query = `
            SELECT 
                u.id,
                u.username,
                u.avatar_url,
                u.last_activity,
                u.role,
                COALESCE(
                    (SELECT status 
                     FROM friendships 
                     WHERE (user_id = $1 AND friend_id = u.id) 
                     OR (user_id = u.id AND friend_id = $1)
                     LIMIT 1
                    ),
                    'none'
                ) as friendship_status
            FROM users u
            WHERE u.id != $1
            ORDER BY 
                CASE 
                    WHEN u.last_activity > NOW() - INTERVAL '5 minutes' THEN 1
                    WHEN u.last_activity > NOW() - INTERVAL '15 minutes' THEN 2
                    ELSE 3
                END,
                u.username ASC
        `;

        console.log('Executing query:', query);
        console.log('With userId:', userId);

        const result = await pool.query(query, [userId]);

        console.log('Query result:', result.rows);
        res.json({
            success: true,
            users: result.rows
        });
    } catch (err) {
        console.error('Get users list error:', err);
        res.status(500).json({
            success: false,
            error: 'Ошибка при получении списка пользователей'
        });
    }
});

module.exports = router; 