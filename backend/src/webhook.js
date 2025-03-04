const express = require('express');
const { Pool } = require('pg');
require('dotenv').config();

const app = express();
app.use(express.json());

// 数据库连接池
const pool = new Pool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: 5432
});

// 处理 Signal-CLI Webhook 通知
app.post('/webhook', async (req, res) => {
    const { envelope } = req.body;
    const { source, dataMessage } = envelope;
    if (dataMessage) {
        const { message } = dataMessage;
        try {
            await pool.query(
                'INSERT INTO messages (sender_id, recipient_id, content, type, status) VALUES ($1, $2, $3, $4, $5)',
                [source, 'self', message, 'TEXT', 'RECEIVED']
            );
            res.status(200).send('Message received');
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    } else {
        res.status(400).send('No message content');
    }
});

app.listen(3001, () => console.log('Webhook server running on port 3001'));
