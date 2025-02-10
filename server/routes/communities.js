const express = require('express');
const router = express.Router();
const pool = require('../db');

// Получение сообществ пользователя
router.get('/', async (req, res) => {
    console.log('GET /api/communities route hit');
    try {
        const { userId } = req.query;
        
        if (!userId) {
            return res.status(400).json({
                success: false,
                error: 'userId is required'
            });
        }

        // Сначала проверим, существует ли таблица communities
        const tableExists = await pool.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'communities'
            );
        `);

        if (!tableExists.rows[0].exists) {
            // Если таблица не существует, возвращаем пустой массив
            return res.json({
                success: true,
                communities: []
            });
        }

        // Если таблица существует, выполняем основной запрос
        const result = await pool.query(`
            SELECT DISTINCT
                c.*,
                COALESCE(
                    (SELECT COUNT(*) FROM community_members WHERE community_id = c.id),
                    0
                ) as members_count,
                CASE 
                    WHEN EXISTS (
                        SELECT 1 FROM community_members 
                        WHERE community_id = c.id AND user_id = $1
                    ) THEN true
                    ELSE false
                END as is_member
            FROM communities c
            LEFT JOIN community_members cm ON c.id = cm.community_id AND cm.user_id = $1
            ORDER BY c.created_at DESC
        `, [userId]);

        console.log('Communities found:', result.rows.length);

        return res.json({
            success: true,
            communities: result.rows || []
        });
    } catch (err) {
        console.error('Error getting user communities:', err);
        // Добавляем детали ошибки в ответ для отладки
        return res.status(500).json({
            success: false,
            error: 'Ошибка при получении списка сообществ',
            details: err.message
        });
    }
});

module.exports = router;