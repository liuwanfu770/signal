const { Pool } = require('pg');
const axios = require('axios');

// 如果 DB_PORT 未设置，则默认为 5432
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT || 5432,
});

// 单个账号注册 API
exports.registerAccount = async (req, res) => {
  const phone = req.params.number;  // 从路由参数中获取号码
  // 检查认证信息
  if (!req.user || !req.user.user_id) {
    return res.status(401).json({ error: '用户未认证' });
  }
  try {
    // 调用 Signal CLI 注册账号（假设外部服务）
    await axios.post(`${process.env.SIGNAL_CLI_URL}/v1/register`, { number: phone });
    const { rows } = await pool.query(
      'INSERT INTO signal_accounts (phone_number, user_id) VALUES ($1, $2) RETURNING phone_number, status',
      [phone, req.user.user_id]
    );
    res.status(201).json({ message: '注册成功', account: rows[0] });
  } catch (error) {
    console.error('注册错误:', error);
    res.status(500).json({ error: '注册失败' });
  }
};

// 获取当前用户账号 API
exports.getAccounts = async (req, res) => {
  if (!req.user || !req.user.user_id) {
    return res.status(401).json({ error: '用户未认证' });
  }

  try {
    const { rows } = await pool.query(`
      SELECT phone_number, status 
      FROM signal_accounts 
      WHERE user_id = $1
      ORDER BY last_active DESC
    `, [req.user.user_id]);

    res.json(rows);
  } catch (error) {
    console.error('数据库查询失败:', error.message);
    res.status(500).json({ error: '服务器错误' });
  }
};

// 更新账号状态 API
exports.updateAccount = async (req, res) => {
  const phone = req.params.number;
  const { status } = req.body;
  if (!phone || !status) {
    return res.status(400).json({ error: 'phone_number 和 status 为必填项' });
  }
  try {
    const { rows } = await pool.query(
      'UPDATE signal_accounts SET status = $1, last_active = CURRENT_TIMESTAMP WHERE phone_number = $2 RETURNING phone_number, status',
      [status, phone]
    );
    if (!rows || rows.length === 0) {
      return res.status(404).json({ error: '账号未找到' });
    }
    res.status(200).json({ message: '状态更新成功', account: rows[0] });
  } catch (error) {
    console.error('更新账号错误:', error);
    res.status(500).json({ error: '更新账号失败' });
  }
};