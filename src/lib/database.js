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
 * Update an ember's location data
 */
export const updateEmberLocation = async (emberId, locationData, userId) => {
  try {
    const updateData = {
      ...locationData,
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('embers')
      .update(updateData)
      .eq('id', emberId)
      .eq('user_id', userId) // Ensure user owns the ember
      .select()
      .single();

    if (error) {
      throw new Error(error.message);
    }
    return data;
  } catch (error) {
    console.error('Error updating ember location:', error);
    throw error;
  }
};

/**
 * Update an ember's date/time data
 */
export const updateEmberDateTime = async (emberId, dateTimeData, userId) => {
  try {
    const updateData = {
      ...dateTimeData,
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('embers')
      .update(updateData)
      .eq('id', emberId)
      .eq('user_id', userId) // Ensure user owns the ember
      .select()
      .single();

    if (error) {
      throw new Error(error.message);
    }
    return data;
  } catch (error) {
    console.error('Error updating ember date/time:', error);
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
    console.log('💬 [DATABASE] getOrCreateStoryConversation called:', { emberId, userId, conversationType });
    
    // First, let's check what access the user has to this ember
    const { data: emberData, error: emberError } = await supabase
      .from('embers')
      .select('*')
      .eq('id', emberId)
      .single();
    
    if (emberError) {
      console.error('🚨 [DATABASE] Error fetching ember:', emberError);
    } else {
      console.log('📝 [DATABASE] Ember details:', { 
        id: emberData.id, 
        title: emberData.title, 
        owner_id: emberData.user_id, 
        is_public: emberData.is_public,
        is_user_owner: emberData.user_id === userId
      });
    }
    
    // Check if user has shared access
    const { data: shareData, error: shareError } = await supabase
      .from('ember_shares')
      .select('*')
      .eq('ember_id', emberId);
    
    if (shareError) {
      console.error('🚨 [DATABASE] Error fetching shares:', shareError);
    } else {
      console.log('🤝 [DATABASE] Ember shares:', shareData);
    }
    
    // Get current user's email from auth
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError) {
      console.error('🚨 [DATABASE] Error getting user:', userError);
    } else {
      console.log('👤 [DATABASE] Current user email:', user?.email);
      
      // Check if user has access via shares
      const hasSharedAccess = shareData?.some(share => 
        share.shared_with_email === user?.email && 
        share.is_active && 
        (!share.expires_at || new Date(share.expires_at) > new Date())
      );
      console.log('🔐 [DATABASE] User has shared access:', hasSharedAccess);
    }

    // Try to get existing conversations
    console.log('🔍 [DATABASE] Looking for existing conversations...');
    const { data: conversations, error: fetchError } = await supabase
      .from('ember_story_conversations')
      .select('*')
      .eq('ember_id', emberId)
      .eq('user_id', userId)
      .eq('conversation_type', conversationType)
      .order('created_at', { ascending: false });

    if (fetchError) {
      console.error('🚨 [DATABASE] Error fetching conversations:', fetchError);
      throw new Error(fetchError.message);
    }

    console.log('📋 [DATABASE] Existing conversations found:', conversations?.length || 0);

    // Find the first non-completed conversation
    const existingConversation = conversations?.find(conv => !conv.is_completed);
    
    if (existingConversation) {
      console.log('✅ [DATABASE] Found existing conversation:', existingConversation.id);
      return existingConversation;
    }

    // Create new conversation if none exists
    console.log('🆕 [DATABASE] Creating new conversation...');
    const conversationData = {
      ember_id: emberId,
      user_id: userId,
      conversation_type: conversationType,
      title: 'Story Circle',
      is_completed: false,
      message_count: 0
    };
    
    console.log('📝 [DATABASE] Conversation data to insert:', conversationData);
    
    const { data: newConversation, error: createError } = await supabase
      .from('ember_story_conversations')
      .insert([conversationData])
      .select()
      .single();

    if (createError) {
      console.error('🚨 [DATABASE] Error creating conversation:', createError);
      console.error('🚨 [DATABASE] Error details:', {
        message: createError.message,
        code: createError.code,
        details: createError.details,
        hint: createError.hint
      });
      throw new Error(createError.message);
    }

    console.log('✅ [DATABASE] Successfully created conversation:', newConversation.id);
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
    console.log('🔍 [DATABASE] getAllStoryMessagesForEmber called with ember ID:', emberId, typeof emberId);
    console.log('🔍 [DATABASE] Starting RPC call to get_all_story_messages_for_ember...');
    
    // Use RPC function to bypass RLS and get all story messages for an ember
    const { data, error } = await supabase.rpc('get_all_story_messages_for_ember', {
      input_ember_id: emberId
    });

    if (error) {
      console.error('🚨 [DATABASE] RPC Error:', error);
      console.error('🚨 [DATABASE] Error details:', error.message, error.code, error.details);
      throw new Error(error.message);
    }

    console.log('📊 [DATABASE] RPC SUCCESS - Total messages returned:', data?.length || 0);
    console.log('📋 [DATABASE] Raw data from RPC:', data);
    
    // Debug: Analyze the returned data
    if (data && data.length > 0) {
      console.log('🔍 [DATABASE] Analyzing returned messages...');
      
      // Check ember IDs
      const emberIds = [...new Set(data.map(msg => msg.ember_id || 'unknown'))];
      console.log('🔍 [DATABASE] Unique ember IDs in results:', emberIds);
      
      // Check user IDs and names
      const userIds = [...new Set(data.map(msg => msg.user_id))];
      console.log('👤 [DATABASE] Unique user IDs in results:', userIds);
      console.log('👤 [DATABASE] User ID types:', userIds.map(id => ({ id, type: typeof id })));
      
      // Check user names
      const userNames = data.map(msg => ({
        user_id: msg.user_id,
        user_first_name: msg.user_first_name,
        user_last_name: msg.user_last_name,
        sender: msg.sender,
        message_type: msg.message_type
      }));
      console.log('👤 [DATABASE] User names in messages:', userNames);
      
      // Check message types and senders
      const messageSummary = data.map(msg => ({
        id: msg.id,
        sender: msg.sender,
        message_type: msg.message_type,
        user_id: msg.user_id,
        user_first_name: msg.user_first_name,
        content_preview: msg.content?.substring(0, 50) + '...',
        created_at: msg.created_at
      }));
      console.log('📝 [DATABASE] Message summary:', messageSummary);
      
      // Check for multiple users
      const messagesByUser = userIds.map(userId => ({
        user_id: userId,
        message_count: data.filter(msg => msg.user_id === userId).length,
        first_name: data.find(msg => msg.user_id === userId)?.user_first_name
      }));
      console.log('👥 [DATABASE] Messages by user:', messagesByUser);
      
    } else {
      console.log('📭 [DATABASE] No messages found for ember:', emberId);
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

// =============================================================================
// STORY CUTS FUNCTIONS
// =============================================================================

/**
 * Save a generated story cut to the database
 */
export const saveStoryCut = async (storyCutData) => {
  try {
    const { data, error } = await supabase
      .from('ember_story_cuts')
      .insert([{
        ember_id: storyCutData.emberId,
        creator_user_id: storyCutData.creatorUserId,
        title: storyCutData.title,
        style: storyCutData.style,
        duration: storyCutData.duration,
        word_count: storyCutData.wordCount,
        story_focus: storyCutData.storyFocus,
        full_script: storyCutData.script.fullScript,
        ember_voice_lines: storyCutData.script.emberVoiceLines,
        narrator_voice_lines: storyCutData.script.narratorVoiceLines,
        ember_voice_id: storyCutData.voiceCasting.emberVoice.voice_id,
        ember_voice_name: storyCutData.voiceCasting.emberVoice.name,
        narrator_voice_id: storyCutData.voiceCasting.narratorVoice.voice_id,
        narrator_voice_name: storyCutData.voiceCasting.narratorVoice.name,
        selected_contributors: storyCutData.voiceCasting.contributors,
        metadata: storyCutData.metadata
      }])
      .select()
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return data;
  } catch (error) {
    console.error('Error saving story cut:', error);
    throw error;
  }
};

/**
 * Get all story cuts for an ember
 */
export const getStoryCutsForEmber = async (emberId) => {
  try {
    const { data, error } = await supabase
      .from('ember_story_cuts')
      .select(`
        *,
        creator:user_profiles!creator_user_id(
          user_id,
          first_name,
          last_name,
          avatar_url
        )
      `)
      .eq('ember_id', emberId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(error.message);
    }

    return data || [];
  } catch (error) {
    console.error('Error fetching story cuts:', error);
    throw error;
  }
};

/**
 * Get a specific story cut by ID
 */
export const getStoryCutById = async (storyCutId) => {
  try {
    const { data, error } = await supabase
      .from('ember_story_cuts')
      .select(`
        *,
        creator:user_profiles!creator_user_id(
          user_id,
          first_name,
          last_name,
          avatar_url
        )
      `)
      .eq('id', storyCutId)
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return data;
  } catch (error) {
    console.error('Error fetching story cut:', error);
    throw error;
  }
};

/**
 * Delete a story cut
 */
export const deleteStoryCut = async (storyCutId, userId) => {
  try {
    const { error } = await supabase
      .from('ember_story_cuts')
      .delete()
      .eq('id', storyCutId)
      .eq('creator_user_id', userId); // Only creator can delete

    if (error) {
      throw new Error(error.message);
    }

    return true;
  } catch (error) {
    console.error('Error deleting story cut:', error);
    throw error;
  }
};

/**
 * Save image analysis data for an ember
 * @param {string} emberId - Ember ID
 * @param {string} userId - User ID
 * @param {string} analysisText - Full OpenAI analysis text
 * @param {string} imageUrl - URL of the analyzed image
 * @param {string} openaiModel - OpenAI model used (default: gpt-4o)
 * @param {number} tokensUsed - Number of tokens used
 * @returns {Promise<string>} - Analysis record ID
 */
export const saveImageAnalysis = async (emberId, userId, analysisText, imageUrl, openaiModel = 'gpt-4o', tokensUsed = null) => {
  try {
    console.log('🔍 [DATABASE] Saving image analysis:', { emberId, userId, analysisLength: analysisText.length });

    const { data, error } = await supabase.rpc('save_image_analysis', {
      p_ember_id: emberId,
      p_user_id: userId,
      p_analysis_text: analysisText,
      p_image_url: imageUrl,
      p_openai_model: openaiModel,
      p_tokens_used: tokensUsed
    });

    if (error) {
      console.error('❌ [DATABASE] Error saving image analysis:', error);
      throw error;
    }

    console.log('✅ [DATABASE] Image analysis saved successfully, ID:', data);
    return data;
  } catch (error) {
    console.error('❌ [DATABASE] saveImageAnalysis failed:', error);
    throw error;
  }
};

/**
 * Get image analysis data for an ember
 * @param {string} emberId - Ember ID
 * @returns {Promise<Object|null>} - Analysis data or null if not found
 */
export const getImageAnalysis = async (emberId) => {
  try {
    console.log('🔍 [DATABASE] Getting image analysis for ember:', emberId);

    const { data, error } = await supabase.rpc('get_image_analysis', {
      p_ember_id: emberId
    });

    if (error) {
      console.error('❌ [DATABASE] Error getting image analysis:', error);
      throw error;
    }

    const result = data && data.length > 0 ? data[0] : null;
    console.log('✅ [DATABASE] Image analysis retrieved:', result ? 'Found' : 'Not found');
    return result;
  } catch (error) {
    console.error('❌ [DATABASE] getImageAnalysis failed:', error);
    throw error;
  }
};

/**
 * Trigger OpenAI image analysis for an ember
 * @param {string} emberId - Ember ID
 * @param {string} imageUrl - URL of the image to analyze
 * @returns {Promise<Object>} - Analysis result
 */
export const triggerImageAnalysis = async (emberId, imageUrl) => {
  try {
    console.log('🚀 [DATABASE] Triggering OpenAI image analysis:', { emberId, imageUrl });

    // Check if we're in development and use direct OpenAI call
    const isDevelopment = import.meta.env.MODE === 'development' || window.location.hostname === 'localhost';
    
    if (isDevelopment) {
      console.log('🔧 [DATABASE] Development mode detected, calling OpenAI directly...');
      return await analyzeImageWithOpenAI(emberId, imageUrl);
    }

    // Production: use API route
    const response = await fetch('/api/analyze-image', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        emberId,
        imageUrl
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`Analysis failed: ${errorData.error || response.statusText}`);
    }

    const result = await response.json();
    console.log('✅ [DATABASE] OpenAI image analysis completed:', {
      success: result.success,
      analysisLength: result.analysis?.length,
      tokensUsed: result.tokensUsed
    });

    return result;
  } catch (error) {
    console.error('❌ [DATABASE] triggerImageAnalysis failed:', error);
    throw error;
  }
};

/**
 * Direct OpenAI image analysis for development mode
 * @param {string} emberId - Ember ID
 * @param {string} imageUrl - URL of the image to analyze
 * @returns {Promise<Object>} - Analysis result
 */
const analyzeImageWithOpenAI = async (emberId, imageUrl) => {
  try {
    const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
    
    if (!apiKey) {
      throw new Error('OpenAI API key not found. Please add VITE_OPENAI_API_KEY to your .env.local file');
    }

    console.log('🔍 [DATABASE] Starting direct OpenAI analysis...');

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `Please perform a comprehensive analysis of this image. Provide detailed information about:

PEOPLE & DEMOGRAPHICS:
- Number of people visible
- Estimated age ranges (child, teen, adult, elderly)
- Gender identification (if clearly apparent)
- Ethnic diversity (if apparent)
- Facial expressions and emotions
- Body language and posture
- Relationships between people (family, friends, romantic, etc.)

CLOTHING & STYLE:
- Detailed clothing descriptions
- Fashion style (casual, formal, vintage, modern, etc.)
- Colors and patterns
- Accessories (jewelry, hats, bags, etc.)
- Seasonal appropriateness

ENVIRONMENT & SETTING:
- Indoor vs outdoor location
- Specific venue type (home, restaurant, park, office, etc.)
- Architecture and design elements
- Weather conditions (if outdoor)
- Lighting conditions (natural, artificial, etc.)
- Background elements and details

OBJECTS & ITEMS:
- All visible objects and items
- Technology/devices present
- Furniture and decorations
- Food and drinks
- Transportation visible
- Tools or equipment

ACTIVITIES & CONTEXT:
- What activity is taking place
- Event type (celebration, work, leisure, etc.)
- Interaction patterns
- Gestures and movements
- Social dynamics

TEXT & SIGNAGE:
- Any readable text in the image
- Signs, labels, or writing
- Brand names or logos
- Street signs or location indicators

ARTISTIC & TECHNICAL:
- Photo composition and angle
- Quality and clarity
- Color palette and mood
- Artistic style or filters applied
- Professional vs casual photography

CULTURAL & TEMPORAL:
- Time period indicators
- Cultural elements or traditions
- Historical context clues
- Regional characteristics

Please be thorough, descriptive, and observant. Format your response as a structured analysis covering all these areas systematically.`
              },
              {
                type: "image_url",
                image_url: {
                  url: imageUrl,
                  detail: "high"
                }
              }
            ]
          }
        ],
        max_tokens: 4000,
        temperature: 0.3
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      
      if (response.status === 401) {
        throw new Error('Invalid OpenAI API key. Please check your VITE_OPENAI_API_KEY in .env.local');
      }
      if (response.status === 429) {
        throw new Error('OpenAI API quota exceeded. Please check your billing.');
      }
      
      throw new Error(`OpenAI API error: ${errorData.error?.message || response.statusText}`);
    }

    const data = await response.json();
    const analysis = data.choices[0].message.content;

    console.log('✅ [DATABASE] Direct OpenAI analysis completed');
    console.log('📊 [DATABASE] Analysis length:', analysis.length, 'characters');

    return {
      success: true,
      analysis,
      emberId,
      imageUrl,
      timestamp: new Date().toISOString(),
      model: "gpt-4o",
      tokensUsed: data.usage?.total_tokens || 0
    };

  } catch (error) {
    console.error('❌ [DATABASE] Direct OpenAI analysis failed:', error);
    throw error;
  }
};

