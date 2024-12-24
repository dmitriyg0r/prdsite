const express = require('express');
const router = express.Router();
const { pool } = require('../utils/db');

// Получение ленты постов
router.get('/feed', async (req, res) => {
    try {
        const { userId } = req.query;
        console.log('Getting feed for user:', userId);

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

        console.log(`Found ${result.rows.length} feed posts`);
        res.json({ 
            success: true,
            posts: result.rows 
        });
    } catch (err) {
        console.error('Get feed error:', err);
        res.status(500).json({ 
            success: false,
            error: 'Ошибка при загрузке ленты' 
        });
    }
});

// Получение последних постов для гостей
router.get('/public-feed', async (req, res) => {
    try {
        console.log('Getting public feed');

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
                COALESCE(ps.comments_count, 0) as comments_count
            FROM posts p
            JOIN users u ON p.user_id = u.id
            LEFT JOIN post_stats ps ON ps.parent_id = p.id
            WHERE p.type = 'post'
            ORDER BY p.created_at DESC
            LIMIT 10
        `);

        console.log(`Found ${result.rows.length} public posts`);
        res.json({ 
            success: true,
            posts: result.rows 
        });
    } catch (err) {
        console.error('Get public feed error:', err);
        res.status(500).json({ 
            success: false,
            error: 'Ошибка при загрузке публичной ленты' 
        });
    }
});

module.exports = router;