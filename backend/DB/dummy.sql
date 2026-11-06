USE oj_system;
SET NAMES utf8mb4;

START TRANSACTION;

-- Reuse existing users and groups when this script is run again.
INSERT INTO users (username)
VALUES ('admin'), ('a1'), ('b2'), ('c3')
ON DUPLICATE KEY UPDATE username = users.username;

INSERT INTO user_groups (groupname)
VALUES ('A'), ('B')
ON DUPLICATE KEY UPDATE groupname = user_groups.groupname;

SET @admin_id = (SELECT userid FROM users WHERE username = 'admin');
SET @a1_id = (SELECT userid FROM users WHERE username = 'a1');
SET @b2_id = (SELECT userid FROM users WHERE username = 'b2');
SET @c3_id = (SELECT userid FROM users WHERE username = 'c3');
SET @group_a_id = (SELECT groupid FROM user_groups WHERE groupname = 'A');
SET @group_b_id = (SELECT groupid FROM user_groups WHERE groupname = 'B');

-- admin manages both groups. Other new memberships are ordinary members.
INSERT INTO group_members (groupid, userid, isadmin)
VALUES
    (@group_a_id, @admin_id, TRUE),
    (@group_a_id, @a1_id, FALSE),
    (@group_a_id, @b2_id, FALSE),
    (@group_b_id, @admin_id, TRUE),
    (@group_b_id, @b2_id, FALSE),
    (@group_b_id, @c3_id, FALSE)
ON DUPLICATE KEY UPDATE isadmin = group_members.isadmin;

-- 문제 본문과 채점 데이터 원본은 data/dummy-problems.json에 있다.
-- 이 SQL 실행 후 저장소 루트에서 node backend/DB/sync-dummy-problems.js를 실행한다.
-- DB의 실제 problemid를 조회하여 data/problems/{problemid}에 파일을 배치한다.
-- 두 정수를 받는 문제는 작은 정수 범위를 사용하며, 나눗셈의 입력은 양의 정수로 한다.
-- 모든 더미 문제는 공개 상태(TRUE), READY로 등록한다.

-- 그룹 A 문제 4개
-- 두 정수의 합을 출력한다.
INSERT INTO problems (groupid, adduser, title, status, ispublic)
SELECT @group_a_id, @admin_id, 'A+B', 'READY', TRUE
WHERE NOT EXISTS (
    SELECT 1 FROM problems WHERE groupid = @group_a_id AND title = 'A+B'
);

-- 두 정수의 차를 출력한다.
INSERT INTO problems (groupid, adduser, title, status, ispublic)
SELECT @group_a_id, @admin_id, 'A-B', 'READY', TRUE
WHERE NOT EXISTS (
    SELECT 1 FROM problems WHERE groupid = @group_a_id AND title = 'A-B'
);

-- 두 정수 중 큰 값을 출력한다.
INSERT INTO problems (groupid, adduser, title, status, ispublic)
SELECT @group_a_id, @admin_id, '큰 수 찾기', 'READY', TRUE
WHERE NOT EXISTS (
    SELECT 1 FROM problems WHERE groupid = @group_a_id AND title = '큰 수 찾기'
);

-- 두 정수 중 작은 값을 출력한다.
INSERT INTO problems (groupid, adduser, title, status, ispublic)
SELECT @group_a_id, @admin_id, '작은 수 찾기', 'READY', TRUE
WHERE NOT EXISTS (
    SELECT 1 FROM problems WHERE groupid = @group_a_id AND title = '작은 수 찾기'
);

-- 이전 버전의 더미 문제도 공개 상태와 READY로 갱신한다.
UPDATE problems
SET ispublic = TRUE, status = 'READY'
WHERE problemid > 0
  AND groupid = @group_a_id
  AND title IN ('A+B', 'A-B', '큰 수 찾기', '작은 수 찾기');

-- 그룹 B 문제 4개
-- 두 정수의 곱을 출력한다.
INSERT INTO problems (groupid, adduser, title, status, ispublic)
SELECT @group_b_id, @admin_id, 'A * B', 'READY', TRUE
WHERE NOT EXISTS (
    SELECT 1 FROM problems WHERE groupid = @group_b_id AND title = 'A * B'
);

