-- Remove v_users_legacy view
-- Migration: Remove v_users_legacy view from the database

-- Drop v_users_legacy view if it exists
SET @sql = (SELECT IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.VIEWS 
     WHERE TABLE_SCHEMA = DATABASE() 
     AND TABLE_NAME = 'v_users_legacy') > 0,
    'DROP VIEW IF EXISTS v_users_legacy',
    'SELECT "View v_users_legacy does not exist" as message'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