/**
 * PROMPT MANAGEMENT FUNCTIONS
 */

/**
 * Get active prompt by key
 * @param {string} promptKey - The prompt key to search for
 * @returns {Promise<Object|null>} - The active prompt or null
 */
export const getActivePrompt = async (promptKey) => {
  try {
    console.log('🔍 [DATABASE] Getting active prompt:', promptKey);
    
    const { data, error } = await supabase
      .rpc('get_active_prompt', { prompt_key_param: promptKey });

    if (error) {
      throw new Error(error.message);
    }

    const result = data && data.length > 0 ? data[0] : null;
    console.log('✅ [DATABASE] Active prompt retrieved:', result ? 'Found' : 'Not found');
    return result;
  } catch (error) {
    console.error('❌ [DATABASE] getActivePrompt failed:', error);
    throw error;
  }
};

/**
 * Get prompts by category and subcategory
 * @param {string} category - The category to filter by
 * @param {string} subcategory - Optional subcategory to filter by
 * @returns {Promise<Array>} - Array of prompts
 */
export const getPromptsByCategory = async (category, subcategory = null) => {
  try {
    console.log('🔍 [DATABASE] Getting prompts by category:', { category, subcategory });
    
    const { data, error } = await supabase
      .rpc('get_prompts_by_category', { 
        category_param: category,
        subcategory_param: subcategory 
      });

    if (error) {
      throw new Error(error.message);
    }

    console.log('✅ [DATABASE] Prompts retrieved:', data?.length || 0, 'items');
    return data || [];
  } catch (error) {
    console.error('❌ [DATABASE] getPromptsByCategory failed:', error);
    throw error;
  }
};

