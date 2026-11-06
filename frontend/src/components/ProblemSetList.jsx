import { useEffect, useState } from 'react'
import { getProblemSets } from '../api/getProblemSets'

function ProblemSetList({ groupId, userId }) {
  const [result, setResult] = useState(null)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    const controller = new AbortController()

    getProblemSets(groupId, userId, controller.signal).then(
      (problemSets) => {
        if (!controller.signal.aborted) setResult({ problemSets })
      },
      (error) => {
        if (!controller.signal.aborted) setResult({ error: error.message })
      },
    )

    return () => controller.abort()
  }, [groupId, userId, attempt])

  const { problemSets, error } = result ?? {}

  function retry() {
    setResult(null)
    setAttempt((previous) => previous + 1)
  }

  return (
    <section>
      <h2>문제집 목록</h2>
      {!result && <p role="status">문제집 목록을 불러오는 중...</p>}
      {error && (
        <>
          <p role="alert">{error}</p>
          <button type="button" onClick={retry}>문제집 다시 불러오기</button>
        </>
      )}
      {problemSets?.length === 0 && <p>등록된 문제집이 없습니다.</p>}
      {problemSets?.length > 0 && (
        <ul>
          {problemSets.map((problemSet) => (
            <li key={problemSet.setId}>{problemSet.setId}. {problemSet.setName}</li>
          ))}
        </ul>
      )}
    </section>
  )
}

export default ProblemSetList
