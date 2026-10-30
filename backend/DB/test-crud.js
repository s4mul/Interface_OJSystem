
const assert = require('node:assert/strict');
const pool = require('./connection');

const users = require('./method/users');
const groups = require('./method/groups');
const members = require('./method/groupMembers');
const problems = require('./method/problems');
const sets = require('./method/problemSets');
const links = require('./method/problemset_problems');
const submissions = require('./method/submissions');

const ids = {};
const suffix = `${Date.now()}_${process.pid}`;

async function check(label, callback) {
    await callback();
    console.log(`[PASS] ${label}`);
}

// 외래 키 의존성을 고려한 삭제 순서
const deleteOrder = [
    ['submission', submissions.deleteSubmission, submissions.getSubmissionById],
    ['link', links.deleteProblemGroup, links.getProblemGroupById],
    ['member', members.deleteGroupMember, members.getGroupMemberById],
    ['set', sets.deleteProblemSet, sets.getProblemSetById],
    ['problemB', problems.deleteProblem, problems.getProblemById],
    ['problemA', problems.deleteProblem, problems.getProblemById],
    ['group', groups.deleteGroup, groups.getGroupById],
    ['user', users.deleteUser, users.getUserById],
];

async function run() {
    try {
        // 로컬 테스트 DB인지 확인
        const [[{ db }]] = await pool.query(
            'SELECT DATABASE() AS db'
        );

        const host = process.env.DB_HOST || '127.0.0.1';

        if (
            db !== 'oj_system' ||
            !['127.0.0.1', 'localhost', '::1'].includes(host)
        ) {
            throw new Error(
                `로컬 oj_system DB만 허용: ${host}, ${db}`
            );
        }

        // 1. Users
        await check('users: CREATE / READ / UPDATE', async () => {
            ids.user = await users.createUser(`test_user_${suffix}`);

            assert.ok(ids.user > 0);
            assert.equal(
                (await users.getUserById(ids.user)).username,
                `test_user_${suffix}`
            );

            assert.equal(
                await users.updateUser(ids.user, `updated_user_${suffix}`),
                1
            );

            assert.equal(
                (await users.getUserById(ids.user)).username,
                `updated_user_${suffix}`
            );
        });

        // 2. Groups
        await check('groups: CREATE / READ / UPDATE', async () => {
            ids.group = await groups.createGroup(`test_group_${suffix}`);

            assert.ok(ids.group > 0);
            assert.equal(
                (await groups.getGroupById(ids.group)).groupname,
                `test_group_${suffix}`
            );

            assert.equal(
                await groups.updateGroup(ids.group, `updated_group_${suffix}`),
                1
            );

            assert.equal(
                (await groups.getGroupById(ids.group)).groupname,
                `updated_group_${suffix}`
            );
        });

        // 3. Group Members
        await check('group_members: CREATE / READ / UPDATE', async () => {
            ids.member = await members.createGroupMember(
                ids.group, ids.user, false
            );

            assert.ok(ids.member > 0);
            assert.equal(
                (await members.getGroupMemberById(ids.member)).isadmin,
                0
            );

            assert.equal(
                await members.updateGroupMember(
                    ids.member, ids.group, ids.user, true
                ),
                1
            );

            assert.equal(
                (await members.getGroupMemberById(ids.member)).isadmin,
                1
            );
        });

        // 4. Problems
        await check('problems: CREATE / READ / UPDATE', async () => {
            ids.problemA = await problems.createProblem(
                ids.group, ids.user, false, 'A+B Test'
            );

            assert.ok(ids.problemA > 0);
            assert.equal(
                (await problems.getProblemById(ids.problemA)).status,
                'DRAFT'
            );

            assert.equal(
                await problems.updateProblem(
                    ids.problemA, ids.group, ids.user, true, 'A+B Updated'
                ),
                1
            );

            const saved = await problems.getProblemById(ids.problemA);

            assert.equal(saved.title, 'A+B Updated');
            assert.equal(saved.ispublic, 1);

            // 문제집 연결 정보 UPDATE를 위한 추가 문제
            ids.problemB = await problems.createProblem(
                ids.group, ids.user, false, 'Secondary Test Problem'
            );

            assert.ok(ids.problemB > 0);
        });

        // 5. Problem Sets
        await check('problemset: CREATE / READ / UPDATE', async () => {
            ids.set = await sets.createProblemSet(
                ids.group, `test_set_${suffix}`
            );

            assert.ok(ids.set > 0);
            assert.equal(
                (await sets.getProblemSetById(ids.set)).setname,
                `test_set_${suffix}`
            );

            assert.equal(
                await sets.updateProblemSet(
                    ids.set,
                    ids.group,
                    `updated_set_${suffix}`,
                    '2030-01-01 09:00:00',
                    '2030-01-01 11:00:00'
                ),
                1
            );

            assert.equal(
                (await sets.getProblemSetById(ids.set)).setname,
                `updated_set_${suffix}`
            );
        });

        // 6. Problem Set - Problem 관계
        await check('problemset_problems: CREATE / READ / UPDATE', async () => {
            ids.link = await links.createProblemGroup(
                ids.set, ids.problemA
            );

            assert.ok(ids.link > 0);
            assert.equal(
                (await links.getProblemGroupById(ids.link)).problemid,
                ids.problemA
            );

            assert.equal(
                await links.updateProblemGroup(
                    ids.link, ids.set, ids.problemB
                ),
                1
            );

            assert.equal(
                (await links.getProblemGroupById(ids.link)).problemid,
                ids.problemB
            );
        });

        // 7. Submissions
        await check('submissions: CREATE / READ / UPDATE', async () => {
            ids.submission = await submissions.createSubmission(
                ids.problemA, ids.user
            );

            assert.ok(ids.submission > 0);

            const saved = await submissions.getSubmissionById(
                ids.submission
            );

            assert.equal(saved.status, 'PENDING');
            assert.ok(saved.submitted_at);

            assert.equal(
                await submissions.updateSubmission(ids.submission, 'AC'),
                1
            );

            assert.equal(
                (await submissions.getSubmissionById(ids.submission)).status,
                'AC'
            );
        });

        // DELETE 테스트 - 외래 키 역순으로 삭제
        for (const [name, remove, find] of deleteOrder) {
            await check(`${name}: DELETE`, async () => {
                assert.equal(await remove(ids[name]), 1);
                assert.equal(await find(ids[name]), null);
                ids[name] = null;
            });
        }

        console.log(
            '\nSUCCESS: 7 tables / 28 CRUD methods passed.'
        );

    } catch (error) {
        process.exitCode = 1;
        console.error('\n[FAIL] CRUD test:', error);

    } finally {
        // 중간 실패 시 생성된 테스트 데이터 정리
        for (const [name, remove] of deleteOrder) {
            if (ids[name] == null) continue;

            try {
                await remove(ids[name]);
                console.log(`[CLEANUP] ${name}`);
            } catch (error) {
                process.exitCode = 1;
                console.error(
                    `[CLEANUP FAILED] ${name}:`,
                    error.message
                );
            }
        }

        await pool.end();
    }
}

run();
