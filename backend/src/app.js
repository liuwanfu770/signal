const express = require('express');
const responseHelper = require('./utils/responseHelper');
const errorHandler = require('./middleware/errorHandler');
const app = express();

app.use(express.json());

// 全局 API 路由
app.use('/api', require('./routes/api'));

// 捕获 404
app.use((req, res) => {
    responseHelper.error(res, 404, `未找到该 API: ${req.originalUrl}`);
});

// 全局错误处理
app.use(errorHandler);

module.exports = app;
