const express = require('express');
const router = express.Router();
const { pool } = require('../utils/db');

// Получение информации о пользователе
router.get('/users/:id', async (req, res) => {
    try {
        const { id } = req.params;
        console.log('Getting user info for ID:', id);
        
        const result = await pool.query(`
            SELECT id, username, email, role, avatar_url, created_at, last_login, last_activity
            FROM users 
            WHERE id = $1
        `, [id]);

        if (result.rows.length === 0) {
            console.log('User not found:', id);
            return res.status(404).json({ 
                success: false,
                error: 'Пользователь не найден' 
            });
        }

        console.log('User found:', result.rows[0]);
        res.json({ 
            success: true,
            user: result.rows[0] 
        });
    } catch (err) {
        console.error('Get user error:', err);
        res.status(500).json({ 
            success: false,
            error: 'Ошибка при получении данн��х пользователя' 
        });
    }
});

// Обновление статуса пользователя
router.post('/users/update-status', async (req, res) => {
    try {
        const { userId } = req.body;
        console.log('Updating status for user:', userId);

        const result = await pool.query(
            'UPDATE users SET last_activity = NOW() WHERE id = $1 RETURNING last_activity',
            [userId]
        );

        if (result.rowCount === 0) {
            console.log('User not found for status update:', userId);
            return res.status(404).json({ 
                success: false,
                error: 'Пользователь не найден' 
            });
        }

        console.log('Status updated:', result.rows[0]);
        res.json({ 
            success: true,
            lastActivity: result.rows[0].last_activity 
        });
    } catch (err) {
        console.error('Update status error:', err);
        res.status(500).json({ 
            success: false,
            error: 'Ошибка при обновлении статуса' 
        });
    }
});

// Получение списка друзей
router.get('/friends', async (req, res) => {
    try {
        const { userId } = req.query;
        console.log('Getting friends for user:', userId);

        const result = await pool.query(`
            SELECT 
                u.id, 
                u.username, 
                u.avatar_url,
                u.last_activity,
                f.status,
                f.created_at as friendship_date
            FROM friendships f
            JOIN users u ON (
                CASE 
                    WHEN f.user_id = $1 THEN f.friend_id = u.id
                    WHEN f.friend_id = $1 THEN f.user_id = u.id
                END
            )
            WHERE (f.user_id = $1 OR f.friend_id = $1)
            AND f.status = 'accepted'
            ORDER BY u.username
        `, [userId]);

        console.log('Found friends:', result.rows.length);
        res.json({ 
            success: true,
            friends: result.rows 
        });
    } catch (err) {
        console.error('Get friends error:', err);
        res.status(500).json({ 
            success: false,
            error: 'Ошибка при получении списка друзей' 
        });
    }
});

// Получение запросов в друзья
router.get('/friend-requests', async (req, res) => {
    try {
        const { userId } = req.query;
        console.log('Getting friend requests for user:', userId);

        const result = await pool.query(`
            SELECT 
                u.id, 
                u.username, 
                u.avatar_url,
                f.created_at as request_date
            FROM friendships f
            JOIN users u ON f.user_id = u.id
            WHERE f.friend_id = $1 AND f.status = 'pending'
            ORDER BY f.created_at DESC
        `, [userId]);

        console.log('Found friend requests:', result.rows.length);
        res.json({ 
            success: true,
            requests: result.rows 
        });
    } catch (err) {
        console.error('Get friend requests error:', err);
        res.status(500).json({ 
            success: false,
            error: 'Ошибка при получении запросов в друзья' 
        });
    }
});

// Поиск пользователей
router.get('/search-users', async (req, res) => {
    try {
        const { q, userId } = req.query;
        console.log('Searching users:', { query: q, userId });

        const result = await pool.query(`
            SELECT 
                u.id,
                u.username,
                u.avatar_url,
                u.last_activity,
                CASE
                    WHEN f.status IS NOT NULL THEN f.status
                    ELSE 'none'
                END as friendship_status
            FROM users u
            LEFT JOIN friendships f ON 
                (f.user_id = $1 AND f.friend_id = u.id) OR 
                (f.friend_id = $1 AND f.user_id = u.id)
            WHERE 
                u.id != $1 AND
                u.username ILIKE $2
            ORDER BY 
                u.username ASC
            LIMIT 10
        `, [userId, `%${q}%`]);

        console.log(`Found ${result.rows.length} users`);
        res.json({
            success: true,
            users: result.rows
        });
    } catch (err) {
        console.error('Search users error:', err);
        res.status(500).json({
            success: false,
            error: 'Ошибка при поиске пользователей'
        });
    }
});

module.exports = router;