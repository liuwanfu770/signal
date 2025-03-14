const rateLimit = require('express-rate-limit');
const winston = require('winston');

const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
    ),
    transports: [
        new winston.transports.Console(),
        new winston.transports.File({ filename: 'logs/rate-limit.log', level: 'warn' })
    ]
});

// 🔹 限制登录尝试（15 分钟最多 5 次）
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: { error: '登录尝试过多，请 15 分钟后再试' },
    handler: (req, res) => {
        logger.warn(`登录尝试过多: ${req.ip}`);
        res.status(429).json({ error: '登录尝试过多，请 15 分钟后再试' });
    }
});

// 🔹 限制所有 API 请求（每分钟 100 次）
const apiLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 100,
    message: { error: '请求过于频繁，请稍后再试' },
    handler: (req, res) => {
        logger.warn(`API 访问过于频繁: ${req.ip}`);
        res.status(429).json({ error: '请求过于频繁，请稍后再试' });
    }
});

// 🔹 限制 WebSocket 连接频率（防止 DDoS）
const wsLimiter = new Map();
const wsLimitTimeWindow = 10000; // 10秒
const wsLimitMax = 5; // 10秒内最多连接 5 次

const checkWsLimit = (ip) => {
    const now = Date.now();
    if (!wsLimiter.has(ip)) {
        wsLimiter.set(ip, []);
    }

    const timestamps = wsLimiter.get(ip).filter(time => now - time < wsLimitTimeWindow);
    timestamps.push(now);
    wsLimiter.set(ip, timestamps);

    return timestamps.length > wsLimitMax;
};

module.exports = { loginLimiter, apiLimiter, checkWsLimit };
