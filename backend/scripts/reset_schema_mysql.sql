-- =============================================================================
-- Wipes application tables + alembic history in `team-task-board` (keeps DB & user)
-- Use when Alembic says "Can't locate revision ..." or you want a clean schema.
-- Then run: alembic upgrade head
-- =============================================================================
USE `team-task-board`;

SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS checklist_items;
DROP TABLE IF EXISTS task_labels;
DROP TABLE IF EXISTS task_assignees;
DROP TABLE IF EXISTS comments;
DROP TABLE IF EXISTS checklists;
DROP TABLE IF EXISTS tasks;
DROP TABLE IF EXISTS labels;
DROP TABLE IF EXISTS board_lists;
DROP TABLE IF EXISTS activity_logs;
DROP TABLE IF EXISTS meetings;
DROP TABLE IF EXISTS boards;
DROP TABLE IF EXISTS workspaces;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS alembic_version;

SET FOREIGN_KEY_CHECKS = 1;
