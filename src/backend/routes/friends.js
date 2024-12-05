const express = require('express');
const router = express.Router();
const { 
    loadFriendships, 
    saveFriendships, 
    loadFriendRequests, 
    saveFriendRequests,
    loadUsers 
} = require('../utils');

let friendships = loadFriendships();
let friendRequests = loadFriendRequests();
let users = loadUsers();

// Получение списка друзей
router.get('/list', (req, res) => {
    const username = req.headers.authorization?.split(' ')[1];

    if (!username) {
        return res.status(401).json({
            success: false,
            message: 'Требуется авторизация'
        });
    }

    try {
        const friendsList = friendships
            .filter(f => f.user1 === username || f.user2 === username)
            .map(f => {
                const friendUsername = f.user1 === username ? f.user2 : f.user1;
                const friend = users.find(u => u.username === friendUsername);
                return {
                    username: friendUsername,
                    avatarUrl: friend?.avatar || null,
                    online: true
                };
            });

        res.json({
            success: true,
            data: friendsList
        });
    } catch (error) {
        console.error('Error getting friends list:', error);
        res.status(500).json({
            success: false,
            message: 'Ошибка при получении списка друзей'
        });
    }
});

// Получение запросов в друзья
router.get('/requests', (req, res) => {
    const username = req.headers.authorization?.split(' ')[1];

    if (!username) {
        return res.status(401).json({
            success: false,
            message: 'Требуется авторизация'
        });
    }

    try {
        const requests = friendRequests
            .filter(req => req.to === username)
            .map(req => {
                const sender = users.find(u => u.username === req.from);
                return {
                    id: req.id,
                    username: req.from,
                    avatarUrl: sender?.avatar || null,
                    createdAt: req.createdAt
                };
            });

        res.json({
            success: true,
            data: requests
        });
    } catch (error) {
        console.error('Error getting friend requests:', error);
        res.status(500).json({
            success: false,
            message: 'Ошибка при получении запросов в друзья'
        });
    }
});

module.exports = router; 