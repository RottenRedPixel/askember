-- Migration: Allow NULL values for voice columns in ember_story_cuts table
-- This enables the new optional voice agent selection feature

-- Description: Updates the ember_story_cuts table to allow NULL values for voice-related columns
-- This supports the new UI feature where users can select only Ember AI, only Narrator, or both

BEGIN;

-- Remove NOT NULL constraints from voice-related columns
ALTER TABLE ember_story_cuts 
  ALTER COLUMN ember_voice_id DROP NOT NULL,
  ALTER COLUMN ember_voice_name DROP NOT NULL,
  ALTER COLUMN narrator_voice_id DROP NOT NULL,
  ALTER COLUMN narrator_voice_name DROP NOT NULL;

-- Add comments to document the new behavior
COMMENT ON COLUMN ember_story_cuts.ember_voice_id IS 'ElevenLabs voice ID for Ember AI agent (NULL if not selected)';
COMMENT ON COLUMN ember_story_cuts.ember_voice_name IS 'Display name for Ember AI voice (NULL if not selected)';
COMMENT ON COLUMN ember_story_cuts.narrator_voice_id IS 'ElevenLabs voice ID for Narrator agent (NULL if not selected)';
COMMENT ON COLUMN ember_story_cuts.narrator_voice_name IS 'Display name for Narrator voice (NULL if not selected)';

-- Validate that at least one voice agent is selected
-- This ensures story cuts always have at least one voice type
ALTER TABLE ember_story_cuts 
  ADD CONSTRAINT check_at_least_one_voice 
  CHECK (
    ember_voice_id IS NOT NULL OR narrator_voice_id IS NOT NULL
  );

COMMIT;

-- Rollback instructions (if needed):
-- BEGIN;
-- ALTER TABLE ember_story_cuts DROP CONSTRAINT IF EXISTS check_at_least_one_voice;
-- ALTER TABLE ember_story_cuts 
--   ALTER COLUMN ember_voice_id SET NOT NULL,
--   ALTER COLUMN ember_voice_name SET NOT NULL,
--   ALTER COLUMN narrator_voice_id SET NOT NULL,
--   ALTER COLUMN narrator_voice_name SET NOT NULL;
-- COMMIT; 