const express = require('express');
const app = express();
const accountsRouter = require('./routes/accounts');

// 中间件
app.use(express.json());

// 路由
app.use('/accounts', accountsRouter);

// 健康检查路由
app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

// 启动服务器
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
