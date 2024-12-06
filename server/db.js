const { Pool } = require('pg');

const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'adminflow',
    password: 'sGLTccA_Na#9zC',
    port: 5003,
});

module.exports = pool; 