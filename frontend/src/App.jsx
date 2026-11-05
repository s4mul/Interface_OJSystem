import { useState } from 'react'
import GroupSelection from './components/GroupSelection'
import SubmissionPanel from './components/SubmissionPanel'
import UserLookupForm from './components/UserLookupForm'
import { previewSubmission } from './api/previewSubmission'
import './App.css'

const previewProblemsByGroupId = {
  1: [{
    id: 1,
    title: 'A+B',
    description: '두 정수를 입력받아 합을 출력하세요.',
    input: '한 줄에 두 정수 A와 B가 공백으로 구분되어 주어집니다.',
    output: 'A와 B의 합을 출력합니다.',
    sampleInput: '2 3',
    sampleOutput: '5',
  }],
  2: [{
    id: 2,
    title: '큰 수 찾기',
    description: '두 정수 중 큰 수를 출력하세요.',
    input: '한 줄에 두 정수가 공백으로 구분되어 주어집니다.',
    output: '두 정수 중 큰 값을 출력합니다.',
    sampleInput: '4 9',
    sampleOutput: '9',
  }],
}

function App() {
  const [screen, setScreen] = useState('entry')
  const [user, setUser] = useState(null)
  const [group, setGroup] = useState(null)
  const [problem, setProblem] = useState(null)
  const groupProblems = previewProblemsByGroupId[group?.groupId] ?? []

  function enter(matchedUser) {
    setUser(matchedUser)
    setScreen('groups')
  }

  function selectGroup(item) {
    setGroup(item)
    setProblem(null)
    setScreen('list')
  }

  function openProblem(item) {
    setProblem(item)
    setScreen('detail')
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
        <section>
          <h2>문제 목록</h2>
          <p>그룹 {group.groupName}</p>
          {groupProblems.length === 0 && <p>미리보기 문제가 없습니다.</p>}
          <ul>
            {groupProblems.map((item) => (
              <li key={item.id}>
                <button type="button" onClick={() => openProblem(item)}>{item.id}. {item.title}</button>
              </li>
            ))}
          </ul>
          <button type="button" onClick={() => setScreen('groups')}>그룹 선택으로 돌아가기</button>
        </section>
      )}

      {screen === 'detail' && (
        <section>
          <h2>{problem.id}. {problem.title}</h2>
          <h3>문제</h3>
          <p>{problem.description}</p>
          <h3>입력</h3>
          <p>{problem.input}</p>
          <h3>출력</h3>
          <p>{problem.output}</p>
          <h3>예제 입력</h3>
          <pre>{problem.sampleInput}</pre>
          <h3>예제 출력</h3>
          <pre>{problem.sampleOutput}</pre>
          <button type="button" onClick={() => setScreen('list')}>문제 목록</button>
          {' '}
          <button type="button" onClick={() => setScreen('submit')}>코드 제출 화면으로</button>
        </section>
      )}

      {screen === 'submit' && (
        <section>
          <p>{problem.id}. {problem.title}</p>
          <SubmissionPanel
            problemId={problem.id}
            transport={previewSubmission}
            onBackToList={() => setScreen('list')}
          />
          <p><button type="button" onClick={() => setScreen('detail')}>문제 상세</button></p>
        </section>
      )}
    </main>
  )
}

export default App
