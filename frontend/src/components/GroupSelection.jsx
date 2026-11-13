import { useEffect, useState } from 'react'
import { getGroups } from '../api/getGroups'
import { AsyncState, Button, Icon } from '../design/ui'

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
      <div className="intro">
        <div>
          <h1>그룹 선택</h1>
          <p className="subtitle">참여 중인 그룹을 선택하면 해당 그룹의 문제 목록으로 이동해요.</p>
        </div>
        <div className="actions">
          <Button variant="secondary" onClick={onBack}>이름 입력으로 돌아가기</Button>
        </div>
      </div>
      <section className="panel" aria-label="그룹 목록">
        <div className="panel-head">
          <h2 className="panel-head-title">내 그룹</h2>
          <span className="panel-head-info">{groups ? `${groups.length}개 그룹` : '참여 중인 그룹'}</span>
        </div>
        <AsyncState
          loading={!result}
          error={error}
          onRetry={retry}
          empty={groups?.length === 0}
          emptyMessage="소속된 그룹이 없습니다."
        />
        {groups?.map((group) => (
          <button className="list-row" type="button" key={group.groupId} onClick={() => onSelect(group)}>
            <span className="row-icon"><Icon name="group" /></span>
            <span className="row-body">
              <span className="row-title">{group.groupName}</span>
              <span className="row-detail">그룹 ID {group.groupId} · 그룹 문제 목록 보기</span>
            </span>
            <span className="row-action">문제 보기</span>
            <span className="chev" aria-hidden="true"><Icon name="arrow" /></span>
          </button>
        ))}
      </section>
    </section>
  )
}

export default GroupSelection