/**
 * Get all prompts (admin only)
 * @returns {Promise<Array>} - Array of all prompts
 */
export const getAllPrompts = async () => {
  try {
    console.log('🔍 [DATABASE] Getting all prompts (admin)');
    
    const { data, error } = await supabase
      .from('prompts')
      .select('*')
      .order('category', { ascending: true })
      .order('name', { ascending: true });

    if (error) {
      throw new Error(error.message);
    }

    console.log('✅ [DATABASE] All prompts retrieved:', data?.length || 0, 'items');
    return data || [];
  } catch (error) {
    console.error('❌ [DATABASE] getAllPrompts failed:', error);
    throw error;
  }
};

/**
 * Create a new prompt (admin only)
 * @param {Object} promptData - The prompt data
 * @returns {Promise<Object>} - The created prompt
 */
export const createPrompt = async (promptData) => {
  try {
    console.log('🚀 [DATABASE] Creating new prompt:', promptData.name);
    
    const { data, error } = await supabase
      .from('prompts')
      .insert([promptData])
      .select()
      .single();

    if (error) {
      throw new Error(error.message);
    }

    console.log('✅ [DATABASE] Prompt created successfully');
    return data;
  } catch (error) {
    console.error('❌ [DATABASE] createPrompt failed:', error);
    throw error;
  }
};

