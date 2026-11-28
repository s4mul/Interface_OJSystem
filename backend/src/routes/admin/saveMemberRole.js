const express = require('express');
const { updateAdminMember } = require('../../../DB/method/admin/groups');
const { parseId, sendError } = require('./validation');
const router = express.Router();

router.patch('/groups/:groupId/members/:memberId', async (req, res) => {
    const groupId = parseId(req.params.groupId);
    const memberId = parseId(req.params.memberId);
    const userId = parseId(req.body?.userId);
    const isAdmin = req.body?.isAdmin;
    if (!groupId || !memberId || !userId) return res.status(400).json({ error: 'Invalid group or user ID.' });
    if (typeof isAdmin !== 'boolean') return res.status(400).json({ error: 'isAdmin must be a boolean.' });
    try { return res.json({ member: await updateAdminMember(groupId, userId, memberId, isAdmin) }); }
    catch (error) { return sendError(res, error, 'Failed to update group member role.'); }
});

module.exports = router;
