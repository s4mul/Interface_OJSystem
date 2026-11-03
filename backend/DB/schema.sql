
-- Interface_OJSystem / MySQL 8.0+
-- Fresh initialization (v2)
-- Execute with root, not oj_app.

CREATE DATABASE oj_system
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE oj_system;


-- 1. Users
CREATE TABLE users (
    userid INT UNSIGNED NOT NULL AUTO_INCREMENT,
    username VARCHAR(100) NOT NULL,

    PRIMARY KEY (userid)
) ENGINE=InnoDB
DEFAULT CHARSET=utf8mb4
COLLATE=utf8mb4_unicode_ci;


-- 2. Groups
CREATE TABLE `groups` (
    groupid INT UNSIGNED NOT NULL AUTO_INCREMENT,
    groupname VARCHAR(100) NOT NULL,

    PRIMARY KEY (groupid),
    UNIQUE KEY uq_groups_groupname (groupname)
) ENGINE=InnoDB
DEFAULT CHARSET=utf8mb4
COLLATE=utf8mb4_unicode_ci;


-- 3. Group membership and shared administrators
CREATE TABLE group_members (
    idx INT UNSIGNED NOT NULL AUTO_INCREMENT,
    groupid INT UNSIGNED NOT NULL,
    userid INT UNSIGNED NOT NULL,
    isadmin BOOLEAN NOT NULL DEFAULT FALSE,

    PRIMARY KEY (idx),

    UNIQUE KEY uq_group_members_pair (groupid, userid),
    KEY idx_group_members_userid (userid),

    CONSTRAINT fk_group_members_group
        FOREIGN KEY (groupid)
        REFERENCES `groups` (groupid),

    CONSTRAINT fk_group_members_user
        FOREIGN KEY (userid)
        REFERENCES users (userid)
) ENGINE=InnoDB
DEFAULT CHARSET=utf8mb4
COLLATE=utf8mb4_unicode_ci;


-- 4. Problems
-- Markdown/images: Backend filesystem
-- Testcases/limits: Judge Server filesystem
CREATE TABLE problems (
    problemid INT UNSIGNED NOT NULL AUTO_INCREMENT,
    groupid INT UNSIGNED NOT NULL,
    adduser INT UNSIGNED NOT NULL,
    ispublic BOOLEAN NOT NULL DEFAULT FALSE,
    title VARCHAR(255) NOT NULL,
    status VARCHAR(16) NOT NULL DEFAULT 'DRAFT',

    PRIMARY KEY (problemid),

    KEY idx_problems_groupid (groupid),
    KEY idx_problems_adduser (adduser),

    CONSTRAINT fk_problems_group
        FOREIGN KEY (groupid)
        REFERENCES `groups` (groupid),

    CONSTRAINT fk_problems_adduser
        FOREIGN KEY (adduser)
        REFERENCES users (userid),

    CONSTRAINT chk_problems_status
        CHECK (status IN ('DRAFT', 'READY'))
) ENGINE=InnoDB
DEFAULT CHARSET=utf8mb4
COLLATE=utf8mb4_unicode_ci;


-- 5. Problem sets
-- Optional start and end times
CREATE TABLE problemset (
    setid INT UNSIGNED NOT NULL AUTO_INCREMENT,
    groupid INT UNSIGNED NOT NULL,
    setname VARCHAR(200) NOT NULL,
    start_at DATETIME NULL,
    end_at DATETIME NULL,

    PRIMARY KEY (setid),

    KEY idx_problemset_groupid (groupid),

    CONSTRAINT fk_problemset_group
        FOREIGN KEY (groupid)
        REFERENCES `groups` (groupid),

    CONSTRAINT chk_problemset_time_range
        CHECK (
            start_at IS NULL
            OR end_at IS NULL
            OR start_at < end_at
        )
) ENGINE=InnoDB
DEFAULT CHARSET=utf8mb4
COLLATE=utf8mb4_unicode_ci;


-- 6. Problem set - Problem relationship (M:N)
CREATE TABLE problemset_problems (
    idx INT UNSIGNED NOT NULL AUTO_INCREMENT,
    setid INT UNSIGNED NOT NULL,
    problemid INT UNSIGNED NOT NULL,

    PRIMARY KEY (idx),

    UNIQUE KEY uq_problemset_problems_pair (setid, problemid),
    KEY idx_problemset_problems_problemid (problemid),

    CONSTRAINT fk_problemset_problems_set
        FOREIGN KEY (setid)
        REFERENCES problemset (setid),

    CONSTRAINT fk_problemset_problems_problem
        FOREIGN KEY (problemid)
        REFERENCES problems (problemid)
) ENGINE=InnoDB
DEFAULT CHARSET=utf8mb4
COLLATE=utf8mb4_unicode_ci;


-- 7. Submissions
CREATE TABLE submissions (
    submitid INT UNSIGNED NOT NULL AUTO_INCREMENT,
    problemid INT UNSIGNED NOT NULL,
    userid INT UNSIGNED NOT NULL,
    language VARCHAR(16) NOT NULL,
    source MEDIUMTEXT NOT NULL,
    status VARCHAR(16) NOT NULL DEFAULT 'PENDING',
    submitted_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (submitid),

    KEY idx_submissions_problem_time (problemid, submitted_at),
    KEY idx_submissions_userid (userid),

    CONSTRAINT fk_submissions_problem
        FOREIGN KEY (problemid)
        REFERENCES problems (problemid),

    CONSTRAINT fk_submissions_user
        FOREIGN KEY (userid)
        REFERENCES users (userid)
) ENGINE=InnoDB
DEFAULT CHARSET=utf8mb4
COLLATE=utf8mb4_unicode_ci;


-- Verify
SHOW TABLES;