/**
 * Update an existing prompt (admin only)
 * @param {string} promptId - The prompt ID
 * @param {Object} updates - The updates to apply
 * @returns {Promise<Object>} - The updated prompt
 */
export const updatePrompt = async (promptId, updates) => {
  try {
    console.log('🔄 [DATABASE] Updating prompt:', promptId);
    
    const { data, error } = await supabase
      .from('prompts')
      .update(updates)
      .eq('id', promptId)
      .select()
      .single();

    if (error) {
      throw new Error(error.message);
    }

    console.log('✅ [DATABASE] Prompt updated successfully');
    return data;
  } catch (error) {
    console.error('❌ [DATABASE] updatePrompt failed:', error);
    throw error;
  }
};

/**
 * Delete a prompt (admin only)
 * @param {string} promptId - The prompt ID
 * @returns {Promise<boolean>} - Success status
 */
export const deletePrompt = async (promptId) => {
  try {
    console.log('🗑️ [DATABASE] Deleting prompt:', promptId);
    
    const { error } = await supabase
      .from('prompts')
      .delete()
      .eq('id', promptId);

    if (error) {
      throw new Error(error.message);
    }

    console.log('✅ [DATABASE] Prompt deleted successfully');
    return true;
  } catch (error) {
    console.error('❌ [DATABASE] deletePrompt failed:', error);
    throw error;
  }
};

