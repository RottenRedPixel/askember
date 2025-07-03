// Universal Ember Context Builder
// This function gathers ALL available ember wiki content for OpenAI calls

import { supabase } from './supabase.js';

/**
 * Builds comprehensive ember context for OpenAI API calls
 * @param {string} emberId - The ember UUID
 * @param {Object} options - Additional context options
 * @returns {Object} Complete ember context object
 */
export async function buildEmberContext(emberId, options = {}) {
  try {
    const context = {
      ember: null,
      imageAnalysis: null,
      storyMessages: [],
      supportingMedia: [],
      taggedPeople: [],
      contributors: [],
      votes: [],
      metadata: {}
    };

    // 1. Get core ember data
    const { data: ember, error: emberError } = await supabase
      .from('embers')
      .select('*')
      .eq('id', emberId)
      .single();

    if (emberError) {
      console.error('Error fetching ember:', emberError);
      return context;
    }

    context.ember = ember;

    // 2. Get image analysis
    if (ember?.image_analysis) {
      context.imageAnalysis = ember.image_analysis;
    }

    // 3. Get ALL story messages/conversations (if table exists)
    try {
      const { data: storyMessages, error: storyError } = await supabase
        .from('story_messages')
        .select('*')
        .eq('ember_id', emberId)
        .order('created_at', { ascending: true });

      if (!storyError && storyMessages) {
        context.storyMessages = storyMessages;
      }
    } catch (error) {
      console.log('Story messages table not available:', error.message);
    }

    // 4. Get supporting media files (if table exists)
    try {
      const { data: supportingMedia, error: mediaError } = await supabase
        .from('supporting_media')
        .select('*')
        .eq('ember_id', emberId)
        .order('created_at', { ascending: true });

      if (!mediaError && supportingMedia) {
        context.supportingMedia = supportingMedia;
      }
    } catch (error) {
      console.log('Supporting media table not available:', error.message);
    }

    // 5. Get tagged people (if table exists)
    try {
      const { data: taggedPeople, error: taggedError } = await supabase
        .from('tagged_people')
        .select('*')
        .eq('ember_id', emberId)
        .order('created_at', { ascending: true });

      if (!taggedError && taggedPeople) {
        context.taggedPeople = taggedPeople;
      }
    } catch (error) {
      console.log('Tagged people table not available:', error.message);
    }

    // 6. Get contributors (if table exists)
    try {
      const { data: contributors, error: contributorsError } = await supabase
        .from('ember_contributors')
        .select('*')
        .eq('ember_id', emberId)
        .order('last_contributed_at', { ascending: false });

      if (!contributorsError && contributors) {
        context.contributors = contributors;
      }
    } catch (error) {
      console.log('Contributors table not available:', error.message);
    }

    // 7. Get votes/ratings (if table exists)
    try {
      const { data: votes, error: votesError } = await supabase
        .from('ember_votes')
        .select('*')
        .eq('ember_id', emberId)
        .order('created_at', { ascending: true });

      if (!votesError && votes) {
        context.votes = votes;
      }
    } catch (error) {
      console.log('Votes table not available:', error.message);
    }

    // 8. Calculate rich metadata (ensure arrays are defined)
    const storyMessages = context.storyMessages || [];
    const supportingMedia = context.supportingMedia || [];
    const taggedPeople = context.taggedPeople || [];
    const contributors = context.contributors || [];
    const votes = context.votes || [];

    context.metadata = {
      totalStoryMessages: storyMessages.length,
      totalSupportingMedia: supportingMedia.length,
      totalTaggedPeople: taggedPeople.length,
      totalContributors: contributors.length,
      totalVotes: votes.length,
      hasRichNarrative: storyMessages.length > 0,
      hasMultipleMedia: supportingMedia.length > 0,
      hasTaggedPeople: taggedPeople.length > 0,
      isCollaborative: contributors.length > 1,
      lastActivity: getLastActivity(context),
      contextCompleteness: calculateContextCompleteness(context)
    };

    return context;

  } catch (error) {
    console.error('Error building ember context:', error);
    return {
      ember: null,
      imageAnalysis: null,
      storyMessages: [],
      supportingMedia: [],
      taggedPeople: [],
      contributors: [],
      metadata: { error: error.message }
    };
  }
}

/**
 * Formats ember context into a human-readable string for OpenAI
 * @param {Object} context - The ember context object
 * @param {Object} options - Formatting options
 * @returns {string} Formatted context string
 */
