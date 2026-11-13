// Submission API and live result updates (SSE).

/**
 * Submit source code.
 * @returns {Promise<{ submissionId: number, result: string }>}
 */
export async function submitCode({ problemId, userId, language, source }) {
  try {
    const response = await fetch('/api/submissions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        problemId: Number(problemId),
        userId,
        language,
        source,
      }),
    })

    const data = await response.json().catch(() => ({}))

    // A submission may already have been recorded even when the judge request
    // failed. Keep its ID and terminal result (for example, JE) for the UI.
    if (!response.ok && !(data.submissionId && data.result)) {
      throw new Error(
        `서버 응답 오류 (${response.status}): ${data.error || '잘못된 요청'}`
      )
    }

    return data
  } catch (error) {
    console.error('코드 제출 실패:', error)
    throw error
  }
}

/** Fetch the current submission result; used only if the SSE connection fails. */
export async function getSubmission(submissionId) {
  const response = await fetch(`/api/submissions/${submissionId}`)
  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    const error = new Error(
      `제출 조회 오류 (${response.status}): ${data.error || '조회 실패'}`
    )
    error.status = response.status
    throw error
  }

  return data
}

/**
 * Subscribe to a submission's SSE stream. If the stream disconnects, fall
 * back to the existing result endpoint so the UI can still finish updating.
 * @returns {{ close: () => void }}
 */
export function subscribeToSubmission(submissionId, onResult, onError) {
  const eventSource = new EventSource(
    `/api/submissions/${submissionId}/events`
  )
  let closed = false
  let polling = false
  let pollTimer = null

  const close = () => {
    closed = true
    eventSource.close()

    if (pollTimer) {
      clearTimeout(pollTimer)
      pollTimer = null
    }
  }

  const finish = (result) => {
    if (closed) return

    close()
    onResult(result)
  }

  const poll = async () => {
    if (closed) return

    try {
      const currentResult = await getSubmission(submissionId)

      if (closed) return

      if (currentResult.result !== 'PENDING') {
        finish(currentResult)
        return
      }
    } catch (error) {
      if (closed) return

      onError?.(error)

      if (error.status === 400 || error.status === 404) {
        close()
        return
      }
    }

    if (!closed) {
      pollTimer = setTimeout(poll, 2000)
    }
  }

  eventSource.onmessage = (event) => {
    try {
      finish(JSON.parse(event.data))
    } catch (error) {
      onError?.(new Error(`채점 결과를 읽을 수 없습니다: ${error.message}`))
    }
  }

  eventSource.onerror = () => {
    eventSource.close()

    if (polling || closed) return

    polling = true
    poll()
  }

  return { close }
}
