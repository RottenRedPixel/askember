-- Script to delete all prompt data from the prompts table
-- WARNING: This will permanently delete ALL prompts in the database
-- Make sure you have a backup if needed

-- First, show current prompt count
SELECT 
  COUNT(*) as total_prompts,
  COUNT(CASE WHEN is_active = true THEN 1 END) as active_prompts,
  COUNT(CASE WHEN is_active = false THEN 1 END) as inactive_prompts
FROM prompts;

-- Show all prompts that will be deleted
SELECT 
  id,
  name,
  category,
  subcategory,
  prompt_key,
  is_active,
  created_at
FROM prompts
ORDER BY category, subcategory, name;

-- UNCOMMENT THE LINE BELOW TO ACTUALLY DELETE ALL PROMPTS
-- DELETE FROM prompts;

-- Verify deletion (should return 0 rows)
-- SELECT COUNT(*) as remaining_prompts FROM prompts;

-- Instructions:
-- 1. Run the SELECT statements above to see what will be deleted
-- 2. If you're sure you want to delete everything, uncomment the DELETE line
-- 3. Run the final SELECT to confirm deletion was successful 