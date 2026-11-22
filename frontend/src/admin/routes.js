const pages = {
  '': 'home',
  '/problems': 'problems',
  '/problems/new': 'new-problem',
  '/problemsets': 'problemsets',
  '/problemsets/new': 'new-problemset',
  '/members': 'members',
  '/settings': 'settings',
}

export function resolveAdminRoute(pathname) {
  const path = pathname.replace(/\/+$/, '') || '/'
  if (path === '/admin') return { page: 'entry', groupId: null }

  const match = path.match(/^\/admin\/groups\/([1-9]\d*)(\/.*)?$/)
  if (!match || !Number.isSafeInteger(Number(match[1]))) {
    return { page: 'not-found', groupId: null }
  }

  return { page: pages[match[2] ?? ''] ?? 'not-found', groupId: Number(match[1]) }
}
