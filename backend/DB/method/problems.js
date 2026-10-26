
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
    deleteProblem
};
