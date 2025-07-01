-- Fix Story Cuts RLS Policies
-- Drop existing policies with incorrect auth.users references
DROP POLICY IF EXISTS "Users can view story cuts for accessible embers" ON ember_story_cuts;
DROP POLICY IF EXISTS "Users can create story cuts for contributable embers" ON ember_story_cuts;

-- Recreate policies with correct JWT token usage
CREATE POLICY "Users can view story cuts for accessible embers" ON ember_story_cuts
  FOR SELECT USING (
    ember_id IN (
      SELECT e.id FROM embers e
      LEFT JOIN ember_shares es ON e.id = es.ember_id
      WHERE e.user_id = auth.uid()  -- Owner
        OR e.is_public = true  -- Public embers
        OR (es.shared_with_email = auth.jwt() ->> 'email'
        AND es.is_active = true 
        AND (es.expires_at IS NULL OR es.expires_at > now())) -- Shared user
    )
  );

CREATE POLICY "Users can create story cuts for contributable embers" ON ember_story_cuts
  FOR INSERT WITH CHECK (
    ember_id IN (
      SELECT e.id FROM embers e
      LEFT JOIN ember_shares es ON e.id = es.ember_id
      WHERE e.user_id = auth.uid()  -- Owner
        OR (e.is_public = true AND e.allow_public_edit = true)  -- Public edit allowed
        OR (es.shared_with_email = auth.jwt() ->> 'email'
        AND es.permission_level IN ('contributor') 
        AND es.is_active = true 
        AND (es.expires_at IS NULL OR es.expires_at > now())) -- Contributors only
    )
    AND creator_user_id = auth.uid()
  ); 