async function readResponse(response, fallback) {
  const data = await response.json().catch(() => null)
  if (!response.ok) throw new Error(typeof data?.error === 'string' ? data.error : fallback)
  return data
}

export async function createAdminProblem(groupId, payload) {
  let response
  try {
    response = await fetch(`/api/admin/groups/${encodeURIComponent(groupId)}/problems`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
    })
  } catch {
    throw new Error('서버 응답을 확인하지 못했습니다. 문제 목록에서 등록 여부를 확인한 뒤 다시 시도해 주세요.')
  }
  const data = await readResponse(response, '문제를 등록하지 못했습니다.')
  if (!Number.isSafeInteger(data?.problemId) || data.problemId <= 0 || data.groupId !== groupId || !Number.isSafeInteger(data.testcaseCount) || data.testcaseCount <= 0) {
    throw new Error('등록 응답을 읽을 수 없습니다. 문제 목록에서 등록 여부를 확인해 주세요.')
  }
  return data
}

export async function getAdminProblems(groupId, userId, signal) {
  const query = new URLSearchParams({ userId })
  const response = await fetch(`/api/admin/groups/${encodeURIComponent(groupId)}/problems?${query}`, { signal }).catch((error) => {
    if (signal?.aborted) throw error
    throw new Error('문제 목록 서버에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.')
  })
  const data = await readResponse(response, '관리할 문제 목록을 불러오지 못했습니다.')
  if (!Array.isArray(data?.problems) || !data.problems.every((item) => Number.isSafeInteger(item?.problemId) && typeof item.title === 'string' && ['DRAFT', 'READY'].includes(item.status) && typeof item.isPublic === 'boolean')) {
    throw new Error('서버에서 받은 관리자 문제 목록을 읽을 수 없습니다.')
  }
  return data.problems
}

export async function getEditableProblem(groupId, problemId, userId, signal) {
  const query = new URLSearchParams({ userId })
  const response = await fetch(`/api/admin/groups/${groupId}/problems/${problemId}?${query}`, { signal }).catch((error) => {
    if (signal?.aborted) throw error
    throw new Error('문제 서버에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.')
  })
  const { problem } = await readResponse(response, '수정할 문제를 불러오지 못했습니다.')
  if (problem?.problemId !== problemId || problem.groupId !== groupId || typeof problem.isPublic !== 'boolean' ||
      typeof problem.title !== 'string' || typeof problem.description !== 'string' || typeof problem.input !== 'string' || typeof problem.output !== 'string' ||
      !Array.isArray(problem.examples) || !problem.examples.every((example) => typeof example?.input === 'string' && typeof example.output === 'string') ||
      ![problem.limits?.timeLimitMs, problem.limits?.memoryLimitMb, problem.limits?.outputLimitKb].every((limit) => Number.isFinite(limit) && limit > 0)) {
    throw new Error('서버에서 받은 관리자 문제 정보를 읽을 수 없습니다.')
  }
  return problem
}

export async function updateAdminProblem(groupId, problemId, payload) {
  let response
  try {
    response = await fetch(`/api/admin/groups/${groupId}/problems/${problemId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
  } catch { throw new Error('서버 응답을 확인하지 못했습니다. 다시 조회한 뒤 저장 여부를 확인해 주세요.') }
  const data = await readResponse(response, '문제를 수정하지 못했습니다.')
  if (data?.problemId !== problemId || data.groupId !== groupId || typeof data.isPublic !== 'boolean') throw new Error('수정 응답을 읽을 수 없습니다. 문제 목록에서 확인해 주세요.')
  return data
}
