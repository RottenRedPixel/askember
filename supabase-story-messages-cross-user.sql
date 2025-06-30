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
                e.is_public = true OR -- Public ember
                EXISTS (
                    SELECT 1 FROM public.ember_shares es
                    WHERE es.ember_id = e.id 
                    AND es.shared_with_email = auth.jwt() ->> 'email'
                    AND es.is_active = true
                    AND (es.expires_at IS NULL OR es.expires_at > now())
                ) -- Shared ember
            )
        )
    );

-- Create function to clear all story conversations and messages for an ember (owner only)
CREATE OR REPLACE FUNCTION clear_all_stories_for_ember(ember_id UUID, requesting_user_id UUID)
RETURNS JSON
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
DECLARE
    deleted_messages_count INTEGER;
    deleted_conversations_count INTEGER;
BEGIN
    -- Verify that the requesting user is the owner of the ember
    IF NOT EXISTS (
        SELECT 1 FROM embers 
        WHERE id = ember_id 
        AND user_id = requesting_user_id
    ) THEN
        RAISE EXCEPTION 'Access denied. Only the ember owner can clear all stories.';
    END IF;

    -- Delete all messages first (due to foreign key constraints)
    DELETE FROM ember_story_messages 
    WHERE conversation_id IN (
        SELECT id FROM ember_story_conversations 
        WHERE ember_story_conversations.ember_id = clear_all_stories_for_ember.ember_id
    );
    
    GET DIAGNOSTICS deleted_messages_count = ROW_COUNT;

    -- Delete all conversations
    DELETE FROM ember_story_conversations 
    WHERE ember_story_conversations.ember_id = clear_all_stories_for_ember.ember_id;
    
    GET DIAGNOSTICS deleted_conversations_count = ROW_COUNT;

    -- Return the counts
    RETURN json_build_object(
        'deleted_messages', deleted_messages_count,
        'deleted_conversations', deleted_conversations_count
    );
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION clear_all_stories_for_ember(UUID, UUID) TO authenticated; 