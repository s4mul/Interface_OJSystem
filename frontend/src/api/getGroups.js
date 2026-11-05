export async function getGroups(userId, signal) {
  const query = new URLSearchParams({ userId })
  const response = await fetch(`/api/groups?${query}`, { signal }).catch(() => null)
  const data = await response?.json().catch(() => null)

  if (!response?.ok) {
    throw new Error(typeof data?.error === 'string' && data.error
      ? data.error
      : '그룹 목록을 불러오지 못했습니다.')
  }

  if (!Array.isArray(data?.groups) || !data.groups.every((group) =>
    Number.isSafeInteger(group?.groupId) && typeof group.groupName === 'string'
  )) {
    throw new Error('서버에서 받은 그룹 목록을 읽을 수 없습니다.')
  }

  return data.groups
}
