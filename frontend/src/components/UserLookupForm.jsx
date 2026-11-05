import { useState } from 'react'
import { lookupUser } from '../api/lookupUser'

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
    <form onSubmit={handleSubmit}>
      <h2>사용자 이름 입력</h2>
      <label htmlFor="username">이름 </label>
      <input
        id="username"
        value={name}
        onChange={(event) => {
          setName(event.target.value)
          setError('')
        }}
        disabled={loading}
        required
      />
      {' '}
      <button type="submit" disabled={loading || !name.trim()}>
        {loading ? '조회 중...' : '들어가기'}
      </button>
      {error && <p role="alert">{error}</p>}
    </form>
  )
}

export default UserLookupForm
