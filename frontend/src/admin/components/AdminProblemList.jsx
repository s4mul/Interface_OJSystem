import { useEffect, useState } from 'react'
import { getProblemSet } from '../../api/getProblemSet'
import { getProblems } from '../../api/getProblems'
import { AsyncState, Button, StatusBadge } from '../../design/ui'
import ProblemSetAssignment from './ProblemSetAssignment.jsx'

function ProblemList({ group, userId, selectedSet, onSelect, onBack, onShowSets, onShowAll, onCreate, onEdit, onEditSet }) {
  const [result, setResult] = useState(null)
  const [attempt, setAttempt] = useState(0)
  const [selection, setSelection] = useState([])
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
  const canAssign = Boolean(onEdit && !selectedSet)
  const selectedIds = (problems ?? []).filter((item) => selection.includes(item.problemId)).map((item) => item.problemId)
  function assigned(saved, set, ids) {
    setSelection((current) => current.filter((id) => !ids.includes(id)))
    setNotice(`${set.setName}에 ${saved.addedCount}개 문제를 추가했습니다.${saved.skippedCount ? ` 이미 포함된 ${saved.skippedCount}개는 유지했습니다.` : ''}`)
  }
  const title = selectedSet ? problemSet?.setName ?? selectedSet.setName : '문제 목록'
  const description = selectedSet
    ? problemSet ? problemSet.description?.trim() ? problemSet.description : '등록된 설명이 없습니다.' : '문제집에 포함된 문제를 확인하고 풀어보세요.'
    : `${group.groupName} 그룹의 문제를 확인하고 풀어보세요.`

  function retry() {
    setResult(null)
    setAttempt((previous) => previous + 1)
  }

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
          {selectedSet && onEditSet && <Button variant="secondary" onClick={() => onEditSet(selectedSet)}>문제집 수정</Button>}
          {onShowSets && <Button variant="secondary" onClick={onShowSets}>문제집 목록</Button>}
        </div>
      </div>

      {notice && <p role="status">{notice}</p>}
      {canAssign && selectedIds.length > 0 && <ProblemSetAssignment groupId={groupId} userId={userId} problemIds={selectedIds} onAssigned={assigned} />}

      <div className="panel">
        {selectedSet && (
          <div className="selected-note">
            <span>{title}<span className="hint">선택한 문제집의 문제입니다.</span></span>
            {onShowAll && <Button variant="secondary" onClick={onShowAll}>{onEdit ? '전체 문제 목록에서 추가' : '전체 문제 보기'}</Button>}
          </div>
        )}
        <div className="panel-head">
          <h2 className="panel-head-title">{selectedSet ? '문제집 문제 목록' : '전체 문제'}</h2>
          <span className="panel-head-info">{problems ? `${problems.length}개 문제${canAssign ? ' · 선택해서 문제집에 추가' : ''}` : '문제 목록'}</span>
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
              <thead><tr>{canAssign && <th scope="col" className="problem-select-column"><input type="checkbox" aria-label="전체 문제 선택" checked={selectedIds.length === problems.length} ref={(element) => { if (element) element.indeterminate = selectedIds.length > 0 && selectedIds.length < problems.length }} onChange={(event) => { setNotice(''); setSelection(event.target.checked ? problems.map((item) => item.problemId) : []) }} /></th>}<th scope="col">번호</th><th scope="col">제목</th><th scope="col">해결 현황</th>{onEdit && <th scope="col" className="management-column">관리</th>}</tr></thead>
              <tbody>
                {problems.map((problem) => (
                  <tr key={problem.problemId}>
                    {canAssign && <td className="problem-select-cell"><input type="checkbox" aria-label={`${problem.title} 선택`} checked={selectedIds.includes(problem.problemId)} onChange={(event) => { setNotice(''); const checked = event.target.checked; setSelection((current) => checked ? [...new Set([...current, problem.problemId])] : current.filter((id) => id !== problem.problemId)) }} /></td>}
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
