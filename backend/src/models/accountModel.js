const pool = require('../utils/db');
const searchModel = require('./searchModel');

const getAccounts = async () => {
    const result = await pool.query('SELECT * FROM signal_accounts');
    return result.rows;
};

const registerAccount = async (number, captcha) => {
    // 调用 Signal-CLI-REST-API 的注册接口
    const response = await fetch(`http://signal-api-1:8080/v1/register/${number}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ captcha, use_voice: false }),
    });

    if (response.status === 201) {
        await pool.query(
            'INSERT INTO signal_accounts (phone_number, registration_status) VALUES ($1, $2)',
            [number, 'pending']
        );
        // 存储搜索信息
        await searchModel.saveSearchInfo(number, 'register', { captcha });
    } else {
        throw new Error('注册失败');
    }
};

module.exports = { getAccounts, registerAccount };
