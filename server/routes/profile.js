const express = require('express');
const router = express.Router();
const { pool } = require('../utils/db');
const bcrypt = require('bcrypt');

// Получение информации о пользователе
router.get('/users/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query(`
            SELECT id, username, email, role, avatar_url, created_at, last_login
            FROM users 
            WHERE id = $1
        `, [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Пользователь не найден' });
        }

        res.json({ user: result.rows[0] });
    } catch (err) {
        console.error('Get user error:', err);
        res.status(500).json({ error: 'Ошибка при получении данных пользователя' });
    }
});

// Обновление статуса пользователя
router.post('/users/update-status', async (req, res) => {
    try {
        const { userId, status } = req.body;
        await pool.query(
            'UPDATE users SET last_activity = NOW() WHERE id = $1',
            [userId]
        );
        res.json({ success: true });
    } catch (err) {
        console.error('Update status error:', err);
        res.status(500).json({ error: 'Ошибка при обновлении статуса' });
    }
});

// Получение списка друзей
router.get('/friends', async (req, res) => {
    try {
        const { userId } = req.query;
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

        res.json({ friends: result.rows });
    } catch (err) {
        console.error('Get friends error:', err);
        res.status(500).json({ error: 'Ошибка при получении списка друзей' });
    }
});

// Получение запросов в друзья
router.get('/friend-requests', async (req, res) => {
    try {
        const { userId } = req.query;
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

        res.json({ requests: result.rows });
    } catch (err) {
        console.error('Get friend requests error:', err);
        res.status(500).json({ error: 'Ошибка при получении запросов в друзья' });
    }
});

module.exports = router;