// Story Cut Styles Configuration
export const STORY_CUT_STYLES = {
  cinematic: {
    name: "Cinematic Drama",
    description: "Epic, movie-like storytelling with dramatic narration",
    systemPrompt: "You are a master storyteller creating a cinematic experience. Focus on dramatic pacing, vivid imagery, and emotional depth. Use rich descriptive language and create tension and release.",
    emberVoiceRole: "Character/Subject",
    narratorVoiceRole: "Cinematic Narrator",
    voiceInstructions: "The ember voice should speak as the subject or character in the memory, while the narrator provides dramatic, film-like narration with rich descriptions and emotional context."
  },
  conversational: {
    name: "Conversational",
    description: "Natural, friendly storytelling like sharing with friends",
    systemPrompt: "You are telling a story to close friends in a warm, conversational style. Use natural language, personal insights, and create an intimate sharing experience.",
    emberVoiceRole: "Storyteller",
    narratorVoiceRole: "Friend/Companion",
    voiceInstructions: "Both voices should feel natural and conversational, like friends sharing memories together. Use casual language and genuine emotional connections."
  },
  documentary: {
    name: "Documentary Style",
    description: "Informative, educational approach with factual storytelling",
    systemPrompt: "You are creating an educational documentary segment. Focus on factual details, historical context, and informative narration while maintaining engagement.",
    emberVoiceRole: "Subject/Witness",
    narratorVoiceRole: "Documentary Narrator",
    voiceInstructions: "The narrator should provide clear, informative context while the ember voice shares personal testimony or first-hand experience."
  },
  poetic: {
    name: "Poetic Journey",
    description: "Artistic, metaphorical storytelling with lyrical language",
    systemPrompt: "You are a poet creating a lyrical journey. Use metaphors, beautiful imagery, and rhythmic language to create an artistic interpretation of the memory.",
    emberVoiceRole: "Muse/Spirit",
    narratorVoiceRole: "Poet",
    voiceInstructions: "Use flowing, rhythmic speech with artistic language. The ember voice should be ethereal and inspiring, while the narrator weaves poetic interpretations."
  },
  comedy: {
    name: "Comedy",
    description: "Humorous, light-hearted storytelling with wit and charm",
    systemPrompt: "You are creating an entertaining, humorous story. Find the funny, charming, or quirky aspects of the memory while being respectful and warm.",
    emberVoiceRole: "Comic Character",
    narratorVoiceRole: "Comedian/Host",
    voiceInstructions: "Use timing, wit, and charm. Both voices should contribute to the humor through timing, delivery, and playful banter."
  },
  mystery: {
    name: "Mystery",
    description: "Intriguing, suspenseful storytelling with dramatic reveals",
    systemPrompt: "You are crafting a mysterious tale. Build suspense, create intrigue, and reveal details dramatically to keep the audience engaged.",
    emberVoiceRole: "Witness/Investigator",
    narratorVoiceRole: "Mystery Narrator",
    voiceInstructions: "Use suspenseful pacing and dramatic reveals. The ember voice provides clues while the narrator builds atmosphere and tension."
  },
  adventure: {
    name: "Adventure",
    description: "Exciting, action-packed storytelling with dynamic energy",
    systemPrompt: "You are creating an exciting adventure story. Focus on action, movement, discovery, and the thrill of experience.",
    emberVoiceRole: "Adventurer/Hero",
    narratorVoiceRole: "Adventure Guide",
    voiceInstructions: "Use energetic, dynamic delivery. The ember voice should convey excitement and determination while the narrator drives the action forward."
  }
};

// Function to get array of story cut styles for UI selection
export function getStoryCutStyles() {
  return Object.keys(STORY_CUT_STYLES).map(styleId => ({
    id: styleId,
    name: STORY_CUT_STYLES[styleId].name,
    description: STORY_CUT_STYLES[styleId].description
  }));
}

// Story Cut Prompts for different contexts
export const STORY_CUT_PROMPTS = {
  // Base prompts for different story generation contexts
  base: {
    system: "You are an expert storyteller who creates engaging audio narratives from photos and memories.",
    user: "Create a compelling story based on the provided context and requirements."
  },
  
  // Context-specific prompts
  withLocation: {
    system: "You are a travel storyteller who brings places to life through narrative.",
    focus: "Emphasize the location, setting, and environmental details in your storytelling."
  },
  
  withPeople: {
    system: "You are a relationship storyteller who focuses on human connections and interactions.",
    focus: "Highlight the people involved, their relationships, and emotional connections."
  },
  
  withEvents: {
    system: "You are an event chronicler who captures moments and experiences.",
    focus: "Focus on what happened, the sequence of events, and their significance."
  },
  
  // Emotion-based prompts
  nostalgic: {
    tone: "Create a warm, nostalgic feeling that honors the memory",
    approach: "Use gentle, reflective language that evokes fond remembrance"
  },
  
  celebratory: {
    tone: "Create an uplifting, joyful celebration of the moment", 
    approach: "Use enthusiastic, positive language that highlights the special nature of the memory"
  },
  
  contemplative: {
    tone: "Create a thoughtful, reflective exploration of meaning",
    approach: "Use deeper, more philosophical language that explores significance and insight"
  }
};

