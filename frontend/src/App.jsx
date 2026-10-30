import { useState } from 'react'
import GroupSelector from './components/GroupSelector'
import ProblemDetail from './components/ProblemDetail'
import ProblemList from './components/ProblemList'
import SubmissionPanel from './components/SubmissionPanel'
import { GROUPS, PROBLEMS } from './data/mockData'
import './App.css'

function App() {
  const [selectedGroupId, setSelectedGroupId] = useState(GROUPS[0].id)
  const [selectedProblemId, setSelectedProblemId] = useState(null)

  const groupProblems = PROBLEMS.filter(
    (problem) => problem.groupId === selectedGroupId
  )
  const selectedProblem = PROBLEMS.find(
    (problem) => problem.id === selectedProblemId
  )

  const handleGroupChange = (groupId) => {
    setSelectedGroupId(groupId)
    setSelectedProblemId(null)
  }

  return (
    <div>
      <header>
        <h1>Interface OJ</h1>
      </header>

      <GroupSelector
        groups={GROUPS}
        selectedGroupId={selectedGroupId}
        onChange={handleGroupChange}
      />

      <ProblemList
        problems={groupProblems}
        onSelect={setSelectedProblemId}
      />

      {selectedProblem && (
        <>
          <ProblemDetail problem={selectedProblem} />
          <SubmissionPanel
            key={selectedProblem.id}
            problemId={selectedProblem.id}
          />
        </>
      )}
    </div>
  )
}

export default App
