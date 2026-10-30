function ProblemList({ problems, onSelect }) {
  return (
    <section>
      <h2>전체 문제 목록</h2>

      {problems.length === 0 ? (
        <p>등록된 문제가 없습니다.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>문제 번호</th>
              <th>제목</th>
              <th>상태</th>
            </tr>
          </thead>
          <tbody>
            {problems.map((problem) => (
              <tr key={problem.id}>
                <td>{problem.id}</td>
                <td>
                  <button
                    type="button"
                    onClick={() => onSelect(problem.id)}
                  >
                    {problem.title}
                  </button>
                </td>
                <td>{problem.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  )
}

export default ProblemList
