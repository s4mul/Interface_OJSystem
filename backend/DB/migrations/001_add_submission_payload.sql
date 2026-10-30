USE oj_system;

ALTER TABLE submissions
    ADD COLUMN language VARCHAR(16) NULL AFTER userid,
    ADD COLUMN source MEDIUMTEXT NULL AFTER language;

UPDATE submissions
SET language = 'C++',
    source = '// Legacy submission: source was not stored.'
WHERE language IS NULL OR source IS NULL;

ALTER TABLE submissions
    MODIFY COLUMN language VARCHAR(16) NOT NULL,
    MODIFY COLUMN source MEDIUMTEXT NOT NULL;
