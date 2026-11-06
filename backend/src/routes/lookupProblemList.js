const express = require('express');
const { getAvailProblemsInGroup } = require('../../DB/method/problems');

const router = express.Router();

router.get('/problems', async (req, res) => {
    const userValue = typeof req.query.userId === 'string' ? req.query.userId.trim() : '';
    const userId = Number(userValue);
    const groupValue = typeof req.query.groupId === 'string' ? req.query.groupId.trim() : '';
    const groupId = Number(groupValue);

    if (!/^\d+$/.test(userValue) || !Number.isSafeInteger(userId) || userId <= 0 || userId > 4294967295) {
        return res.status(400).json({ error: 'Invalid user ID.' });
    }
    if (!/^\d+$/.test(groupValue) || !Number.isSafeInteger(groupId) || groupId <= 0 || groupId > 4294967295) {
        return res.status(400).json({ error: 'Invalid group ID.' });
    }

    try {
        const problemList = await getAvailProblemsInGroup(groupId, userId);
        const problems = problemList.map((problem) => ({
            ...problem,
            isSolved: Boolean(problem.isSolved),
        }));

        return res.json({ problems });
    } catch (error) {
        console.error('Failed to look up problems:', error);
        return res.status(500).json({ error: 'Failed to look up problems.' });
    }
});

module.exports = router;
