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

// Функция для создания таблиц, если они не существуют
async function ensureTablesExist() {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Создаем таблицу communities, если она не существует
        await client.query(`
            CREATE TABLE IF NOT EXISTS communities (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                description TEXT,
                type VARCHAR(50) DEFAULT 'public',
                created_by INTEGER NOT NULL,
                avatar_url TEXT,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // Создаем таблицу community_members, если она не существует
        await client.query(`
            CREATE TABLE IF NOT EXISTS community_members (
                id SERIAL PRIMARY KEY,
                community_id INTEGER REFERENCES communities(id) ON DELETE CASCADE,
                user_id INTEGER NOT NULL,
                role VARCHAR(50) DEFAULT 'member',
                joined_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(community_id, user_id)
            );
        `);

        await client.query('COMMIT');
        console.log('Tables created successfully');
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Error creating tables:', err);
        throw err;
    } finally {
        client.release();
    }
}

// Создание сообщества
router.post('/create', upload.single('avatar'), async (req, res) => {
    console.log('POST /api/communities/create called');
    console.log('Request body:', req.body);
    console.log('File:', req.file);
    
    try {
        // Убедимся, что таблицы существуют
        await ensureTablesExist();

        const { name, description, type = 'public', userId } = req.body;
        
        // Проверка обязательных полей
        if (!name || !userId) {
            console.log('Missing required fields:', { name, userId });
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
                RETURNING *
            `, [
                name, 
                description || '', 
                type, 
                userId,
                req.file ? `/uploads/communities/${req.file.filename}` : null
            ]);

            console.log('Community created:', communityResult.rows[0]);

            const communityId = communityResult.rows[0].id;

            // Добавляем создателя как администратора сообщества
            const memberResult = await client.query(`
                INSERT INTO community_members (community_id, user_id, role)
                VALUES ($1, $2, 'admin')
                RETURNING *
            `, [communityId, userId]);

            console.log('Member added:', memberResult.rows[0]);

            await client.query('COMMIT');

            res.json({
                success: true,
                message: 'Сообщество успешно создано',
                community: communityResult.rows[0]
            });
        } catch (err) {
            await client.query('ROLLBACK');
            console.error('Transaction error:', err);
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

        // Убедимся, что таблицы существуют
        await ensureTablesExist();

        // Выполняем поиск
        const result = await pool.query(`
            SELECT 
                c.*,
                COALESCE(
                    (SELECT COUNT(*) FROM community_members WHERE community_id = c.id),
                    0
                ) as members_count
            FROM communities c
            WHERE 
                LOWER(c.name) LIKE LOWER($1)
                OR LOWER(c.description) LIKE LOWER($1)
            ORDER BY 
                CASE 
                    WHEN LOWER(c.name) LIKE LOWER($1) THEN 0 
                    ELSE 1 
                END,
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
        return res.status(500).json({
            success: false,
            error: 'Ошибка при поиске сообществ',
            details: err.message
        });
    }
});

module.exports = router;