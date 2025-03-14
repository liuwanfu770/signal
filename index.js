const express = require('express');
const { Pool } = require('pg');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const dotenv = require('dotenv');
dotenv.config();

const app = express();
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'your_db_user',
  password: process.env.DB_PASSWORD || 'your_db_password',
  database: process.env.DB_NAME || 'signal_db',
  port: 5432,
});

app.use(express.json());

app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
    if (result.rows.length === 0) {
      return res.status(401).send('Invalid credentials');
    }

    const isMatch = await bcrypt.compare(password, result.rows[0].password);
    if (!isMatch) {
      return res.status(401).send('Invalid credentials');
    }

    const token = jwt.sign(
      { userId: result.rows[0].id },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    res.json({ token });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).send('Server error');
  }
});

app.post('/register', async (req, res) => {
  const { phoneNumber, password } = req.body;
  try {
    const { rowCount } = await pool.query('SELECT * FROM signal_accounts WHERE phone_number = $1', [phoneNumber]);
    if (rowCount > 0) {
      return res.status(400).send('Phone number already registered');
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    await pool.query('INSERT INTO signal_accounts (phone_number, password) VALUES ($1, $2)', [phoneNumber, hashedPassword]);
    res.status(201).send('User registered');
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).send('Server error');
  }
});

process.on('exit', async () => {
  console.log('Closing database connection...');
  await pool.end();
});

process.on('uncaughtException', async (err) => {
  console.error('Uncaught exception:', err);
  await pool.end();
  process.exit(1);
});

process.on('unhandledRejection', async (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  await pool.end();
  process.exit(1);
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});