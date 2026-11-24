const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const { createProblemAuthoringService, parseTestcasesCsv, validateDraft } = require('./admin/problemAuthoring');

const temporaryBase = path.resolve(__dirname, '../../.authoring-test-work');
const png = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aV1cAAAAASUVORK5CYII=';

function draft(overrides = {}) {
    return {
        userId: 3, title: 'CSV 문제', description: '문제 **설명**', input: '입력 설명', output: '출력 설명',
        examples: [{ input: '2 3\n', output: '5\n' }],
        limits: { timeLimitMs: 1000, memoryLimitMb: 256, outputLimitKb: 1024 },
        isPublic: true, testcasesCsv: 'input,output\n"2 3\n","5\n"\n"","0"', assets: [], ...overrides,
    };
}

function repository({ admin = true, failCommit = false, failReady = false } = {}) {
    const state = { rows: [], transactions: 0, rollbacks: 0 };
    return {
        state,
        async withTransaction(work) {
            state.transactions += 1;
            const pending = [];
            try {
                const result = await work({
                    async isGroupAdmin() { return admin; },
                    async insertProblem(data) { pending.push({ ...data, problemId: 70, status: 'DRAFT', isPublic: false }); return 70; },
                    async markReady(problemId, isPublic) {
                        if (failReady) throw new Error('Injected READY update failure');
                        Object.assign(pending.find((row) => row.problemId === problemId), { status: 'READY', isPublic });
                    },
                });
                if (failCommit) throw new Error('Injected commit failure');
                state.rows.push(...pending);
                return result;
            } catch (error) { state.rollbacks += 1; throw error; }
        },
        async isGroupAdmin() { return admin; },
        async listProblems(groupId) { return state.rows.filter((row) => row.groupId === groupId); },
        async getProblemById(problemId) { return state.rows.find((row) => row.problemId === problemId) ?? null; },
    };
}

async function fixture(t, options = {}) {
    await fs.mkdir(temporaryBase, { recursive: true });
    const root = await fs.mkdtemp(path.join(temporaryBase, 'case-'));
    t.after(async () => {
        const target = path.resolve(root);
        if (!target.startsWith(`${temporaryBase}${path.sep}`)) throw new Error('Unexpected cleanup path');
        await fs.rm(target, { recursive: true, force: true });
    });
    const repo = repository(options);
    return { root, repo, service: createProblemAuthoringService({ repository: repo, problemsRoot: root, fsImpl: options.fsImpl ?? fs }) };
}

test('CSV preserves quoted commas, escaped quotes, CRLF, empty cells, and absent final newline', () => {
    assert.deepEqual(parseTestcasesCsv('\ufeffinput,output\r\n"a,b\r\nc","say ""yes"""\r\n,""'), [
        { input: 'a,b\r\nc', output: 'say "yes"' }, { input: '', output: '' },
    ]);
});

test('CSV rejects malformed quotes, extra/missing columns, duplicate/bad header, header-only and too many cases', () => {
    for (const value of ['input,output\n"unfinished,value', 'input,output\na,b,c', 'input,output\na', 'input,input\na,b', 'x,output\na,b', 'input,output\n']) {
        assert.throws(() => parseTestcasesCsv(value), (error) => error.status === 400);
    }
    assert.throws(() => parseTestcasesCsv(`input,output\n${'a,b\n'.repeat(10001)}`), /10000/);
});

test('creation stores each testcase using exact judge filenames and publishes READY after all files exist', async (t) => {
    const { root, repo, service } = await fixture(t);
    const result = await service.create('2', draft());
    assert.deepEqual(result, { problemId: 70, groupId: 2, title: 'CSV 문제', status: 'READY', isPublic: true, testcaseCount: 2 });
    assert.deepEqual(await fs.readdir(path.join(root, '70/input')), ['1', '2']);
    assert.equal(await fs.readFile(path.join(root, '70/input/1'), 'utf8'), '2 3\n');
    assert.equal(await fs.readFile(path.join(root, '70/output/1'), 'utf8'), '5\n');
    assert.equal(await fs.readFile(path.join(root, '70/input/2'), 'utf8'), '');
    assert.equal(await fs.readFile(path.join(root, '70/output/2'), 'utf8'), '0');
    assert.equal(repo.state.rows[0].status, 'READY');
    assert.deepEqual(await fs.readdir(root), ['70']);
});

