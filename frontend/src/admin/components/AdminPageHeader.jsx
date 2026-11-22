import '../pages/pages.css'

export default function AdminPageHeader({ title, description, children }) {
  return <div className="admin-page-heading">
    <div><h1>{title}</h1><p className="admin-page-description">{description}</p></div>
    {children && <div className="admin-page-actions">{children}</div>}
  </div>
}
