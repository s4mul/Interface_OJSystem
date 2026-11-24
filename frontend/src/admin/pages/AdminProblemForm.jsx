import { useEffect, useRef, useState } from 'react'
import { AsyncState, Button } from '../../design/ui.jsx'
import MarkdownContent from '../../design/MarkdownContent.jsx'
import AdminPageHeader from '../components/AdminPageHeader.jsx'
import { navigateAdmin } from '../navigation.js'
import { AdminLink } from '../routing.jsx'
import { readAnalysisUser } from '../analysis/session.js'
import { createAdminProblem, getEditableProblem, updateAdminProblem } from '../api/problems.js'
import AuthorSelection from '../problem-editor/AuthorSelection.jsx'
import { parseProblemMarkdown } from '../problem-editor/importMarkdown.js'
import { formatFileSize, imageMarkdown, readImageFiles, readUtf8File, removeImageReferences, resolveAttachedImagePaths } from '../problem-editor/assets.js'
import '../problem-editor/editor.css'

const fieldNames = { description: '문제 설명', input: '입력', output: '출력' }
const emptyDraft = () => ({ title: '', description: '', input: '', output: '', timeLimit: '1000', memoryLimit: '256', outputLimit: '1024', examples: [{ input: '', output: '' }], isPublic: false })
const importPlaceholder = '# 문제 제목\n\n## 문제\n문제 설명을 Markdown으로 작성하세요.\n\n## 입력\n입력 형식\n\n## 출력\n출력 형식\n\n## 예제 입력 1\n```text\n2 3\n```\n\n## 예제 출력 1\n```text\n5\n```'

