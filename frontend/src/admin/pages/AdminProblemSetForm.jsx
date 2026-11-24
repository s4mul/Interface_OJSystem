import { useEffect, useRef, useState } from 'react'
import { AsyncState, Button } from '../../design/ui.jsx'
import AdminPageHeader from '../components/AdminPageHeader.jsx'
import AuthorSelection from '../problem-editor/AuthorSelection.jsx'
import { readAnalysisUser } from '../analysis/session.js'
import { createAdminProblemSet, updateAdminProblemSet } from '../api/management.js'
import { getProblemSet } from '../../api/getProblemSet.js'
import { AdminLink } from '../routing.jsx'
import '../problem-editor/editor.css'

export default function AdminProblemSetForm({ groupId, setId }) {
  const editing = Boolean(setId)
  const listPath = `/admin/analysis/groups/${groupId}/problemsets`
  const [loadState, setLoadState] = useState(null)
  const [attempt, setAttempt] = useState(0)
  const [user, setUser] = useState(readAnalysisUser)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(null)
  const active = useRef(true)
  const pending = useRef(false)
  useEffect(() => { active.current = true; return () => { active.current = false } }, [])
  const loadKey = `${groupId}:${setId}:${user?.userId}:${attempt}`
  useEffect(() => {
    if (!editing || !user) return
    const controller = new AbortController()
    getProblemSet(setId, groupId, user.userId, controller.signal).then(({ problemSet }) => {
      if (controller.signal.aborted) return
      setName(problemSet.setName); setDescription(problemSet.description ?? ''); setSaved(null); setLoadState({ key: loadKey })
    }, (failure) => { if (!controller.signal.aborted) setLoadState({ key: loadKey, error: failure.message }) })
    return () => controller.abort()
  }, [loadKey])
  function changed() { setSaved(null); setError('') }
  async function save(event) {
    event.preventDefault()
    if (pending.current || saved) return
    if (!user || !name.trim()) { setError('관리자 이름을 조회하고 문제집 이름을 입력해 주세요.'); return }
    pending.current = true; setSaving(true); setError('')
    try {
      const payload = { userId: user.userId, setName: name.trim(), description: description.trim() ? description : null }
      const result = editing ? await updateAdminProblemSet(groupId, setId, payload) : await createAdminProblemSet(groupId, payload)
      if (active.current) setSaved(result)
    } catch (failure) { if (active.current) setError(failure.status === 404 && editing ? '문제집 수정 기능은 아직 사용할 수 없습니다.' : failure.message) }
    finally { pending.current = false; if (active.current) setSaving(false) }
  }
  if (editing && (loadState?.key !== loadKey || loadState.error)) return <section><AdminPageHeader title="문제집 수정"><AdminLink className="btn secondary" to={listPath}>문제집 목록</AdminLink></AdminPageHeader><div className="panel"><AsyncState loading={loadState?.key !== loadKey} error={loadState?.key === loadKey ? loadState.error : undefined} onRetry={() => setAttempt((value) => value + 1)} /></div></section>
  return <section>
    <AdminPageHeader title={editing ? '문제집 수정' : '문제집 만들기'} description="문제집의 이름과 설명을 등록하세요. 문제는 전체 문제 목록에서 선택해 추가합니다." />
    <p className="problem-editor-note"><AdminLink to={`/admin/analysis/groups/${groupId}/problems`}>전체 문제 목록에서 기존 문제 선택하기</AdminLink></p>
    <form className="panel admin-form" onSubmit={save} aria-busy={saving}>
      <fieldset className="problem-editor-fieldset" disabled={saving}>
        <div className="panel-head"><h2 className="panel-head-title">문제집 정보</h2><span className="panel-head-info">그룹 ID {groupId}</span></div>
        <div className="admin-form-section">
          <AuthorSelection user={user} onUserChange={(v) => { setUser(v); changed() }} disabled={saving} />
          <div className="admin-field"><label htmlFor="admin-set-name">문제집 이름 필수</label><input id="admin-set-name" value={name} onChange={(e) => { setName(e.target.value); changed() }} required maxLength={100} /></div>
          <div className="admin-field"><label htmlFor="admin-set-description">문제집 설명</label><textarea id="admin-set-description" value={description} onChange={(e) => { setDescription(e.target.value); changed() }} rows={6} maxLength={5000} /></div>
        </div>
      </fieldset>
      <div className="admin-form-footer"><div>{error && <p className="problem-editor-error" role="alert">{error}</p>}{saved && <p role="status">{editing ? '문제집을 수정했습니다.' : '문제집을 등록했습니다.'} 문제집 ID {saved.setId}</p>}</div><div className="actions"><AdminLink to={listPath} className="btn secondary">목록으로</AdminLink><Button type="submit" disabled={saving || Boolean(saved)}>{saving ? '저장 중…' : saved ? '저장 완료' : editing ? '수정 저장' : '문제집 등록'}</Button></div></div>
    </form>
  </section>
}
