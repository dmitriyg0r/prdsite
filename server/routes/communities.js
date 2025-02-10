const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const path = require('path');
const multer = require('multer');

// Настройка multer для загрузки аватаров
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, '/var/www/html/uploads/communities');
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'community-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ 
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    },
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type. Only JPEG, PNG and GIF are allowed.'));
        }
    }
});

// Создание сообщества
router.post('/create', upload.single('avatar'), async (req, res) => {
    console.log('POST /api/communities/create called');
    console.log('Request body:', req.body);
    
    try {
        const { name, description, type = 'public' } = req.body;
        const createdBy = req.body.userId; // ID создателя сообщества
        
        // Проверка обязательных полей
        if (!name || !createdBy) {
            return res.status(400).json({
                success: false,
                error: 'Название сообщества и ID создателя обязательны'
            });
        }

        // Начинаем транзакцию
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            // Создаем запись в таблице communities
            const communityResult = await client.query(`
                INSERT INTO communities (name, description, type, created_by, avatar_url)
                VALUES ($1, $2, $3, $4, $5)
                RETURNING id
            `, [
                name, 
                description || '', 
                type, 
                createdBy,
                req.file ? `/uploads/communities/${req.file.filename}` : null
            ]);

            const communityId = communityResult.rows[0].id;

            // Добавляем создателя как администратора сообщества
            await client.query(`
                INSERT INTO community_members (community_id, user_id, role)
                VALUES ($1, $2, 'admin')
            `, [communityId, createdBy]);

            await client.query('COMMIT');

            res.json({
                success: true,
                message: 'Сообщество успешно создано',
                communityId: communityId
            });
        } catch (err) {
            await client.query('ROLLBACK');
            throw err;
        } finally {
            client.release();
        }
    } catch (err) {
        console.error('Error creating community:', err);
        res.status(500).json({
            success: false,
            error: 'Ошибка при создании сообщества',
            details: err.message
        });
    }
});

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

// Поиск сообществ
router.get('/search', async (req, res) => {
    console.log('GET /api/communities/search called');
    try {
        const { q } = req.query;
        console.log('Search query:', q);
        
        if (!q) {
            return res.json({
                success: true,
                communities: []
            });
        }

        // Сначала проверим существование таблицы
        const tableExists = await pool.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'communities'
            );
        `);

        if (!tableExists.rows[0].exists) {
            console.log('Communities table does not exist');
            return res.json({
                success: true,
                communities: []
            });
        }

        // Выполняем поиск с более простым запросом
        const result = await pool.query(`
            SELECT 
                c.*,
                (
                    SELECT COUNT(*) 
                    FROM community_members 
                    WHERE community_id = c.id
                ) as members_count
            FROM communities c
            WHERE 
                LOWER(c.name) LIKE LOWER($1)
                OR LOWER(c.description) LIKE LOWER($1)
            ORDER BY 
                c.created_at DESC
            LIMIT 10
        `, [`%${q}%`]);

        console.log(`Found ${result.rows.length} communities matching "${q}"`);

        return res.json({
            success: true,
            communities: result.rows || []
        });
    } catch (err) {
        console.error('Error searching communities:', err);
        // Добавляем больше деталей об ошибке в ответ
        return res.status(500).json({
            success: false,
            error: 'Ошибка при поиске сообществ',
            details: err.message,
            query: req.query
        });
    }
});

module.exports = router;