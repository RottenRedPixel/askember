-- Delete Old Story Cut: "Family Fun at Topgolf" (Version 1.0)
-- This script removes the old format story cut so a new enhanced version can be generated

-- STEP 1: Find the story cut to confirm it exists
SELECT 
    id,
    title,
    style,
    created_at,
    CASE 
        WHEN blocks::text LIKE '%"version": "1.0"%' THEN 'v1.0 (OLD FORMAT)'
        WHEN blocks::text LIKE '%"version": "2.0"%' THEN 'v2.0 (NEW FORMAT)'
        ELSE 'UNKNOWN VERSION'
    END as version_status,
    LENGTH(blocks::text) as blocks_size
FROM ember_story_cuts 
WHERE title = 'Family Fun at Topgolf' 
  AND style = 'story_style_podcast_narrative'
ORDER BY created_at DESC;

-- STEP 2: Show what will be deleted (safety check)
-- Uncomment the line below to see details before deletion:
-- SELECT * FROM ember_story_cuts WHERE title = 'Family Fun at Topgolf' AND style = 'story_style_podcast_narrative';

-- STEP 3: Delete the old story cut
-- WARNING: This will permanently delete the story cut!
DELETE FROM ember_story_cuts 
WHERE title = 'Family Fun at Topgolf' 
  AND style = 'story_style_podcast_narrative'
  AND blocks::text LIKE '%"version": "1.0"%';

-- STEP 4: Confirm deletion
SELECT 
    COUNT(*) as remaining_story_cuts_with_same_title,
    'Family Fun at Topgolf' as title_searched
FROM ember_story_cuts 
WHERE title = 'Family Fun at Topgolf';

-- Expected Results:
-- Before deletion: Should show 1 story cut with v1.0 (OLD FORMAT)
-- After deletion: Should show 0 remaining story cuts with same title
-- Ready for regeneration: New story cut will automatically use v2.0 (NEW FORMAT) 