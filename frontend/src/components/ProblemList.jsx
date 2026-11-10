import { useEffect, useState } from 'react'
import { getProblemSet } from '../api/getProblemSet'
import { getProblems } from '../api/getProblems'

function ProblemList({ group, userId, selectedSet, onSelect, onBack }) {
  const [result, setResult] = useState(null)
  const [attempt, setAttempt] = useState(0)
  const { groupId } = group
  const setId = selectedSet?.setId

  useEffect(() => {
    const controller = new AbortController()
    const request = setId === undefined
      ? getProblems(groupId, userId, controller.signal).then((problems) => ({ problems }))
      : getProblemSet(setId, groupId, userId, controller.signal)

    request.then(
      (data) => {
        if (!controller.signal.aborted) setResult(data)
      },
      (error) => {
        if (!controller.signal.aborted) setResult({ error: error.message })
      },
    )

    return () => controller.abort()
  }, [groupId, userId, setId, attempt])

  const { problemSet, problems, error } = result ?? {}

  function retry() {
    setResult(null)
    setAttempt((previous) => previous + 1)
  }

  return (
    <>
      {selectedSet && (
        <>
          <h2>{problemSet?.setName ?? selectedSet.setName}</h2>
          {problemSet && (
            <p style={{ whiteSpace: 'pre-wrap' }}>
              {problemSet.description?.trim() ? problemSet.description : '등록된 설명이 없습니다.'}
            </p>
          )}
        </>
      )}
      <section>
        <h2>{selectedSet ? '문제집 문제 목록' : '문제 목록'}</h2>
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
        <button type="button" onClick={onBack}>
          {selectedSet ? '초기화면으로 돌아가기' : '그룹 선택으로 돌아가기'}
        </button>
      </section>
    </>
  )
}

export default ProblemList
