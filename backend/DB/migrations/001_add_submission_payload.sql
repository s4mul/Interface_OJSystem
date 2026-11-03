USE oj_system;

-- Existing submissions predate source storage. Preserve them with explicit
-- legacy values; new submissions will store their actual language and source.
ALTER TABLE submissions
    ADD COLUMN language VARCHAR(16) NULL AFTER userid,
    ADD COLUMN source MEDIUMTEXT NULL AFTER language;

-- Include the primary key so this update also works with MySQL safe updates on.
UPDATE submissions
SET language = 'C++',
    source = '// Legacy submission: source was not stored.'
WHERE submitid > 0
  AND (language IS NULL OR source IS NULL);

ALTER TABLE submissions
    MODIFY COLUMN language VARCHAR(16) NOT NULL,
    MODIFY COLUMN source MEDIUMTEXT NOT NULL;
