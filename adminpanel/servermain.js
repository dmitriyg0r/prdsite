const express = require('express');
const cors = require('cors');
const db = require('./maindb.js');
const app = express();

// Расширенная настройка CORS
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'DELETE', 'PUT', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
}));

app.use(express.json());

// Тестовый роут
app.get('/test', (req, res) => {
    res.json({ message: 'Сервер работает' });
});

// Роуты для white list
app.get('/api/whitelist', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM white_list');
        console.log('Получены данные:', rows); // Для отладки
        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('Ошибка при получении данных:', error); // Для отладки
        res.status(500).json({ success: false, error: error.message });
    }
});

app.post('/api/whitelist', async (req, res) => {
    try {
        const { UUID, user } = req.body;
        await db.query('INSERT INTO white_list (UUID, user) VALUES (?, ?)', [UUID, user]);
        res.json({ success: true, message: 'Запись добавлена' });
    } catch (error) {
        console.error('Ошибка при добавлении:', error); // Для отладки
        res.status(500).json({ success: false, error: error.message });
    }
});

app.delete('/api/whitelist/:uuid', async (req, res) => {
    try {
        const { uuid } = req.params;
        await db.query('DELETE FROM white_list WHERE UUID = ?', [uuid]);
        res.json({ success: true, message: 'Запись удалена' });
    } catch (error) {
        console.error('Ошибка при удалении:', error); // Для отладки
        res.status(500).json({ success: false, error: error.message });
    }
});

const PORT = 3000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Сервер запущен на порту ${PORT}`);
});

// Обработка ошибок
process.on('unhandledRejection', (error) => {
    console.error('Необработанная ошибка:', error);
});