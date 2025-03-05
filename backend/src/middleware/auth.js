const jwt = require('jsonwebtoken');

const auth = (req, res, next) => {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ error: '未提供令牌' });
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret');
        req.user = decoded;
        next();
    } catch (error) {
        res.status(401).json({ error: '无效令牌' });
    }
};

module.exports = auth;
