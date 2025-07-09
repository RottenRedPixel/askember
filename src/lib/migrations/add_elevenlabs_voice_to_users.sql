-- Migration: Add ElevenLabs voice ID to user profiles
-- This allows users to have a personal ElevenLabs voice model associated with their account

BEGIN;

-- Add ElevenLabs voice fields to user_profiles table
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS elevenlabs_voice_id VARCHAR(50),
ADD COLUMN IF NOT EXISTS elevenlabs_voice_name VARCHAR(100);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_elevenlabs_voice_id ON user_profiles(elevenlabs_voice_id);

-- Add comments to document the new fields
COMMENT ON COLUMN user_profiles.elevenlabs_voice_id IS 'ElevenLabs voice ID associated with this user for personalized speech synthesis';
COMMENT ON COLUMN user_profiles.elevenlabs_voice_name IS 'Display name for the user''s ElevenLabs voice model';

COMMIT;

-- Rollback instructions (if needed):
-- BEGIN;
-- ALTER TABLE user_profiles 
--   DROP COLUMN IF EXISTS elevenlabs_voice_id,
--   DROP COLUMN IF EXISTS elevenlabs_voice_name;
-- DROP INDEX IF EXISTS idx_user_profiles_elevenlabs_voice_id;
-- COMMIT; 