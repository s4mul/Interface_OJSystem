import { useCallback } from 'react'
import { AsyncState, Button, Icon, StatusBadge } from '../../design/ui.jsx'
import { getProblemProgress } from '../api/progress.js'
import { useAdminResource } from '../api/useAdminResource.js'
import './progress.css'

export function initialExpandedProblem() {
  const match = window.location.hash.match(/^#progress-([1-9]\d*)$/)
  return match && Number.isSafeInteger(Number(match[1])) ? Number(match[1]) : null
}

export function ProgressRefresh({ loading, error, onRefresh }) {
  return <div className="admin-progress-refresh"><div><p>그룹 풀이 현황 · 새로고침으로 갱신합니다.</p>{error && <p className="admin-progress-error" role="alert">{error}</p>}</div><Button variant="secondary" disabled={loading} onClick={onRefresh}>{loading ? '불러오는 중…' : '풀이 현황 새로고침'}</Button></div>
}

export function ProgressToggle({ problem, data, loading, expanded, onToggle }) {
  const known = data?.solvedCount !== undefined && data?.totalCount !== undefined
  const label = known ? `해결 ${data.solvedCount}명 / 전체 ${data.totalCount}명` : loading ? '풀이 현황 불러오는 중' : '풀이 현황 보기'
  return <button type="button" className={`admin-progress-toggle ${expanded ? 'is-open' : ''}`} disabled={loading} onClick={onToggle} aria-expanded={expanded} aria-controls={`progress-${problem.problemId}`} aria-label={`${problem.title}: ${label}, ${expanded ? '접기' : '펼치기'}`}>
    <span className="admin-progress-meter" aria-hidden="true"><span style={{ width: `${known && data.totalCount ? data.solvedCount / data.totalCount * 100 : 0}%` }} /></span>
    <span><strong>{known ? data.solvedCount : '—'}</strong><span className="admin-progress-divider">/</span>{known ? data.totalCount : '—'}<span className="admin-progress-unit">명</span></span>
    <span className="admin-progress-caret" aria-hidden="true"><Icon name="arrow" width="15" height="15" /></span>
  </button>
}

const categories = [
  { key: 'solved', label: '해결한 사람', description: '한 번 이상 정답 제출' },
  { key: 'failed', label: '실패한 사람', description: '제출했지만 아직 해결하지 못함' },
  { key: 'working', label: '아직 풀고 있는 사람', description: '제출 대기 · 채점 중 · 미제출' },
]

export function ProgressDetails({ groupId, userId, problem, refreshVersion = 0, onOpenMember }) {
  const load = useCallback((id, actorId, signal) => getProblemProgress(id, problem.problemId, actorId, signal), [problem.problemId])
  const { data, loading, error, reload } = useAdminResource(load, groupId, userId, `${problem.problemId}:${refreshVersion}`)
  return <section className="admin-progress-details" id={`progress-${problem.problemId}`} aria-label={`${problem.title} 회원별 풀이 현황`} aria-busy={loading}>
    <div className="admin-progress-detail-head"><div><span className="admin-progress-kicker">문제 {problem.problemId}</span><h3>{problem.title}<span>회원별 풀이 현황</span></h3></div><p>이름을 누르면 이 문제의 제출 기록을 볼 수 있어요.</p></div>
    <AsyncState loading={loading} error={error} onRetry={reload} />
    {data && <div className="admin-progress-columns">{categories.map((category) => {
      const people = data.people.filter((member) => member.bucket === category.key)
      return <section className={`admin-progress-category ${category.key}`} key={category.key} aria-labelledby={`progress-${problem.problemId}-${category.key}`}>
        <div className="admin-progress-category-head"><h4 id={`progress-${problem.problemId}-${category.key}`}>{category.label}</h4><span>{people.length}명</span></div>
        <p className="admin-progress-category-hint">{category.description}</p>
        {people.length ? <ul className="admin-progress-members">{people.map((member) => <li key={member.userId}><button type="button" className="admin-progress-member" onClick={() => onOpenMember(problem, member)} aria-label={`${member.username}: ${problem.title} 제출 ${member.submissionCount}건 보기`}>
          <span className="admin-progress-avatar" aria-hidden="true">{Array.from(member.username)[0] ?? '?'}</span><span className="admin-progress-member-body"><strong>{member.username}</strong><span>제출 {member.submissionCount}건</span></span><span className="admin-progress-member-result">{member.result ? <StatusBadge status={member.result} /> : <span className="admin-progress-unsubmitted">미제출</span>}</span><Icon name="arrow" width="14" height="14" />
        </button></li>)}</ul> : <p className="admin-progress-no-members">해당하는 회원이 없습니다.</p>}
      </section>
    })}</div>}
  </section>
}
