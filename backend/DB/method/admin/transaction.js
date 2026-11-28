const pool = require('../../connection');

function adminError(status, message) {
    return Object.assign(new Error(message), { status });
}

async function runAdminGroup(groupId, userId, work, readOnly) {
    const connection = await pool.getConnection();
    try {
        if (readOnly) await connection.query('START TRANSACTION READ ONLY');
        else await connection.beginTransaction();
        // Reads use the transaction snapshot; management writes keep their row locks.
        const lock = readOnly ? '' : ' FOR UPDATE';
        const [groups] = await connection.execute(`SELECT groupid FROM user_groups WHERE groupid = ?${lock}`, [groupId]);
        if (!groups.length) throw adminError(404, 'Group not found.');
        const [members] = await connection.execute(`SELECT isadmin FROM group_members WHERE groupid = ? AND userid = ?${lock}`, [groupId, userId]);
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

function withAdminGroup(groupId, userId, work) {
    return runAdminGroup(groupId, userId, work, false);
}

function readAdminGroup(groupId, userId, work) {
    return runAdminGroup(groupId, userId, work, true);
}

module.exports = { adminError, withAdminGroup, readAdminGroup };
