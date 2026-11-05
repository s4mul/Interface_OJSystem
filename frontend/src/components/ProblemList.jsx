import { useEffect, useState } from 'react'
import { getProblems } from '../api/getProblems'

function ProblemList({ group, userId, onSelect, onBack }) {
  const [result, setResult] = useState(null)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    const controller = new AbortController()

    getProblems(group.groupId, userId, controller.signal).then(
      (problems) => {
        if (!controller.signal.aborted) setResult({ problems })
      },
      (error) => {
        if (!controller.signal.aborted) setResult({ error: error.message })
      },
    )

    return () => controller.abort()
  }, [group.groupId, userId, attempt])

  const { problems, error } = result ?? {}

  function retry() {
    setResult(null)
    setAttempt((previous) => previous + 1)
  }

  return (
    <section>
      <h2>문제 목록</h2>
      <p>그룹 {group.groupName}</p>
      {!result && <p role="status">문제 목록을 불러오는 중...</p>}
      {error && (
        <>
          <p role="alert">{error}</p>
          <button type="button" onClick={retry}>다시 시도</button>
        </>
      )}
      {problems?.length === 0 && <p>조회할 수 있는 문제가 없습니다.</p>}
      {problems?.length > 0 && (
        <ul>
          {problems.map((problem) => (
            <li key={problem.problemId}>
              <button type="button" onClick={() => onSelect(problem)}>
                {problem.problemId}. {problem.title}
              </button>
              {' '}{problem.isSolved ? '풀이 완료' : '미해결'}
            </li>
          ))}
        </ul>
      )}
      <button type="button" onClick={onBack}>그룹 선택으로 돌아가기</button>
    </section>
  )
}

export default ProblemList
