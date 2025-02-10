const express = require('express');
const router = express.Router();
const pool = require('../db');
const upload = require('../middleware/upload');
const auth = require('../middleware/auth');

// Создание сообщества
router.post('/create', auth, upload.single('avatar'), async (req, res) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        
        const { name, description, type } = req.body;
        const createdBy = req.user.id;
        const avatarUrl = req.file ? `/uploads/avatars/${req.file.filename}` : null;

        // Создаем сообщество
        const communityResult = await client.query(`
            INSERT INTO communities (name, description, avatar_url, type, created_by)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING id
        `, [name, description, avatarUrl, type, createdBy]);

        const communityId = communityResult.rows[0].id;

        // Добавляем создателя как администратора
        await client.query(`
            SELECT join_community($1, $2, $3)
        `, [createdBy, communityId, 'admin']);

        await client.query('COMMIT');

        res.json({
            success: true,
            community: {
                id: communityId,
                name,
                description,
                avatar_url: avatarUrl,
                type,
                created_by: createdBy
            }
        });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Error creating community:', err);
        res.status(500).json({ success: false, error: 'Ошибка при создании сообщества' });
    } finally {
        client.release();
    }
});

// Получение информации о сообществе
router.get('/:id', auth, async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query(`
            SELECT c.*, 
                   u.username as creator_name,
                   (SELECT json_agg(user_id) FROM community_members WHERE community_id = c.id) as members,
                   (SELECT COUNT(*) FROM posts WHERE community_id = c.id) as posts_count
            FROM communities c
            LEFT JOIN users u ON c.created_by = u.id
            WHERE c.id = $1
        `, [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Сообщество не найдено' });
        }

        res.json({ success: true, community: result.rows[0] });
    } catch (err) {
        console.error('Error fetching community:', err);
        res.status(500).json({ success: false, error: 'Ошибка при получении данных сообщества' });
    }
});

// Вступление в сообщество
router.post('/join', auth, async (req, res) => {
    try {
        const { communityId } = req.body;
        const userId = req.user.id;

        // Проверяем тип сообщества
        const communityType = await pool.query(
            'SELECT type FROM communities WHERE id = $1',
            [communityId]
        );

        if (communityType.rows[0].type === 'private') {
            // Для закрытого сообщества создаем заявку
            await pool.query(`
                INSERT INTO community_join_requests (community_id, user_id)
                VALUES ($1, $2)
                ON CONFLICT DO NOTHING
            `, [communityId, userId]);

            return res.json({ 
                success: true, 
                message: 'Заявка на вступление отправлена' 
            });
        }

        // Для открытого сообщества сразу добавляем пользователя
        const result = await pool.query(
            'SELECT join_community($1, $2)',
            [userId, communityId]
        );

        res.json({ 
            success: true, 
            message: 'Вы успешно вступили в сообщество' 
        });
    } catch (err) {
        console.error('Error joining community:', err);
        res.status(500).json({ 
            success: false, 
            error: 'Ошибка при вступлении в сообщество' 
        });
    }
});

// Выход из сообщества
router.post('/leave', auth, async (req, res) => {
    try {
        const { communityId } = req.body;
        const userId = req.user.id;

        const result = await pool.query(
            'SELECT leave_community($1, $2)',
            [userId, communityId]
        );

        if (!result.rows[0].leave_community) {
            return res.status(400).json({ 
                success: false, 
                error: 'Невозможно покинуть сообщество' 
            });
        }

        res.json({ 
            success: true, 
            message: 'Вы успешно покинули сообщество' 
        });
    } catch (err) {
        console.error('Error leaving community:', err);
        res.status(500).json({ 
            success: false, 
            error: 'Ошибка при выходе из сообщества' 
        });
    }
});

// Получение списка участников сообщества
router.get('/:id/members', auth, async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query(`
            SELECT u.id, u.username, u.avatar_url, cm.role, cm.joined_at
            FROM community_members cm
            JOIN users u ON cm.user_id = u.id
            WHERE cm.community_id = $1
            ORDER BY 
                CASE cm.role 
                    WHEN 'admin' THEN 1 
                    WHEN 'moderator' THEN 2 
                    ELSE 3 
                END,
                cm.joined_at DESC
        `, [id]);

        res.json({ success: true, members: result.rows });
    } catch (err) {
        console.error('Error fetching community members:', err);
        res.status(500).json({ 
            success: false, 
            error: 'Ошибка при получении списка участников' 
        });
    }
});

module.exports = router; 