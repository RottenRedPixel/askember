-- Add primary_story_cut_id column to embers table
ALTER TABLE IF EXISTS embers
ADD COLUMN IF NOT EXISTS primary_story_cut_id UUID REFERENCES ember_story_cuts(id) ON DELETE SET NULL;

-- Create an index for better query performance
CREATE INDEX IF NOT EXISTS embers_primary_story_cut_id_idx ON embers(primary_story_cut_id);

-- Comment on the column to document its purpose
COMMENT ON COLUMN embers.primary_story_cut_id IS 'Reference to the primary story cut chosen by the ember owner';

-- Only the ember owner can update the primary_story_cut_id
CREATE OR REPLACE FUNCTION check_primary_story_cut_update()
RETURNS TRIGGER AS $$
BEGIN
  -- If primary_story_cut_id is being changed and user is not the owner, reject
  IF (OLD.primary_story_cut_id IS DISTINCT FROM NEW.primary_story_cut_id) AND 
     (auth.uid() IS DISTINCT FROM NEW.user_id) THEN
    RAISE EXCEPTION 'Only the ember owner can set the primary story cut';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create or replace the trigger
DROP TRIGGER IF EXISTS check_primary_story_cut_update_trigger ON embers;
CREATE TRIGGER check_primary_story_cut_update_trigger
  BEFORE UPDATE ON embers
  FOR EACH ROW
  EXECUTE FUNCTION check_primary_story_cut_update(); 