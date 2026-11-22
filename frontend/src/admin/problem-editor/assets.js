const imageTypes = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/gif': 'gif', 'image/webp': 'webp' }
const maxImageBytes = 5 * 1024 * 1024
const maxTotalImageBytes = 10 * 1024 * 1024

export function formatFileSize(bytes) {
  return bytes >= 1024 * 1024 ? `${(bytes / (1024 * 1024)).toFixed(1)} MB` : `${Math.max(1, Math.ceil(bytes / 1024))} KB`
}

export async function readUtf8File(file, extension, maxBytes) {
  if (!file || !file.name.toLowerCase().endsWith(extension)) throw new Error(`${extension} 파일을 선택해 주세요.`)
  if (file.size > maxBytes) throw new Error(`파일은 ${formatFileSize(maxBytes)} 이하로 선택해 주세요.`)
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(await file.arrayBuffer())
  } catch {
    throw new Error('UTF-8 형식으로 저장한 파일을 선택해 주세요.')
  }
}

function readBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result).split(',')[1])
    reader.onerror = () => reject(new Error('이미지 파일을 읽지 못했습니다. 다시 선택해 주세요.'))
    reader.readAsDataURL(file)
  })
}

export async function readImageFiles(fileList, existing = []) {
  const files = Array.from(fileList ?? [])
  if (!files.length) throw new Error('추가할 이미지 파일을 선택해 주세요.')
  if (existing.length + files.length > 20) throw new Error('이미지는 최대 20개까지 추가할 수 있습니다.')
  const total = existing.reduce((sum, item) => sum + (item.size ?? Math.ceil(item.dataBase64.length * 3 / 4)), 0) + files.reduce((sum, file) => sum + file.size, 0)
  if (total > maxTotalImageBytes) throw new Error('이미지 전체 크기는 10 MB 이하여야 합니다.')
  for (const file of files) {
    if (!imageTypes[file.type]) throw new Error('PNG, JPEG, GIF, WebP 이미지만 추가할 수 있습니다.')
    if (file.size > maxImageBytes) throw new Error(`“${file.name}” 이미지는 5 MB 이하로 선택해 주세요.`)
    if (!file.size) throw new Error('비어 있는 이미지는 추가할 수 없습니다.')
  }
  return Promise.all(files.map(async (file) => {
    const id = crypto.randomUUID()
    return { id, filename: file.name.slice(0, 255), mimeType: file.type, dataBase64: await readBase64(file), path: `images/${id}.${imageTypes[file.type]}`, size: file.size }
  }))
}

function normalizedImageName(href) {
  if (/^(?:[a-z][a-z\d+.-]*:|\/\/|\/|#)/i.test(href)) return null
  try { return decodeURIComponent(href).replace(/\\/g, '/').split('/').at(-1) }
  catch { return null }
}

function mapOutsideCode(markdown, transform) {
  let fence = null
  return markdown.split(/(?<=\n)/).map((line) => {
    if (fence) {
      const close = line.match(/^ {0,3}(`+|~+)[\t ]*(?:\r?\n)?$/)
      if (close && close[1][0] === fence.character && close[1].length >= fence.length) fence = null
      return line
    }
    const open = line.match(/^ {0,3}(`{3,}|~{3,})[^\r\n]*/)
    if (open) { fence = { character: open[1][0], length: open[1].length }; return line }
    if (/^(?: {4}|\t)/.test(line)) return line
    const delimiters = [...line.matchAll(/`+/g)]
    let output = ''
    let cursor = 0
    for (let index = 0; index < delimiters.length; index++) {
      const start = delimiters[index]
      const endIndex = delimiters.findIndex((item, candidate) => candidate > index && item[0].length === start[0].length)
      if (endIndex < 0) continue
      const end = delimiters[endIndex]
      output += transform(line.slice(cursor, start.index)) + line.slice(start.index, end.index + end[0].length)
      cursor = end.index + end[0].length
      index = endIndex
    }
    return output + transform(line.slice(cursor))
  }).join('')
}

const inlineImage = /(!\[[^\]\r\n]*\]\([\t ]*)(<[^>\r\n]+>|(?:[^()\s]+|\([^()\r\n]*\))+)((?:[\t ]+(?:"[^"\r\n]*"|'[^'\r\n]*'))?[\t ]*\))/g
const referenceDefinition = /^([\t ]{0,3}\[([^\]\r\n]+)\]:[\t ]*)(<[^>\r\n]+>|[^\s]+)([^\r\n]*)(\r?\n)?$/
const unbracket = (value) => value.startsWith('<') && value.endsWith('>') ? value.slice(1, -1) : value

// Keep imported local image references portable while giving each upload its own path.
export function resolveAttachedImagePaths(markdown, assets) {
  function resolve(href) {
    const source = unbracket(href)
    if (assets.some((asset) => asset.path === source)) return href
    const name = normalizedImageName(source)
    const matches = assets.filter((asset) => asset.filename === name)
    if (matches.length !== 1) return href
    return href.startsWith('<') ? `<${matches[0].path}>` : matches[0].path
  }
  return mapOutsideCode(markdown, (line) => {
    const inline = line.replace(inlineImage, (_match, start, href, end) => `${start}${resolve(href)}${end}`)
    return inline.replace(referenceDefinition, (_match, start, _label, href, title, newline = '') => `${start}${resolve(href)}${title}${newline}`)
  })
}

export function imageMarkdown(asset) {
  const label = asset.filename.replace(/\.[^.]+$/, '').replace(/[\[\]\\\r\n]/g, ' ').trim() || '이미지'
  return `![${label}](${asset.path})`
}

export function removeImageReferences(markdown, asset) {
  const labels = new Set()
  const labelKey = (value) => value.trim().replace(/\s+/g, ' ').toLocaleLowerCase()
  mapOutsideCode(markdown, (line) => {
    const definition = line.match(referenceDefinition)
    if (definition && unbracket(definition[3]) === asset.path) labels.add(labelKey(definition[2]))
    return line
  })
  return mapOutsideCode(markdown, (line) => {
    const definition = line.match(referenceDefinition)
    if (definition && unbracket(definition[3]) === asset.path) return definition[5] ?? ''
    return line.replace(inlineImage, (match, _start, href) => unbracket(href) === asset.path ? '' : match)
      .replace(/!\[([^\]\r\n]*)\]\[([^\]\r\n]*)\]/g, (match, alt, label) => labels.has(labelKey(label || alt)) ? '' : match)
  })
}
