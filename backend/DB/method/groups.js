const pool = require('../connection');

async function createGroup(groupname) {
    const [result] = await pool.execute(
        'INSERT INTO user_groups (groupname) VALUES (?)',
        [groupname]
    );
    return result.insertId;
}

async function getGroupById(groupid) {
    const [rows] = await pool.execute(
        'SELECT * FROM user_groups WHERE groupid = ?',
        [groupid]
    );
    return rows[0] ?? null;
}


async function getGroupsByUserId(userid) {
    const [rows] = await pool.execute(
        `SELECT g.groupid AS groupId, g.groupname AS groupName
         FROM user_groups AS g
         JOIN group_members AS gm ON g.groupid = gm.groupid
         WHERE gm.userid = ?
         ORDER BY g.groupid`,
        [userid]
    );
    return rows;
}

async function updateGroup(groupid, groupname) {
    const [result] = await pool.execute(
        'UPDATE user_groups SET groupname = ? WHERE groupid = ?',
        [groupname, groupid]
    );
    return result.affectedRows;
}

async function deleteGroup(groupid) {
    const [result] = await pool.execute(
        'DELETE FROM user_groups WHERE groupid = ?',
        [groupid]
    );
    return result.affectedRows;
}

module.exports = { createGroup, getGroupById, getGroupsByUserId, updateGroup, deleteGroup };
