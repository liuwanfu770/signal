const express = require('express');
const router = express.Router();
const { Pool } = require('pg');
const axios = require('axios');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: 5432
});

// 同步联系人
router.post('/sync', async (req, res) => {
  const { phone_number } = req.body;
  try {
    console.log(`同步联系人: ${phone_number}`);
    const { rows } = await pool.query('SELECT instance_id FROM signal_accounts WHERE phone_number = $1', [phone_number]);
    if (!rows.length) return res.status(404).json({ error: '账户未找到' });

    const instanceId = rows[0].instance_id;
    const signalCliUrl = `${process.env.SIGNAL_CLI_URL}/v1/contacts`;
    const response = await axios.get(signalCliUrl, { params: { number: phone_number } });
    const contacts = response.data;

    for (const contact of contacts) {
      await pool.query('INSERT INTO contacts (user_id, contact_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [phone_number, contact.phone_number]);
    }
    res.json({ message: '联系人同步成功' });
  } catch (error) {
    console.error(`同步失败: ${error.message}`);
    res.status(500).json({ error: 'Signal-CLI API 调用失败' });
  }
});

// 查看联系人
router.get('/', async (req, res) => {
  const { phone_number } = req.query;
  try {
    const { rows } = await pool.query('SELECT contact_id FROM contacts WHERE user_id = $1', [phone_number]);
    res.json(rows.map(row => row.contact_id));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
