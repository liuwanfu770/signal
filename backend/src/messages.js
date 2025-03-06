const { Pool } = require('pg');
const axios = require('axios');

const pool = new Pool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: 5432
});

const SIGNAL_CLI_URL = process.env.SIGNAL_CLI_URL || 'http://localhost:8080';

// 发送消息 - 单聊示例
async function sendMessage(req, res) {
  const { recipient_phone, content } = req.body;
  const { user_id, phone_number } = req.user; // JWT 中解析出的用户信息

  if (!recipient_phone || !content) {
    return res.status(400).json({ error: '缺少必填参数 recipient_phone/content' });
  }
  try {
    // 1) 查询当前用户ID
    // (已经在 JWT 里了, 可结合数据库做更多校验)
    // 2) 调用 signal-cli 发送
    await axios.post(`${SIGNAL_CLI_URL}/v2/send`, {
      number: phone_number,
      recipients: [recipient_phone],
      message: content
    });

    // 3) 记录到数据库
    const insertQuery = `
      INSERT INTO messages (sender_id, content, status, timestamp)
      VALUES ($1, $2, 'SENT', NOW())
      RETURNING id
    `;
    const { rows } = await pool.query(insertQuery, [user_id, content]);
    res.status(201).json({ message: '消息发送成功', message_id: rows[0].id });
  } catch (error) {
    console.error('sendMessage error:', error.message);

    // 写入一条FAILED记录
    await pool.query(
      'INSERT INTO messages (sender_id, content, status) VALUES ($1, $2, $3)',
      [user_id, content, 'FAILED']
    );
    res.status(500).json({ error: '消息发送失败' });
  }
}

module.exports = {
  sendMessage
};
