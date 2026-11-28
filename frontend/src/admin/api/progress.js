const isId = (value) => Number.isSafeInteger(value) && value > 0
const isCount = (value) => Number.isSafeInteger(value) && value >= 0
const isResult = (value) => typeof value === 'string' && value.length > 0

async function get(path, userId, signal) {
  let response
  try { response = await fetch(path + '?' + new URLSearchParams({ userId }), { signal, cache: 'no-store' }) }
  catch (error) { if (signal?.aborted) throw error; throw new Error('서버에 연결하지 못했습니다. 다시 시도해 주세요.') }
  const data = await response.json().catch(() => null)
  if (!response.ok) throw Object.assign(new Error(typeof data?.error === 'string' ? data.error : '조회에 실패했습니다. (' + response.status + ')'), { status: response.status })
  return data
}

function checkMember(data, groupId, problemId, memberId) {
  if (data?.groupId !== groupId || data.problemId !== problemId || data.member?.userId !== memberId || typeof data.member.username !== 'string') throw new Error('서버의 회원 정보를 읽을 수 없습니다.')
}

function isSubmission(item, problemId, memberId) {
  return isId(item?.submissionId) && item.problemId === problemId && item.userId === memberId && typeof item.title === 'string' && typeof item.language === 'string' && isResult(item.result) && typeof item.submittedAt === 'string' && Number.isFinite(Date.parse(item.submittedAt))
}

export async function getGroupProblemProgress(groupId, userId, signal) {
  const data = await get(`/api/admin/groups/${groupId}/progress`, userId, signal)
  if (data?.groupId !== groupId || !isCount(data.totalCount) || !Array.isArray(data.problems) || !data.problems.every((item) => isId(item?.problemId) && isCount(item.solvedCount) && item.solvedCount <= data.totalCount) || new Set(data.problems.map((item) => item.problemId)).size !== data.problems.length) throw new Error('그룹 풀이 현황을 읽을 수 없습니다.')
  return data
}

export async function getProblemProgress(groupId, problemId, userId, signal) {
  const data = await get(`/api/admin/groups/${groupId}/problems/${problemId}/progress`, userId, signal)
  if (data?.groupId !== groupId || data.problemId !== problemId || !isCount(data.totalCount) || !isCount(data.solvedCount) || !Array.isArray(data.people) || data.people.length !== data.totalCount || !data.people.every((member) => isId(member?.userId) && typeof member.username === 'string' && isCount(member.submissionCount) && ['solved', 'failed', 'working'].includes(member.bucket) && (member.result === null || isResult(member.result))) || new Set(data.people.map((member) => member.userId)).size !== data.people.length || data.people.filter((member) => member.bucket === 'solved').length !== data.solvedCount) throw new Error('회원별 풀이 현황을 읽을 수 없습니다.')
  return data
}

export async function getMemberProblemSubmissions(groupId, problemId, memberId, userId, signal) {
  const data = await get(`/api/admin/groups/${groupId}/problems/${problemId}/members/${memberId}/submissions`, userId, signal)
  checkMember(data, groupId, problemId, memberId)
  if (!Array.isArray(data.submissions) || !data.submissions.every((item) => isSubmission(item, problemId, memberId)) || new Set(data.submissions.map((item) => item.submissionId)).size !== data.submissions.length) throw new Error('회원의 제출 목록을 읽을 수 없습니다.')
  return data
}

export async function getMemberSubmission(groupId, problemId, memberId, submissionId, userId, signal) {
  const data = await get(`/api/admin/groups/${groupId}/problems/${problemId}/members/${memberId}/submissions/${submissionId}`, userId, signal)
  checkMember(data, groupId, problemId, memberId)
  if (!isSubmission(data.submission, problemId, memberId) || data.submission.submissionId !== submissionId || typeof data.submission.source !== 'string') throw new Error('제출 코드를 읽을 수 없습니다.')
  return data
}
