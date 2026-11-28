const pool = require('../../connection');
const { adminError, withAdminGroup } = require('./transaction');

async function createAdminGroup(userId, groupName) {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        // Match the current UI: an administrator of an existing group may create a group.
        const [admins] = await connection.execute('SELECT idx FROM group_members WHERE userid = ? AND isadmin = TRUE ORDER BY idx LIMIT 1 FOR UPDATE', [userId]);
        if (!admins.length) throw adminError(403, 'Group administrator permission required.');
        const [result] = await connection.execute('INSERT INTO user_groups (groupname) VALUES (?)', [groupName]);
        const groupId = result.insertId;
        await connection.execute('INSERT INTO group_members (groupid, userid, isadmin) VALUES (?, ?, TRUE)', [groupId, userId]);
        await connection.commit();
        return { groupId, groupName };
    } catch (error) {
        await connection.rollback().catch(() => {});
        throw error;
    } finally {
        connection.release();
    }
}

async function getAdminMembers(groupId, userId) {
    return withAdminGroup(groupId, userId, async (connection) => {
        const [rows] = await connection.execute(
            `SELECT gm.userid AS userId, u.username, gm.isadmin AS isAdmin
             FROM group_members AS gm JOIN users AS u ON u.userid = gm.userid
             WHERE gm.groupid = ? ORDER BY gm.userid`, [groupId]
        );
        return rows.map((row) => ({ ...row, isAdmin: Boolean(row.isAdmin) }));
    });
}

async function updateAdminMember(groupId, userId, memberId, isAdmin) {
    return withAdminGroup(groupId, userId, async (connection) => {
        const [members] = await connection.execute(
            `SELECT gm.userid AS userId, u.username, gm.isadmin AS isAdmin
             FROM group_members AS gm JOIN users AS u ON u.userid = gm.userid
             WHERE gm.groupid = ? AND gm.userid = ? FOR UPDATE`, [groupId, memberId]
        );
        if (!members.length) throw adminError(404, 'Group member not found.');
        if (members[0].isAdmin && !isAdmin) {
            const [admins] = await connection.execute('SELECT userid FROM group_members WHERE groupid = ? AND isadmin = TRUE FOR UPDATE', [groupId]);
            if (admins.length <= 1) throw adminError(409, 'The last group administrator cannot be removed.');
        }
        await connection.execute('UPDATE group_members SET isadmin = ? WHERE groupid = ? AND userid = ?', [isAdmin, groupId, memberId]);
        return { userId: members[0].userId, username: members[0].username, isAdmin };
    });
}

module.exports = { createAdminGroup, getAdminMembers, updateAdminMember };
