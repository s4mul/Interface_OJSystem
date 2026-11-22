import { useCallback, useEffect, useState } from 'react'
import GroupSelection from '../../components/GroupSelection.jsx'
import ProblemList from '../../components/ProblemList.jsx'
import ProblemSetList from '../../components/ProblemSetList.jsx'
import ProblemDetail from '../../components/ProblemDetail.jsx'
import SubmissionPanel from '../../components/SubmissionPanel.jsx'
import SubmissionList from '../../components/SubmissionList.jsx'
import UserLookupForm from '../../components/UserLookupForm.jsx'
import { subscribeToSubmission } from '../../api/submissions.js'
import { getMySubmissions, mergeSubmissionHistory } from '../api/management.js'
import { AsyncState, Button } from '../../design/ui.jsx'
import { navigateAdmin, useAdminPath } from '../navigation.js'
import { AdminLink } from '../routing.jsx'
import AnalysisLayout from './AnalysisLayout.jsx'
import { loadAnalysisContext } from './context.js'
import { readAnalysisUser, rememberAnalysisUser } from './session.js'
import { analysisBase, analysisGroupPath, analysisListPath, analysisProblemPath, resolveAnalysisRoute } from './routes.js'

function useRouteContext(route, user, attempt) {
  const [result, setResult] = useState(null)
  const key = [user?.userId, route.page, route.groupId, route.setId, route.problemId, route.origin, attempt].join(':')
  const needsContext = user && !['entry', 'groups', 'submissions', 'not-found'].includes(route.page)

  useEffect(() => {
    if (!needsContext) return
    const controller = new AbortController()
    loadAnalysisContext(route, user.userId, controller.signal).then(
      (context) => { if (!controller.signal.aborted) setResult({ key, ...context }) },
      (error) => { if (!controller.signal.aborted) setResult({ key, error: error.message }) },
    )
    return () => controller.abort()
  }, [key])

  return !needsContext ? {} : result?.key === key ? result : { loading: true }
}

