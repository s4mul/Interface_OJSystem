let nextSubmissionId = 1

export const previewSubmission = {
  isPreview: true,
  labels: { PENDING: '대기 중', JUDGING: '채점 중', AC: '정답 (예시)' },

  async submitCode() {
    return { submissionId: nextSubmissionId++, result: 'PENDING' }
  },

  subscribeToSubmission(submissionId, onResult) {
    const judging = setTimeout(() => onResult({ submissionId, result: 'JUDGING' }), 700)
    const complete = setTimeout(() => onResult({ submissionId, result: 'AC' }), 1400)

    return {
      close() {
        clearTimeout(judging)
        clearTimeout(complete)
      },
    }
  },
}
