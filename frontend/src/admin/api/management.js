const isId = (v) => Number.isSafeInteger(v) && v > 0
const nullableText = (v) => v === null || typeof v === 'string'
async function request(path, options = {}) {
  const { signal, method = 'GET', body } = options
  let response
  try {
    response = await fetch(path, { method, signal, ...(body === undefined ? {} : { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }) })
  } catch (error) {
    if (signal?.aborted) throw error
    throw new Error(method === 'GET' ? '서버에 연결하지 못했습니다. 다시 시도해 주세요.' : '서버 응답을 확인하지 못했습니다. 저장된 값을 확인한 뒤 다시 시도해 주세요.')
  }
  const data = await response.json().catch(() => null)
  if (!response.ok) {
    const error = new Error(typeof data?.error === 'string' ? data.error : 'API 요청에 실패했습니다. (' + response.status + ')')
    error.status = response.status
    throw error
  }
  return data
}
function groupData(data, groupId) {
  const group = data?.group
  if (group?.groupId !== groupId || typeof group.groupName !== 'string') throw new Error('서버의 그룹 정보를 읽을 수 없습니다.')
  return group
}
export async function getAdminGroup(groupId, userId, signal) {
  return groupData(await request('/api/admin/groups/' + groupId + '?' + new URLSearchParams({ userId }), { signal }), groupId)
}
export async function updateAdminGroup(groupId, payload) {
  return groupData(await request('/api/admin/groups/' + groupId, { method: 'PATCH', body: payload }), groupId)
}
export async function createAdminGroup(payload) {
  const data = await request('/api/admin/groups', { method: 'POST', body: payload })
  if (!isId(data?.group?.groupId) || typeof data.group.groupName !== 'string') throw new Error('그룹 등록 응답을 읽을 수 없습니다.')
  return data.group
}
export async function updateAdminProblemSet(groupId, setId, payload) {
  const data = await request(`/api/admin/groups/${groupId}/problemsets/${setId}`, { method: 'PATCH', body: payload })
  if (data?.problemSet?.setId !== setId || data.problemSet.groupId !== groupId || typeof data.problemSet.setName !== 'string' || !nullableText(data.problemSet.description)) throw new Error('문제집 수정 응답을 읽을 수 없습니다.')
  return data.problemSet
}
export async function addProblemsToProblemSet(groupId, setId, payload) {
  const data = await request(`/api/admin/groups/${groupId}/problemsets/${setId}/problems`, { method: 'POST', body: payload })
  const addedCount = data?.addedCount
  const skippedCount = data?.skippedCount ?? payload.problemIds.length - addedCount
  if (!Number.isSafeInteger(addedCount) || addedCount < 0 || !Number.isSafeInteger(skippedCount) || skippedCount < 0 || addedCount + skippedCount !== payload.problemIds.length) throw new Error('추가 결과를 읽을 수 없습니다. 문제집에서 반영 여부를 확인해 주세요.')
  return { addedCount, skippedCount }
}
export async function getAdminMembers(groupId, userId, signal) {
  const data = await request('/api/admin/groups/' + groupId + '/members?' + new URLSearchParams({ userId }), { signal })
  if (!Array.isArray(data?.members) || !data.members.every((v) => isId(v?.userId) && typeof v.username === 'string' && typeof v.isAdmin === 'boolean')) throw new Error('서버의 멤버 목록을 읽을 수 없습니다.')
  return data.members
}
export async function createAdminProblemSet(groupId, payload) {
  const data = await request('/api/admin/groups/' + groupId + '/problemsets', { method: 'POST', body: payload })
  const set = data?.problemSet
  if (!isId(set?.setId) || set.groupId !== groupId || typeof set.setName !== 'string' || !nullableText(set.description)) throw new Error('등록 응답을 읽을 수 없습니다. 목록에서 등록 여부를 확인해 주세요.')
  return set
}
export async function updateAdminMember(groupId, memberId, payload) {
  const data = await request(`/api/admin/groups/${groupId}/members/${memberId}`, { method: 'PATCH', body: payload })
  if (data?.member?.userId !== memberId || typeof data.member.username !== 'string' || typeof data.member.isAdmin !== 'boolean') throw new Error('회원 권한 수정 응답을 읽을 수 없습니다.')
  return data.member
}
export async function getMySubmissions(userId, signal) {
  const data = await request('/api/submissions?' + new URLSearchParams({ userId }), { signal })
  if (!Array.isArray(data?.submissions) || !data.submissions.every((v) => isId(v?.submissionId) && isId(v.problemId) && typeof v.title === 'string' && typeof v.language === 'string' && typeof v.result === 'string' && typeof v.submittedAt === 'string' && Number.isFinite(Date.parse(v.submittedAt)))) throw new Error('서버의 제출 기록을 읽을 수 없습니다.')
  if (new Set(data.submissions.map((v) => v.submissionId)).size !== data.submissions.length) throw new Error('서버의 제출 번호가 중복되었습니다.')
  return data.submissions.map((v) => ({ ...v, userId }))
}
export function mergeSubmissionHistory(existing, received) {
  const rows = new Map(existing.map((v) => [v.submissionId, v]))
  for (const row of received) {
    const old = rows.get(row.submissionId)
    const pending = ['PENDING', 'JUDGING'].includes(row.result)
    rows.set(row.submissionId, old && !['PENDING', 'JUDGING'].includes(old.result) && pending ? { ...row, result: old.result } : row)
  }
  return [...rows.values()].sort((a, b) => b.submissionId - a.submissionId)
}
