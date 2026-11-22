import { useEffect, useRef } from 'react'
import logo from '../../design/assets/interface-logo.png'
import { AdminLink } from '../routing.jsx'
import './analysis.css'

const base = '/admin/analysis'
const titles = {
  entry: '사용자 이름 입력',
  groups: '그룹 선택',
  problems: '문제 목록',
  problemsets: '문제집 목록',
  'set-problems': '문제집 문제 목록',
  detail: '문제 상세',
  submit: '코드 제출',
  submissions: '내 제출',
  'not-found': '페이지를 찾을 수 없어요',
}

function Breadcrumbs({ route, group, problemSet, problem }) {
  const groupId = group?.groupId ?? route.groupId
  const groupBase = groupId ? `${base}/groups/${groupId}` : null
  const isHistory = route.origin === 'submissions'
  const hasProblem = ['detail', 'submit'].includes(route.page)
  const hasSet = Boolean(route.setId)
  if (['entry', 'groups', 'submissions', 'not-found'].includes(route.page)) return null
  if (!groupBase && !isHistory) return null

  return <nav className="analysis-crumbs" aria-label="현재 위치">
    {isHistory ? <AdminLink to={`${base}/submissions`}>내 제출</AdminLink> : <>
      <AdminLink to={`${base}/groups`}>그룹 선택</AdminLink>
      <span aria-hidden="true">/</span>
      <AdminLink to={`${groupBase}/problems`}>{group?.groupName ?? `그룹 ${groupId}`}</AdminLink>
      {route.page === 'problemsets' && <><span aria-hidden="true">/</span><span aria-current="page">문제집 목록</span></>}
      {hasSet && <>
        <span aria-hidden="true">/</span>
        <AdminLink to={`${groupBase}/problemsets`}>문제집 목록</AdminLink>
        <span aria-hidden="true">/</span>
        {hasProblem ? <AdminLink to={`${groupBase}/problemsets/${route.setId}`}>{problemSet?.setName ?? `문제집 ${route.setId}`}</AdminLink> : <span aria-current="page">{problemSet?.setName ?? `문제집 ${route.setId}`}</span>}
      </>}
    </>}
    {hasProblem && <>
      <span aria-hidden="true">/</span>
      <span aria-current={route.page === 'detail' ? 'page' : undefined}>{problem?.title ?? `문제 ${route.problemId}`}</span>
      {route.page === 'submit' && <><span aria-hidden="true">/</span><span aria-current="page">코드 제출</span></>}
    </>}
  </nav>
}

export default function AnalysisLayout({ route, user, group, problemSet, problem, children, onChangeUser }) {
  const main = useRef(null)
  const groupId = group?.groupId ?? route.groupId
  const groupBase = groupId ? `${base}/groups/${groupId}` : null
  const isHistory = route.page === 'submissions' || route.origin === 'submissions'
  const active = route.page === 'not-found' ? null : isHistory ? 'submissions' : ['problemsets', 'set-problems'].includes(route.page) || route.setId ? 'problemsets' : ['problems', 'detail', 'submit'].includes(route.page) ? 'problems' : 'groups'
  const routeKey = [route.page, route.groupId, route.setId, route.problemId, route.origin].join(':')
  const title = route.page === 'set-problems' && problemSet ? problemSet.setName : titles[route.page] ?? '현황 분석'

  useEffect(() => {
    main.current?.focus({ preventScroll: true })
    window.scrollTo(0, 0)
  }, [routeKey])

  useEffect(() => {
    document.title = `${title} · 현황 분석 | Interface Online Judge`
  }, [title])

  const menus = [
    ['groups', '그룹 선택', `${base}/groups`],
    ['problems', '문제 목록', groupBase ? `${groupBase}/problems` : null],
    ['problemsets', '문제집 목록', groupBase ? `${groupBase}/problemsets` : null],
    ['submissions', '내 제출', `${base}/submissions`],
  ]

  return <div className="analysis-app">
    <a className="skip-link" href="#analysis-content">본문으로 건너뛰기</a>
    <header className="topbar analysis-header">
      <div className="topbar-inner analysis-header-inner">
        <AdminLink to={user ? `${base}/groups` : base} className="brand analysis-brand" aria-label="Interface Online Judge 현황 분석 홈">
          <img src={logo} alt="IF" width="49" height="49" />
          <span className="brand-label">Interface Online Judge</span>
        </AdminLink>
        <span className="analysis-area-label">현황 분석</span>
        {user && <>
          <nav className="nav analysis-nav" aria-label="현황 분석 메뉴">
            {menus.map(([key, label, to]) => to ? <AdminLink key={key} to={to} className={`nav-item analysis-nav-link ${active === key ? 'active' : ''}`} aria-current={active === key ? 'page' : undefined}>{label}</AdminLink> : <span key={key} className="nav-item analysis-nav-link analysis-disabled" aria-disabled="true">{label}</span>)}
          </nav>
          <div className="account analysis-account">
            <span className="account-name" title={user.username}>{user.username} 님</span>
            <button type="button" className="account-button analysis-account-button" onClick={onChangeUser}>사용자 변경</button>
            {groupId && <AdminLink to={`/admin/groups/${groupId}`} className="analysis-management-link">그룹 관리</AdminLink>}
          </div>
        </>}
      </div>
    </header>
    <main id="analysis-content" className="analysis-main" ref={main} tabIndex={-1}>
      <Breadcrumbs route={route} group={group} problemSet={problemSet} problem={problem} />
      {children}
    </main>
    <footer className="site-footer">Interface Online Judge</footer>
  </div>
}
