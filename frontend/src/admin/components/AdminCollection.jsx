import { useState } from 'react'
import { AsyncState, Button } from '../../design/ui.jsx'
import { getProblemSets } from '../../api/getProblemSets.js'
import { getAdminMembers } from '../api/management.js'
import { useAdminResource } from '../api/useAdminResource.js'
import { readAnalysisUser } from '../analysis/session.js'
import { AdminLink } from '../routing.jsx'
import AdminPageHeader from './AdminPageHeader.jsx'
import AdminUserPanel from './AdminUserPanel.jsx'
import { AdminSearch, AdminEmpty } from '../pages/PageSupport.jsx'

export default function AdminCollection({ groupId, type }) {
  const sets = type === 'problemsets'
  const label = sets ? '문제집' : '멤버'
  const [user, setUser] = useState(readAnalysisUser)
  const [query, setQuery] = useState('')
  const { data, loading, error, reload } = useAdminResource(sets ? getProblemSets : getAdminMembers, groupId, user?.userId)
  const search = query.trim().toLocaleLowerCase()
  const visible = data?.filter((v) => !search || (sets ? v.setId + ' ' + v.setName : v.userId + ' ' + v.username).toLocaleLowerCase().includes(search)) ?? []
  return <section>
    <AdminPageHeader title={label + ' 관리'} description={'그룹의 ' + label + ' 목록을 조회합니다.'}>
      {sets && <AdminLink className="btn" to={'/admin/groups/' + groupId + '/problemsets/new'}>문제집 만들기</AdminLink>}
    </AdminPageHeader>
    <AdminUserPanel user={user} onUserChange={setUser} />
    <section className="panel" aria-label={label + ' 목록'}>
      <div className="panel-head"><h2 className="panel-head-title">{label} 목록</h2><Button variant="secondary" disabled={!user || loading} onClick={reload}>새로고침</Button></div>
      {user ? <><AdminSearch value={query} onChange={setQuery} label={label + ' 검색'} placeholder={label + ' 이름 또는 ID로 검색'} /><AsyncState loading={loading} error={error} onRetry={reload} />
        {data && (visible.length ? <ul className="problem-editor-problem-list">{visible.map((v) => <li className="problem-editor-problem-row" key={sets ? v.setId : v.userId}>
          <div>{sets ? <AdminLink className="problem-editor-problem-title" to={'/admin/analysis/groups/' + groupId + '/problemsets/' + v.setId}>{v.setName}</AdminLink> : <strong className="problem-editor-problem-title">{v.username}</strong>}<span className="problem-editor-problem-meta">ID {sets ? v.setId : v.userId}</span></div>
          {!sets && <span className="problem-editor-visibility">{v.isAdmin ? '관리자' : '멤버'}</span>}
        </li>)}</ul> : <AdminEmpty title={search ? '검색 결과가 없습니다.' : '표시할 ' + label + '이 없습니다.'}>서버에서 조회한 목록입니다.</AdminEmpty>)}
      </> : <AdminEmpty title="사용자 이름을 조회해 주세요.">선택한 사용자의 권한으로 목록을 조회합니다.</AdminEmpty>}
    </section>
  </section>
}