/**
 * Toggle prompt active status (admin only)
 * @param {string} promptId - The prompt ID
 * @param {boolean} isActive - The new active status
 * @returns {Promise<Object>} - The updated prompt
 */
export const togglePromptStatus = async (promptId, isActive) => {
  try {
    console.log('🔄 [DATABASE] Toggling prompt status:', { promptId, isActive });
    
    const { data, error } = await supabase
      .from('prompts')
      .update({ is_active: isActive })
      .eq('id', promptId)
      .select()
      .single();

    if (error) {
      throw new Error(error.message);
    }

    console.log('✅ [DATABASE] Prompt status updated successfully');
    return data;
  } catch (error) {
    console.error('❌ [DATABASE] togglePromptStatus failed:', error);
    throw error;
  }
};

/**
 * Set a story cut as the primary one for an ember
 * Only the ember owner can set the primary story cut
 */
export const setPrimaryStoryCut = async (storyCutId, emberId, userId) => {
  try {
    // First check if the user is the ember owner
    const { data: ember, error: emberError } = await supabase
      .from('embers')
      .select('user_id')
      .eq('id', emberId)
      .single();
    
    if (emberError) {
      throw new Error(emberError.message);
    }
    
    // Only the ember owner can set the primary story cut
    if (ember.user_id !== userId) {
      throw new Error('Only the ember owner can set the primary story cut');
    }
    
    // Update the ember with the primary story cut ID
    const { data, error } = await supabase
      .from('embers')
      .update({ primary_story_cut_id: storyCutId })
      .eq('id', emberId)
      .eq('user_id', userId) // Extra safety check
      .select()
      .single();
    
    if (error) {
      throw new Error(error.message);
    }
    
    return data;
  } catch (error) {
    console.error('Error setting primary story cut:', error);
    throw error;
  }
};

/**
 * Get the primary story cut for an ember
 */
export const getPrimaryStoryCut = async (emberId) => {
  try {
    // First get the ember to find the primary_story_cut_id
    const { data: ember, error: emberError } = await supabase
      .from('embers')
      .select('primary_story_cut_id')
      .eq('id', emberId)
      .single();
    
    if (emberError) {
      throw new Error(emberError.message);
    }
    
    // If no primary story cut is set, return null
    if (!ember.primary_story_cut_id) {
      return null;
    }
    
    // Get the primary story cut details
    const { data: storyCut, error: storyCutError } = await supabase
      .from('ember_story_cuts')
      .select('*')
      .eq('id', ember.primary_story_cut_id)
      .single();
    
    if (storyCutError) {
      console.warn('Primary story cut not found:', storyCutError.message);
      return null;
    }
    
    return storyCut;
  } catch (error) {
    console.error('Error getting primary story cut:', error);
    return null;
  }
};

/**
 * Add primary_story_cut_id column to embers table if it doesn't exist
 */
export const addPrimaryStoryCutColumn = async () => {
  try {
    console.log('Checking if primary_story_cut_id column exists in embers table...');
    
    // Check if the column exists
    const { data, error } = await supabase.rpc('execute_sql', {
      sql_query: `
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'embers' 
        AND column_name = 'primary_story_cut_id'
      `
    });
    
    if (error) {
      console.error('Error checking for primary_story_cut_id column:', error);
      return false;
    }
    
    // If column exists, nothing to do
    if (data && data.length > 0) {
      console.log('primary_story_cut_id column already exists');
      return true;
    }
    
    console.log('Adding primary_story_cut_id column to embers table...');
    
    // Add the column
    const result = await supabase.rpc('execute_sql', {
      sql_query: `
        ALTER TABLE embers
        ADD COLUMN primary_story_cut_id UUID REFERENCES ember_story_cuts(id) ON DELETE SET NULL;
        
        CREATE INDEX IF NOT EXISTS embers_primary_story_cut_id_idx ON embers(primary_story_cut_id);
      `
    });
    
    if (result.error) {
      console.error('Error adding primary_story_cut_id column:', result.error);
      return false;
    }
    
    console.log('Successfully added primary_story_cut_id column to embers table');
    return true;
  } catch (error) {
    console.error('Error in addPrimaryStoryCutColumn:', error);
    return false;
  }
};

