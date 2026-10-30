const pool = require('../connection');

async function createUser(username) {
    const [result] = await pool.execute(
        'INSERT INTO users (username) VALUES (?)',
        [username]
    );
    return result.insertId;
}

async function getUserById(userid) {
    const [rows] = await pool.execute(
        'SELECT * FROM users WHERE userid = ?',
        [userid]
    );
    return rows[0] ?? null;
}

async function updateUser(userid, username) {
    const [result] = await pool.execute(
        'UPDATE users SET username = ? WHERE userid = ?',
        [username, userid]
    );
    return result.affectedRows;
}

async function deleteUser(userid) {
    const [result] = await pool.execute(
        'DELETE FROM users WHERE userid = ?',
        [userid]
    );
    return result.affectedRows;
}

module.exports = { createUser, getUserById, updateUser, deleteUser };
