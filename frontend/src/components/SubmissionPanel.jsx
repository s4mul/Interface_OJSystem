import { useEffect, useRef, useState } from 'react'
import { submitCode, subscribeToSubmission } from '../api/submissions'

const LANGUAGES = ['C', 'C++', 'Java', 'Python']

function SubmissionPanel({ problemId }) {
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
    resultStream.current?.close()
    resultStream.current = null
    setLoading(true)
    setResult(null)

    try {
      const responseData = await submitCode({
        problemId,
        language,
        source,
      })

      if (!active.current) return

      setResult(responseData)

      if (responseData.result === 'PENDING') {
        resultStream.current = subscribeToSubmission(
          responseData.submissionId,
          (finalResult) => {
            if (!active.current) return

            setResult(finalResult)
            resultStream.current = null
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

  return (
    <>
      <form onSubmit={handleSubmit}>
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
          <label htmlFor="source">소스 코드<br/></label>
          <textarea
            id="source"
            rows="10"
            placeholder="코드를 입력하세요"
            value={source}
            onChange={(event) => setSource(event.target.value)}
          />
        </div>

        <button type="submit" disabled={loading}>
          {loading ? '제출 중...' : '제출'}
        </button>
      </form>

      {result && (
        <section>
          <h2>제출 결과</h2>

          <div>
            {result.submissionId && (
              <p>
                제출 ID (submissionId): {result.submissionId}
              </p>
            )}
            {result.result && (
              <p>
                결과 (result): <span>{result.result}</span>
              </p>
            )}
            {result.error && (
              <p style={{ color: 'red' }}>
                {result.error}
              </p>
            )}
          </div>
        </section>
      )}
    </>
  )
}

export default SubmissionPanel
