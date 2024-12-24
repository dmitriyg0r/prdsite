const express = require('express');
const router = express.Router();
const { pool } = require('../utils/db');
const checkAdmin = require('../middleware/checkAdmin');

// Получение статистики
router.get('/admin/stats', checkAdmin, async (req, res) => {
    try {
        const stats = await pool.query(`
            SELECT 
                (SELECT COUNT(*) FROM users) as total_users,
                (SELECT COUNT(*) FROM users WHERE created_at > NOW() - INTERVAL '24 HOURS') as new_users_24h,
                (SELECT COUNT(*) FROM users WHERE created_at > NOW() - INTERVAL '7 DAYS') as new_users_7d,
                (SELECT COUNT(*) FROM users WHERE role = 'admin') as admin_count,
                (SELECT COUNT(*) FROM users WHERE role = 'moderator') as moderator_count,
                (SELECT COUNT(*) FROM messages) as total_messages,
                (SELECT COUNT(*) FROM messages WHERE created_at > NOW() - INTERVAL '24 HOURS') as new_messages_24h,
                (SELECT COUNT(*) FROM messages WHERE created_at > NOW() - INTERVAL '7 DAYS') as new_messages_7d,
                (SELECT COUNT(*) FROM friendships WHERE status = 'accepted') as total_friendships,
                (SELECT COUNT(*) FROM users WHERE is_online = true) as online_users,
                (SELECT COUNT(*) FROM users WHERE last_activity > NOW() - INTERVAL '24 HOURS') as active_users_24h
        `);

        res.json({ success: true, stats: stats.rows[0] });
    } catch (err) {
        console.error('Admin stats error:', err);
        res.status(500).json({ error: 'Ошибка при получении статистики' });
    }
});

// Получение списка пользователей
router.get('/admin/users', checkAdmin, async (req, res) => {
    try {
        const { page = 1, limit = 10, search = '' } = req.query;
        const offset = (page - 1) * limit;

        const users = await pool.query(`
            SELECT 
                u.*, 
                (SELECT COUNT(*) FROM messages WHERE sender_id = u.id) as messages_sent,
                (SELECT COUNT(*) FROM friendships WHERE (user_id = u.id OR friend_id = u.id) AND status = 'accepted') as friends_count
            FROM users u
            WHERE u.username ILIKE $1
            ORDER BY u.created_at DESC
            LIMIT $2 OFFSET $3
        `, [`%${search}%`, limit, offset]);

        const total = await pool.query(
            'SELECT COUNT(*) FROM users WHERE username ILIKE $1',
            [`%${search}%`]
        );

        res.json({
            success: true,
            users: users.rows,
            total: parseInt(total.rows[0].count),
            pages: Math.ceil(total.rows[0].count / limit)
        });
    } catch (err) {
        console.error('Admin users error:', err);
        res.status(500).json({ error: 'Ошибка при получении списка пользователей' });
    }
});

// Удаление пользователя
router.delete('/admin/users/:id', checkAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        await pool.query('DELETE FROM users WHERE id = $1', [id]);
        res.json({ success: true });
    } catch (err) {
        console.error('Admin delete user error:', err);
        res.status(500).json({ error: 'Ошибка при удалении пользователя' });
    }
});

// Изменение роли пользователя
router.post('/admin/role', checkAdmin, async (req, res) => {
    try {
        const { userId, role } = req.body;

        // Проверяем допустимые роли
        const validRoles = ['user', 'moderator', 'admin'];
        if (!validRoles.includes(role)) {
            return res.status(400).json({
                success: false,
                error: 'Недопустимая роль'
            });
        }

        // Обновляем роль в базе данных
        await pool.query(
            'UPDATE users SET role = $1 WHERE id = $2',
            [role, userId]
        );

        res.json({ success: true });
    } catch (err) {
        console.error('Change role error:', err);
        res.status(500).json({
            success: false,
            error: 'Ошибка при изменении роли'
        });
    }
});

// Получение данных для графиков
router.get('/admin/charts', checkAdmin, async (req, res) => {
    try {
        const registrationData = await pool.query(`
            SELECT 
                DATE(created_at) as date,
                COUNT(*) as count
            FROM users
            WHERE created_at > NOW() - INTERVAL '7 days'
            GROUP BY DATE(created_at)
            ORDER BY date
        `);

        const messageData = await pool.query(`
            SELECT 
                DATE(created_at) as date,
                COUNT(*) as count
            FROM messages
            WHERE created_at > NOW() - INTERVAL '7 days'
            GROUP BY DATE(created_at)
            ORDER BY date
        `);

        const userActivityData = await pool.query(`
            SELECT 
                role,
                COUNT(*) as count
            FROM users
            GROUP BY role
        `);

        res.json({
            success: true,
            data: {
                registrations: registrationData.rows,
                messages: messageData.rows,
                userActivity: userActivityData.rows
            }
        });
    } catch (err) {
        console.error('Charts data error:', err);
        res.status(500).json({ error: 'Ошибка при получении данных для графиков' });
    }
});

module.exports = router;