const express = require('express');
const cors = require('cors');
const accountRoutes = require('./routes/accounts');
const messageRoutes = require('./routes/messages');
const instanceRoutes = require('./routes/instances');
const contactRoutes = require('./routes/contacts'); // 新增
const logger = require('./utils/logger');
const rateLimit = require('./middleware/rateLimit');
const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const WebSocket = require('ws');
const client = require('prom-client'); // 新增
const { loadConfig, getConfig } = require('./configService');
require('dotenv').config();

const { registerAccount, loginAccount, getAccountStatus, refreshTokenEndpoint } = require('./accounts');
const { syncContacts, addContact, deleteContact, listContacts } = require('./contacts');
const { handleSearch, getSearchHistory } = require('./search');
const { createGroup, addMember, leaveGroup, removeMember, getUserGroups, getGroupMembers } = require('./groups');
const { handleWebhook } = require('./webhook');

const app = express();

app.use(cors({ origin: '*' }));
app.use(express.json());
app.use(rateLimit);

loadConfig();

// 数据库连接池
const pool = new Pool({
    host: getConfig('db').host,
    user: getConfig('db').user,
    password: getConfig('db').password,
    database: getConfig('db').database,
    port: getConfig('db').port
});

// WebSocket server on port 8081
const wss = new WebSocket.Server({ port: 8081 });

client.collectDefaultMetrics();       // 新增

// 注册账号 API
app.post('/v1/register', async (req, res) => {
    const { phone_number } = req.body;
    try {
        // 调用 Signal-CLI REST API 注册号码
        await axios.post(`${process.env.SIGNAL_CLI_URL}/v1/register`, { number: phone_number });
        const hashedPassword = await bcrypt.hash('default_password', 10);
        const { rows } = await pool.query(
            'INSERT INTO signal_accounts (phone_number, password) VALUES ($1, $2) RETURNING phone_number',
            [phone_number, hashedPassword]
        );
        res.status(201).json({ phone_number: rows[0].phone_number });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 用户登录 API（确保使用更新后的 loginAccount 实现）
app.post('/v1/login', loginAccount);

// 新增刷新 Token 接口
app.post('/v1/accounts/refresh', refreshTokenEndpoint);

// 示例：基于角色的接口（仅 admin 可调用）
app.post('/v1/accounts/batch-create', authMiddleware, (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: '无权执行此操作' });
  }
  // ...existing batch-create 逻辑...
});

// Send message endpoint
app.post('/v1/messages', async (req, res) => {
    const { sender_phone, recipient, group_id, content, type } = req.body;

    // Validate input
    if (!sender_phone || !content || !type || (!recipient && !group_id)) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    try {
        // Determine message target
        const isGroupMessage = !!group_id;
        const target = isGroupMessage ? group_id : recipient;

        // Find sender's Signal-CLI instance
        const { rows } = await pool.query(
            'SELECT instance_id FROM signal_accounts WHERE phone_number = $1',
            [sender_phone]
        );
        if (rows.length === 0) {
            return res.status(404).json({ error: 'Sender account not found' });
        }

        const instanceId = rows[0].instance_id;
        const signalCliUrl = `http://signal-api-${instanceId}:8080`;

        // Send message via Signal-CLI REST API
        const payload = {
            number: sender_phone,
            message: content,
            recipients: isGroupMessage ? [] : [recipient],
            group: isGroupMessage ? target : undefined,
        };
        await axios.post(`${signalCliUrl}/v2/send`, payload);

        // Store message in database
        const insertQuery = `
            INSERT INTO messages (sender_id, recipient_id, group_id, content, type, status)
            VALUES ($1, $2, $3, $4, $5, 'SENT')
            RETURNING id
        `;
        const { rows: inserted } = await pool.query(insertQuery, [
            sender_phone,
            isGroupMessage ? null : recipient,
            isGroupMessage ? group_id : null,
            content,
            type,
        ]);

        res.status(201).json({ id: inserted[0].id });
    } catch (error) {
        // Store failed message attempt
        await pool.query(
            'INSERT INTO messages (sender_id, recipient_id, group_id, content, type, status) VALUES ($1, $2, $3, $4, $5, $6)',
            [sender_phone, recipient || null, group_id || null, content, type, 'FAILED']
        );
        res.status(500).json({ error: error.message });
    }
});

// Webhook endpoint for receiving messages
app.post('/v1/webhook', handleWebhook);

