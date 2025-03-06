const express = require('express');
const { Pool } = require('pg');
require('dotenv').config();

const app = express();
app.use(express.json());

// 数据库连接池
const pool = new Pool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: 5432
});

// 处理收到的新消息事件
async function handleIncomingMessage(envelope) {
  // envelope 包含 source、timestamp、dataMessage 等字段
  const sourcePhone = envelope.source;
  const content = envelope.dataMessage?.message || '';
  const groupId = envelope.dataMessage?.groupInfo?.groupId || null;
  
  // 根据系统，尝试查找发送者对应的用户 ID
  let senderId = null;
  const senderRes = await pool.query('SELECT id FROM users WHERE phone_number = $1', [sourcePhone]);
  if (senderRes.rows.length > 0) {
    senderId = senderRes.rows[0].id;
  }
  
  // 如果消息为群消息，则尝试在 groups 表中找到对应记录，映射为 dbGroupId
  let dbGroupId = null;
  if (groupId) {
    const gRes = await pool.query('SELECT id FROM groups WHERE group_id = $1', [groupId]);
    if (gRes.rows.length > 0) {
      dbGroupId = gRes.rows[0].id;
    }
  }
  // 修改插入语句：使用 nullif 将空字符串转换为 null，并转换为 int 类型
  const insQuery = `
    INSERT INTO messages (sender_id, content, status, timestamp, group_id)
    VALUES ($1, $2, 'RECEIVED', to_timestamp($3/1000), nullif($4, '')::int)
    RETURNING id
  `;
  const nowTs = envelope.timestamp; 
  await pool.query(insQuery, [
    senderId,
    content,
    nowTs,
    dbGroupId
  ]);
}

async function handleWebhook(req, res) {
  // Signal-CLI 回调事件示例：
  // {
  //   "account": "+1112223333",
  //   "envelope": {
  //      "source": "+1234567890",
  //      "timestamp": 1678886400000,
  //      "dataMessage": { "message": "Hello!", "groupInfo": {"groupId": "group.abcdef123456"} }
  //   }
  // }
  const body = req.body;
  if (!body.envelope || !body.account) {
    return res.status(400).json({ error: 'invalid webhook payload' });
  }
  try {
    const envelope = body.envelope;
    if (envelope.dataMessage) {
      // 处理新消息事件
      await handleIncomingMessage(envelope);
    }
    // 占位：后续扩展处理其他事件，例如：
    // if (envelope.receiptMessage) { ... }
    // if (envelope.typingMessage) { ... }
    // if (envelope.groupUpdate) { ... }

    res.json({ message: 'webhook received' });
  } catch (err) {
    console.error('handleWebhook error:', err.message);
    res.status(500).json({ error: 'webhook processing error' });
  }
}

app.post('/v1/webhook', handleWebhook);

app.listen(3001, () => console.log('Webhook server running on port 3001'));
