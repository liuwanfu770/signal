const { Pool } = require('pg');
const axios = require('axios');

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT
});

// 批量注册API
exports.batchRegister = async (req, res) => {
    const { phone_numbers } = req.body;

    // 参数校验
    if (!Array.isArray(phone_numbers) || phone_numbers.length === 0) {
        return res.status(400).json({ error: 'phone_numbers 必须为非空数组' });
    }

    try {
        const accounts = [];
        for (const phone of phone_numbers) {
            // 调用Signal CLI注册账号（假设外部服务）
            await axios.post(`${process.env.SIGNAL_CLI_URL}/v1/register`, { number: phone });
            const { rows } = await pool.query(
                'INSERT INTO signal_accounts (phone_number, user_id) VALUES ($1, $2) RETURNING phone_number, status',
                [phone, req.user.user_id]
            );
            accounts.push(rows[0]);
        }
        res.status(201).json({ message: '批量注册成功', accounts });
    } catch (error) {
        console.error('批量注册错误:', error);
        res.status(500).json({ error: '批量注册失败' });
    }
};

// 更新账号状态API
exports.updateStatus = async (req, res) => {
    const { phone_number, status } = req.body;

    // 参数校验
    if (!phone_number || !status) {
        return res.status(400).json({ error: 'phone_number 和 status 为必填项' });
    }

    try {
        const { rows } = await pool.query(
            'UPDATE signal_accounts SET status = $1, last_active = CURRENT_TIMESTAMP WHERE phone_number = $2 RETURNING phone_number, status',
            [status, phone_number]
        );
        if (rows.length === 0) {
            return res.status(404).json({ error: '账号未找到' });
        }
        res.status(200).json({ message: '状态更新成功', account: rows[0] });
    } catch (error) {
        console.error('状态更新错误:', error);
        res.status(500).json({ error: '状态更新失败' });
    }
};
