const express = require('express');
const { findUsersByUsername } = require('../../DB/method/users');

const router = express.Router();

router.get('/users', async (req, res) => {
  const username = typeof req.query.username === 'string' ? req.query.username.trim() : '';

  if (!username || Array.from(username).length > 100) {
    return res.status(400).json({ error: 'Username must be between 1 and 100 characters.' });
  }

  try {
    const users = await findUsersByUsername(username);
    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found.' });
    }
    if (users.length > 1) {
      return res.status(409).json({ error: 'Multiple users match this username.' });
    }

    const user = users[0];
    return res.json({ userId: user.userid, username: user.username });
  } catch (error) {
    console.error('Failed to look up user:', error);
    return res.status(500).json({ error: 'Failed to look up user.' });
  }
});

module.exports = router;
