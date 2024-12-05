const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { loadUsers, saveUsers, upload } = require('../utilsserv');

let users = loadUsers();

// Получение списка пользователей
router.get('/', (req, res) => {
    const safeUsers = users.map(user => ({
        username: user.username,
        role: user.role,
        createdAt: user.createdAt,
        avatarUrl: user.avatar
    }));

    res.json({
        success: true,
        data: safeUsers
    });
});

// Получение аватара пользователя
router.get('/:username/avatar', (req, res) => {
    const { username } = req.params;
    const user = users.find(u => u.username === username);
    
    if (!user) {
        return res.status(404).json({
            success: false,
            message: 'Пользователь не найден'
        });
    }

    res.json({
        success: true,
        data: {
            avatarUrl: user.avatar || null
        }
    });
});

// Удаление пользователя
router.delete('/:username', (req, res) => {
    const { username } = req.params;
    const userIndex = users.findIndex(u => u.username === username);

    if (userIndex === -1) {
        return res.status(404).json({
            success: false,
            message: 'Пользователь не найден'
        });
    }

    if (users[userIndex].role === 'Admin' && 
        users.filter(u => u.role === 'Admin').length === 1) {
        return res.status(400).json({
            success: false,
            message: 'Невозможно удалить последнего администратора'
        });
    }

    users.splice(userIndex, 1);
    saveUsers(users);

    res.json({
        success: true,
        message: 'Пользователь успешно удален'
    });
});

// Загрузка аватара
router.post('/upload-avatar', upload.single('avatar'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({
            success: false,
            message: 'Файл не был загружен'
        });
    }

    const username = req.body.username;
    const user = users.find(u => u.username === username);

    if (!user) {
        fs.unlinkSync(req.file.path);
        return res.status(404).json({
            success: false,
            message: 'Пользователь не найден'
        });
    }

    if (user.avatar) {
        const oldAvatarPath = path.join(__dirname, user.avatar);
        try {
            if (fs.existsSync(oldAvatarPath)) {
                fs.unlinkSync(oldAvatarPath);
            }
        } catch (error) {
            console.error('Error deleting old avatar:', error);
        }
    }

    user.avatar = `/uploads/avatars/${req.file.filename}`;
    saveUsers(users);

    res.json({
        success: true,
        message: 'Аватар успешно загружен',
        data: { avatarUrl: user.avatar }
    });
});

module.exports = router; 