export default function AnalysisApp({ submissionHistory, setSubmissionHistory }) {
  const pathname = useAdminPath()
  const route = resolveAnalysisRoute(pathname)
  const [user, setUser] = useState(readAnalysisUser)
  const [previousName, setPreviousName] = useState(user?.username ?? '')
  const [lastGroup, setLastGroup] = useState(null)
  const [attempt, setAttempt] = useState(0)
  const [historyAttempt, setHistoryAttempt] = useState(0)
  const [historyResult, setHistoryResult] = useState(null)
  const historyKey = `${user?.userId}:${historyAttempt}`
  const context = useRouteContext(route, user, attempt)

  useEffect(() => {
    if (!context.group) return
    setLastGroup((current) => current?.userId === user.userId && current.group.groupId === context.group.groupId && current.group.groupName === context.group.groupName
      ? current : { userId: user.userId, group: context.group })
  }, [context.group, user?.userId])

  const recordSubmission = useCallback((item) => {
    setSubmissionHistory((history) => {
      const records = history[item.userId] ?? []
      const previous = records.find((record) => record.submissionId === item.submissionId)
      const record = { ...item, submittedAt: previous?.submittedAt ?? item.submittedAt }
      return { ...history, [item.userId]: [record, ...records.filter((entry) => entry.submissionId !== item.submissionId)] }
    })
  }, [setSubmissionHistory])

  useEffect(() => {
    if (route.page !== 'submissions' || !user) return
    const controller = new AbortController()
    setHistoryResult(null)
    getMySubmissions(user.userId, controller.signal).then(
      (rows) => {
        if (controller.signal.aborted) return
        setSubmissionHistory((history) => ({ ...history, [user.userId]: mergeSubmissionHistory(history[user.userId] ?? [], rows) }))
        setHistoryResult({ key: historyKey })
      },
      (error) => { if (!controller.signal.aborted) setHistoryResult({ key: historyKey, error: error.message }) },
    )
    return () => controller.abort()
  }, [route.page, user?.userId, historyKey, setSubmissionHistory])

  useEffect(() => {
    if (route.page !== 'submissions' || !user) return
    const streams = (submissionHistory[user.userId] ?? [])
      .filter((item) => ['PENDING', 'JUDGING'].includes(item.result))
      .map((item) => subscribeToSubmission(item.submissionId, (update) => recordSubmission({ ...item, ...update })))
    return () => streams.forEach((stream) => stream.close())
  }, [route.page, user, submissionHistory, recordSubmission])

  function enter(matchedUser) {
    rememberAnalysisUser(matchedUser)
    setPreviousName(matchedUser.username)
    setUser(matchedUser)
    setLastGroup(null)
    if (route.page === 'entry') navigateAdmin(`${analysisBase}/groups`)
  }

  function changeUser() {
    rememberAnalysisUser(null)
    setPreviousName(user?.username ?? '')
    setUser(null)
    setLastGroup(null)
    navigateAdmin(analysisBase)
  }

  const group = context.group ?? (['submissions', 'entry', 'groups'].includes(route.page) && lastGroup && lastGroup.userId === user?.userId ? lastGroup.group : null)
  const pageKey = `${user?.userId}:${pathname}`
  let content

  if (route.page === 'not-found') {
    content = <section className="panel analysis-route-state"><h1>페이지를 찾을 수 없어요</h1><p className="subtitle">주소를 확인하거나 그룹 선택으로 이동해 주세요.</p><AdminLink className="btn" to={`${analysisBase}/groups`}>그룹 선택으로</AdminLink></section>
  } else if (!user || route.page === 'entry') {
    content = <UserLookupForm key={user?.userId ?? 'lookup'} initialName={user?.username ?? previousName} onUserFound={enter} />
  } else if (context.loading || context.error) {
    content = <section className="panel analysis-route-state"><AsyncState loading={context.loading} error={context.error} onRetry={() => setAttempt((value) => value + 1)} /><div className="actions"><AdminLink className="btn secondary" to={`${analysisBase}/groups`}>그룹 선택</AdminLink><Button variant="secondary" onClick={changeUser}>사용자 변경</Button></div></section>
  } else if (route.page === 'groups') {
    content = <GroupSelection key={pageKey} userId={user.userId} onSelect={(item) => { setLastGroup({ userId: user.userId, group: item }); navigateAdmin(analysisGroupPath(item.groupId)) }} onBack={changeUser} />
  } else if (route.page === 'problemsets') {
    content = <ProblemSetList key={pageKey} group={context.group} groupId={route.groupId} userId={user.userId} onSelect={(item) => navigateAdmin(`${analysisGroupPath(route.groupId, 'problemsets')}/${item.setId}`)} onShowProblems={() => navigateAdmin(analysisGroupPath(route.groupId))} />
  } else if (route.page === 'problems' || route.page === 'set-problems') {
    content = <ProblemList key={pageKey} group={context.group} userId={user.userId} selectedSet={context.problemSet} onSelect={(item) => navigateAdmin(analysisProblemPath({ ...route, problemId: item.problemId }))} onBack={() => navigateAdmin(route.setId ? analysisGroupPath(route.groupId, 'problemsets') : `${analysisBase}/groups`)} onShowSets={() => navigateAdmin(analysisGroupPath(route.groupId, 'problemsets'))} onShowAll={() => navigateAdmin(analysisGroupPath(route.groupId))} />
  } else if (route.page === 'detail') {
    content = <ProblemDetail key={pageKey} problemId={route.problemId} userId={user.userId} isSolved={context.problem.isSolved} onSubmit={() => navigateAdmin(analysisProblemPath(route, true))} onBack={() => navigateAdmin(analysisListPath(route))} backLabel={route.origin === 'submissions' ? '내 제출 목록' : undefined} />
  } else if (route.page === 'submit') {
    content = <SubmissionPanel key={pageKey} problemId={route.problemId} userId={user.userId} problem={context.problem} onSubmissionChange={recordSubmission} onShowSubmissions={() => navigateAdmin(`${analysisBase}/submissions`)} onBackToList={() => navigateAdmin(analysisListPath(route))} onBackToDetail={() => navigateAdmin(analysisProblemPath(route))} />
  } else if (route.page === 'submissions') {
    content = <SubmissionList key={pageKey} username={user.username} submissions={submissionHistory[user.userId] ?? []} loading={historyResult?.key !== historyKey} error={historyResult?.key === historyKey ? historyResult.error : null} onRefresh={() => setHistoryAttempt((value) => value + 1)} notice="서버에 저장된 내 제출 기록을 조회합니다." onOpenProblem={(item) => navigateAdmin(analysisProblemPath({ origin: 'submissions', problemId: item.problemId }))} onBack={() => navigateAdmin(group ? analysisGroupPath(group.groupId) : `${analysisBase}/groups`)} />
  }

  return <AnalysisLayout route={route} user={user} group={group} problemSet={context.problemSet} problem={context.problem} onChangeUser={changeUser}>
    {user && route.page !== 'entry' && route.page !== 'not-found' && <p className="analysis-scope-note">표시 기준: <strong>{user.username}</strong> 님의 풀이 현황</p>}
    {content}
  </AnalysisLayout>
}
