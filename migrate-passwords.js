const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const dotenv = require('dotenv');
dotenv.config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'your_db_user',
  password: process.env.DB_PASSWORD || 'your_db_password',
  database: process.env.DB_NAME || 'signal_db',
  port: 5432,
});

async function migratePasswords() {
  try {
    // 获取所有用户的明文密码
    const { rows } = await pool.query('SELECT id, password FROM users');
    
    console.log(`开始迁移 ${rows.length} 个用户的密码...`);
    
    for (const user of rows) {
      // 对每个密码进行哈希处理
      const hashedPassword = await bcrypt.hash(user.password, 10);
      
      // 更新数据库中的密码
      await pool.query(
        'UPDATE users SET password = $1 WHERE id = $2',
        [hashedPassword, user.id]
      );
      
      console.log(`用户 ID ${user.id} 的密码已迁移`);
    }
    
    console.log('所有密码迁移完成！');
  } catch (error) {
    console.error('密码迁移过程出错:', error);
  } finally {
    await pool.end();
  }
}

migratePasswords();
