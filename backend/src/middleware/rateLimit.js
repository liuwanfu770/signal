const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 分钟
    max: 100, // 每个 IP 限制 100 次请求
    message: '请求过于频繁，请稍后再试',
});

module.exports = limiter;
