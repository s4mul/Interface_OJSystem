import { useEffect, useState } from 'react'
export function useAdminResource(load, groupId, userId, resourceKey = '') {
  const [result, setResult] = useState(null)
  const [attempt, setAttempt] = useState(0)
  const key = [groupId, userId, resourceKey, attempt].join(':')
  useEffect(() => {
    if (!userId) return
    const controller = new AbortController()
    load(groupId, userId, controller.signal).then(
      (data) => { if (!controller.signal.aborted) setResult({ key, data }) },
      (error) => { if (!controller.signal.aborted) setResult({ key, error: error.message }) },
    )
    return () => controller.abort()
  }, [load, groupId, userId, key])
  const current = result?.key === key ? result : null
  return { data: current?.data, error: current?.error, loading: Boolean(userId) && !current, reload: () => setAttempt((v) => v + 1) }
}
