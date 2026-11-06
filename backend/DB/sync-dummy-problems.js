const fs = require('node:fs/promises');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const pool = require('./connection');

const repoRoot = path.resolve(__dirname, '../..');
const problemsRoot = path.join(repoRoot, 'data/problems');

async function writeAtomic(problemDirectory, relativePath, contents) {
    const target = path.join(problemDirectory, relativePath);
    const temporary = path.join(problemDirectory, `.dummy-${randomUUID()}`);
    await fs.mkdir(path.dirname(target), { recursive: true });
    try {
        await fs.writeFile(temporary, contents, 'utf8');
        await fs.rename(temporary, target);
    } finally {
        await fs.rm(temporary, { force: true });
    }
}

async function run() {
    try {
        const fixtures = JSON.parse(await fs.readFile(path.join(repoRoot, 'data/dummy-problems.json'), 'utf8'));
        const assignments = [];

        // Resolve every ID before writing any files.
        for (const fixture of fixtures) {
            const [rows] = await pool.execute(
                `SELECT p.problemid
                 FROM problems AS p
                 JOIN user_groups AS g ON g.groupid = p.groupid
                 WHERE g.groupname = ? AND p.title = ?`,
                [fixture.groupName, fixture.title]
            );
            if (rows.length !== 1 || !Number.isSafeInteger(rows[0].problemid) || rows[0].problemid <= 0) {
                throw new Error(`Expected one DB row for ${fixture.groupName}/${fixture.title}. Run backend/DB/dummy.sql first.`);
            }
            const directory = path.join(problemsRoot, String(rows[0].problemid));
            const names = fixture.testCases.map((_, index) => String(index + 1));
            for (const type of ['input', 'output']) {
                const entries = await fs.readdir(path.join(directory, type)).catch((error) => {
                    if (error.code === 'ENOENT') return [];
                    throw error;
                });
                if (entries.some((name) => !names.includes(name))) {
                    throw new Error(`Unexpected testcase files in ${directory}/${type}. Check them before syncing.`);
                }
            }
            assignments.push({ fixture, directory, problemId: rows[0].problemid });
        }

        for (const { fixture, directory, problemId } of assignments) {
            await fs.mkdir(directory, { recursive: true });
            await writeAtomic(directory, 'content/problem.json', JSON.stringify(fixture.content, null, 2) + '\n');
            await writeAtomic(directory, 'limits/limits.json', JSON.stringify(fixture.limits, null, 2) + '\n');
            for (const [index, testCase] of fixture.testCases.entries()) {
                await writeAtomic(directory, `input/${index + 1}`, testCase.input);
                await writeAtomic(directory, `output/${index + 1}`, testCase.output);
            }
            console.log(`${problemId}: ${fixture.groupName}/${fixture.title} (${fixture.testCases.length} cases)`);
        }
    } finally {
        await pool.end();
    }
}

run().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
});

