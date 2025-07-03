/**
 * Ember AI - Story Circle Intelligence
 * 
 * This module handles the AI-driven story circle conversations, analyzing
 * user comments and the full ember context to generate thoughtful questions
 * that explore the Five W's and encourage emotional sharing.
 */

import { executePrompt } from './promptManager.js';
import { emberContextBuilders } from './emberContext.js';
import { addStoryMessage, addChatMessage } from './database.js';

/**
 * Analyze the ember context to determine the status of the Five W's
 * @param {Object} context - The complete ember context
 * @returns {Object} Status of each W with description
 */
function analyzeFiveWs(context) {
  const analysis = {
    who_status: 'Unknown',
    what_status: 'Unknown', 
    where_status: 'Unknown',
    when_status: 'Unknown',
    why_status: 'Unknown'
  };

  // WHO - Check for tagged people, contributors, image analysis people
  const peopleCount = (context.taggedPeople?.length || 0) + (context.contributors?.length || 0);
  if (peopleCount > 0) {
    analysis.who_status = `${peopleCount} people identified`;
  } else if (context.imageAnalysis && context.imageAnalysis.toLowerCase().includes('people')) {
    analysis.who_status = 'People visible in image, not yet tagged';
  } else {
    analysis.who_status = 'No people identified yet';
  }

  // WHAT - Check image analysis and story messages for activities
  const storyMessages = context.storyMessages || [];
  if (storyMessages.length > 0) {
    analysis.what_status = `Activity discussed in ${storyMessages.length} messages`;
  } else if (context.imageAnalysis) {
    analysis.what_status = 'Activity analyzed by AI, awaiting personal details';
  } else {
    analysis.what_status = 'Activity/event not yet described';
  }

  // WHERE - Check location data
  const ember = context.ember || {};
  if (ember.manual_location || ember.address || (ember.latitude && ember.longitude)) {
    analysis.where_status = 'Location identified';
  } else {
    analysis.where_status = 'Location not specified';
  }

  // WHEN - Check timestamp data
  if (ember.manual_datetime || ember.ember_timestamp) {
    analysis.when_status = 'Time/date established';
  } else {
    analysis.when_status = 'Time/date not specified';
  }

  // WHY - This is the hardest to auto-detect, check for emotional content in stories
  const hasEmotionalContent = storyMessages.some(msg => 
    /\b(feel|felt|emotion|love|happy|sad|excited|memorable|special|important|significant)\b/i.test(msg.message || msg.content)
  );
  
  if (hasEmotionalContent) {
    analysis.why_status = 'Emotional significance partially explored';
  } else if (storyMessages.length > 0) {
    analysis.why_status = 'Stories shared but emotional significance unclear';
  } else {
    analysis.why_status = 'Emotional significance not yet explored';
  }

  return analysis;
}

/**
 * Build conversation history string from story messages
 * @param {Array} messages - Array of story messages
 * @returns {string} Formatted conversation history
 */
function buildConversationHistory(messages) {
  if (!messages || messages.length === 0) {
    return 'No previous conversation.';
  }

  // Get the last 5 messages to keep context manageable
  const recentMessages = messages.slice(-5);
  
  return recentMessages.map(msg => {
    const author = msg.user_name || msg.sender || 'Anonymous';
    const content = msg.message || msg.content || '';
    const time = new Date(msg.created_at).toLocaleDateString();
    return `[${time}] ${author}: ${content}`;
  }).join('\n');
}

/**
 * Generate an Ember AI question based on a new comment
 * @param {string} emberId - The ember ID
 * @param {string} newComment - The new comment to analyze
 * @param {string} commentAuthor - Who made the comment
 * @param {Array} conversationHistory - Previous conversation messages
 * @returns {Promise<Object>} AI response with question
 */
export async function generateEmberAIQuestion(emberId, newComment, commentAuthor, conversationHistory = []) {
  try {
    console.log('🤖 [EMBER AI] Generating question for comment:', { emberId, commentAuthor });

    // Get full ember context
    const emberContext = await emberContextBuilders.forConversation(emberId);
    
    // Analyze the Five W's status
    const fiveWsAnalysis = analyzeFiveWs({ 
      ember: { id: emberId }, // We'll get this from the context
      ...emberContext 
    });

    // Build conversation history
    const conversationHistoryText = buildConversationHistory(conversationHistory);

    // Prepare variables for the prompt
    const variables = {
      ember_context: emberContext,
      conversation_history: conversationHistoryText,
      new_comment: newComment,
      comment_author: commentAuthor,
      ...fiveWsAnalysis
    };

    console.log('📝 [EMBER AI] Five W\'s analysis:', fiveWsAnalysis);

    // Execute the Ember AI prompt
    const result = await executePrompt('story_circle_ember_ai', variables, emberId);

    if (!result.success) {
      throw new Error(result.error);
    }

    console.log('✅ [EMBER AI] Generated question:', result.content);

    return {
      success: true,
      question: result.content.trim(),
      fiveWsAnalysis,
      tokensUsed: result.tokensUsed,
      model: result.model
    };

  } catch (error) {
    console.error('❌ [EMBER AI] Error generating question:', error);
    return {
      success: false,
      error: error.message,
      question: null
    };
  }
}

/**
 * Post an Ember AI question to the story conversation
 * @param {string} conversationId - The conversation ID
 * @param {string} question - The AI-generated question
 * @returns {Promise<Object>} The created message
 */
