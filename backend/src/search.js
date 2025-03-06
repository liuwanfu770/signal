const { Pool } = require('pg');
const pool = new Pool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: 5432
});

async function handleSearch(req, res) {
  const { phone_number, query, type } = req.query; // GET /v1/search?phone_number=xxx&query=...&type=...
  if (!phone_number || !query || !type) {
    return res.status(400).json({ error: '缺少必填参数 phone_number/query/type' });
  }
  if (!['CONTACT','GROUP','MESSAGE'].includes(type)) {
    return res.status(400).json({ error: '搜索类型仅支持 CONTACT/GROUP/MESSAGE' });
  }
  try {
    let sqlCount, sqlSelect;
    const wildcard = `%${query}%`;
    switch (type) {
      case 'CONTACT':
        sqlCount = `SELECT COUNT(*) FROM contacts c 
                    JOIN users u ON c.user_id = u.id 
                    WHERE u.phone_number = $1 AND c.contact_phone ILIKE $2`;
        sqlSelect = `SELECT c.contact_phone, c.added_at
                     FROM contacts c 
                     JOIN users u ON c.user_id = u.id
                     WHERE u.phone_number = $1 AND c.contact_phone ILIKE $2
                     ORDER BY c.added_at DESC
                     LIMIT 50`;
        break;
      case 'GROUP':
        sqlCount = `SELECT COUNT(*) 
                    FROM group_members gm
                    JOIN users u ON gm.user_id = u.id
                    JOIN groups g ON g.id = gm.group_id
                    WHERE u.phone_number = $1 AND g.name ILIKE $2`;
        sqlSelect = `SELECT g.id AS group_id, g.name, gm.joined_at
                     FROM group_members gm
                     JOIN users u ON gm.user_id = u.id
                     JOIN groups g ON g.id = gm.group_id
                     WHERE u.phone_number = $1 AND g.name ILIKE $2
                     ORDER BY gm.joined_at DESC
                     LIMIT 50`;
        break;
      case 'MESSAGE':
        sqlCount = `SELECT COUNT(*) FROM messages m
                    JOIN users u ON m.sender_id = u.id
                    WHERE u.phone_number = $1 AND m.content ILIKE $2`;
        sqlSelect = `SELECT m.id, m.content, m.timestamp, m.status
                     FROM messages m
                     JOIN users u ON m.sender_id = u.id
                     WHERE u.phone_number = $1 AND m.content ILIKE $2
                     ORDER BY m.timestamp DESC
                     LIMIT 50`;
        break;
    }
    const countResult = await pool.query(sqlCount, [phone_number, wildcard]);
    const total = parseInt(countResult.rows[0].count, 10);
    const listResult = await pool.query(sqlSelect, [phone_number, wildcard]);
    const results = listResult.rows;
    // 存储搜索历史记录
    const insQuery = `
      INSERT INTO search_history (phone_number, search_query, search_type, search_results)
      VALUES ($1, $2, $3, $4)
      RETURNING search_id
    `;
    const { rows: histRows } = await pool.query(insQuery, [
      phone_number,
      query,
      type,
      JSON.stringify(results)
    ]);
    res.json({ total, results, search_id: histRows[0].search_id });
  } catch (error) {
    console.error('search error:', error.message);
    res.status(500).json({ error: '搜索失败' });
  }
}

async function getSearchHistory(req, res) {
  const { phone_number } = req.query;
  if (!phone_number) {
    return res.status(400).json({ error: '缺少必填参数 phone_number' });
  }
  try {
    const histQuery = `
      SELECT search_id, search_query, search_type, timestamp
      FROM search_history
      WHERE phone_number = $1
      ORDER BY timestamp DESC
      LIMIT 50
    `;
    const { rows } = await pool.query(histQuery, [phone_number]);
    res.json({ history: rows });
  } catch (error) {
    console.error('getSearchHistory error:', error.message);
    res.status(500).json({ error: '获取搜索历史失败' });
  }
}

module.exports = {
  handleSearch,
  getSearchHistory
};
