const pool = require('../connection');

async function createProblemSet(groupid, setname, start_at = null, end_at = null) {
    const [result] = await pool.execute(
        'INSERT INTO problemset (groupid, setname, start_at, end_at) VALUES (?, ?, ?, ?)',
        [groupid, setname, start_at, end_at]
    );
    return result.insertId;
}

async function getProblemSetById(setid) {
    const [rows] = await pool.execute(
        'SELECT * FROM problemset WHERE setid = ?',
        [setid]
    );
    return rows[0] ?? null;
}

async function updateProblemSet(setid, groupid, setname, start_at, end_at) {
    const [result] = await pool.execute(
        'UPDATE problemset SET groupid = ?, setname = ?, start_at = ?, end_at = ? WHERE setid = ?',
        [groupid, setname, start_at, end_at, setid]
    );
    return result.affectedRows;
}

async function deleteProblemSet(setid) {
    const [result] = await pool.execute(
        'DELETE FROM problemset WHERE setid = ?',
        [setid]
    );
    return result.affectedRows;
}

module.exports = { createProblemSet, getProblemSetById, updateProblemSet, deleteProblemSet };