test('malformed CSV and admin denial never leave rows or problem files', async (t) => {
    const one = await fixture(t);
    await assert.rejects(one.service.create(2, draft({ testcasesCsv: 'input,output\na,b\n"bad' })), (error) => error.status === 400);
    assert.equal(one.repo.state.rows.length, 0);
    assert.deepEqual(await fs.readdir(one.root), []);
    const two = await fixture(t, { admin: false });
    await assert.rejects(two.service.create(2, draft()), (error) => error.status === 403);
    await assert.rejects(two.service.list(2, 3), (error) => error.status === 403);
    assert.equal(two.repo.state.rows.length, 0);
    assert.deepEqual(await fs.readdir(two.root), []);
});

test('filesystem failure during testcase writes rolls back and removes only staging files', async (t) => {
    const faultyFs = { ...fs, async writeFile(filename, ...args) {
        if (filename.endsWith(path.join('output', '2'))) throw new Error('Injected write failure');
        return fs.writeFile(filename, ...args);
    } };
    const { root, repo, service } = await fixture(t, { fsImpl: faultyFs });
    await assert.rejects(service.create(2, draft()), /Injected write failure/);
    assert.equal(repo.state.rows.length, 0);
    assert.equal(repo.state.rollbacks, 1);
    assert.deepEqual(await fs.readdir(root), []);
});

test('READY update and commit failure remove newly published files and keep transaction rolled back', async (t) => {
    for (const options of [{ failReady: true }, { failCommit: true }]) {
        const { root, repo, service } = await fixture(t, options);
        await assert.rejects(service.create(2, draft()), /Injected/);
        assert.equal(repo.state.rows.length, 0);
        assert.deepEqual(await fs.readdir(root), []);
    }
});

test('existing problem directory is never overwritten or removed', async (t) => {
    const { root, repo, service } = await fixture(t);
    await fs.mkdir(path.join(root, '70'));
    await fs.writeFile(path.join(root, '70/keep.txt'), 'existing');
    await assert.rejects(service.create(2, draft()), (error) => error.status === 409);
    assert.equal(await fs.readFile(path.join(root, '70/keep.txt'), 'utf8'), 'existing');
    assert.equal(repo.state.rows.length, 0);
    assert.deepEqual(await fs.readdir(root), ['70']);
});

test('image assets are persisted, Markdown references rewritten, and private assets cannot be served', async (t) => {
    const { root, repo, service } = await fixture(t);
    await service.create(2, draft({ description: '![도형](images/diagram-1.png)', assets: [{ id: 'diagram-1', filename: '도형.png', mimeType: 'image/png', dataBase64: png }] }));
    const content = JSON.parse(await fs.readFile(path.join(root, '70/content/problem.json'), 'utf8'));
    assert.equal(content.description, '![도형](/api/problems/70/assets/diagram-1.png)');
    const asset = await service.publicAsset(70, 'diagram-1.png');
    assert.equal(asset.mimeType, 'image/png');
    assert.deepEqual(asset.data, Buffer.from(png, 'base64'));
    repo.state.rows[0].isPublic = false;
    await assert.rejects(service.publicAsset(70, 'diagram-1.png'), (error) => error.status === 404);
    await assert.rejects(service.publicAsset(70, '../content/problem.json'), (error) => error.status === 404);
});

test('image type/signature, duplicate IDs, and path traversal are rejected before writing', async (t) => {
    const { root, service } = await fixture(t);
    const asset = { id: 'image-1', filename: 'image.png', mimeType: 'image/png', dataBase64: png };
    for (const assets of [
        [{ ...asset, id: '../../outside' }],
        [{ ...asset, filename: '../outside.png' }],
        [{ ...asset, mimeType: 'image/svg+xml' }],
        [{ ...asset, dataBase64: Buffer.from('<script>alert(1)</script>').toString('base64') }],
        [asset, asset],
    ]) await assert.rejects(service.create(2, draft({ assets })), (error) => error.status === 400);
    assert.deepEqual(await fs.readdir(root), []);
});

test('base64 validation accepts a 5MiB image without stack overflow and rejects one byte over', () => {
    const maximum = Buffer.alloc(5 * 1024 * 1024);
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]).copy(maximum);
    const asset = { id: 'maximum', filename: 'maximum.png', mimeType: 'image/png', dataBase64: maximum.toString('base64') };
    assert.equal(validateDraft(draft({ assets: [asset] })).assets[0].data.length, maximum.length);
    const oversized = Buffer.concat([maximum, Buffer.from([0])]);
    assert.throws(() => validateDraft(draft({ assets: [{ ...asset, dataBase64: oversized.toString('base64') }] })), (error) => error.status === 413);
    assert.throws(() => validateDraft(draft({ assets: [{ ...asset, dataBase64: 'AB==' }] })), (error) => error.status === 400);
});
