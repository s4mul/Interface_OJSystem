import { useEffect, useRef, useState } from 'react'
import { AsyncState, Button } from '../../design/ui.jsx'
import AdminPageHeader from '../components/AdminPageHeader.jsx'
import AdminUserPanel from '../components/AdminUserPanel.jsx'
import { readAnalysisUser } from '../analysis/session.js'
import { getAdminGroup, updateAdminGroup } from '../api/management.js'
import { useAdminResource } from '../api/useAdminResource.js'
import { AdminEmpty } from './PageSupport.jsx'
import { AdminLink } from '../routing.jsx'

function SettingsForm({ group, userId }) {
  const [name, setName] = useState(group.groupName)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const pending = useRef(false)
  const active = useRef(true)
  useEffect(() => { active.current = true; return () => { active.current = false } }, [])
  async function save(event) {
    event.preventDefault()
    if (pending.current || !name.trim()) return
    pending.current = true; setSaving(true); setError(''); setMessage('')
    try {
      const saved = await updateAdminGroup(group.groupId, { userId, groupName: name.trim() })
      if (active.current) { setName(saved.groupName); setMessage('그룹 설정을 저장했습니다.') }
    } catch (failure) { if (active.current) setError(failure.message) }
    finally { pending.current = false; if (active.current) setSaving(false) }
  }
  function changed() { setMessage(''); setError('') }
  return <form className="panel admin-form" onSubmit={save} aria-busy={saving}>
    <fieldset className="problem-editor-fieldset" disabled={saving}>
      <div className="panel-head"><h2 className="panel-head-title">기본 정보</h2><span className="panel-head-info">그룹 ID {group.groupId}</span></div>
      <div className="admin-form-section">
        <div className="admin-field"><label htmlFor="admin-group-name">그룹 이름 필수</label><input id="admin-group-name" value={name} onChange={(e) => { setName(e.target.value); changed() }} required maxLength={100} /></div>
      </div>
    </fieldset>
    <div className="admin-form-footer"><div>{error && <p className="problem-editor-error" role="alert">{error}</p>}{message && <p role="status">{message}</p>}</div><div className="actions"><AdminLink to={'/admin/groups/' + group.groupId} className="btn secondary">관리 홈</AdminLink><Button type="submit" disabled={saving}>{saving ? '저장 중…' : '저장'}</Button></div></div>
  </form>
}
export default function AdminSettings({ groupId }) {
  const [user, setUser] = useState(readAnalysisUser)
  const { data, loading, error, reload } = useAdminResource(getAdminGroup, groupId, user?.userId)
  return <section>
    <AdminPageHeader title="그룹 설정" description="현재 그룹 정보를 불러오고 그룹 이름을 저장합니다." />
    <AdminUserPanel user={user} onUserChange={setUser} />
    {!user ? <div className="panel"><AdminEmpty title="관리자 이름을 조회해 주세요.">그룹 정보를 조회한 뒤 수정할 수 있습니다.</AdminEmpty></div> : data ? <SettingsForm key={groupId + ':' + user.userId} group={data} userId={user.userId} /> : <div className="panel"><AsyncState loading={loading} error={error} onRetry={reload} /></div>}
  </section>
}