// Function to build comprehensive context from ember data
export function buildEmberContext(emberData) {
  if (!emberData) return "No ember context available.";
  
  const context = [];
  
  // Basic ember information
  if (emberData.title && emberData.title.trim() !== '' && emberData.title !== 'Untitled Ember') {
    context.push(`Title: "${emberData.title}"`);
    if (emberData.title_source) {
      context.push(`Title Source: ${emberData.title_source === 'ai' ? 'AI generated' : 'Manual entry'}`);
    }
  }
  
  // Location information (all available location data)
  const locationDetails = [];
  if (emberData.location_name) {
    locationDetails.push(`Location: ${emberData.location_name}`);
  }
  if (emberData.manual_location) {
    locationDetails.push(`Manual Location: ${emberData.manual_location}`);
  }
  if (emberData.latitude && emberData.longitude) {
    locationDetails.push(`Coordinates: ${emberData.latitude}, ${emberData.longitude}`);
  }
  if (locationDetails.length > 0) {
    context.push(...locationDetails);
  }
  
  // Date and time information (all available temporal data)
  const dateTimeDetails = [];
  if (emberData.created_at) {
    const date = new Date(emberData.created_at);
    dateTimeDetails.push(`Created: ${date.toLocaleDateString()} at ${date.toLocaleTimeString()}`);
  }
  if (emberData.ember_timestamp) {
    const emberDate = new Date(emberData.ember_timestamp);
    dateTimeDetails.push(`Ember Timestamp: ${emberDate.toLocaleDateString()} at ${emberDate.toLocaleTimeString()}`);
  }
  if (emberData.manual_datetime) {
    dateTimeDetails.push(`Manual Date/Time: ${emberData.manual_datetime}`);
  }
  if (dateTimeDetails.length > 0) {
    context.push(...dateTimeDetails);
  }
  
  // Owner and contributor information
  if (emberData.owner) {
    const ownerName = [emberData.owner.first_name, emberData.owner.last_name].filter(Boolean).join(' ') || 'Owner';
    context.push(`Created by: ${ownerName}`);
    if (emberData.owner.email) {
      context.push(`Owner Email: ${emberData.owner.email}`);
    }
  }
  
  // Shared users/contributors (if any)
  if (emberData.sharedUsers && emberData.sharedUsers.length > 0) {
    context.push(`\nShared with Contributors:`);
    emberData.sharedUsers.forEach(user => {
      const userName = [user.first_name, user.last_name].filter(Boolean).join(' ') || 'User';
      context.push(`- ${userName} (${user.permission_level || 'viewer'})`);
    });
  }
  
  // Complete Wiki content (The 5 W's)
  const wikiSections = [];
  if (emberData.who && emberData.who.trim() !== '') {
    wikiSections.push(`Who: ${emberData.who}`);
  }
  if (emberData.what && emberData.what.trim() !== '') {
    wikiSections.push(`What: ${emberData.what}`);
  }
  if (emberData.when && emberData.when.trim() !== '') {
    wikiSections.push(`When: ${emberData.when}`);
  }
  if (emberData.where && emberData.where.trim() !== '') {
    wikiSections.push(`Where: ${emberData.where}`);
  }
  if (emberData.why && emberData.why.trim() !== '') {
    wikiSections.push(`Why: ${emberData.why}`);
  }
  
  if (wikiSections.length > 0) {
    context.push(`\nWiki Details (The 5 W's):`);
    wikiSections.forEach(section => context.push(`- ${section}`));
  }
  
  // Complete story conversations (ALL messages, not truncated)
  if (emberData.storyMessages && emberData.storyMessages.length > 0) {
    context.push(`\nComplete Story Conversations (${emberData.storyMessages.length} messages):`);
    emberData.storyMessages.forEach((message, index) => {
      const sender = message.sender_name || 'Unknown User';
      const content = message.content || 'No content';
      const timestamp = message.created_at ? new Date(message.created_at).toLocaleString() : 'Unknown time';
      context.push(`${index + 1}. ${sender} (${timestamp}): ${content}`);
    });
  }
  
  // Image analysis information (complete analysis)
  if (emberData.image_analysis && emberData.image_analysis.trim() !== '') {
    context.push(`\nAI Visual Analysis: ${emberData.image_analysis}`);
  }
  
  // Additional metadata and tags
  if (emberData.tags && emberData.tags.length > 0) {
    context.push(`\nTags: ${emberData.tags.join(', ')}`);
  }
  
  // Feelings/emotions (if available)
  if (emberData.feelings && emberData.feelings.trim() !== '') {
    context.push(`\nFeelings/Emotions: ${emberData.feelings}`);
  }
  
  // Comments and observations (if available)
  if (emberData.comments && emberData.comments.trim() !== '') {
    context.push(`\nComments & Observations: ${emberData.comments}`);
  }
  
  // Tagged objects (if available)
  if (emberData.tagged_objects && emberData.tagged_objects.length > 0) {
    context.push(`\nTagged Objects: ${emberData.tagged_objects.join(', ')}`);
  }
  
  // Tagged people (if available)
  if (emberData.tagged_people && emberData.tagged_people.length > 0) {
    context.push(`\nTagged People: ${emberData.tagged_people.join(', ')}`);
  }
  
  // Supporting media (if available)
  if (emberData.supporting_media && emberData.supporting_media.length > 0) {
    context.push(`\nSupporting Media: ${emberData.supporting_media.length} additional files`);
  }
  
  // If we don't have much context, provide guidance
  if (context.length === 0) {
    return "Limited context available. Focus on visual elements and general storytelling principles.";
  }
  
  return context.join('\n');
}

