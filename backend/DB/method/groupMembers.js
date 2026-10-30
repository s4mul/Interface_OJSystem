const pool = require('../connection');

async function createGroupMember(groupid, userid, isadmin = false) {
    const [result] = await pool.execute(
        'INSERT INTO group_members (groupid, userid, isadmin) VALUES (?, ?, ?)',
        [groupid, userid, isadmin]
    );
    return result.insertId;
}

async function getGroupMemberById(idx) {
    const [rows] = await pool.execute(
        'SELECT * FROM group_members WHERE idx = ?',
        [idx]
    );
    return rows[0] ?? null;
}

async function updateGroupMember(idx, groupid, userid, isadmin) {
    const [result] = await pool.execute(
        'UPDATE group_members SET groupid = ?, userid = ?, isadmin = ? WHERE idx = ?',
        [groupid, userid, isadmin, idx]
    );
    return result.affectedRows;
}

async function deleteGroupMember(idx) {
    const [result] = await pool.execute(
        'DELETE FROM group_members WHERE idx = ?',
        [idx]
    );
    return result.affectedRows;
}

module.exports = { createGroupMember, getGroupMemberById, updateGroupMember, deleteGroupMember };
