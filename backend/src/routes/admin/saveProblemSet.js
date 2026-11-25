const express = require('express');
const { updateAdminProblemSet } = require('../../../DB/method/admin/problemSets');
const { parseId, sendError } = require('./validation');
const router = express.Router();

router.patch('/groups/:groupId/problemsets/:setId', async (req, res) => {
    const groupId = parseId(req.params.groupId);
    const setId = parseId(req.params.setId);
    const userId = parseId(req.body?.userId);
    const { setName, description } = req.body ?? {};
    if (!groupId || !setId || !userId) return res.status(400).json({ error: 'Invalid group, problem set or user ID.' });
    if (typeof setName !== 'string' || !setName.trim() || setName.trim().length > 100) return res.status(400).json({ error: 'Invalid problem set name.' });
    if (description !== null && (typeof description !== 'string' || description.length > 5000)) return res.status(400).json({ error: 'Invalid description.' });
    try {
        const problemSet = await updateAdminProblemSet(groupId, setId, userId, setName.trim(), description?.trim() ? description : null);
        return res.json({ problemSet });
    } catch (error) { return sendError(res, error, 'Failed to update problem set.'); }
});

module.exports = router;
