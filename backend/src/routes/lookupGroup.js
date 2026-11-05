const express = require('express');
const { getGroupsByUserId } = require('../../DB/method/groups');

const router = express.Router();

router.get('/groups', async (req, res) => {
  const value = typeof req.query.userId === 'string' ? req.query.userId.trim() : '';
  const userId = Number(value);

  if (!/^\d+$/.test(value) || !Number.isSafeInteger(userId) || userId <= 0 || userId > 4294967295) {
    return res.status(400).json({ error: 'Invalid user ID.' });
  }

  try {
    const groups = await getGroupsByUserId(userId);
    return res.json({ groups });
  } catch (error) {
    console.error('Failed to look up groups:', error);
    return res.status(500).json({ error: 'Failed to look up groups.' });
  }
});

module.exports = router;
