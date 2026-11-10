const express = require('express');
const { getProblemSetById } = require('../../DB/method/problemSets');
const { getAvailProblemsInSet } = require('../../DB/method/problems');

const router = express.Router();

router.get('/problemsets/:setId', async (req, res) => {
    const userValue = typeof req.query.userId === 'string' ? req.query.userId.trim() : '';
    const userId = Number(userValue);
    const setValue = req.params.setId.trim();
    const setId = Number(setValue);

    if (!/^\d+$/.test(userValue) || !Number.isSafeInteger(userId) || userId <= 0 || userId > 4294967295) {
        return res.status(400).json({ error: 'Invalid user ID.' });
    }
    if (!/^\d+$/.test(setValue) || !Number.isSafeInteger(setId) || setId <= 0 || setId > 4294967295) {
        return res.status(400).json({ error: 'Invalid set ID.' });
    }

    try {
        const problemSet = await getProblemSetById(setId);
        if (!problemSet) {
            return res.status(404).json({ error: 'Problem set not found.' });
        }

        const problemList = await getAvailProblemsInSet(setId, problemSet.groupid, userId);
        const problems = problemList.map((problem) => ({
            ...problem,
            isSolved: Boolean(problem.isSolved),
        }));

        return res.json({
            problemSet: {
                setId: problemSet.setid,
                setName: problemSet.setname,
                description: problemSet.description ?? null,
            },
            problems,
        });
    } catch (error) {
        console.error('Failed to look up problem set:', error);
        return res.status(500).json({ error: 'Failed to look up problem set.' });
    }
});

module.exports = router;
