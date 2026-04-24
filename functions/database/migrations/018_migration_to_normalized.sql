-- Migration Script: From Current Schema to Normalized Schema
-- This script helps migrate data from the existing schema to the normalized version

-- ============================================================================
-- STEP 1: Create lookup tables and populate with existing data
-- ============================================================================

-- Create and populate countries table
INSERT IGNORE INTO countries (code, name) 
SELECT DISTINCT 
    CASE 
        WHEN country = 'Philippines' THEN 'PH'
        WHEN country = 'United States' THEN 'US'
        WHEN country = 'Canada' THEN 'CA'
        WHEN country = 'Australia' THEN 'AU'
        WHEN country = 'United Kingdom' THEN 'UK'
        ELSE 'XX'
    END as code,
    COALESCE(country, 'Unknown') as name
FROM users 
WHERE country IS NOT NULL AND country != ''
UNION
SELECT DISTINCT 
    CASE 
        WHEN country = 'Philippines' THEN 'PH'
        WHEN country = 'United States' THEN 'US'
        WHEN country = 'Canada' THEN 'CA'
        WHEN country = 'Australia' THEN 'AU'
        WHEN country = 'United Kingdom' THEN 'UK'
        ELSE 'XX'
    END as code,
    COALESCE(country, 'Philippines') as name
FROM property_locations 
WHERE country IS NOT NULL AND country != '';

-- ============================================================================
-- STEP 2: Migrate file information to files table
-- ============================================================================

-- Migrate avatar URLs from users table
INSERT INTO files (file_url, file_name, file_size, mime_type, uploaded_by, uploaded_at)
SELECT DISTINCT
    avatar_url,
    SUBSTRING_INDEX(avatar_url, '/', -1) as file_name,
    0 as file_size, -- Size unknown from existing data
    'image/jpeg' as mime_type, -- Assume JPEG for avatars
    id as uploaded_by,
    created_at as uploaded_at
FROM users 
WHERE avatar_url IS NOT NULL AND avatar_url != '';

-- Migrate house rules files from landlord_profiles
INSERT INTO files (file_url, file_name, file_size, mime_type, uploaded_by, uploaded_at)
SELECT DISTINCT
    lp.house_rules_file_url,
    lp.house_rules_file_name,
    COALESCE(lp.house_rules_file_size, 0),
    'application/pdf' as mime_type, -- Assume PDF for house rules
    lp.user_id as uploaded_by,
    lp.created_at as uploaded_at
FROM landlord_profiles lp
WHERE lp.house_rules_file_url IS NOT NULL AND lp.house_rules_file_url != '';

-- Migrate verification documents
INSERT INTO files (file_url, file_name, file_size, mime_type, uploaded_by, uploaded_at)
SELECT 
    lvd.file_url,
    lvd.file_name,
    lvd.file_size,
    lvd.mime_type,
    lvd.user_id as uploaded_by,
    lvd.uploaded_at
FROM landlord_verification_documents lvd;

-- ============================================================================
-- STEP 3: Migrate address information to addresses table
-- ============================================================================

-- Migrate addresses from properties table
INSERT INTO addresses (address_line_1, city, province, country_id, latitude, longitude, created_at, updated_at)
SELECT DISTINCT
    p.address as address_line_1,
    'Unknown' as city, -- Extract from address if possible
    'Unknown' as province, -- Extract from address if possible
    COALESCE(c.id, 1) as country_id, -- Default to Philippines
    p.latitude,
    p.longitude,
    p.created_at,
    p.updated_at
FROM properties p
LEFT JOIN countries c ON c.name = 'Philippines'
WHERE p.address IS NOT NULL;

-- Migrate addresses from property_locations table
INSERT INTO addresses (address_line_1, address_line_2, city, province, postal_code, country_id, latitude, longitude, created_at, updated_at)
SELECT DISTINCT
    COALESCE(pl.address_line_1, 'Unknown') as address_line_1,
    pl.address_line_2,
    COALESCE(pl.city, 'Unknown') as city,
    COALESCE(pl.province, 'Unknown') as province,
    pl.postal_code,
    COALESCE(c.id, 1) as country_id,
    pl.latitude,
    pl.longitude,
    pl.created_at,
    pl.updated_at
