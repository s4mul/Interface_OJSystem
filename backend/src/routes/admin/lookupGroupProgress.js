const express = require('express');
const { getGroupProblemProgress } = require('../../../DB/method/admin/progress');
const { parseId, sendError } = require('./validation');
const router = express.Router();

router.get('/groups/:groupId/progress', async (req, res) => {
    const groupId = parseId(req.params.groupId);
    const userId = parseId(req.query.userId);
    if (!groupId || !userId) return res.status(400).json({ error: 'Invalid group or user ID.' });
    try { return res.set('Cache-Control', 'no-store').json(await getGroupProblemProgress(groupId, userId)); }
    catch (error) { return sendError(res, error, 'Failed to look up group problem progress.'); }
});

module.exports = router;
