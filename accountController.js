const axios = require('axios');
const { Pool } = require('pg');
const dotenv = require('dotenv');
dotenv.config();
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'your_db_user',
  password: process.env.DB_PASSWORD || 'your_db_password',
  database: process.env.DB_NAME || 'signal_db',
  port: 5432,
});
const PORT = process.env.PORT || 4000;

exports.registerAccount = async (req, res) => {
  const phone = req.params.number;
  const userId = req.user?.user_id;
  if (!userId) {
    return res.status(401).json({ error: '用户未认证' });
  }
  try {
    // 调用外部服务（例如 Signal CLI）注册账号
    await axios.post(`${process.env.SIGNAL_CLI_URL}/v1/register`, { number: phone });
    // 处理数据库写入
    const { rows } = await pool.query(
      'INSERT INTO signal_accounts (phone_number, user_id) VALUES ($1, $2) RETURNING phone_number, status',
      [phone, userId]
    );
    res.status(201).json({ message: '注册成功', account: rows[0] });
  } catch (error) {
    console.error('注册错误:', error);
    res.status(500).json({ error: '注册失败' });
  }
};
