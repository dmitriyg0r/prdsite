const mysql = require('mysql2/promise');

const pool = mysql.createPool({
    host: 'localhost',
    port: 3306,
    user: 'adminmaincraft',
    password: 'sGLTccA_Na#9zC',
    database: 'maincraft',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    authPlugin: 'mysql_native_password'
});

// Проверка подключения
pool.getConnection()
    .then(connection => {
        console.log('Успешное подключение к базе данных');
        connection.release();
    })
    .catch(err => {
        console.error('Ошибка подключения к базе данных:', err);
        process.exit(1);
    });

module.exports = pool;