const { adminError, readAdminGroup } = require('./transaction');

async function getProblem(connection, groupId, problemId) {
    const [rows] = await connection.execute('SELECT problemid FROM problems WHERE groupid = ? AND problemid = ?', [groupId, problemId]);
    if (!rows.length) throw adminError(404, 'Problem not found in this group.');
}

async function getMember(connection, groupId, memberId) {
    const [rows] = await connection.execute(
        `SELECT gm.userid AS userId, u.username FROM group_members AS gm
         JOIN users AS u ON u.userid = gm.userid WHERE gm.groupid = ? AND gm.userid = ?`,
        [groupId, memberId]
    );
    if (!rows.length) throw adminError(404, 'Group member not found.');
    return rows[0];
}

function submissionData(row) {
    return { ...row, submittedAt: new Date(row.submittedAt).toISOString() };
}

async function getGroupProblemProgress(groupId, userId) {
    return readAdminGroup(groupId, userId, async (connection) => {
        const [members] = await connection.execute('SELECT COUNT(*) AS totalCount FROM group_members WHERE groupid = ?', [groupId]);
        const [problems] = await connection.execute(
            `SELECT p.problemid AS problemId, COUNT(DISTINCT gm.userid) AS solvedCount
             FROM problems AS p
             LEFT JOIN submissions AS s ON s.problemid = p.problemid AND s.status = 'AC'
             LEFT JOIN group_members AS gm ON gm.groupid = p.groupid AND gm.userid = s.userid
             WHERE p.groupid = ? GROUP BY p.problemid ORDER BY p.problemid`, [groupId]
        );
        return { groupId, totalCount: Number(members[0].totalCount), problems: problems.map((row) => ({ problemId: row.problemId, solvedCount: Number(row.solvedCount) })) };
    });
}

async function getProblemProgress(groupId, problemId, userId) {
    return readAdminGroup(groupId, userId, async (connection) => {
        await getProblem(connection, groupId, problemId);
        const [rows] = await connection.execute(
            `SELECT gm.userid AS userId, u.username,
                    COALESCE(history.submissionCount, 0) AS submissionCount,
                    COALESCE(history.isSolved, 0) AS isSolved, latest.status AS latestResult
             FROM group_members AS gm JOIN users AS u ON u.userid = gm.userid
             LEFT JOIN (
                 SELECT userid, COUNT(*) AS submissionCount, MAX(status = 'AC') AS isSolved, MAX(submitid) AS latestId
                 FROM submissions WHERE problemid = ? GROUP BY userid
             ) AS history ON history.userid = gm.userid
             LEFT JOIN submissions AS latest ON latest.submitid = history.latestId
             WHERE gm.groupid = ? ORDER BY u.username, gm.userid`, [problemId, groupId]
        );
        const people = rows.map((row) => {
            const solved = Number(row.isSolved) === 1;
            const submissionCount = Number(row.submissionCount);
            const bucket = solved ? 'solved' : !submissionCount || ['PENDING', 'JUDGING'].includes(row.latestResult) ? 'working' : 'failed';
            return { userId: row.userId, username: row.username, submissionCount, bucket, result: solved ? 'AC' : row.latestResult, latestResult: row.latestResult };
        });
        return { groupId, problemId, totalCount: people.length, solvedCount: people.filter((member) => member.bucket === 'solved').length, people };
    });
}

async function getMemberProblemSubmissions(groupId, problemId, memberId, userId) {
    return readAdminGroup(groupId, userId, async (connection) => {
        await getProblem(connection, groupId, problemId);
        const member = await getMember(connection, groupId, memberId);
        const [rows] = await connection.execute(
            `SELECT s.submitid AS submissionId, s.problemid AS problemId, s.userid AS userId,
                    p.title, s.language, s.status AS result, s.submitted_at AS submittedAt
             FROM submissions AS s JOIN problems AS p ON p.problemid = s.problemid
             WHERE p.groupid = ? AND s.problemid = ? AND s.userid = ? ORDER BY s.submitid DESC`,
            [groupId, problemId, memberId]
        );
        return { groupId, problemId, member, submissions: rows.map(submissionData) };
    });
}

async function getMemberSubmission(groupId, problemId, memberId, submissionId, userId) {
    return readAdminGroup(groupId, userId, async (connection) => {
        await getProblem(connection, groupId, problemId);
        const member = await getMember(connection, groupId, memberId);
        const [rows] = await connection.execute(
            `SELECT s.submitid AS submissionId, s.problemid AS problemId, s.userid AS userId,
                    p.title, s.language, s.status AS result, s.submitted_at AS submittedAt, s.source
             FROM submissions AS s JOIN problems AS p ON p.problemid = s.problemid
             WHERE p.groupid = ? AND s.problemid = ? AND s.userid = ? AND s.submitid = ?`,
            [groupId, problemId, memberId, submissionId]
        );
        if (!rows.length) throw adminError(404, 'Submission not found for this group member and problem.');
        return { groupId, problemId, member, submission: submissionData(rows[0]) };
    });
}

module.exports = { getGroupProblemProgress, getProblemProgress, getMemberProblemSubmissions, getMemberSubmission };
