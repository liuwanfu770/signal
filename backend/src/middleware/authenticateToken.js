const jwt = require('jsonwebtoken');
const winston = require('winston');
const dotenv = require('dotenv');

dotenv.config();

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

const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
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

module.exports = authenticateToken;
