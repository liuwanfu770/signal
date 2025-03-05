const express = require('express');
const { Pool } = require('pg');
const axios = require('axios');
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

app.use(express.json());

// 注册接口
app.post('/register', async (req, res) => {
    const { phoneNumber, password } = req.body;
    try {
        const response = await axios.post(`${process.env.SIGNAL_CLI_URL}/v1/register`, { phoneNumber });
        await pool.query('INSERT INTO signal_accounts (phone_number, password) VALUES ($1, $2)', [phoneNumber, password]);
        res.status(201).send('Account registered');
    } catch (error) {
        res.status(500).send('Error registering account');
    }
});

// 登录接口
app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const result = await pool.query('SELECT * FROM users WHERE username = $1 AND password = $2', [username, password]);
        if (result.rows.length > 0) {
            const token = jwt.sign({ userId: result.rows[0].id, role: result.rows[0].role }, process.env.JWT_SECRET);
            res.status(200).json({ token });
        } else {
            res.status(401).send('Invalid credentials');
        }
    } catch (error) {
        res.status(500).send('Error logging in');
    }
});

app.listen(3000, () => {
    console.log('Server is running on port 3000');
});
