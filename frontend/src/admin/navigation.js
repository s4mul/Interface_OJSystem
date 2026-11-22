import { useSyncExternalStore } from 'react'

const navigationEvent = 'oj:admin-navigation'

function subscribe(callback) {
  window.addEventListener('popstate', callback)
  window.addEventListener(navigationEvent, callback)
  return () => {
    window.removeEventListener('popstate', callback)
    window.removeEventListener(navigationEvent, callback)
  }
}

export function navigateAdmin(to) {
  window.history.pushState(null, '', to)
  window.dispatchEvent(new Event(navigationEvent))
}

export function useAdminPath() {
  return useSyncExternalStore(subscribe, () => window.location.pathname, () => '/admin')
}
