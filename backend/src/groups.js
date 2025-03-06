const { Pool } = require('pg');
const axios = require('axios');

const pool = new Pool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: 5432
});
const SIGNAL_CLI_URL = process.env.SIGNAL_CLI_URL || 'http://localhost:8080';

// 创建群组
async function createGroup(req, res) {
  const { user_id, phone_number } = req.user; // JWT 提供当前用户信息
  const { group_name, members = [] } = req.body;
  if (!group_name) {
    return res.status(400).json({ error: 'group_name 不能为空' });
  }
  try {
    // 调用 Signal-CLI API 创建群组
    const resp = await axios.post(`${SIGNAL_CLI_URL}/v1/groups/${phone_number}`, {
      name: group_name,
      members
    });
    const { groupId } = resp.data; // 假设 API 返回 groupId

    // 写入本地数据库 groups 表
    const insGroup = `
      INSERT INTO groups (group_id, name, owner_id)
      VALUES ($1, $2, $3)
      RETURNING id
    `;
    const { rows: groupRows } = await pool.query(insGroup, [groupId, group_name, user_id]);
    const dbGroupId = groupRows[0].id;

    // 自己作为管理员加入 group_members
    await pool.query(
      `INSERT INTO group_members (group_id, user_id, role)
       VALUES ($1, $2, 'ADMIN')`,
      [dbGroupId, user_id]
    );

    res.status(201).json({ message: '群组创建成功', group_id: groupId, db_group_id: dbGroupId });
  } catch (error) {
    console.error('createGroup error:', error.message);
    res.status(500).json({ error: '群组创建失败' });
  }
}

// 添加成员
async function addMember(req, res) {
  const { user_id, phone_number } = req.user;
  const { group_id, member_phone } = req.body;
  if (!group_id || !member_phone) {
    return res.status(400).json({ error: 'group_id 与 member_phone 均为必填' });
  }
  try {
    // 查询 groups 表获得数据库内部 group id 和 signal group id
    const gRes = await pool.query(
      'SELECT id, group_id, owner_id FROM groups WHERE group_id = $1',
      [group_id]
    );
    if (gRes.rows.length === 0) {
      return res.status(404).json({ error: '未找到该群组' });
    }
    const dbGroupId = gRes.rows[0].id;
    const signalGroupId = gRes.rows[0].group_id;

    // 调用 Signal-CLI API 添加成员
    await axios.post(`${SIGNAL_CLI_URL}/v1/groups/${phone_number}/member/${member_phone}`, {
      groupId: signalGroupId
    });

    // 写入 group_members 表；如果 member 对应用户存在
    const uRes = await pool.query('SELECT id FROM users WHERE phone_number = $1', [member_phone]);
    if (uRes.rows.length > 0) {
      const memUserId = uRes.rows[0].id;
      await pool.query(
        `INSERT INTO group_members (group_id, user_id, role)
         VALUES ($1, $2, 'MEMBER')
         ON CONFLICT DO NOTHING`,
        [dbGroupId, memUserId]
      );
    }
    res.json({ message: '成员添加成功' });
  } catch (error) {
    console.error('addMember error:', error.message);
    res.status(500).json({ error: '添加成员失败' });
  }
}

// 退出群组（当前用户退出）
async function leaveGroup(req, res) {
  const { user_id, phone_number } = req.user;
  const { group_id } = req.body;
  if (!group_id) {
    return res.status(400).json({ error: 'group_id 为必填' });
  }
  try {
    const gRes = await pool.query('SELECT id, group_id FROM groups WHERE group_id = $1', [group_id]);
    if (gRes.rows.length === 0) {
      return res.status(404).json({ error: '群组不存在' });
    }
    const dbGroupId = gRes.rows[0].id;
    const signalGroupId = gRes.rows[0].group_id;

    // 调用 Signal-CLI API 退群，如 POST /v1/groups/{phone_number}/leave
    await axios.post(`${SIGNAL_CLI_URL}/v1/groups/${phone_number}/leave`, { groupId: signalGroupId });

    // 删除 group_members 中该用户记录
    await pool.query('DELETE FROM group_members WHERE group_id = $1 AND user_id = $2', [dbGroupId, user_id]);
    res.json({ message: '已退出群组' });
  } catch (error) {
    console.error('leaveGroup error:', error.message);
    res.status(500).json({ error: '退出群组失败' });
  }
}

// 移除成员（管理员操作）
async function removeMember(req, res) {
  const { user_id, phone_number } = req.user;
  const { group_id, member_phone } = req.body;
  if (!group_id || !member_phone) {
    return res.status(400).json({ error: 'group_id 与 member_phone 均为必填' });
  }
  try {
    // 此处可添加检查：调用者是否为管理员
    const gRes = await pool.query('SELECT id, group_id FROM groups WHERE group_id = $1', [group_id]);
    if (gRes.rows.length === 0) {
      return res.status(404).json({ error: '群组不存在' });
    }
    const dbGroupId = gRes.rows[0].id;
    const signalGroupId = gRes.rows[0].group_id;

    // 调用 Signal-CLI API 移除成员
    await axios.delete(`${SIGNAL_CLI_URL}/v1/groups/${phone_number}/member/${member_phone}`, {
      data: { groupId: signalGroupId }
    });

    // 若 member_phone 对应用户存在，则删除 group_members 记录
    const uRes = await pool.query('SELECT id FROM users WHERE phone_number = $1', [member_phone]);
    if (uRes.rows.length > 0) {
      await pool.query('DELETE FROM group_members WHERE group_id = $1 AND user_id = $2', [dbGroupId, uRes.rows[0].id]);
    }
    res.json({ message: '已移除指定成员' });
  } catch (error) {
    console.error('removeMember error:', error.message);
    res.status(500).json({ error: '移除成员失败' });
  }
}

// 获取当前用户所在群组列表
async function getUserGroups(req, res) {
  const { user_id } = req.user;
  try {
    const sql = `
      SELECT g.group_id, g.name, gm.role, gm.joined_at
      FROM group_members gm
      JOIN groups g ON gm.group_id = g.id
      WHERE gm.user_id = $1
      ORDER BY gm.joined_at DESC
    `;
    const { rows } = await pool.query(sql, [user_id]);
    res.json({ groups: rows });
  } catch (error) {
    console.error('getUserGroups error:', error.message);
    res.status(500).json({ error: '获取群组列表失败' });
  }
}

// 获取指定群组的成员列表
async function getGroupMembers(req, res) {
  const groupId = req.params.groupId; // Signal-CLI 群组ID
  try {
    const gRes = await pool.query('SELECT id, name FROM groups WHERE group_id = $1', [groupId]);
    if (gRes.rows.length === 0) {
      return res.status(404).json({ error: '群组不存在' });
    }
    const dbGroupId = gRes.rows[0].id;
    const name = gRes.rows[0].name;

    const mRes = await pool.query(
      `SELECT gm.user_id, gm.role, gm.joined_at, u.phone_number
       FROM group_members gm
       JOIN users u ON gm.user_id = u.id
       WHERE gm.group_id = $1
       ORDER BY gm.role ASC, gm.joined_at DESC
      `,
      [dbGroupId]
    );
    res.json({ group_id: groupId, name, members: mRes.rows });
  } catch (error) {
    console.error('getGroupMembers error:', error.message);
    res.status(500).json({ error: '获取群组成员失败' });
  }
}

module.exports = {
  createGroup,
  addMember,
  leaveGroup,
  removeMember,
  getUserGroups,
  getGroupMembers
};
