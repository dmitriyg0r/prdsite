const express = require('express');
const cors = require('cors');
const pool = require('./maindb');

const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());

// Получение всех записей из White_List
app.get('/api/WhiteList', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM White_List');
        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('Ошибка при получении данных из White_List:', error);
        res.status(500).json({ success: false, error: 'Ошибка при получении данных' });
    }
});

// Добавление новой записи в White_List
app.post('/api/WhiteList', async (req, res) => {
    try {
        const { UUID, user } = req.body;
        const [result] = await pool.query(
            'INSERT INTO White_List (UUID, user) VALUES (?, ?)',
            [UUID, user]
        );
        res.json({ success: true, id: result.insertId });
    } catch (error) {
        console.error('Ошибка при добавлении записи:', error);
        res.status(500).json({ success: false, error: 'Ошибка при добавлении записи' });
    }
});

// Удаление записи из White_List
app.delete('/api/WhiteList/:uuid', async (req, res) => {
    try {
        const { uuid } = req.params;
        await pool.query('DELETE FROM White_List WHERE UUID = ?', [uuid]);
        res.json({ success: true });
    } catch (error) {
        console.error('Ошибка при удалении записи:', error);
        res.status(500).json({ success: false, error: 'Ошибка при удалении записи' });
    }
});

app.listen(port, () => {
    console.log(`Сервер запущен на порту ${port}`);
});
