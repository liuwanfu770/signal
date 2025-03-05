const { Pool } = require('pg');

const pool = new Pool({
    user: process.env.DB_USER || 'signal_user',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'signal_db',
    password: process.env.DB_PASS || 'signal_pass',
    port: process.env.DB_PORT || 5432,
});

module.exports = pool;
