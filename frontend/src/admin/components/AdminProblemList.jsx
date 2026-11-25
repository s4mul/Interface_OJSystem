import { useEffect, useState } from 'react'
import { getProblemSet } from '../../api/getProblemSet'
import { getProblems } from '../../api/getProblems'
import { AsyncState, Button, StatusBadge } from '../../design/ui'
import ProblemSetAssignment from './ProblemSetAssignment.jsx'

function ProblemList({ group, userId, selectedSet, onSelect, onBack, onShowSets, onShowAll, onCreate, onEdit, onEditSet }) {
  const [result, setResult] = useState(null)
  const [attempt, setAttempt] = useState(0)
  const [editingMembership, setEditingMembership] = useState(false)
  const [notice, setNotice] = useState('')
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
  function finishEditing(saved) {
    setEditingMembership(false)
    if (saved) setNotice(`${saved.setName}에 추가 ${saved.addedCount}개, 제외 ${saved.removedCount}개를 저장했습니다.`)
    retry()
  }
  const title = selectedSet ? problemSet?.setName ?? selectedSet.setName : '문제 목록'
  const description = selectedSet
    ? problemSet ? problemSet.description?.trim() ? problemSet.description : '등록된 설명이 없습니다.' : '문제집에 포함된 문제를 확인하고 풀어보세요.'
    : `${group.groupName} 그룹의 문제를 확인하고 풀어보세요.`

  function retry() {
    setResult(null)
    setAttempt((previous) => previous + 1)
  }

  if (editingMembership) return <ProblemSetAssignment groupId={groupId} userId={userId} initialSetId={selectedSet?.setId} onClose={finishEditing} />

  return (
    <section aria-labelledby="problem-list-title">
      <div className="intro">
        <div>
          <span className="eyebrow">{selectedSet ? '문제집 문제 목록' : '그룹 전체 문제'}</span>
          <h1 id="problem-list-title">{title}</h1>
          <p className="subtitle preserve-lines">{description}</p>
        </div>
        <div className="actions">
          {!selectedSet && onCreate && <Button onClick={onCreate}>새 문제 등록</Button>}
          {onEdit && <Button variant="secondary" onClick={() => { setNotice(''); setEditingMembership(true) }}>문제집 문제 목록 수정하기</Button>}
          {selectedSet && onEditSet && <Button variant="secondary" onClick={() => onEditSet(selectedSet)}>문제집 정보 수정</Button>}
          {onShowSets && <Button variant="secondary" onClick={onShowSets}>문제집 목록</Button>}
        </div>
      </div>

      {notice && <p role="status">{notice}</p>}

      <div className="panel">
        {selectedSet && (
          <div className="selected-note">
            <span>{title}<span className="hint">선택한 문제집의 문제입니다.</span></span>
            {onShowAll && <Button variant="secondary" onClick={onShowAll}>전체 문제 보기</Button>}
          </div>
        )}
        <div className="panel-head">
          <h2 className="panel-head-title">{selectedSet ? '문제집 문제 목록' : '전체 문제'}</h2>
          <span className="panel-head-info">{problems ? `${problems.length}개 문제` : '문제 목록'}</span>
        </div>
        <AsyncState
          loading={!result}
          error={error}
          onRetry={retry}
          empty={problems?.length === 0}
          emptyMessage="조회할 수 있는 문제가 없습니다."
        />
        {problems?.length > 0 && (
          <div className="table-wrap">
            <table aria-label={`${title} 해결 현황`}>
              <thead><tr><th scope="col">번호</th><th scope="col">제목</th><th scope="col">해결 현황</th>{onEdit && <th scope="col" className="management-column">관리</th>}</tr></thead>
              <tbody>
                {problems.map((problem) => (
                  <tr key={problem.problemId}>
                    <td className="problem-id">{problem.problemId}</td>
                    <td>
                      <button className="problem-title" type="button" onClick={() => onSelect(problem)}>
                        {problem.title}
                      </button>
                    </td>
                    <td><StatusBadge solved={problem.isSolved} /></td>
                    {onEdit && <td className="management-cell"><Button variant="secondary" onClick={() => onEdit(problem)} aria-label={`${problem.title} 수정`}>수정</Button></td>}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <div className="actions detail-actions">
        <Button variant="secondary" onClick={onBack}>
          {selectedSet ? '문제집 목록으로' : '그룹 선택으로'}
        </Button>
      </div>
    </section>
  )
}

export default ProblemList
