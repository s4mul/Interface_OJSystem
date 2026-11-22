import { Button } from '../../design/ui.jsx'

export function AdminSearch({ value, onChange, label, placeholder }) {
  return <form className="admin-search" role="search" onSubmit={(event) => event.preventDefault()}>
    <label htmlFor="admin-list-search">{label}</label>
    <div className="admin-search-controls">
      <input id="admin-list-search" type="search" value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} autoComplete="off" />
      <Button variant="secondary" disabled={!value} onClick={() => onChange('')}>초기화</Button>
    </div>
  </form>
}

export function AdminEmpty({ title, children }) {
  return <div className="admin-empty" role="status"><h3>{title}</h3><p>{children}</p></div>
}

export function AdminSaveFooter({ children }) {
  return <div className="admin-form-footer">
    <p id="admin-save-note">저장 기능은 관리자 API 연결 후 사용할 수 있습니다.</p>
    <div className="admin-page-actions">{children}<Button disabled aria-describedby="admin-save-note">저장</Button></div>
  </div>
}
