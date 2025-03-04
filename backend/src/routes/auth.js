const express = require('express');
const { body, validationResult } = require('express-validator');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const rateLimit = require('express-rate-limit');
const { Pool } = require('pg');
const winston = require('winston');
const dotenv = require('dotenv');

dotenv.config();

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
        new winston.transports.File({ filename: 'error.log', level: 'error' }),
        new winston.transports.File({ filename: 'combined.log' })
    ]
});

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: '登录/注册请求过于频繁，请稍后重试'
});

const refreshTokens = new Set();

router.post('/login', authLimiter, [
    body('username').notEmpty().withMessage('用户名不能为空').trim().escape(),
    body('password').notEmpty().withMessage('密码不能为空').trim()
], async (req, res, next) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        const { username, password } = req.body;
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
        const accessToken = jwt.sign(
            { user_id: user.id, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );
        const refreshToken = uuidv4();
        refreshTokens.add(refreshToken);
        logger.info('用户登录成功', { username, ip: req.ip });
        res.status(200).json({
            accessToken,
            refreshToken,
            username: user.username,
            role: user.role,
            message: '登录成功'
        });
    } catch (error) {
        next(error);
    }
});

router.post('/token/refresh', authLimiter, (req, res) => {
    const { refreshToken } = req.body;
    if (!refreshToken || !refreshTokens.has(refreshToken)) {
        return res.status(403).json({ error: '无效的刷新令牌' });
    }
    const newAccessToken = jwt.sign(
        { user_id: req.user?.user_id || 'unknown', role: req.user?.role || 'user' },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
    );
    res.json({ accessToken: newAccessToken });
});

module.exports = router;
