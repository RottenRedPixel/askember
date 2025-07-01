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
      title: 'The Story',
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