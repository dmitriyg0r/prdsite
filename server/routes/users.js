const express = require('express');
const router = express.Router();
const pool = require('../db');

// Получение списка пользователей
router.get('/users-list', async (req, res) => {
    console.log('GET /users-list endpoint hit');
    console.log('Query params:', req.query);
    
    try {
        const userId = req.query.userId;
        
        if (!userId) {
            console.error('userId is missing in request');
            return res.status(400).json({
                success: false,
                error: 'userId is required'
            });
        }

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

        console.log('Executing query with userId:', userId);
        const result = await pool.query(query, [userId]);
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