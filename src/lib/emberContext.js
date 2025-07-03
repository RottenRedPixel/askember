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

    // 3. Get ALL story messages/conversations using existing function
    try {
      const { getAllStoryMessagesForEmber } = await import('./database.js');
      const result = await getAllStoryMessagesForEmber(emberId);
      if (result?.messages) {
        context.storyMessages = result.messages;
      }
    } catch (error) {
      console.log('Story messages not available:', error.message);
    }

    // 4. Get supporting media files using existing function
    try {
      const { getEmberSupportingMedia } = await import('./database.js');
      const supportingMedia = await getEmberSupportingMedia(emberId);
      if (supportingMedia) {
        context.supportingMedia = supportingMedia;
      }
    } catch (error) {
      console.log('Supporting media not available:', error.message);
    }

    // 5. Get tagged people using existing function
    try {
      const { getEmberTaggedPeople } = await import('./database.js');
      const taggedPeople = await getEmberTaggedPeople(emberId);
      if (taggedPeople) {
        context.taggedPeople = taggedPeople;
      }
    } catch (error) {
      console.log('Tagged people not available:', error.message);
    }

    // 6. Skip contributors for now (table doesn't exist)
    // TODO: Implement contributors tracking if needed
    context.contributors = [];

    // 7. Skip votes for now (table doesn't exist and you mentioned we can disregard)
    context.votes = [];

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

/**
 * Generate story cut using OpenAI directly (for development mode)
 * @param {Object} storyCutData - Story cut generation parameters
 * @returns {Promise<Object>} - Generated story cut result
 */