export async function postEmberAIQuestion(conversationId, question) {
  try {
    console.log('💬 [EMBER AI] Posting question to conversation:', conversationId);

    const messageData = {
      conversationId,
      sender: 'Ember AI',
      messageType: 'ai_question',
      content: question,
      hasAudio: false
    };

    const aiMessage = await addStoryMessage(messageData);
    
    console.log('✅ [EMBER AI] Question posted successfully:', aiMessage.id);
    return aiMessage;

  } catch (error) {
    console.error('❌ [EMBER AI] Error posting question:', error);
    throw error;
  }
}

/**
 * Post an Ember AI question to a chat conversation (EmberChat system)
 * @param {string} emberId - The ember ID
 * @param {string} question - The AI-generated question
 * @param {string} userName - The name to display for Ember AI
 * @returns {Promise<Object>} The created message
 */
export async function postEmberAIChatQuestion(emberId, question, userName = 'Ember AI') {
  try {
    console.log('💬 [EMBER AI] Posting chat question to ember:', emberId);

    const chatData = {
      ember_id: emberId,
      message: question,
      message_type: 'question',
      parent_id: null,
      user_id: null, // AI user
      user_name: userName,
      user_email: null
    };

    const aiMessage = await addChatMessage(chatData);
    
    console.log('✅ [EMBER AI] Chat question posted successfully:', aiMessage.id);
    return aiMessage;

  } catch (error) {
    console.error('❌ [EMBER AI] Error posting chat question:', error);
    throw error;
  }
}

/**
 * Main function: Analyze a new comment and potentially generate an AI question
 * @param {Object} params - Parameters object
 * @param {string} params.emberId - The ember ID
 * @param {string} params.conversationId - The conversation ID (null for chat system)
 * @param {string} params.newComment - The new comment
 * @param {string} params.commentAuthor - Who made the comment
 * @param {Array} params.conversationHistory - Previous messages
 * @param {Object} params.options - Options for AI behavior
 * @returns {Promise<Object>} Result object
 */
export async function analyzeCommentAndRespond({ 
  emberId, 
  conversationId, 
  newComment, 
  commentAuthor, 
  conversationHistory = [],
  options = {} 
}) {
  try {
    console.log('🧠 [EMBER AI] Analyzing comment and preparing response...');

    // Options for controlling AI behavior
    const {
      shouldRespond = true,          // Whether AI should respond at all
      minCommentLength = 10,         // Minimum comment length to trigger AI
      maxAIQuestionsPerConvo = 3,    // Limit AI questions per conversation
      cooldownMinutes = 5            // Minutes between AI responses
    } = options;

    // Check if we should respond
    if (!shouldRespond || newComment.length < minCommentLength) {
      console.log('⏭️ [EMBER AI] Skipping response (too short or disabled)');
      return { responded: false, reason: 'Response criteria not met' };
    }

    // Count existing AI questions in conversation
    const aiQuestionCount = conversationHistory.filter(msg => 
      msg.sender === 'Ember AI' || msg.messageType === 'ai_question' || 
      (msg.user_name === 'Ember AI' && msg.messageType === 'question')
    ).length;

    if (aiQuestionCount >= maxAIQuestionsPerConvo) {
      console.log('⏭️ [EMBER AI] Skipping response (max questions reached)');
      return { responded: false, reason: 'Maximum AI questions reached' };
    }

    // Check cooldown (if there was a recent AI message)
    const lastAIMessage = conversationHistory
      .filter(msg => msg.sender === 'Ember AI' || msg.user_name === 'Ember AI')
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0];

    if (lastAIMessage) {
      const timeSinceLastAI = Date.now() - new Date(lastAIMessage.created_at);
      const cooldownMs = cooldownMinutes * 60 * 1000;
      
      if (timeSinceLastAI < cooldownMs) {
        console.log('⏭️ [EMBER AI] Skipping response (cooldown period)');
        return { responded: false, reason: 'Cooldown period active' };
      }
    }

    // Generate AI question
    const questionResult = await generateEmberAIQuestion(
      emberId, 
      newComment, 
      commentAuthor, 
      conversationHistory
    );

    if (!questionResult.success) {
      throw new Error(questionResult.error);
    }

    // Post the question using appropriate system
    let aiMessage;
    if (conversationId) {
      // Use story conversation system
      aiMessage = await postEmberAIQuestion(conversationId, questionResult.question);
    } else {
      // Use chat system
      aiMessage = await postEmberAIChatQuestion(emberId, questionResult.question);
    }

    console.log('🎉 [EMBER AI] Successfully analyzed comment and posted question');

    return {
      responded: true,
      aiMessage,
      question: questionResult.question,
      fiveWsAnalysis: questionResult.fiveWsAnalysis,
      tokensUsed: questionResult.tokensUsed
    };

  } catch (error) {
    console.error('❌ [EMBER AI] Error in analyzeCommentAndRespond:', error);
    return {
      responded: false,
      error: error.message
    };
  }
}

/**
 * Utility function to check if Ember AI should be active for an ember
 * @param {string} emberId - The ember ID
 * @returns {Promise<boolean>} Whether Ember AI should be active
 */
export async function shouldEmberAIBeActive(emberId) {
  // For now, always active. In the future, this could check:
  // - User preferences
  // - Ember settings
  // - Admin controls
  // - Conversation state
  return true;
} 