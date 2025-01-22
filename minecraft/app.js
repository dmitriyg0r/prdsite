const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(cors({
    origin: 'https://space-point.ru'
}));

app.post('/api/create-payment', async (req, res) => {
    try {
        const { minecraftLogin, amount } = req.body;
        
        // Создаем уникальный ID заказа
        const orderId = Date.now();
        
        // Формируем строку для подписи
        const signature = crypto
            .createHash('md5')
            .update(`${process.env.ROBOKASSA_LOGIN}:${amount}:${orderId}:${process.env.ROBOKASSA_PASSWORD1}`)
            .digest('hex');
        
        // Формируем URL для перехода на страницу оплаты
        const paymentUrl = `https://auth.robokassa.ru/Merchant/Index.aspx?MerchantLogin=${process.env.ROBOKASSA_LOGIN}&OutSum=${amount}&InvId=${orderId}&Description=Доступ к серверу Minecraft для ${minecraftLogin}&SignatureValue=${signature}&IsTest=1`;

        res.json({
            confirmationUrl: paymentUrl
        });
    } catch (error) {
        console.error('Payment creation error:', error);
        res.status(500).json({
            error: 'Ошибка при создании платежа'
        });
    }
});

// Обработчик уведомлений от Robokassa
app.post('/api/result', express.urlencoded({ extended: true }), async (req, res) => {
    const { OutSum, InvId, SignatureValue } = req.body;
    
    // Формируем подпись для проверки
    const signature = crypto
        .createHash('md5')
        .update(`${OutSum}:${InvId}:${process.env.ROBOKASSA_PASSWORD2}`)
        .digest('hex')
        .toUpperCase();
    
    if (SignatureValue.toUpperCase() === signature) {
        // Подпись верна, обрабатываем платеж
        console.log(`Успешный платеж: Заказ #${InvId}, Сумма: ${OutSum}`);
        res.send('OK');
    } else {
        // Подпись неверна
        console.error('Неверная подпись платежа');
        res.status(400).send('Bad signature');
    }
});

const PORT = process.env.PORT || 3004;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});