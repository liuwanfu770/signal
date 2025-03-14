// ...existing code before changes...
require('dotenv').config();  // 加载 .env 文件

const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

// 检查 .env 文件是否存在（假设位于项目根目录）
const envPath = path.join(__dirname, '../../.env');
if (!fs.existsSync(envPath)) {
  console.warn('.env 文件未找到，使用默认数据库配置');
}

const pool = new Pool({
  user: process.env.DB_USER || 'signal_user',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'signal_db',
  password: process.env.DB_PASSWORD || 'signal_pass',
  port: process.env.DB_PORT || 5432,
});

// ...existing code after changes...
module.exports = pool;
