-- Function to delete an individual story message (ember owner only)
-- This allows ember owners to remove specific questions and answers from their ember's story

CREATE OR REPLACE FUNCTION delete_story_message(
  message_id bigint,
  ember_id bigint,
  requesting_user_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  target_ember RECORD;
  target_message RECORD;
  deleted_count integer := 0;
BEGIN
  -- Check if the requesting user exists and is authenticated
  IF requesting_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  
  -- Get the ember and verify ownership
  SELECT * INTO target_ember 
  FROM embers 
  WHERE id = ember_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Ember not found';
  END IF;
  
  -- Verify the requesting user is the ember owner
  IF target_ember.user_id != requesting_user_id THEN
    RAISE EXCEPTION 'Only ember owners can delete story messages';
  END IF;
  
  -- Get the message to verify it belongs to this ember
  SELECT esm.*, esc.ember_id as conversation_ember_id
  INTO target_message
  FROM ember_story_messages esm
  JOIN ember_story_conversations esc ON esm.conversation_id = esc.id
  WHERE esm.id = message_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Story message not found';
  END IF;
  
  -- Verify the message belongs to the specified ember
  IF target_message.conversation_ember_id != ember_id THEN
    RAISE EXCEPTION 'Message does not belong to this ember';
  END IF;
  
  -- Delete the message
  DELETE FROM ember_story_messages 
  WHERE id = message_id;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  -- Return success response
  RETURN jsonb_build_object(
    'success', true,
    'deleted_message', deleted_count > 0,
    'message_id', message_id,
    'ember_id', ember_id
  );
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Failed to delete story message: %', SQLERRM;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION delete_story_message(bigint, bigint, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION delete_story_message(bigint, bigint, uuid) TO anon; 