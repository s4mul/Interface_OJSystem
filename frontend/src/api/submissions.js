// 1회차 Frontend API 통신 모듈

/**
 * 코드 제출 API
 * @param {Object} submissionData { problemId: number, language: string, source: string }
 * @returns {Promise<{ submissionId: number, result: string }>}
 */
export async function submitCode({ problemId, language, source }) {
  try {
    const response = await fetch('/api/submissions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        problemId: Number(problemId),
        language,
        source,
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      if (data.submissionId && data.result) {
        return data
      }

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

export async function getSubmission(submissionId) {
  const response = await fetch(`/api/submissions/${submissionId}`)
  const data = await response.json()

  if (!response.ok) {
    const error = new Error(
      `제출 조회 오류 (${response.status}): ${data.error || '조회 실패'}`
    )
    error.status = response.status
    throw error
  }

  return data
}

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

      onError(error)

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
    finish(JSON.parse(event.data))
  }

  eventSource.onerror = () => {
    eventSource.close()

    if (polling) return

    polling = true
    poll()
  }

  return { close }
}

