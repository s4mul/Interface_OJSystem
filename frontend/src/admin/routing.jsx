import { navigateAdmin } from './navigation.js'

export function AdminLink({ to, onClick, children, ...props }) {
  function follow(event) {
    onClick?.(event)
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
    if (props.download !== undefined || (props.target && props.target !== '_self')) return
    const destination = new URL(to, window.location.href)
    if (destination.origin !== window.location.origin || !/^\/admin(?:\/|$)/.test(destination.pathname)) return
    event.preventDefault()
    if (destination.href !== window.location.href) navigateAdmin(`${destination.pathname}${destination.search}${destination.hash}`)
  }

  return <a href={to} onClick={follow} {...props}>{children}</a>
}
