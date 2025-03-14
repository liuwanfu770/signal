const express = require('express');
const { body, validationResult } = require('express-validator');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { loginLimiter } = require('../middleware/rateLimit');
const responseHelper = require('../utils/responseHelper');
const { Pool } = require('pg');
require('dotenv').config();

const router = express.Router();
const pool = new Pool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: 5432
});

const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
    ),
    transports: [
        new winston.transports.Console(),
        new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
        new winston.transports.File({ filename: 'logs/combined.log' })
    ]
});

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: '登录/注册请求过于频繁，请稍后重试'
});

// ✅ 存储 refreshToken 到数据库
const storeRefreshToken = async (token, userId) => {
    await pool.query('INSERT INTO refresh_tokens (token, user_id) VALUES ($1, $2)', [token, userId]);
};

// ✅ 删除 refreshToken
const removeRefreshToken = async (token) => {
    await pool.query('DELETE FROM refresh_tokens WHERE token = $1', [token]);
};

// ✅ 检查 refreshToken 是否有效
const isRefreshTokenValid = async (token) => {
    const { rows } = await pool.query('SELECT * FROM refresh_tokens WHERE token = $1', [token]);
    return rows.length > 0;
};

// 🔹 用户登录
router.post('/login', loginLimiter, [
    body('username').notEmpty().withMessage('用户名不能为空').trim(),
    body('password').notEmpty().withMessage('密码不能为空').trim()
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return responseHelper.error(res, 400, errors.array());
    }

    const { username, password } = req.body;
    const { rows } = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
    if (rows.length === 0) {
        return responseHelper.error(res, 401, '用户名或密码错误');
    }

    const user = rows[0];
    const match = await bcrypt.compare(password, user.password);
    if (!match) {
        return responseHelper.error(res, 401, '用户名或密码错误');
    }

    const accessToken = jwt.sign(
        { user_id: user.id, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
    );

    responseHelper.success(res, { accessToken, username: user.username, role: user.role }, '登录成功');
});

// 🔹 刷新令牌
router.post('/token/refresh', authLimiter, async (req, res) => {
    const { refreshToken } = req.body;
    if (!refreshToken || !(await isRefreshTokenValid(refreshToken))) {
        return res.status(403).json({ error: '无效的刷新令牌' });
    }

    const { rows } = await pool.query('SELECT * FROM refresh_tokens WHERE token = $1', [refreshToken]);
    if (rows.length === 0) {
        return res.status(403).json({ error: '无效的刷新令牌' });
    }

    const user = rows[0];
    const newAccessToken = jwt.sign({ user_id: user.user_id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '1h' });

    res.json({ accessToken: newAccessToken });
});

// 🔹 退出登录（删除 refreshToken）
router.post('/logout', async (req, res) => {
    const { refreshToken } = req.body;
    if (!refreshToken) {
        return res.status(400).json({ error: '缺少 refreshToken' });
    }

    await removeRefreshToken(refreshToken);
    res.json({ message: '退出成功' });
});

module.exports = router;
