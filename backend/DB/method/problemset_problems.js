
const pool = require('../connection');

async function createProblemGroup(setid, problemid) {
    const [result] = await pool.execute(
        'INSERT INTO problemset_problems (setid, problemid) VALUES (?, ?)',
        [setid, problemid]
    );
    return result.insertId;
}

async function getProblemGroupById(idx) {
    const [rows] = await pool.execute(
        'SELECT * FROM problemset_problems WHERE idx = ?',
        [idx]
    );
    return rows[0] ?? null;
}

async function updateProblemGroup(idx, setid, problemid) {
    const [result] = await pool.execute(
        'UPDATE problemset_problems SET setid = ?, problemid = ? WHERE idx = ?',
        [setid, problemid, idx]
    );
    return result.affectedRows;
}

async function deleteProblemGroup(idx) {
    const [result] = await pool.execute(
        'DELETE FROM problemset_problems WHERE idx = ?',
        [idx]
    );
    return result.affectedRows;
}

module.exports = {
    createProblemGroup,
    getProblemGroupById,
    updateProblemGroup,
    deleteProblemGroup
};