// =============================================================================
// ADMIN ANALYTICS FUNCTIONS
// =============================================================================

/**
 * Get ember analytics for admin dashboard (no private user data)
 * Only accessible by admins
 */
export const getEmberAnalytics = async () => {
  try {
    console.log('📊 [ADMIN] Fetching ember analytics...');

    // Get basic ember statistics
    const { data: emberStats, error: emberError } = await supabase
      .from('embers')
      .select('id, created_at, title, is_public')
      .order('created_at', { ascending: false });

    if (emberError) {
      throw new Error(emberError.message);
    }

    // Get story cut analytics with token usage
    const { data: storyCuts, error: storyCutsError } = await supabase
      .from('ember_story_cuts')
      .select('id, ember_id, created_at, duration, word_count, metadata');

    if (storyCutsError) {
      throw new Error(storyCutsError.message);
    }

    // Get sharing analytics
    const { data: shares, error: sharesError } = await supabase
      .from('ember_shares')
      .select('ember_id, shared_with_email, is_active, created_at')
      .eq('is_active', true);

    if (sharesError) {
      throw new Error(sharesError.message);
    }

    // Get image analysis token usage
    const { data: imageAnalysis, error: imageError } = await supabase
      .from('image_analysis')
      .select('ember_id, tokens_used, created_at');

    if (imageError) {
      console.warn('Could not fetch image analysis data:', imageError.message);
    }

    // Calculate analytics
    const totalEmbers = emberStats.length;
    const publicEmbers = emberStats.filter(ember => ember.is_public).length;
    const privateEmbers = totalEmbers - publicEmbers;

    // Calculate token usage from story cuts
    let totalStoryCutTokens = 0;
    storyCuts.forEach(cut => {
      if (cut.metadata && typeof cut.metadata === 'object' && cut.metadata.tokensUsed) {
        totalStoryCutTokens += cut.metadata.tokensUsed;
      }
    });

    // Calculate token usage from image analysis
    let totalImageAnalysisTokens = 0;
    if (imageAnalysis) {
      imageAnalysis.forEach(analysis => {
        if (analysis.tokens_used) {
          totalImageAnalysisTokens += analysis.tokens_used;
        }
      });
    }

    // Calculate contributor statistics
    const contributorStats = {};
    shares.forEach(share => {
      if (!contributorStats[share.ember_id]) {
        contributorStats[share.ember_id] = [];
      }
      contributorStats[share.ember_id].push(share.shared_with_email);
    });

    const embersWithContributors = Object.keys(contributorStats).length;
    const totalContributorConnections = shares.length;
    const averageContributorsPerEmber = embersWithContributors > 0 
      ? (totalContributorConnections / embersWithContributors).toFixed(1) 
      : 0;

    // Recent activity (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const recentEmbers = emberStats.filter(ember => 
      new Date(ember.created_at) > thirtyDaysAgo
    );
    
    const recentStoryCuts = storyCuts.filter(cut => 
      new Date(cut.created_at) > thirtyDaysAgo
    );

    // Top embers by activity (most story cuts)
    const emberActivity = {};
    storyCuts.forEach(cut => {
      if (!emberActivity[cut.ember_id]) {
        emberActivity[cut.ember_id] = {
          ember_id: cut.ember_id,
          story_cuts: 0,
          total_duration: 0,
          contributors: contributorStats[cut.ember_id]?.length || 0
        };
      }
      emberActivity[cut.ember_id].story_cuts++;
      emberActivity[cut.ember_id].total_duration += cut.duration || 0;
    });

    // Add ember titles (keeping them generic for privacy)
    Object.keys(emberActivity).forEach(emberId => {
      const ember = emberStats.find(e => e.id === emberId);
      emberActivity[emberId].title = ember ? ember.title.substring(0, 50) + (ember.title.length > 50 ? '...' : '') : 'Unknown';
      emberActivity[emberId].is_public = ember ? ember.is_public : false;
      emberActivity[emberId].created_at = ember ? ember.created_at : null;
    });

    const topEmbers = Object.values(emberActivity)
      .sort((a, b) => b.story_cuts - a.story_cuts)
      .slice(0, 10);

    console.log('✅ [ADMIN] Ember analytics calculated successfully');

    return {
      overview: {
        totalEmbers,
        publicEmbers,
        privateEmbers,
        totalStoryCuts: storyCuts.length,
        embersWithContributors,
        totalContributorConnections,
        averageContributorsPerEmber: parseFloat(averageContributorsPerEmber)
      },
      tokenUsage: {
        totalStoryCutTokens,
        totalImageAnalysisTokens,
        totalTokens: totalStoryCutTokens + totalImageAnalysisTokens,
        estimatedCost: ((totalStoryCutTokens + totalImageAnalysisTokens) * 0.000015).toFixed(4) // Rough estimate for GPT-4o
      },
      activity: {
        recentEmbers: recentEmbers.length,
        recentStoryCuts: recentStoryCuts.length,
        topEmbers
      },
      timestamps: {
        oldestEmber: emberStats.length > 0 ? emberStats[emberStats.length - 1].created_at : null,
        newestEmber: emberStats.length > 0 ? emberStats[0].created_at : null,
        calculatedAt: new Date().toISOString()
      }
    };

  } catch (error) {
    console.error('❌ [ADMIN] Error fetching ember analytics:', error);
    throw error;
  }
};

