const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const path = require('path');
const multer = require('multer');
const fs = require('fs');

// Настройка multer для загрузки аватаров сообществ
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadPath = '/var/www/html/uploads/communities';
        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
        }
        cb(null, uploadPath);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'community-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|gif|webp/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);

        if (extname && mimetype) {
            return cb(null, true);
        }
        cb(new Error('Разрешены только изображения!'));
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
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                role VARCHAR(20) NOT NULL DEFAULT 'member',
                joined_at TIMESTAMP NOT NULL DEFAULT NOW(),
                UNIQUE(community_id, user_id)
            );
        `);

        // Создаем таблицу community_settings, если она не существует
        await client.query(`
            CREATE TABLE IF NOT EXISTS community_settings (
                id SERIAL PRIMARY KEY,
                community_id INTEGER REFERENCES communities(id) ON DELETE CASCADE,
                post_permission VARCHAR(20) NOT NULL DEFAULT 'admin_only',
                visibility VARCHAR(20) NOT NULL DEFAULT 'public',
                created_at TIMESTAMP NOT NULL DEFAULT NOW(),
                updated_at TIMESTAMP,
                UNIQUE(community_id)
            );
        `);

        // Создаем таблицу community_posts, если она не существует
        await client.query(`
            CREATE TABLE IF NOT EXISTS community_posts (
                id SERIAL PRIMARY KEY,
                community_id INTEGER REFERENCES communities(id) ON DELETE CASCADE,
                author_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
                title VARCHAR(255) NOT NULL,
                content TEXT NOT NULL,
                created_at TIMESTAMP NOT NULL DEFAULT NOW(),
                updated_at TIMESTAMP,
                likes_count INTEGER DEFAULT 0,
                comments_count INTEGER DEFAULT 0
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
    const client = await pool.connect();
    
    try {
        const { name, description, type, creatorId } = req.body;
        
        // Проверяем обязательные поля
        if (!name?.trim()) {
            return res.status(400).json({
                success: false,
                error: 'Название сообщества обязательно'
            });
        }

        if (!creatorId) {
            return res.status(400).json({
                success: false,
                error: 'ID создателя обязателен'
            });
        }

        await client.query('BEGIN');

        // Создаем сообщество
        const communityResult = await client.query(`
            INSERT INTO communities 
            (name, description, type, created_by, avatar_url, created_at)
            VALUES ($1, $2, $3, $4, $5, NOW())
            RETURNING *
        `, [
            name.trim(),
            description?.trim() || '',
            type || 'public',
            creatorId,
            req.file ? `/uploads/communities/${req.file.filename}` : '/uploads/communities/default.png'
        ]);

        const community = communityResult.rows[0];

        // Добавляем создателя как администратора (без поля permissions)
        await client.query(`
            INSERT INTO community_members 
            (community_id, user_id, role)
            VALUES ($1, $2, 'admin')
        `, [community.id, creatorId]);

        await client.query('COMMIT');

        // Получаем полную информацию о созданном сообществе
        const fullCommunityResult = await client.query(`
            SELECT 
                c.*,
                (SELECT COUNT(*) FROM community_members WHERE community_id = c.id) as members_count,
                u.username as creator_name
            FROM communities c
            LEFT JOIN users u ON c.created_by = u.id
            WHERE c.id = $1
        `, [community.id]);

        res.json({
            success: true,
            community: fullCommunityResult.rows[0]
        });

    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Ошибка создания сообщества:', err);
        res.status(500).json({
            success: false,
            error: 'Ошибка при создании сообщества'
        });
    } finally {
        client.release();
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

        // Проверяем существование таблиц
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
            console.log('Tables do not exist yet:', { communities_exist, members_exist });
            return res.json({
                success: true,
                communities: []
            });
        }

        // Изменённый запрос - получаем только сообщества, где пользователь является участником
        const result = await pool.query(`
            SELECT 
                c.*,
                (SELECT COUNT(*) FROM community_members WHERE community_id = c.id) as members_count,
                cm.role as user_role,
                true as is_member
            FROM communities c
            INNER JOIN community_members cm ON c.id = cm.community_id
            WHERE cm.user_id = $1
            ORDER BY c.created_at DESC
        `, [userId]);

        console.log('User communities found:', result.rows.length);

        return res.json({
            success: true,
            communities: result.rows || []
        });
    } catch (err) {
        console.error('Error getting user communities:', err);
        return res.status(500).json({
            success: false,
            error: 'Ошибка при получении списка сообществ',
            details: err.message
        });
    }
});

