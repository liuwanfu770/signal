// 简化的认证中间件，为测试添加模拟用户信息
module.exports = (req, res, next) => {
  req.user = {
    user_id: 'test-user-id',
    username: 'test-user'
  };
  next();
};
