const mysql = require('mysql2/promise');

const pool = mysql.createPool({
    host: 'localhost',
    port: 3306,
    user: 'adminmaincraft',
    password: 'sGLTccA_Na#9zC',
    database: 'maincraft',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Функция для получения данных White_List с пагинацией
async function getWhiteListData(page = 1, limit = 10) {
    try {
        const offset = (page - 1) * limit;
        
        // Используем правильный синтаксис MySQL для подсчета
        const [countResult] = await pool.query('SELECT COUNT(*) as total FROM White_List');
        const total = countResult[0].total;
        
        // MySQL чувствителен к регистру в именах таблиц
        const [rows] = await pool.query(
            'SELECT uuid, user FROM White_List ORDER BY user LIMIT ? OFFSET ?',
            [limit, offset]
        );
        
        return {
            success: true,
            data: {
                rows,
                total,
                pages: Math.ceil(total / limit),
                currentPage: page,
                limit
            }
        };
    } catch (err) {
        console.error('MySQL error:', err);
        return {
            success: false,
            error: 'Ошибка при получении данных таблицы',
            details: err
        };
    }
}

// Функция для добавления записи в White_List
async function addToWhiteList(uuid, user) {
    try {
        const [result] = await pool.query(
            'INSERT INTO White_List (UUID, user) VALUES (?, ?)',
            [uuid, user]
        );
        return {
            success: true,
            data: { id: result.insertId, UUID: uuid, user }
        };
    } catch (err) {
        console.error('Database error:', err);
        throw err;
    }
}

// Функция для удаления записи из White_List
async function removeFromWhiteList(uuid) {
    try {
        await pool.query('DELETE FROM White_List WHERE UUID = ?', [uuid]);
        return { success: true };
    } catch (err) {
        console.error('Database error:', err);
        throw err;
    }
}

module.exports = {
    getWhiteListData,
    addToWhiteList,
    removeFromWhiteList,
    pool
};