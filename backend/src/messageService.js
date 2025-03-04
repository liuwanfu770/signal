// ...existing code (none)...

const { Pool } = require('pg');
const pool = new Pool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: 5432
});

module.exports = {
    async listMessages({ sender_phone, recipient_phone, group_id }) {
        let query = 'SELECT * FROM messages WHERE 1=1';
        const params = [];
        if (sender_phone) {
            params.push(sender_phone);
            query += ` AND sender_id = $${params.length}`;
        }
        if (recipient_phone) {
            params.push(recipient_phone);
            query += ` AND recipient_id = $${params.length}`;
        }
        if (group_id) {
            params.push(group_id);
            query += ` AND group_id = $${params.length}`;
        }
        const { rows } = await pool.query(query, params);
        return rows;
    }
};
