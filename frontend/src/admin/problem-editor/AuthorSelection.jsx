import { useEffect, useRef, useState } from 'react'
import { lookupUser } from '../../api/lookupUser.js'
import { Button } from '../../design/ui.jsx'
import { rememberAnalysisUser } from '../analysis/session.js'

export default function AuthorSelection({ user, onUserChange, disabled = false }) {
  const [name, setName] = useState(user?.username ?? '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const active = useRef(true)
  const request = useRef(0)

  useEffect(() => {
    active.current = true
    return () => { active.current = false; request.current++ }
  }, [])

  async function findUser() {
    if (!name.trim() || loading || disabled) return
    const token = ++request.current
    setLoading(true)
    setError('')
    try {
      const matched = await lookupUser(name.trim())
      if (!active.current || token !== request.current) return
      setName(matched.username)
      rememberAnalysisUser(matched)
      onUserChange(matched)
    } catch (failure) {
      if (active.current && token === request.current) setError(failure.message)
    } finally {
      if (active.current && token === request.current) setLoading(false)
    }
  }

  return <div className="problem-editor-author">
    <div className="admin-field">
      <label htmlFor="problem-author-name">등록 사용자</label>
      <div className="problem-editor-inline-control">
        <input id="problem-author-name" value={name} maxLength={100} autoComplete="username" placeholder="그룹 관리자 이름" disabled={disabled || loading} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); findUser() } }} onChange={(event) => {
          setName(event.target.value)
          setError('')
          rememberAnalysisUser(null)
          onUserChange(null)
        }} aria-describedby="problem-author-note" />
        <Button variant="secondary" disabled={disabled || loading || !name.trim()} onClick={findUser}>{loading ? '조회 중…' : '사용자 조회'}</Button>
      </div>
    </div>
    <p className="admin-field-hint" id="problem-author-note">{user ? `${user.username} 님으로 등록합니다. 해당 그룹의 관리자 권한이 필요합니다.` : '이름을 조회한 뒤 문제를 등록하거나 관리 목록을 확인할 수 있어요.'}</p>
    {error && <p className="problem-editor-error" role="alert">{error}</p>}
  </div>
}
