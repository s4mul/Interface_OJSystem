import { useEffect, useRef } from 'react'
import AppHeader from './components/AdminAppHeader.jsx'
import { AdminLink } from './routing.jsx'
import { navigateAdmin } from './navigation.js'
import { rememberAnalysisUser } from './analysis/session.js'

const navigation = [['', '관리 홈'], ['/members', '소속 회원'], ['/settings', '그룹 정보 수정']]
export default function AdminLayout({ groupId, pathname, page, children, user, canManage = false }) {
  const main = useRef(null)
  const base = `/admin/groups/${groupId}`
  const list = page.includes('problemset') ? 'sets' : page.includes('problem') ? 'list' : 'manage'
  const active = navigation.findLast(([suffix]) => suffix && pathname.endsWith(suffix))?.[0] ?? ''
  const analysisBase = `/admin/analysis/groups/${groupId}`
  useEffect(() => { main.current?.focus({ preventScroll: true }); window.scrollTo(0, 0); document.title = '그룹 관리 | Interface Online Judge' }, [pathname])
  function navigate(screen) {
    navigateAdmin(screen === 'groups' ? '/admin/analysis/groups' : screen === 'entry' ? '/admin/analysis' : screen === 'submissions' ? '/admin/analysis/submissions' : screen === 'manage' ? base : `${analysisBase}/${screen === 'sets' ? 'problemsets' : 'problems'}`)
  }
  return <div className="admin-app">
    <a className="skip-link" href="#admin-content">본문으로 건너뛰기</a>
    <AppHeader user={user} screen={list} group={groupId ? { groupId } : null} canManage={canManage && Boolean(groupId)} onNavigate={navigate} onChangeUser={() => { rememberAnalysisUser(null); navigateAdmin('/admin/analysis') }} />
    {canManage && groupId && list === 'manage' && <nav className="admin-nav" aria-label="그룹 관리 메뉴"><div className="admin-nav-inner">{navigation.map(([suffix, label]) => <AdminLink key={suffix} to={base + suffix} className={`admin-nav-link ${active === suffix ? 'active' : ''}`} aria-current={active === suffix ? 'page' : undefined}>{label}</AdminLink>)}</div></nav>}
    <main id="admin-content" className="admin-main" tabIndex={-1} ref={main}>
      {groupId && <nav className="admin-crumbs" aria-label="현재 위치"><AdminLink to={base}>그룹 {groupId}</AdminLink><span aria-hidden="true">/</span><span>{list === 'manage' ? navigation.find(([suffix]) => suffix === active)?.[1] : list === 'sets' ? '문제집 편집' : '문제 편집'}</span></nav>}
      {children}
    </main>
    <footer className="site-footer">Interface Online Judge</footer>
  </div>
}
