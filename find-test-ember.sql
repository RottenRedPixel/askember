-- Find an existing ember to test the story feature
-- Run this as the ember owner to get a valid ember ID

-- Find embers owned by current user
SELECT 
  id,
  title,
  user_id,
  is_public,
  created_at,
  'owned_by_you' as access_type
FROM embers 
WHERE user_id = auth.uid()
ORDER BY created_at DESC
LIMIT 5;

-- If no owned embers, find public embers
-- SELECT 
--   id,
--   title,
--   user_id,
--   is_public,
--   created_at,
--   'public' as access_type
-- FROM embers 
-- WHERE is_public = true
-- ORDER BY created_at DESC
-- LIMIT 5; 