/**
 * Get detailed ember list for admin (minimal info, no private data)
 */
export const getAdminEmberList = async (limit = 50, offset = 0) => {
  try {
    console.log('📋 [ADMIN] Fetching admin ember list...');

    // Get basic ember data
    const { data: embers, error: emberError } = await supabase
      .from('embers')
      .select('id, title, created_at, is_public')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (emberError) {
      throw new Error(emberError.message);
    }

    // Get story cuts counts for these embers
    const emberIds = embers.map(e => e.id);
    
    const { data: storyCutCounts, error: storyCutError } = await supabase
      .from('ember_story_cuts')
      .select('ember_id')
      .in('ember_id', emberIds);

    const { data: shareCounts, error: shareError } = await supabase
      .from('ember_shares')
      .select('ember_id')
      .in('ember_id', emberIds)
      .eq('is_active', true);

    if (storyCutError) {
      console.warn('Could not fetch story cut counts:', storyCutError.message);
    }
    if (shareError) {
      console.warn('Could not fetch share counts:', shareError.message);
    }

    // Count story cuts and shares per ember
    const storyCutCountMap = {};
    const shareCountMap = {};

    if (storyCutCounts) {
      storyCutCounts.forEach(cut => {
        storyCutCountMap[cut.ember_id] = (storyCutCountMap[cut.ember_id] || 0) + 1;
      });
    }

    if (shareCounts) {
      shareCounts.forEach(share => {
        shareCountMap[share.ember_id] = (shareCountMap[share.ember_id] || 0) + 1;
      });
    }

    // Transform data to include counts
    const transformedData = embers.map(ember => ({
      id: ember.id,
      title: ember.title.substring(0, 60) + (ember.title.length > 60 ? '...' : ''),
      created_at: ember.created_at,
      is_public: ember.is_public,
      story_cuts_count: storyCutCountMap[ember.id] || 0,
      contributors_count: shareCountMap[ember.id] || 0
    }));

    console.log('✅ [ADMIN] Admin ember list retrieved:', transformedData.length, 'embers');
    return transformedData;

  } catch (error) {
    console.error('❌ [ADMIN] Error fetching admin ember list:', error);
    throw error;
  }
};

/**
 * Tagged People functions
 */

/**
 * Get all tagged people for an ember
 */
export const getEmberTaggedPeople = async (emberId) => {
  try {
    const { data, error } = await supabase
      .rpc('get_ember_tagged_people', { ember_uuid: emberId });

    if (error) {
      throw new Error(error.message);
    }

    return data || [];
  } catch (error) {
    console.error('Error fetching tagged people:', error);
    throw error;
  }
};

/**
 * Add a tagged person to an ember
 */
export const addTaggedPerson = async (emberId, personName, faceCoordinates, contributorEmail = null, emberShareId = null) => {
  try {
    const { data, error } = await supabase
      .rpc('add_tagged_person', {
        ember_uuid: emberId,
        person_name_param: personName,
        face_coords: faceCoordinates,
        contributor_email_param: contributorEmail,
        ember_share_id_param: emberShareId
      });

    if (error) {
      throw new Error(error.message);
    }

    return data;
  } catch (error) {
    console.error('Error adding tagged person:', error);
    throw error;
  }
};

/**
 * Update a tagged person (mainly for connecting to contributors)
 */
export const updateTaggedPerson = async (taggedPersonId, personName = null, contributorEmail = null, emberShareId = null) => {
  try {
    const { data, error } = await supabase
      .rpc('update_tagged_person', {
        tagged_person_id: taggedPersonId,
        person_name_param: personName,
        contributor_email_param: contributorEmail,
        ember_share_id_param: emberShareId
      });

    if (error) {
      throw new Error(error.message);
    }

    return data;
  } catch (error) {
    console.error('Error updating tagged person:', error);
    throw error;
  }
};

/**
 * Delete a tagged person
 */
export const deleteTaggedPerson = async (taggedPersonId) => {
  try {
    const { error } = await supabase
      .from('ember_tagged_people')
      .delete()
      .eq('id', taggedPersonId);

    if (error) {
      throw new Error(error.message);
    }

    return true;
  } catch (error) {
    console.error('Error deleting tagged person:', error);
    throw error;
  }
};

/**
 * Get potential contributor matches for a tagged person
 * Returns contributors who might match the tagged person's name
 */
