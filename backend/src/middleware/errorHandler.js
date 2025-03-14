const logger = require('../utils/logger');

const errorHandler = (err, req, res, next) => {
    logger.error(`API 错误: ${err.message}`);

    res.status(err.status || 500).json({
        error: err.message || '服务器错误'
    });
};

module.exports = errorHandler;
