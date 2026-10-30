USE oj_system;

-- 1. User
INSERT INTO users (userid, username)
VALUES (1, 'admin');

-- 2. Group
INSERT INTO `groups` (groupid, groupname)
VALUES (1, 'admin');

-- 3. Group member
INSERT INTO group_members (idx, groupid, userid, isadmin)
VALUES (1, 1, 1, TRUE);

-- 4. Problem
INSERT INTO problems (
    problemid,
    groupid,
    adduser,
    ispublic,
    title,
    status
)
VALUES (1, 1, 1, TRUE, 'a + b', 'READY');

-- 5. Problem set
INSERT INTO problemset (
    setid,
    groupid,
    setname,
    start_at,
    end_at
)
VALUES (1, 1, 'admin problemset', NULL, NULL);

-- 6. Problem set - Problem
INSERT INTO problemset_problems (idx, setid, problemid)
VALUES (1, 1, 1);

-- 7. Submission
INSERT INTO submissions (
    submitid,
    problemid,
    userid,
    language,
    source,
    status
)
VALUES (1, 1, 1, 'C++', '// dummy submission', 'AC');
