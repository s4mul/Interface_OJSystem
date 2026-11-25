const { adminError, withAdminGroup } = require('./transaction');

async function lookupSet(connection, groupId, setId) {
    const [rows] = await connection.execute(
        'SELECT setid AS setId, groupid AS groupId, setname AS setName, description FROM problemset WHERE setid = ? AND groupid = ? FOR UPDATE',
        [setId, groupId]
    );
    if (!rows.length) throw adminError(404, 'Problem set not found in this group.');
    return rows[0];
}

async function createAdminProblemSet(groupId, userId, setName, description) {
    return withAdminGroup(groupId, userId, async (connection) => {
        const [result] = await connection.execute('INSERT INTO problemset (groupid, setname, description) VALUES (?, ?, ?)', [groupId, setName, description]);
        return { setId: result.insertId, groupId, setName, description };
    });
}

async function updateAdminProblemSet(groupId, setId, userId, setName, description) {
    return withAdminGroup(groupId, userId, async (connection) => {
        await lookupSet(connection, groupId, setId);
        await connection.execute('UPDATE problemset SET setname = ?, description = ? WHERE setid = ? AND groupid = ?', [setName, description, setId, groupId]);
        return { setId, groupId, setName, description };
    });
}

async function getAdminProblemSetProblems(groupId, setId, userId) {
    return withAdminGroup(groupId, userId, async (connection) => {
        const problemSet = await lookupSet(connection, groupId, setId);
        const [problems] = await connection.execute(
            `SELECT p.problemid AS problemId, p.title, p.status, p.ispublic AS isPublic
             FROM problemset_problems AS pp JOIN problems AS p ON p.problemid = pp.problemid
             WHERE pp.setid = ? AND p.groupid = ? ORDER BY p.problemid`, [setId, groupId]
        );
        return { problemSet, problemIds: problems.map((row) => row.problemId), problems: problems.map((row) => ({ ...row, isPublic: Boolean(row.isPublic) })) };
    });
}

async function saveAdminProblemSetProblems(groupId, setId, userId, problemIds, replace = false) {
    return withAdminGroup(groupId, userId, async (connection) => {
        await lookupSet(connection, groupId, setId);
        const [current] = await connection.execute('SELECT problemid AS problemId FROM problemset_problems WHERE setid = ? ORDER BY problemid FOR UPDATE', [setId]);
        const currentIds = new Set(current.map((row) => row.problemId));
        if (problemIds.length) {
            const placeholders = problemIds.map(() => '?').join(', ');
            const [problems] = await connection.execute(`SELECT problemid AS problemId, status FROM problems WHERE groupid = ? AND problemid IN (${placeholders}) FOR UPDATE`, [groupId, ...problemIds]);
            if (problems.length !== problemIds.length) throw adminError(400, 'All problems must belong to this group.');
            if (problems.some((problem) => problem.status !== 'READY' && !currentIds.has(problem.problemId))) throw adminError(409, 'Only ready problems can be added to a problem set.');
        }
        const selected = new Set(problemIds);
        const added = problemIds.filter((id) => !currentIds.has(id));
        const removed = replace ? [...currentIds].filter((id) => !selected.has(id)) : [];
        if (removed.length) {
            const keep = problemIds.length ? ` AND problemid NOT IN (${problemIds.map(() => '?').join(', ')})` : '';
            await connection.execute(`DELETE FROM problemset_problems WHERE setid = ?${keep}`, [setId, ...problemIds]);
        }
        if (added.length) {
            await connection.execute(`INSERT INTO problemset_problems (setid, problemid) VALUES ${added.map(() => '(?, ?)').join(', ')}`, added.flatMap((id) => [setId, id]));
        }
        return { addedCount: added.length, removedCount: removed.length, skippedCount: problemIds.length - added.length };
    });
}

module.exports = { createAdminProblemSet, updateAdminProblemSet, getAdminProblemSetProblems, saveAdminProblemSetProblems };
