const express = require('express');
const cors = require('cors');
const pool = require('./maindb');

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
app.get('/api/White_List', async (req, res) => {
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
    const { uuid, username } = req.body;
    try {
        await pool.query('INSERT INTO White_List (uuid, username) VALUES (?, ?)', [uuid, username]);
        res.json({ success: true });
    } catch (error) {
        console.error('Ошибка при добавлении в White_List:', error);
        res.status(500).json({ success: false, error: 'Ошибка сервера' });
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

app.listen(port, () => {
    console.log(`Сервер запущен на порту ${port}`);
});
