const express = require('express');
const { getAdminMembers } = require('../../../DB/method/admin/groups');
const { parseId, sendError } = require('./validation');
const router = express.Router();

router.get('/groups/:groupId/members', async (req, res) => {
    const groupId = parseId(req.params.groupId);
    const userId = parseId(req.query.userId);
    if (!groupId || !userId) return res.status(400).json({ error: 'Invalid group or user ID.' });
    try { return res.json({ members: await getAdminMembers(groupId, userId) }); }
    catch (error) { return sendError(res, error, 'Failed to look up group members.'); }
});

module.exports = router;
