-- Direct deletion of all prompts (no safety checks)
-- WARNING: This immediately deletes ALL prompts

DELETE FROM prompts;

-- Check that table is now empty
SELECT COUNT(*) as remaining_prompts FROM prompts; 