export async function getProblem(problemId, userId, signal) {
  const query = new URLSearchParams({ userId })
  const response = await fetch(`/api/problems/${encodeURIComponent(problemId)}?${query}`, { signal }).catch(() => null)
  const data = await response?.json().catch(() => null)

  if (!response?.ok) {
    throw new Error(typeof data?.error === 'string' && data.error
      ? data.error
      : '문제를 불러오지 못했습니다.')
  }

  const problem = data?.problem
  if (
    problem?.problemId !== problemId ||
    !Number.isSafeInteger(problem?.groupId) || problem.groupId <= 0 ||
    typeof problem.title !== 'string' ||
    typeof problem.description !== 'string' ||
    typeof problem.input !== 'string' || typeof problem.output !== 'string' ||
    !Array.isArray(problem.examples) || !problem.examples.every((example) =>
      typeof example?.input === 'string' && typeof example.output === 'string'
    ) ||
    ![problem.limits?.timeLimitMs, problem.limits?.memoryLimitMb, problem.limits?.outputLimitKb]
      .every((limit) => Number.isFinite(limit) && limit > 0)
  ) {
    throw new Error('서버에서 받은 문제 정보를 읽을 수 없습니다.')
  }

  return problem
}
