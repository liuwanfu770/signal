const express = require('express');
const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');
const winston = require('winston');
const WebSocket = require('ws');
require('dotenv').config();

const app = express();
app.use(express.json());

/**
 * 日志记录器配置
 * - error.log 记录错误日志
 * - combined.log 记录所有操作日志
 */
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
    ),
    transports: [
        new winston.transports.File({ filename: 'error.log', level: 'error' }),
        new winston.transports.File({ filename: 'combined.log' })
    ]
});

/**
 * 数据库连接池配置
 * 确保 .env 文件中设置正确的数据库连接参数
 */
const pool = new Pool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: 5432
});

/**
 * 初始化 WebSocket 服务器，用于实时推送消息状态更新
 * 建议单独运行一个实例，端口设置为 8081
 */
const wss = new WebSocket.Server({ port: 8081 });

/**
 * 请求限流配置
 * 防止恶意刷请求，每个 IP 在 15 分钟内最多 100 次请求
 */
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: '请求过于频繁，请 15 分钟后再试'
});
app.use('/v1/', limiter);

/**
 * JWT 认证中间件
 * 提取 Authorization 头部的 Bearer Token 进行验证
 */
const authenticateToken = (req, res, next) => {
    const token = req.headers['authorization']?.split(' ')[1];
    if (!token) {
        logger.warn('未提供认证令牌', { ip: req.ip });
        return res.status(401).json({ error: '未授权访问' });
    }
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        logger.error('JWT 验证错误:', { error: error.message, ip: req.ip });
        return res.status(403).json({ error: '认证令牌无效' });
    }
};

/**
 * 登录 API（无需认证）
 * 验证用户名密码后生成 JWT Token，返回给前端
 */
