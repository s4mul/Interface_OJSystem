const express = require('express');
const { createAdminGroup } = require('../../../DB/method/admin/groups');
const { parseId, sendError } = require('./validation');
const router = express.Router();

router.post('/groups', async (req, res) => {
    const userId = parseId(req.body?.userId);
    const groupName = req.body?.groupName;
    if (!userId) return res.status(400).json({ error: 'Invalid user ID.' });
    if (typeof groupName !== 'string' || !groupName.trim() || groupName.trim().length > 100) return res.status(400).json({ error: 'Invalid group name.' });
    try {
        const group = await createAdminGroup(userId, groupName.trim());
        return res.status(201).json({ group });
    } catch (error) { return sendError(res, error, 'Failed to create group.'); }
});

module.exports = router;
