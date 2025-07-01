-- Setup admin privileges for prompt management
-- This script ensures the current user has the necessary admin role

-- First, let's see who's currently authenticated
SELECT 
  'Current authenticated user:' as info,
  auth.uid() as user_id;

-- Check if the user already has a profile
SELECT 
  'Current user profile:' as info,
  user_id,
  role,
  first_name,
  last_name,
  created_at
FROM user_profiles 
WHERE user_id = auth.uid();

-- If no profile exists, create one with admin role
INSERT INTO user_profiles (user_id, role, first_name, last_name)
SELECT 
  auth.uid(),
  'super_admin',
  'Admin',
  'User'
WHERE auth.uid() IS NOT NULL 
  AND NOT EXISTS (
    SELECT 1 FROM user_profiles WHERE user_id = auth.uid()
  );

-- If profile exists but not admin, update to super_admin
UPDATE user_profiles 
SET role = 'super_admin',
    updated_at = NOW()
WHERE user_id = auth.uid() 
  AND role NOT IN ('admin', 'super_admin');

-- Verify the user now has admin privileges
SELECT 
  'Updated user profile:' as info,
  user_id,
  role,
  first_name,
  last_name,
  updated_at
FROM user_profiles 
WHERE user_id = auth.uid();

-- Test prompt access permissions
SELECT 
  'Prompt access test:' as info,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = auth.uid() AND role IN ('admin', 'super_admin')
    ) THEN 'ACCESS GRANTED - You can manage prompts'
    ELSE 'ACCESS DENIED - Admin role required'
  END as access_status; 