// Поиск сообществ
router.get('/search', async (req, res) => {
    const client = await pool.connect();
    try {
        const { q, userId } = req.query;
        
        if (!q) {
            return res.json({
                success: true,
                communities: []
            });
        }

        const searchQuery = `
            SELECT 
                c.*,
                (SELECT COUNT(*) FROM community_members WHERE community_id = c.id) as members_count,
                u.username as creator_name,
                CASE 
                    WHEN EXISTS (
                        SELECT 1 
                        FROM community_members 
                        WHERE community_id = c.id AND user_id = $2
                    ) THEN true
                    ELSE false
                END as is_member
            FROM communities c
            LEFT JOIN users u ON c.created_by = u.id
            WHERE 
                LOWER(c.name) LIKE LOWER($1) OR 
                LOWER(c.description) LIKE LOWER($1)
            ORDER BY 
                CASE 
                    WHEN LOWER(c.name) = LOWER($3) THEN 1
                    WHEN LOWER(c.name) LIKE LOWER($3 || '%') THEN 2
                    WHEN LOWER(c.name) LIKE '%' || LOWER($3) || '%' THEN 3
                    ELSE 4
                END,
                c.created_at DESC
            LIMIT 10
        `;

        const result = await client.query(searchQuery, [
            `%${q}%`,
            userId || null,
            q
        ]);

        return res.json({
            success: true,
            communities: result.rows
        });

    } catch (err) {
        console.error('Ошибка поиска сообществ:', err);
        return res.status(500).json({
            success: false,
            error: 'Ошибка при поиске сообществ'
        });
    } finally {
        client.release();
    }
});

// Добавляем эндпоинт для создания поста в сообществе
router.post('/:communityId/posts', async (req, res) => {
    try {
        const { communityId } = req.params;
        const { userId, content, title } = req.body;

        // Проверяем права пользователя
        const memberCheck = await pool.query(`
            SELECT cm.role, cs.post_permission
            FROM community_members cm
            JOIN community_settings cs ON cm.community_id = cs.community_id
            WHERE cm.community_id = $1 AND cm.user_id = $2
        `, [communityId, userId]);

        if (memberCheck.rows.length === 0) {
            return res.status(403).json({
                success: false,
                error: 'Вы не являетесь участником сообщества'
            });
        }

        const member = memberCheck.rows[0];
        const canPost = member.role === 'admin' || 
                       (member.role === 'member' && member.post_permission === 'all_members');

        if (!canPost) {
            return res.status(403).json({
                success: false,
                error: 'У вас нет прав для создания постов в этом сообществе'
            });
        }

        // Создаем пост
        const result = await pool.query(`
            INSERT INTO community_posts 
            (community_id, author_id, title, content, created_at)
            VALUES ($1, $2, $3, $4, NOW())
            RETURNING *
        `, [communityId, userId, title, content]);

        res.json({
            success: true,
            post: result.rows[0]
        });

    } catch (err) {
        console.error('Error creating community post:', err);
        res.status(500).json({
            success: false,
            error: 'Ошибка при создании поста',
            details: err.message
        });
    }
});

// Добавляем эндпоинт для получения постов сообщества
router.get('/:communityId/posts', async (req, res) => {
    try {
        const { communityId } = req.params;
        const { page = 1, limit = 10 } = req.query;
        const offset = (page - 1) * limit;

        const posts = await pool.query(`
            SELECT 
                cp.*,
                u.username as author_name,
                u.avatar_url as author_avatar
            FROM community_posts cp
            JOIN users u ON cp.author_id = u.id
            WHERE cp.community_id = $1
            ORDER BY cp.created_at DESC
            LIMIT $2 OFFSET $3
        `, [communityId, limit, offset]);

        const total = await pool.query(
            'SELECT COUNT(*) FROM community_posts WHERE community_id = $1',
            [communityId]
        );

        res.json({
            success: true,
            posts: posts.rows,
            total: parseInt(total.rows[0].count),
            pages: Math.ceil(total.rows[0].count / limit)
        });

    } catch (err) {
        console.error('Error getting community posts:', err);
        res.status(500).json({
            success: false,
            error: 'Ошибка при получении постов',
            details: err.message
        });
    }
});

module.exports = router;