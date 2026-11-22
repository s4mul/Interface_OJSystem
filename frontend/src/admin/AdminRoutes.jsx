import { useState } from 'react'
import '../design/tokens.css'
import '../design/global.css'
import '../App.css'
import './admin.css'
import { Icon } from '../design/ui.jsx'
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
import AnalysisApp from './analysis/AnalysisApp.jsx'

const pages = {
  home: AdminHome,
  problems: AdminProblems,
  'new-problem': AdminProblemForm,
  problemsets: AdminProblemSets,
  'new-problemset': AdminProblemSetForm,
  members: AdminMembers,
  settings: AdminSettings,
}

// Login and group-role checks can wrap this boundary when authentication is added.
// Management screens call their API contracts; analysis reuses the user APIs.
export default function AdminRoutes() {
  const pathname = useAdminPath()
  const [submissionHistory, setSubmissionHistory] = useState({})
  if (pathname.replace(/\/+$/, '') === '/admin' || /^\/admin\/analysis(?:\/|$)/.test(pathname)) return <AnalysisApp submissionHistory={submissionHistory} setSubmissionHistory={setSubmissionHistory} />
  const { page, groupId } = resolveAdminRoute(pathname)
  const Page = pages[page]

  return <AdminLayout groupId={groupId} pathname={pathname} page={page}>
    {Page ? <Page key={`${page}-${groupId}`} groupId={groupId} /> : <section className="admin-route-state panel" aria-labelledby="admin-route-title">
      <div className="admin-route-icon"><Icon name="group" width="28" height="28" /></div>
      <h1 id="admin-route-title">{page === 'entry' ? '그룹 관리' : '페이지를 찾을 수 없어요'}</h1>
      <p>{page === 'entry' ? '관리할 그룹을 선택하면 해당 그룹의 관리 화면으로 이동할 수 있어요.' : '주소를 확인하거나 그룹 관리 홈으로 이동해 주세요.'}</p>
      {groupId ? <AdminLink to={`/admin/groups/${groupId}`} className="btn">관리 홈으로</AdminLink> : <a href="/" className="btn">그룹 선택으로</a>}
    </section>}
  </AdminLayout>
}
