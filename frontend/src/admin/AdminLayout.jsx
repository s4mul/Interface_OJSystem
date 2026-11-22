import { useEffect, useRef } from 'react'
import logo from '../design/assets/interface-logo.png'
import { AdminLink } from './routing.jsx'

const navigation = [
  ['', '관리 홈'],
  ['/problems', '문제 관리'],
  ['/problemsets', '문제집 관리'],
  ['/members', '멤버 관리'],
  ['/settings', '그룹 설정'],
]

export default function AdminLayout({ groupId, pathname, page, children }) {
  const main = useRef(null)
  const base = groupId ? `/admin/groups/${groupId}` : '/admin'
  const active = page === 'not-found' ? null : navigation.findLast(([suffix]) => suffix && (pathname === `${base}${suffix}` || pathname.startsWith(`${base}${suffix}/`)))?.[0] ?? ''

  useEffect(() => {
    main.current?.focus({ preventScroll: true })
    window.scrollTo(0, 0)
    const title = page === 'not-found' ? '페이지를 찾을 수 없어요' : groupId ? navigation.find(([suffix]) => suffix === active)?.[1] ?? '관리자' : '관리자'
    document.title = `${title} | Interface Online Judge`
  }, [pathname, groupId, active, page])

  return <div className="admin-app">
    <a className="skip-link" href="#admin-content">본문으로 건너뛰기</a>
    <header className="admin-topbar">
      <div className="admin-topbar-inner">
        <a className="brand admin-brand" href="/" aria-label="Interface Online Judge 홈">
          <img src={logo} alt="IF" width="49" height="49" />
          <span className="brand-label">Interface Online Judge</span>
        </a>
        <span className="admin-area-label">그룹 관리</span>
        <a className="admin-return" href="/">사용자 화면</a>
      </div>
      {groupId && <nav className="admin-nav" aria-label="그룹 관리 메뉴">
        <div className="admin-nav-inner">
          {navigation.map(([suffix, label]) => <AdminLink key={suffix} to={`${base}${suffix}`} className={`admin-nav-link ${active === suffix ? 'active' : ''}`} aria-current={active === suffix ? 'page' : undefined}>{label}</AdminLink>)}
        </div>
      </nav>}
    </header>

    <main id="admin-content" className="admin-main" tabIndex={-1} ref={main}>
      {groupId && <nav className="admin-crumbs" aria-label="현재 위치">
        <AdminLink to={base}>그룹 {groupId}</AdminLink>
        <span aria-hidden="true">/</span>
        <span>{navigation.find(([suffix]) => suffix === active)?.[1] ?? '페이지 없음'}</span>
        {pathname.replace(/\/+$/, '').endsWith('/new') && <><span aria-hidden="true">/</span><span aria-current="page">등록</span></>}
      </nav>}
      {children}
    </main>
    <footer className="site-footer">Interface Online Judge</footer>
  </div>
}
