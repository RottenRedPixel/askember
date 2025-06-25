-- Create a function to get user profiles with email for admins
CREATE OR REPLACE FUNCTION get_user_profiles_with_email()
RETURNS TABLE (
  id UUID,
  user_id UUID,
  role TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  email TEXT,
  auth_created_at TIMESTAMPTZ,
  last_sign_in_at TIMESTAMPTZ
) 
SECURITY DEFINER
AS $$
BEGIN
  -- Check if the current user is a super admin
  IF NOT EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE user_profiles.user_id = auth.uid() 
    AND user_profiles.role = 'super_admin'
  ) THEN
    RAISE EXCEPTION 'Access denied. Super admin role required.';
  END IF;

  -- Return user profiles with email data
  RETURN QUERY
  SELECT 
    up.id,
    up.user_id,
    up.role,
    up.created_at,
    up.updated_at,
    COALESCE(au.email::TEXT, 'No email') as email,
    au.created_at as auth_created_at,
    au.last_sign_in_at
  FROM user_profiles up
  LEFT JOIN auth.users au ON up.user_id = au.id
  ORDER BY up.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_user_profiles_with_email() TO authenticated; 