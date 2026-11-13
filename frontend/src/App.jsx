import { useEffect, useRef, useState } from 'react'
import GroupSelection from './components/GroupSelection'
import ProblemList from './components/ProblemList'
import ProblemSetList from './components/ProblemSetList'
import ProblemDetail from './components/ProblemDetail'
import SubmissionPanel from './components/SubmissionPanel'
import UserLookupForm from './components/UserLookupForm'
import AppHeader from './design/layout/AppHeader'
import './design/tokens.css'
import './design/global.css'
import './App.css'

function App() {
  const [screen, setScreen] = useState('entry')
  const [user, setUser] = useState(null)
  const [group, setGroup] = useState(null)
  const [problemSet, setProblemSet] = useState(null)
  const [problem, setProblem] = useState(null)
  const main = useRef(null)

  useEffect(() => {
    main.current?.focus({ preventScroll: true })
    window.scrollTo(0, 0)
  }, [screen, group?.groupId, problemSet?.setId, problem?.problemId])

  function enter(matchedUser) {
    setUser(matchedUser)
    setGroup(null)
    setProblemSet(null)
    setProblem(null)
    setScreen('groups')
  }

  function selectGroup(item) {
    setGroup(item)
    setProblemSet(null)
    setProblem(null)
    setScreen('list')
  }

  function showAll() {
    setProblemSet(null)
    setScreen('list')
  }

  function openProblem(item) {
    setProblem(item)
    setScreen('detail')
  }

  function submitProblem(item) {
    setProblem((previous) => ({ ...previous, ...item }))
    setScreen('submit')
  }

  function navigate(next) {
    if (next === 'list') showAll()
    else setScreen(next)
  }

  const hasGroup = user && group && !['entry', 'groups'].includes(screen)
  return <>
    <a className="skip-link" href="#main-content">본문으로 건너뛰기</a>
    <AppHeader user={screen === 'entry' ? null : user} screen={screen} group={group} onNavigate={navigate} onChangeUser={() => setScreen('entry')} />
    <main id="main-content" ref={main} tabIndex={-1}>
      {hasGroup && <nav className="crumbs" aria-label="현재 위치">
        <button type="button" onClick={() => setScreen('groups')}>그룹 선택</button><span aria-hidden="true">/</span>
        <button type="button" onClick={showAll}>{group.groupName}</button>
        {problemSet && screen !== 'sets' && <><span aria-hidden="true">/</span><button type="button" onClick={() => setScreen('list')}>{problemSet.setName}</button></>}
        {['detail', 'submit'].includes(screen) && <><span aria-hidden="true">/</span><span>{problem.title}</span></>}
        {screen === 'sets' && <><span aria-hidden="true">/</span><span aria-current="page">문제집 목록</span></>}
      </nav>}
      {screen === 'entry' && <UserLookupForm initialName={user?.username ?? ''} onUserFound={enter} />}
      {screen === 'groups' && <GroupSelection key={user.userId} userId={user.userId} onSelect={selectGroup} onBack={() => setScreen('entry')} />}
      {screen === 'sets' && <ProblemSetList key={`${user.userId}-${group.groupId}`} group={group} groupId={group.groupId} userId={user.userId} onSelect={(item) => { setProblemSet(item); setScreen('list') }} onShowProblems={showAll} />}
      {screen === 'list' && <ProblemList key={`${user.userId}-${group.groupId}-${problemSet?.setId ?? 'all'}`} group={group} userId={user.userId} selectedSet={problemSet} onSelect={openProblem} onBack={() => setScreen(problemSet ? 'sets' : 'groups')} onShowSets={() => setScreen('sets')} onShowAll={showAll} />}
      {screen === 'detail' && <ProblemDetail key={`${user.userId}-${problem.problemId}`} problemId={problem.problemId} isSolved={problem.isSolved} userId={user.userId} onSubmit={submitProblem} onBack={() => setScreen('list')} />}
      {screen === 'submit' && <SubmissionPanel key={`${user.userId}-${problem.problemId}`} problemId={problem.problemId} problem={problem} userId={user.userId} onBackToList={() => setScreen('list')} onBackToDetail={() => setScreen('detail')} />}
    </main>
    <footer className="site-footer">Interface Online Judge</footer>
  </>
}

export default App
