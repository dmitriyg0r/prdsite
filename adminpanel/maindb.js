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

// Убедимся, что у нас есть подключение к БД
const db = require('../database/db.js');

/**
 * Получение данных из White List с пагинацией
 * @param {number} page - Номер страницы
 * @param {number} limit - Количество записей на странице
 * @returns {Promise<{success: boolean, data?: {rows: Array, total: number}, error?: string}>}
 */
const getWhiteListData = async (page = 1, limit = 10) => {
    try {
        const offset = (page - 1) * limit;
        
        const [totalCount] = await db.query(
            'SELECT COUNT(*) as count FROM White_List'
        );
        
        const [rows] = await db.query(
            'SELECT UUID, user FROM White_List LIMIT ? OFFSET ?',
            [limit, offset]
        );

        return {
            success: true,
            data: {
                rows,
                total: totalCount[0].count
            }
        };
    } catch (err) {
        console.error('Error in getWhiteListData:', err);
        return {
            success: false,
            error: err.message
        };
    }
};

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

// Явно экспортируем все функции
module.exports = {
    getWhiteListData,
    addToWhiteList,
    removeFromWhiteList,
    pool
};