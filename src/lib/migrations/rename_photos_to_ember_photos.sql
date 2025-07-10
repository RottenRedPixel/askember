-- Migration: Rename photos table to ember_photos
-- This maintains consistency with ember_* naming convention for all ember-related tables
-- Date: 2024-01-XX
-- Version: 1.0.138+

BEGIN;

-- Step 1: Rename the main table
ALTER TABLE photos RENAME TO ember_photos;

-- Step 2: Rename any indexes that reference the old table name
-- Note: PostgreSQL automatically renames most indexes, but we'll be explicit about important ones
-- Check existing indexes first:
-- SELECT indexname FROM pg_indexes WHERE tablename = 'ember_photos';

-- Step 3: Update any foreign key constraint names if they exist
-- List all constraints for the table:
-- SELECT constraint_name, constraint_type FROM information_schema.table_constraints 
-- WHERE table_name = 'ember_photos';

-- Step 4: Update any sequences if they exist
-- ALTER SEQUENCE photos_id_seq RENAME TO ember_photos_id_seq;

-- Step 5: Update any triggers if they exist
-- Check for triggers:
-- SELECT trigger_name FROM information_schema.triggers WHERE event_object_table = 'ember_photos';

-- Step 6: Add comment to document the change
COMMENT ON TABLE ember_photos IS 'Ember photo storage and metadata (renamed from photos for consistency)';

-- Step 7: Verify the rename was successful
-- This will show the table exists with the new name
SELECT COUNT(*) as total_photos FROM ember_photos;

COMMIT;

-- Rollback instructions (if needed):
-- BEGIN;
-- ALTER TABLE ember_photos RENAME TO photos;
-- COMMENT ON TABLE photos IS 'Photo storage and metadata';
-- COMMIT; 