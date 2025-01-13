const express = require('express');
const cors = require('cors');
const db = require('../adminpanel/maindb.js'); // Путь к вашему файлу с конфигурацией БД
const app = express();

// Middleware
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'DELETE', 'UPDATE', 'PUT', 'PATCH']
}));
app.use(express.json());

// Роуты для работы с white_list
app.get('/api/whitelist', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM white_list');
        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('Ошибка:', error);
        res.status(500).json({ success: false, error: 'Ошибка сервера майнкрафт' });
    }
});

app.post('/api/whitelist', async (req, res) => {
    try {
        const { UUID, user } = req.body;
        await db.query('INSERT INTO white_list (UUID, user) VALUES (?, ?)', [UUID, user]);
        res.json({ success: true, message: 'Запись добавлена' });
    } catch (error) {
        console.error('Ошибка:', error);
        res.status(500).json({ success: false, error: 'Ошибка сервера' });
    }
});

app.delete('/api/whitelist/:uuid', async (req, res) => {
    try {
        const { uuid } = req.params;
        await db.query('DELETE FROM white_list WHERE UUID = ?', [uuid]);
        res.json({ success: true, message: 'Запись удалена' });
    } catch (error) {
        console.error('Ошибка:', error);
        res.status(500).json({ success: false, error: 'Ошибка сервера майнкрафт' });
    }
});

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`БД майнкрафт запущена на порту ${PORT}`);
});