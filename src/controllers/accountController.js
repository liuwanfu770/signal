const { Pool } = require('pg');
const axios = require('axios');

// 如果 DB_PORT 未设置，则默认为 5432
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT || 5432,
});

// 单个账号注册 API
exports.registerAccount = async (req, res) => {
  const phone = req.params.number;  // 从路由参数中获取号码
  try {
    // 简化版本，仅返回成功响应
    const result = {
      phone_number: phone,
      status: 'registered'
    };
    res.status(201).json({ message: '注册成功', account: result });
  } catch (error) {
    console.error('注册错误:', error);
    res.status(500).json({ error: '注册失败' });
  }
};

// 获取当前用户账号 API
exports.getAccounts = async (req, res) => {
  try {
    // 简化版本，返回模拟数据
    const accounts = [
      { phone_number: '+1234567890', status: 'active' },
      { phone_number: '+0987654321', status: 'inactive' }
    ];
    res.status(200).json({ accounts });
  } catch (error) {
    console.error('获取账号错误:', error);
    res.status(500).json({ error: '获取账号失败' });
  }
};

// 更新账号状态 API
exports.updateAccount = async (req, res) => {
  const phone = req.params.number;
  const { status } = req.body;
  if (!phone || !status) {
    return res.status(400).json({ error: 'phone_number 和 status 为必填项' });
  }
  try {
    // 简化版本，返回更新后的数据
    const result = {
      phone_number: phone,
      status: status
    };
    res.status(200).json({ message: '状态更新成功', account: result });
  } catch (error) {
    console.error('更新账号错误:', error);
    res.status(500).json({ error: '更新账号失败' });
  }
};
