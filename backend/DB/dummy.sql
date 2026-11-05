USE oj_system;

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

-- Problem content and judge data are stored separately.
-- Seed all three problems as READY. ispublic keeps its default (FALSE).
INSERT INTO problems (groupid, adduser, title, status)
SELECT @group_a_id, @admin_id, 'A+B', 'READY'
WHERE NOT EXISTS (
    SELECT 1 FROM problems WHERE groupid = @group_a_id AND title = 'A+B'
);

INSERT INTO problems (groupid, adduser, title, status)
SELECT @group_a_id, @admin_id, 'A-B', 'READY'
WHERE NOT EXISTS (
    SELECT 1 FROM problems WHERE groupid = @group_a_id AND title = 'A-B'
);

INSERT INTO problems (groupid, adduser, title, status)
SELECT @group_b_id, @admin_id, 'A * B', 'READY'
WHERE NOT EXISTS (
    SELECT 1 FROM problems WHERE groupid = @group_b_id AND title = 'A * B'
);

COMMIT;
