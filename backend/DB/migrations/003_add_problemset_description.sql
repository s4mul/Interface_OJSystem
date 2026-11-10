SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Allow the description backfill to run on databases that already applied 003.
SET @problemset_description_ddl = IF(
    EXISTS (
        SELECT 1 FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'problemset'
          AND COLUMN_NAME = 'description'
    ),
    'DO 0',
    'ALTER TABLE problemset ADD COLUMN description TEXT NULL AFTER setname'
);
PREPARE add_problemset_description FROM @problemset_description_ddl;
EXECUTE add_problemset_description;
DEALLOCATE PREPARE add_problemset_description;

-- Fill missing descriptions only for the four problem sets in dummy.sql.
UPDATE problemset AS ps
JOIN user_groups AS g ON g.groupid = ps.groupid
JOIN (
    SELECT 'A' AS groupname, 'A 기본 연습' AS setname,
           '두 정수의 합과 차를 구하고, 두 수 중 큰 값을 찾는 연습입니다.' AS description
    UNION ALL SELECT 'A', 'A 추가 연습', '두 정수 중 작은 값을 찾는 연습입니다.'
    UNION ALL SELECT 'B', 'B 기본 연습', '두 정수의 곱과 나눗셈의 몫, 나머지를 구하는 연습입니다.'
    UNION ALL SELECT 'B', 'B 추가 연습', '입력받은 정수의 제곱을 구하는 연습입니다.'
) AS dummy ON dummy.groupname = g.groupname AND dummy.setname = ps.setname
SET ps.description = dummy.description
WHERE ps.setid > 0
  AND ps.description IS NULL;
