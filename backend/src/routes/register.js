const express = require('express');
const { body, validationResult } = require('express-validator');
const axios = require('axios');
const { Pool } = require('pg');
const winston = require('winston');
const dotenv = require('dotenv');
const authenticateToken = require('../middleware/authenticateToken');

dotenv.config();

const router = express.Router();
const pool = new Pool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: 5432
});

const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
    ),
    transports: [
        new winston.transports.File({ filename: 'error.log', level: 'error' }),
        new winston.transports.File({ filename: 'combined.log' })
    ]
});

router.post('/', [authenticateToken,
    body('phone_number').matches(/^\+\d{10,15}$/).withMessage('无效的电话号码').trim()
], async (req, res, next) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        const { phone_number } = req.body;
        await axios.post(`${process.env.SIGNAL_CLI_URL}/v1/register`, { number: phone_number });
        const { rows } = await pool.query(
            'INSERT INTO signal_accounts (phone_number, user_id) VALUES ($1, $2) RETURNING phone_number',
            [phone_number, req.user.user_id]
        );
        logger.info('账号注册成功', { phone_number, user_id: req.user.user_id, ip: req.ip });
        res.status(201).json({
            message: '账号注册已成功发起，请完成 Signal-CLI 验证',
            phone_number: rows[0].phone_number
        });
    } catch (error) {
        next(error);
    }
});

module.exports = router;
