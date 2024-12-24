const express = require('express');
const router = express.Router();
const { pool } = require('../utils/db');

// Получение постов пользователя
router.get('/posts/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        console.log('Getting posts for user:', userId);

        const result = await pool.query(`
            WITH post_stats AS (
                SELECT 
                    parent_id,
                    COUNT(CASE WHEN type = 'like' THEN 1 END) as likes_count,
                    COUNT(CASE WHEN type = 'comment' THEN 1 END) as comments_count
                FROM posts
                WHERE type IN ('like', 'comment')
                GROUP BY parent_id
            )
            SELECT 
                p.*,
                u.username as author_name,
                u.avatar_url as author_avatar,
                COALESCE(ps.likes_count, 0) as likes_count,
                COALESCE(ps.comments_count, 0) as comments_count,
                EXISTS(
                    SELECT 1 FROM posts likes 
                    WHERE likes.type = 'like' 
                    AND likes.parent_id = p.id 
                    AND likes.user_id = $1
                ) as is_liked
            FROM posts p
            JOIN users u ON p.user_id = u.id
            LEFT JOIN post_stats ps ON ps.parent_id = p.id
            WHERE p.type = 'post' AND p.user_id = $2
            ORDER BY p.created_at DESC
        `, [userId, userId]);

        console.log(`Found ${result.rows.length} posts`);
        res.json({ 
            success: true,
            posts: result.rows 
        });
    } catch (err) {
        console.error('Get posts error:', err);
        res.status(500).json({ 
            success: false,
            error: 'Ошибка при получении постов' 
        });
    }
});

// Создание комментария
router.post('/posts/comment', async (req, res) => {
    try {
        const { userId, postId, content } = req.body;
        console.log('Creating comment:', { userId, postId, content });

        const result = await pool.query(`
            WITH new_comment AS (
                INSERT INTO posts (user_id, parent_id, type, content)
                VALUES ($1, $2, 'comment', $3)
                RETURNING id, content, created_at
            )
            SELECT 
                nc.*,
                u.username as author_name,
                u.avatar_url as author_avatar
            FROM new_comment nc
            JOIN users u ON u.id = $1
        `, [userId, postId, content]);

        console.log('Comment created:', result.rows[0]);
        res.json({ 
            success: true,
            comment: result.rows[0] 
        });
    } catch (err) {
        console.error('Create comment error:', err);
        res.status(500).json({ 
            success: false,
            error: 'Ошибка при создании комментария' 
        });
    }
});

// Получение комментариев к посту
router.get('/posts/:postId/comments', async (req, res) => {
    try {
        const { postId } = req.params;
        console.log('Getting comments for post:', postId);

        const result = await pool.query(`
            SELECT 
                p.*,
                u.username as author_name,
                u.avatar_url as author_avatar
            FROM posts p
            JOIN users u ON p.user_id = u.id
            WHERE p.parent_id = $1 AND p.type = 'comment'
            ORDER BY p.created_at DESC
        `, [postId]);

        console.log(`Found ${result.rows.length} comments`);
        res.json({ 
            success: true,
            comments: result.rows 
        });
    } catch (err) {
        console.error('Get comments error:', err);
        res.status(500).json({ 
            success: false,
            error: 'Ошибка при получении комментариев' 
        });
    }
});

// Добавление/удаление лайка
router.post('/posts/:postId/like', async (req, res) => {
    try {
        const { postId } = req.params;
        const { userId } = req.body;
        console.log('Toggle like:', { userId, postId });

        // Проверяем существование лайка
        const checkResult = await pool.query(`
            SELECT id FROM posts 
            WHERE type = 'like' AND parent_id = $1 AND user_id = $2
        `, [postId, userId]);

        let result;
        if (checkResult.rows.length > 0) {
            // Удаляем лайк
            result = await pool.query(`
                DELETE FROM posts 
                WHERE type = 'like' AND parent_id = $1 AND user_id = $2
                RETURNING id
            `, [postId, userId]);
            console.log('Like removed');
        } else {
            // Добавляем лайк
            result = await pool.query(`
                INSERT INTO posts (user_id, parent_id, type)
                VALUES ($1, $2, 'like')
                RETURNING id
            `, [userId, postId]);
            console.log('Like added');
        }

        // Получаем обновленное количество лайков
        const likesCount = await pool.query(`
            SELECT COUNT(*) as count 
            FROM posts 
            WHERE type = 'like' AND parent_id = $1
        `, [postId]);

        res.json({ 
            success: true,
            liked: checkResult.rows.length === 0,
            likesCount: parseInt(likesCount.rows[0].count)
        });
    } catch (err) {
        console.error('Toggle like error:', err);
        res.status(500).json({ 
            success: false,
            error: 'Ошибка при обработке лайка' 
        });
    }
});

module.exports = router; 