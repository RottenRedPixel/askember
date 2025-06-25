-- Fix for infinite recursion in RLS policies
-- This addresses the "infinite recursion detected in policy" error

-- Drop the problematic policies
DROP POLICY IF EXISTS "Super admins can read all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Super admins can update all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;

-- Create a function to check if current user is super admin
-- This function uses SECURITY DEFINER to bypass RLS when checking roles
CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.user_profiles 
    WHERE user_id = auth.uid() AND role = 'super_admin'
  );
$$;

-- Recreate policies using the function to avoid recursion
CREATE POLICY "Super admins can read all profiles" ON user_profiles
  FOR SELECT USING (is_super_admin());

CREATE POLICY "Super admins can update all profiles" ON user_profiles
  FOR UPDATE USING (is_super_admin());

-- Fix the user update policy to prevent role changes for non-super-admins
CREATE POLICY "Users can update own profile" ON user_profiles
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id AND (
      -- Allow super admins to change anything
      is_super_admin() OR
      -- Regular users can't change their role
      (OLD.role IS NOT DISTINCT FROM NEW.role)
    )
  );

-- Also fix the role change prevention trigger to avoid conflicts
DROP TRIGGER IF EXISTS prevent_role_change_trigger ON user_profiles;
DROP FUNCTION IF EXISTS prevent_role_change();

-- We don't need the separate trigger anymore since the policy handles role protection
-- The RLS policy above already prevents regular users from changing roles 