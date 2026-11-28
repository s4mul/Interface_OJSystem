import { useCallback } from 'react'
import AdminSubmissionList from './AdminSubmissionList.jsx'
import { getMemberProblemSubmissions } from '../api/progress.js'
import { useAdminResource } from '../api/useAdminResource.js'
import './progress.css'

export default function MemberProblemSubmissions({ group, problem, memberId, userId, onBack, onOpenSubmission }) {
  const load = useCallback((groupId, actorId, signal) => getMemberProblemSubmissions(groupId, problem.problemId, memberId, actorId, signal), [problem.problemId, memberId])
  const { data, loading, error, reload } = useAdminResource(load, group.groupId, userId, `${problem.problemId}:${memberId}`)
  return <div className="admin-member-history">
    <div className="admin-member-history-context"><span>{group.groupName}</span><span aria-hidden="true">/</span><strong>{problem.problemId}. {problem.title}</strong></div>
    <AdminSubmissionList username={data?.member.username} title={data ? `${data.member.username} 님의 제출` : '회원 제출'} eyebrow="MEMBER SUBMISSIONS" subtitle={`${problem.title} 문제에 대한 이 회원의 제출 기록입니다.`} submissions={data?.submissions ?? []} loading={loading} error={error} onRefresh={reload} onOpenSubmission={onOpenSubmission} onBack={onBack} backLabel="풀이 현황으로 돌아가기" />
  </div>
}
