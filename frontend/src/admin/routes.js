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
  if (path === '/admin/groups/new') return { page: 'new-group', groupId: null }
  if (path === '/admin') return { page: 'entry', groupId: null }

  const match = path.match(/^\/admin\/groups\/([1-9]\d*)(\/.*)?$/)
  if (!match || !Number.isSafeInteger(Number(match[1]))) {
    return { page: 'not-found', groupId: null }
  }

  const editor = (match[2] ?? '').match(/^\/(problems|problemsets)\/([1-9]\d*)\/edit$/)
  if (editor && Number.isSafeInteger(Number(editor[2]))) return { page: editor[1] === 'problems' ? 'edit-problem' : 'edit-problemset', groupId: Number(match[1]), [editor[1] === 'problems' ? 'problemId' : 'setId']: Number(editor[2]) }

  return { page: pages[match[2] ?? ''] ?? 'not-found', groupId: Number(match[1]) }
}
