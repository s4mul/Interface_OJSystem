const express = require('express');
const router = express.Router();
const JUDGE_SERVER_URL = process.env.JUDGE_SERVER_URL;

// POST /api/submissions
router.post('/submissions', async (req, res) => {
  const { problemId, language, source } = req.body;

  // 1. 필수 필드 존재 여부 검증
  if (problemId === undefined || !language || source === undefined) {
    return res.status(400).json({
      error: 'Invalid request: problemId, language, and source are required.'
    });
  }

  // 2. 언어 값 검증 (C, C++, Java, Python만 허용)
  const allowedLanguages = ['C', 'C++', 'Java', 'Python'];
  if (!allowedLanguages.includes(language)) {
    return res.status(400).json({
      error: 'Invalid language: Must be one of C, C++, Java, Python.'
    });
  }

  // 3. source 빈 문자열/공백 검증
  if (typeof source !== 'string' || source.trim() === '') {
    return res.status(400).json({
      error: 'Invalid source: Source code cannot be empty.'
    });
  }

   const submissionId = 1;

  try {
    // Backend -> Go Judge
    const judgeResponse = await fetch(
      `${JUDGE_SERVER_URL}/api/submissions`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          submissionId,
          problemId,
          language,
          source
        })
      }
    );

    if (!judgeResponse.ok) {
      return res.status(502).json({
        error: 'Judge server request failed.'
      });
    }

    return res.status(202).json({
      submissionId,
      result: "PENDING"
    });

  } catch (err) {
    console.error('Judge server connection failed:', err);

    return res.status(502).json({
      error: 'Failed to connect to judge server.'
    });
  }
});

//결과 반환
router.post('/result', (req, res) => {
  console.log('Judge result received:', req.body);

  return res.status(200).json({
    message: 'Result received'
  });
});

module.exports = router;