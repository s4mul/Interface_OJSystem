import { Icon } from '../../design/ui.jsx'
import AdminPageHeader from '../components/AdminPageHeader.jsx'
import { AdminLink } from '../routing.jsx'

export default function AdminHome({ groupId }) {
  const base = `/admin/groups/${groupId}`
  const menus = [
    ['problems', '문제 관리', '문제의 본문, 예제와 실행 제한을 관리합니다.', 'book'],
    ['problemsets', '문제집 관리', '문제집의 이름과 설명을 관리합니다.', 'book'],
    ['members', '멤버 관리', '그룹에 참여한 멤버를 확인합니다.', 'group'],
    ['settings', '그룹 설정', '그룹의 기본 정보를 관리합니다.', 'group'],
  ]
  return <section>
    <AdminPageHeader title="그룹 관리" description="관리할 항목을 선택하세요." />
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
