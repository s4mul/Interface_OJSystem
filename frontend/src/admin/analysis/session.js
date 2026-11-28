const storageKey = 'if-oj:analysis-user'

export function readAnalysisUser() {
  try {
    const user = JSON.parse(window.sessionStorage.getItem(storageKey))
    return Number.isSafeInteger(user?.userId) && user.userId > 0 && typeof user.username === 'string' && user.username.trim() && user.username.length <= 100
      ? { userId: user.userId, username: user.username }
      : null
  } catch {
    return null
  }
}

// This remembers a name-lookup selection in this tab; it does not grant roles or authenticate a user.
export function rememberAnalysisUser(user) {
  try {
    if (user) window.sessionStorage.setItem(storageKey, JSON.stringify({ userId: user.userId, username: user.username }))
    else window.sessionStorage.removeItem(storageKey)
  } catch {
    // Navigation still works in memory when session storage is unavailable.
  }
}
