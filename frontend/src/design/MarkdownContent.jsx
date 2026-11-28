import Markdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import './markdown.css'

const imageTypes = new Set(['image/png', 'image/jpeg', 'image/gif', 'image/webp'])

function imageSource(source, assets) {
  if (!source) return null
  const exact = assets.find((asset) => asset.path === source)
  let local = exact
  if (!local && !/^(?:[a-z][a-z\d+.-]*:|\/)/i.test(source)) {
    let filename
    try { filename = decodeURIComponent(source.split('/').at(-1)) } catch { return null }
    const matches = assets.filter((asset) => asset.filename === filename)
    if (matches.length === 1) local = matches[0]
  }
  if (local && imageTypes.has(local.mimeType) && /^[A-Za-z\d+/]+={0,2}$/.test(local.dataBase64)) {
    return `data:${local.mimeType};base64,${local.dataBase64}`
  }
  if (/^https?:\/\//i.test(source) || /^\/(?!\/)/.test(source)) return source
  return null
}

/** Raw HTML stays disabled. Only explicitly attached raster data can use data URLs. */
export default function MarkdownContent({ children, assets = [] }) {
  return <div className="oj-markdown"><Markdown remarkPlugins={[remarkGfm]} skipHtml components={{
    img({ src, alt, title }) {
      const source = imageSource(src, assets)
      return source ? <img src={source} alt={alt || '문제 이미지'} title={title} loading="lazy" />
        : <span className="oj-markdown-missing-image">이미지 파일을 추가해 주세요: {alt || src || '이미지'}</span>
    },
    a({ href, children: label, title }) {
      return <a href={href} title={title} target="_blank" rel="noopener noreferrer">{label}</a>
    },
    table({ children: rows }) {
      return <div className="oj-markdown-table" tabIndex={0} role="region" aria-label="문제의 표"><table>{rows}</table></div>
    },
  }}>{typeof children === 'string' ? children : ''}</Markdown></div>
}
