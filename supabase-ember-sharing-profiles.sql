-- Function to get user profiles for ember sharing
-- This allows users to see basic profile info (name, avatar) of people they share embers with
CREATE OR REPLACE FUNCTION get_ember_participant_profiles(ember_uuid UUID)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  email TEXT,
  first_name TEXT,
  last_name TEXT,
  avatar_url TEXT,
  role TEXT,
  is_owner BOOLEAN
) 
SECURITY DEFINER
AS $$
BEGIN
  -- Check if the current user has access to this ember
  IF NOT EXISTS (
    SELECT 1 FROM embers 
    WHERE embers.id = ember_uuid 
    AND (
      embers.user_id = auth.uid() OR 
      embers.is_public = true OR
      EXISTS (
        SELECT 1 FROM ember_shares 
        WHERE ember_shares.ember_id = ember_uuid 
        AND ember_shares.shared_with_email = auth.jwt() ->> 'email'
        AND ember_shares.is_active = true
        AND (ember_shares.expires_at IS NULL OR ember_shares.expires_at > now())
      )
    )
  ) THEN
    RAISE EXCEPTION 'Access denied. You do not have permission to view this ember.';
  END IF;

  -- Return owner profile
  RETURN QUERY
  SELECT 
    up.id,
    up.user_id,
    COALESCE(au.email::TEXT, 'Owner') as email,
    up.first_name,
    up.last_name,
    up.avatar_url,
    up.role,
    true as is_owner
  FROM embers e
  LEFT JOIN user_profiles up ON e.user_id = up.user_id
  LEFT JOIN auth.users au ON e.user_id = au.id
  WHERE e.id = ember_uuid;

  -- Return shared user profiles
  RETURN QUERY
  SELECT 
    up.id,
    up.user_id,
    es.shared_with_email as email,
    up.first_name,
    up.last_name,
    up.avatar_url,
    es.permission_level as role,
    false as is_owner
  FROM ember_shares es
  LEFT JOIN auth.users au ON es.shared_with_email = au.email
  LEFT JOIN user_profiles up ON au.id = up.user_id
  WHERE es.ember_id = ember_uuid 
  AND es.is_active = true
  AND (es.expires_at IS NULL OR es.expires_at > now());
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_ember_participant_profiles(UUID) TO authenticated; 