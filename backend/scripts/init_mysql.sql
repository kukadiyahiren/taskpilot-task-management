-- =============================================================================
-- Task Pilot — MySQL database + app user (matches default .env MYSQL_* vars)
-- =============================================================================
--   sudo mysql < scripts/init_mysql.sql
--   mysql -u root -p < scripts/init_mysql.sql
--
-- Default app user: teamtask / password  (override in .env MYSQL_USER / MYSQL_PASSWORD)
-- =============================================================================

CREATE DATABASE IF NOT EXISTS `team-task-board`
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

DROP USER IF EXISTS 'teamtask'@'localhost';
DROP USER IF EXISTS 'teamtask'@'127.0.0.1';
DROP USER IF EXISTS 'teamtask'@'%';

CREATE USER 'teamtask'@'localhost' IDENTIFIED BY 'password';
CREATE USER 'teamtask'@'127.0.0.1' IDENTIFIED BY 'password';
CREATE USER 'teamtask'@'%' IDENTIFIED BY 'password';

GRANT ALL PRIVILEGES ON `team-task-board`.* TO 'teamtask'@'localhost';
GRANT ALL PRIVILEGES ON `team-task-board`.* TO 'teamtask'@'127.0.0.1';
GRANT ALL PRIVILEGES ON `team-task-board`.* TO 'teamtask'@'%';

FLUSH PRIVILEGES;
