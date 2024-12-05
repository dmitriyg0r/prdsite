const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { loadPosts, savePosts, loadUsers } = require('../utils');

let posts = loadPosts();
let users = loadUsers();

// Получение постов пользователя
router.get('/:username', (req, res) => {
    const { username } = req.params;
    try {
        const userPosts = posts
            .filter(post => post.author === username)
            .map(post => {
                const author = users.find(u => u.username === post.author);
                return {
                    ...post,
                    authorAvatar: author?.avatar || null
                };
            });

        res.json({
            success: true,
            data: userPosts
        });
    } catch (error) {
        console.error('Error getting posts:', error);
        res.status(500).json({
            success: false,
            message: 'Ошибка при получении постов'
        });
    }
});

// Создание поста
router.post('/', (req, res) => {
    const { content } = req.body;
    const author = req.headers.authorization.split(' ')[1];

    try {
        const newPost = {
            id: Date.now().toString(),
            author,
            content,
            createdAt: new Date(),
            likes: 0,
            likedBy: []
        };

        posts.unshift(newPost);
        savePosts();

        res.json({
            success: true,
            data: newPost
        });
    } catch (error) {
        console.error('Error creating post:', error);
        res.status(500).json({
            success: false,
            message: 'Ошибка при создании поста'
        });
    }
});

module.exports = router; 