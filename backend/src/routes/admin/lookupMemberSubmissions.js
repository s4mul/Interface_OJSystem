const express = require('express');
const { getMemberProblemSubmissions } = require('../../../DB/method/admin/progress');
const { parseId, sendError } = require('./validation');
const router = express.Router();

router.get('/groups/:groupId/problems/:problemId/members/:memberId/submissions', async (req, res) => {
    const groupId = parseId(req.params.groupId);
    const problemId = parseId(req.params.problemId);
    const memberId = parseId(req.params.memberId);
    const userId = parseId(req.query.userId);
    if (!groupId || !problemId || !memberId || !userId) return res.status(400).json({ error: 'Invalid group, problem or user ID.' });
    try { return res.set('Cache-Control', 'no-store').json(await getMemberProblemSubmissions(groupId, problemId, memberId, userId)); }
    catch (error) { return sendError(res, error, 'Failed to look up member submissions.'); }
});

module.exports = router;
