-- Debug why contributor doesn't have access to ember '14be13a7-74a3-42f6-a9e9-eeb0c76ca0b4'
-- Run these queries one by one to diagnose the issue

-- 1. Check current user's authentication details
SELECT 
  'Current User Info' as check_type,
  auth.uid() as current_user_id,
  auth.jwt() ->> 'email' as jwt_email,
  auth.jwt() -> 'user_metadata' as user_metadata;

-- 2. Check the ember details  
SELECT 
  'Ember Details' as check_type,
  id,
  title,
  user_id as owner_id,
  is_public,
  created_at
FROM embers 
WHERE id = '14be13a7-74a3-42f6-a9e9-eeb0c76ca0b4';

-- 3. Check if current user is the owner
SELECT 
  'Owner Check' as check_type,
  (e.user_id = auth.uid()) as is_owner,
  e.user_id as ember_owner_id,
  auth.uid() as current_user_id
FROM embers e
WHERE e.id = '14be13a7-74a3-42f6-a9e9-eeb0c76ca0b4';

-- 4. Check if ember is public
SELECT 
  'Public Check' as check_type,
  is_public,
  CASE WHEN is_public THEN 'Has public access' ELSE 'No public access' END as public_access_status
FROM embers 
WHERE id = '14be13a7-74a3-42f6-a9e9-eeb0c76ca0b4';

-- 5. Check ALL ember_shares for this ember (regardless of user)
SELECT 
  'All Shares for Ember' as check_type,
  es.*
FROM ember_shares es
WHERE es.ember_id = '14be13a7-74a3-42f6-a9e9-eeb0c76ca0b4';

-- 6. Check shares specifically for current user's email
SELECT 
  'User Email Match Check' as check_type,
  es.*,
  (es.shared_with_email = auth.jwt() ->> 'email') as email_matches,
  auth.jwt() ->> 'email' as current_jwt_email,
  es.shared_with_email as share_email
FROM ember_shares es
WHERE es.ember_id = '14be13a7-74a3-42f6-a9e9-eeb0c76ca0b4';

-- 7. Check shares with active status and expiration
SELECT 
  'Share Status Check' as check_type,
  es.*,
  es.is_active,
  es.expires_at,
  (es.expires_at IS NULL OR es.expires_at > now()) as not_expired,
  now() as current_time
FROM ember_shares es
WHERE es.ember_id = '14be13a7-74a3-42f6-a9e9-eeb0c76ca0b4';

-- 8. Test the complete shared access condition
SELECT 
  'Complete Share Access Test' as check_type,
  EXISTS (
    SELECT 1 FROM ember_shares es
    WHERE es.ember_id = '14be13a7-74a3-42f6-a9e9-eeb0c76ca0b4'
    AND es.shared_with_email = auth.jwt() ->> 'email'
    AND es.is_active = true
    AND (es.expires_at IS NULL OR es.expires_at > now())
  ) as has_shared_access,
  auth.jwt() ->> 'email' as checking_email;

-- 9. Break down each condition of the policy check
SELECT 
  'Policy Breakdown' as check_type,
  -- Owner check
  EXISTS (
    SELECT 1 FROM embers e 
    WHERE e.id = '14be13a7-74a3-42f6-a9e9-eeb0c76ca0b4' 
    AND e.user_id = auth.uid()
  ) as is_owner,
  -- Public check  
  EXISTS (
    SELECT 1 FROM embers e 
    WHERE e.id = '14be13a7-74a3-42f6-a9e9-eeb0c76ca0b4' 
    AND e.is_public = true
  ) as is_public,
  -- Shared access check
  EXISTS (
    SELECT 1 FROM ember_shares es
    WHERE es.ember_id = '14be13a7-74a3-42f6-a9e9-eeb0c76ca0b4'
    AND es.shared_with_email = auth.jwt() ->> 'email'
    AND es.is_active = true
    AND (es.expires_at IS NULL OR es.expires_at > now())
  ) as has_shared_access;

-- 10. Final combined policy test (should match the original result)
SELECT 
  'Final Policy Test' as check_type,
  EXISTS (
    SELECT 1 FROM embers e
    WHERE e.id = '14be13a7-74a3-42f6-a9e9-eeb0c76ca0b4'
    AND (
      e.user_id = auth.uid() OR 
      e.is_public = true OR 
      EXISTS (
        SELECT 1 FROM ember_shares es
        WHERE es.ember_id = e.id 
        AND es.shared_with_email = auth.jwt() ->> 'email'
        AND es.is_active = true
        AND (es.expires_at IS NULL OR es.expires_at > now())
      )
    )
  ) as has_access; 