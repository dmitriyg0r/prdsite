const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');

const app = express();
const port = 3000; // Или любой другой порт

// Замените на ваш токен бота и ID чата
const BOT_TOKEN = '8195841109:AAFNo-T4NKWsoIHSc85gVW0oVAMHM4x3Z4A';
const CHAT_ID = '413262381';

app.use(bodyParser.json());
app.use(express.static('.')); // Serve static files from the current directory

app.post('/send-to-telegram', async (req, res) => {
    const { product, subject, description, date } = req.body;
    
    const message = `
Новый заказ:
Товар: ${product}
Тема: ${subject}
Описание: ${description}
Дата выполнения: ${date}
    `;
    
    try {
        await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
            chat_id: CHAT_ID,
            text: message
        });
        res.json({ success: true });
    } catch (error) {
        console.error('Error sending message to Telegram:', error);
        res.status(500).json({ success: false });
    }
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
