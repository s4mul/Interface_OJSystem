const express = require('express');
const {getProblemsetByGroupId} = require('../../DB/method/problemSets');
const router = express.Router();

router.get('/problemsets', async (req, res) => {
    const Value = typeof req.query.groupId === 'string' ? req.query.groupId.trim() : '';
    const Id = Number(Value);

    if (!/^\d+$/.test(Value) || !Number.isSafeInteger(Id) || Id <= 0 || Id > 4294967295) {
        return res.status(400).json({ error: 'Invalid group ID.' });
    }

    try{
        const rows = await getProblemsetByGroupId(Id);
        return res.json({problemSets: rows});
    }catch(error){
        console.error('fail to lookup problemsets: ',error)
        return res.status(500).json({error: 'Failed to look up problem sets.'});
    }
})

module.exports = router;



