const { Pool } = require('pg');

const pool = new Pool({
    user: 'root',
    host: 'localhost',
    database: 'adminflow',
    password: 'sGLTccA_Na#9zC',
    port: 5432,
});

pool.on('connect', () => {
    console.log('Connected to the database');
});

pool.on('error', (err) => {
    console.error('Unexpected error on idle client', err);
});

const testConnection = async () => {
    try {
        const client = await pool.connect();
        console.log('Успешное подключение к базе данных');
        client.release();
        return true;
    } catch (err) {
        console.error('Ошибка подключения к базе данных:', err);
        return false;
    }
};

module.exports = { pool, testConnection }; 