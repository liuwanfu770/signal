// 认证中间件，将 JWT 解码后的数据放置到 req.user 中
const jwt = require('jsonwebtoken');

const authenticate = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: '无效的授权格式' });
  }

  const token = authHeader.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: '认证令牌缺失' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // 如果解码后的 token 没有 user_id，但存在 id，则将 id 赋值给 user_id
    if (!decoded.user_id && decoded.id) {
      decoded.user_id = decoded.id;
    }
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: '用户未认证' });
  }
};

module.exports = authenticate;
