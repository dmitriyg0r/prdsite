const express = require('express');
const router = express.Router();
const { loadUsers, saveUsers } = require('../utils');

let users = loadUsers();

// Регистрация
router.post('/register', (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({
            success: false,
            message: 'Требуются имя пользователя и пароль'
        });
    }

    if (users.find(u => u.username === username)) {
        return res.status(400).json({
            success: false,
            message: 'Пользователь уже существует'
        });
    }

    const newUser = {
        username,
        password,
        role: 'User',
        createdAt: new Date()
    };

    users.push(newUser);
    saveUsers(users);

    res.json({
        success: true,
        message: 'Регистрация успешна',
        data: { username: newUser.username, role: newUser.role }
    });
});

// Вход
router.post('/login', (req, res) => {
    const { username, password } = req.body;
    const user = users.find(u => u.username === username && u.password === password);

    if (!user) {
        return res.status(401).json({
            success: false,
            message: 'Неверное имя пользователя или пароль'
        });
    }

    res.json({
        success: true,
        message: 'Вход выполнен успешно',
        data: { username: user.username, role: user.role }
    });
});

// Анонимный вход
router.post('/anonymous-login', (req, res) => {
    const anonymousUser = {
        username: `anonymous_${Date.now()}`,
        role: 'Anonymous'
    };

    res.json({
        success: true,
        message: 'Анонимный вход выполнен успешно',
        data: anonymousUser
    });
});

module.exports = router; 