import { useState } from 'react'
import '../design/tokens.css'
import '../design/global.css'
import '../App.css'
import './admin.css'
import './list-actions.css'
import { AsyncState, Button, Icon } from '../design/ui.jsx'
import AdminLayout from './AdminLayout.jsx'
import { useAdminPath } from './navigation.js'
import { AdminLink } from './routing.jsx'
import { resolveAdminRoute } from './routes.js'
import AdminHome from './pages/AdminHome.jsx'
import AdminProblems from './pages/AdminProblems.jsx'
import AdminProblemForm from './pages/AdminProblemForm.jsx'
import AdminProblemSets from './pages/AdminProblemSets.jsx'
import AdminProblemSetForm from './pages/AdminProblemSetForm.jsx'
import AdminMembers from './pages/AdminMembers.jsx'
import AdminSettings from './pages/AdminSettings.jsx'
import UserLookupForm from '../components/UserLookupForm.jsx'
import { readAnalysisUser, rememberAnalysisUser } from './analysis/session.js'
import { useManagementAccess } from './api/useManagementAccess.js'
import AdminGroupForm from './pages/AdminGroupForm.jsx'
import AnalysisApp from './analysis/AnalysisApp.jsx'

const pages = {
  home: AdminHome,
  problems: AdminProblems,
  'new-group': AdminGroupForm,
  'new-problem': AdminProblemForm,
  'edit-problem': AdminProblemForm,
  'edit-problemset': AdminProblemSetForm,
  problemsets: AdminProblemSets,
  'new-problemset': AdminProblemSetForm,
  members: AdminMembers,
  settings: AdminSettings,
}

function ManagementPage({ route, pathname }) {
  const [user, setUser] = useState(readAnalysisUser)
  const access = useManagementAccess(user?.userId, route.groupId)
  const Page = pages[route.page]
  let content
  if (!user) content = <UserLookupForm onUserFound={(matched) => { rememberAnalysisUser(matched); setUser(matched) }} />
  else if (access.loading || access.error) content = <section className="panel"><AsyncState loading={access.loading} error={access.error} onRetry={access.reload} /></section>
  else if (!access.isAdmin) content = <section className="panel admin-route-state"><h1>관리자 권한이 필요합니다.</h1><p>이 그룹의 관리자로 조회한 뒤 다시 시도해 주세요.</p><Button variant="secondary" onClick={() => { rememberAnalysisUser(null); setUser(null) }}>사용자 변경</Button></section>
  else content = <Page {...route} />
  return <AdminLayout {...route} pathname={pathname} user={user} canManage={access.isAdmin}>{content}</AdminLayout>
}
export default function AdminRoutes() {
  const pathname = useAdminPath()
  const [submissionHistory, setSubmissionHistory] = useState({})
  if (pathname.replace(/\/+$/, '') === '/admin' || /^\/admin\/analysis(?:\/|$)/.test(pathname)) return <AnalysisApp submissionHistory={submissionHistory} setSubmissionHistory={setSubmissionHistory} />
  const route = resolveAdminRoute(pathname)
  const { page, groupId } = route
  const Page = pages[page]
  if (Page) return <ManagementPage key={`${page}-${groupId}-${route.problemId ?? route.setId ?? ''}`} route={route} pathname={pathname} />

  return <AdminLayout groupId={groupId} pathname={pathname} page={page}>
    <section className="admin-route-state panel" aria-labelledby="admin-route-title">
      <div className="admin-route-icon"><Icon name="group" width="28" height="28" /></div>
      <h1 id="admin-route-title">{page === 'entry' ? '그룹 관리' : '페이지를 찾을 수 없어요'}</h1>
      <p>{page === 'entry' ? '관리할 그룹을 선택하면 해당 그룹의 관리 화면으로 이동할 수 있어요.' : '주소를 확인하거나 그룹 관리 홈으로 이동해 주세요.'}</p>
      {groupId ? <AdminLink to={`/admin/groups/${groupId}`} className="btn">관리 홈으로</AdminLink> : <a href="/" className="btn">그룹 선택으로</a>}
    </section>
  </AdminLayout>
}
