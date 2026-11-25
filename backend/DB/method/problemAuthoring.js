function createMysqlProblemAuthoringRepository(pool) {
    async function isGroupAdmin(executor, groupId, userId, lock = false) {
        if (lock) {
            const [groups] = await executor.execute('SELECT groupid FROM user_groups WHERE groupid = ? FOR UPDATE', [groupId]);
            if (!groups.length) return false;
        }
        const [rows] = await executor.execute(`SELECT isadmin FROM group_members WHERE groupid = ? AND userid = ?${lock ? ' FOR UPDATE' : ''}`, [groupId, userId]);
        return rows[0]?.isadmin === true || rows[0]?.isadmin === 1;
    }

    return {
        async withTransaction(work, onRollback) {
            const connection = await pool.getConnection();
            try {
                await connection.beginTransaction();
                const result = await work({
                    isGroupAdmin: (groupId, userId) => isGroupAdmin(connection, groupId, userId, true),
                    async insertProblem({ groupId, userId, title }) {
                        const [result] = await connection.execute('INSERT INTO problems (groupid, adduser, ispublic, title, status) VALUES (?, ?, FALSE, ?, \'DRAFT\')', [groupId, userId, title]);
                        return result.insertId;
                    },
                    async markReady(problemId, isPublic) {
                        const [result] = await connection.execute('UPDATE problems SET status = \'READY\', ispublic = ? WHERE problemid = ?', [isPublic, problemId]);
                        if (result.affectedRows !== 1) throw new Error('Created problem could not be marked ready.');
                    },
                    async getProblemForUpdate(groupId, problemId) {
                        const [rows] = await connection.execute('SELECT problemid AS problemId, groupid AS groupId, title, status, ispublic AS isPublic FROM problems WHERE groupid = ? AND problemid = ? FOR UPDATE', [groupId, problemId]);
                        return rows[0] ? { ...rows[0], isPublic: Boolean(rows[0].isPublic) } : null;
                    },
                    async updateProblem(groupId, problemId, title, isPublic) {
                        await connection.execute('UPDATE problems SET title = ?, ispublic = ? WHERE groupid = ? AND problemid = ?', [title, isPublic, groupId, problemId]);
                    },
                });
                await connection.commit();
                return result;
            } catch (error) {
                let recoveryError;
                if (onRollback) {
                    try { await onRollback(); }
                    catch (failure) { recoveryError = failure; }
                }
                await connection.rollback().catch(() => {});
                throw recoveryError ?? error;
            } finally { connection.release(); }
        },
        isGroupAdmin: (groupId, userId) => isGroupAdmin(pool, groupId, userId),
        async listProblems(groupId) {
            const [rows] = await pool.execute('SELECT problemid AS problemId, groupid AS groupId, title, status, ispublic AS isPublic FROM problems WHERE groupid = ? ORDER BY problemid DESC', [groupId]);
            return rows.map((row) => ({ ...row, isPublic: Boolean(row.isPublic) }));
        },
        async getProblemById(problemId) {
            const [rows] = await pool.execute('SELECT problemid AS problemId, groupid AS groupId, title, status, ispublic AS isPublic FROM problems WHERE problemid = ?', [problemId]);
            return rows[0] ? { ...rows[0], isPublic: Boolean(rows[0].isPublic) } : null;
        },
    };
}

module.exports = { createMysqlProblemAuthoringRepository };
