const winston = require('winston');

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

const errorHandler = (err, req, res, next) => {
    logger.error('全局错误处理:', { error: err.message, stack: err.stack, ip: req.ip });
    res.status(500).json({ error: '服务器内部错误' });
};

module.exports = errorHandler;
