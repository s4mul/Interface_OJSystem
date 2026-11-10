
const pool = require('../connection');

async function createProblem(groupid, adduser, ispublic, title) {
    const [result] = await pool.execute(
        'INSERT INTO problems (groupid, adduser, ispublic, title) VALUES (?, ?, ?, ?)',
        [groupid, adduser, ispublic, title]
    );
    return result.insertId;
}

async function getProblemById(problemid) {
    const [rows] = await pool.execute(
        'SELECT * FROM problems WHERE problemid = ?',
        [problemid]
    );
    return rows[0] ?? null;
}
async function getAvailProblemsInGroup(groupId, userId) {
    const [rows] = await pool.execute(
        `SELECT
            p.problemid AS problemId,
            p.title,
            p.status,
            EXISTS (
                SELECT 1
                FROM submissions AS s
                WHERE s.userid = gm.userid
                  AND s.problemid = p.problemid
                  AND s.status = 'AC'
            ) AS isSolved
         FROM problems AS p
         JOIN group_members AS gm ON gm.groupid = p.groupid
         WHERE gm.userid = ?
           AND p.groupid = ?
           AND p.status = 'READY'
           AND p.ispublic = TRUE
         ORDER BY p.problemid`,
        [userId, groupId]
    );
    return rows;
}

async function getAvailProblemsInSet(setId, groupId, userId) {
    const [rows] = await pool.execute(
        `SELECT
            p.problemid AS problemId,
            p.title,
            p.status,
            EXISTS (
                SELECT 1
                FROM submissions AS s
                WHERE s.userid = ?
                  AND s.problemid = p.problemid
                  AND s.status = 'AC'
            ) AS isSolved
         FROM problems AS p
         JOIN problemset_problems AS pp ON pp.problemid = p.problemid
         WHERE pp.setid = ?
           AND p.groupid = ?
           AND p.status = 'READY'
           AND p.ispublic = TRUE
         ORDER BY p.problemid`,
        [userId, setId, groupId]
    );
    return rows;
}

async function updateProblem(problemid, groupid, adduser, ispublic, title) {
    const [result] = await pool.execute(
        'UPDATE problems SET groupid = ?, adduser = ?, ispublic = ?, title = ? WHERE problemid = ?',
        [groupid, adduser, ispublic, title, problemid]
    );
    return result.affectedRows;
}

async function deleteProblem(problemid) {
    const [result] = await pool.execute(
        'DELETE FROM problems WHERE problemid = ?',
        [problemid]
    );
    return result.affectedRows;
}

module.exports = {
    createProblem,
    getProblemById,
    updateProblem,
    deleteProblem,
    getAvailProblemsInGroup,
    getAvailProblemsInSet
};
