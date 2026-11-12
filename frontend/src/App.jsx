import { useState } from 'react'
import GroupSelection from './components/GroupSelection'
import ProblemList from './components/ProblemList'
import ProblemSetList from './components/ProblemSetList'
import ProblemDetail from './components/ProblemDetail'
import SubmissionPanel from './components/SubmissionPanel'
import UserLookupForm from './components/UserLookupForm'
import './App.css'

function App() {
  const [screen, setScreen] = useState('entry')
  const [user, setUser] = useState(null)
  const [group, setGroup] = useState(null)
  const [problemSet, setProblemSet] = useState(null)
  const [problem, setProblem] = useState(null)

  function enter(matchedUser) {
    setUser(matchedUser)
    setScreen('groups')
  }

  function selectGroup(item) {
    setGroup(item)
    setProblemSet(null)
    setProblem(null)
    setScreen('list')
  }

  function openProblem(item) {
    setProblem(item)
    setScreen('detail')
  }

  function submitProblem(item) {
    setProblem(item)
    setScreen('submit')
  }

  return (
    <main>
      <h1>Interface OJ</h1>
      {screen !== 'entry' && <p>사용자 {user.username} (ID: {user.userId})</p>}

      {screen === 'entry' && (
        <UserLookupForm initialName={user?.username ?? ''} onUserFound={enter} />
      )}

      {screen === 'groups' && (
        <GroupSelection
          key={user.userId}
          userId={user.userId}
          onSelect={selectGroup}
          onBack={() => setScreen('entry')}
        />
      )}

      {screen === 'list' && (
        <div key={`${user.userId}-${group.groupId}`}>
          <p>그룹 {group.groupName}</p>
          {!problemSet && (
            <ProblemSetList groupId={group.groupId} userId={user.userId} onSelect={setProblemSet} />
          )}
          <ProblemList
            key={problemSet?.setId ?? 'group'}
            group={group}
            userId={user.userId}
            selectedSet={problemSet}
            onSelect={openProblem}
            onBack={problemSet ? () => setProblemSet(null) : () => setScreen('groups')}
          />
        </div>
      )}

      {screen === 'detail' && (
        <ProblemDetail
          key={`${user.userId}-${problem.problemId}`}
          problemId={problem.problemId}
          userId={user.userId}
          onSubmit={submitProblem}
          onBack={() => setScreen('list')}
        />
      )}

      {screen === 'submit' && (
        <section>
          <p>{problem.problemId}. {problem.title}</p>
          <SubmissionPanel
            problemId={problem.problemId}
            onBackToList={() => setScreen('list')}
          />
          <p><button type="button" onClick={() => setScreen('detail')}>문제 상세</button></p>
        </section>
      )}
    </main>
  )
}

export default App
