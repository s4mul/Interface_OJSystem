const express = require('express');
const { getGroupById, getGroupSetupForAdmin } = require('../../../DB/method/groups');

const router = express.Router();

router.get('/groups/:groupId', async (req, res) =>{
    const groupValue = req.params.groupId.trim();
    const groupId = Number(groupValue);
    if (!/^\d+$/.test(groupValue) || !Number.isSafeInteger(groupId) || groupId <= 0 || groupId > 4294967295) {
        return res.status(400).json({ error: 'Invalid group ID.' });
    }
    const value = typeof req.query.userId === 'string' ? req.query.userId.trim() : '';
    const userId = Number(value);

    if (!/^\d+$/.test(value) || !Number.isSafeInteger(userId) || userId <= 0 || userId > 4294967295) {
        return res.status(400).json({ error: 'Invalid user ID.' });
    }

    try {
        if (!await getGroupById(groupId)) {
            return res.status(404).json({ error: 'Group not found.' });
        }
        const group = await getGroupSetupForAdmin(groupId, userId);
        if (!group) {
            return res.status(403).json({ error: 'Group administrator permission required.' });
        }
        return res.json({ group });
    } catch (error) {
        console.error('Failed to look up groups:', error);
        return res.status(500).json({ error: 'Failed to look up groups.' });
  }
});

module.exports = router;
