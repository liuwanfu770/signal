const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: 5432,
});

// 注册账户
const registerAccount = async (req, res) => {
  try {
    const { number } = req.params;
    const { name, avatar } = req.body;
    
    // 检查账户是否已存在
    const existingAccount = await pool.query(
      'SELECT * FROM accounts WHERE phone_number = $1',
      [number]
    );
    
    if (existingAccount.rows.length > 0) {
      return res.status(409).json({ error: 'Account already exists' });
    }
    
    // 创建新账户
    const result = await pool.query(
      'INSERT INTO accounts (phone_number, name, avatar) VALUES ($1, $2, $3) RETURNING *',
      [number, name, avatar]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error registering account:', error);
    res.status(500).json({ error: 'Failed to register account' });
  }
};

// 获取所有账户
const getAccounts = async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM accounts');
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching accounts:', error);
    res.status(500).json({ error: 'Failed to fetch accounts' });
  }
};

// 更新账户
const updateAccount = async (req, res) => {
  try {
    const { number } = req.params;
    const { name, avatar } = req.body;
    
    const result = await pool.query(
      'UPDATE accounts SET name = $1, avatar = $2 WHERE phone_number = $3 RETURNING *',
      [name, avatar, number]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Account not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating account:', error);
    res.status(500).json({ error: 'Failed to update account' });
  }
};

module.exports = {
  registerAccount,
  getAccounts,
  updateAccount
};
