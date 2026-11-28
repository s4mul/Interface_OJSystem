const fs = require('node:fs/promises');
const path = require('node:path');
const { parse } = require('csv-parse/sync');

const MAX_CSV_BYTES = 10 * 1024 * 1024;
const MAX_CASES = 10000;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_TOTAL_IMAGE_BYTES = 10 * 1024 * 1024;
const imageTypes = {
    'image/png': { extension: 'png', signature: (data) => data.length >= 8 && data.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) },
    'image/jpeg': { extension: 'jpg', signature: (data) => data.length >= 3 && data[0] === 255 && data[1] === 216 && data[2] === 255 },
    'image/gif': { extension: 'gif', signature: (data) => data.length >= 6 && ['GIF87a', 'GIF89a'].includes(data.subarray(0, 6).toString('ascii')) },
    'image/webp': { extension: 'webp', signature: (data) => data.length >= 12 && data.subarray(0, 4).toString('ascii') === 'RIFF' && data.subarray(8, 12).toString('ascii') === 'WEBP' },
};

class AuthoringError extends Error {
    constructor(status, message) { super(message); this.status = status; }
}

function positiveId(value, label = 'ID') {
    if (!['string', 'number'].includes(typeof value) || !/^[1-9]\d*$/.test(String(value)) || !Number.isSafeInteger(Number(value)) || Number(value) > 4294967295) {
        throw new AuthoringError(400, `${label}가 올바르지 않습니다.`);
    }
    return Number(value);
}

function text(value, label, required = true, maxBytes = 1024 * 1024) {
    if (typeof value !== 'string' || (required && !value.trim()) || Buffer.byteLength(value, 'utf8') > maxBytes) {
        throw new AuthoringError(400, `${label}을(를) 확인해 주세요.`);
    }
    return value;
}

function parseTestcasesCsv(csv) {
    if (typeof csv !== 'string' || !csv.length) throw new AuthoringError(400, '테스트케이스 CSV를 선택해 주세요.');
    if (Buffer.byteLength(csv, 'utf8') > MAX_CSV_BYTES) throw new AuthoringError(413, 'CSV는 10MB 이하로 업로드해 주세요.');
    let records;
    let count = 0;
    try {
        records = parse(csv, {
            bom: true,
            skip_empty_lines: true,
            relax_column_count: false,
            max_record_size: 2 * 1024 * 1024,
            on_record(record) {
                count += 1;
                if (count > MAX_CASES + 1) throw new AuthoringError(400, `테스트케이스는 ${MAX_CASES}개까지 등록할 수 있습니다.`);
                return record;
            },
        });
    } catch (error) {
        if (error instanceof AuthoringError) throw error;
        throw new AuthoringError(400, `CSV ${error.lines ? `${error.lines}행의 ` : ''}형식을 확인해 주세요. 쉼표와 줄바꿈이 있는 값은 큰따옴표로 감싸야 합니다.`);
    }
    if (!records.length || records[0].length !== 2 || records[0][0].trim().toLowerCase() !== 'input' || records[0][1].trim().toLowerCase() !== 'output') {
        throw new AuthoringError(400, 'CSV 첫 행은 input,output 두 열이어야 합니다.');
    }
    if (records.length < 2) throw new AuthoringError(400, 'CSV에 테스트케이스가 한 개 이상 있어야 합니다.');
    return records.slice(1).map((record, index) => {
        if (record.length !== 2) throw new AuthoringError(400, `CSV ${index + 2}행은 input,output 두 열이어야 합니다.`);
        return { input: record[0], output: record[1] };
    });
}

