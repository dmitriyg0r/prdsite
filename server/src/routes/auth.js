const express = require('express');
const router = express.Router();
const { pool } = require('../utils/db');
const bcrypt = require('bcrypt');

// Логин
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const result = await pool.query(
            'SELECT * FROM users WHERE username = $1',
            [username]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'Неверное имя пользователя или пароль' });
        }

        const user = result.rows[0];
        const isValidPassword = await bcrypt.compare(password, user.password_hash);
        if (!isValidPassword) {
            return res.status(401).json({ error: 'Неверное имя пользователя или пароль' });
        }

        res.json({ user });
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ error: 'Ошибка при входе' });
    }
});

// Регистрация
router.post('/register', async (req, res) => {
    try {
        const { username, email, password } = req.body;
        const hashedPassword = await bcrypt.hash(password, 10);
        const result = await pool.query(
            'INSERT INTO users (username, email, password_hash) VALUES ($1, $2, $3) RETURNING *',
            [username, email, hashedPassword]
        );

        res.json({ user: result.rows[0] });
    } catch (err) {
        console.error('Registration error:', err);
        res.status(500).json({ error: 'Ошибка при регистрации' });
    }
});

module.exports = router;