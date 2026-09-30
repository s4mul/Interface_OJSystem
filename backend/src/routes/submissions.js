const express = require('express');
const router = express.Router();

// POST /api/submissions
router.post('/submissions', (req, res) => {
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

  // 4. 2회차 요구사항에 맞춘 임시(Mock) 채점 결과 반환
  return res.json({
    submissionId: 1,
    status: 'AC'
  });
});

module.exports = router;
