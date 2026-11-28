import { getGroups } from '../../api/getGroups.js'
import { getProblems } from '../../api/getProblems.js'
import { getProblemSets } from '../../api/getProblemSets.js'
import { getProblemSet } from '../../api/getProblemSet.js'
import { getAdminProblems } from '../api/problems.js'
import { getAdminProblemSetProblems } from '../api/management.js'
import { getProblem } from '../../api/getProblem.js'

export async function loadAnalysisContext(route, userId, signal) {
  if (['entry', 'groups', 'submissions', 'not-found'].includes(route.page)) return {}

  const groups = await getGroups(userId, signal)
  let problem
  if (route.origin === 'submissions') problem = await getProblem(route.problemId, userId, signal)
  const groupId = route.groupId ?? problem?.groupId
  const group = groups.find((item) => item.groupId === groupId)
  if (!group) throw new Error('조회한 사용자가 참여한 그룹을 선택해 주세요.')

  let problemSet
  if (route.setId) {
    const sets = await getProblemSets(groupId, userId, signal)
    problemSet = sets.find((item) => item.setId === route.setId)
    if (!problemSet) throw new Error('이 그룹에 포함된 문제집을 선택해 주세요.')
  }

  if (['member-submissions', 'member-submission-code'].includes(route.page)) {
    const problems = await getAdminProblems(groupId, userId, signal)
    problem = problems.find((item) => item.problemId === route.problemId)
    if (!problem) throw new Error('이 그룹에 포함된 문제를 선택해 주세요.')
    if (route.setId) {
      const data = await getAdminProblemSetProblems(groupId, route.setId, userId, signal)
      if (!data.problemIds.includes(route.problemId)) throw new Error('이 문제집에 포함된 문제를 선택해 주세요.')
    }
    return { group, problemSet, problem }
  }

  if (route.problemId) {
    problem ??= await getProblem(route.problemId, userId, signal)
    if (problem.groupId !== groupId) throw new Error('이 그룹에 포함된 문제를 선택해 주세요.')

    const list = route.setId
      ? await getProblemSet(route.setId, groupId, userId, signal)
      : { problems: await getProblems(groupId, userId, signal) }
    const listedProblem = list.problems.find((item) => item.problemId === route.problemId)
    if (!listedProblem) throw new Error(route.setId ? '이 문제집에 포함된 문제를 선택해 주세요.' : '그룹 문제 목록에서 확인할 수 없는 문제입니다.')
    problem = { ...problem, isSolved: listedProblem.isSolved }
    problemSet = list.problemSet ?? problemSet
  }

  return { group, problemSet, problem }
}
