const { Pool } = require('pg');

if (!process.env.DB_PASS) {
    throw new Error('环境变量 DB_PASS 未设置，数据库连接失败');
}

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASS,
    port: parseInt(process.env.DB_PORT, 10) || 5432,
    max: 10, // 限制最大连接数
    idleTimeoutMillis: 30000, // 30秒无请求释放
    connectionTimeoutMillis: 5000 // 5秒超时
});

// 进程关闭时释放数据库连接
process.on('SIGINT', async () => {
    console.log('Closing database connection...');
    await pool.end();
    process.exit(0);
});

module.exports = pool;
