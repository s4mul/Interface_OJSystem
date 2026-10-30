const pool = require('../connection');

// submitted_at은 DB의 DEFAULT CURRENT_TIMESTAMP로 자동 기록합니다.
async function createSubmission(
    problemid,
    userid,
    language,
    source,
    status = 'PENDING'
) {
    const [result] = await pool.execute(
        `INSERT INTO submissions
            (problemid, userid, language, source, status)
         VALUES (?, ?, ?, ?, ?)`,
        [problemid, userid, language, source, status]
    );
    return result.insertId;
}

async function getSubmissionById(submitid) {
    const [rows] = await pool.execute(
        'SELECT * FROM submissions WHERE submitid = ?',
        [submitid]
    );
    return rows[0] ?? null;
}

// 제출 ID·접수 시각은 수정하지 않고 채점 상태만 갱신합니다.
async function updateSubmission(submitid, status) {
    const [result] = await pool.execute(
        'UPDATE submissions SET status = ? WHERE submitid = ?',
        [status, submitid]
    );
    return result.affectedRows;
}

async function getPendingSubmissionIdsBefore(cutoff) {
    const [rows] = await pool.execute(
        `SELECT submitid
         FROM submissions
         WHERE status = 'PENDING' AND submitted_at <= ?`,
        [cutoff]
    );
    return rows.map((row) => row.submitid);
}

async function updatePendingSubmission(submitid, status) {
    const [result] = await pool.execute(
        `UPDATE submissions
         SET status = ?
         WHERE submitid = ? AND status = 'PENDING'`,
        [status, submitid]
    );
    return result.affectedRows;
}

async function deleteSubmission(submitid) {
    const [result] = await pool.execute(
        'DELETE FROM submissions WHERE submitid = ?',
        [submitid]
    );
    return result.affectedRows;
}

module.exports = {
    createSubmission,
    getSubmissionById,
    updateSubmission,
    getPendingSubmissionIdsBefore,
    updatePendingSubmission,
    deleteSubmission
};
