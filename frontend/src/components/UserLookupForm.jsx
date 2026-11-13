import { useState } from 'react'
import { lookupUser } from '../api/lookupUser'
import { Button } from '../design/ui'

function UserLookupForm({ initialName, onUserFound }) {
  const [name, setName] = useState(initialName)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(event) {
    event.preventDefault()
    const username = name.trim()
    if (!username || loading) return

    setError('')
    setLoading(true)
    try {
      const user = await lookupUser(username)
      onUserFound(user)
    } catch (lookupError) {
      setError(lookupError.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form className="panel login" onSubmit={handleSubmit}>
      <span className="eyebrow">WELCOME TO IF OJ</span>
      <h1>사용자 이름 입력</h1>
      <p className="subtitle">등록된 이름으로 내 그룹과 문제를 확인하세요.</p>
      <div className="field">
      <label htmlFor="username">이름</label>
      <input
        id="username"
        autoComplete="username"
        placeholder="사용자 이름을 입력하세요"
        maxLength={100}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? 'lookup-error' : undefined}
        value={name}
        onChange={(event) => {
          setName(event.target.value)
          setError('')
        }}
        disabled={loading}
        required
      />
      </div>
      <Button className="full-width" type="submit" disabled={loading || !name.trim()}>
        {loading ? '조회 중...' : '들어가기'}
      </Button>
      {error && <p className="form-error" id="lookup-error" role="alert">{error}</p>}
    </form>
  )
}

export default UserLookupForm
