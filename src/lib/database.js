import { supabase } from './supabase';

/**
 * Execute raw SQL queries (for development/admin use)
 * WARNING: Only use this for trusted SQL queries
 */
export const executeSQL = async (sql) => {
  try {
    const { data, error } = await supabase.rpc('execute_sql', { sql_query: sql });
    
    if (error) {
      console.error('SQL execution error:', error);
      return { success: false, error: error.message };
    }
    
    return { success: true, data };
  } catch (error) {
    console.error('SQL execution failed:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Run database migrations from JavaScript
 */
export const runMigration = async (migrationName, sqlContent) => {
  try {
    console.log(`Running migration: ${migrationName}`);
    
    const result = await executeSQL(sqlContent);
    
    if (result.success) {
      console.log(`Migration ${migrationName} completed successfully`);
      return true;
    } else {
      console.error(`Migration ${migrationName} failed:`, result.error);
      return false;
    }
  } catch (error) {
    console.error(`Migration ${migrationName} error:`, error);
    return false;
  }
};

/**
 * Check if a table exists
 */
export const tableExists = async (tableName) => {
  try {
    // Try to query the table directly - if it exists, this will work
    const { error } = await supabase
      .from(tableName)
      .select('count', { count: 'exact', head: true });
    
    // If no error or just a PGRST116 (no rows), table exists
    return !error || error.code === 'PGRST116';
  } catch (error) {
    console.error('Error checking table existence:', error);
    return false;
  }
};

/**
 * Get table schema information using a custom RPC function
 */
export const getTableSchema = async (tableName) => {
  try {
    // We'll create a simple RPC function to get schema info
    const { data, error } = await supabase.rpc('get_table_info', { 
      input_table_name: tableName 
    });
    
    if (error) {
      console.error('Error getting table schema:', error);
      // Fallback: just return basic info that table exists
      const exists = await tableExists(tableName);
      return exists ? [{ info: `Table ${tableName} exists (schema details unavailable)` }] : null;
    }
    
    return data;
  } catch (error) {
    console.error('Error getting table schema:', error);
    return null;
  }
};

/**
 * Database health check
 */
export const healthCheck = async () => {
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('count', { count: 'exact', head: true });
    
    if (error && error.code !== 'PGRST116') {
      return { healthy: false, error: error.message };
    }
    
    return { healthy: true, userCount: data };
  } catch (error) {
    return { healthy: false, error: error.message };
  }
};

/**
 * Debug storage setup to identify RLS issues
 */
export const debugStorageSetup = async () => {
  try {
    // Check current user
    const { data: { user } } = await supabase.auth.getUser();
    console.log('Current user:', user?.id, user?.email);

    // Try a simple storage operation to see the exact error
    const results = {
      user: user?.id,
      userEmail: user?.email,
      errors: []
    };

    try {
      const testFile = new Blob(['test'], { type: 'text/plain' });
      const { data, error } = await supabase.storage
        .from('avatars')
        .upload(`test-${Date.now()}.txt`, testFile);
      
      results.uploadTest = { data, error: error?.message };
      
      if (data) {
        // Clean up test file
        await supabase.storage.from('avatars').remove([data.path]);
      }
    } catch (uploadError) {
      results.uploadTest = { error: uploadError.message };
    }

    // Check if we can list objects
    try {
      const { data: objects, error: listError } = await supabase.storage
        .from('avatars')
        .list();
      
      results.listTest = { data: objects?.length || 0, error: listError?.message };
    } catch (listError) {
      results.listTest = { error: listError.message };
    }

    // Try to get bucket info
    try {
      const { data: bucketData, error: bucketError } = await supabase.storage
        .getBucket('avatars');
      
      results.bucketInfo = { data: bucketData, error: bucketError?.message };
    } catch (bucketError) {
      results.bucketInfo = { error: bucketError.message };
    }

    return results;
  } catch (error) {
    console.error('Debug storage setup error:', error);
    return { error: error.message };
  }
};

/**
 * Ember-related functions
 */

/**
 * Create a new ember
 */
export const createEmber = async (emberData) => {
  try {
    const { data, error } = await supabase
      .from('embers')
      .insert([emberData])
      .select()
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return data;
  } catch (error) {
    console.error('Error creating ember:', error);
    throw error;
  }
};

/**
 * Get all embers for a user
 */
export const getUserEmbers = async (userId) => {
  try {
    const { data, error } = await supabase
      .from('embers')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(error.message);
    }

    return data;
  } catch (error) {
    console.error('Error fetching user embers:', error);
    throw error;
  }
};

/**
 * Get a single ember by ID (for sharing - public access)
 */
export const getEmber = async (emberId) => {
  try {
    // First get the ember
    const { data: ember, error: emberError } = await supabase
      .from('embers')
      .select('*')
      .eq('id', emberId)
      .single();

    if (emberError) {
      throw new Error(emberError.message);
    }

    // Then get the owner's profile information
    const { data: owner, error: ownerError } = await supabase
      .from('user_profiles')
      .select('first_name, last_name, avatar_url')
      .eq('user_id', ember.user_id)
      .single();

    // Don't throw error if owner profile doesn't exist, just return ember without owner info
    if (ownerError && ownerError.code !== 'PGRST116') {
      console.warn('Could not fetch owner profile:', ownerError.message);
    }

    return {
      ...ember,
      owner: owner || null
    };
  } catch (error) {
    console.error('Error fetching ember:', error);
    throw error;
  }
};

/**
 * Update an ember's title
 */
export const updateEmberTitle = async (emberId, title, userId) => {
  try {
    const { data, error } = await supabase
      .from('embers')
      .update({ title: title, updated_at: new Date().toISOString() })
      .eq('id', emberId)
      .eq('user_id', userId) // Ensure user owns the ember
      .select()
      .single();

    if (error) {
      throw new Error(error.message);
    }
    return data;
  } catch (error) {
    console.error('Error updating ember title:', error);
    throw error;
  }
};

/**
 * Delete an ember (only if it belongs to the user)
 */
export const deleteEmber = async (emberId, userId) => {
  try {
    const { error } = await supabase
      .from('embers')
      .delete()
      .eq('id', emberId)
      .eq('user_id', userId);

    if (error) {
      throw new Error(error.message);
    }

    return true;
  } catch (error) {
    console.error('Error deleting ember:', error);
    throw error;
  }
};

/**
 * Chat-related functions
 */

/**
 * Get all chat messages for a specific ember, organized for Q&A structure
 */
export const getEmberChatMessages = async (emberId) => {
  try {
    const { data, error } = await supabase
      .from('ember_chats')
      .select('*')
      .eq('ember_id', emberId)
      .order('created_at', { ascending: true });

    if (error) {
      throw new Error(error.message);
    }

    // Organize messages into Q&A structure
    const questions = [];
    const answers = {};
    const comments = [];

    data.forEach(message => {
      if (message.message_type === 'question') {
        questions.push({
          ...message,
          answers: []
        });
      } else if (message.message_type === 'answer' && message.parent_id) {
        if (!answers[message.parent_id]) {
          answers[message.parent_id] = [];
        }
        answers[message.parent_id].push({
          ...message,
          comments: []
        });
      } else if (message.message_type === 'comment') {
        if (message.parent_id) {
          // Comment on an answer
          if (!answers[message.parent_id]) {
            answers[message.parent_id] = [];
          }
          // Find the answer to attach this comment to
          // For now, add to the last answer of the parent question
          // In a more complex system, you'd need another level of parent tracking
        } else {
          // Top-level comment
          comments.push(message);
        }
      }
    });

    // Attach answers to questions
    questions.forEach(question => {
      question.answers = answers[question.id] || [];
    });

    return { questions, comments };
  } catch (error) {
    console.error('Error fetching chat messages:', error);
    throw error;
  }
};

/**
 * Add a new chat message to an ember
 */
export const addChatMessage = async (chatData) => {
  try {
    const { data, error } = await supabase
      .from('ember_chats')
      .insert([chatData])
      .select()
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return data;
  } catch (error) {
    console.error('Error adding chat message:', error);
    throw error;
  }
};

/**
 * Update a chat message (only by the message author)
 */
export const updateChatMessage = async (messageId, newMessage, userId) => {
  try {
    const { data, error } = await supabase
      .from('ember_chats')
      .update({ message: newMessage, updated_at: new Date().toISOString() })
      .eq('id', messageId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return data;
  } catch (error) {
    console.error('Error updating chat message:', error);
    throw error;
  }
};

/**
 * Delete a chat message (only by the message author)
 */
export const deleteChatMessage = async (messageId, userId) => {
  try {
    const { error } = await supabase
      .from('ember_chats')
      .delete()
      .eq('id', messageId)
      .eq('user_id', userId);

    if (error) {
      throw new Error(error.message);
    }

    return true;
  } catch (error) {
    console.error('Error deleting chat message:', error);
    throw error;
  }
};

/**
 * Story Conversation Functions
 */

/**
 * Get or create a story conversation
 */
export const getOrCreateStoryConversation = async (emberId, userId, conversationType = 'story') => {
  try {
    // First, try to get existing conversations (avoid problematic boolean filter)
    const { data: conversations, error: fetchError } = await supabase
      .from('ember_story_conversations')
      .select('*')
      .eq('ember_id', emberId)
      .eq('user_id', userId)
      .eq('conversation_type', conversationType)
      .order('created_at', { ascending: false });

    if (fetchError) {
      throw new Error(fetchError.message);
    }

    // Find the first non-completed conversation
    const existingConversation = conversations?.find(conv => !conv.is_completed);
    
    if (existingConversation) {
      return existingConversation;
    }

    // Create new conversation if none exists
    const { data: newConversation, error: createError } = await supabase
      .from('ember_story_conversations')
      .insert([{
        ember_id: emberId,
        user_id: userId,
        conversation_type: conversationType,
        title: 'The Story',
        is_completed: false,
        message_count: 0
      }])
      .select()
      .single();

    if (createError) {
      throw new Error(createError.message);
    }

    return newConversation;
  } catch (error) {
    console.error('Error getting/creating story conversation:', error);
    throw error;
  }
};

/**
 * Add a message to a story conversation
 */
export const addStoryMessage = async (messageData) => {
  try {
    const { data, error } = await supabase
      .from('ember_story_messages')
      .insert([{
        conversation_id: messageData.conversationId,
        sender: messageData.sender,
        message_type: messageData.messageType,
        content: messageData.content,
        has_audio: messageData.hasAudio || false,
        audio_url: messageData.audioUrl || null,
        audio_filename: messageData.audioFilename || null,
        audio_duration_seconds: messageData.audioDurationSeconds || null,
        audio_size_bytes: messageData.audioSizeBytes || null,
        transcription_status: messageData.transcriptionStatus || 'none',
        transcription_confidence: messageData.transcriptionConfidence || null
      }])
      .select()
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return data;
  } catch (error) {
    console.error('Error adding story message:', error);
    throw error;
  }
};

/**
 * Get a story conversation with all its messages
 */
export const getStoryConversationWithMessages = async (conversationId) => {
  try {
    // Get conversation details
    const { data: conversation, error: convError } = await supabase
      .from('ember_story_conversations')
      .select('*')
      .eq('id', conversationId)
      .single();

    if (convError) {
      throw new Error(convError.message);
    }

    // Get all messages for this conversation
    const { data: messages, error: messagesError } = await supabase
      .from('ember_story_messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('sequence_number', { ascending: true });

    if (messagesError) {
      throw new Error(messagesError.message);
    }

    return {
      ...conversation,
      messages: messages || []
    };
  } catch (error) {
    console.error('Error getting story conversation with messages:', error);
    throw error;
  }
};

/**
 * Mark a story conversation as completed
 */
export const completeStoryConversation = async (conversationId, userId) => {
  try {
    const { data, error } = await supabase
      .from('ember_story_conversations')
      .update({ 
        is_completed: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', conversationId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return data;
  } catch (error) {
    console.error('Error completing story conversation:', error);
    throw error;
  }
};

/**
 * Get all story messages for an ember across all users
 * This allows users to see other users' answers to story questions
 * Note: This function requires modified RLS policies to allow cross-user access
 */
export const getAllStoryMessagesForEmber = async (emberId) => {
  try {
    console.log('🔍 getAllStoryMessagesForEmber called with ember ID:', emberId, typeof emberId);
    
    // Use RPC function to bypass RLS and get all story messages for an ember
    // Add timestamp to prevent caching
    const { data, error } = await supabase.rpc('get_all_story_messages_for_ember', {
      input_ember_id: emberId
    });

    if (error) {
      console.error('🚨 RPC Error:', error);
      throw new Error(error.message);
    }

    console.log('📊 getAllStoryMessagesForEmber result for ember', emberId, ':', data?.length || 0, 'messages');
    console.log('📋 First few messages:', data?.slice(0, 3));
    
    // Debug: Check if all messages belong to the same ember
    if (data && data.length > 0) {
      const emberIds = [...new Set(data.map(msg => msg.ember_id || 'unknown'))];
      console.log('🔍 Unique ember IDs in results:', emberIds);
      
      // Debug user IDs for the anonymous user issue
      const userIds = [...new Set(data.map(msg => msg.user_id))];
      console.log('👤 Unique user IDs in results:', userIds);
      console.log('👤 User ID types:', userIds.map(id => typeof id));
      
      // Check conversation ember IDs
      const conversationQuery = await supabase
        .from('ember_story_conversations')
        .select('id, ember_id')
        .in('id', data.map(msg => msg.conversation_id));
      
      console.log('💬 Conversation ember mapping:', conversationQuery.data);
    }
    
    return {
      messages: data || []
    };
  } catch (error) {
    console.error('Error getting all story messages for ember:', error);
    // Fallback to regular conversation loading for current user
    console.log('Falling back to current user conversation only');
    return { messages: [] };
  }
};

/**
 * Delete an individual story message (ember owner only)
 */
export const deleteStoryMessage = async (messageId, emberId, userId) => {
  try {
    console.log('🗑️ Calling deleteStoryMessage with params:', {
      messageId,
      emberId, 
      userId,
      messageIdType: typeof messageId,
      emberIdType: typeof emberId,
      userIdType: typeof userId
    });

    // Use RPC function to delete individual message (includes ownership verification)
    const { data, error } = await supabase.rpc('delete_story_message', {
      message_id: messageId,
      ember_id: emberId,
      requesting_user_id: userId
    });

    console.log('🗑️ Supabase RPC response:', { data, error });

    if (error) {
      console.error('🗑️ Supabase error details:', error);
      throw new Error(error.message);
    }

    return {
      success: true,
      deletedMessage: data?.deleted_message || false
    };
  } catch (error) {
    console.error('Error deleting story message:', error);
    console.error('Error details:', error.message, error.stack);
    throw error;
  }
};

/**
 * Clear all story conversations and messages for an ember (owner only)
 * This allows ember owners to reset all story content
 */
export const clearAllStoriesForEmber = async (emberId, userId) => {
  try {
    // Use RPC function to clear all stories (includes ownership verification)
    const { data, error } = await supabase.rpc('clear_all_stories_for_ember', {
      ember_id: emberId,
      requesting_user_id: userId
    });

    if (error) {
      throw new Error(error.message);
    }

    return {
      success: true,
      deletedConversations: data?.deleted_conversations || 0,
      deletedMessages: data?.deleted_messages || 0
    };
  } catch (error) {
    console.error('Error clearing all stories for ember:', error);
    throw error;
  }
}; 