-- Fix user profile data loading in story messages
-- The issue is likely that user profiles aren't being joined properly

-- First, ensure all users have basic profile entries
INSERT INTO user_profiles (user_id, first_name, created_at, updated_at)
SELECT 
  auth.uid() as user_id,
  COALESCE(
    auth.jwt() -> 'user_metadata' ->> 'first_name',
    auth.jwt() -> 'user_metadata' ->> 'name', 
    split_part(auth.jwt() ->> 'email', '@', 1)
  ) as first_name,
  NOW() as created_at,
  NOW() as updated_at
WHERE auth.uid() IS NOT NULL
ON CONFLICT (user_id) DO NOTHING;

-- Update the story messages function to ensure proper user data
DROP FUNCTION IF EXISTS get_all_story_messages_for_ember(UUID);

CREATE OR REPLACE FUNCTION get_all_story_messages_for_ember(input_ember_id UUID)
RETURNS TABLE (
    id UUID,
    conversation_id UUID,
    sender TEXT,
    message_type TEXT,
    content TEXT,
    sequence_number INTEGER,
    has_audio BOOLEAN,
    audio_url TEXT,
    audio_filename TEXT,
    audio_duration_seconds DECIMAL(10,2),
    audio_size_bytes BIGINT,
    transcription_status TEXT,
    transcription_confidence DECIMAL(5,4),
    response_time_seconds DECIMAL(10,2),
    is_edited BOOLEAN,
    edit_count INTEGER,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE,
    user_id UUID,
    user_first_name TEXT,
    user_last_name TEXT,
    user_avatar_url TEXT,
    ember_id UUID
) 
SECURITY DEFINER
LANGUAGE SQL
AS $$
  SELECT 
    esm.id,
    esm.conversation_id,
    esm.sender,
    esm.message_type,
    esm.content,
    esm.sequence_number,
    esm.has_audio,
    esm.audio_url,
    esm.audio_filename,
    esm.audio_duration_seconds,
    esm.audio_size_bytes,
    esm.transcription_status,
    esm.transcription_confidence,
    esm.response_time_seconds,
    esm.is_edited,
    esm.edit_count,
    esm.created_at,
    esm.updated_at,
    esc.user_id,
    COALESCE(
      up.first_name,
      split_part(
        (SELECT email FROM auth.users WHERE id = esc.user_id),
        '@', 
        1
      )
    ) as user_first_name,
    up.last_name as user_last_name,
    up.avatar_url as user_avatar_url,
    esc.ember_id
  FROM ember_story_messages esm
  JOIN ember_story_conversations esc ON esm.conversation_id = esc.id
  LEFT JOIN user_profiles up ON esc.user_id = up.user_id
  WHERE esc.ember_id = input_ember_id
  ORDER BY esm.created_at ASC;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_all_story_messages_for_ember(UUID) TO authenticated; 