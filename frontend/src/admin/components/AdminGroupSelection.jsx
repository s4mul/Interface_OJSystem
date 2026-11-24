import { useEffect, useRef, useState } from 'react'
import { getGroups } from '../../api/getGroups'
import { AsyncState, Button, Icon } from '../../design/ui'

function GroupSelection({ userId, onSelect, onBack, onCreate }) {
  const [result, setResult] = useState(null)
  const [attempt, setAttempt] = useState(0)
  const [openingId, setOpeningId] = useState(null)
  const [selectionError, setSelectionError] = useState('')
  const selection = useRef(null)

  useEffect(() => () => selection.current?.abort(), [])

  async function chooseGroup(group) {
    if (selection.current) return
    const controller = new AbortController()
    selection.current = controller
    setOpeningId(group.groupId)
    setSelectionError('')
    try {
      await onSelect(group, controller.signal)
    } catch (error) {
      if (!controller.signal.aborted) setSelectionError(error.message)
    } finally {
      if (selection.current === controller) selection.current = null
      if (!controller.signal.aborted) setOpeningId(null)
    }
  }

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
          <p className="subtitle">그룹을 선택하면 해당 그룹의 권한에 맞는 문제 목록으로 이동해요.</p>
        </div>
        <div className="actions">
          {onCreate && <Button onClick={onCreate} disabled={openingId !== null}>그룹 추가</Button>}
          <Button variant="secondary" onClick={onBack} disabled={openingId !== null}>이름 입력으로 돌아가기</Button>
        </div>
      </div>
      <section className="panel" aria-label="그룹 목록" aria-busy={openingId !== null}>
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
        {selectionError && <p className="form-error" role="alert">{selectionError}</p>}
        {openingId !== null && <p className="hint" role="status">그룹 권한을 확인하고 있습니다.</p>}
        {groups?.map((group) => (
          <button className="list-row" type="button" key={group.groupId} disabled={openingId !== null} onClick={() => chooseGroup(group)}>
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
