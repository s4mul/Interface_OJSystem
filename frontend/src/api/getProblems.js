export async function getProblems(groupId, userId, signal) {
  const query = new URLSearchParams({ groupId, userId })
  const response = await fetch(`/api/problems?${query}`, { signal }).catch(() => null)
  const data = await response?.json().catch(() => null)

  if (!response?.ok) {
    throw new Error(typeof data?.error === 'string' && data.error
      ? data.error
      : '문제 목록을 불러오지 못했습니다.')
  }

  if (!Array.isArray(data?.problems) || !data.problems.every((problem) =>
    Number.isSafeInteger(problem?.problemId) && problem.problemId > 0 &&
    typeof problem.title === 'string' && typeof problem.isSolved === 'boolean'
  )) {
    throw new Error('서버에서 받은 문제 목록을 읽을 수 없습니다.')
  }

  return data.problems
}
