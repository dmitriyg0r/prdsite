const express = require('express');
const router = express.Router();
const { pool } = require('../utils/db');

// Получение списка пользователей
router.get('/users-list', async (req, res) => {
    try {
        const { userId } = req.query;
        
        if (!userId) {
            return res.status(400).json({
                success: false,
                error: 'userId is required'
            });
        }

        console.log('Getting users list for:', userId);

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
            ORDER BY u.username ASC
        `;

        const result = await pool.query(query, [userId]);
        console.log(`Found ${result.rows.length} users for userId: ${userId}`);

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