const express = require('express');
const { getAdminProblemSetProblems, saveAdminProblemSetProblems } = require('../../../DB/method/admin/problemSets');
const { parseId, sendError } = require('./validation');
const router = express.Router();

router.get('/groups/:groupId/problemsets/:setId/problems', async (req, res) => {
    const groupId = parseId(req.params.groupId);
    const setId = parseId(req.params.setId);
    const userId = parseId(req.query.userId);
    if (!groupId || !setId || !userId) return res.status(400).json({ error: 'Invalid group, problem set or user ID.' });
    try { return res.json(await getAdminProblemSetProblems(groupId, setId, userId)); }
    catch (error) { return sendError(res, error, 'Failed to look up problem set problems.'); }
});

async function save(req, res) {
    const groupId = parseId(req.params.groupId);
    const setId = parseId(req.params.setId);
    const userId = parseId(req.body?.userId);
    const problemIds = req.body?.problemIds;
    if (!groupId || !setId || !userId) return res.status(400).json({ error: 'Invalid group, problem set or user ID.' });
    if (!Array.isArray(problemIds) || problemIds.length > 10000 || !problemIds.every((id) => typeof id === 'number' && parseId(id) !== null) || new Set(problemIds).size !== problemIds.length) return res.status(400).json({ error: 'problemIds must contain unique, positive integer IDs (at most 10000).' });
    try { return res.json(await saveAdminProblemSetProblems(groupId, setId, userId, problemIds, req.method === 'PUT')); }
    catch (error) { return sendError(res, error, 'Failed to save problem set problems.'); }
}

router.post('/groups/:groupId/problemsets/:setId/problems', save);
router.put('/groups/:groupId/problemsets/:setId/problems', save);

module.exports = router;