// 同步联系人
app.post('/v1/contacts/sync', async (req, res) => {
  const { phone_number } = req.body;
  if (!phone_number || !phone_number.match(/^\+\d{10,15}$/)) {
    return res.status(400).json({ error: '无效的电话号码' });
  }
  try {
    const { rows } = await pool.query(
      'SELECT instance_id FROM signal_accounts WHERE phone_number = $1',
      [phone_number]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: '账号未找到' });
    }
    const instanceId = rows[0].instance_id;
    const signalCliUrl = `http://signal-api-${instanceId}:8080`;
    const response = await axios.get(`${signalCliUrl}/v1/contacts/${phone_number}`);
    const contacts = response.data.contacts || [];

    // 根据需求选择是否清空旧记录
    await pool.query('DELETE FROM contacts WHERE user_id = $1', [phone_number]);

    let count = 0;
    for (const contact of contacts) {
      await pool.query(
        'INSERT INTO contacts (user_id, contact_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
        [phone_number, contact.number]
      );
      count++;
    }
    res.status(200).json({ message: '联系人同步成功', count });
  } catch (error) {
    console.error('联系人同步错误:', error.message);
    res.status(500).json({ error: '联系人同步失败' });
  }
});

// 查看联系人列表
app.get('/v1/contacts', async (req, res) => {
  const { phone_number, limit = 10, offset = 0 } = req.query;
  if (!phone_number) {
    return res.status(400).json({ error: '电话号码为必填项' });
  }
  try {
    const countQuery = 'SELECT COUNT(*) FROM contacts WHERE user_id = $1';
    const listQuery = `
      SELECT contact_id, added_at
      FROM contacts
      WHERE user_id = $1
      ORDER BY added_at DESC
      LIMIT $2 OFFSET $3
    `;
    const countResult = await pool.query(countQuery, [phone_number]);
    const listResult = await pool.query(listQuery, [phone_number, limit, offset]);

    res.status(200).json({
      contacts: listResult.rows,
      total: parseInt(countResult.rows[0].count, 10)
    });
  } catch (error) {
    console.error('获取联系人错误:', error.message);
    res.status(500).json({ error: '获取联系人失败' });
  }
});

// 添加联系人
app.post('/v1/contacts', async (req, res) => {
  const { phone_number, contact_phone } = req.body;
  if (!phone_number || !contact_phone) {
    return res.status(400).json({ error: '电话号码和联系人号码为必填项' });
  }
  try {
    const { rows } = await pool.query(
      'SELECT instance_id FROM signal_accounts WHERE phone_number = $1',
      [phone_number]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: '账号未找到' });
    }
    const instanceId = rows[0].instance_id;
    const signalCliUrl = `http://signal-api-${instanceId}:8080`;

    await axios.post(`${signalCliUrl}/v1/contacts/${phone_number}`, {
      contact: contact_phone
    });

    await pool.query(
      'INSERT INTO contacts (user_id, contact_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [phone_number, contact_phone]
    );

    res.status(201).json({ message: '联系人添加成功' });
  } catch (error) {
    console.error('添加联系人错误:', error.message);
    res.status(500).json({ error: '联系人添加失败' });
  }
});

// 删除联系人
app.delete('/v1/contacts', async (req, res) => {
  const { phone_number, contact_phone } = req.body;
  if (!phone_number || !contact_phone) {
    return res.status(400).json({ error: '电话号码和联系人号码为必填项' });
  }
  try {
    const { rows } = await pool.query(
      'SELECT instance_id FROM signal_accounts WHERE phone_number = $1',
      [phone_number]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: '账号未找到' });
    }
    const instanceId = rows[0].instance_id;
    const signalCliUrl = `http://signal-api-${instanceId}:8080`;

    await axios.delete(`${signalCliUrl}/v1/contacts/${phone_number}`, {
      data: { contact: contact_phone }
    });

    await pool.query(
      'DELETE FROM contacts WHERE user_id = $1 AND contact_id = $2',
      [phone_number, contact_phone]
    );

    res.status(200).json({ message: '联系人删除成功' });
  } catch (error) {
    console.error('删除联系人错误:', error.message);
    res.status(500).json({ error: '联系人删除失败' });
  }
});

