-- Migration: Create function to get all story messages for an ember across all users
-- This allows users to see other users' answers in the Story modal

-- Create function to get all story messages for an ember with user profile information
CREATE OR REPLACE FUNCTION get_all_story_messages_for_ember(ember_id UUID)
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
    user_avatar_url TEXT
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
    up.first_name as user_first_name,
    up.last_name as user_last_name,
    up.avatar_url as user_avatar_url
  FROM ember_story_messages esm
  JOIN ember_story_conversations esc ON esm.conversation_id = esc.id
  LEFT JOIN user_profiles up ON esc.user_id = up.user_id
  WHERE esc.ember_id = ember_id
  ORDER BY esm.created_at ASC;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_all_story_messages_for_ember(UUID) TO authenticated;

-- Create a policy to allow reading story messages for shared embers
-- This allows users to see story messages from other users for embers they have access to
CREATE POLICY "Users can view story messages for accessible embers"
    ON public.ember_story_messages
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.ember_story_conversations esc
            JOIN public.embers e ON esc.ember_id = e.id
            WHERE esc.id = conversation_id 
            AND (
                e.user_id = auth.uid() OR -- Own ember
                EXISTS (
                    SELECT 1 FROM public.ember_sharing_profiles esp
                    WHERE esp.ember_id = e.id 
                    AND esp.shared_with_user_id = auth.uid()
                    AND esp.access_type IN ('view', 'edit')
                ) -- Shared ember
            )
        )
    ); 