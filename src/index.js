const express = require('express');
const cors = require('cors');
const accountRoutes = require('./routes/accounts'); // 调用账户路由
const auth = require('./middleware/auth'); // 新增认证中间件

const app = express();

app.use(cors({ origin: '*' }));
app.use(express.json());
app.use(auth); // 将认证中间件应用到所有后续请求

// 健康检查端点
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// 使用账户路由
app.use('/v1/accounts', accountRoutes);

// 错误处理中间件
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: '服务器错误' });
});

const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => console.log(`Backend server running on port ${PORT}`));

process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
  });
});

module.exports = app;