function validateAssets(assets = []) {
    if (!Array.isArray(assets) || assets.length > 20) throw new AuthoringError(400, '이미지는 20개까지 첨부할 수 있습니다.');
    const ids = new Set();
    let total = 0;
    return assets.map((asset) => {
        if (!asset || typeof asset.id !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9_-]{0,79}$/.test(asset.id) || ids.has(asset.id)) {
            throw new AuthoringError(400, '이미지 식별자가 올바르지 않습니다.');
        }
        ids.add(asset.id);
        const type = imageTypes[asset.mimeType];
        if (!type || typeof asset.filename !== 'string' || !asset.filename || asset.filename.length > 255 || /[/\\\u0000]/.test(asset.filename) || typeof asset.dataBase64 !== 'string') {
            throw new AuthoringError(400, 'PNG, JPEG, GIF, WebP 이미지만 첨부할 수 있습니다.');
        }
        if (asset.dataBase64.length > Math.ceil(MAX_IMAGE_BYTES / 3) * 4) throw new AuthoringError(413, '이미지 한 개의 크기는 5MB 이하여야 합니다.');
        // Avoid a repeated-group regular expression: large valid files can exhaust
        // the regexp engine's stack. The round trip also checks canonical padding.
        if (asset.dataBase64.length % 4 !== 0 || /[^A-Za-z0-9+/=]/.test(asset.dataBase64)) {
            throw new AuthoringError(400, '이미지 데이터를 읽을 수 없습니다.');
        }
        const data = Buffer.from(asset.dataBase64, 'base64');
        if (data.length > MAX_IMAGE_BYTES) throw new AuthoringError(413, '이미지 한 개의 크기는 5MB 이하여야 합니다.');
        if (!data.length || data.toString('base64') !== asset.dataBase64 || !type.signature(data)) throw new AuthoringError(400, '이미지 파일의 형식을 확인해 주세요.');
        total += data.length;
        if (total > MAX_TOTAL_IMAGE_BYTES) throw new AuthoringError(413, '첨부 이미지의 전체 크기는 10MB 이하여야 합니다.');
        const filename = `${asset.id}.${type.extension}`;
        return { id: asset.id, filename, relativePath: `images/${filename}`, mimeType: asset.mimeType, data };
    });
}

function validateDraft(body) {
    if (!body || typeof body !== 'object' || Array.isArray(body)) throw new AuthoringError(400, '문제 정보를 확인해 주세요.');
    const userId = positiveId(body.userId, '등록 사용자 ID');
    const title = text(body.title, '문제 제목', true, 1024).trim();
    if (title.length > 255) throw new AuthoringError(400, '문제 제목은 255자 이내로 입력해 주세요.');
    const description = text(body.description, '문제 설명');
    const input = text(body.input, '입력 설명');
    const output = text(body.output, '출력 설명');
    if (!Array.isArray(body.examples) || body.examples.length > 100) throw new AuthoringError(400, '예제 입출력을 확인해 주세요.');
    const examples = body.examples.map((example) => ({ input: text(example?.input, '예제 입력', false), output: text(example?.output, '예제 출력', false) }));
    const limits = {};
    for (const key of ['timeLimitMs', 'memoryLimitMb', 'outputLimitKb']) {
        const value = body.limits?.[key];
        if (!Number.isSafeInteger(value) || value <= 0 || value > 2147483647) throw new AuthoringError(400, '실행 제한은 양의 정수로 입력해 주세요.');
        limits[key] = value;
    }
    if (typeof body.isPublic !== 'boolean') throw new AuthoringError(400, '공개 여부를 선택해 주세요.');
    const assets = validateAssets(body.assets);
    return { userId, title, description, input, output, examples, limits, isPublic: body.isPublic, assets };
}

