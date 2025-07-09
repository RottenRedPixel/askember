-- Migration: Add audio preferences to story cuts
-- This allows saving per-message audio preferences for each story cut

BEGIN;

-- Add audio preferences field to ember_story_cuts table
ALTER TABLE ember_story_cuts 
ADD COLUMN IF NOT EXISTS audio_preferences JSONB DEFAULT '{}';

-- Add index for performance on audio preferences queries
CREATE INDEX IF NOT EXISTS idx_ember_story_cuts_audio_preferences ON ember_story_cuts USING GIN (audio_preferences);

-- Add comment to document the new field
COMMENT ON COLUMN ember_story_cuts.audio_preferences IS 'JSON object storing per-message audio preferences (recorded/personal/text) keyed by message content hash';

COMMIT; 