CREATE DATABASE IF NOT EXISTS oj_system
CHARACTER SET utf8mb4
COLLATE utf8mb4_unicode_ci;

CREATE USER IF NOT EXISTS 'oj_app'@'127.0.0.1'
IDENTIFIED BY 'interface1!';

GRANT SELECT, INSERT, UPDATE, DELETE
ON oj_system.*
TO 'oj_app'@'127.0.0.1';

select User, Host
From mysql.user
where User = 'oj_app';
