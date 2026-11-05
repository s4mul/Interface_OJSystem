import { useEffect, useState } from 'react'
import { getProblem } from '../api/getProblem'

function ProblemDetail({ problemId, userId, onSubmit, onBack }) {
  const [result, setResult] = useState(null)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    const controller = new AbortController()

    getProblem(problemId, userId, controller.signal).then(
      (problem) => {
        if (!controller.signal.aborted) setResult({ problem })
      },
      (error) => {
        if (!controller.signal.aborted) setResult({ error: error.message })
      },
    )

    return () => controller.abort()
  }, [problemId, userId, attempt])

  const { problem, error } = result ?? {}

  function retry() {
    setResult(null)
    setAttempt((previous) => previous + 1)
  }

  return (
    <section>
      {!result && <p role="status">문제를 불러오는 중...</p>}
      {error && (
        <>
          <p role="alert">{error}</p>
          <button type="button" onClick={retry}>다시 시도</button>
        </>
      )}
      {problem && (
        <>
          <h2>{problem.problemId}. {problem.title}</h2>
          <p>
            시간 제한 {problem.limits.timeLimitMs}ms / 메모리 제한 {problem.limits.memoryLimitMb}MB
            {' / '}출력 제한 {problem.limits.outputLimitKb}KB
          </p>
          <h3>문제</h3>
          <p style={{ whiteSpace: 'pre-wrap' }}>{problem.description}</p>
          <h3>입력</h3>
          <p style={{ whiteSpace: 'pre-wrap' }}>{problem.input}</p>
          <h3>출력</h3>
          <p style={{ whiteSpace: 'pre-wrap' }}>{problem.output}</p>
          {problem.examples.map((example, index) => (
            <div key={index}>
              <h3>예제 입력 {index + 1}</h3>
              <pre>{example.input}</pre>
              <h3>예제 출력 {index + 1}</h3>
              <pre>{example.output}</pre>
            </div>
          ))}
        </>
      )}
      <button type="button" onClick={onBack}>문제 목록</button>
      {problem && (
        <>
          {' '}
          <button type="button" onClick={() => onSubmit(problem)}>코드 제출 화면으로</button>
        </>
      )}
    </section>
  )
}

export default ProblemDetail