export const getPotentialContributorMatches = async (emberId, personName) => {
  try {
    // Import the sharing function here to avoid circular imports
    const { getEmberWithSharing } = await import('./sharing.js');
    
    // Get all contributors for this ember
    const emberData = await getEmberWithSharing(emberId);
    const contributors = emberData.shares || [];

    // Simple name matching - look for first name matches
    const nameToMatch = personName.toLowerCase().trim();
    const matches = contributors.filter(contributor => {
      const contributorName = contributor.shared_user?.first_name?.toLowerCase() || '';
      const contributorLastName = contributor.shared_user?.last_name?.toLowerCase() || '';
      const fullName = `${contributorName} ${contributorLastName}`.trim();
      
      return contributorName.includes(nameToMatch) || 
             contributorLastName.includes(nameToMatch) ||
             fullName.includes(nameToMatch) ||
             nameToMatch.includes(contributorName);
    });

    return matches;
  } catch (error) {
    console.error('Error finding contributor matches:', error);
    throw error;
  }
};

// =============================================================================
// SUPPORTING MEDIA FUNCTIONS
// =============================================================================

/**
 * Save supporting media files to an ember
 */
export const saveEmberSupportingMedia = async (emberId, userId, mediaFiles) => {
  try {
    console.log('💾 Saving supporting media for ember:', emberId, mediaFiles.length, 'files');
    
    const mediaRecords = mediaFiles.map(file => ({
      ember_id: emberId,
      uploaded_by_user_id: userId,
      file_url: file.url,
      file_name: file.originalName,
      file_size: file.size,
      file_type: file.type,
      file_category: file.category,
      storage_path: file.pathname
    }));

    const { data, error } = await supabase
      .from('ember_supporting_media')
      .insert(mediaRecords)
      .select();

    if (error) {
      throw new Error(error.message);
    }

    console.log('✅ Supporting media saved successfully:', data);
    return data;
  } catch (error) {
    console.error('Error saving supporting media:', error);
    throw error;
  }
};

/**
 * Get all supporting media for an ember
 */
export const getEmberSupportingMedia = async (emberId) => {
  try {
    const { data, error } = await supabase
      .from('ember_supporting_media')
      .select(`
        *,
        uploader:user_profiles!uploaded_by_user_id(
          user_id,
          first_name,
          last_name,
          avatar_url
        )
      `)
      .eq('ember_id', emberId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(error.message);
    }

    return data || [];
  } catch (error) {
    console.error('Error fetching supporting media:', error);
    throw error;
  }
};

/**
 * Delete supporting media item
 */
export const deleteEmberSupportingMedia = async (mediaId, userId) => {
  try {
    // First check if user can delete (must be uploader or ember owner)
    const { data: mediaItem, error: fetchError } = await supabase
      .from('ember_supporting_media')
      .select(`
        *,
        ember:embers!ember_id(user_id)
      `)
      .eq('id', mediaId)
      .single();

    if (fetchError) {
      throw new Error(fetchError.message);
    }

    // Check permissions
    const canDelete = mediaItem.uploaded_by_user_id === userId || 
                     mediaItem.ember.user_id === userId;

    if (!canDelete) {
      throw new Error('Permission denied: You can only delete media you uploaded or if you own the ember');
    }

    const { error: deleteError } = await supabase
      .from('ember_supporting_media')
      .delete()
      .eq('id', mediaId);

    if (deleteError) {
      throw new Error(deleteError.message);
    }

    return true;
  } catch (error) {
    console.error('Error deleting supporting media:', error);
    throw error;
  }
};

/**
 * Admin function to get all user profiles with emails
 * This requires super admin privileges
 */
export const getAllUsersWithEmails = async () => {
  try {
    // NOTE: RPC function exists but doesn't include first_name, last_name, bio, avatar_url
    // Using direct table query to get all profile fields, then merging with email data
    
    const { data: profiles, error: profilesError } = await supabase
      .from('user_profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (profilesError) {
      throw new Error(profilesError.message);
    }

    // Since the RPC function was working for emails, let's try to get them from auth.users
    // For now, we'll use the RPC function just for emails and merge with our profile data
    let emailData = [];
    try {
      const { data: emailRpcData } = await supabase.rpc('get_user_profiles_with_email');
      emailData = emailRpcData || [];
    } catch (e) {
      console.log('Could not get emails from RPC:', e);
    }
    
    const usersWithEmails = (profiles || []).map(profile => {
      // Find matching email data
      const emailInfo = emailData.find(e => e.user_id === profile.user_id);
      return {
        ...profile,
        email: emailInfo?.email || `user-${profile.user_id.substring(0, 8)}@example.com`,
        last_sign_in_at: emailInfo?.last_sign_in_at || null,
        auth_created_at: emailInfo?.auth_created_at || profile.created_at
      };
    });



          return usersWithEmails;
  } catch (error) {
    console.error('Error fetching all users with emails:', error);
    throw error;
  }
}; 