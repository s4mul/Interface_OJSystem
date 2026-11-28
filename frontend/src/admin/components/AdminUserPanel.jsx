import AuthorSelection from '../problem-editor/AuthorSelection.jsx'
import '../problem-editor/editor.css'
export default function AdminUserPanel({ user, onUserChange }) {
  return <div className="panel problem-editor-list-author"><AuthorSelection user={user} onUserChange={onUserChange} /></div>
}
