import { useCallback } from 'react'
import { AsyncState, Button, CopyButton, StatusBadge } from '../../design/ui.jsx'
import { getMemberSubmission } from '../api/progress.js'
import { useAdminResource } from '../api/useAdminResource.js'
import './progress.css'

const filenames = { Python: 'main.py', 'C++': 'main.cpp', C: 'main.c', Java: 'Main.java' }
const dateFormatter = new Intl.DateTimeFormat('ko-KR', { dateStyle: 'medium', timeStyle: 'short' })

export default function MemberSubmissionCode({ group, problem, memberId, submissionId, userId, onBack }) {
  const load = useCallback((groupId, actorId, signal) => getMemberSubmission(groupId, problem.problemId, memberId, submissionId, actorId, signal), [problem.problemId, memberId, submissionId])
  const { data, loading, error, reload } = useAdminResource(load, group.groupId, userId, `${problem.problemId}:${memberId}:${submissionId}`)
  const submission = data?.submission
  const lines = submission?.source.split(String.fromCharCode(10)) ?? []
  return <section className="admin-submission-code">
    <div className="intro"><div><span className="eyebrow">SUBMITTED CODE</span><h1>{data ? `${data.member.username} 님의 제출 코드` : '제출 코드'}</h1><p className="subtitle">{problem.problemId}. {problem.title} · 제출 #{submissionId}</p></div><div className="actions"><Button variant="secondary" onClick={reload} disabled={loading}>새로고침</Button><Button variant="secondary" onClick={onBack}>제출 목록으로 돌아가기</Button></div></div>
    <AsyncState loading={loading} error={error} onRetry={reload} />
    {submission && <>
      <dl className="panel admin-code-metadata">
        <div><dt>제출자</dt><dd>{data.member.username}</dd></div><div><dt>채점 결과</dt><dd><StatusBadge status={submission.result} /></dd></div><div><dt>언어</dt><dd>{submission.language}</dd></div><div><dt>제출 일시</dt><dd><time dateTime={submission.submittedAt}>{dateFormatter.format(new Date(submission.submittedAt))}</time></dd></div>
      </dl>
      <section className="panel admin-code-panel" aria-label={`${data.member.username} 제출 ${submissionId} 코드`}>
        <div className="panel-head"><h2 className="panel-head-title">{filenames[submission.language] ?? 'source'}</h2><div className="actions"><span className="panel-head-info">읽기 전용 · {lines.length}줄</span><CopyButton text={submission.source} label="제출 코드" /></div></div>
        <div className="admin-code-scroll" tabIndex={0} aria-label="제출 코드 스크롤 영역"><div className="admin-code-lines" aria-hidden="true">{lines.map((_, index) => <span key={index}>{index + 1}</span>)}</div><pre><code>{submission.source}</code></pre></div>
      </section>
    </>}
  </section>
}
