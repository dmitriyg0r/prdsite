const { pool } = require('../utils/db');

const checkAdmin = async (req, res, next) => {
    try {
        // Получаем adminId из query параметров или тела запроса
        const adminId = req.query.adminId || req.body.adminId;

        // Проверяем, передан ли adminId
        if (!adminId) {
            return res.status(401).json({
                success: false,
                error: 'Требуется авторизация'
            });
        }

        // Проверяем роль пользователя в базе данных
        const userResult = await pool.query(
            'SELECT role FROM users WHERE id = $1',
            [adminId]
        );

        // Если пользователь не найден или не является администратором
        if (userResult.rows.length === 0 || userResult.rows[0].role !== 'admin') {
            return res.status(403).json({
                success: false,
                error: 'Доступ запрещен'
            });
        }

        // Если все проверки пройдены, продолжаем выполнение запроса
        next();
    } catch (err) {
        console.error('Ошибка при проверке прав администратора:', err);
        res.status(500).json({
            success: false,
            error: 'Ошибка сервера'
        });
    }
};

module.exports = checkAdmin;