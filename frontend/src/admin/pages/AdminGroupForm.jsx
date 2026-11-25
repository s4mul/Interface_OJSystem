import { useRef, useState } from 'react'
import { Button } from '../../design/ui.jsx'
import AdminPageHeader from '../components/AdminPageHeader.jsx'
import { readAnalysisUser } from '../analysis/session.js'
import { createAdminGroup } from '../api/management.js'
import { AdminLink } from '../routing.jsx'
import '../problem-editor/editor.css'

export default function AdminGroupForm() {
  const user = readAnalysisUser()
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(null)
  const pending = useRef(false)
  async function save(event) {
    event.preventDefault()
    if (pending.current || saved || !name.trim()) return
    pending.current = true; setSaving(true); setError('')
    try { setSaved(await createAdminGroup({ userId: user.userId, groupName: name.trim() })) }
    catch (failure) { setError(failure.message) }
    finally { pending.current = false; setSaving(false) }
  }
  return <section>
    <AdminPageHeader title="그룹 추가" description="새 그룹의 이름을 입력하세요." />
    <form className="panel admin-form" onSubmit={save}>
      <fieldset className="problem-editor-fieldset" disabled={saving || Boolean(saved)}>
        <div className="admin-form-section"><div className="admin-field"><label htmlFor="new-group-name">그룹 이름 필수</label><input id="new-group-name" value={name} onChange={(event) => setName(event.target.value)} required maxLength={100} autoFocus /></div></div>
      </fieldset>
      <div className="admin-form-footer"><div>{error && <p role="alert" className="problem-editor-error">{error}</p>}{saved && <p role="status">그룹을 추가했습니다. <AdminLink to={`/admin/groups/${saved.groupId}`}>이 그룹 관리하기</AdminLink></p>}</div><div className="actions"><AdminLink className="btn secondary" to="/admin/analysis/groups">그룹 목록으로</AdminLink><Button type="submit" disabled={saving || Boolean(saved)}>{saving ? '추가 중…' : '그룹 추가'}</Button></div></div>
    </form>
  </section>
}
