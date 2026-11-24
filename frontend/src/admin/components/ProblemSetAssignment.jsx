import { useEffect, useRef, useState } from 'react'
import { AsyncState, Button } from '../../design/ui.jsx'
import { getProblemSets } from '../../api/getProblemSets.js'
import { addProblemsToProblemSet } from '../api/management.js'
import { AdminLink } from '../routing.jsx'

export default function ProblemSetAssignment({ groupId, userId, problemIds, onAssigned }) {
  const [result, setResult] = useState(null)
  const [attempt, setAttempt] = useState(0)
  const [target, setTarget] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const active = useRef(false)
  const pending = useRef(false)
  useEffect(() => { active.current = true; return () => { active.current = false } }, [])
  useEffect(() => {
    const controller = new AbortController()
    setResult(null); setTarget(''); setError('')
    getProblemSets(groupId, userId, controller.signal).then(
      (sets) => { if (!controller.signal.aborted) setResult({ sets }) },
      (failure) => { if (!controller.signal.aborted) setResult({ error: failure.message }) },
    )
    return () => controller.abort()
  }, [groupId, userId, attempt])

  async function add(event) {
    event.preventDefault()
    const set = result?.sets?.find((item) => item.setId === Number(target))
    if (pending.current || !set || !problemIds.length) return
    const submittedIds = [...problemIds]
    pending.current = true; setSaving(true); setError('')
    try {
      const saved = await addProblemsToProblemSet(groupId, set.setId, { userId, problemIds: submittedIds })
      if (active.current) onAssigned(saved, set, submittedIds)
    } catch (failure) {
      if (active.current) setError(failure.status === 404 ? '문제집에 문제를 추가하는 기능은 아직 사용할 수 없습니다.' : failure.message)
    } finally {
      pending.current = false
      if (active.current) setSaving(false)
    }
  }

  return <form className="panel admin-assignment" onSubmit={add} aria-busy={saving}>
    <div><h2>선택한 {problemIds.length}개 문제를 문제집에 추가</h2><p className="hint">기존 문제를 문제집에 연결합니다. 원래 문제는 전체 목록에 유지됩니다.</p></div>
    <AsyncState loading={!result} error={result?.error} onRetry={() => setAttempt((value) => value + 1)} />
    {result?.sets && (result.sets.length ? <fieldset className="admin-assignment-controls" disabled={saving}>
      <label htmlFor="assignment-target-set">대상 문제집</label>
      <select id="assignment-target-set" value={target} onChange={(event) => { setTarget(event.target.value); setError('') }} required>
        <option value="">문제집을 선택하세요</option>
        {result.sets.map((set) => <option key={set.setId} value={set.setId}>{set.setName} (#{set.setId})</option>)}
      </select>
      <Button type="submit" disabled={!target || !problemIds.length}>{saving ? '추가 중…' : '선택한 문제 추가'}</Button>
    </fieldset> : <p>먼저 <AdminLink to={`/admin/analysis/groups/${groupId}/problemsets`}>문제집 목록</AdminLink>에서 문제집을 만들어 주세요.</p>)}
    {error && <p className="problem-editor-error" role="alert">{error}</p>}
  </form>
}
