import express from 'express';
import cors from 'cors';
import { createPool } from 'mysql2/promise';
import TochkaPaymentChecker from '../minecraft/payment-checker.js';

const app = express();
const port = 3000;

// Разрешаем запросы с обоих доменов
const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost',
    'https://space-point.ru'
];

app.use(cors({
    origin: function(origin, callback) {
        // Разрешаем запросы без origin (например, от Postman)
        if (!origin) return callback(null, true);
        
        if (allowedOrigins.indexOf(origin) === -1) {
            return callback(new Error('Политика CORS не разрешает доступ с этого источника.'), false);
        }
        return callback(null, true);
    },
    credentials: true
}));
app.use(express.json());

// Получение данных из White_List
console.log('Регистрация маршрута GET /api/White_List');
app.get('/api/White_List', async (req, res) => {
    console.log('Получен запрос к /api/White_List');
    try {
        const [rows] = await pool.query('SELECT * FROM White_List');
        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('Ошибка при получении данных из White_List:', error);
        res.status(500).json({ success: false, error: 'Ошибка сервера' });
    }
});

// Добавление записи в White_List
app.post('/api/White_List', async (req, res) => {
    const { user } = req.body;
    
    if (!user) {
        return res.status(400).json({ 
            success: false, 
            error: 'Имя пользователя обязательно' 
        });
    }

    try {
        await pool.query('INSERT INTO White_List (uuid, user) VALUES (NULL, ?)', [user]);
        res.json({ success: true });
    } catch (error) {
        console.error('Ошибка при добавлении в White_List:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Ошибка сервера',
            details: error.message 
        });
    }
});

// Удаление записи из White_List
app.delete('/api/White_List/:uuid', async (req, res) => {
    const { uuid } = req.params;
    try {
        await pool.query('DELETE FROM White_List WHERE uuid = ?', [uuid]);
        res.json({ success: true });
    } catch (error) {
        console.error('Ошибка при удалении из White_List:', error);
        res.status(500).json({ success: false, error: 'Ошибка сервера' });
    }
});

// Обработка входа пользователя
app.post('/api/login', async (req, res) => {
    const { username } = req.body;
    
    if (!username) {
        return res.status(400).json({ 
            success: false, 
            error: 'Имя пользователя обязательно' 
        });
    }

    try {
        const [rows] = await pool.query('SELECT * FROM White_List WHERE user = ?', [username]);
        
        if (rows.length > 0) {
            res.json({ success: true });
        } else {
            res.status(401).json({ success: false, error: 'Пользователь не найден' });
        }
    } catch (error) {
        console.error('Ошибка при проверке пользователя:', error);
        res.status(500).json({ success: false, error: 'Ошибка сервера' });
    }
});

app.get('/api/payments', async (req, res) => {
    try {
        const paymentChecker = new TochkaPaymentChecker();
        
        // Получаем баланс
        const balanceData = await paymentChecker.getAccountBalance();
        
        // Получаем последние платежи
        const payments = await paymentChecker.getRecentPayments();
        
        res.json({
            success: true,
            balance: balanceData.balance,
            payments: payments.map(payment => ({
                date: payment.date,
                minecraftLogin: extractMinecraftLogin(payment.description),
                amount: payment.amount,
                status: payment.status
            }))
        });
    } catch (error) {
        console.error('Ошибка при получении данных платежей:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Ошибка при получении данных платежей' 
        });
    }
});

function extractMinecraftLogin(description) {
    // Предполагаем, что логин указан в описании платежа
    // Можно настроить регулярное выражение под конкретный формат
    const match = description.match(/login:\s*(\w+)/i);
    return match ? match[1] : 'Неизвестно';
}

// Обновляем эндпоинт для получения баланса
app.get('/api/balance', async (req, res) => {
    try {
        const paymentChecker = new TochkaPaymentChecker();
        const balanceData = await paymentChecker.getAccountBalance();
        
        // Добавляем CORS заголовки
        res.header('Access-Control-Allow-Origin', allowedOrigins);
        res.header('Access-Control-Allow-Credentials', true);
        
        res.json({
            success: true,
            balance: balanceData.balance,
            currency: balanceData.currency
        });
    } catch (error) {
        console.error('Ошибка при получении баланса:', error);
        res.status(500).json({
            success: false,
            error: 'Ошибка при получении баланса'
        });
    }
});

const pool = createPool({
    host: 'localhost',
    user: 'root',
    password: 'sGLTccA_Na#9zC',
    database: 'maincraft',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

app.listen(port, () => {
    console.log(`Сервер запущен на порту ${port}`);
});
