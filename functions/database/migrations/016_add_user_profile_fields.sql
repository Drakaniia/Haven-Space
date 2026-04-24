-- Add extended profile fields to users table
-- Migration: Add user profile fields for settings page

-- Add phone column only if it doesn't exist
SET @sql = (SELECT IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
     WHERE TABLE_SCHEMA = DATABASE() 
     AND TABLE_NAME = 'users' 
     AND COLUMN_NAME = 'phone') = 0,
    'ALTER TABLE users ADD COLUMN phone VARCHAR(20) NULL AFTER email',
    'SELECT "Column phone already exists" as message'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add other columns only if they don't exist
SET @sql = (SELECT IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
     WHERE TABLE_SCHEMA = DATABASE() 
     AND TABLE_NAME = 'users' 
     AND COLUMN_NAME = 'alt_phone') = 0,
    'ALTER TABLE users ADD COLUMN alt_phone VARCHAR(20) NULL AFTER phone',
    'SELECT "Column alt_phone already exists" as message'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = (SELECT IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
     WHERE TABLE_SCHEMA = DATABASE() 
     AND TABLE_NAME = 'users' 
     AND COLUMN_NAME = 'date_of_birth') = 0,
    'ALTER TABLE users ADD COLUMN date_of_birth DATE NULL AFTER alt_phone',
    'SELECT "Column date_of_birth already exists" as message'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = (SELECT IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
     WHERE TABLE_SCHEMA = DATABASE() 
     AND TABLE_NAME = 'users' 
     AND COLUMN_NAME = 'gender') = 0,
    'ALTER TABLE users ADD COLUMN gender ENUM(\'male\', \'female\', \'other\', \'prefer-not-to-say\') NULL AFTER date_of_birth',
    'SELECT "Column gender already exists" as message'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = (SELECT IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
     WHERE TABLE_SCHEMA = DATABASE() 
     AND TABLE_NAME = 'users' 
     AND COLUMN_NAME = 'bio') = 0,
    'ALTER TABLE users ADD COLUMN bio TEXT NULL AFTER gender',
    'SELECT "Column bio already exists" as message'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = (SELECT IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
     WHERE TABLE_SCHEMA = DATABASE() 
     AND TABLE_NAME = 'users' 
     AND COLUMN_NAME = 'current_address') = 0,
    'ALTER TABLE users ADD COLUMN current_address TEXT NULL AFTER bio',
    'SELECT "Column current_address already exists" as message'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = (SELECT IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
     WHERE TABLE_SCHEMA = DATABASE() 
     AND TABLE_NAME = 'users' 
     AND COLUMN_NAME = 'employment_status') = 0,
    'ALTER TABLE users ADD COLUMN employment_status ENUM(\'employed\', \'student\', \'self-employed\', \'unemployed\', \'retired\') NULL AFTER current_address',
    'SELECT "Column employment_status already exists" as message'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = (SELECT IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
     WHERE TABLE_SCHEMA = DATABASE() 
     AND TABLE_NAME = 'users' 
     AND COLUMN_NAME = 'company_name') = 0,
    'ALTER TABLE users ADD COLUMN company_name VARCHAR(255) NULL AFTER employment_status',
    'SELECT "Column company_name already exists" as message'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = (SELECT IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
     WHERE TABLE_SCHEMA = DATABASE() 
     AND TABLE_NAME = 'users' 
     AND COLUMN_NAME = 'job_title') = 0,
    'ALTER TABLE users ADD COLUMN job_title VARCHAR(255) NULL AFTER company_name',
    'SELECT "Column job_title already exists" as message'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = (SELECT IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
     WHERE TABLE_SCHEMA = DATABASE() 
     AND TABLE_NAME = 'users' 
     AND COLUMN_NAME = 'monthly_income') = 0,
    'ALTER TABLE users ADD COLUMN monthly_income ENUM(\'below-15k\', \'15k-30k\', \'30k-50k\', \'50k-100k\', \'above-100k\') NULL AFTER job_title',
    'SELECT "Column monthly_income already exists" as message'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = (SELECT IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
     WHERE TABLE_SCHEMA = DATABASE() 
     AND TABLE_NAME = 'users' 
     AND COLUMN_NAME = 'work_schedule') = 0,
    'ALTER TABLE users ADD COLUMN work_schedule ENUM(\'day-shift\', \'night-shift\', \'flexible\', \'part-time\') NULL AFTER monthly_income',
    'SELECT "Column work_schedule already exists" as message'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = (SELECT IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
     WHERE TABLE_SCHEMA = DATABASE() 
     AND TABLE_NAME = 'users' 
     AND COLUMN_NAME = 'company_address') = 0,
    'ALTER TABLE users ADD COLUMN company_address TEXT NULL AFTER work_schedule',
    'SELECT "Column company_address already exists" as message'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = (SELECT IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
     WHERE TABLE_SCHEMA = DATABASE() 
     AND TABLE_NAME = 'users' 
     AND COLUMN_NAME = 'emergency_contact_name') = 0,
    'ALTER TABLE users ADD COLUMN emergency_contact_name VARCHAR(255) NULL AFTER company_address',
    'SELECT "Column emergency_contact_name already exists" as message'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = (SELECT IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
     WHERE TABLE_SCHEMA = DATABASE() 
     AND TABLE_NAME = 'users' 
     AND COLUMN_NAME = 'emergency_contact_relationship') = 0,
    'ALTER TABLE users ADD COLUMN emergency_contact_relationship ENUM(\'parent\', \'sibling\', \'spouse\', \'guardian\', \'friend\', \'relative\', \'other\') NULL AFTER emergency_contact_name',
    'SELECT "Column emergency_contact_relationship already exists" as message'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = (SELECT IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
     WHERE TABLE_SCHEMA = DATABASE() 
     AND TABLE_NAME = 'users' 
     AND COLUMN_NAME = 'emergency_contact_phone') = 0,
    'ALTER TABLE users ADD COLUMN emergency_contact_phone VARCHAR(20) NULL AFTER emergency_contact_relationship',
    'SELECT "Column emergency_contact_phone already exists" as message'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = (SELECT IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
     WHERE TABLE_SCHEMA = DATABASE() 
     AND TABLE_NAME = 'users' 
     AND COLUMN_NAME = 'emergency_contact_alt_phone') = 0,
    'ALTER TABLE users ADD COLUMN emergency_contact_alt_phone VARCHAR(20) NULL AFTER emergency_contact_phone',
    'SELECT "Column emergency_contact_alt_phone already exists" as message'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = (SELECT IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
     WHERE TABLE_SCHEMA = DATABASE() 
     AND TABLE_NAME = 'users' 
     AND COLUMN_NAME = 'emergency_contact_address') = 0,
    'ALTER TABLE users ADD COLUMN emergency_contact_address TEXT NULL AFTER emergency_contact_alt_phone',
    'SELECT "Column emergency_contact_address already exists" as message'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;