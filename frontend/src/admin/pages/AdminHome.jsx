import { Icon } from '../../design/ui.jsx'
import AdminPageHeader from '../components/AdminPageHeader.jsx'
import { AdminLink } from '../routing.jsx'

export default function AdminHome({ groupId }) {
  const base = `/admin/groups/${groupId}`
  const menus = [
    ['members', '소속 회원·권한 관리', '그룹에 참여한 회원을 확인하고 관리자 권한을 관리합니다.', 'group'],
    ['settings', '그룹 정보 수정', '현재 선택한 그룹의 이름을 수정합니다.', 'group'],
  ]
  return <section>
    <AdminPageHeader title="그룹 관리" description="현재 그룹의 정보와 소속 회원을 관리하세요. 문제와 문제집은 각 목록에서 추가·수정할 수 있습니다."><AdminLink className="btn secondary" to={`/admin/analysis/groups/${groupId}/problems`}>문제 목록</AdminLink><AdminLink className="btn secondary" to={`/admin/analysis/groups/${groupId}/problemsets`}>문제집 목록</AdminLink></AdminPageHeader>
    <section className="panel admin-menu" aria-label="그룹 관리 메뉴">
      <div className="panel-head"><h2 className="panel-head-title">관리 메뉴</h2><span className="panel-head-info">그룹 ID {groupId}</span></div>
      {menus.map(([path, title, detail, icon]) => <AdminLink key={path} to={`${base}/${path}`} className="admin-menu-row">
        <span className="admin-menu-icon"><Icon name={icon} /></span>
        <span className="admin-menu-body"><span className="admin-menu-title">{title}</span><span className="admin-menu-description">{detail}</span></span>
        <span className="admin-menu-action">관리하기</span>
      </AdminLink>)}
    </section>
  </section>
}
