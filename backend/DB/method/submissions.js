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

// Do not overwrite a result that has already reached a final state.
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
async function getSubmissionByuserId(userid) {
    const [rows] = await pool.execute(
        `SELECT
            s.submitid AS submissionId,
            s.problemid AS problemId,
            p.title AS title,
            s.language AS language,
            s.status AS result,
            s.submitted_at AS submittedAt
        FROM submissions AS s
        INNER JOIN problems AS p
            ON s.problemid = p.problemid
        WHERE s.userid = ?
        ORDER BY s.submitid DESC`,
        [userid]
    );
    return rows;
}
module.exports = {
    createSubmission,
    getSubmissionById,
    getSubmissionByuserId,
    updateSubmission,
    getPendingSubmissionIdsBefore,
    updatePendingSubmission,
    deleteSubmission,
};