export default function AdminProblemForm({ groupId, problemId }) {
  const editing = Boolean(problemId)
  const listPath = `/admin/analysis/groups/${groupId}/problems`
  const [loadState, setLoadState] = useState(null)
  const [loadAttempt, setLoadAttempt] = useState(0)
  const [draft, setDraft] = useState(emptyDraft)
  const [user, setUser] = useState(readAnalysisUser)
  const [importText, setImportText] = useState('')
  const [importMessage, setImportMessage] = useState('')
  const [assets, setAssets] = useState([])
  const [csv, setCsv] = useState(null)
  const [preview, setPreview] = useState(false)
  const [activeField, setActiveField] = useState('description')
  const [reading, setReading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(null)
  const form = useRef(null)
  const fields = useRef({})
  const cursor = useRef({ name: 'description', start: 0, end: 0 })
  const busyRef = useRef(false)
  const active = useRef(true)
  const operation = useRef(0)
  const busy = reading || saving

  useEffect(() => {
    active.current = true
    return () => { active.current = false; operation.current++ }
  }, [])

  const loadKey = `${groupId}:${problemId}:${user?.userId}:${loadAttempt}`
  useEffect(() => {
    if (!editing || !user) return
    const controller = new AbortController()
    getEditableProblem(groupId, problemId, user.userId, controller.signal).then((problem) => {
      if (controller.signal.aborted) return
      setDraft({ title: problem.title, description: problem.description, input: problem.input, output: problem.output, examples: problem.examples.length ? problem.examples : [{ input: '', output: '' }], timeLimit: String(problem.limits.timeLimitMs), memoryLimit: String(problem.limits.memoryLimitMb), outputLimit: String(problem.limits.outputLimitKb), isPublic: problem.isPublic })
      setAssets([]); setCsv(null); setSaved(null); setLoadState({ key: loadKey })
    }, (failure) => { if (!controller.signal.aborted) setLoadState({ key: loadKey, error: failure.message }) })
    return () => controller.abort()
  }, [loadKey])

  function touch() { setSaved(null); setError('') }

  function update(event) {
    if (busyRef.current) return
    const { name, value, checked, type } = event.target
    touch()
    setDraft((current) => ({ ...current, [name]: type === 'checkbox' ? checked : value }))
  }

  async function readFile(loader, apply) {
    if (busyRef.current) return
    const token = ++operation.current
    busyRef.current = true
    setReading(true)
    setError('')
    try {
      const value = await loader()
      if (!active.current || token !== operation.current) return
      touch()
      apply(value)
    } catch (failure) {
      if (active.current && token === operation.current) setError(failure.message)
    } finally {
      if (active.current && token === operation.current) { busyRef.current = false; setReading(false) }
    }
  }

  function applyMarkdown() {
    if (busyRef.current) return
    try {
      const parsed = parseProblemMarkdown(importText)
      for (const name of Object.keys(fieldNames)) parsed[name] = resolveAttachedImagePaths(parsed[name], assets)
      touch()
      setDraft((current) => ({ ...current, ...parsed }))
      setPreview(false)
      setImportMessage('제목·문제 설명·입출력·예제를 항목에 적용했습니다. 내용을 확인한 뒤 등록해 주세요.')
    } catch (failure) { setError(failure.message) }
  }

  function addImages(files, target = { ...cursor.current }) {
    readFile(() => readImageFiles(files, assets), (added) => {
      const all = [...assets, ...added]
      const next = { ...draft }
      for (const name of Object.keys(fieldNames)) next[name] = resolveAttachedImagePaths(next[name], all)
      const missing = added.filter((asset) => !Object.keys(fieldNames).some((name) => next[name].includes(asset.path)))
      const insertion = missing.length ? `\n${missing.map(imageMarkdown).join('\n')}\n` : ''
      const name = target.name in fieldNames ? target.name : 'description'
      const start = next[name] === draft[name] ? Math.min(target.start, next[name].length) : next[name].length
      const end = next[name] === draft[name] ? Math.min(target.end, next[name].length) : next[name].length
      if (insertion) next[name] = next[name].slice(0, start) + insertion + next[name].slice(end)
      setAssets(all)
      setDraft(next)
      setPreview(false)
      requestAnimationFrame(() => {
        const field = fields.current[name]
        if (active.current && field) { field.focus(); field.setSelectionRange(start + insertion.length, start + insertion.length) }
      })
    })
  }

  function pasteImages(event, name) {
    const files = Array.from(event.clipboardData.items).filter((item) => item.kind === 'file' && item.type.startsWith('image/')).map((item) => item.getAsFile()).filter(Boolean)
    if (!files.length) return
    event.preventDefault()
    addImages(files, { name, start: event.currentTarget.selectionStart, end: event.currentTarget.selectionEnd })
  }

  function removeAsset(asset) {
    if (busyRef.current) return
    touch()
    setAssets((current) => current.filter((item) => item.id !== asset.id))
    setDraft((current) => Object.fromEntries(Object.entries(current).map(([name, value]) => [name, name in fieldNames ? removeImageReferences(value, asset) : value])))
    setImportText((current) => removeImageReferences(current, asset))
  }

  function updateExample(index, name, value) {
    if (busyRef.current) return
    touch()
    setDraft((current) => ({ ...current, examples: current.examples.map((example, itemIndex) => itemIndex === index ? { ...example, [name]: value } : example) }))
  }

  function resetDraft() {
    if (busyRef.current) return
    touch()
    setDraft(emptyDraft())
    setAssets([])
    setCsv(null)
    setImportText('')
    setImportMessage('')
    setPreview(false)
    cursor.current = { name: 'description', start: 0, end: 0 }
    setActiveField('description')
    requestAnimationFrame(() => document.getElementById('admin-problem-title')?.focus())
  }

  async function save(event) {
    event.preventDefault()
    if (busyRef.current || saved) return
    setError('')
    if (!user) { setPreview(false); setError('등록할 그룹 관리자 이름을 먼저 조회해 주세요.'); return }
    if (!form.current.checkValidity() || !draft.title.trim() || Object.keys(fieldNames).some((name) => !draft[name].trim())) {
      setPreview(false)
      setError('제목과 문제 설명·입출력·실행 제한을 확인해 주세요.')
      requestAnimationFrame(() => form.current?.reportValidity())
      return
    }
    if (!editing && !csv) { setPreview(false); setError('테스트케이스 CSV 파일을 선택해 주세요.'); return }
    busyRef.current = true
    setSaving(true)
    try {
      const payload = {
        userId: user.userId,
        title: draft.title.trim(),
        description: resolveAttachedImagePaths(draft.description, assets),
        input: resolveAttachedImagePaths(draft.input, assets),
        output: resolveAttachedImagePaths(draft.output, assets),
        examples: draft.examples.filter((example) => example.input !== '' || example.output !== ''),
        limits: { timeLimitMs: Number(draft.timeLimit), memoryLimitMb: Number(draft.memoryLimit), outputLimitKb: Number(draft.outputLimit) },
        isPublic: draft.isPublic, ...(csv ? { testcasesCsv: csv.text } : {}),
        assets: assets.map(({ id, filename, mimeType, dataBase64 }) => ({ id, filename, mimeType, dataBase64 })),
      }
      const result = editing ? await updateAdminProblem(groupId, problemId, payload) : await createAdminProblem(groupId, payload)
      if (active.current) setSaved(result)
    } catch (failure) {
      if (active.current) setError(failure.message)
    } finally {
      if (active.current) { busyRef.current = false; setSaving(false) }
    }
  }

  if (editing && (!loadState || loadState.key !== loadKey || loadState.error)) return <section>
    <AdminPageHeader title="문제 수정"><AdminLink className="btn secondary" to={listPath}>문제 목록</AdminLink></AdminPageHeader>
    <div className="panel"><AsyncState loading={loadState?.key !== loadKey} error={loadState?.key === loadKey ? loadState.error : undefined} onRetry={() => setLoadAttempt((value) => value + 1)} /></div>
  </section>

  return <section>
    <AdminPageHeader title={editing ? '문제 수정' : '문제 등록'} description="AI가 작성한 Markdown을 가져오고 이미지와 테스트케이스를 함께 등록하세요.">
      <AdminLink to={listPath} className="btn secondary">문제 목록</AdminLink>
    </AdminPageHeader>
    <form ref={form} className="panel admin-form" onSubmit={save} noValidate aria-busy={busy}>
      <fieldset className="problem-editor-fieldset" disabled={busy}>
        <div className="panel-head admin-editor-heading">
          <h2 className="panel-head-title">문제 작성</h2>
          <div className="admin-editor-tabs" role="group" aria-label="문제 작성 모드">
            <button type="button" className={!preview ? 'is-active' : ''} aria-pressed={!preview} onClick={() => setPreview(false)}>본문 입력</button>
            <button type="button" className={preview ? 'is-active' : ''} aria-pressed={preview} onClick={() => setPreview(true)}>미리보기</button>
          </div>
        </div>
        <div hidden={preview}>
          <div className="admin-form-section"><AuthorSelection user={user} disabled={busy} onUserChange={(matched) => { setUser(matched); touch() }} /></div>
          <div className="admin-form-section problem-editor-import">
            <div className="admin-section-heading"><h3>Markdown으로 가져오기</h3><p>문제 전체를 붙여넣거나 .md 파일을 불러온 뒤 항목에 적용하세요. 기존 제목·본문·예제가 가져온 내용으로 바뀝니다.</p></div>
            <div className="admin-field"><label htmlFor="problem-markdown-import">문제 전체 Markdown</label><textarea id="problem-markdown-import" value={importText} onChange={(event) => { setImportText(event.target.value); setImportMessage('') }} rows={8} placeholder={importPlaceholder} /></div>
            <div className="problem-editor-file-row"><div><label htmlFor="problem-markdown-file">Markdown 파일 불러오기</label><input id="problem-markdown-file" type="file" accept=".md,.markdown,text/markdown,text/plain" onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ''; if (file) readFile(() => readUtf8File(file, file.name.toLowerCase().endsWith('.markdown') ? '.markdown' : '.md', 1024 * 1024), setImportText) }} /></div><Button variant="secondary" disabled={!importText.trim()} onClick={applyMarkdown}>항목에 적용</Button></div>
            <p className="problem-editor-note">UTF-8 · 최대 1 MB. <code># 제목</code>, <code>## 문제</code>, <code>## 입력</code>, <code>## 출력</code>, <code>## 예제 입력 1</code>·<code>## 예제 출력 1</code>을 인식합니다.</p>
            {importMessage && <p className="problem-editor-import-message" role="status">{importMessage}</p>}
          </div>
          <div className="admin-form-section">
            <div className="admin-section-heading"><h3>기본 정보</h3><p>실행 제한과 문제 공개 여부를 설정하세요.</p></div>
            <div className="admin-field"><label htmlFor="admin-problem-title">문제 제목 <span className="admin-required">필수</span></label><input id="admin-problem-title" name="title" value={draft.title} onChange={update} required maxLength={255} placeholder="문제 제목을 입력하세요" /></div>
            <div className="problem-editor-limit-grid">
              {[['timeLimit', '시간 제한', 'ms'], ['memoryLimit', '메모리 제한', 'MB'], ['outputLimit', '출력 제한', 'KB']].map(([name, label, unit]) => <div className="admin-field" key={name}><label htmlFor={`problem-${name}`}>{label} <span className="admin-required">필수</span></label><div className="admin-unit-input"><input id={`problem-${name}`} name={name} type="number" min="1" step="1" required value={draft[name]} onChange={update} /><span>{unit}</span></div></div>)}
            </div>
            <label className="problem-editor-check"><input name="isPublic" type="checkbox" checked={draft.isPublic} onChange={update} /><span>등록 후 그룹에 공개하기<br /><span className="problem-editor-note">선택하지 않으면 비공개로 등록합니다.</span></span></label>
          </div>
          <div className="admin-form-section">
            <div className="admin-section-heading"><h3>문제 본문</h3><p>제목, 표, 목록, 코드 블록과 Markdown 이미지 문법을 사용할 수 있어요.</p></div>
            <div className="problem-editor-image-toolbar">
              <div className="problem-editor-file-row"><div><label htmlFor="problem-image-files">이미지 추가</label><input id="problem-image-files" type="file" accept="image/png,image/jpeg,image/gif,image/webp" multiple onChange={(event) => { const files = Array.from(event.target.files ?? []); event.target.value = ''; if (files.length) addImages(files) }} /></div><span className="problem-editor-note">삽입 위치: <strong>{fieldNames[activeField]}</strong></span></div>
              <p className="problem-editor-note">본문 입력 칸에 이미지를 붙여넣어도 됩니다. PNG·JPEG·GIF·WebP, 파일당 5 MB·전체 10 MB·최대 20개. 이미지 URL은 <code>![설명](https://…)</code>으로 입력하세요.</p>
              {assets.length > 0 && <ul className="problem-editor-image-list">{assets.map((asset) => <li className="problem-editor-image-item" key={asset.id}><img src={`data:${asset.mimeType};base64,${asset.dataBase64}`} alt="" /><div><strong>{asset.filename}</strong><span className="problem-editor-note">{formatFileSize(asset.size)}</span></div><Button variant="secondary" onClick={() => removeAsset(asset)} aria-label={`${asset.filename} 이미지와 본문 참조 제거`}>제거</Button></li>)}</ul>}
            </div>
            {Object.entries(fieldNames).map(([name, label]) => <div className="admin-field" key={name}><label htmlFor={`admin-problem-${name}`}>{label} <span className="admin-required">필수 · Markdown</span></label><textarea className="problem-editor-markdown" ref={(element) => { fields.current[name] = element }} id={`admin-problem-${name}`} name={name} value={draft[name]} required rows={name === 'description' ? 10 : 5} placeholder={`${label}을 Markdown으로 입력하세요`} onChange={update} onPaste={(event) => pasteImages(event, name)} onFocus={(event) => { setActiveField(name); cursor.current = { name, start: event.target.selectionStart, end: event.target.selectionEnd } }} onSelect={(event) => { cursor.current = { name, start: event.target.selectionStart, end: event.target.selectionEnd } }} /></div>)}
          </div>
          <div className="admin-form-section">
            <div className="admin-section-heading"><h3>예제 입출력</h3><p>문제에 공개할 예제입니다. 공백과 줄바꿈은 입력한 그대로 유지합니다.</p></div>
            {draft.examples.map((example, index) => <div className="problem-editor-example" key={index}><div className="problem-editor-example-heading"><h4>예제 {index + 1}</h4><Button variant="secondary" disabled={draft.examples.length === 1} onClick={() => { touch(); setDraft((current) => ({ ...current, examples: current.examples.filter((_, itemIndex) => itemIndex !== index) })) }}>예제 제거</Button></div><div className="admin-sample-grid">{['input', 'output'].map((name) => <div className="admin-field" key={name}><label htmlFor={`problem-example-${index}-${name}`}>예제 {name === 'input' ? '입력' : '출력'} {index + 1}</label><textarea id={`problem-example-${index}-${name}`} value={example[name]} rows={5} spellCheck={false} onChange={(event) => updateExample(index, name, event.target.value)} /></div>)}</div></div>)}
            <div><Button variant="secondary" disabled={draft.examples.length >= 100} onClick={() => { touch(); setDraft((current) => ({ ...current, examples: [...current.examples, { input: '', output: '' }] })) }}>예제 추가</Button></div>
          </div>
          <div className="admin-form-section">
            <div className="admin-section-heading"><h3>채점 테스트케이스</h3><p>{editing ? '새 CSV를 올리면 기존 테스트케이스를 교체합니다. 선택하지 않으면 기존 테스트케이스를 유지합니다.' : '공개 예제와 별도로, 채점에 사용할 입력·정답을 CSV 파일로 올려 주세요.'}</p></div>
            <div className="problem-editor-file-row"><div><label htmlFor="problem-testcases-csv">테스트케이스 CSV <span className="admin-required">{editing ? '교체 시 선택' : '필수'}</span></label><input id="problem-testcases-csv" type="file" accept=".csv,text/csv" onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ''; if (file) readFile(() => readUtf8File(file, '.csv', 10 * 1024 * 1024), (text) => { if (!text.length) { setError('비어 있는 CSV 파일입니다.'); return } setCsv({ name: file.name, size: file.size, text }) }) }} /></div>{csv && <Button variant="secondary" onClick={() => { touch(); setCsv(null) }}>CSV 제거</Button>}</div>
            {csv && <p className="problem-editor-file-name" role="status">선택한 파일: <strong>{csv.name}</strong> · {formatFileSize(csv.size)}</p>}
            <p className="problem-editor-note">UTF-8 · 최대 10 MB. 첫 줄은 <code>input,output</code>입니다. 쉼표·따옴표·여러 줄 값은 CSV 따옴표 규칙을 사용하세요. 서버가 각 행을 검사해 테스트케이스로 저장합니다.</p>
          </div>
        </div>
        {preview && <div className="admin-problem-preview" aria-label="문제 미리보기"><div className="admin-preview-title"><h2>{draft.title || '제목 없는 문제'}</h2><div className="admin-preview-limits"><span>시간 제한 <strong>{draft.timeLimit || '—'} ms</strong></span><span>메모리 제한 <strong>{draft.memoryLimit || '—'} MB</strong></span><span>출력 제한 <strong>{draft.outputLimit || '—'} KB</strong></span></div></div>{Object.entries(fieldNames).map(([name, label]) => <section className="admin-preview-section" key={name}><h3>{label}</h3>{draft[name] ? <MarkdownContent assets={assets}>{draft[name]}</MarkdownContent> : <p className="problem-editor-preview-empty">작성한 내용이 없습니다.</p>}</section>)}{draft.examples.filter((example) => example.input !== '' || example.output !== '').map((example, index) => <div className="admin-preview-section admin-sample-grid" key={index}>{['input', 'output'].map((name) => <section className="admin-preview-sample" key={name}><h3>예제 {name === 'input' ? '입력' : '출력'} {index + 1}</h3><pre>{example[name] || ' '}</pre></section>)}</div>)}</div>}
      </fieldset>
      <div className="admin-form-footer problem-editor-save-area">
        <p className="problem-editor-note">문제 본문·이미지와 CSV의 테스트케이스를 함께 등록합니다. {reading ? '파일을 읽고 있습니다.' : saving ? '서버에 등록하고 있습니다.' : '등록 전 미리보기와 공개 여부를 확인해 주세요.'}</p>
        {error && <p className="problem-editor-error" role="alert">{error}</p>}
        <div className="problem-editor-save-actions"><Button variant="secondary" disabled={busy} onClick={() => setPreview((value) => !value)}>{preview ? '본문 수정' : '미리보기'}</Button><Button type="submit" disabled={busy || Boolean(saved)}>{saving ? '저장 중…' : saved ? '저장 완료' : editing ? '수정 저장' : '문제 등록'}</Button></div>
      </div>
      {saved && <div className="problem-editor-result" role="status"><h3>{editing ? '문제를 수정했습니다.' : '문제를 등록했습니다.'}</h3><p>문제 ID {saved.problemId}{saved.testcaseCount != null && ` · 테스트케이스 ${saved.testcaseCount}개`} · {saved.isPublic ? '그룹 공개' : '비공개'}</p><div className="actions"><Button variant="secondary" onClick={() => editing ? navigateAdmin(`/admin/groups/${groupId}/problems/new`) : resetDraft()}>새 문제 작성</Button><AdminLink to={listPath} className="btn secondary">문제 목록</AdminLink>{saved.isPublic && <AdminLink to={`/admin/analysis/groups/${groupId}/problems/${saved.problemId}`} className="btn secondary">등록한 문제 보기</AdminLink>}</div></div>}
    </form>
  </section>
}
