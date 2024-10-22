const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const cors = require('cors');

const app = express();
const port = 3000; // Убедитесь, что это совпадает с портом в клиентском коде

app.use(cors());  // Добавьте эту строку для обработки CORS
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
    console.log(`Сервер запущен на http://localhost:${port}`);
});
