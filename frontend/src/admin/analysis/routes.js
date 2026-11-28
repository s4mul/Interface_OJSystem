export const analysisBase = '/admin/analysis'

function positiveId(value) {
  return /^[1-9]\d*$/.test(value ?? '') && Number.isSafeInteger(Number(value)) ? Number(value) : null
}

export function resolveAnalysisRoute(pathname) {
  const path = pathname.replace(/\/+$/, '') || '/'
  if (path === '/admin' || path === analysisBase) return { page: 'entry' }
  if (path === `${analysisBase}/groups`) return { page: 'groups' }
  if (path === `${analysisBase}/submissions`) return { page: 'submissions' }

  const history = path.match(/^\/admin\/analysis\/submissions\/problems\/([^/]+)(\/submit)?$/)
  if (history) {
    const problemId = positiveId(history[1])
    return problemId ? { page: history[2] ? 'submit' : 'detail', origin: 'submissions', problemId } : { page: 'not-found' }
  }

  const match = path.match(/^\/admin\/analysis\/groups\/([^/]+)(?:\/(.*))?$/)
  const groupId = positiveId(match?.[1])
  if (!groupId) return { page: 'not-found' }
  const suffix = match[2] ?? 'problems'
  const memberHistory = suffix.match(/^(?:problemsets\/([^/]+)\/)?problems\/([^/]+)\/members\/([^/]+)\/submissions(?:\/([^/]+))?$/)
  if (memberHistory) {
    const setId = memberHistory[1] === undefined ? undefined : positiveId(memberHistory[1])
    const problemId = positiveId(memberHistory[2])
    const memberId = positiveId(memberHistory[3])
    const submissionId = memberHistory[4] === undefined ? undefined : positiveId(memberHistory[4])
    if (problemId && memberId && setId !== null && submissionId !== null) return { page: submissionId ? 'member-submission-code' : 'member-submissions', groupId, problemId, memberId, ...(setId ? { setId } : {}), ...(submissionId ? { submissionId } : {}) }
    return { page: 'not-found', groupId }
  }
  if (suffix === 'problems' || suffix === 'problemsets') return { page: suffix, groupId }

  const set = suffix.match(/^problemsets\/([^/]+)(?:\/problems\/([^/]+)(\/submit)?)?$/)
  if (set) {
    const setId = positiveId(set[1])
    const problemId = set[2] === undefined ? undefined : positiveId(set[2])
    if (setId && problemId !== null) return { page: problemId ? set[3] ? 'submit' : 'detail' : 'set-problems', groupId, setId, ...(problemId ? { problemId } : {}) }
  }

  const problem = suffix.match(/^problems\/([^/]+)(\/submit)?$/)
  const problemId = positiveId(problem?.[1])
  if (problemId) return { page: problem[2] ? 'submit' : 'detail', groupId, problemId }
  return { page: 'not-found', groupId }
}

export function analysisGroupPath(groupId, page = 'problems') {
  return `${analysisBase}/groups/${groupId}/${page}`
}

export function analysisProblemPath(route, submit = false) {
  const prefix = route.origin === 'submissions'
    ? `${analysisBase}/submissions`
    : route.setId
      ? `${analysisGroupPath(route.groupId, 'problemsets')}/${route.setId}`
      : `${analysisBase}/groups/${route.groupId}`
  return `${prefix}/problems/${route.problemId}${submit ? '/submit' : ''}`
}

export function analysisMemberSubmissionsPath(route, problemId, memberId) {
  return `${analysisProblemPath({ ...route, problemId })}/members/${memberId}/submissions`
}

export function analysisMemberSubmissionPath(route, submissionId) {
  return `${analysisMemberSubmissionsPath(route, route.problemId, route.memberId)}/${submissionId}`
}

export function analysisListPath(route) {
  if (route.origin === 'submissions') return `${analysisBase}/submissions`
  if (route.setId) return `${analysisGroupPath(route.groupId, 'problemsets')}/${route.setId}`
  return route.groupId ? analysisGroupPath(route.groupId) : `${analysisBase}/groups`
}
