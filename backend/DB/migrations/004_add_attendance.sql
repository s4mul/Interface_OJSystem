USE oj_system;

CREATE TABLE attendance (
    
    userid INT UNSIGNED NOT NULL AUTO_INCREMENT,
    username VARCHAR(100) NOT NULL,

    PRIMARY KEY (userid),
    UNIQUE KEY (username)
) ENGINE=InnoDB
DEFAULT CHARSET=utf8mb4
COLLATE=utf8mb4_unicode_ci;