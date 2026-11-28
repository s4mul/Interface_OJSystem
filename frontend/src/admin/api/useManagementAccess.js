import { useEffect, useState } from 'react'
import { getGroups } from '../../api/getGroups.js'
import { getAdminGroup } from './management.js'

// Use the existing server-side group permission check. URL and remembered identity grant no role.
export function useManagementAccess(userId, groupId) {
  const key = `${userId}:${groupId ?? 'all'}`
  const [result, setResult] = useState(null)
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    if (!userId) return
    const controller = new AbortController()
    async function load() {
      try {
        const groups = groupId ? [{ groupId }] : await getGroups(userId, controller.signal)
        const checks = await Promise.all(groups.map(async (group) => {
          try { return await getAdminGroup(group.groupId, userId, controller.signal) }
          catch (error) { if (error.status === 403 || error.status === 404) return null; throw error }
        }))
        if (!controller.signal.aborted) setResult({ key, groups: checks.filter(Boolean) })
      } catch (error) {
        if (!controller.signal.aborted) setResult({ key, groups: [], error: error.message })
      }
    }
    load()
    return () => controller.abort()
  }, [key, attempt])
  const current = result?.key === key ? result : null
  return { isAdmin: Boolean(userId && current?.groups.length), adminGroupIds: userId ? current?.groups.map((group) => group.groupId) ?? [] : [], loading: Boolean(userId && !current), error: current?.error, reload: () => { setResult(null); setAttempt((v) => v + 1) } }
}