// Helper function to get style-specific prompt additions
export function getStylePromptExtras(style, emberContext) {
  const styleConfig = STORY_CUT_STYLES[style];
  if (!styleConfig) return {};
  
  return {
    systemAddition: `Style: ${styleConfig.name} - ${styleConfig.description}`,
    approachGuidance: `Follow the ${styleConfig.name.toLowerCase()} approach: ${styleConfig.description}`,
    voiceGuidance: styleConfig.voiceInstructions
  };
}

// Helper function to estimate word count from duration
export function estimateWordCount(durationSeconds) {
  // Average speaking rate is approximately 3 words per second for natural speech
  return Math.round(durationSeconds * 3);
}

// Helper function to validate story cut generation parameters
export function validateStoryCutParams(params) {
  const errors = [];
  
  if (!params.style || !STORY_CUT_STYLES[params.style]) {
    errors.push("Valid story style is required");
  }
  
  if (!params.duration || params.duration < 10 || params.duration > 300) {
    errors.push("Duration must be between 10 and 300 seconds");
  }
  
  if (!params.emberVoice) {
    errors.push("Ember voice selection is required");
  }
  
  if (!params.narratorVoice) {
    errors.push("Narrator voice selection is required");
  }
  
  if (!params.title || params.title.trim().length === 0) {
    errors.push("Story title is required");
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

// Generate story cut script using OpenAI
export async function generateStoryCutWithOpenAI(formData, styleConfig, emberContext, voiceCasting) {
  const isDevelopment = import.meta.env.MODE === 'development' || window.location.hostname === 'localhost';
  const openaiApiKey = import.meta.env.VITE_OPENAI_API_KEY;

  console.log('generateStoryCutWithOpenAI called:', { 
    isDevelopment, 
    hasApiKey: !!openaiApiKey, 
    style: formData.style,
    duration: formData.duration 
  });

  if (!isDevelopment || !openaiApiKey) {
    throw new Error('OpenAI direct call only available in development with API key');
  }

  // Calculate approximate word count (3 words per second)
  const approximateWords = Math.round(formData.duration * 3);
  
  // Build comprehensive system prompt with strict accuracy requirements
  const systemPrompt = `${styleConfig.systemPrompt}

CRITICAL ACCURACY REQUIREMENTS:
- Use ONLY the information provided in the ember context
- DO NOT invent, fabricate, or make up any names, places, dates, events, or details
- DO NOT create fictional characters or relationships not mentioned in the context
- If information is missing, acknowledge it rather than inventing it
- Stick strictly to the facts and details actually provided
- When the context is limited, focus on the general atmosphere and emotions rather than specific fabricated details

VOICE CASTING:
- Ember Voice (${styleConfig.emberVoiceRole}): ${voiceCasting.ember?.name || 'Selected Voice'} (${voiceCasting.ember?.labels?.gender || 'Unknown'})
- Narrator Voice (${styleConfig.narratorVoiceRole}): ${voiceCasting.narrator?.name || 'Selected Voice'} (${voiceCasting.narrator?.labels?.gender || 'Unknown'})

SELECTED CONTRIBUTORS: ${voiceCasting.contributors?.map(u => `${u.name} (${u.role})`).join(', ') || 'None selected'}

You must create content that makes use of the voice casting and involves the selected contributors in the storytelling when appropriate. Return ONLY valid JSON with the exact structure specified.`;

  // Build user prompt
  const userPrompt = `Create a ${formData.duration}-second ${styleConfig.name.toLowerCase()} style story cut for this photo/memory:

STORY INFORMATION:
Title: "${formData.title}"
Style: ${styleConfig.name} - ${styleConfig.description}
Duration: ${formData.duration} seconds (approximately ${approximateWords} words)
Story Focus: ${formData.focus || 'General storytelling approach'}

EMBER CONTEXT:
${emberContext}

VOICE INSTRUCTIONS:
${styleConfig.voiceInstructions}

REQUIREMENTS:
- Target exactly ${formData.duration} seconds of content (approximately ${approximateWords} words)
- Follow ${styleConfig.name.toLowerCase()} style: ${styleConfig.description}
- Use ONLY the specific details provided in the ember context above
- DO NOT invent any names, places, events, or details not explicitly mentioned
- ${formData.focus ? `Focus specifically on: ${formData.focus}` : 'Create engaging narrative flow'}
- Assign appropriate lines to ember voice vs narrator voice
- Make use of selected contributors: ${voiceCasting.contributors?.map(u => u.name).join(', ') || 'Focus on the image content and provided context only'}
- If the context is limited, create atmosphere and emotion rather than fictional specifics

OUTPUT FORMAT:
Return a JSON object with this exact structure:
{
  "title": "Engaging title for this story cut",
  "duration": ${formData.duration},
  "style": "${formData.style}",
  "wordCount": ${approximateWords},
  "script": {
    "fullScript": "Complete narration script as one continuous piece of text",
    "emberVoiceLines": ["First line spoken by the ember voice", "Second line spoken by the ember voice"],
    "narratorVoiceLines": ["First line spoken by the narrator", "Second line spoken by the narrator"]
  },
  "voiceCasting": {
    "emberVoice": "${voiceCasting.ember?.name || 'Selected Voice'}",
    "narratorVoice": "${voiceCasting.narrator?.name || 'Selected Voice'}",
    "contributors": ${JSON.stringify(voiceCasting.contributors || [])}
  },
  "metadata": {
    "focus": "${formData.focus || ''}",
    "emberTitle": "${formData.title}",
    "generatedAt": "${new Date().toISOString()}"
  }
}`;

  console.log('🎬 SENDING STORY CUT PROMPT TO OPENAI:');
  console.log('='.repeat(80));
  console.log('SYSTEM PROMPT:');
  console.log(systemPrompt);
  console.log('='.repeat(80));
  console.log('USER PROMPT:');
  console.log(userPrompt);
  console.log('='.repeat(80));

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiApiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          {
            role: 'user',
            content: userPrompt
          }
        ],
        max_tokens: 2000,
        temperature: 0.8,
        response_format: { type: "json_object" }
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('OpenAI API error:', response.status, errorData);
      
      if (response.status === 401) {
        throw new Error('Invalid OpenAI API key. Please check your VITE_OPENAI_API_KEY in .env.local');
      } else if (response.status === 429) {
        throw new Error('OpenAI API quota exceeded. Please check your billing.');
      } else {
        throw new Error(`OpenAI API error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
      }
    }

    const data = await response.json();
    console.log('✅ OpenAI story cut generation completed');
    console.log('Raw OpenAI response:', data);

    if (!data.choices || !data.choices[0] || !data.choices[0].message || !data.choices[0].message.content) {
      throw new Error('Invalid response structure from OpenAI');
    }

    const generatedContent = data.choices[0].message.content;
    console.log('Generated content:', generatedContent);

    // Parse the JSON response
    const storyCutData = JSON.parse(generatedContent);
    
    // Validate the response structure
    if (!storyCutData.script || !storyCutData.script.fullScript) {
      throw new Error('Invalid story cut structure returned from OpenAI');
    }

    console.log('✅ Story cut successfully generated and parsed:', storyCutData);

    return {
      success: true,
      data: storyCutData,
      tokensUsed: data.usage?.total_tokens || 0
    };

  } catch (error) {
    console.error('❌ OpenAI story cut generation failed:', error);
    
    if (error.message.includes('JSON')) {
      throw new Error('Failed to parse OpenAI response. Please try again.');
    }
    
    throw error;
  }
} 