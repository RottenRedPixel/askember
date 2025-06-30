-- Fix RLS policy for inserting story messages
-- Replace the complex policy with a simpler, more reliable one

-- Drop the existing INSERT policy
DROP POLICY IF EXISTS "Users can create story messages for accessible embers" ON public.ember_story_messages;

-- Create a simplified INSERT policy that definitely works
CREATE POLICY "Allow story message creation for accessible embers"
    ON public.ember_story_messages
    FOR INSERT
    WITH CHECK (
        -- Allow if user owns the ember
        EXISTS (
            SELECT 1 FROM public.ember_story_conversations esc
            JOIN public.embers e ON esc.ember_id = e.id
            WHERE esc.id = conversation_id 
            AND e.user_id = auth.uid()
        )
        OR
        -- Allow if ember is public
        EXISTS (
            SELECT 1 FROM public.ember_story_conversations esc
            JOIN public.embers e ON esc.ember_id = e.id
            WHERE esc.id = conversation_id 
            AND e.is_public = true
        )
        OR
        -- Allow if ember is shared with user
        EXISTS (
            SELECT 1 FROM public.ember_story_conversations esc
            JOIN public.embers e ON esc.ember_id = e.id
            JOIN public.ember_shares es ON es.ember_id = e.id
            WHERE esc.id = conversation_id 
            AND es.shared_with_email = auth.jwt() ->> 'email'
            AND es.is_active = true
            AND (es.expires_at IS NULL OR es.expires_at > now())
        )
    );

-- Also ensure the conversation creation policy allows it
DROP POLICY IF EXISTS "Users can create story conversations for accessible embers" ON public.ember_story_conversations;

CREATE POLICY "Allow story conversation creation for accessible embers"
    ON public.ember_story_conversations
    FOR INSERT
    WITH CHECK (
        -- Allow if user owns the ember
        EXISTS (
            SELECT 1 FROM public.embers e
            WHERE e.id = ember_id 
            AND e.user_id = auth.uid()
        )
        OR
        -- Allow if ember is public
        EXISTS (
            SELECT 1 FROM public.embers e
            WHERE e.id = ember_id 
            AND e.is_public = true
        )
        OR
        -- Allow if ember is shared with user
        EXISTS (
            SELECT 1 FROM public.embers e
            JOIN public.ember_shares es ON es.ember_id = e.id
            WHERE e.id = ember_id 
            AND es.shared_with_email = auth.jwt() ->> 'email'
            AND es.is_active = true
            AND (es.expires_at IS NULL OR es.expires_at > now())
        )
    ); 