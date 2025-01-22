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
        
        // Проверка входных данных
        if (!minecraftLogin || !amount) {
            console.error('Missing required fields:', { minecraftLogin, amount });
            return res.status(400).json({
                error: 'Отсутствуют обязательные поля'
            });
        }

        // Проверка формата суммы
        const parsedAmount = parseFloat(amount);
        if (isNaN(parsedAmount) || parsedAmount <= 0) {
            console.error('Invalid amount:', amount);
            return res.status(400).json({
                error: 'Неверная сумма'
            });
        }

        const orderId = Date.now();
        
        // Логируем данные перед формированием подписи
        console.log('Payment data:', {
            login: process.env.ROBOKASSA_LOGIN,
            amount: parsedAmount,
            orderId,
            minecraftLogin
        });

        const signature = crypto
            .createHash('md5')
            .update(`${process.env.ROBOKASSA_LOGIN}:${parsedAmount}:${orderId}:${process.env.ROBOKASSA_PASSWORD1}`)
            .digest('hex');
        
        // Кодируем параметры для URL
        const description = encodeURIComponent(`Доступ к серверу Minecraft для ${minecraftLogin}`);
        
        const paymentUrl = `https://auth.robokassa.ru/Merchant/Index.aspx?MerchantLogin=${process.env.ROBOKASSA_LOGIN}&OutSum=${parsedAmount}&InvId=${orderId}&Description=${description}&SignatureValue=${signature}&IsTest=1`;

        console.log('Generated payment URL:', paymentUrl);

        return res.json({
            confirmationUrl: paymentUrl,
            orderId: orderId
        });
    } catch (error) {
        console.error('Detailed payment creation error:', error);
        return res.status(500).json({
            error: 'Ошибка при создании платежа',
            details: error.message
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