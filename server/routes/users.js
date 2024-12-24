const express = require('express');
const router = express.Router();
const { pool } = require('../utils/db');

// Получение списка пользователей
router.get('/users-list', async (req, res) => {
    try {
        const { userId } = req.query;
        console.log('Getting users list for:', userId);

        const result = await pool.query(`
            SELECT 
                u.id,
                u.username,
                u.avatar_url,
                u.last_activity,
                u.role,
                CASE
                    WHEN f.status IS NOT NULL THEN f.status
                    ELSE 'none'
                END as friendship_status
            FROM users u
            LEFT JOIN friendships f ON 
                (f.user_id = $1 AND f.friend_id = u.id) OR 
                (f.friend_id = $1 AND f.user_id = u.id)
            WHERE u.id != $1
            ORDER BY 
                u.username ASC
        `, [userId]);

        console.log(`Found ${result.rows.length} users`);
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