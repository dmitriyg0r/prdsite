const { Pool } = require('pg');

const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'adminflow',
    password: 'sGLTccA_Na#9zC',
    port: 5003
});

pool.connect((err, client, release) => {
    if (err) {
        console.error('Error acquiring client', err.stack);
    } else {
        console.log('Database connection successful');
    }
});

module.exports = pool; 