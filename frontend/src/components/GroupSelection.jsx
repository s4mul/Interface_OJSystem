import { useEffect, useState } from 'react'
import { getGroups } from '../api/getGroups'

function GroupSelection({ userId, onSelect, onBack }) {
  const [result, setResult] = useState(null)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    const controller = new AbortController()

    getGroups(userId, controller.signal).then(
      (groups) => {
        if (!controller.signal.aborted) setResult({ groups })
      },
      (error) => {
        if (!controller.signal.aborted) setResult({ error: error.message })
      },
    )

    return () => controller.abort()
  }, [attempt, userId])

  const { groups, error } = result ?? {}

  function retry() {
    setResult(null)
    setAttempt((previous) => previous + 1)
  }

  return (
    <section>
      <h2>그룹 선택</h2>
      {!result && <p role="status">그룹을 불러오는 중...</p>}
      {error && (
        <>
          <p role="alert">{error}</p>
          <button type="button" onClick={retry}>다시 시도</button>
        </>
      )}
      {groups?.length === 0 && <p>소속된 그룹이 없습니다.</p>}
      {groups?.length > 0 && (
        <ul>
          {groups.map((group) => (
            <li key={group.groupId}>
              <button type="button" onClick={() => onSelect(group)}>{group.groupName}</button>
            </li>
          ))}
        </ul>
      )}
      <button type="button" onClick={onBack}>이름 입력으로 돌아가기</button>
    </section>
  )
}

export default GroupSelection
