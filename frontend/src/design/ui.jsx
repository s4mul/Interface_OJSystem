import { useEffect, useRef, useState } from 'react'

export function Button({ variant = 'primary', className = '', type = 'button', ...props }) {
  return <button type={type} className={`btn ${variant === 'secondary' ? 'secondary' : ''} ${className}`} {...props} />
}

export function Icon({ name = 'arrow', ...props }) {
  const paths = {
    group: <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M22 21v-2a4 4 0 0 0-3-3.87" /><circle cx="9" cy="7" r="4" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></>,
    book: <><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20M6.5 3H20v19H6.5A2.5 2.5 0 0 1 4 19.5v-14A2.5 2.5 0 0 1 6.5 3Z" /><path d="M8 7h8M8 11h6" /></>,
    arrow: <path d="m9 5 7 7-7 7" />,
    copy: <><rect x="8" y="8" width="12" height="13" rx="2" /><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3" /></>,
  }
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>{paths[name] ?? paths.arrow}</svg>
}

const resultLabels = { PENDING: '대기 중', JUDGING: '채점 중', AC: '맞았습니다', WA: '틀렸습니다', CE: '컴파일 오류', TLE: '시간 초과', MLE: '메모리 초과', RE: '런타임 오류', OLE: '출력 초과', JE: '채점 오류' }

export function StatusBadge({ solved, status }) {
  const tone = status === 'AC' || solved === true ? 'ac' : ['PENDING', 'JUDGING'].includes(status) ? 'pending' : status && resultLabels[status] ? 'wa' : 'none'
  // isSolved=false does not establish whether a submission exists.
  const label = status ? (resultLabels[status] ?? status) : solved ? '맞았습니다' : '미해결'
  return <span className={`status ${tone}`}>{label}</span>
}

export function AsyncState({ loading, error, onRetry, empty, emptyMessage = '표시할 항목이 없습니다.' }) {
  if (loading) return <div className="empty" role="status"><span className="spinner" />불러오는 중입니다.</div>
  if (error) return <div className="empty error-state"><p role="alert">{error}</p>{onRetry && <Button variant="secondary" onClick={onRetry}>다시 시도</Button>}</div>
  if (empty) return <div className="empty">{emptyMessage}</div>
  return null
}

export function CopyButton({ text, label = '복사' }) {
  const [message, setMessage] = useState('')
  const timer = useRef(null)
  useEffect(() => () => clearTimeout(timer.current), [])
  async function copy() {
    try { await navigator.clipboard.writeText(text); setMessage('복사됨') }
    catch { setMessage('복사 실패') }
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setMessage(''), 2200)
  }
  return <button type="button" className="copy-button" onClick={copy} aria-label={`${label} 복사`}><Icon name="copy" /><span aria-live="polite">{message || '복사'}</span></button>
}
