import { useEffect, useRef, useState } from 'react'
import { submitCode, subscribeToSubmission } from '../api/submissions'

const LANGUAGES = ['C', 'C++', 'Java', 'Python']

const liveSubmission = { submitCode, subscribeToSubmission }

function SubmissionPanel({ problemId, userId, transport = liveSubmission, onBackToList }) {
  const [language, setLanguage] = useState('C++')
  const [source, setSource] = useState('')
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const resultStream = useRef(null)
  const active = useRef(true)

  useEffect(() => {
    active.current = true

    return () => {
      active.current = false
      resultStream.current?.close()
    }
  }, [])

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!source.trim() || loading) return
    resultStream.current?.close()
    resultStream.current = null
    setLoading(true)
    setResult(null)

    try {
      const responseData = await transport.submitCode({
        problemId,
        userId,
        language,
        source,
      })

      if (!active.current) return

      setResult(responseData)

      if (responseData.result === 'PENDING') {
        resultStream.current = transport.subscribeToSubmission(
          responseData.submissionId,
          (update) => {
            if (!active.current) return

            setResult(update)
            if (update.result !== 'JUDGING') resultStream.current = null
          },
          (error) => {
            if (!active.current) return

            setResult((currentResult) => ({
              ...currentResult,
              error: error.message,
            }))
          }
        )
      }
    } catch (error) {
      if (active.current) {
        setResult({ error: error.message })
      }
    } finally {
      if (active.current) {
        setLoading(false)
      }
    }
  }

  function editSource() {
    resultStream.current?.close()
    resultStream.current = null
    setResult(null)
  }

  return (
    <>
      <form onSubmit={handleSubmit} hidden={Boolean(result)}>
        <h2>코드 제출</h2>

        <div>
          <label htmlFor="language">언어 선택 </label>
          <select
            id="language"
            value={language}
            onChange={(event) => setLanguage(event.target.value)}
          >
            {LANGUAGES.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="source">소스 코드<br /></label>
          <textarea
            id="source"
            rows="10"
            placeholder="코드를 입력하세요"
            required
            value={source}
            onChange={(event) => setSource(event.target.value)}
          />
        </div>

        <button type="submit" disabled={loading || !source.trim()}>
          {loading ? '제출 중...' : '제출'}
        </button>
      </form>

      {result && (
        <section>
          <h2>채점 결과</h2>
          {transport.isPreview && <p>화면 확인용 모의 채점입니다.</p>}
          <p>언어 {language}</p>

          <div>
            {result.submissionId && (
              <p>제출 ID (submissionId): {result.submissionId}</p>
            )}
            {result.result && (
              <p>
                결과 (result): <span role="status">{transport.labels?.[result.result] ?? result.result}</span>
              </p>
            )}
            {result.error && (
              <p style={{ color: 'red' }}>{result.error}</p>
            )}
          </div>
          <button type="button" onClick={editSource}>코드 수정</button>
          {' '}
          {onBackToList && <button type="button" onClick={onBackToList}>문제 목록</button>}
        </section>
      )}
    </>
  )
}

export default SubmissionPanel
