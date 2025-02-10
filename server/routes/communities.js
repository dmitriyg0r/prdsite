const express = require('express');
const router = express.Router();
const { pool } = require('../db');

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

        // Проверяем существование обеих таблиц
        const tablesExist = await pool.query(`
            SELECT 
                EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_schema = 'public' 
                    AND table_name = 'communities'
                ) as communities_exist,
                EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_schema = 'public' 
                    AND table_name = 'community_members'
                ) as members_exist
        `);

        const { communities_exist, members_exist } = tablesExist.rows[0];

        if (!communities_exist || !members_exist) {
            // Если хотя бы одна из таблиц не существует, возвращаем пустой массив
            console.log('Tables do not exist yet:', { communities_exist, members_exist });
            return res.json({
                success: true,
                communities: []
            });
        }

        // Если обе таблицы существуют, выполняем основной запрос
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