-- Migration: Create public ember access function
-- This allows unauthenticated users to access embers for sharing

-- Create or replace the function to get public ember data
CREATE OR REPLACE FUNCTION get_public_ember(ember_uuid UUID)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  image_url TEXT,
  title TEXT,
  location_name TEXT,
  location_latitude DOUBLE PRECISION,
  location_longitude DOUBLE PRECISION,
  taken_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE,
  image_analysis TEXT,
  is_public BOOLEAN,
  primary_story_cut_id UUID
)
LANGUAGE plpgsql
SECURITY DEFINER -- This allows the function to bypass RLS
AS $$
BEGIN
  -- Return ember data without any authentication checks
  RETURN QUERY
  SELECT 
    e.id,
    e.user_id,
    e.image_url,
    e.title,
    e.location_name,
    e.location_latitude,
    e.location_longitude,
    e.taken_at,
    e.created_at,
    e.updated_at,
    e.image_analysis,
    e.is_public,
    e.primary_story_cut_id
  FROM embers e
  WHERE e.id = ember_uuid;
END;
$$;

-- Grant execute permission to anonymous users (public access)
GRANT EXECUTE ON FUNCTION get_public_ember(UUID) TO anon;
GRANT EXECUTE ON FUNCTION get_public_ember(UUID) TO authenticated; 