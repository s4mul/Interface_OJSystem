const express = require('express');
const { createAdminProblemSet } = require('../../../DB/method/admin/problemSets');
const { parseId, sendError } = require('./validation');
const router = express.Router();

router.post('/groups/:groupId/problemsets', async (req, res) => {
    const groupId = parseId(req.params.groupId);
    const userId = parseId(req.body?.userId);
    const { setName, description } = req.body ?? {};
    if (!groupId || !userId) return res.status(400).json({ error: 'Invalid group or user ID.' });
    if (typeof setName !== 'string' || !setName.trim() || setName.trim().length > 100) return res.status(400).json({ error: 'Invalid problem set name.' });
    if (description !== null && (typeof description !== 'string' || description.length > 5000)) return res.status(400).json({ error: 'Invalid description.' });
    try {
        const problemSet = await createAdminProblemSet(groupId, userId, setName.trim(), description?.trim() ? description : null);
        return res.status(201).json({ problemSet });
    } catch (error) { return sendError(res, error, 'Failed to create problem set.'); }
});

module.exports = router;
