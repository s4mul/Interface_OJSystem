import test from 'node:test'
import assert from 'node:assert/strict'
import { parseProblemMarkdown } from './importMarkdown.js'

test('imports complete problem and keeps Markdown, tables, images and unknown sections', () => {
  const problem = parseProblemMarkdown(`# A+B

## 문제 설명
**두 정수**의 합을 구합니다.

![도식](images/diagram.png)

| 값 | 의미 |
| --- | --- |
| A | 첫 정수 |

## 입력
한 줄에 두 정수가 주어집니다.

## 출력
합을 출력합니다.

## 제약 조건
- 0 ≤ A, B ≤ 100

## 예제 입력 1
\`\`\`text
2 3
\`\`\`

## 예제 출력 1
\`\`\`
5
\`\`\`
`)
  assert.equal(problem.title, 'A+B')
  assert.match(problem.description, /\*\*두 정수\*\*/)
  assert.match(problem.description, /!\[도식\]\(images\/diagram\.png\)/)
  assert.match(problem.description, /\| 값 \| 의미 \|/)
  assert.match(problem.description, /## 제약 조건\n- 0 ≤ A, B ≤ 100/)
  assert.doesNotMatch(problem.description, /## 문제 설명/)
  assert.equal(problem.input, '한 줄에 두 정수가 주어집니다.')
  assert.equal(problem.output, '합을 출력합니다.')
  assert.deepEqual(problem.examples, [{ input: '2 3\n', output: '5\n' }])
})

test('matches English sections and orders multiple examples by their explicit numbers', () => {
  const problem = parseProblemMarkdown('# Sum\n## Description\nSum values.\n## Sample Output 2\n~~~\n9\n~~~\n## Sample Input 2\n~~~text\n4 5\n~~~\n## Example Input 1\n```\n1 2\n```\n## Example Output 1\n```\n3\n```\n## Input Format\nTwo integers.\n## Output\nTheir sum.\n')
  assert.equal(problem.input, 'Two integers.')
  assert.equal(problem.output, 'Their sum.')
  assert.deepEqual(problem.examples, [{ input: '1 2\n', output: '3\n' }, { input: '4 5\n', output: '9\n' }])
})

test('does not treat headings inside backtick or tilde fences as section boundaries', () => {
  const problem = parseProblemMarkdown('# 문서\n## 문제\n```python\n## 입력\nprint("## 출력")\n```\n~~~text\n## 예제 입력 1\n~~~\n## 입력\n실제 입력 조건\n## 출력\n실제 출력 조건')
  assert.equal(problem.description, '```python\n## 입력\nprint("## 출력")\n```\n~~~text\n## 예제 입력 1\n~~~')
  assert.equal(problem.input, '실제 입력 조건')
  assert.deepEqual(problem.examples, [{ input: '', output: '' }])
})

test('unwraps AI Markdown document wrapper and normalizes BOM and CRLF', () => {
  const problem = parseProblemMarkdown('\uFEFF```markdown\r\n# 합\r\n\r\n## 문제\r\n본문\r\n## 입력\r\n입력 조건\r\n## 출력\r\n출력 조건\r\n## 예제 입력 1\r\n~~~\r\n  1,2  \r\n\r\n~~~\r\n## 예제 출력 1\r\n~~~\r\n3\r\n~~~\r\n```\r\n')
  assert.equal(problem.title, '합')
  assert.equal(problem.description, '본문')
  assert.deepEqual(problem.examples, [{ input: '  1,2  \n\n', output: '3\n' }])
})

test('preserves meaningful sample whitespace, blank input, and missing paired output', () => {
  const problem = parseProblemMarkdown('# 공백\n## 예제 입력 1\n```\n```\n## 예제 출력 1\n```\n  answer  \n\n```\n## 예제 입력 2\n~~~\n\n~~~')
  assert.deepEqual(problem.examples, [{ input: '', output: '  answer  \n\n' }, { input: '\n', output: '' }])
})

test('keeps unfenced samples unchanged because their layout whitespace is ambiguous', () => {
  const problem = parseProblemMarkdown('# 공백\n## 예제 입력\n  1 2  \n\n## 예제 출력\n3\n')
  assert.deepEqual(problem.examples, [{ input: '  1 2  \n\n', output: '3\n' }])
})

test('falls back to complete Markdown description without known section headers', () => {
  const problem = parseProblemMarkdown('# 그림 문제\n\n소개 **강조**\n\n## 접근 방법\n- A\n- B\n\n### 참고\n[문서](https://example.com)')
  assert.equal(problem.title, '그림 문제')
  assert.equal(problem.description, '소개 **강조**\n\n## 접근 방법\n- A\n- B\n\n### 참고\n[문서](https://example.com)')
  assert.equal(problem.input, '')
  assert.equal(problem.output, '')
  assert.deepEqual(problem.examples, [{ input: '', output: '' }])
})

test('imports Markdown without a title, preserving indented code and image references', () => {
  const source = '설명\n\n    const value = 1\n\n![그림](figure.png)'
  const problem = parseProblemMarkdown(source)
  assert.equal(problem.title, '')
  assert.equal(problem.description, source)
})

test('keeps unknown deeper input/output subsections in their original field', () => {
  const problem = parseProblemMarkdown('# 구조\n## 문제\n본문\n## 입력\n입력 형식\n### 범위\n- 0부터 10까지\n#### 세부 조건\n음수는 없다.\n## 출력\n출력 형식\n### 줄바꿈\n마지막 줄도 줄바꿈한다.\n## 추가 제약 조건\n전체 데이터는 작다.')
  assert.equal(problem.input, '입력 형식\n### 범위\n- 0부터 10까지\n#### 세부 조건\n음수는 없다.')
  assert.equal(problem.output, '출력 형식\n### 줄바꿈\n마지막 줄도 줄바꿈한다.')
  assert.equal(problem.description, '본문\n\n## 추가 제약 조건\n전체 데이터는 작다.')
})

test('supports decorated section labels and example number before direction', () => {
  const problem = parseProblemMarkdown('# C#\n## **문제 설명**\n본문\n## 예제 2 입력\n```\n2\n```\n## 예제 2 출력\n```\n4\n```')
  assert.equal(problem.title, 'C#')
  assert.equal(problem.description, '본문')
  assert.deepEqual(problem.examples, [{ input: '2\n', output: '4\n' }])
})

test('only removes matching sample fences and accepts longer closing fences', () => {
  const problem = parseProblemMarkdown('# Fence\n## 예제 입력 1\n````text\n```\n## not a heading\n`````\n## 예제 출력 1\n~~~\nx\n~~~')
  assert.deepEqual(problem.examples, [{ input: '```\n## not a heading\n', output: 'x\n' }])
})

test('rejects empty input and checks UTF-8 byte length rather than string length', () => {
  assert.throws(() => parseProblemMarkdown(' \n\t'), /내용을 입력/)
  assert.throws(() => parseProblemMarkdown('```markdown\n\n```'), /내용을 입력/)
  assert.throws(() => parseProblemMarkdown('가'.repeat(350000)), /1MB/)
  assert.equal(parseProblemMarkdown('a'.repeat(1024 * 1024)).description.length, 1024 * 1024)
})