// 搜索 API
app.get('/v1/search', async (req, res) => {
  const { phone_number, query, type, limit = 10, offset = 0 } = req.query;
  if (!phone_number || !query || !type) {
    return res.status(400).json({ error: '电话号码、搜索关键词和类型为必填项' });
  }
  if (!['CONTACT', 'GROUP', 'MESSAGE'].includes(type)) {
    return res.status(400).json({ error: '无效的搜索类型' });
  }

  try {
    let totalQuery, listQuery;

    switch (type) {
      case 'CONTACT':
        totalQuery = 'SELECT COUNT(*) FROM contacts WHERE user_id = $1 AND contact_id ILIKE $2';
        listQuery = `
          SELECT contact_id, added_at
          FROM contacts
          WHERE user_id = $1 AND contact_id ILIKE $2
          ORDER BY added_at DESC
          LIMIT $3 OFFSET $4
        `;
        break;
      case 'GROUP':
        totalQuery = `
          SELECT COUNT(*) 
          FROM group_members gm
          JOIN groups g ON gm.group_id = g.id
          WHERE gm.user_id = $1 AND g.name ILIKE $2
        `;
        listQuery = `
          SELECT g.id AS group_id, g.name, gm.joined_at
          FROM group_members gm
          JOIN groups g ON gm.group_id = g.id
          WHERE gm.user_id = $1 AND g.name ILIKE $2
          ORDER BY gm.joined_at DESC
          LIMIT $3 OFFSET $4
        `;
        break;
      case 'MESSAGE':
        totalQuery = `
          SELECT COUNT(*)
          FROM messages
          WHERE (sender_id = $1 OR recipient_id = $1) AND content ILIKE $2
        `;
        listQuery = `
          SELECT id, sender_id, recipient_id, group_id, content, type, status, timestamp
          FROM messages
          WHERE (sender_id = $1 OR recipient_id = $1) AND content ILIKE $2
          ORDER BY timestamp DESC
          LIMIT $3 OFFSET $4
        `;
        break;
    }

    const totalResult = await pool.query(totalQuery, [phone_number, `%${query}%`]);
    const listResult = await pool.query(listQuery, [phone_number, `%${query}%`, limit, offset]);
    const results = listResult.rows.map(row => ({ type, ...row }));

    const insertSearchQuery = `
      INSERT INTO search_history (phone_number, search_query, search_type, search_results)
      VALUES ($1, $2, $3, $4)
      RETURNING search_id
    `;
    const { rows: searchRows } = await pool.query(insertSearchQuery, [
      phone_number,
      query,
      type,
      JSON.stringify(results)
    ]);

    res.status(200).json({
      results,
      total: parseInt(totalResult.rows[0].count, 10),
      search_id: searchRows[0].search_id
    });
  } catch (error) {
    console.error('搜索错误:', error.message);
    res.status(500).json({ error: '搜索失败' });
  }
});

// 查看搜索历史 API
app.get('/v1/search/history', async (req, res) => {
  const { phone_number, limit = 10, offset = 0 } = req.query;
  if (!phone_number) {
    return res.status(400).json({ error: '电话号码为必填项' });
  }
  try {
    const totalQuery = 'SELECT COUNT(*) FROM search_history WHERE phone_number = $1';
    const listQuery = `
      SELECT search_id, search_query, search_type, search_results, timestamp
      FROM search_history
      WHERE phone_number = $1
      ORDER BY timestamp DESC
      LIMIT $2 OFFSET $3
    `;
    const totalResult = await pool.query(totalQuery, [phone_number]);
    const listResult = await pool.query(listQuery, [phone_number, limit, offset]);

    res.status(200).json({
      history: listResult.rows,
      total: parseInt(totalResult.rows[0].count, 10)
    });
  } catch (error) {
    console.error('获取搜索历史错误:', error.message);
    res.status(500).json({ error: '获取搜索历史失败' });
  }
});

// 使用 contacts 路由
app.use('/v1/contacts', contactRoutes);

// 联系人管理路由
app.post('/v1/contacts/sync', authMiddleware, syncContacts);
app.post('/v1/contacts', authMiddleware, addContact);
app.delete('/v1/contacts', authMiddleware, deleteContact);
app.get('/v1/contacts', authMiddleware, listContacts);

// 添加搜索模块路由（通过 JWT 保护）
app.get('/v1/search', authMiddleware, handleSearch);
app.get('/v1/search/history', authMiddleware, getSearchHistory);

// 群组管理路由
app.post('/v1/groups', authMiddleware, createGroup);
app.post('/v1/groups/members/add', authMiddleware, addMember);
app.delete('/v1/groups/members/remove', authMiddleware, removeMember);
app.post('/v1/groups/leave', authMiddleware, leaveGroup);
app.get('/v1/groups', authMiddleware, getUserGroups);
app.get('/v1/groups/:groupId/members', authMiddleware, getGroupMembers);

// Log WebSocket connections
wss.on('connection', (ws) => {
    console.log('New WebSocket client connected');
    ws.on('close', () => console.log('WebSocket client disconnected'));
});

app.use('/v1/accounts', accountRoutes);
app.use('/v1/messages', messageRoutes);
app.use('/v1/instances', instanceRoutes);

app.get('/metrics', async (req, res) => {
  res.set('Content-Type', client.register.contentType);
  res.end(await client.register.metrics());
});

app.use((err, req, res, next) => {
    logger.error(err.stack);
    res.status(500).json({ error: '服务器错误' });
});

const PORT = getConfig('server').port || process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Backend server running on port ${PORT}`));
