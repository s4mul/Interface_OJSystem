import { useMemo, useState } from 'react'
import { AsyncState, Button, StatusBadge } from '../../design/ui.jsx'
import '../../components/SubmissionList.css'

const RESULTS = [
  ['AC', '맞았습니다'], ['WA', '틀렸습니다'], ['PENDING', '대기 중'],
  ['JUDGING', '채점 중'], ['CE', '컴파일 오류'], ['TLE', '시간 초과'],
  ['MLE', '메모리 초과'], ['RE', '런타임 오류'], ['OLE', '출력 초과'], ['JE', '채점 오류'],
]
const PAGE_SIZE = 10
const dateFormatter = new Intl.DateTimeFormat('ko-KR', {
  year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit', hour12: false,
})

function SubmissionTime({ value }) {
  const date = value ? new Date(value) : null
  if (!date || Number.isNaN(date.getTime())) return <span>—</span>
  return <time dateTime={date.toISOString()} title={date.toLocaleString('ko-KR')}>{dateFormatter.format(date)}</time>
}

/** Data is supplied by the parent; this component makes no API requests. */
export default function SubmissionList({
  username, title = '내 제출', subtitle, eyebrow = 'MY SUBMISSIONS', backLabel = '문제로 돌아가기', submissions = [], loading = false, error = null,
  onRefresh, onOpenSubmission, onBack, notice,
}) {
  const [draft, setDraft] = useState({ query: '', result: '', language: '' })
  const [filters, setFilters] = useState(draft)
  const [page, setPage] = useState(1)
  const filtered = useMemo(() => {
    const query = filters.query.trim().toLocaleLowerCase()
    return submissions.filter((item) =>
      (!filters.result || item.result === filters.result) &&
      (!filters.language || item.language === filters.language) &&
      (!query || `${item.problemId} ${item.title ?? ''}`.toLocaleLowerCase().includes(query)),
    ).sort((a, b) => Number(b.submissionId) - Number(a.submissionId))
  }, [submissions, filters])
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const currentPage = Math.min(page, pages)
  const start = (currentPage - 1) * PAGE_SIZE
  const visible = filtered.slice(start, start + PAGE_SIZE)
  const hasFilters = Boolean(filters.query || filters.result || filters.language)

  function search(event) {
    event.preventDefault()
    setFilters({ ...draft, query: draft.query.trim() })
    setPage(1)
  }

  function reset() {
    const empty = { query: '', result: '', language: '' }
    setDraft(empty)
    setFilters(empty)
    setPage(1)
  }

  return <section className="submission-history" aria-labelledby="history-heading">
    <div className="intro">
      <div>
        <span className="eyebrow">{eyebrow}</span>
        <h1 id="history-heading">{title}</h1>
        <p className="subtitle">{subtitle ?? `${username ? `${username} 님의` : '나의'} 제출 기록과 채점 결과를 확인하세요.`}</p>
      </div>
      {onRefresh && <div className="actions"><Button variant="secondary" onClick={onRefresh} disabled={loading}>{loading ? '불러오는 중…' : '새로고침'}</Button></div>}
    </div>
    <form className="history-filters" onSubmit={search} role="search" aria-label={`${username ?? '사용자'} 제출 검색`}>
      <div className="history-search">
        <label htmlFor="history-query">문제 검색</label>
        <input id="history-query" type="search" placeholder="문제 번호 또는 제목" value={draft.query} onChange={(event) => setDraft({ ...draft, query: event.target.value })} />
      </div>
      <div className="history-filter">
        <label htmlFor="history-result">채점 결과</label>
        <select id="history-result" value={draft.result} onChange={(event) => setDraft({ ...draft, result: event.target.value })}>
          <option value="">전체 결과</option>
          {RESULTS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
      </div>
      <div className="history-filter">
        <label htmlFor="history-language">언어</label>
        <select id="history-language" value={draft.language} onChange={(event) => setDraft({ ...draft, language: event.target.value })}>
          <option value="">전체 언어</option>
          {['C', 'C++', 'Java', 'Python'].map((language) => <option key={language} value={language}>{language}</option>)}
        </select>
      </div>
      <div className="history-filter-actions">
        <Button type="submit">검색</Button>
        <Button variant="secondary" onClick={reset}>초기화</Button>
      </div>
    </form>
    {notice && <p className="history-notice">{notice}</p>}
    <div className="panel" aria-busy={loading}>
      <div className="panel-head">
        <h2 className="panel-head-title">제출 목록</h2>
        <span className="panel-head-info" role="status" aria-live="polite">{!loading && !error ? `${hasFilters ? '검색 결과 ' : '전체 '}${filtered.length}건 · 최신순` : '최신순'}</span>
      </div>
      <AsyncState loading={loading} error={error} onRetry={onRefresh} />
      {!loading && !error && visible.length === 0 && <div className="empty history-empty">
        <p>{hasFilters ? '검색 조건에 맞는 제출이 없습니다.' : '아직 제출 기록이 없습니다.'}</p>
        {hasFilters ? <Button variant="secondary" onClick={reset}>검색 조건 초기화</Button> : onBack && <Button variant="secondary" onClick={onBack}>{backLabel}</Button>}
      </div>}
      {!loading && !error && visible.length > 0 && <>
        <div className="history-table-wrap">
          <table className="history-table" aria-label={`${username ?? '사용자'} 제출 목록`} role="table">
            <thead role="rowgroup"><tr role="row"><th scope="col" role="columnheader">제출 번호</th><th scope="col" role="columnheader">문제</th><th scope="col" role="columnheader">채점 결과</th><th scope="col" role="columnheader">언어</th><th scope="col" role="columnheader">제출 일시</th></tr></thead>
            <tbody role="rowgroup">{visible.map((item) => <tr key={item.submissionId} role="row">
              <td className="history-id" data-label="제출 번호" role="cell">{onOpenSubmission ? <button className="text-link admin-submission-link" type="button" onClick={() => onOpenSubmission(item)} aria-label={`제출 ${item.submissionId} 코드 보기`}>#{item.submissionId}</button> : `#${item.submissionId}`}</td>
              <td className="history-problem" data-label="문제" role="cell"><span className="history-problem-number">{item.problemId}.</span>{onOpenSubmission
                ? <button className="history-problem-title text-link" type="button" onClick={() => onOpenSubmission(item)} aria-label={`${username} 제출 ${item.submissionId} 코드 보기`}>{item.title || `문제 ${item.problemId}`}<span className="admin-code-link-label">코드 보기 →</span></button>
                : <span className="history-problem-title">{item.title || `문제 ${item.problemId}`}</span>}</td>
              <td className="history-result" data-label="채점 결과" role="cell"><StatusBadge status={item.result} /></td>
              <td className="history-language" data-label="언어" role="cell">{item.language}</td>
              <td className="history-time" data-label="제출 일시" role="cell"><SubmissionTime value={item.submittedAt} /></td>
            </tr>)}</tbody>
          </table>
        </div>
        <nav className="history-pagination" aria-label="제출 목록 페이지">
          <Button variant="secondary" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)} aria-label="이전 페이지">← 이전</Button>
          <span className="history-page-info" aria-live="polite">{currentPage} / {pages} 페이지 <span>· {start + 1}–{Math.min(start + PAGE_SIZE, filtered.length)}건</span></span>
          <Button variant="secondary" disabled={currentPage === pages} onClick={() => setPage(currentPage + 1)} aria-label="다음 페이지">다음 →</Button>
        </nav>
      </>}
    </div>
    {onBack && <div className="actions list-footer"><Button variant="secondary" onClick={onBack}>{backLabel}</Button></div>}
  </section>
}
