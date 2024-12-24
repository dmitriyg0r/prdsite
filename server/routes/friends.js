const express = require('express');
const router = express.Router();
const { pool } = require('../utils/db');

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

        console.log(`Found ${result.rows.length} friends`);
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

// Отправка запроса в друзья
router.post('/friends/request', async (req, res) => {
    try {
        const { userId, friendId } = req.body;
        console.log('Creating friend request:', { userId, friendId });

        // Проверяем, существует ли уже запрос
        const checkResult = await pool.query(`
            SELECT * FROM friendships 
            WHERE (user_id = $1 AND friend_id = $2)
            OR (user_id = $2 AND friend_id = $1)
        `, [userId, friendId]);

        if (checkResult.rows.length > 0) {
            return res.status(400).json({
                success: false,
                error: 'Запрос уже существует'
            });
        }

        // Создаем новый запрос
        const result = await pool.query(`
            INSERT INTO friendships (user_id, friend_id, status)
            VALUES ($1, $2, 'pending')
            RETURNING *
        `, [userId, friendId]);

        console.log('Friend request created:', result.rows[0]);
        res.json({ 
            success: true,
            request: result.rows[0] 
        });
    } catch (err) {
        console.error('Create friend request error:', err);
        res.status(500).json({ 
            success: false,
            error: 'Ошибка при создании запроса в друзья' 
        });
    }
});

// Принятие/отклонение запроса в друзья
router.post('/friends/respond', async (req, res) => {
    try {
        const { userId, friendId, accept } = req.body;
        console.log('Responding to friend request:', { userId, friendId, accept });

        if (accept) {
            // Принимаем запрос
            const result = await pool.query(`
                UPDATE friendships 
                SET status = 'accepted'
                WHERE friend_id = $1 AND user_id = $2
                RETURNING *
            `, [userId, friendId]);

            console.log('Friend request accepted');
            res.json({ 
                success: true,
                friendship: result.rows[0] 
            });
        } else {
            // Отклоняем запрос
            await pool.query(`
                DELETE FROM friendships 
                WHERE friend_id = $1 AND user_id = $2
            `, [userId, friendId]);

            console.log('Friend request rejected');
            res.json({ 
                success: true,
                message: 'Запрос отклонен' 
            });
        }
    } catch (err) {
        console.error('Respond to friend request error:', err);
        res.status(500).json({ 
            success: false,
            error: 'Ошибка при обработке запроса в друзья' 
        });
    }
});

// Удаление из друзей
router.delete('/friends/:friendId', async (req, res) => {
    try {
        const { friendId } = req.params;
        const { userId } = req.query;
        console.log('Removing friend:', { userId, friendId });

        await pool.query(`
            DELETE FROM friendships 
            WHERE (user_id = $1 AND friend_id = $2)
            OR (user_id = $2 AND friend_id = $1)
        `, [userId, friendId]);

        console.log('Friend removed');
        res.json({ 
            success: true,
            message: 'Друг удален' 
        });
    } catch (err) {
        console.error('Remove friend error:', err);
        res.status(500).json({ 
            success: false,
            error: 'Ошибка при удалении из друзей' 
        });
    }
});

module.exports = router; 