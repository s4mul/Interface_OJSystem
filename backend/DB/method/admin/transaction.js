const pool = require('../../connection');

function adminError(status, message) {
    return Object.assign(new Error(message), { status });
}

async function withAdminGroup(groupId, userId, work) {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        // Serialize group management writes, including simultaneous role changes.
        const [groups] = await connection.execute('SELECT groupid FROM user_groups WHERE groupid = ? FOR UPDATE', [groupId]);
        if (!groups.length) throw adminError(404, 'Group not found.');
        const [members] = await connection.execute('SELECT isadmin FROM group_members WHERE groupid = ? AND userid = ? FOR UPDATE', [groupId, userId]);
        if (members[0]?.isadmin !== true && members[0]?.isadmin !== 1) throw adminError(403, 'Group administrator permission required.');
        const result = await work(connection);
        await connection.commit();
        return result;
    } catch (error) {
        await connection.rollback().catch(() => {});
        throw error;
    } finally {
        connection.release();
    }
}

module.exports = { adminError, withAdminGroup };
