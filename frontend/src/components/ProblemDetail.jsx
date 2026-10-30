function ProblemDetail({ problem }) {
  return (
    <section>
      <h2>
        문제 {problem.id}. {problem.title}
      </h2>
      <p>{problem.description}</p>

      <h3>입력</h3>
      <p>{problem.input}</p>

      <h3>출력</h3>
      <p>{problem.output}</p>

      <h3>예제 입력</h3>
      <pre>{problem.exampleInput}</pre>

      <h3>예제 출력</h3>
      <pre>{problem.exampleOutput}</pre>

      <h3>제한</h3>
      <ul>
        <li>시간 제한: {problem.timeLimit}</li>
        <li>메모리 제한: {problem.memoryLimit}</li>
        <li>출력 제한: {problem.outputLimit}</li>
      </ul>
    </section>
  )
}

export default ProblemDetail
