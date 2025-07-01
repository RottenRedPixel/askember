-- Add is_primary field to ember_story_cuts table
-- This marks which story cut is "The One" that will be played

-- Add the is_primary column
ALTER TABLE ember_story_cuts 
ADD COLUMN is_primary BOOLEAN DEFAULT false;

-- Create index for performance
CREATE INDEX IF NOT EXISTS ember_story_cuts_is_primary_idx ON ember_story_cuts(ember_id, is_primary);

-- Create function to set a story cut as primary (ensures only one per ember)
CREATE OR REPLACE FUNCTION set_story_cut_as_primary(
  story_cut_id_param UUID,
  ember_id_param UUID,
  user_id_param UUID
)
RETURNS BOOLEAN
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Check if user owns the ember
  IF NOT EXISTS (
    SELECT 1 FROM embers 
    WHERE id = ember_id_param AND user_id = user_id_param
  ) THEN
    RAISE EXCEPTION 'Only the ember owner can set the primary story cut';
  END IF;

  -- Unset all other story cuts as primary for this ember
  UPDATE ember_story_cuts 
  SET is_primary = false 
  WHERE ember_id = ember_id_param;
  
  -- Set the specified story cut as primary
  UPDATE ember_story_cuts 
  SET is_primary = true 
  WHERE id = story_cut_id_param AND ember_id = ember_id_param;
  
  RETURN true;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION set_story_cut_as_primary(UUID, UUID, UUID) TO authenticated;

-- Show current setup
SELECT 'Primary story cut tracking added successfully!' as status;

-- Show any existing story cuts (they'll all be non-primary initially)
SELECT 
  ember_id,
  title,
  is_primary,
  created_at
FROM ember_story_cuts 
ORDER BY ember_id, created_at DESC; 