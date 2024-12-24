const express = require('express');
const router = express.Router();
const { pool } = require('../utils/db');

// Получение постов пользователя
router.get('/posts/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const result = await pool.query(`
            SELECT 
                p.*,
                u.username as author_name,
                u.avatar_url as author_avatar,
                COUNT(DISTINCT l.id) as likes_count,
                COUNT(DISTINCT c.id) as comments_count
            FROM posts p
            JOIN users u ON p.user_id = u.id
            LEFT JOIN likes l ON p.id = l.post_id
            LEFT JOIN comments c ON p.id = c.post_id
            WHERE p.user_id = $1
            GROUP BY p.id, u.username, u.avatar_url
            ORDER BY p.created_at DESC
        `, [userId]);

        res.json({ posts: result.rows });
    } catch (err) {
        console.error('Get posts error:', err);
        res.status(500).json({ error: 'Ошибка при получении постов' });
    }
});

// Создание комментария
router.post('/posts/comment', async (req, res) => {
    try {
        const { userId, postId, content } = req.body;
        const result = await pool.query(`
            WITH new_comment AS (
                INSERT INTO comments (user_id, post_id, content)
                VALUES ($1, $2, $3)
                RETURNING id, content, created_at
            )
            SELECT 
                nc.*,
                u.username as author_name,
                u.avatar_url as author_avatar
            FROM new_comment nc
            JOIN users u ON u.id = $1
        `, [userId, postId, content]);

        res.json({ comment: result.rows[0] });
    } catch (err) {
        console.error('Create comment error:', err);
        res.status(500).json({ error: 'Ошибка при создании комментария' });
    }
});

// Получение комментариев к посту
router.get('/posts/:postId/comments', async (req, res) => {
    try {
        const { postId } = req.params;
        const result = await pool.query(`
            SELECT 
                c.*,
                u.username as author_name,
                u.avatar_url as author_avatar
            FROM comments c
            JOIN users u ON c.user_id = u.id
            WHERE c.post_id = $1
            ORDER BY c.created_at DESC
        `, [postId]);

        res.json({ comments: result.rows });
    } catch (err) {
        console.error('Get comments error:', err);
        res.status(500).json({ error: 'Ошибка при получении комментариев' });
    }
});

module.exports = router; 