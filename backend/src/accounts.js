const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const axios = require('axios');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: 5432
});

const JWT_SECRET = process.env.JWT_SECRET || 'ChangeThisSecret';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '2h';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'AnotherSecret';
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_TOKEN_EXPIRES_IN || '7d';
const SIGNAL_CLI_URL = process.env.SIGNAL_CLI_URL || 'http://localhost:8080';

function generateTokens(payload) {
  const accessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
  const refreshToken = jwt.sign(payload, JWT_REFRESH_SECRET, { expiresIn: JWT_REFRESH_EXPIRES_IN });
  return { accessToken, refreshToken };
}

// 注册账号 - 同时在 Signal-CLI REST API 中进行注册
async function registerAccount(req, res) {
  const { phone_number, password } = req.body;
  if (!phone_number || !password) {
    return res.status(400).json({ error: '手机号和密码为必填项' });
  }
  try {
    // 1) 调用 Signal-CLI 进行注册
    await axios.post(`${SIGNAL_CLI_URL}/v1/register`, { number: phone_number });

    // 2) 在数据库中存储
    const hashedPassword = await bcrypt.hash(password, 10);
    const insertQuery = `
      INSERT INTO users (phone_number, password)
      VALUES ($1, $2)
      RETURNING id, phone_number
    `;
    const { rows } = await pool.query(insertQuery, [phone_number, hashedPassword]);
    res.status(201).json({ user_id: rows[0].id, phone_number: rows[0].phone_number });
  } catch (error) {
    console.error('Register error:', error.message);
    return res.status(500).json({ error: '注册失败' });
  }
}

// 登录账号 - 验证密码，签发 JWT
async function loginAccount(req, res) {
  const { phone_number, password } = req.body;
  if (!phone_number || !password) {
    return res.status(400).json({ error: '手机号和密码为必填项' });
  }
  try {
    const selectQuery = 'SELECT id, password, role FROM users WHERE phone_number = $1';
    const { rows } = await pool.query(selectQuery, [phone_number]);
    if (rows.length === 0) {
      return res.status(404).json({ error: '账号不存在' });
    }
    const user = rows[0];
    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(401).json({ error: '密码错误' });
    }
    // 签发 JWT
    const tokens = generateTokens({ user_id: user.id, phone_number, role: user.role });
    res.json({ message: '登录成功', accessToken: tokens.accessToken, refreshToken: tokens.refreshToken });
  } catch (error) {
    console.error('Login error:', error.message);
    res.status(500).json({ error: '登录失败' });
  }
}

// 获取账号状态
async function getAccountStatus(req, res) {
  const user_id = req.user.user_id; // 从中间件解析出的 JWT payload
  try {
    const selectQuery = 'SELECT phone_number, status FROM users WHERE id = $1';
    const { rows } = await pool.query(selectQuery, [user_id]);
    if (rows.length === 0) {
      return res.status(404).json({ error: '用户不存在' });
    }
    res.json({ phone_number: rows[0].phone_number, status: rows[0].status });
  } catch (error) {
    console.error('getAccountStatus error:', error.message);
    res.status(500).json({ error: '查询状态失败' });
  }
}

// 新增刷新 Token 接口
async function refreshTokenEndpoint(req, res) {
  const { refreshToken } = req.body;
  if (!refreshToken) {
    return res.status(400).json({ error: '没有提供 refreshToken' });
  }
  try {
    const decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET);
    const newTokens = generateTokens({
      user_id: decoded.user_id,
      phone_number: decoded.phone_number,
      role: decoded.role
    });
    res.json({ accessToken: newTokens.accessToken, refreshToken: newTokens.refreshToken });
  } catch (err) {
    return res.status(401).json({ error: 'refreshToken 无效或过期' });
  }
}

module.exports = {
  registerAccount,
  loginAccount,
  getAccountStatus,
  refreshTokenEndpoint,
  generateTokens
};
