const express = require('express');
const fs = require('node:fs/promises');
const path = require('node:path');
const { getProblemById } = require('../../DB/method/problems');

const router = express.Router();

router.get('/problems/:problemId', async (req, res) => {
    const problemValue = req.params.problemId.trim();
    const problemId = Number(problemValue);

    if (!/^\d+$/.test(problemValue) || !Number.isSafeInteger(problemId) || problemId <= 0 || problemId > 4294967295) {
        return res.status(400).json({ error: 'Invalid problem ID.' });
    }

    try {
        const problem = await getProblemById(problemId);
        if (!problem || problem.status !== 'READY' || !problem.ispublic) {
            return res.status(404).json({ error: 'Problem not found.' });
        }

        const directory = path.resolve(__dirname, '../../../data/problems', String(problemId));
        const [contentFile, limitsFile] = await Promise.all([
            fs.readFile(path.join(directory, 'content/problem.json'), 'utf8'),
            fs.readFile(path.join(directory, 'limits/limits.json'), 'utf8'),
        ]);
        const content = JSON.parse(contentFile);
        const limits = JSON.parse(limitsFile);

        if (
            typeof content?.description !== 'string' ||
            typeof content.input !== 'string' || typeof content.output !== 'string' ||
            !Array.isArray(content.examples) || !content.examples.every((example) =>
                typeof example?.input === 'string' && typeof example.output === 'string'
            ) ||
            ![limits?.timeLimitMs, limits?.memoryLimitMb, limits?.outputLimitKb]
                .every((limit) => Number.isFinite(limit) && limit > 0)
        ) {
            throw new Error('Invalid problem content or limits.');
        }

        return res.json({
            problem: {
                problemId: problem.problemid,
                groupId: problem.groupid,
                title: problem.title,
                description: content.description,
                input: content.input,
                output: content.output,
                examples: content.examples,
                limits: {
                    timeLimitMs: limits.timeLimitMs,
                    memoryLimitMb: limits.memoryLimitMb,
                    outputLimitKb: limits.outputLimitKb,
                },
            },
        });
    } catch (error) {
        console.error('Failed to look up problem:', error);
        return res.status(500).json({ error: 'Failed to look up problem.' });
    }
});

module.exports = router;
