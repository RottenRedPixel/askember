-- Delete only the story cut style prompts (keeps the main story_cut_generator prompt)
-- This will empty the story style dropdown in the Story Cuts creator

-- First, show which story styles will be deleted
SELECT 
  id,
  name,
  prompt_key,
  description,
  is_active
FROM prompts 
WHERE category = 'story_cuts' 
  AND subcategory = 'styles'
ORDER BY name;

-- Delete the story cut style prompts
DELETE FROM prompts 
WHERE category = 'story_cuts' 
  AND subcategory = 'styles';

-- Verify deletion - should show remaining prompts (main generator should still exist)
SELECT 
  category,
  subcategory,
  COUNT(*) as remaining_count
FROM prompts 
GROUP BY category, subcategory
ORDER BY category, subcategory; 