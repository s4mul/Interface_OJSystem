const pool = require('../connection');

async function createGroup(groupname) {
    const [result] = await pool.execute(
        'INSERT INTO `groups` (groupname) VALUES (?)',
        [groupname]
    );
    return result.insertId;
}

async function getGroupById(groupid) {
    const [rows] = await pool.execute(
        'SELECT * FROM `groups` WHERE groupid = ?',
        [groupid]
    );
    return rows[0] ?? null;
}

async function updateGroup(groupid, groupname) {
    const [result] = await pool.execute(
        'UPDATE `groups` SET groupname = ? WHERE groupid = ?',
        [groupname, groupid]
    );
    return result.affectedRows;
}

async function deleteGroup(groupid) {
    const [result] = await pool.execute(
        'DELETE FROM `groups` WHERE groupid = ?',
        [groupid]
    );
    return result.affectedRows;
}

module.exports = { createGroup, getGroupById, updateGroup, deleteGroup };
