const express = require('express');
const router = express.Router();
const {
  createSubmission,
  getSubmissionById,
  getPendingSubmissionIdsBefore,
  updatePendingSubmission
} = require('../../DB/method/submissions');
const JUDGE_SERVER_URL = process.env.JUDGE_SERVER_URL;
const JUDGE_CALLBACK_TOKEN = process.env.JUDGE_CALLBACK_TOKEN;
const JUDGE_REQUEST_TIMEOUT_MS = 5000;
const PENDING_TIMEOUT_MS = 5 * 60 * 1000;
const PENDING_SWEEP_INTERVAL_MS = 30 * 1000;
const allowedResults = ['AC', 'WA', 'CE', 'RE', 'TLE', 'MLE', 'OLE', 'JE'];
const resultStreams = new Map();

if (!JUDGE_SERVER_URL) {
  throw new Error('Missing environment variable: JUDGE_SERVER_URL');
}

if (!JUDGE_CALLBACK_TOKEN) {
  throw new Error('Missing environment variable: JUDGE_CALLBACK_TOKEN');
}

function sendResult(stream, submissionId, result) {
  stream.write(`data: ${JSON.stringify({ submissionId, result })}\n\n`);
}

function closeResultStreams(submissionId, result) {
  const streams = resultStreams.get(submissionId);

  if (!streams) return;

  for (const stream of streams) {
    sendResult(stream, submissionId, result);
    stream.end();
  }

  resultStreams.delete(submissionId);
}

async function markSubmissionAsJudgeError(submissionId) {
  try {
    const affectedRows = await updatePendingSubmission(submissionId, 'JE');

    if (affectedRows > 0) {
      closeResultStreams(submissionId, 'JE');
    }
  } catch (err) {
    console.error('Failed to mark submission as JE:', err);
  }
}

async function expireStaleSubmissions() {
  try {
    const cutoff = new Date(Date.now() - PENDING_TIMEOUT_MS);
    const submissionIds = await getPendingSubmissionIdsBefore(cutoff);

    for (const submissionId of submissionIds) {
      const affectedRows = await updatePendingSubmission(submissionId, 'JE');

      if (affectedRows > 0) {
        closeResultStreams(submissionId, 'JE');
      }
    }
  } catch (err) {
    console.error('Failed to expire stale submissions:', err);
  }
}

setInterval(
  expireStaleSubmissions,
  PENDING_SWEEP_INTERVAL_MS
).unref();

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

  // 로그인 구현 전 임시 사용자
  const userId = 1;

  let submissionId;

  try {
    submissionId = await createSubmission(
      problemId,
      userId,
      language,
      source
    );
  } catch (err) {
    console.error('Failed to save submission:', err);

    return res.status(500).json({
      error: 'Failed to save submission.'
    });
  }

  try {
    // Backend -> Go Judge
    const judgeResponse = await fetch(
      `${JUDGE_SERVER_URL}/api/submissions`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${JUDGE_CALLBACK_TOKEN}`
        },
        body: JSON.stringify({
          submissionId,
          problemId,
          language,
          source
        }),
        signal: AbortSignal.timeout(JUDGE_REQUEST_TIMEOUT_MS)
      }
    );

    if (!judgeResponse.ok) {
      await markSubmissionAsJudgeError(submissionId);

      return res.status(502).json({
        error: 'Judge server request failed.',
        submissionId,
        result: 'JE'
      });
    }

    return res.status(202).json({
      submissionId,
      result: "PENDING"
    });

  } catch (err) {
    console.error('Judge server connection failed:', err);
    await markSubmissionAsJudgeError(submissionId);

    return res.status(502).json({
      error: 'Failed to connect to judge server.',
      submissionId,
      result: 'JE'
    });
  }
});

// GET /api/submissions/:id
router.get('/submissions/:id', async (req, res) => {
  const submissionId = Number(req.params.id);

  if (!Number.isSafeInteger(submissionId) || submissionId <= 0) {
    return res.status(400).json({
      error: 'Invalid submission ID.'
    });
  }

  try {
    const submission = await getSubmissionById(submissionId);

    if (!submission) {
      return res.status(404).json({
        error: 'Submission not found.'
      });
    }

    return res.status(200).json({
      submissionId: submission.submitid,
      result: submission.status
    });
  } catch (err) {
    console.error('Failed to find submission:', err);

    return res.status(500).json({
      error: 'Failed to find submission.'
    });
  }
});

// Frontend <- Backend SSE
router.get('/submissions/:id/events', async (req, res) => {
  const submissionId = Number(req.params.id);

  if (!Number.isSafeInteger(submissionId) || submissionId <= 0) {
    return res.status(400).json({
      error: 'Invalid submission ID.'
    });
  }

  let submission;

  try {
    submission = await getSubmissionById(submissionId);
  } catch (err) {
    console.error('Failed to find submission:', err);

    return res.status(500).json({
      error: 'Failed to find submission.'
    });
  }

  if (!submission) {
    return res.status(404).json({
      error: 'Submission not found.'
    });
  }

  res.set({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no'
  });
  res.flushHeaders();

  if (submission.status !== 'PENDING') {
    sendResult(res, submissionId, submission.status);
    return res.end();
  }

  const streams = resultStreams.get(submissionId) ?? new Set();
  streams.add(res);
  resultStreams.set(submissionId, streams);

  req.on('close', () => {
    streams.delete(res);

    if (streams.size === 0) {
      resultStreams.delete(submissionId);
    }
  });

  // SSE 연결 직전에 채점이 끝난 경우도 DB에서 다시 확인합니다.
  try {
    const latestSubmission = await getSubmissionById(submissionId);

    if (latestSubmission &&
        latestSubmission.status !== 'PENDING' &&
        !res.writableEnded) {
      closeResultStreams(submissionId, latestSubmission.status);
    }
  } catch (err) {
    console.error('Failed to refresh submission:', err);
  }
});

//결과 반환
router.post('/result', async (req, res) => {
  if (req.get('Authorization') !== `Bearer ${JUDGE_CALLBACK_TOKEN}`) {
    return res.status(401).json({
      error: 'Unauthorized judge callback.'
    });
  }

  const submissionId = req.body.SubmissionID;
  const result = req.body.Result;

  if (!Number.isSafeInteger(submissionId) ||
      submissionId <= 0 ||
      !allowedResults.includes(result)) {
    return res.status(400).json({
      error: 'Invalid judge result.'
    });
  }

  console.log('Judge result received:', req.body);

  try {
    const affectedRows = await updatePendingSubmission(submissionId, result);

    if (affectedRows === 0) {
      const submission = await getSubmissionById(submissionId);

      if (!submission) {
        return res.status(404).json({
          error: 'Submission not found.'
        });
      }

      return res.status(200).json({
        message: 'Result ignored because submission is already final.',
        submissionId,
        result: submission.status
      });
    }
  } catch (err) {
    console.error('Failed to save judge result:', err);

    return res.status(500).json({
      error: 'Failed to save judge result.'
    });
  }

  closeResultStreams(submissionId, result);

  return res.status(200).json({
    message: 'Result received'
  });
});

module.exports = router;
