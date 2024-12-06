const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const pool = require('./db');

const app = express();
const PORT = 5003;

app.use(cors());
app.use(express.json());

// Endpoint для авторизации
app.post('/api/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        
        // Поиск пользователя
        const user = await pool.query(
            'SELECT * FROM users WHERE username = $1',
            [username]
        );

        if (user.rows.length === 0) {
            return res.status(401).json({ error: 'Пользователь не найден' });
        }

        // Проверка пароля
        const validPassword = await bcrypt.compare(
            password,
            user.rows[0].password_hash
        );

        if (!validPassword) {
            return res.status(401).json({ error: 'Неверный пароль' });
        }

        // Обновляем время последнего входа
        await pool.query(
            'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1',
            [user.rows[0].id]
        );

        res.json({ 
            success: true,
            user: {
                id: user.rows[0].id,
                username: user.rows[0].username,
                role: user.rows[0].role
            }
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
}); 