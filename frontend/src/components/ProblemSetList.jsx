import { useEffect, useState } from 'react'
import { getProblemSets } from '../api/getProblemSets'
import { AsyncState, Button, Icon } from '../design/ui'

function ProblemSetList({ groupId, group, userId, onSelect, onShowProblems }) {
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
      <div className="intro">
        <div>
          <h1>문제집 목록</h1>
          <p className="subtitle">{group?.groupName ? `${group.groupName}의 문제집을 선택하면 포함된 문제를 볼 수 있어요.` : '문제집을 선택하면 포함된 문제를 볼 수 있어요.'}</p>
        </div>
        <div className="actions">
          <Button variant="secondary" onClick={onShowProblems}>전체 문제 보기</Button>
        </div>
      </div>
      <section className="panel" aria-label="문제집 목록">
        <div className="panel-head">
          <h2 className="panel-head-title">등록된 문제집</h2>
          <span className="panel-head-info">{problemSets ? `${problemSets.length}개 문제집` : '그룹 문제집'}</span>
        </div>
        <AsyncState
          loading={!result}
          error={error}
          onRetry={retry}
          empty={problemSets?.length === 0}
          emptyMessage="등록된 문제집이 없습니다."
        />
        {problemSets?.map((problemSet) => (
          <button className="list-row" type="button" key={problemSet.setId} onClick={() => onSelect(problemSet)}>
            <span className="row-icon"><Icon name="book" /></span>
            <span className="row-body">
              <span className="row-title">{problemSet.setName}</span>
              <span className="row-detail">문제집 ID {problemSet.setId}</span>
            </span>
            <span className="row-action">문제 목록 보기</span>
            <span className="chev" aria-hidden="true"><Icon name="arrow" /></span>
          </button>
        ))}
      </section>
    </section>
  )
}

export default ProblemSetList
