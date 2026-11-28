const express = require('express');
const { getGroupById, getGroupSetupForAdmin, updateGroupSetupForAdmin } = require('../../../DB/method/groups');

const router = express.Router();

router.patch('/groups/:groupId', async (req, res) =>{
    const groupValue = req.params.groupId.trim();
    const groupId = Number(groupValue);
    if (!/^\d+$/.test(groupValue) || !Number.isSafeInteger(groupId) || groupId <= 0 || groupId > 4294967295) {
        return res.status(400).json({ error: 'Invalid group ID.' });
    }
    const { userId: rawUserId, groupName } = req.body ?? {};

    // 1. userId 검증
    const value = (
        typeof rawUserId === 'string' || typeof rawUserId === 'number'
    ) ? String(rawUserId).trim() : '';

    const userId = Number(value);

    if (
        !/^\d+$/.test(value) ||
        !Number.isSafeInteger(userId) ||
        userId <= 0 ||
        userId > 4294967295
    ) {
        return res.status(400).json({ error: 'Invalid user ID.' });
    }

    // 2. groupName 검증
    if (typeof groupName !== 'string' || groupName.trim() === '' || groupName.trim().length > 100) {
        return res.status(400).json({ error: 'Invalid group name.' });
    }

    // 3. 검증 완료된 데이터
    const validatedData = {
        userId,
        groupName: groupName.trim()
    };

    try {
        if (!await getGroupById(groupId)) {
            return res.status(404).json({ error: 'Group not found.' });
        }
        if (!await getGroupSetupForAdmin(groupId, validatedData.userId)) {
            return res.status(403).json({ error: 'Group administrator permission required.' });
        }
        await updateGroupSetupForAdmin(groupId, validatedData.userId, validatedData.groupName);
        const group = await getGroupSetupForAdmin(groupId, validatedData.userId);
        if (!group) {
            return res.status(403).json({ error: 'Group administrator permission required.' });
        }
        return res.json({ group });
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ error: 'Group name already exists.' });
        }
        console.error('Failed to save group setup:', error);
        return res.status(500).json({ error: 'Failed to save group setup.' });
  }
});

module.exports = router;
