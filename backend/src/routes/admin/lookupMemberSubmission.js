const express = require('express');
const { getMemberSubmission } = require('../../../DB/method/admin/progress');
const { parseId, sendError } = require('./validation');
const router = express.Router();

router.get('/groups/:groupId/problems/:problemId/members/:memberId/submissions/:submissionId', async (req, res) => {
    const groupId = parseId(req.params.groupId);
    const problemId = parseId(req.params.problemId);
    const memberId = parseId(req.params.memberId);
    const submissionId = parseId(req.params.submissionId);
    const userId = parseId(req.query.userId);
    if (!groupId || !problemId || !memberId || !submissionId || !userId) return res.status(400).json({ error: 'Invalid group, problem, member or submission ID.' });
    try { return res.set('Cache-Control', 'no-store').json(await getMemberSubmission(groupId, problemId, memberId, submissionId, userId)); }
    catch (error) { return sendError(res, error, 'Failed to look up submitted source code.'); }
});

module.exports = router;
