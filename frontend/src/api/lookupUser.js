const lookupErrors = {
  400: '이름을 1자 이상 100자 이하로 입력해 주세요.',
  404: '등록된 사용자를 찾을 수 없습니다.',
  409: '같은 이름으로 등록된 사용자가 여러 명입니다.',
}

export async function lookupUser(username) {
  const query = new URLSearchParams({ username })
  const response = await fetch(`/api/users?${query}`).catch(() => null)

  if (!response?.ok) {
    throw new Error(lookupErrors[response?.status] ?? '사용자를 조회할 수 없습니다. 다시 시도해 주세요.')
  }

  const user = await response.json().catch(() => null)
  if (!Number.isSafeInteger(user?.userId) || typeof user.username !== 'string') {
    throw new Error('서버에서 받은 사용자 정보를 읽을 수 없습니다.')
  }

  return user
}
