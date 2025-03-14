require('dotenv').config();
const jwt = require('jsonwebtoken');
const winston = require('winston');
const { Pool } = require('pg');

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

const authenticateToken = async (req, res, next) => {
    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        logger.warn('认证格式错误', { ip: req.headers['x-forwarded-for'] || req.ip });
        return res.status(400).json({ error: '认证格式错误' });
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
        logger.warn('未提供认证令牌', { ip: req.headers['x-forwarded-for'] || req.ip });
        return res.status(401).json({ error: '未授权访问' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ error: '认证令牌已过期' });
        }
        logger.error('JWT 验证错误', { error: error.message, ip: req.headers['x-forwarded-for'] || req.ip });
        return res.status(403).json({ error: '认证令牌无效' });
    }
};

module.exports = authenticateToken;
