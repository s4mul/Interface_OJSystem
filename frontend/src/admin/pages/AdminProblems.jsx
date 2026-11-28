import { useEffect, useState } from 'react'
import { AsyncState, Button } from '../../design/ui.jsx'
import AdminPageHeader from '../components/AdminPageHeader.jsx'
import { AdminLink } from '../routing.jsx'
import { AdminSearch, AdminEmpty } from './PageSupport.jsx'
import { readAnalysisUser } from '../analysis/session.js'
import { getAdminProblems } from '../api/problems.js'
import ProblemSetAssignment from '../components/ProblemSetAssignment.jsx'
import { ProgressToggle, ProgressDetails, ProgressRefresh, initialExpandedProblem } from '../progress/ProgressDisclosure.jsx'
import { getGroupProblemProgress } from '../api/progress.js'
import { useAdminResource } from '../api/useAdminResource.js'
import { navigateAdmin } from '../navigation.js'
import { analysisMemberSubmissionsPath } from '../analysis/routes.js'
import AuthorSelection from '../problem-editor/AuthorSelection.jsx'
import '../problem-editor/editor.css'

export default function AdminProblems({ groupId }) {
  const [user, setUser] = useState(readAnalysisUser)
  const [query, setQuery] = useState('')
  const [editingMembership, setEditingMembership] = useState(false)
  const [notice, setNotice] = useState('')
  const [openProgress, setOpenProgress] = useState(initialExpandedProblem)
  const [progressVersion, setProgressVersion] = useState(0)
  const [attempt, setAttempt] = useState(0)
  const [result, setResult] = useState(null)
  const key = `${groupId}:${user?.userId}:${attempt}`
  const progress = useAdminResource(getGroupProblemProgress, groupId, user?.userId)
  const progressById = new Map(progress.data?.problems.map((item) => [item.problemId, item.solvedCount]) ?? [])
  function progressData(problemId) { return progress.data && progressById.has(problemId) ? { totalCount: progress.data.totalCount, solvedCount: progressById.get(problemId) } : null }
  function refreshProgress() { progress.reload(); setProgressVersion((value) => value + 1); setAttempt((value) => value + 1) }

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

  function openMemberSubmissions(problem, member) {
    window.history.replaceState(window.history.state, '', `${window.location.pathname}${window.location.search}#progress-${problem.problemId}`)
    navigateAdmin(analysisMemberSubmissionsPath({ groupId }, problem.problemId, member.userId) + '?from=management')
  }
  function finishEditing(saved) {
    setEditingMembership(false)
    if (saved) setNotice(`${saved.setName}에 추가 ${saved.addedCount}개, 제외 ${saved.removedCount}개를 저장했습니다.`)
    setAttempt((value) => value + 1)
  }
  if (editingMembership) return <ProblemSetAssignment groupId={groupId} userId={user.userId} onClose={finishEditing} />

  return <section>
    <AdminPageHeader title="문제 관리" description="새 문제를 등록하거나, 문제집 문제 목록 수정하기에서 기존 문제의 포함 여부를 바꾸세요."><AdminLink to={`/admin/groups/${groupId}/problems/new`} className="btn">문제 등록</AdminLink>{user && <Button variant="secondary" onClick={() => { setNotice(''); setEditingMembership(true) }}>문제집 문제 목록 수정하기</Button>}</AdminPageHeader>
    <div className="panel problem-editor-list-author"><AuthorSelection user={user} onUserChange={(matched) => { setUser(matched); setNotice('') }} /></div>
    {notice && <p role="status">{notice}</p>}
    {user && <ProgressRefresh loading={progress.loading} error={progress.error} onRefresh={refreshProgress} />}
    <section className="panel" aria-label="관리자 문제 목록">
      <div className="panel-head"><h2 className="panel-head-title">문제 목록</h2><div className="actions">{current?.problems && <span className="panel-head-info">{visible.length}개 문제</span>}<Button variant="secondary" disabled={!user || !current} onClick={() => setAttempt((value) => value + 1)}>목록 새로고침</Button></div></div>
      {user ? <>
        <AdminSearch value={query} onChange={setQuery} label="문제 검색" placeholder="문제 제목 또는 ID로 검색" />
        <AsyncState loading={!current} error={current?.error} onRetry={() => setAttempt((value) => value + 1)} />
        {current?.problems && (visible.length ? <ul className="problem-editor-problem-list">{visible.map((item) => <li className="admin-progress-legacy-item" key={item.problemId}>
          <div className="problem-editor-problem-row"><div>{item.status === 'READY' && item.isPublic ? <AdminLink className="problem-editor-problem-title" to={`/admin/analysis/groups/${groupId}/problems/${item.problemId}`}>{item.title}</AdminLink> : <span className="problem-editor-problem-title">{item.title}</span>}<span className="problem-editor-problem-meta">문제 ID {item.problemId} · {item.status === 'READY' ? '준비 완료' : '작성 중'}</span></div>
            <ProgressToggle problem={item} data={progressData(item.problemId)} loading={progress.loading} expanded={openProgress === item.problemId} onToggle={() => setOpenProgress((currentId) => currentId === item.problemId ? null : item.problemId)} />
            <AdminLink className="btn secondary" to={`/admin/groups/${groupId}/problems/${item.problemId}/edit`}>수정</AdminLink><span className={`problem-editor-visibility ${item.isPublic ? 'public' : ''}`}>{item.isPublic ? '공개' : '비공개'}</span>
          </div>
          {openProgress === item.problemId && <ProgressDetails groupId={groupId} userId={user.userId} refreshVersion={progressVersion} problem={item} onOpenMember={openMemberSubmissions} />}
        </li>)}</ul> : <AdminEmpty title={search ? '검색 결과가 없습니다.' : '등록된 문제가 없습니다.'}>{search ? `“${query.trim()}”에 해당하는 문제를 찾을 수 없습니다.` : '문제 등록에서 Markdown과 테스트케이스를 함께 등록할 수 있어요.'}</AdminEmpty>)}
      </> : <AdminEmpty title="관리자 이름을 조회해 주세요.">조회한 사용자의 그룹 관리자 권한으로 목록을 확인합니다.</AdminEmpty>}
    </section>
  </section>
}
