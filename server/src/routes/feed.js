const express = require('express');
const router = express.Router();
const { pool } = require('../utils/db');

// Получение ленты постов
router.get('/feed', async (req, res) => {
    try {
        const userId = req.query.userId;
        const result = await pool.query(`
            SELECT 
                p.*,
                u.username as author_name,
                u.avatar_url as author_avatar
            FROM posts p
            JOIN users u ON p.user_id = u.id
            WHERE p.type = 'post' AND (
                p.user_id IN (
                    SELECT CASE 
                        WHEN user_id = $1 THEN friend_id
                        WHEN friend_id = $1 THEN user_id
                    END
                    FROM friendships
                    WHERE (user_id = $1 OR friend_id = $1)
                    AND status = 'accepted'
                )
                OR p.user_id = $1
            )
            ORDER BY p.created_at DESC
            LIMIT 50
        `, [userId]);

        res.json({ posts: result.rows });
    } catch (err) {
        console.error('Error loading feed:', err);
        res.status(500).json({ error: 'Ошибка при загрузке ленты' });
    }
});

module.exports = router;