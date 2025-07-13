-- Fix the get_public_story_cuts RPC function structure error
-- This corrects the column names to match the actual schema

DROP FUNCTION IF EXISTS get_public_story_cuts(UUID);

CREATE OR REPLACE FUNCTION get_public_story_cuts(ember_uuid UUID)
RETURNS TABLE (
    id UUID,
    ember_id UUID,
    title TEXT,
    content TEXT,
    voice_tag TEXT,
    audio_url TEXT,
    duration_seconds INTEGER,
    word_count INTEGER,
    is_primary BOOLEAN,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    style TEXT,
    generation_settings JSONB,
    audio_preferences JSONB,
    story_messages JSONB
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        sc.id,
        sc.ember_id,
        sc.title,
        sc.content,
        sc.voice_tag,
        sc.audio_url,
        sc.duration_seconds,
        sc.word_count,
        sc.is_primary,
        sc.created_at,
        sc.updated_at,
        sc.style,
        sc.generation_settings,
        sc.audio_preferences,
        sc.story_messages
    FROM story_cuts sc
    WHERE sc.ember_id = ember_uuid
    ORDER BY sc.created_at DESC;
END;
$$;

-- Grant execute permissions to anon users
GRANT EXECUTE ON FUNCTION get_public_story_cuts(UUID) TO anon; 