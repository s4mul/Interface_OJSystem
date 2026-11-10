import { isProblemList } from './getProblems.js'

export async function getProblemSet(setId, groupId, userId, signal) {
  const query = new URLSearchParams({ groupId, userId })
  const url = `/api/problemsets/${encodeURIComponent(setId)}?${query}`
  const response = await fetch(url, { signal }).catch(() => null)
  const data = await response?.json().catch(() => null)

  if (!response?.ok) {
    throw new Error(typeof data?.error === 'string' && data.error
      ? data.error
      : '문제집을 불러오지 못했습니다.')
  }

  const { problemSet, problems } = data ?? {}
  if (
    typeof problemSet?.setName !== 'string' || problemSet.setId !== setId ||
    (problemSet.description !== null && typeof problemSet.description !== 'string') ||
    !isProblemList(problems)
  ) {
    throw new Error('서버에서 받은 문제집 정보를 읽을 수 없습니다.')
  }

  return { problemSet, problems }
}
