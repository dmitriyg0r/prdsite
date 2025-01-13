const mysql = require('mysql2/promise');

const pool = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: 'sGLTccA_Na#9zC',
    database: 'maincraft',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Проверка подключения
pool.getConnection()
    .then(connection => {
        console.log('Успешное подключение к базе данных');
        connection.release();
    })
    .catch(err => {
        console.error('Ошибка подключения к базе данных:', err);
    });

module.exports = pool;