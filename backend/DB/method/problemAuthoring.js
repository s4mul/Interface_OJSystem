function createMysqlProblemAuthoringRepository(pool) {
    async function isGroupAdmin(executor, groupId, userId, lock = false) {
        const [rows] = await executor.execute(`SELECT isadmin FROM group_members WHERE groupid = ? AND userid = ?${lock ? ' FOR UPDATE' : ''}`, [groupId, userId]);
        return rows[0]?.isadmin === true || rows[0]?.isadmin === 1;
    }

    return {
        async withTransaction(work) {
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
                });
                await connection.commit();
                return result;
            } catch (error) {
                await connection.rollback().catch(() => {});
                throw error;
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