FROM property_locations pl
LEFT JOIN countries c ON c.name = COALESCE(pl.country, 'Philippines');

-- ============================================================================
-- STEP 4: Create temporary mapping tables for data migration
-- ============================================================================

-- Temporary table to map old user data to new structure
CREATE TEMPORARY TABLE temp_user_mapping AS
SELECT 
    u.id as old_user_id,
    u.id as new_user_id,
    ur.id as role_id,
    c.id as country_id,
    acs.id as account_status_id,
    f.id as avatar_file_id
FROM users u
LEFT JOIN user_roles ur ON ur.role_name = u.role
LEFT JOIN countries c ON c.name = COALESCE(u.country, 'Philippines')
LEFT JOIN account_statuses acs ON acs.status_name = u.account_status
LEFT JOIN files f ON f.file_url = u.avatar_url AND f.uploaded_by = u.id;

-- Temporary table to map properties to addresses
CREATE TEMPORARY TABLE temp_property_address_mapping AS
SELECT 
    p.id as property_id,
    a.id as address_id
FROM properties p
JOIN addresses a ON (
    (a.latitude = p.latitude AND a.longitude = p.longitude) OR
    (a.address_line_1 = p.address)
)
WHERE a.id = (
    SELECT MIN(a2.id) 
    FROM addresses a2 
    WHERE (a2.latitude = p.latitude AND a2.longitude = p.longitude) OR
          (a2.address_line_1 = p.address)
);

-- ============================================================================
-- STEP 5: Update existing tables with normalized references
-- ============================================================================

-- Update users table with normalized foreign keys
UPDATE users u
JOIN temp_user_mapping tum ON u.id = tum.old_user_id
SET 
    u.role_id = tum.role_id,
    u.country_id = tum.country_id,
    u.account_status_id = tum.account_status_id,
    u.avatar_file_id = tum.avatar_file_id;

-- Update properties table with address references
UPDATE properties p
JOIN temp_property_address_mapping tpam ON p.id = tpam.property_id
SET p.address_id = tpam.address_id;

-- Update landlord_profiles with normalized references
UPDATE landlord_profiles lp
JOIN property_types pt ON pt.type_name = lp.property_type
SET lp.property_type_id = pt.id;

UPDATE landlord_profiles lp
JOIN files f ON f.file_url = lp.house_rules_file_url AND f.uploaded_by = lp.user_id
SET lp.house_rules_file_id = f.id
WHERE lp.house_rules_file_url IS NOT NULL;

-- Update payment_methods with normalized references
UPDATE payment_methods pm
JOIN payment_method_types pmt ON pmt.method_name = pm.method_type
SET pm.payment_method_type_id = pmt.id;

-- ============================================================================
-- STEP 6: Migrate verification data to normalized structure
-- ============================================================================

-- Migrate user verification records
INSERT INTO verification_records (entity_type, entity_id, verification_status_id, notes, created_at, updated_at)
SELECT 
    'user' as entity_type,
    u.id as entity_id,
    vs.id as verification_status_id,
    u.verification_notes as notes,
    u.created_at,
    u.updated_at
FROM users u
JOIN verification_statuses vs ON vs.status_name = COALESCE(u.verification_status, 'pending')
WHERE u.verification_status IS NOT NULL;

-- Migrate landlord profile verification records
INSERT INTO verification_records (entity_type, entity_id, verification_status_id, submitted_at, reviewed_at, reviewed_by, notes, created_at, updated_at)
SELECT 
    'landlord_profile' as entity_type,
    lp.id as entity_id,
    vs.id as verification_status_id,
    lp.verification_submitted_at,
    lp.verification_reviewed_at,
    lp.verification_reviewed_by,
    lp.verification_notes,
    lp.created_at,
    lp.updated_at
FROM landlord_profiles lp
JOIN verification_statuses vs ON vs.status_name = lp.verification_status;