export async function generateStoryCutWithOpenAI(storyCutData) {
  try {
    console.log('🎬 [DIRECT] Starting story cut generation with OpenAI...');
    
    const { 
      emberId, 
      formData, 
      selectedStyle, 
      voiceCasting, 
      contributorQuotes 
    } = storyCutData;

    // Import prompt management functions
    const { executePrompt, getActivePrompt } = await import('./promptManager.js');
    
    // Calculate approximate word count (3 words per second)
    const approximateWords = Math.round(formData.duration * 3);
    
    // Build comprehensive ember context using our universal system
    console.log('🔍 Building ember context...');
    const emberContext = await emberContextBuilders.forStoryCut(emberId);
    
    // Get the master story cut generation prompt
    console.log('🔍 Loading master story cut generation prompt...');
    let masterPrompt = await getActivePrompt('story_cut_generation');
    
    if (!masterPrompt) {
      console.log('⚠️ Master story cut generation prompt not found, attempting to seed it...');
      
      // Import seeding functions
      const { supabase } = await import('./supabase.js');
      const { initialPrompts } = await import('./initialPrompts.js');
      
      // Find the story cut generation prompt in initial prompts
      const storyCutPrompt = initialPrompts.find(p => p.prompt_key === 'story_cut_generation');
      
      if (storyCutPrompt) {
        // Get current user for seeding
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        
        if (userError || !user) {
          throw new Error('Cannot seed prompt: User not authenticated');
        }
        
        // Seed the story cut generation prompt with minimal required fields
        const promptData = {
          prompt_key: storyCutPrompt.prompt_key,
          name: storyCutPrompt.title, // Use "name" field to match database schema
          description: storyCutPrompt.description,
          category: storyCutPrompt.category,
          subcategory: storyCutPrompt.subcategory,
          model: storyCutPrompt.model,
          max_tokens: Number(storyCutPrompt.max_tokens), // Ensure integer
          temperature: Number(storyCutPrompt.temperature), // Ensure decimal
          response_format: storyCutPrompt.response_format,
          prompt_type: storyCutPrompt.prompt_type,
          system_prompt: storyCutPrompt.system_prompt,
          user_prompt_template: storyCutPrompt.user_prompt_template,
          is_active: Boolean(storyCutPrompt.is_active), // Ensure boolean
          // Skip version field temporarily to avoid schema mismatch
          created_by_user_id: user.id,
          updated_by_user_id: user.id
        };
        
        console.log('🔍 Seeding prompt data (minimal):', {
          prompt_key: promptData.prompt_key,
          max_tokens: promptData.max_tokens,
          temperature: promptData.temperature,
          is_active: promptData.is_active
        });
        
        // Use the existing prompt management system for safer insertion
        const { promptsCRUD } = await import('./promptManager.js');
        const seededPrompt = await promptsCRUD.create(promptData);
        
        if (!seededPrompt) {
          throw new Error('Failed to seed story cut generation prompt: No data returned');
        }
        
        console.log('✅ Successfully seeded story cut generation prompt');
        masterPrompt = seededPrompt;
      } else {
        throw new Error('Story cut generation prompt not found in initial prompts');
      }
    } else {
      // Check if we need to update existing prompt with latest formatting instructions
      const { initialPrompts } = await import('./initialPrompts.js');
      const latestPrompt = initialPrompts.find(p => p.prompt_key === 'story_cut_generation');
      
      if (latestPrompt && masterPrompt.user_prompt_template !== latestPrompt.user_prompt_template) {
        console.log('🔄 Updating existing prompt with latest formatting instructions...');
        
        const { promptsCRUD } = await import('./promptManager.js');
        await promptsCRUD.update(masterPrompt.id, {
          user_prompt_template: latestPrompt.user_prompt_template,
          system_prompt: latestPrompt.system_prompt
        });
        
        // Reload the updated prompt
        masterPrompt = await getActivePrompt('story_cut_generation');
        console.log('✅ Updated prompt with new formatting instructions');
      }
    }
    
    if (!masterPrompt) {
      throw new Error('Master story cut generation prompt not found in database');
    }
    
    console.log('✅ Loaded master prompt:', masterPrompt.title);
    
    // Get the selected style prompt
    console.log('🎨 Loading style prompt:', selectedStyle);
    const stylePrompt = await getActivePrompt(selectedStyle);
    
    if (!stylePrompt) {
      throw new Error(`Style prompt not found: ${selectedStyle}`);
    }
    
    console.log('✅ Loaded style prompt:', stylePrompt.title);
    
    // Get all story messages for the ember
    const { getAllStoryMessagesForEmber } = await import('./database.js');
    const allStoryMessages = await getAllStoryMessagesForEmber(emberId);
    
    // Format story conversations with proper voice attribution
    let storyConversations = 'No story circle conversations available yet.';
    if (allStoryMessages?.messages && allStoryMessages.messages.length > 0) {
      storyConversations = allStoryMessages.messages
        .map(msg => {
          if (msg.sender === 'ember') {
            return `Ember AI: ${msg.content}`;
          } else {
            // Distinguish between owner and contributors in story circle
            const userLabel = msg.user_first_name || 'User';
            return `${userLabel} (Story Circle Participant): ${msg.content}`;
          }
        })
        .join('\n');
    }
    
    // Get owner's information for proper voice attribution
    const { supabase } = await import('./supabase.js');
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    const ownerFirstName = user?.user_metadata?.first_name || user?.user_metadata?.full_name?.split(' ')[0] || 'Owner';

    // Prepare all the variables for the master prompt
    const promptVariables = {
      ember_context: emberContext,
      story_conversations: storyConversations,
      style_prompt: stylePrompt.system_prompt,
      story_title: formData.title,
      duration: formData.duration,
      word_count: approximateWords,
      story_focus: formData.focus || 'General storytelling approach',
      owner_first_name: ownerFirstName,
      selected_contributors: voiceCasting.contributors?.map(c => c.name).join(', ') || 'None',
      ember_voice_name: voiceCasting.ember?.name || 'Selected Voice',
      narrator_voice_name: voiceCasting.narrator?.name || 'Selected Voice',
      voice_casting_info: JSON.stringify(voiceCasting, null, 2),
      contributor_quotes: contributorQuotes ? JSON.stringify(contributorQuotes, null, 2) : 'No direct quotes available',
      selected_style: selectedStyle,
      selected_contributors_json: JSON.stringify(voiceCasting.contributors || []),
      contributor_count: voiceCasting.contributors?.length || 0,
      has_quotes: contributorQuotes && contributorQuotes.length > 0,
      timestamp: new Date().toISOString()
    };
    
    console.log('🤖 Generating story cut with:', {
      style: stylePrompt.title,
      duration: formData.duration,
      wordCount: approximateWords,
      contributors: voiceCasting.contributors?.length || 0,
      hasQuotes: contributorQuotes && contributorQuotes.length > 0
    });

    // Execute the prompt using the prompt management system
    const result = await executePrompt('story_cut_generation', promptVariables, emberId);

    if (!result.success) {
      throw new Error(result.error);
    }

    let generatedStoryCut;
    try {
      generatedStoryCut = JSON.parse(result.content);
      console.log('✅ Generated story cut:', generatedStoryCut.title);
      console.log('🔍 Generated story cut structure:', {
        hasOwnerLines: !!generatedStoryCut.script?.ownerLines,
        hasContributorLines: !!generatedStoryCut.script?.contributorLines,
        scriptKeys: Object.keys(generatedStoryCut.script || {}),
        fullScript: generatedStoryCut.script?.fullScript?.substring(0, 200) + '...'
      });
    } catch (parseError) {
      console.error('OpenAI returned invalid JSON:', result.content);
      throw new Error('OpenAI returned invalid JSON response');
    }

    return {
      success: true,
      data: generatedStoryCut,
      tokensUsed: result.tokensUsed,
      promptUsed: masterPrompt.prompt_key,
      styleUsed: stylePrompt.prompt_key,
      model: result.model
    };

  } catch (error) {
    console.error('❌ [DIRECT] Story cut generation failed:', error);
    throw error;
  }
} 