export function formatEmberContextForAI(context, options = {}) {
  const { 
    includeSystemInfo = true,
    includeMetadata = true,
    includeMediaDetails = true,
    includePeopleDetails = true,
    includeNarrative = true,
    maxStoryLength = 5000 
  } = options;

  let formattedContext = '';

  // System information
  if (includeSystemInfo && context.ember) {
    formattedContext += `=== EMBER BASIC INFO ===\n`;
    formattedContext += `Title: ${context.ember.title || 'Untitled'}\n`;
    formattedContext += `Location: ${context.ember.location || 'Unknown'}\n`;
    formattedContext += `Date/Time: ${context.ember.date_time || 'Unknown'}\n`;
    formattedContext += `Camera: ${context.ember.camera_info || 'Unknown'}\n`;
    formattedContext += `Creator: User ID ${context.ember.user_id || 'Unknown'}\n\n`;
  }

  // Image analysis
  if (context.imageAnalysis) {
    formattedContext += `=== IMAGE ANALYSIS ===\n`;
    formattedContext += `${context.imageAnalysis}\n\n`;
  }

  // Story narrative
  const storyMessages = context.storyMessages || [];
  if (includeNarrative && storyMessages.length > 0) {
    formattedContext += `=== STORY NARRATIVE ===\n`;
    let storyText = '';
    
    for (const message of storyMessages) {
      const author = `User ${message.user_id || 'Unknown'}`;
      const timestamp = new Date(message.created_at).toLocaleString();
      storyText += `[${timestamp}] ${author}: ${message.message}\n`;
    }

    // Truncate if too long
    if (storyText.length > maxStoryLength) {
      storyText = storyText.substring(0, maxStoryLength) + '... [truncated]';
    }
    
    formattedContext += storyText + '\n\n';
  }

  // Tagged people
  const taggedPeople = context.taggedPeople || [];
  if (includePeopleDetails && taggedPeople.length > 0) {
    formattedContext += `=== TAGGED PEOPLE ===\n`;
    for (const person of taggedPeople) {
      formattedContext += `- ${person.name}${person.relationship ? ` (${person.relationship})` : ''}\n`;
    }
    formattedContext += '\n';
  }

  // Supporting media
  const supportingMedia = context.supportingMedia || [];
  if (includeMediaDetails && supportingMedia.length > 0) {
    formattedContext += `=== SUPPORTING MEDIA ===\n`;
    for (const media of supportingMedia) {
      const uploader = `User ${media.user_id || 'Unknown'}`;
      const timestamp = new Date(media.created_at).toLocaleString();
      formattedContext += `- ${media.media_type}: ${media.description || 'No description'} (uploaded by ${uploader} at ${timestamp})\n`;
    }
    formattedContext += '\n';
  }

  // Contributors
  const contributors = context.contributors || [];
  if (contributors.length > 1) {
    formattedContext += `=== CONTRIBUTORS ===\n`;
    for (const contributor of contributors) {
      const name = `User ${contributor.user_id || 'Unknown'}`;
      const lastActive = new Date(contributor.last_contributed_at).toLocaleString();
      formattedContext += `- ${name} (last active: ${lastActive})\n`;
    }
    formattedContext += '\n';
  }

  // Metadata summary
  if (includeMetadata && context.metadata) {
    formattedContext += `=== CONTEXT METADATA ===\n`;
    formattedContext += `Story Messages: ${context.metadata.totalStoryMessages}\n`;
    formattedContext += `Supporting Media: ${context.metadata.totalSupportingMedia}\n`;
    formattedContext += `Tagged People: ${context.metadata.totalTaggedPeople}\n`;
    formattedContext += `Contributors: ${context.metadata.totalContributors}\n`;
    formattedContext += `Collaborative: ${context.metadata.isCollaborative ? 'Yes' : 'No'}\n`;
    formattedContext += `Context Completeness: ${Math.round(context.metadata.contextCompleteness * 100)}%\n\n`;
  }

  return formattedContext.trim();
}

/**
 * Get the last activity timestamp from context
 * @param {Object} context - The ember context
 * @returns {string} ISO timestamp of last activity
 */
function getLastActivity(context) {
  const timestamps = [];
  
  if (context.ember?.created_at) timestamps.push(new Date(context.ember.created_at));
  if (context.ember?.updated_at) timestamps.push(new Date(context.ember.updated_at));
  
  // Use optional chaining and default to empty array to prevent errors
  (context.storyMessages || []).forEach(msg => {
    if (msg.created_at) timestamps.push(new Date(msg.created_at));
  });
  
  (context.supportingMedia || []).forEach(media => {
    if (media.created_at) timestamps.push(new Date(media.created_at));
  });
  
  (context.contributors || []).forEach(contributor => {
    if (contributor.last_contributed_at) timestamps.push(new Date(contributor.last_contributed_at));
  });

  return timestamps.length > 0 ? 
    new Date(Math.max(...timestamps)).toISOString() : 
    new Date().toISOString();
}

/**
 * Calculate how complete the context is (0-1 scale)
 * @param {Object} context - The ember context
 * @returns {number} Completeness score between 0 and 1
 */
