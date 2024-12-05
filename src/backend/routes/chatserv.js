const express = require('express');
const router = express.Router();
const { loadMessages, saveMessages } = require('../utilsserv');

let messages = loadMessages();

// Получение истории чата
router.get('/history/:username', (req, res) => {
    const { username } = req.params;
    const currentUser = req.headers.authorization.split(' ')[1];

    try {
        const chatHistory = messages.filter(msg => 
            (msg.from === currentUser && msg.to === username) ||
            (msg.from === username && msg.to === currentUser)
        ).sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

        res.json({
            success: true,
            data: chatHistory
        });
    } catch (error) {
        console.error('Error in chat history:', error);
        res.status(500).json({
            success: false,
            message: 'Ошибка при получении истории чата',
            error: error.message
        });
    }
});

// Отправка сообщения
router.post('/send', (req, res) => {
    const { to, message } = req.body;
    const from = req.headers.authorization.split(' ')[1];

    try {
        const newMessage = {
            from,
            to,
            message,
            timestamp: new Date(),
            id: Date.now().toString(),
            isRead: false
        };

        messages.push(newMessage);
        saveMessages(messages);

        res.json({
            success: true,
            data: newMessage
        });
    } catch (error) {
        console.error('Error sending message:', error);
        res.status(500).json({
            success: false,
            message: 'Ошибка при отправке сообщения'
        });
    }
});

module.exports = router; 