-- Fix RLS policies for story conversations to allow contributors
-- This addresses the issue where contributors can't create story conversations
-- CORRECTED: Only using existing columns in ember_shares table

-- Drop existing policies
DROP POLICY IF EXISTS "Users can create story conversations for accessible embers" ON public.ember_story_conversations;
DROP POLICY IF EXISTS "Users can view story conversations for accessible embers" ON public.ember_story_conversations;

-- Create improved policies with better contributor access handling

-- Allow users to view story conversations for embers they can access
CREATE POLICY "Allow viewing story conversations for accessible embers"
    ON public.ember_story_conversations
    FOR SELECT
    USING (
        -- Own conversations
        auth.uid() = user_id 
        OR
        -- Conversations for embers user owns
        EXISTS (
            SELECT 1 FROM public.embers e
            WHERE e.id = ember_id AND e.user_id = auth.uid()
        )
        OR
        -- Conversations for public embers
        EXISTS (
            SELECT 1 FROM public.embers e
            WHERE e.id = ember_id AND e.is_public = true
        )
        OR
        -- Conversations for shared embers (check by email only)
        EXISTS (
            SELECT 1 FROM public.ember_shares es
            JOIN public.embers e ON es.ember_id = e.id
            WHERE e.id = ember_id
            AND es.is_active = true
            AND (es.expires_at IS NULL OR es.expires_at > now())
            AND es.shared_with_email = auth.jwt() ->> 'email'
        )
    );

-- Allow users to create story conversations for embers they can access
CREATE POLICY "Allow creating story conversations for accessible embers"
    ON public.ember_story_conversations
    FOR INSERT
    WITH CHECK (
        -- Must be creating for themselves
        auth.uid() = user_id 
        AND
        (
            -- Own ember
            EXISTS (
                SELECT 1 FROM public.embers e
                WHERE e.id = ember_id AND e.user_id = auth.uid()
            )
            OR
            -- Public ember
            EXISTS (
                SELECT 1 FROM public.embers e
                WHERE e.id = ember_id AND e.is_public = true
            )
            OR
            -- Shared ember (check by email only)
            EXISTS (
                SELECT 1 FROM public.ember_shares es
                JOIN public.embers e ON es.ember_id = e.id
                WHERE e.id = ember_id
                AND es.is_active = true
                AND (es.expires_at IS NULL OR es.expires_at > now())
                AND es.shared_with_email = auth.jwt() ->> 'email'
            )
        )
    );

-- Also update the story messages policy to match
DROP POLICY IF EXISTS "Users can create story messages for accessible embers" ON public.ember_story_messages;

CREATE POLICY "Allow creating story messages for accessible embers"
    ON public.ember_story_messages
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.ember_story_conversations esc
            WHERE esc.id = conversation_id 
            AND esc.user_id = auth.uid() -- Must be own conversation
            AND (
                -- Own ember
                EXISTS (
                    SELECT 1 FROM public.embers e
                    WHERE e.id = esc.ember_id AND e.user_id = auth.uid()
                )
                OR
                -- Public ember
                EXISTS (
                    SELECT 1 FROM public.embers e
                    WHERE e.id = esc.ember_id AND e.is_public = true
                )
                OR
                -- Shared ember (check by email only)
                EXISTS (
                    SELECT 1 FROM public.ember_shares es
                    JOIN public.embers e ON es.ember_id = e.id
                    WHERE e.id = esc.ember_id
                    AND es.is_active = true
                    AND (es.expires_at IS NULL OR es.expires_at > now())
                    AND es.shared_with_email = auth.jwt() ->> 'email'
                )
            )
        )
    );

-- Test the policy by trying to see what embers the current user has access to
-- This query should return embers that the current user can create story conversations for
SELECT 
  e.id,
  e.title,
  e.user_id as owner_id,
  CASE 
    WHEN e.user_id = auth.uid() THEN 'owner'
    WHEN e.is_public = true THEN 'public'
    WHEN EXISTS (
      SELECT 1 FROM public.ember_shares es
      WHERE es.ember_id = e.id
      AND es.is_active = true
      AND (es.expires_at IS NULL OR es.expires_at > now())
      AND es.shared_with_email = auth.jwt() ->> 'email'
    ) THEN 'shared'
    ELSE 'no_access'
  END as access_type
FROM public.embers e
WHERE 
  e.user_id = auth.uid()
  OR e.is_public = true
  OR EXISTS (
    SELECT 1 FROM public.ember_shares es
    WHERE es.ember_id = e.id
    AND es.is_active = true
    AND (es.expires_at IS NULL OR es.expires_at > now())
    AND es.shared_with_email = auth.jwt() ->> 'email'
  ); 