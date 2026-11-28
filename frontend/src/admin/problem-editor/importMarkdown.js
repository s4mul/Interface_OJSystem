const MAX_MARKDOWN_BYTES = 1024 * 1024

function linesWithOffsets(value) {
  let offset = 0
  return value.split('\n').map((text, index, lines) => {
    const start = offset
    offset += text.length + (index < lines.length - 1 ? 1 : 0)
    return { text, start, end: offset }
  })
}

function trimBlankLines(value) {
  const lines = value.split('\n')
  let first = 0
  let last = lines.length
  while (first < last && /^[\t ]*$/.test(lines[first])) first++
  while (last > first && /^[\t ]*$/.test(lines[last - 1])) last--
  return lines.slice(first, last).join('\n')
}

function openingFence(line) {
  const match = line.match(/^ {0,3}(`{3,}|~{3,})([^\n]*)$/)
  if (!match || (match[1][0] === '`' && match[2].includes('`'))) return null
  return { character: match[1][0], length: match[1].length, info: match[2].trim() }
}

function closesFence(line, fence) {
  const match = line.match(/^ {0,3}(`+|~+)[\t ]*$/)
  return Boolean(match && match[1][0] === fence.character && match[1].length >= fence.length)
}

function unwrapDocument(source) {
  const candidate = trimBlankLines(source)
  const lines = linesWithOffsets(candidate)
  const fence = openingFence(lines[0]?.text ?? '')
  if (fence && /^(?:markdown|md)$/i.test(fence.info) && lines.length > 1 && closesFence(lines.at(-1).text, fence)) {
    return candidate.slice(lines[0].end, lines.at(-1).start)
  }
  return source
}

function heading(line) {
  const match = line.match(/^ {0,3}(#{1,6})[\t ]+(.+?)[\t ]*$/)
  return match ? { depth: match[1].length, text: match[2].replace(/[\t ]+#+[\t ]*$/, '') } : null
}

function sectionKind(text) {
  const label = text.normalize('NFKC').toLowerCase().replace(/[*_`]/g, '').replace(/[\t ]+/g, '').replace(/[:：]$/, '')
  if (['문제', '문제설명', '설명', 'problem', 'description', 'problemdescription'].includes(label)) return { field: 'description' }
  if (['입력', '입력형식', '입력설명', 'input', 'inputformat'].includes(label)) return { field: 'input' }
  if (['출력', '출력형식', '출력설명', 'output', 'outputformat'].includes(label)) return { field: 'output' }
  const sample = label.match(/^(?:예제|샘플)(입력|출력)#?(\d+)?$/) ?? label.match(/^(?:sample|example)(input|output)#?(\d+)?$/)
  if (sample) return { field: /^(?:입력|input)$/.test(sample[1]) ? 'sampleInput' : 'sampleOutput', number: sample[2] ? Number(sample[2]) : 1 }
  const alternateSample = label.match(/^(?:예제|샘플|sample|example)#?(\d+)(입력|출력|input|output)$/)
  if (alternateSample) return { field: /^(?:입력|input)$/.test(alternateSample[2]) ? 'sampleInput' : 'sampleOutput', number: Number(alternateSample[1]) }
  return null
}

function sampleText(raw) {
  const candidate = trimBlankLines(raw)
  const lines = linesWithOffsets(candidate)
  const fence = openingFence(lines[0]?.text ?? '')
  if (fence && lines.length > 1 && closesFence(lines.at(-1).text, fence)) {
    // Keep the final newline immediately before the closing fence, indentation,
    // and blank lines inside the example exactly as the author supplied them.
    return candidate.slice(lines[0].end, lines.at(-1).start)
  }
  // Without a code fence there is no reliable distinction between layout blank
  // lines and testcase blank lines, so do not trim the author's sample text.
  return raw
}

/** Import one AI-generated Markdown problem without flattening its Markdown. */
export function parseProblemMarkdown(source) {
  if (typeof source !== 'string' || !source.trim()) throw new Error('가져올 Markdown 내용을 입력해 주세요.')
  if (new TextEncoder().encode(source).byteLength > MAX_MARKDOWN_BYTES) throw new Error('Markdown 파일은 UTF-8 기준 1MB 이하로 선택해 주세요.')
  const markdown = unwrapDocument(source.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n'))
  if (!markdown.trim()) throw new Error('가져올 Markdown 내용을 입력해 주세요.')

  const fields = { description: [], input: [], output: [] }
  const samples = new Map()
  let title = ''
  let current = { field: 'description', depth: 0 }
  let buffer = ''
  let fence = null

  function flush() {
    if (current.field === 'sampleInput' || current.field === 'sampleOutput') {
      const example = samples.get(current.number) ?? { input: '', output: '' }
      const key = current.field === 'sampleInput' ? 'input' : 'output'
      example[key] += sampleText(buffer)
      samples.set(current.number, example)
    } else {
      const content = trimBlankLines(buffer)
      if (content) fields[current.field].push(content)
    }
    buffer = ''
  }

  for (const line of linesWithOffsets(markdown)) {
    const raw = markdown.slice(line.start, line.end)
    if (fence) {
      buffer += raw
      if (closesFence(line.text, fence)) fence = null
      continue
    }
    const nextFence = openingFence(line.text)
    if (nextFence) {
      fence = nextFence
      buffer += raw
      continue
    }

    const item = heading(line.text)
    if (item?.depth === 1 && !title) {
      flush()
      title = item.text.trim()
      current = { field: 'description', depth: 1 }
      continue
    }
    if (item) {
      const recognized = item.depth >= 2 ? sectionKind(item.text) : null
      // Subheadings of input/output describe that field (for example an input
      // constraint). Peer sections such as "## 제약 조건" belong to the prose.
      if (!recognized && ['input', 'output'].includes(current.field) && item.depth > current.depth) {
        buffer += raw
        continue
      }
      flush()
      current = { ...(recognized ?? { field: 'description' }), depth: item.depth }
      if (!recognized) buffer += raw
      continue
    }
    buffer += raw
  }
  flush()

  return {
    title,
    description: fields.description.join('\n\n'),
    input: fields.input.join('\n\n'),
    output: fields.output.join('\n\n'),
    examples: samples.size ? [...samples].sort(([first], [second]) => first - second).map(([, example]) => example) : [{ input: '', output: '' }],
  }
}
