import { useEffect, useState } from 'react'
import { AsyncState, Button } from '../../design/ui.jsx'
import AdminPageHeader from '../components/AdminPageHeader.jsx'
import { AdminLink } from '../routing.jsx'
import { AdminSearch, AdminEmpty } from './PageSupport.jsx'
import { readAnalysisUser } from '../analysis/session.js'
import { getAdminProblems } from '../api/problems.js'
import AuthorSelection from '../problem-editor/AuthorSelection.jsx'
import '../problem-editor/editor.css'

export default function AdminProblems({ groupId }) {
  const [user, setUser] = useState(readAnalysisUser)
  const [query, setQuery] = useState('')
  const [attempt, setAttempt] = useState(0)
  const [result, setResult] = useState(null)
  const key = `${groupId}:${user?.userId}:${attempt}`

  useEffect(() => {
    if (!user) return
    const controller = new AbortController()
    getAdminProblems(groupId, user.userId, controller.signal).then(
      (problems) => { if (!controller.signal.aborted) setResult({ key, problems }) },
      (error) => { if (!controller.signal.aborted) setResult({ key, error: error.message }) },
    )
    return () => controller.abort()
  }, [key])

  const current = result?.key === key ? result : null
  const search = query.trim().toLocaleLowerCase()
  const visible = current?.problems?.filter((item) => !search || `${item.problemId} ${item.title}`.toLocaleLowerCase().includes(search)) ?? []

  return <section>
    <AdminPageHeader title="문제 관리" description="그룹의 공개·비공개 문제를 확인하고 새로운 문제를 등록하세요."><AdminLink to={`/admin/groups/${groupId}/problems/new`} className="btn">문제 등록</AdminLink></AdminPageHeader>
    <div className="panel problem-editor-list-author"><AuthorSelection user={user} onUserChange={setUser} /></div>
    <section className="panel" aria-label="관리자 문제 목록">
      <div className="panel-head"><h2 className="panel-head-title">문제 목록</h2><div className="actions">{current?.problems && <span className="panel-head-info">{visible.length}개 문제</span>}<Button variant="secondary" disabled={!user || !current} onClick={() => setAttempt((value) => value + 1)}>새로고침</Button></div></div>
      {user ? <>
        <AdminSearch value={query} onChange={setQuery} label="문제 검색" placeholder="문제 제목 또는 ID로 검색" />
        <AsyncState loading={!current} error={current?.error} onRetry={() => setAttempt((value) => value + 1)} />
        {current?.problems && (visible.length ? <ul className="problem-editor-problem-list">{visible.map((item) => <li className="problem-editor-problem-row" key={item.problemId}><div>{item.status === 'READY' && item.isPublic ? <AdminLink className="problem-editor-problem-title" to={`/admin/analysis/groups/${groupId}/problems/${item.problemId}`}>{item.title}</AdminLink> : <span className="problem-editor-problem-title">{item.title}</span>}<span className="problem-editor-problem-meta">문제 ID {item.problemId} · {item.status === 'READY' ? '준비 완료' : item.status === 'DRAFT' ? '작성 중' : item.status}</span></div><span className={`problem-editor-visibility ${item.isPublic ? 'public' : ''}`}>{item.isPublic ? '공개' : '비공개'}</span></li>)}</ul> : <AdminEmpty title={search ? '검색 결과가 없습니다.' : '등록된 문제가 없습니다.'}>{search ? `“${query.trim()}”에 해당하는 문제를 찾을 수 없습니다.` : '문제 등록에서 Markdown과 테스트케이스를 함께 등록할 수 있어요.'}</AdminEmpty>)}
      </> : <AdminEmpty title="관리자 이름을 조회해 주세요.">조회한 사용자의 그룹 관리자 권한으로 목록을 확인합니다.</AdminEmpty>}
    </section>
  </section>
}