function calculateContextCompleteness(context) {
  let score = 0;
  let maxScore = 0;

  // Basic ember data (required)
  maxScore += 1;
  if (context.ember) score += 1;

  // Image analysis (important)
  maxScore += 1;
  if (context.imageAnalysis) score += 1;

  // Story narrative (very important)
  maxScore += 2;
  const storyMessages = context.storyMessages || [];
  if (storyMessages.length > 0) score += 1;
  if (storyMessages.length > 3) score += 1;

  // Supporting media (valuable)
  maxScore += 1;
  const supportingMedia = context.supportingMedia || [];
  if (supportingMedia.length > 0) score += 1;

  // Tagged people (valuable)
  maxScore += 1;
  const taggedPeople = context.taggedPeople || [];
  if (taggedPeople.length > 0) score += 1;

  // Multiple contributors (collaborative bonus)
  maxScore += 1;
  const contributors = context.contributors || [];
  if (contributors.length > 1) score += 1;

  return maxScore > 0 ? score / maxScore : 0;
}

/**
 * Specialized context builder for different use cases
 */
/**
 * Build context specifically for title generation from ember data
 * @param {Object} emberData - Raw ember data object (not ID)
 * @returns {string} Formatted context string
 */
async function buildTitleGenerationContext(emberData) {
  // Build context directly from ember data object (API pattern)
  let contextParts = [];
  
  // Image information
  if (emberData.image_url) {
    contextParts.push(`This is a photo analysis for creating a title.`);
  }
  
  // Location data
  if (emberData.latitude && emberData.longitude) {
    contextParts.push(`Location: ${emberData.address || `${emberData.latitude}, ${emberData.longitude}`}`);
    if (emberData.city) {
      contextParts.push(`City: ${emberData.city}`);
    }
    if (emberData.state) {
      contextParts.push(`State: ${emberData.state}`);
    }
    if (emberData.country) {
      contextParts.push(`Country: ${emberData.country}`);
    }
  }
  
  if (emberData.manual_location) {
    contextParts.push(`Manual location: ${emberData.manual_location}`);
  }
  
  // Time and date information
  if (emberData.ember_timestamp) {
    const date = new Date(emberData.ember_timestamp);
    contextParts.push(`Date taken: ${date.toLocaleDateString()}`);
    contextParts.push(`Time taken: ${date.toLocaleTimeString()}`);
  }
  
  if (emberData.manual_datetime) {
    const date = new Date(emberData.manual_datetime);
    contextParts.push(`Manual date/time: ${date.toLocaleDateString()} ${date.toLocaleTimeString()}`);
  }
  
  // Camera information
  if (emberData.camera_make && emberData.camera_model) {
    contextParts.push(`Camera: ${emberData.camera_make} ${emberData.camera_model}`);
  }
  
  // Image analysis data
  if (emberData.image_analysis) {
    contextParts.push(`Image analysis: ${emberData.image_analysis}`);
  }
  
  // Current title (if exists)
  if (emberData.title && emberData.title !== 'Untitled Ember') {
    contextParts.push(`Current title: ${emberData.title}`);
  }

  return contextParts.join('\n');
}

export const emberContextBuilders = {
  
  // For title generation - focus on narrative and visual elements
  async forTitleGeneration(emberId) {
    const context = await buildEmberContext(emberId);
    return formatEmberContextForAI(context, {
      includeSystemInfo: true,
      includeMetadata: false,
      includeMediaDetails: false,
      includePeopleDetails: true,
      includeNarrative: true,
      maxStoryLength: 2000
    });
  },

  // Build context from raw ember data (for API usage)
  buildTitleGenerationContext: buildTitleGenerationContext,

  // For image analysis - focus on visual and metadata
  async forImageAnalysis(emberId) {
    const context = await buildEmberContext(emberId);
    return formatEmberContextForAI(context, {
      includeSystemInfo: true,
      includeMetadata: true,
      includeMediaDetails: true,
      includePeopleDetails: true,
      includeNarrative: false
    });
  },

  // For story generation - comprehensive context
  async forStoryGeneration(emberId) {
    const context = await buildEmberContext(emberId);
    return formatEmberContextForAI(context, {
      includeSystemInfo: true,
      includeMetadata: true,
      includeMediaDetails: true,
      includePeopleDetails: true,
      includeNarrative: true,
      maxStoryLength: 10000
    });
  },

  // For conversation/story circle - focus on narrative and people
  async forConversation(emberId) {
    const context = await buildEmberContext(emberId);
    return formatEmberContextForAI(context, {
      includeSystemInfo: true,
      includeMetadata: false,
      includeMediaDetails: false,
      includePeopleDetails: true,
      includeNarrative: true,
      maxStoryLength: 3000
    });
  },

  // For story cut generation - comprehensive context with emphasis on narrative
  async forStoryCut(emberId) {
    const context = await buildEmberContext(emberId);
    return formatEmberContextForAI(context, {
      includeSystemInfo: true,
      includeMetadata: true,
      includeMediaDetails: true,
      includePeopleDetails: true,
      includeNarrative: true,
      maxStoryLength: 15000 // Allow longer narratives for rich story cuts
    });
  }
}; 