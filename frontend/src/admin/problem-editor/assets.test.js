import test from 'node:test'
import assert from 'node:assert/strict'
import { imageMarkdown, removeImageReferences, resolveAttachedImagePaths, resolveAdminImagePaths } from './assets.js'

const asset = { id: 'abc-123', path: 'images/abc-123.png', filename: 'diagram.png' }

test('resolves inline attached images and preserves optional title', () => {
  assert.equal(resolveAttachedImagePaths('![도식](images/diagram.png "그림")', [asset]), '![도식](images/abc-123.png "그림")')
  assert.equal(resolveAttachedImagePaths('![도식](images/abc-123.png)', [asset]), '![도식](images/abc-123.png)')
})

test('resolves reference definitions, angle paths, and encoded spaces', () => {
  const spaced = { ...asset, filename: 'my diagram.png' }
  assert.equal(resolveAttachedImagePaths('![x][fig]\n[fig]: images/diagram.png "원본"\n', [asset]), '![x][fig]\n[fig]: images/abc-123.png "원본"\n')
  assert.equal(resolveAttachedImagePaths('![x](<images/my diagram.png>)', [spaced]), '![x](<images/abc-123.png>)')
  assert.equal(resolveAttachedImagePaths('[fig]: <images/my diagram.png>\n', [spaced]), '[fig]: <images/abc-123.png>\n')
  assert.equal(resolveAttachedImagePaths('![x](images/my%20diagram.png)', [spaced]), '![x](images/abc-123.png)')
})

test('does not rewrite remote URLs or ambiguous filenames', () => {
  const text = '![x](https://example.com/images/diagram.png)\n[remote]: /images/diagram.png'
  assert.equal(resolveAttachedImagePaths(text, [asset]), text)
  const duplicate = { ...asset, id: 'second', path: 'images/second.png' }
  assert.equal(resolveAttachedImagePaths('![x](images/diagram.png)', [asset, duplicate]), '![x](images/diagram.png)')
})

test('keeps fenced, indented and inline code examples unchanged', () => {
  const source = '```md\n![x](images/diagram.png)\n[fig]: images/diagram.png\n```\n\n    ![x](images/diagram.png)\n`![x](images/diagram.png)`\n![actual](images/diagram.png)'
  const result = resolveAttachedImagePaths(source, [asset])
  assert.equal(result, source.replace('![actual](images/diagram.png)', '![actual](images/abc-123.png)'))
})

test('removes generated references while keeping other images and code', () => {
  assert.equal(removeImageReferences(imageMarkdown(asset), asset), '')
  const source = '![inline](images/abc-123.png)\n![ref][fig]\n[fig]: <images/abc-123.png>\n![other](images/other.png)\n`![code](images/abc-123.png)`'
  assert.equal(removeImageReferences(source, asset), '\n\n\n![other](images/other.png)\n`![code](images/abc-123.png)`')
})


test('admin preview authorizes only this problem image URLs and preserves code and draft Markdown', () => {
  const stored = '/api/problems/70/assets/diagram-1.png'
  const authorized = '/api/admin/groups/2/problems/70/assets/diagram-1.png?userId=3'
  const markdown = `![inline](${stored})\n![ref][fig]\n[fig]: <${stored}> "title"\n\n\`![code](${stored})\`\n\`\`\`md\n![code](${stored})\n\`\`\`\n![other](/api/problems/71/assets/diagram-1.png)`
  assert.equal(resolveAdminImagePaths(markdown, 2, 70, 3), markdown
    .replace(`![inline](${stored})`, `![inline](${authorized})`)
    .replace(`[fig]: <${stored}>`, `[fig]: <${authorized}>`))
  assert.equal(resolveAdminImagePaths(markdown, 2, undefined, 3), markdown)
  assert.equal(resolveAdminImagePaths(markdown, 2, 70, undefined), markdown)
})