app.post('/v1/login', [
    body('username').notEmpty().withMessage('用户名不能为空'),
    body('password').notEmpty().withMessage('密码不能为空')
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { username, password } = req.body;
    try {
        const { rows } = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
        if (rows.length === 0) {
            logger.warn('登录尝试失败 - 用户不存在', { username, ip: req.ip });
            return res.status(401).json({ error: '用户名或密码错误' });
        }
        const user = rows[0];
        const match = await bcrypt.compare(password, user.password);
        if (!match) {
            logger.warn('登录尝试失败 - 密码错误', { username, ip: req.ip });
            return res.status(401).json({ error: '用户名或密码错误' });
        }
        // 生成 JWT Token，1 小时后过期
        const token = jwt.sign(
            { user_id: user.id, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );
        logger.info('用户登录成功', { username, ip: req.ip });
        res.status(200).json({
            token,
            username: user.username,
            role: user.role,
            message: '登录成功'
        });
    } catch (error) {
        logger.error('登录错误:', { error: error.message, ip: req.ip });
        res.status(500).json({ error: '登录失败，请稍后重试' });
    }
});

// 示例：注册 API（需要认证）
app.post('/v1/register', authenticateToken, [
    body('phone_number').matches(/^\+\d{10,15}$/).withMessage('无效的电话号码')
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { phone_number } = req.body;
    try {
        await axios.post(`${process.env.SIGNAL_CLI_URL}/v1/register`, { number: phone_number });
        const { rows } = await pool.query(
            'INSERT INTO signal_accounts (phone_number, user_id) VALUES ($1, $2) RETURNING phone_number',
            [phone_number, req.user.user_id]
        );
        logger.info('账号注册成功', { phone_number, user_id: req.user.user_id, ip: req.ip });
        res.status(201).json({
            message: '账号注册已成功发起，请完成 Signal-CLI 验证',
            phone_number: rows[0].phone_number
        });
    } catch (error) {
        logger.error('注册错误:', { error: error.message, phone_number, ip: req.ip });
        res.status(500).json({ error: '账号注册失败，请稍后重试' });
    }
});

// 发送消息 API
app.post('/v1/messages', authenticateToken, [
    body('sender_phone').matches(/^\+\d{10,15}$/).withMessage('无效的电话号码'),
    body('content').notEmpty().withMessage('消息内容不能为空'),
    body('type').notEmpty().withMessage('消息类型不能为空'),
    body('recipient').optional().matches(/^\+\d{10,15}$/).withMessage('无效的收件人电话号码'),
    body('group_id').optional().isUUID().withMessage('无效的群组 ID')
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { sender_phone, recipient, group_id, content, type } = req.body;
    try {
        const { rows } = await pool.query(
            'SELECT instance_id FROM signal_accounts WHERE phone_number = $1',
            [sender_phone]
        );
        if (rows.length === 0) {
            return res.status(404).json({ error: '发送者账号未找到' });
        }
        const instanceId = rows[0].instance_id;
        const signalCliUrl = `http://signal-api-${instanceId}:8080`;

        const payload = {
            number: sender_phone,
            message: content,
            recipients: group_id ? [] : [recipient],
            group: group_id || undefined
        };
        await axios.post(`${signalCliUrl}/v2/send`, payload);

        const insertQuery = `
            INSERT INTO messages (sender_id, recipient_id, group_id, content, type, status)
            VALUES ($1, $2, $3, $4, $5, 'SENT')
            RETURNING id
        `;
        const { rows: inserted } = await pool.query(insertQuery, [
            sender_phone,
            recipient || null,
            group_id || null,
            content,
            type
        ]);

        res.status(201).json({ id: inserted[0].id, message: '消息发送成功' });
    } catch (error) {
        logger.error('消息发送错误:', { error: error.message, sender_phone, ip: req.ip });
        res.status(500).json({ error: '消息发送失败' });
    }
});

// 获取消息列表 API
app.get('/v1/messages', authenticateToken, [
    body('sender_phone').optional().matches(/^\+\d{10,15}$/).withMessage('无效的电话号码'),
    body('recipient_phone').optional().matches(/^\+\d{10,15}$/).withMessage('无效的电话号码'),
    body('group_id').optional().isUUID().withMessage('无效的群组 ID')
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { sender_phone, recipient_phone, group_id } = req.query;
    try {
        const messages = await messageService.listMessages({ sender_phone, recipient_phone, group_id });
        res.status(200).json(messages);
    } catch (error) {
        logger.error('查询消息列表错误:', { error: error.message, ip: req.ip });
        res.status(500).json({ error: '获取消息列表失败' });
    }
});

// 群组创建 API
app.post('/v1/groups', authenticateToken, [
    body('creator_phone').matches(/^\+\d{10,15}$/).withMessage('无效的电话号码'),
    body('group_name').notEmpty().withMessage('群组名称不能为空'),
    body('members').isArray().withMessage('成员列表必须是数组')
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { creator_phone, group_name, members } = req.body;
    try {
        // 查找创建者的 Signal-CLI 实例
        const { rows } = await pool.query(
            'SELECT instance_id FROM signal_accounts WHERE phone_number = $1',
            [creator_phone]
        );
        if (rows.length === 0) {
            return res.status(404).json({ error: '创建者账户未找到' });
        }

        const instanceId = rows[0].instance_id;
        const signalCliUrl = `http://signal-api-${instanceId}:8080`;

        // 通过 Signal-CLI REST API 创建群组
        const groupResponse = await axios.post(`${signalCliUrl}/v1/groups`, {
            number: creator_phone,
            name: group_name,
            members: members
        });
        const groupId = groupResponse.data.groupId;

        // 将群组保存到数据库
        await pool.query(
            'INSERT INTO groups (id, name, owner_id) VALUES ($1, $2, $3)',
            [groupId, group_name, creator_phone]
        );

        // 保存成员（包括创建者）
        const insertMembers = `
            INSERT INTO group_members (group_id, user_id, role)
            VALUES ($1, $2, 'MEMBER')
        `;
        for (const member of [...members, creator_phone]) {
            await pool.query(insertMembers, [groupId, member]);
        }

        res.status(201).json({ groupId });
    } catch (error) {
        logger.error('群组创建错误:', { error: error.message, creator_phone, ip: req.ip });
        res.status(500).json({ error: '群组创建失败' });
    }
});

// 群组邀请 API
app.post('/v1/groups/:groupId/invite', authenticateToken, [
    body('inviter_phone').matches(/^\+\d{10,15}$/).withMessage('无效的电话号码'),
    body('invitees').isArray().withMessage('邀请列表必须是数组')
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { groupId } = req.params;
    const { inviter_phone, invitees } = req.body;
    try {
        // 验证邀请者是否为群组成员
        const { rows: members } = await pool.query(
            'SELECT instance_id FROM group_members WHERE group_id = $1 AND user_id = $2',
            [groupId, inviter_phone]
        );
        if (members.length === 0) {
            return res.status(403).json({ error: '无权限邀请' });
        }

        const signalCliUrl = `http://signal-api-${members[0].instance_id}:8080`;
        await axios.post(`${signalCliUrl}/v1/groups/${groupId}/invite`, {
            number: inviter_phone,
            invitees: invitees
        });

        // 将被邀请者添加到数据库（状态为 INVITED）
        const insertInvitees = `
            INSERT INTO group_members (group_id, user_id, role, status)
            VALUES ($1, $2, 'MEMBER', 'INVITED')
        `;
        for (const invitee of invitees) {
            await pool.query(insertInvitees, [groupId, invitee]);
        }

        res.status(200).json({ message: '邀请已发送' });
    } catch (error) {
        logger.error('群组邀请错误:', { error: error.message, inviter_phone, ip: req.ip });
        res.status(500).json({ error: '群组邀请失败' });
    }
});

// 添加群组成员 API
app.post('/v1/groups/:groupId/members', authenticateToken, [
    body('user_id').matches(/^\+\d{10,15}$/).withMessage('无效的电话号码'),
    body('role').optional().isIn(['MEMBER', 'ADMIN']).withMessage('无效的角色')
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { groupId } = req.params;
    const { user_id, role } = req.body;
    try {
        await pool.query(
            'INSERT INTO group_members (group_id, user_id, role) VALUES ($1, $2, $3)',
            [groupId, user_id, role || 'MEMBER']
        );
        res.status(201).json({ message: '成员已添加' });
    } catch (error) {
        logger.error('添加成员错误:', { error: error.message, groupId, user_id, ip: req.ip });
        res.status(500).json({ error: '添加成员失败，请稍后重试' });
    }
});

// 添加联系人 API
// Duplicate route handler removed

// 搜索历史记录 API
app.post('/v1/search', authenticateToken, [
    body('phone_number').matches(/^\+\d{10,15}$/).withMessage('无效的电话号码'),
    body('search_query').notEmpty().withMessage('搜索关键词不能为空'),
    body('search_results').isArray().withMessage('搜索结果必须是数组')
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { phone_number, search_query, search_results } = req.body;
    try {
        await pool.query(
            'INSERT INTO search_history (phone_number, search_query, search_results) VALUES ($1, $2, $3)',
            [phone_number, search_query, search_results]
        );
        res.status(201).json({ message: '搜索历史已记录' });
    } catch (error) {
        logger.error('记录搜索历史错误:', { error: error.message, phone_number, ip: req.ip });
        res.status(500).json({ error: '记录搜索历史失败，请稍后重试' });
    }
});

// Webhook 端点
app.post('/v1/webhook', async (req, res) => {
    const { account, envelope } = req.body;
    const { source, dataMessage } = envelope;
    const content = dataMessage.message;
    try {
        // 存储接收到的消息
        const insertQuery = `
            INSERT INTO messages (sender_id, recipient_id, content, type, status)
            VALUES ($1, $2, $3, 'TEXT', 'RECEIVED')
        `;
        await pool.query(insertQuery, [source, account, content]);

        // 推送到 WebSocket 客户端
        wss.clients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify({ type: 'new_message', data: { sender: source, recipient: account, content } }));
            }
        });

        res.status(200).send('Webhook received');
    } catch (error) {
        logger.error('Webhook 处理错误:', { error: error.message, ip: req.ip });
        res.status(500).json({ error: error.message });
    }
});