-- ============================================================================
-- STEP 7: Migrate documents to normalized structure
-- ============================================================================

-- Migrate landlord verification documents
INSERT INTO documents (entity_type, entity_id, document_type_id, file_id, upload_status, rejection_reason, uploaded_at, verified_at, verified_by)
SELECT 
    'user' as entity_type,
    lvd.user_id as entity_id,
    dt.id as document_type_id,
    f.id as file_id,
    lvd.upload_status,
    lvd.rejection_reason,
    lvd.uploaded_at,
    lvd.verified_at,
    lvd.verified_by
FROM landlord_verification_documents lvd
JOIN document_types dt ON dt.type_name = lvd.document_type
JOIN files f ON f.file_url = lvd.file_url AND f.uploaded_by = lvd.user_id;

-- ============================================================================
-- STEP 8: Migrate amenities to normalized structure
-- ============================================================================

-- Migrate property amenities
INSERT IGNORE INTO amenities (amenity_name, category)
SELECT DISTINCT 
    pa.amenity_name,
    'general' as category
FROM property_amenities pa;

-- Update property_amenities junction table
INSERT INTO property_amenities (property_id, amenity_id, created_at)
SELECT 
    pa_old.property_id,
    a.id as amenity_id,
    pa_old.created_at
FROM property_amenities pa_old  -- This references the old table structure
JOIN amenities a ON a.amenity_name = pa_old.amenity_name
ON DUPLICATE KEY UPDATE created_at = pa_old.created_at;

-- ============================================================================
-- STEP 9: Update message attachments to use files table
-- ============================================================================

-- Update message_attachments to reference files table
UPDATE message_attachments ma
JOIN files f ON f.file_url = ma.file_url AND f.uploaded_by = ma.uploaded_by
SET ma.file_id = f.id;

-- ============================================================================
-- STEP 10: Clean up temporary tables
-- ============================================================================

DROP TEMPORARY TABLE IF EXISTS temp_user_mapping;
DROP TEMPORARY TABLE IF EXISTS temp_property_address_mapping;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Verify data migration
SELECT 'Users migrated' as check_name, COUNT(*) as count FROM users;
SELECT 'Addresses created' as check_name, COUNT(*) as count FROM addresses;
SELECT 'Files migrated' as check_name, COUNT(*) as count FROM files;
SELECT 'Verification records created' as check_name, COUNT(*) as count FROM verification_records;
SELECT 'Documents migrated' as check_name, COUNT(*) as count FROM documents;
SELECT 'Amenities normalized' as check_name, COUNT(*) as count FROM amenities;

-- Check for any unmapped data
SELECT 'Users without role_id' as issue, COUNT(*) as count FROM users WHERE role_id IS NULL;
SELECT 'Properties without address_id' as issue, COUNT(*) as count FROM properties WHERE address_id IS NULL;
SELECT 'Landlord profiles without property_type_id' as issue, COUNT(*) as count FROM landlord_profiles WHERE property_type_id IS NULL;

-- ============================================================================
-- NOTES FOR MANUAL REVIEW
-- ============================================================================

/*
MANUAL STEPS REQUIRED AFTER RUNNING THIS MIGRATION:

1. Review and update any application code that references the old column names
2. Update any views or stored procedures that depend on the old structure
3. Test all functionality to ensure data integrity
4. Consider dropping old columns after confirming everything works:
   - users.role, users.country, users.account_status, users.avatar_url, users.verification_status, users.verification_notes
   - properties.address, properties.latitude, properties.longitude
   - landlord_profiles.property_type, landlord_profiles.house_rules_file_*
   - payment_methods.method_type
   - message_attachments.file_url, file_name, file_type, file_size, uploaded_by

5. Drop old tables that are no longer needed:
   - property_locations (data migrated to addresses)
   - landlord_verification_documents (data migrated to documents)
   - landlord_verification_log (replaced by verification_log)

6. Update application configuration to use the new normalized structure
7. Run performance tests to ensure indexes are optimized
8. Update backup and maintenance scripts
*/