function createProblemAuthoringService({ repository, problemsRoot = path.resolve(__dirname, '../../../../data/problems'), fsImpl = fs }) {
    const root = path.resolve(problemsRoot);

    async function removeOwnedDirectory(directory) {
        const absolute = path.resolve(directory);
        if (path.dirname(absolute) !== root || absolute === root) throw new Error('Refusing cleanup outside the problem storage root.');
        await fsImpl.rm(absolute, { recursive: true, force: true });
    }

    async function create(groupValue, body) {
        const groupId = positiveId(groupValue, '그룹 ID');
        const draft = validateDraft(body);
        let stagePath;
        let publishedPath;
        let ownsPublishedPath = false;
        try {
            return await repository.withTransaction(async (transaction) => {
                if (!await transaction.isGroupAdmin(groupId, draft.userId)) throw new AuthoringError(403, '해당 그룹의 관리자만 문제를 등록할 수 있습니다.');
                const testcases = parseTestcasesCsv(body.testcasesCsv);
                const problemId = positiveId(await transaction.insertProblem({ groupId, userId: draft.userId, title: draft.title }), '문제 ID');
                await fsImpl.mkdir(root, { recursive: true });
                stagePath = await fsImpl.mkdtemp(path.join(root, '.upload-'));
                for (const directory of ['content', 'limits', 'input', 'output', 'assets']) await fsImpl.mkdir(path.join(stagePath, directory));
                const replaceAssets = (value) => draft.assets.reduce((result, asset) => result.replaceAll(asset.relativePath, `/api/problems/${problemId}/assets/${asset.filename}`), value);
                const content = { format: 'markdown', description: replaceAssets(draft.description), input: replaceAssets(draft.input), output: replaceAssets(draft.output), examples: draft.examples };
                await fsImpl.writeFile(path.join(stagePath, 'content/problem.json'), `${JSON.stringify(content, null, 2)}\n`, { encoding: 'utf8', flag: 'wx' });
                await fsImpl.writeFile(path.join(stagePath, 'limits/limits.json'), `${JSON.stringify(draft.limits, null, 2)}\n`, { encoding: 'utf8', flag: 'wx' });
                for (const [index, testcase] of testcases.entries()) {
                    await fsImpl.writeFile(path.join(stagePath, 'input', String(index + 1)), testcase.input, { encoding: 'utf8', flag: 'wx' });
                    await fsImpl.writeFile(path.join(stagePath, 'output', String(index + 1)), testcase.output, { encoding: 'utf8', flag: 'wx' });
                }
                for (const asset of draft.assets) await fsImpl.writeFile(path.join(stagePath, 'assets', asset.filename), asset.data, { flag: 'wx' });
                publishedPath = path.join(root, String(problemId));
                try {
                    await fsImpl.lstat(publishedPath);
                    throw new AuthoringError(409, '같은 문제 ID의 파일이 이미 존재합니다. 서버의 문제 저장 경로를 확인해 주세요.');
                } catch (error) { if (error.code !== 'ENOENT') throw error; }
                await fsImpl.rename(stagePath, publishedPath);
                ownsPublishedPath = true;
                stagePath = null;
                await transaction.markReady(problemId, draft.isPublic);
                return { problemId, groupId, title: draft.title, status: 'READY', isPublic: draft.isPublic, testcaseCount: testcases.length };
            });
        } catch (error) {
            // Only paths created by this invocation are removed; an existing problem is never touched.
            if (stagePath) await removeOwnedDirectory(stagePath).catch(() => {});
            if (ownsPublishedPath) await removeOwnedDirectory(publishedPath).catch(() => {});
            throw error;
        }
    }

    async function update(groupValue, problemValue, body) {
        const groupId = positiveId(groupValue, '그룹 ID');
        const problemId = positiveId(problemValue, '문제 ID');
        const draft = validateDraft(body);
        const publishedPath = path.join(root, String(problemId));
        let stagePath;
        let backupDirectory;
        let backupPath;
        let originalMoved = false;
        let newPublished = false;
        let recoveryFailed = false;
        async function restorePublished() {
            try {
                if (newPublished) { await removeOwnedDirectory(publishedPath); newPublished = false; }
                if (originalMoved) { await fsImpl.rename(backupPath, publishedPath); originalMoved = false; }
            } catch (error) { recoveryFailed = true; throw error; }
        }
        try {
            const result = await repository.withTransaction(async (transaction) => {
                if (!await transaction.isGroupAdmin(groupId, draft.userId)) throw new AuthoringError(403, '해당 그룹의 관리자만 문제를 수정할 수 있습니다.');
                const problem = await transaction.getProblemForUpdate(groupId, problemId);
                if (!problem) throw new AuthoringError(404, '이 그룹의 문제를 찾을 수 없습니다.');
                if (problem.status !== 'READY') throw new AuthoringError(409, '등록이 완료된 문제만 수정할 수 있습니다.');
                const testcases = body.testcasesCsv === undefined ? null : parseTestcasesCsv(body.testcasesCsv);
                const canonicalRoot = await fsImpl.realpath(root);
                if (await fsImpl.realpath(publishedPath) !== path.join(canonicalRoot, String(problemId))) throw new AuthoringError(409, '문제 저장 경로를 확인해 주세요.');
                stagePath = await fsImpl.mkdtemp(path.join(root, '.update-'));
                // Copy the existing files so an omitted CSV and existing images are preserved.
                await fsImpl.cp(publishedPath, stagePath, { recursive: true });
                for (const directory of ['content', 'limits', 'assets']) await fsImpl.mkdir(path.join(stagePath, directory), { recursive: true });
                const replaceAssets = (value) => draft.assets.reduce((content, asset) => content.replaceAll(asset.relativePath, `/api/problems/${problemId}/assets/${asset.filename}`), value);
                const content = { format: 'markdown', description: replaceAssets(draft.description), input: replaceAssets(draft.input), output: replaceAssets(draft.output), examples: draft.examples };
                await fsImpl.writeFile(path.join(stagePath, 'content/problem.json'), `${JSON.stringify(content, null, 2)}\n`, 'utf8');
                await fsImpl.writeFile(path.join(stagePath, 'limits/limits.json'), `${JSON.stringify(draft.limits, null, 2)}\n`, 'utf8');
                for (const asset of draft.assets) await fsImpl.writeFile(path.join(stagePath, 'assets', asset.filename), asset.data);
                if (testcases) {
                    for (const directory of ['input', 'output']) {
                        await fsImpl.rm(path.join(stagePath, directory), { recursive: true, force: true });
                        await fsImpl.mkdir(path.join(stagePath, directory));
                    }
                    for (const [index, testcase] of testcases.entries()) {
                        await fsImpl.writeFile(path.join(stagePath, 'input', String(index + 1)), testcase.input, 'utf8');
                        await fsImpl.writeFile(path.join(stagePath, 'output', String(index + 1)), testcase.output, 'utf8');
                    }
                }
                const testcaseCount = testcases?.length ?? (await fsImpl.readdir(path.join(stagePath, 'input'))).filter((name) => /^[1-9]\d*$/.test(name)).length;
                if (!testcaseCount) throw new AuthoringError(409, '기존 테스트케이스를 확인해 주세요.');
                backupDirectory = await fsImpl.mkdtemp(path.join(root, '.backup-'));
                backupPath = path.join(backupDirectory, 'problem');
                await fsImpl.rename(publishedPath, backupPath);
                originalMoved = true;
                await fsImpl.rename(stagePath, publishedPath);
                newPublished = true;
                stagePath = null;
                await transaction.updateProblem(groupId, problemId, draft.title, draft.isPublic);
                return { problemId, groupId, title: draft.title, status: 'READY', isPublic: draft.isPublic, testcaseCount };
            }, restorePublished);
            // A cleanup failure after commit must not turn a successful save into an error.
            await removeOwnedDirectory(backupDirectory).catch((error) => console.error('Problem backup cleanup failed:', error.message));
            return result;
        } catch (error) {
            if (recoveryFailed) {
                console.error('Problem update restoration failed:', error.message);
                throw new Error('문제 파일 복구가 필요합니다. 서버의 백업 파일을 확인해 주세요.');
            }
            try {
                await restorePublished();
            } catch (recoveryError) {
                // Preserve the backup if restoration fails; never delete the only old copy.
                console.error('Problem update restoration failed:', recoveryError.message);
                throw new Error('문제 파일 복구가 필요합니다. 서버의 백업 파일을 확인해 주세요.');
            }
            if (stagePath) await removeOwnedDirectory(stagePath).catch(() => {});
            if (backupDirectory) await removeOwnedDirectory(backupDirectory).catch(() => {});
            throw error;
        }
    }

    async function list(groupValue, userValue) {
        const groupId = positiveId(groupValue, '그룹 ID');
        const userId = positiveId(userValue, '사용자 ID');
        if (!await repository.isGroupAdmin(groupId, userId)) throw new AuthoringError(403, '해당 그룹의 관리자만 문제 목록을 조회할 수 있습니다.');
        return { problems: await repository.listProblems(groupId) };
    }

    async function getManagedProblem(groupValue, problemValue, userValue) {
        const groupId = positiveId(groupValue, '그룹 ID');
        const problemId = positiveId(problemValue, '문제 ID');
        const userId = positiveId(userValue, '사용자 ID');
        if (!await repository.isGroupAdmin(groupId, userId)) throw new AuthoringError(403, '해당 그룹의 관리자만 문제를 조회할 수 있습니다.');
        const problem = await repository.getProblemById(problemId);
        if (!problem || problem.groupId !== groupId || problem.status !== 'READY') throw new AuthoringError(404, '이 그룹의 문제를 찾을 수 없습니다.');
        return problem;
    }

    async function read(groupValue, problemValue, userValue) {
        const problem = await getManagedProblem(groupValue, problemValue, userValue);
        const directory = path.join(root, String(problem.problemId));
        const [contentFile, limitsFile] = await Promise.all([
            fsImpl.readFile(path.join(directory, 'content/problem.json'), 'utf8'),
            fsImpl.readFile(path.join(directory, 'limits/limits.json'), 'utf8'),
        ]);
        const content = JSON.parse(contentFile);
        const limits = JSON.parse(limitsFile);
        if (typeof content?.description !== 'string' || typeof content.input !== 'string' || typeof content.output !== 'string' ||
            !Array.isArray(content.examples) || !content.examples.every((example) => typeof example?.input === 'string' && typeof example.output === 'string') ||
            ![limits?.timeLimitMs, limits?.memoryLimitMb, limits?.outputLimitKb].every((limit) => Number.isFinite(limit) && limit > 0)) {
            throw new Error('Invalid problem content or limits.');
        }
        return { problem: { ...problem, description: content.description, input: content.input, output: content.output, examples: content.examples, limits } };
    }

    async function adminAsset(groupValue, problemValue, userValue, filename) {
        const problem = await getManagedProblem(groupValue, problemValue, userValue);
        return readAsset(problem.problemId, filename);
    }

    async function publicAsset(problemValue, filename) {
        const problemId = positiveId(problemValue, '문제 ID');
        const problem = await repository.getProblemById(problemId);
        if (!problem || problem.status !== 'READY' || !problem.isPublic) throw new AuthoringError(404, '이미지를 찾을 수 없습니다.');
        return readAsset(problemId, filename);
    }

    async function readAsset(problemId, filename) {
        if (typeof filename !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9_-]{0,79}\.(png|jpg|gif|webp)$/.test(filename)) throw new AuthoringError(404, '이미지를 찾을 수 없습니다.');
        try {
            const canonicalRoot = await fsImpl.realpath(root);
            const expectedAssetsPath = path.join(canonicalRoot, String(problemId), 'assets');
            const assetPath = await fsImpl.realpath(path.join(root, String(problemId), 'assets', filename));
            if (!assetPath.startsWith(`${expectedAssetsPath}${path.sep}`)) throw new AuthoringError(404, '이미지를 찾을 수 없습니다.');
            const data = await fsImpl.readFile(assetPath);
            const extension = path.extname(filename).slice(1);
            const mimeType = Object.entries(imageTypes).find(([, type]) => type.extension === extension)?.[0];
            return { data, mimeType };
        } catch (error) {
            if (error instanceof AuthoringError) throw error;
            if (['ENOENT', 'ENOTDIR', 'EISDIR'].includes(error.code)) throw new AuthoringError(404, '이미지를 찾을 수 없습니다.');
            throw error;
        }
    }

    return { create, update, list, read, adminAsset, publicAsset };
}

module.exports = { AuthoringError, createProblemAuthoringService, parseTestcasesCsv, validateDraft };
