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
router.post('/friend/remove', async (req, res) => {
    try {
        const { userId, friendId } = req.body;
        console.log('Removing friendship:', { userId, friendId });

        const result = await pool.query(`
            DELETE FROM friendships 
            WHERE (user_id = $1 AND friend_id = $2)
            OR (user_id = $2 AND friend_id = $1)
            RETURNING *
        `, [userId, friendId]);

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Дружба не найдена'
            });
        }

        console.log('Friendship removed:', result.rows[0]);
        res.json({ 
            success: true,
            message: 'Друг успешно удален' 
        });
    } catch (err) {
        console.error('Remove friend error:', err);
        res.status(500).json({ 
            success: false,
            error: 'Ошибка при удалении из друзей' 
        });
    }
});

// Получение входящих заявок в друзья
router.get('/friend-requests', async (req, res) => {
    try {
        const { userId } = req.query;
        console.log('Getting friend requests for user:', userId);

        // Добавляем логирование SQL запроса
        const query = `
            SELECT 
                u.id,
                u.username,
                u.avatar_url,
                u.last_activity,
                f.created_at as request_date,
                f.status
            FROM friendships f
            JOIN users u ON f.user_id = u.id
            WHERE f.friend_id = $1 
            AND f.status = 'pending'
            ORDER BY f.created_at DESC
        `;
        console.log('SQL Query:', query);

        const result = await pool.query(query, [userId]);

        // Добавляем логирование результата
        console.log('Found friend requests:', result.rows);
        
        res.json({
            success: true,
            requests: result.rows
        });
    } catch (err) {
        console.error('Get friend requests error:', err);
        res.status(500).json({
            success: false,
            error: 'Ошибка ��ри получении заявок в друзья'
        });
    }
});

// Отправка заявки в друзья
router.post('/friend-request', async (req, res) => {
    try {
        const { userId, friendId } = req.body;
        console.log('Creating friend request:', { userId, friendId });

        // Проверяем, существует ли уже заявка или дружба
        const checkResult = await pool.query(`
            SELECT * FROM friendships 
            WHERE (user_id = $1 AND friend_id = $2)
            OR (user_id = $2 AND friend_id = $1)
        `, [userId, friendId]);

        if (checkResult.rows.length > 0) {
            return res.status(400).json({
                success: false,
                error: 'Заявка или дружба уже существует'
            });
        }

        // Создаем новую заявку
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
            error: 'Ошибка при создании заявки в друзья'
        });
    }
});

// Ответ на заявку в друзья (принятие/отклонение)
router.post('/friend-request/respond', async (req, res) => {
    try {
        const { userId, friendId, accept } = req.body;
        console.log('Request body:', req.body);
        console.log('Responding to friend request:', { userId, friendId, accept });

        if (accept === undefined) {
            return res.status(400).json({
                success: false,
                error: 'Параметр accept обязателен'
            });
        }

        if (accept) {
            // Принимаем заявку в транзакции
            const client = await pool.connect();
            try {
                await client.query('BEGIN');

                const result = await client.query(`
                    UPDATE friendships 
                    SET status = 'accepted', 
                        updated_at = NOW()
                    WHERE user_id = $1 
                    AND friend_id = $2 
                    AND status = 'pending'
                    RETURNING *
                `, [friendId, userId]);

                if (result.rows.length === 0) {
                    throw new Error('Заявка не найдена');
                }

                // Получаем информацию о пользователе для ответа
                const userInfo = await client.query(`
                    SELECT id, username, avatar_url, last_activity
                    FROM users
                    WHERE id = $1
                `, [friendId]);

                await client.query('COMMIT');

                console.log('Friend request accepted:', result.rows[0]);
                res.json({
                    success: true,
                    friendship: result.rows[0],
                    friend: userInfo.rows[0]
                });
            } catch (err) {
                await client.query('ROLLBACK');
                throw err;
            } finally {
                client.release();
            }
        } else {
            // Отклоняем заявку
            await pool.query(`
                DELETE FROM friendships 
                WHERE user_id = $1 
                AND friend_id = $2 
                AND status = 'pending'
            `, [friendId, userId]);

            console.log('Friend request rejected');
            res.json({
                success: true,
                message: 'Заявка отклонена'
            });
        }
    } catch (err) {
        console.error('Respond to friend request error:', err);
        res.status(500).json({
            success: false,
            error: err.message || 'Ошибка при обработке заявки'
        });
    }
});

module.exports = router; 