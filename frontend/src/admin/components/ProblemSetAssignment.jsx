import { useEffect, useRef, useState } from 'react'
import { AsyncState, Button } from '../../design/ui.jsx'
import { getProblemSets } from '../../api/getProblemSets.js'
import { getAdminProblems } from '../api/problems.js'
import { getAdminProblemSetProblems, replaceProblemSetProblems } from '../api/management.js'
import { AdminLink } from '../routing.jsx'

export default function ProblemSetAssignment({ groupId, userId, initialSetId, onClose }) {
  const [catalog, setCatalog] = useState(null)
  const [catalogAttempt, setCatalogAttempt] = useState(0)
  const [target, setTarget] = useState(initialSetId ? String(initialSetId) : '')
  const [membership, setMembership] = useState(null)
  const [memberAttempt, setMemberAttempt] = useState(0)
  const [selection, setSelection] = useState([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const pending = useRef(false)
  const active = useRef(false)
  const scope = `${groupId}:${userId}`
  const membershipKey = `${scope}:${target}:${memberAttempt}`
  useEffect(() => { active.current = true; return () => { active.current = false } }, [])
  useEffect(() => {
    const controller = new AbortController()
    setCatalog(null); setMembership(null); setSelection([]); setError('')
    setTarget(initialSetId ? String(initialSetId) : '')
    Promise.all([getProblemSets(groupId, userId, controller.signal), getAdminProblems(groupId, userId, controller.signal)]).then(
      ([sets, problems]) => { if (!controller.signal.aborted) setCatalog({ scope, sets, problems }) },
      (failure) => { if (!controller.signal.aborted) setCatalog({ scope, error: failure.message }) },
    )
    return () => controller.abort()
  }, [scope, initialSetId, catalogAttempt])
  const current = catalog?.scope === scope ? catalog : null
  const set = current?.sets?.find((item) => item.setId === Number(target))
  useEffect(() => {
    if (!set) return
    const controller = new AbortController()
    setMembership(null); setSelection([]); setError('')
    getAdminProblemSetProblems(groupId, set.setId, userId, controller.signal).then(
      (data) => { if (!controller.signal.aborted) { setMembership({ key: membershipKey, ids: data.problemIds }); setSelection(data.problemIds) } },
      (failure) => { if (!controller.signal.aborted) setMembership({ key: membershipKey, error: failure.message }) },
    )
    return () => controller.abort()
  }, [membershipKey, set?.setId])

  const ready = Boolean(set && membership?.key === membershipKey && !membership.error)
  const original = ready ? membership.ids : []
  const selected = new Set(ready ? selection : [])
  const eligible = (current?.problems ?? []).filter((problem) => problem.status === 'READY' || original.includes(problem.problemId)).map((problem) => problem.problemId)
  const added = ready ? selection.filter((id) => !original.includes(id)).length : 0
  const removed = ready ? original.filter((id) => !selected.has(id)).length : 0
  function toggle(id, checked) {
    if (!ready || pending.current) return
    setError('')
    setSelection((ids) => checked ? [...new Set([...ids, id])] : ids.filter((item) => item !== id))
  }
  async function save(event) {
    event.preventDefault()
    if (!ready || pending.current || (!added && !removed)) return
    pending.current = true; setSaving(true); setError('')
    try {
      const result = await replaceProblemSetProblems(groupId, set.setId, { userId, problemIds: selection })
      if (active.current) onClose({ ...result, setName: set.setName })
    } catch (failure) { if (active.current) setError(failure.message) }
    finally { pending.current = false; if (active.current) setSaving(false) }
  }

  return <section>
    <div className="intro"><div><span className="eyebrow">문제집 구성 편집</span><h1>문제집 문제 목록 수정</h1><p className="subtitle">기존 문제는 체크되어 있습니다. 체크하면 추가하고, 해제하면 문제집에서 제외합니다.</p></div><Button variant="secondary" disabled={saving} onClick={() => onClose()}>편집 취소</Button></div>
    <form onSubmit={save} aria-busy={saving}>
      <div className="panel admin-assignment">
        <AsyncState loading={!current} error={current?.error} onRetry={() => setCatalogAttempt((value) => value + 1)} />
        {current?.sets && (current.sets.length ? <fieldset className="admin-assignment-controls" disabled={saving}>
          <label htmlFor="assignment-target-set">편집할 문제집</label>
          <select id="assignment-target-set" value={target} onChange={(event) => { setTarget(event.target.value); setError('') }} required>
            <option value="">문제집을 선택하세요</option>
            {current.sets.map((item) => <option key={item.setId} value={item.setId}>{item.setName} (#{item.setId})</option>)}
          </select>
          <Button type="submit" disabled={!ready || (!added && !removed)}>{saving ? '저장 중…' : '문제 목록 저장'}</Button>
        </fieldset> : <p>먼저 <AdminLink to={`/admin/analysis/groups/${groupId}/problemsets`}>문제집 목록</AdminLink>에서 문제집을 만들어 주세요.</p>)}
        {set && <AsyncState loading={membership?.key !== membershipKey} error={membership?.key === membershipKey ? membership.error : undefined} onRetry={() => setMemberAttempt((value) => value + 1)} />}
        {!set && current?.sets?.length > 0 && <p className="hint">문제집을 선택하면 현재 포함된 문제를 불러옵니다.</p>}
        {ready && <p role="status">선택 {selection.length}개 · 추가 {added}개 · 제외 {removed}개</p>}
        <p className="hint">해제해도 원래 문제는 삭제되지 않습니다. 변경 사항은 저장 버튼을 눌러야 반영됩니다.</p>
        {error && <p className="problem-editor-error" role="alert">{error}</p>}
      </div>
      {current?.problems && <div className="panel table-wrap"><table aria-label="문제집에 포함할 문제 선택">
        <thead><tr><th className="problem-select-column" scope="col"><input type="checkbox" aria-label="전체 문제 선택 또는 해제" disabled={!ready || saving || !eligible.length} checked={ready && eligible.length > 0 && eligible.every((id) => selected.has(id))} ref={(element) => { if (element) element.indeterminate = ready && eligible.some((id) => selected.has(id)) && !eligible.every((id) => selected.has(id)) }} onChange={(event) => { if (pending.current) return; const checked = event.target.checked; setSelection((ids) => [...ids.filter((id) => !eligible.includes(id)), ...(checked ? eligible : [])]) }} /></th><th scope="col">번호</th><th scope="col">문제</th><th scope="col">공개 상태</th></tr></thead>
        <tbody>{current.problems.map((problem) => <tr key={problem.problemId}>
          <td className="problem-select-cell"><input type="checkbox" aria-label={`${problem.title} 문제집 포함`} disabled={!ready || saving || !eligible.includes(problem.problemId)} checked={selected.has(problem.problemId)} onChange={(event) => toggle(problem.problemId, event.target.checked)} /></td>
          <td className="problem-id">{problem.problemId}</td><td>{problem.title}{problem.status !== 'READY' && <span className="hint"> · 작성 중</span>}</td><td>{problem.isPublic ? '공개' : '비공개'}</td>
        </tr>)}</tbody>
      </table>{current.problems.length === 0 && <p className="empty">등록된 문제가 없습니다.</p>}</div>}
    </form>
  </section>
}
