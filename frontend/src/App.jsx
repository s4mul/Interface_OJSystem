import SubmissionPanel from './components/SubmissionPanel'
import './App.css'

// 1회차 고정 문제 정보
const PROBLEM = {
  id: 1,
  title: 'A+B',
  description: '두 정수를 입력받아 합을 출력하세요.',
}

function App() {
  return (
    <div>
      <header>
        <h1>Interface OJ</h1>
      </header>

      {/* 문제 정보 영역 */}
      <section>
        <h2>
          문제 {PROBLEM.id}.
        </h2>
        <h3>
          {PROBLEM.title}
        </h3>
        <p>{PROBLEM.description}</p>
      </section>

      <SubmissionPanel problemId={PROBLEM.id} />
    </div>
  )
}

export default App
