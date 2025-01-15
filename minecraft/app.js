const express = require('express');
const cors = require('cors');
const YooKassa = require('yookassa');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(cors({
    origin: 'https://space-point.ru'
}));

// Инициализация ЮKassa
const yooKassa = new YooKassa({
    shopId: process.env.YOOKASSA_SHOP_ID,
    secretKey: process.env.YOOKASSA_SECRET_KEY
});

app.post('/api/create-payment', async (req, res) => {
    try {
        const { minecraftLogin, amount } = req.body;

        const payment = await yooKassa.createPayment({
            amount: {
                value: amount.toFixed(2),
                currency: 'RUB'
            },
            capture: true,
            confirmation: {
                type: 'redirect',
                return_url: 'https://space-point.ru/minecraft/success.html'
            },
            description: `Доступ к серверу Minecraft для ${minecraftLogin}`,
            metadata: {
                minecraft_login: minecraftLogin
            }
        });

        res.json({
            confirmationUrl: payment.confirmation.confirmation_url
        });
    } catch (error) {
        console.error('Payment creation error:', error);
        res.status(500).json({
            error: 'Ошибка при создании платежа'
        });
    }
});

// Обработчик уведомлений от ЮKassa
app.post('/api/webhook', express.raw({type: 'application/json'}), async (req, res) => {
    const signature = req.headers['yookassa-signature'];
    // Проверка подписи и обработка уведомления
    // ...
});

const PORT = process.env.PORT || 3004;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});