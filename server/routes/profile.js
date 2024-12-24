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

// Обновление профиля пользователя
router.post('/users/update-profile', async (req, res) => {
    try {
        const { userId, username, email } = req.body;

        // Проверка существования email и username
        const emailCheck = await pool.query(
            'SELECT id FROM users WHERE email = $1 AND id != $2',
            [email, userId]
        );
        if (emailCheck.rows.length > 0) {
            return res.status(400).json({ error: 'Этот email уже используется' });
        }

        const usernameCheck = await pool.query(
            'SELECT id FROM users WHERE username = $1 AND id != $2',
            [username, userId]
        );
        if (usernameCheck.rows.length > 0) {
            return res.status(400).json({ error: 'Это имя пользователя уже занято' });
        }

        // Обновление данных
        await pool.query(
            'UPDATE users SET username = $1, email = $2 WHERE id = $3',
            [username, email, userId]
        );

        res.json({ success: true });
    } catch (err) {
        console.error('Update profile error:', err);
        res.status(500).json({ error: 'Ошибка при обновлении профиля' });
    }
});

module.exports = router;