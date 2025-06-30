-- Debug SQL to test story conversation RLS policies
-- Run this to understand why contributors can't create story conversations

-- First, let's see what the current user's JWT contains
SELECT 
  auth.uid() as current_user_id,
  auth.jwt() ->> 'email' as jwt_email,
  auth.jwt() -> 'user_metadata' as user_metadata;

-- Check if there are any ember_shares records for the current user
SELECT 
  es.*,
  e.title as ember_title,
  e.user_id as ember_owner_id
FROM ember_shares es
JOIN embers e ON es.ember_id = e.id
WHERE es.shared_with_email = auth.jwt() ->> 'email';

-- Check what embers the current user has access to (should include shared ones)
SELECT 
  e.id,
  e.title,
  e.user_id as owner_id,
  'own' as access_type
FROM embers e 
WHERE e.user_id = auth.uid()

UNION

SELECT 
  e.id,
  e.title,
  e.user_id as owner_id,
  'shared' as access_type
FROM embers e
WHERE EXISTS (
  SELECT 1 FROM ember_shares es
  WHERE es.ember_id = e.id 
  AND es.shared_with_email = auth.jwt() ->> 'email'
  AND es.is_active = true
  AND (es.expires_at IS NULL OR es.expires_at > now())
);

-- Test the exact condition from the RLS policy for a specific ember
-- Replace 'YOUR_EMBER_ID_HERE' with the actual ember ID
SELECT 
  'Policy Check Result' as test_name,
  EXISTS (
    SELECT 1 FROM public.embers e
    WHERE e.id = 'YOUR_EMBER_ID_HERE'  -- Replace with actual ember ID
    AND (
      e.user_id = auth.uid() OR -- Own ember
      e.is_public = true OR -- Public ember
      EXISTS (
        SELECT 1 FROM public.ember_shares es
        WHERE es.ember_id = e.id 
        AND es.shared_with_email = auth.jwt() ->> 'email'
        AND es.is_active = true
        AND (es.expires_at IS NULL OR es.expires_at > now())
      ) -- Shared ember
    )
  ) as has_access;

-- Check existing story conversations for this ember
-- Replace 'YOUR_EMBER_ID_HERE' with the actual ember ID
SELECT 
  esc.*,
  up.first_name,
  up.last_name
FROM ember_story_conversations esc
LEFT JOIN user_profiles up ON esc.user_id = up.user_id
WHERE esc.ember_id = 'YOUR_EMBER_ID_HERE';  -- Replace with actual ember ID 