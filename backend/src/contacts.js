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

async function syncContacts(req, res) {
  // 从 JWT 中获取当前用户信息（user_id 和 phone_number）
  const { user_id, phone_number } = req.user;
  try {
    // 从 Signal-CLI 获取联系人
    const resp = await axios.get(`${SIGNAL_CLI_URL}/v1/contacts/${phone_number}`);
    const remoteContacts = resp.data.contacts || [];

    // 清空当前用户的本地联系人记录
    await pool.query('DELETE FROM contacts WHERE user_id = $1', [user_id]);

    // 插入同步来的联系人记录（这里采用 contact_phone 存储号码）
    for (const c of remoteContacts) {
      const contactPhone = c.number; // Signal-CLI 返回号码字段
      await pool.query(
        `INSERT INTO contacts (user_id, contact_phone)
         VALUES ($1, $2)
         ON CONFLICT DO NOTHING`,
        [user_id, contactPhone]
      );
    }
    res.json({ message: '联系人同步成功', count: remoteContacts.length });
  } catch (error) {
    console.error('syncContacts error:', error.message);
    res.status(500).json({ error: '联系人同步失败' });
  }
}

async function addContact(req, res) {
  const { user_id, phone_number } = req.user;
  const { contact_phone } = req.body;
  if (!contact_phone) {
    return res.status(400).json({ error: 'contact_phone 为必填' });
  }
  try {
    // 可选：调用 Signal-CLI 接口添加联系人
    await axios.post(`${SIGNAL_CLI_URL}/v1/contacts/${phone_number}`, {
      contact: contact_phone
    });
    // 写入数据库
    await pool.query(
      `INSERT INTO contacts (user_id, contact_phone)
       VALUES ($1, $2)
       ON CONFLICT DO NOTHING`,
      [user_id, contact_phone]
    );
    res.status(201).json({ message: '联系人添加成功' });
  } catch (error) {
    console.error('addContact error:', error.message);
    res.status(500).json({ error: '联系人添加失败' });
  }
}

async function deleteContact(req, res) {
  const { user_id, phone_number } = req.user;
  const { contact_phone } = req.body;
  if (!contact_phone) {
    return res.status(400).json({ error: 'contact_phone 为必填' });
  }
  try {
    // 调用 Signal-CLI 删除联系人
    await axios.delete(`${SIGNAL_CLI_URL}/v1/contacts/${phone_number}`, {
      data: { contact: contact_phone }
    });
    // 删除数据库中记录
    await pool.query(
      'DELETE FROM contacts WHERE user_id = $1 AND contact_phone = $2',
      [user_id, contact_phone]
    );
    res.json({ message: '联系人删除成功' });
  } catch (error) {
    console.error('deleteContact error:', error.message);
    res.status(500).json({ error: '联系人删除失败' });
  }
}

async function listContacts(req, res) {
  const { user_id } = req.user;
  const { limit = 10, offset = 0 } = req.query;
  try {
    const totalResult = await pool.query(
      'SELECT COUNT(*) FROM contacts WHERE user_id = $1',
      [user_id]
    );
    const listResult = await pool.query(
      `SELECT contact_phone, added_at
       FROM contacts
       WHERE user_id = $1
       ORDER BY added_at DESC
       LIMIT $2 OFFSET $3`,
      [user_id, limit, offset]
    );
    res.json({
      contacts: listResult.rows,
      total: parseInt(totalResult.rows[0].count, 10)
    });
  } catch (error) {
    console.error('listContacts error:', error.message);
    res.status(500).json({ error: '获取联系人失败' });
  }
}

module.exports = {
  syncContacts,
  addContact,
  deleteContact,
  listContacts
};