// 启动服务
app.listen(3000, () => console.log('后端服务运行在端口 3000'));

app.post('/v1/groups/:group_id/join', authenticateToken, [
    body('phone_number').matches(/^\+\d{10,15}$/).withMessage('无效的电话号码')
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { group_id } = req.params;
    const { phone_number } = req.body;
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

        await axios.post(`${signalCliUrl}/v1/groups/${phone_number}/${group_id}`, {
            action: 'join'
        });

        await pool.query(
            'INSERT INTO group_members (group_id, user_id, role) VALUES ($1, $2, \'MEMBER\') ON CONFLICT DO NOTHING',
            [group_id, phone_number]
        );

        res.status(200).json({ message: '加入群组成功' });
    } catch (error) {
        logger.error('加入群组错误:', { error: error.message, group_id, phone_number, ip: req.ip });
        res.status(500).json({ error: '加入群组失败' });
    }
});

app.post('/v1/contacts/sync', authenticateToken, [
    body('phone_number').matches(/^\+\d{10,15}$/).withMessage('无效的电话号码')
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { phone_number } = req.body;
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

        // 调用 Signal-CLI 获取联系人
        const response = await axios.get(`${signalCliUrl}/v1/contacts/${phone_number}`);
        const contacts = response.data.contacts || [];

        // 清空现有联系人（可选，根据需求可保留历史数据）
        await pool.query('DELETE FROM contacts WHERE user_id = $1', [phone_number]);

        // 插入新联系人
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
        logger.error('联系人同步错误:', { error: error.message, phone_number, ip: req.ip });
        res.status(500).json({ error: '联系人同步失败' });
    }
});
        `;
        const countResult = await pool.query(countQuery, [phone_number]);
        const listResult = await pool.query(listQuery, [phone_number, limit, offset]);

        res.status(200).json({
            contacts: listResult.rows,
            total: parseInt(countResult.rows[0].count, 10)
        });
    } catch (error) {
        logger.error('获取联系人错误:', { error: error.message, phone_number, ip: req.ip });
        res.status(500).json({ error: '获取联系人失败' });
    }
});

app.post('/v1/contacts', authenticateToken, [
    body('phone_number').matches(/^\+\d{10,15}$/).withMessage('无效的电话号码'),
    body('contact_phone').matches(/^\+\d{10,15}$/).withMessage('无效的联系人电话号码')
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { phone_number, contact_phone } = req.body;
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

        // 添加联系人
        await axios.post(`${signalCliUrl}/v1/contacts/${phone_number}`, {
            contact: contact_phone
        });

        await pool.query(
            'INSERT INTO contacts (user_id, contact_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
            [phone_number, contact_phone]
        );

        res.status(201).json({ message: '联系人添加成功' });
    } catch (error) {
        logger.error('添加联系人错误:', { error: error.message, phone_number, contact_phone, ip: req.ip });
        res.status(500).json({ error: '联系人添加失败' });
    }
});

app.delete('/v1/contacts', authenticateToken, [
    body('phone_number').matches(/^\+\d{10,15}$/).withMessage('无效的电话号码'),
    body('contact_phone').matches(/^\+\d{10,15}$/).withMessage('无效的联系人电话号码')
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { phone_number, contact_phone } = req.body;
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

        // 删除联系人
        await axios.delete(`${signalCliUrl}/v1/contacts/${phone_number}`, {
            data: { contact: contact_phone }
        });

        await pool.query(
            'DELETE FROM contacts WHERE user_id = $1 AND contact_id = $2',
            [phone_number, contact_phone]
        );

        res.status(200).json({ message: '联系人删除成功' });
    } catch (error) {
        logger.error('删除联系人错误:', { error: error.message, phone_number, contact_phone, ip: req.ip });
        res.status(500).json({ error: '联系人删除失败' });
    }
});

app.get('/v1/search', authenticateToken, [
    body('phone_number').matches(/^\+\d{10,15}$/).withMessage('无效的电话号码'),
    body('query').notEmpty().withMessage('搜索关键词不能为空'),
    body('type').isIn(['CONTACT', 'GROUP', 'MESSAGE']).withMessage('无效的搜索类型'),
    body('limit').optional().isInt({ min: 1 }).withMessage('无效的限制'),
    body('offset').optional().isInt({ min: 0 }).withMessage('无效的偏移量')
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { phone_number, query, type, limit = 10, offset = 0 } = req.query;
    try {
        let results = [];
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
                    SELECT COUNT(*) FROM group_members gm
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
                    SELECT COUNT(*) FROM messages
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

        results = listResult.rows.map(row => ({ type, ...row }));

        // 存储搜索历史
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
        logger.error('搜索错误:', { error: error.message, phone_number, ip: req.ip });
        res.status(500).json({ error: '搜索失败' });
    }
});

app.get('/v1/search/history', authenticateToken, [
    body('phone_number').matches(/^\+\d{10,15}$/).withMessage('无效的电话号码'),
    body('limit').optional().isInt({ min: 1 }).withMessage('无效的限制'),
    body('offset').optional().isInt({ min: 0 }).withMessage('无效的偏移量')
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { phone_number, limit = 10, offset = 0 } = req.query;
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
        logger.error('获取搜索历史错误:', { error: error.message, phone_number, ip: req.ip });
        res.status(500).json({ error: '获取搜索历史失败' });
    }
});

// 更新消息状态 API
app.patch('/v1/messages/:id/status', authenticateToken, [
    body('phone_number').matches(/^\+\d{10,15}$/).withMessage('无效的电话号码'),
    body('status').isIn(['SENT', 'DELIVERED', 'READ']).withMessage('无效的状态值')
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { phone_number, status } = req.body;
    try {
        // 验证用户是否有权限更新该消息状态
        const { rows } = await pool.query(
            'SELECT sender_id, recipient_id FROM messages WHERE id = $1',
            [id]
        );
        if (rows.length === 0) {
            return res.status(404).json({ error: '消息未找到' });
        }
        const message = rows[0];
        if (message.sender_id !== phone_number && message.recipient_id !== phone_number) {
            logger.warn('无权限更新消息状态', { user_id: req.user.user_id, message_id: id, ip: req.ip });
            return res.status(403).json({ error: '无权限更新此消息状态' });
        }

        // 更新消息状态
        const updateQuery = `
            UPDATE messages
            SET status = $1, timestamp = CURRENT_TIMESTAMP
            WHERE id = $2
            RETURNING id, status
        `;
        const { rows: updated } = await pool.query(updateQuery, [status, id]);

        // 通过 WebSocket 推送状态更新
        const updateData = {
            id: updated[0].id,
            status: updated[0].status,
            timestamp: new Date().toISOString()
        };
        wss.clients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify({ type: 'status_update', data: updateData }));
            }
        });

        logger.info('消息状态更新成功', { message_id: id, status, user_id: req.user.user_id, ip: req.ip });
        res.status(200).json({
            message: '消息状态更新成功',
            id: updated[0].id,
            status: updated[0].status
        });
    } catch (error) {
        logger.error('消息状态更新错误:', { error: error.message, message_id: id, ip: req.ip });
        res.status(500).json({ error: '消息状态更新失败' });
    }
});

// Webhook 接收消息（扩展支持状态更新）
app.post('/v1/webhook', async (req, res) => {
    const { account, envelope } = req.body;
    if (!account || !envelope || !envelope.source || !envelope.dataMessage) {
        return res.status(400).json({ error: '无效的 Webhook 数据' });
    }

    const { source, dataMessage } = envelope;
    const { message: content, groupInfo, receipt } = dataMessage;
    const groupId = groupInfo ? groupInfo.groupId : null;
    const type = groupInfo ? 'GROUP' : 'TEXT';

    try {
        let messageId;

        if (receipt) {
            // 处理消息回执（如 DELIVERED 或 READ）
            const { status: receiptStatus } = receipt;
            const updateQuery = `
                UPDATE messages
                SET status = $1, timestamp = CURRENT_TIMESTAMP
                WHERE sender_id = $2 AND recipient_id = $3 AND content = $4
                RETURNING id, status
            `;
            const { rows } = await pool.query(updateQuery, [receiptStatus, source, account, content]);
            if (rows.length > 0) {
                messageId = rows[0].id;
                const updateData = {
                    id: rows[0].id,
                    status: rows[0].status,
                    timestamp: new Date().toISOString()
                };
                wss.clients.forEach(client => {
                    if (client.readyState === WebSocket.OPEN) {
                        client.send(JSON.stringify({ type: 'status_update', data: updateData }));
                    }
                });
            }
        } else {
            // 存储新消息
            const insertQuery = `
                INSERT INTO messages (sender_id, recipient_id, group_id, content, type, status)
                VALUES ($1, $2, $3, $4, $5, 'RECEIVED')
                RETURNING id
            `;
            const { rows } = await pool.query(insertQuery, [source, groupId ? null : account, groupId, content, type]);
            messageId = rows[0].id;
        }

        // 推送新消息
        const messageData = {
            id: messageId,
            sender: source,
            recipient: groupId ? null : account,
            group_id: groupId,
            content,
            type,
            status: 'RECEIVED',
            timestamp: new Date().toISOString()
        };
        wss.clients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify({ type: 'new_message', data: messageData }));
            }
        });

        res.status(200).json({ message: 'Webhook 接收成功' });
    } catch (error) {
        logger.error('Webhook 处理错误:', { error: error.message, ip: req.ip });
        res.status(500).json({ error: 'Webhook 处理失败' });
    }
});

// 启动服务
app.listen(3000, () => console.log('后端服务运行在端口 3000'));