-- 두 양의 정수 A, B에 대해 A를 B로 나눈 정수 몫을 출력한다.
INSERT INTO problems (groupid, adduser, title, status, ispublic)
SELECT @group_b_id, @admin_id, '몫 구하기', 'READY', TRUE
WHERE NOT EXISTS (
    SELECT 1 FROM problems WHERE groupid = @group_b_id AND title = '몫 구하기'
);

-- 두 양의 정수 A, B에 대해 A를 B로 나눈 나머지를 출력한다.
INSERT INTO problems (groupid, adduser, title, status, ispublic)
SELECT @group_b_id, @admin_id, '나머지 구하기', 'READY', TRUE
WHERE NOT EXISTS (
    SELECT 1 FROM problems WHERE groupid = @group_b_id AND title = '나머지 구하기'
);

-- 정수 하나를 입력받아 제곱을 출력한다.
INSERT INTO problems (groupid, adduser, title, status, ispublic)
SELECT @group_b_id, @admin_id, '제곱 구하기', 'READY', TRUE
WHERE NOT EXISTS (
    SELECT 1 FROM problems WHERE groupid = @group_b_id AND title = '제곱 구하기'
);

-- 이전 버전의 더미 문제도 공개 상태와 READY로 갱신한다.
UPDATE problems
SET ispublic = TRUE, status = 'READY'
WHERE problemid > 0
  AND groupid = @group_b_id
  AND title IN ('A * B', '몫 구하기', '나머지 구하기', '제곱 구하기');

-- 그룹별 문제집 2개를 생성한다. 시작/종료 시간은 지정하지 않는다.
INSERT INTO problemset (groupid, setname)
SELECT @group_a_id, 'A 기본 연습'
WHERE NOT EXISTS (
    SELECT 1 FROM problemset WHERE groupid = @group_a_id AND setname = 'A 기본 연습'
);

INSERT INTO problemset (groupid, setname)
SELECT @group_a_id, 'A 추가 연습'
WHERE NOT EXISTS (
    SELECT 1 FROM problemset WHERE groupid = @group_a_id AND setname = 'A 추가 연습'
);

INSERT INTO problemset (groupid, setname)
SELECT @group_b_id, 'B 기본 연습'
WHERE NOT EXISTS (
    SELECT 1 FROM problemset WHERE groupid = @group_b_id AND setname = 'B 기본 연습'
);

INSERT INTO problemset (groupid, setname)
SELECT @group_b_id, 'B 추가 연습'
WHERE NOT EXISTS (
    SELECT 1 FROM problemset WHERE groupid = @group_b_id AND setname = 'B 추가 연습'
);

-- 각 그룹의 기본 연습에는 3문제, 추가 연습에는 1문제를 연결한다.
INSERT INTO problemset_problems (setid, problemid)
SELECT ps.setid, p.problemid
FROM problemset AS ps
JOIN problems AS p ON p.groupid = ps.groupid
WHERE ps.groupid = @group_a_id
  AND ps.setname = 'A 기본 연습'
  AND p.title IN ('A+B', 'A-B', '큰 수 찾기')
ON DUPLICATE KEY UPDATE problemid = problemset_problems.problemid;

INSERT INTO problemset_problems (setid, problemid)
SELECT ps.setid, p.problemid
FROM problemset AS ps
JOIN problems AS p ON p.groupid = ps.groupid
WHERE ps.groupid = @group_a_id
  AND ps.setname = 'A 추가 연습'
  AND p.title IN ('작은 수 찾기')
ON DUPLICATE KEY UPDATE problemid = problemset_problems.problemid;

INSERT INTO problemset_problems (setid, problemid)
SELECT ps.setid, p.problemid
FROM problemset AS ps
JOIN problems AS p ON p.groupid = ps.groupid
WHERE ps.groupid = @group_b_id
  AND ps.setname = 'B 기본 연습'
  AND p.title IN ('A * B', '몫 구하기', '나머지 구하기')
ON DUPLICATE KEY UPDATE problemid = problemset_problems.problemid;

INSERT INTO problemset_problems (setid, problemid)
SELECT ps.setid, p.problemid
FROM problemset AS ps
JOIN problems AS p ON p.groupid = ps.groupid
WHERE ps.groupid = @group_b_id
  AND ps.setname = 'B 추가 연습'
  AND p.title IN ('제곱 구하기')
ON DUPLICATE KEY UPDATE problemid = problemset_problems.problemid;

COMMIT;
