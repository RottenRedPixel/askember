-- SQL Queries to Check ember_supporting_media Table Structure
-- Run these queries in your Supabase SQL editor or database client

-- 1. Check if display_name column exists in the table
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'ember_supporting_media' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 2. Check the full table structure
\d ember_supporting_media;

-- 3. Alternative way to see all columns (if \d doesn't work)
SELECT 
    column_name,
    data_type,
    character_maximum_length,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'ember_supporting_media' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 4. Check if the specific failing record exists
SELECT * 
FROM ember_supporting_media 
WHERE id = '8e5808e3-ec8d-4a01-b2ad-d0a127ddf88d';

-- 5. Test if display_name column can be queried
SELECT id, file_name, display_name 
FROM ember_supporting_media 
WHERE id = '8e5808e3-ec8d-4a01-b2ad-d0a127ddf88d';

-- 6. Test the exact update query that's failing
UPDATE ember_supporting_media 
SET display_name = 'Test Display Name' 
WHERE id = '8e5808e3-ec8d-4a01-b2ad-d0a127ddf88d'
RETURNING *;

-- 7. Check if any records have display_name column populated
SELECT COUNT(*) as total_records,
       COUNT(display_name) as records_with_display_name,
       COUNT(CASE WHEN display_name IS NOT NULL THEN 1 END) as non_null_display_names
FROM ember_supporting_media;

-- 8. Sample of records to see current structure
SELECT * FROM ember_supporting_media LIMIT 3; 