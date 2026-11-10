const pool = require('../connection');

async function createProblemSet(groupid, setname, start_at = null, end_at = null, description = null) {
    const [result] = await pool.execute(
        'INSERT INTO problemset (groupid, setname, start_at, end_at, description) VALUES (?, ?, ?, ?, ?)',
        [groupid, setname, start_at, end_at, description]
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

async function getProblemsetByGroupId(groupId){
    const [rows] = await pool.execute(
        'SELECT setid as setId, setname as setName FROM problemset WHERE groupid = ?',
        [groupId]
    )

    return rows
}

async function updateProblemSet(setid, groupid, setname, start_at, end_at, description) {
    const fields = ['groupid = ?', 'setname = ?', 'start_at = ?', 'end_at = ?'];
    const values = [groupid, setname, start_at, end_at];

    if (description !== undefined) {
        fields.push('description = ?');
        values.push(description);
    }

    const [result] = await pool.execute(
        `UPDATE problemset SET ${fields.join(', ')} WHERE setid = ?`,
        [...values, setid]
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

module.exports = { createProblemSet, getProblemSetById, updateProblemSet, deleteProblemSet, getProblemsetByGroupId };
