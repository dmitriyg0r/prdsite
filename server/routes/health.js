const express = require('express');
const router = express.Router();
const { pool } = require('../utils/db');

// Проверка здоровья сервера
router.get('/health', async (req, res) => {
    try {
        // Проверяем подключение к базе данных
        await pool.query('SELECT 1');

        res.json({
            success: true,
            status: 'ok',
            timestamp: new Date().toISOString(),
            services: {
                database: true,
                server: true
            }
        });
    } catch (err) {
        console.error('Health check error:', err);
        res.status(500).json({
            success: false,
            status: 'error',
            timestamp: new Date().toISOString(),
            services: {
                database: false,
                server: true
            },
            error: 'Database connection error'
        });
    }
});

// Обновление статуса активности пользователя
router.post('/users/update-status', async (req, res) => {
    try {
        const { userId } = req.body;
        console.log('Updating activity for user:', userId);

        const result = await pool.query(`
            UPDATE users 
            SET last_activity = NOW() 
            WHERE id = $1 
            RETURNING last_activity
        `, [userId]);

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Пользователь не найден'
            });
        }

        res.json({
            success: true,
            lastActivity: result.rows[0].last_activity
        });
    } catch (err) {
        console.error('Update activity error:', err);
        res.status(500).json({
            success: false,
            error: 'Ошибка при обновлении статуса активности'
        });
    }
});

module.exports = router; 