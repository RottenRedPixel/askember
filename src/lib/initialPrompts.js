// Initial Prompts Data for Database Migration
// This file contains all the existing prompts converted to the new database structure

export const initialPrompts = [
  // ===========================================
  // IMAGE ANALYSIS PROMPTS
  // ===========================================
  {
    prompt_key: 'image_analysis_comprehensive',
    title: 'Comprehensive Image Analysis',
    description: 'Detailed analysis of images including people, demographics, setting, activities, and technical details',
    category: 'image_analysis',
    subcategory: 'comprehensive',

    // OpenAI Configuration
    model: 'gpt-4o',
    max_tokens: 4000,
    temperature: 0.3,
    response_format: 'text',

    // Prompt Structure
    prompt_type: 'user_only',
    system_prompt: null,
    user_prompt_template: `{{ember_context}}

Please perform a comprehensive analysis of the provided image. Provide detailed information about:

PEOPLE & DEMOGRAPHICS:
- Number of people visible
- Estimated age ranges (child, teen, adult, elderly)
- Gender identification (if clearly apparent)
- Clothing and style descriptions
- Body language and expressions
- Relationships between people (if apparent)

SETTING & ENVIRONMENT:
- Location type (indoor/outdoor, specific venue if identifiable)
- Time of day/lighting conditions
- Weather conditions (if outdoor)
- Background details and surroundings
- Architectural or landscape features

ACTIVITIES & CONTEXT:
- What appears to be happening in the moment
- Social dynamics and interactions
- Event type (celebration, casual gathering, formal event, etc.)
- Activities or actions taking place

TECHNICAL DETAILS:
- Photo quality and composition
- Lighting analysis
- Notable photographic elements
- Any objects or items of interest

EMOTIONAL CONTEXT:
- Overall mood and atmosphere
- Emotional expressions visible
- Social dynamics and energy

STORY ELEMENTS:
- What story does this image tell?
- What might have happened before this moment?
- What might happen next?

Please provide rich, detailed descriptions that would help someone understand the complete context and story of this moment.`,

    // Management & Versioning
    is_active: true,
    version: 'v1.0',

    // Metadata
    tags: ['image', 'analysis', 'comprehensive', 'people', 'setting', 'story'],
    notes: 'Original hard-coded prompt from image analysis system. Provides comprehensive analysis for ember creation.'
  },

  // ===========================================
  // TITLE GENERATION PROMPTS
  // ===========================================
  {
    prompt_key: 'title_generation_creative',
    title: 'Creative Title Generation',
    description: 'Generate 5 creative and memorable titles for embers based on context',
    category: 'title_generation',
    subcategory: 'creative',

    // OpenAI Configuration
    model: 'gpt-4o-mini',
    max_tokens: 200,
    temperature: 0.8,
    response_format: 'text',

    // Prompt Structure
    prompt_type: 'user_only',
    system_prompt: null,
    user_prompt_template: `{{ember_context}}

Based on the context above, generate 5 creative and memorable titles for this moment. The titles should:
- Capture the essence and emotion of the moment
- Be engaging and evocative
- Range from 2-8 words
- Avoid generic phrases
- Include variety in tone (some poetic, some direct, some playful)

Format your response as a numbered list:
1. [Title]
2. [Title]
3. [Title]
4. [Title]
5. [Title]`,

    // Management & Versioning
    is_active: true,
    version: 'v1.0',

    // Metadata
    tags: ['title', 'generation', 'creative', 'naming', 'suggestions'],
    notes: 'Generates creative titles for embers based on full context including story and image analysis.'
  },

  // ===========================================
  // STORY GENERATION PROMPTS
  // ===========================================
  {
    prompt_key: 'story_cut_generation',
    title: 'AI Story Content Generator',
    description: 'Generates pure storytelling content for audio narratives - focuses solely on compelling voice content creation',
    category: 'story_generation',
    subcategory: 'story_cut',

    // OpenAI Configuration
    model: 'gpt-4o',
    max_tokens: 2000,
    temperature: 0.7,
    response_format: 'json_object',

    // Prompt Structure
    prompt_type: 'system_and_user',
    system_prompt: `You are an AI Story Content Generator, a professional narrative writer who creates compelling audio story content.

Your role is to:
1. Analyze ember context (photos, metadata, story circle conversations)
2. Apply the specified narrative style to shape the storytelling approach
3. Incorporate authentic voice recordings and quotes from story circle participants
4. Create cohesive narrative content that honors the personal nature of the moment
5. Generate engaging voice content divided between ember voice and narrator voice
6. Focus purely on storytelling - no technical formatting

CORE PRINCIPLES:
- Use ONLY authentic details from the provided context
- DO NOT invent names, places, events, or details not mentioned
- Incorporate direct quotes from story circle conversations when available
- Respect the emotional truth and significance of the moment
- Balance different perspectives when multiple contributors are involved
- Create atmosphere and emotion rather than fictional specifics when context is limited

VOICE CASTING:
- Ember Voice: A narrative character voice that tells the story (NOT the owner's actual words)
- Narrator Voice: Provides context, transitions, and objective storytelling
- Owner & Contributors: Use actual quotes from story circle participants when available
- Keep story circle participants' contributions separate from narrative voices

STYLE APPLICATION:
The narrative style will be provided separately and should be seamlessly integrated into your storytelling approach while maintaining authenticity.

Always return valid JSON with the exact structure specified in the user prompt.`,

    user_prompt_template: `EMBER CONTEXT AND STORY MATERIAL:
{{ember_context}}

STORY CIRCLE CONVERSATIONS:
{{story_conversations}}

STYLE DIRECTIVE:
{{style_prompt}}

STORY CONFIGURATION:
- Title: {{story_title}}
- Duration: {{duration}} seconds (approximately {{word_count}} words)
- Focus: {{story_focus}}
- Owner First Name: {{owner_first_name}}
- Selected Contributors: {{selected_contributors}}
- Ember Voice: {{ember_voice_name}}
- Narrator Voice: {{narrator_voice_name}}

VOICE CASTING DETAILS:
{{voice_casting_info}}

DIRECT QUOTES AVAILABLE:
{{contributor_quotes}}

CRITICAL - JSON BLOCK STRUCTURE:
You MUST generate structured JSON blocks for each voice segment. This creates a clean, parsable format that preserves all necessary data without complex text parsing.

JSON BLOCK SCHEMA:
Each voice segment is a JSON object with these fields:
{
  "type": "voice",
  "speaker": "string",           // Name of speaker ("Sarah", "EMBER VOICE", "NARRATOR")
  "content": "string",           // The actual spoken words
  "voice_preference": "string", // "recorded", "text", or voice name for AI
  "message_id": "string|null",  // Message ID for recorded content, null for AI
  "user_id": "string|null",     // User ID for recorded content, null for AI
  "order": number               // Sequence order in the story
}

SPEAKER TYPES:
- Contributors: Use actual first names ("Sarah", "Mike", "Amado")
- Ember Voice: Use "EMBER VOICE" 
- Narrator Voice: Use "NARRATOR"

VOICE PREFERENCE RULES:
- "recorded" = Use recorded audio from contributor (requires valid message_id)
- "text" = Use AI text-to-speech with fallback voice
- Voice name = Use specific AI voice (for ember/narrator)

CONTENT GUIDELINES:
- Use EXACT quotes from contributor_quotes for contributors with recorded audio
- Generate appropriate narrative content for EMBER VOICE and NARRATOR
- Keep content clean and suitable for audio narration
- DO NOT paraphrase recorded quotes - use them word-for-word

GENERATION REQUIREMENTS:
Create a {{duration}}-second story that weaves together the ember context and story circle conversations into a compelling narrative. Apply the provided style directive to shape your storytelling approach.

CONTENT INSTRUCTIONS:
- Target approximately {{word_count}} words of spoken content
- Use ONLY authentic details from the ember context and story conversations
- **CRITICAL: For contributors, you MUST use their EXACT recorded quotes from contributor_quotes. DO NOT paraphrase, rewrite, or create new dialogue for real people.**
- **ONLY ember voice and narrator voice content may be AI-generated.**
- Assign appropriate content to ember voice vs narrator voice
- Follow the narrative style provided in the style directive
- If context is limited, focus on atmosphere and universal emotions rather than inventing specifics
- Create content suitable for audio narration
- Make the story personally meaningful while being accessible to listeners

CONTRIBUTOR QUOTE MATCHING:
- When using contributor quotes, match exact message_id from contributor_quotes
- Format: {"speaker": "FirstName", "voice_preference": "recorded", "message_id": "actual_message_id"}
- Use different quotes for multiple appearances of the same contributor
- Never repeat the same quote multiple times

JSON BLOCKS EXAMPLES:
Example 1 - Ember Voice:
{
  "type": "voice",
  "speaker": "EMBER VOICE",
  "content": "A sunny day at Topgolf, where smiles and swings abound.",
  "voice_preference": "{{ember_voice_name}}",
  "message_id": null,
  "user_id": null,
  "order": 1
}

Example 2 - Contributor with Recording:
{
  "type": "voice", 
  "speaker": "Sarah",
  "content": "We had so much fun at the beach today.",
  "voice_preference": "recorded",
  "message_id": "abc123-def456", 
  "user_id": "user456",
  "order": 2
}

Example 3 - Narrator Voice:
{
  "type": "voice",
  "speaker": "NARRATOR", 
  "content": "The family gathered for a day of friendly competition.",
  "voice_preference": "{{narrator_voice_name}}",
  "message_id": null,
  "user_id": null,
  "order": 3
}

VOICE ARRAYS (Legacy Support):
- Still populate ember_voice_lines, narrator_voice_lines arrays for compatibility
- Extract content from blocks where speaker matches voice type
- These will be deprecated in future versions

OUTPUT FORMAT:
Return a JSON object with this exact structure:
{
  "title": "{{story_title}}",
  "duration": {{duration}},
  "style": "{{selected_style}}",
  "wordCount": {{word_count}},
  "blocks": [
    {
      "type": "voice",
      "speaker": "EMBER VOICE",
      "content": "Opening narrative line",
      "voice_preference": "{{ember_voice_name}}",
      "message_id": null,
      "user_id": null,
      "order": 1
    }
  ],
  "ember_voice_lines": ["Opening narrative line"],
  "narrator_voice_lines": ["Narrator content"],
  "owner_lines": ["Owner quotes"], 
  "contributor_lines": ["Contributor quotes"],
  "ember_voice_name": "{{ember_voice_name}}",
  "narrator_voice_name": "{{narrator_voice_name}}",
  "owner_first_name": "{{owner_first_name}}",
  "voiceCasting": {
    "emberVoice": "{{ember_voice_name}}",
    "narratorVoice": "{{narrator_voice_name}}",
    "contributors": {{selected_contributors_json}}
  },
  "metadata": {
    "focus": "{{story_focus}}",
    "emberTitle": "{{story_title}}",
    "styleApplied": "{{selected_style}}",
    "totalContributors": {{contributor_count}},
    "hasDirectQuotes": {{has_quotes}},
    "generatedAt": "{{timestamp}}",
    "format": "json_blocks"
  }
}`,

    // Management & Versioning
    is_active: true,
    version: 'v3.0',

    // Metadata
    tags: ['story', 'generation', 'ai-script', 'content', 'narrative', 'audio'],
    notes: 'AI Story Content Generator - focuses purely on storytelling content creation. Returns raw AI script that gets processed into ember format by platform. v3.0: Simplified to focus on content creation only.'
  },

  // ===========================================
  // CONVERSATION PROMPTS
  // ===========================================
  {
    prompt_key: 'story_circle_initial',
    title: 'Story Circle Initial Question',
    description: 'Generate an opening question for the story circle conversation',
    category: 'conversation',
    subcategory: 'story_circle',

    // OpenAI Configuration
    model: 'gpt-4o-mini',
    max_tokens: 100,
    temperature: 0.7,
    response_format: 'text',

    // Prompt Structure
    prompt_type: 'user_only',
    system_prompt: null,
    user_prompt_template: `{{ember_context}}

Based on the ember context above, generate ONE thoughtful, engaging opening question for a story circle conversation. The question should:
- Be personal and encourage storytelling
- Connect to the specific moment or context
- Be open-ended to allow for rich responses
- Feel natural and conversational
- Invite reflection on the experience

Only provide the question, no additional text or explanation.`,

    // Management & Versioning
    is_active: true,
    version: 'v1.0',

    // Metadata
    tags: ['conversation', 'story_circle', 'questions', 'initial', 'opening'],
    notes: 'Generates opening questions for story circle conversations based on ember context.'
  },

  {
    prompt_key: 'story_circle_followup',
    title: 'Story Circle Follow-up Questions',
    description: 'Generate contextual follow-up questions for story circle conversations',
    category: 'conversation',
    subcategory: 'story_circle',

    // OpenAI Configuration
    model: 'gpt-4o-mini',
    max_tokens: 150,
    temperature: 0.8,
    response_format: 'text',

    // Prompt Structure
    prompt_type: 'user_only',
    system_prompt: null,
    user_prompt_template: `{{ember_context}}

Previous conversation context:
{{conversation_history}}

Based on the ember context and conversation history above, generate ONE thoughtful follow-up question that:
- Builds on what has already been shared
- Explores a different aspect of the experience
- Encourages deeper reflection or storytelling
- Feels natural and conversational
- Helps uncover more details or emotions about the moment

Only provide the question, no additional text or explanation.`,

    // Management & Versioning
    is_active: true,
    version: 'v1.0',

    // Metadata
    tags: ['conversation', 'story_circle', 'followup', 'questions', 'contextual'],
    notes: 'Generates follow-up questions for ongoing story circle conversations.'
  },

  // ===========================================
  // GENERAL PROMPTS
  // ===========================================
  {
    prompt_key: 'ember_summary_generation',
    title: 'Ember Summary Generation',
    description: 'Generate a concise summary of an ember based on all available context',
    category: 'general',
    subcategory: 'summary',

    // OpenAI Configuration
    model: 'gpt-4o-mini',
    max_tokens: 300,
    temperature: 0.6,
    response_format: 'text',

    // Prompt Structure
    prompt_type: 'user_only',
    system_prompt: null,
    user_prompt_template: `{{ember_context}}

Based on the complete ember context above, generate a concise but comprehensive summary of this moment. The summary should:
- Capture the key elements of what happened
- Include important people, setting, and activities
- Convey the emotional significance
- Be 2-3 sentences long
- Sound natural and engaging

Focus on what makes this moment unique and memorable.`,

    // Management & Versioning
    is_active: true,
    version: 'v1.0',

    // Metadata
    tags: ['summary', 'general', 'ember', 'overview'],
    notes: 'Generates concise summaries of ember moments for overview purposes.'
  },

  // ===========================================
  // EXPERIMENTAL/ALTERNATIVE PROMPTS
  // ===========================================
  {
    prompt_key: 'title_generation_poetic',
    title: 'Poetic Title Generation',
    description: 'Generate more poetic and artistic titles for embers',
    category: 'title_generation',
    subcategory: 'poetic',

    // OpenAI Configuration
    model: 'gpt-4o-mini',
    max_tokens: 200,
    temperature: 0.9,
    response_format: 'text',

    // Prompt Structure
    prompt_type: 'user_only',
    system_prompt: null,
    user_prompt_template: `{{ember_context}}

Based on the context above, generate 5 poetic and artistic titles for this moment. The titles should:
- Use evocative, lyrical language
- Focus on emotion and atmosphere
- Use metaphor and imagery
- Be 3-6 words
- Sound like poetry or song titles
- Capture the feeling more than literal description

Format your response as a numbered list:
1. [Title]
2. [Title]
3. [Title]
4. [Title]
5. [Title]`,

    // Management & Versioning
    is_active: false, // Inactive - alternative to main title generation
    version: 'v1.0',

    // Metadata
    tags: ['title', 'generation', 'poetic', 'artistic', 'alternative'],
    notes: 'Alternative prompt for more poetic/artistic title generation. Currently inactive.'
  },

  {
    prompt_key: 'image_analysis_technical',
    title: 'Technical Image Analysis',
    description: 'Focus on technical and compositional aspects of images',
    category: 'image_analysis',
    subcategory: 'technical',

    // OpenAI Configuration
    model: 'gpt-4o',
    max_tokens: 2000,
    temperature: 0.2,
    response_format: 'text',

    // Prompt Structure
    prompt_type: 'user_only',
    system_prompt: null,
    user_prompt_template: `{{ember_context}}

Analyze this image with a focus on technical and compositional aspects:

TECHNICAL ANALYSIS:
- Image quality and resolution
- Lighting conditions and sources
- Exposure and contrast
- Color balance and saturation
- Depth of field and focus
- Camera angle and perspective

COMPOSITIONAL ELEMENTS:
- Rule of thirds and framing
- Leading lines and patterns
- Symmetry and balance
- Foreground, middle ground, background
- Visual hierarchy and focal points

PHOTOGRAPHIC DETAILS:
- Estimated camera settings (if apparent)
- Lens characteristics
- Time of day and lighting setup
- Any photographic techniques used

VISUAL STORYTELLING:
- How composition supports the story
- Emotional impact of technical choices
- What the technical elements reveal about the moment

Provide a detailed technical analysis that would help understand the photographic craft behind this image.`,

    // Management & Versioning
    is_active: false, // Inactive - specialized use case
    version: 'v1.0',

    // Metadata
    tags: ['image', 'analysis', 'technical', 'composition', 'photography'],
    notes: 'Specialized prompt for technical image analysis. Currently inactive.'
  },

  {
    prompt_key: 'story_circle_emotional',
    title: 'Emotional Story Circle Questions',
    description: 'Generate questions focused on emotional aspects of moments',
    category: 'conversation',
    subcategory: 'story_circle',

    // OpenAI Configuration
    model: 'gpt-4o-mini',
    max_tokens: 100,
    temperature: 0.8,
    response_format: 'text',

    // Prompt Structure
    prompt_type: 'user_only',
    system_prompt: null,
    user_prompt_template: `{{ember_context}}

Based on the ember context above, generate ONE question that focuses specifically on the emotional aspects of this moment. The question should:
- Explore feelings and emotions
- Encourage vulnerability and openness
- Connect to the specific context
- Be gentle and supportive
- Help uncover the emotional significance

Only provide the question, no additional text or explanation.`,

    // Management & Versioning
    is_active: false, // Inactive - specialized variation
    version: 'v1.0',

    // Metadata
    tags: ['conversation', 'story_circle', 'emotional', 'feelings', 'specialized'],
    notes: 'Specialized prompt for emotionally-focused story circle questions. Currently inactive.'
  },

  {
    prompt_key: 'story_circle_ember_ai',
    title: 'Ember AI Story Circle Questions',
    description: 'Ember AI analyzes comments and wiki context to generate thoughtful questions focusing on the 5 W\'s and emotional responses',
    category: 'conversation',
    subcategory: 'story_circle',

    // OpenAI Configuration
    model: 'gpt-4o-mini',
    max_tokens: 150,
    temperature: 0.7,
    response_format: 'text',

    // Prompt Structure
    prompt_type: 'system_and_user',
    system_prompt: `You are Ember AI, a thoughtful conversation guide helping people explore their memories and stories. Your role is to:

1. Analyze new user comments and the full wiki context
2. Look for gaps in the Five W's (Who, What, Where, When, Why)
3. Generate SHORT, casual questions (1-2 sentences max) that encourage emotional sharing
4. Focus on personal memories, feelings, and significance
5. Ask for little anecdotes or stories related to the moment
6. Be warm, curious, and conversational - never clinical or formal

Keep your questions brief, natural, and focused on one specific aspect. Avoid long explanations or multiple questions at once.`,

    user_prompt_template: `EMBER WIKI CONTEXT:
{{ember_context}}

RECENT CONVERSATION:
{{conversation_history}}

NEW COMMENT TO ANALYZE:
"{{new_comment}}" - by {{comment_author}}

Based on the new comment and full context, I need to understand what's missing from the Five W's and what emotional depth we can explore:

WHO: {{who_status}} 
WHAT: {{what_status}}
WHERE: {{where_status}} 
WHEN: {{when_status}}
WHY: {{why_status}}

Generate ONE short, casual question (1-2 sentences) that either:
- Fills a gap in the 5 W's with emotional context
- Explores the personal significance of what was shared
- Asks for a specific memory, feeling, or little story related to this moment
- Connects to something the comment author mentioned

Be conversational and warm. Ask about feelings, personal memories, or little details that make this moment special.`,

    // Management & Versioning
    is_active: true,
    version: 'v1.0',

    // Metadata
    tags: ['conversation', 'story_circle', 'ember_ai', 'emotional', 'five_ws', 'anecdotes'],
    notes: 'Main Ember AI prompt for analyzing comments and generating emotional story circle questions based on the 5 W\'s framework.'
  },

  // ===========================================
  // STORY STYLE PROMPTS
  // ===========================================
  {
    prompt_key: 'story_style_movie_trailer',
    title: 'Movie Trailer Style',
    description: 'Fast-paced, dramatic storytelling that builds excitement and tension',
    category: 'story_styles',
    subcategory: 'cinematic',

    // OpenAI Configuration
    model: 'gpt-4o',
    max_tokens: 500,
    temperature: 0.8,
    response_format: 'text',

    // Prompt Structure
    prompt_type: 'system_only',
    system_prompt: `You are creating a MOVIE TRAILER style story cut. This style is characterized by:

PACING & RHYTHM:
- Fast-paced, dynamic flow
- Short, punchy sentences and phrases
- Build momentum throughout the narrative
- Use dramatic pauses and emphasis

EMOTIONAL TONE:
- Create excitement and anticipation
- Build tension and release
- Highlight emotional peaks and conflicts
- Use powerful, evocative language

STRUCTURE:
- Hook the audience immediately
- Tease the story without giving everything away
- Build to emotional climaxes
- End with impact or cliffhanger feeling

LANGUAGE STYLE:
- Dramatic and compelling word choices
- Active voice and strong verbs
- Shorter sentences for impact
- Use repetition for emphasis
- Create vivid, cinematic imagery

FOCUS AREAS:
- Highlight the most dramatic or meaningful moments
- Emphasize conflict, transformation, or resolution
- Make the ordinary feel extraordinary
- Create a sense of urgency or importance

When generating story cuts in this style, make every word count and every moment feel significant. The goal is to make the listener feel the excitement and emotion of a movie trailer while telling their personal story.`,

    user_prompt_template: null,

    // Management & Versioning
    is_active: true,
    version: 'v1.0',

    // Metadata
    tags: ['story', 'style', 'cinematic', 'dramatic', 'fast-paced', 'trailer'],
    notes: 'Movie trailer style for dynamic, exciting story cuts that build tension and drama.'
  },

  {
    prompt_key: 'story_style_documentary',
    title: 'Documentary Style',
    description: 'Thoughtful, educational storytelling that explores context and meaning',
    category: 'story_styles',
    subcategory: 'educational',

    // OpenAI Configuration
    model: 'gpt-4o',
    max_tokens: 500,
    temperature: 0.6,
    response_format: 'text',

    // Prompt Structure
    prompt_type: 'system_only',
    system_prompt: `You are creating a DOCUMENTARY style story cut. This style is characterized by:

PACING & RHYTHM:
- Thoughtful, measured pacing
- Allow moments to breathe and develop
- Natural, conversational flow
- Build understanding gradually

EMOTIONAL TONE:
- Reflective and introspective
- Educational but warm
- Respectful of the subject matter
- Balanced between informative and emotional

STRUCTURE:
- Provide context and background
- Let the story unfold naturally
- Include multiple perspectives when available
- Connect personal moments to larger themes

LANGUAGE STYLE:
- Clear, accessible language
- Rich descriptive details
- Balanced sentence structure
- Use of transition phrases
- Focus on accuracy and authenticity

FOCUS AREAS:
- Explore the deeper meaning and significance
- Provide historical or social context when relevant
- Highlight human connections and relationships
- Show how personal moments reflect universal experiences
- Include quiet, contemplative moments

When generating story cuts in this style, prioritize depth over drama, understanding over excitement. Help the listener learn something new about the moment while feeling deeply connected to it.`,

    user_prompt_template: null,

    // Management & Versioning
    is_active: true,
    version: 'v1.0',

    // Metadata
    tags: ['story', 'style', 'documentary', 'educational', 'thoughtful', 'reflective'],
    notes: 'Documentary style for thoughtful, educational story cuts that explore context and meaning.'
  },

  {
    prompt_key: 'story_style_news_report',
    title: 'News Report Style',
    description: 'Factual, structured storytelling with clear timeline and professional tone',
    category: 'story_styles',
    subcategory: 'journalistic',

    // OpenAI Configuration
    model: 'gpt-4o',
    max_tokens: 500,
    temperature: 0.4,
    response_format: 'text',

    // Prompt Structure
    prompt_type: 'system_only',
    system_prompt: `You are creating a NEWS REPORT style story cut. This style is characterized by:

PACING & RHYTHM:
- Clear, steady pacing
- Professional delivery rhythm
- Logical flow from point to point
- Efficient use of time

EMOTIONAL TONE:
- Authoritative and credible
- Professional but engaging
- Balanced and objective
- Respectful of all parties involved

STRUCTURE:
- Lead with the most important information
- Follow the 5 W's (Who, What, When, Where, Why)
- Present information in order of importance
- Include key details and context
- Conclude with significance or impact

LANGUAGE STYLE:
- Clear, precise language
- Active voice preferred
- Professional vocabulary
- Avoid jargon or overly casual terms
- Use attribution when presenting perspectives

FOCUS AREAS:
- Establish clear timeline of events
- Present facts accurately and completely
- Include relevant background information
- Highlight the significance of the moment
- Maintain objectivity while showing human interest

When generating story cuts in this style, prioritize clarity, accuracy, and professional presentation. Make the personal story feel newsworthy and significant while maintaining journalistic integrity.`,

    user_prompt_template: null,

    // Management & Versioning
    is_active: true,
    version: 'v1.0',

    // Metadata
    tags: ['story', 'style', 'news', 'journalistic', 'factual', 'professional'],
    notes: 'News report style for clear, factual story cuts with professional presentation.'
  },

  {
    prompt_key: 'story_style_public_radio',
    title: 'Public Radio Style',
    description: 'Intimate, personal storytelling with rich descriptions and human connection',
    category: 'story_styles',
    subcategory: 'intimate',

    // OpenAI Configuration
    model: 'gpt-4o',
    max_tokens: 500,
    temperature: 0.7,
    response_format: 'text',

    // Prompt Structure
    prompt_type: 'system_only',
    system_prompt: `You are creating a PUBLIC RADIO style story cut. This style is characterized by:

PACING & RHYTHM:
- Gentle, unhurried pacing
- Allow for natural pauses and reflection
- Conversational and intimate rhythm
- Let emotional moments resonate

EMOTIONAL TONE:
- Warm and intimate
- Emotionally intelligent
- Vulnerable and honest
- Creating connection between listener and story

STRUCTURE:
- Begin with scene-setting or atmosphere
- Weave together multiple elements naturally
- Include sensory details and personal observations
- Build emotional understanding gradually
- End with meaning or resonance

LANGUAGE STYLE:
- Rich, descriptive language
- Varied sentence lengths for flow
- Sensory details (sounds, smells, textures, sights)
- Metaphorical and poetic elements when appropriate
- Personal, conversational tone

FOCUS AREAS:
- Human emotions and connections
- Sensory experiences and atmosphere
- Personal growth and transformation
- Universal themes in personal moments
- The beauty in everyday experiences
- What makes this moment uniquely human

When generating story cuts in this style, create an intimate listening experience that makes the audience feel they're sharing a meaningful conversation with a close friend. Focus on the human heart of the story.`,

    user_prompt_template: null,

    // Management & Versioning
    is_active: true,
    version: 'v1.0',

    // Metadata
    tags: ['story', 'style', 'public_radio', 'intimate', 'personal', 'conversational'],
    notes: 'Public radio style for intimate, personal story cuts with rich descriptions and emotional depth.'
  },

  {
    prompt_key: 'story_style_podcast_narrative',
    title: 'Podcast Narrative Style',
    description: 'Engaging conversational storytelling with strong narrative arc and listener engagement',
    category: 'story_styles',
    subcategory: 'conversational',

    // OpenAI Configuration
    model: 'gpt-4o',
    max_tokens: 500,
    temperature: 0.7,
    response_format: 'text',

    // Prompt Structure
    prompt_type: 'system_only',
    system_prompt: `You are creating a PODCAST NARRATIVE style story cut. This style is characterized by:

PACING & RHYTHM:
- Engaging, conversational pacing
- Vary rhythm to maintain interest
- Use strategic pauses for emphasis
- Build narrative momentum

EMOTIONAL TONE:
- Authentic and relatable
- Conversational but polished
- Emotionally engaging
- Creates sense of discovery

STRUCTURE:
- Strong opening hook
- Clear narrative arc with beginning, middle, end
- Include moments of tension or curiosity
- Weave in background information naturally
- Satisfying conclusion that ties elements together

LANGUAGE STYLE:
- Conversational but articulate
- Direct address to listener when appropriate
- Storytelling techniques (foreshadowing, callbacks)
- Accessible vocabulary
- Natural speech patterns

FOCUS AREAS:
- Create listener engagement and investment
- Build curiosity and maintain interest
- Include relatable human experiences
- Show character development or change
- Connect personal story to broader themes
- Make the listener feel part of the experience

When generating story cuts in this style, imagine you're telling an engaging story to a friend over coffee, but with the polish and structure of a well-produced podcast. Keep the listener hooked while honoring the personal nature of the story.`,

    user_prompt_template: null,

    // Management & Versioning
    is_active: true,
    version: 'v1.0',

    // Metadata
    tags: ['story', 'style', 'podcast', 'narrative', 'conversational', 'engaging'],
    notes: 'Podcast narrative style for engaging, conversational story cuts with strong narrative structure.'
  }
];

/**
 * Insert all initial prompts into the database
 * @param {string} userId - The user ID creating these prompts
 * @returns {Promise<Array>} Array of created prompt IDs
 */
export async function insertInitialPrompts(userId) {
  const { supabase } = await import('./supabase.js');
  const { promptsCRUD } = await import('./promptManager.js');

  const createdPrompts = [];

  for (const promptData of initialPrompts) {
    try {
      // Add user ID to the prompt data
      const fullPromptData = {
        ...promptData,
        created_by_user_id: userId,
        updated_by_user_id: userId
      };

      const created = await promptsCRUD.create(fullPromptData);
      createdPrompts.push(created);

      console.log(`Created prompt: ${promptData.prompt_key}`);
    } catch (error) {
      console.error(`Error creating prompt ${promptData.prompt_key}:`, error);
    }
  }

  return createdPrompts;
}

/**
 * Get prompts by category for easy reference
 */
export const promptsByCategory = {
  imageAnalysis: initialPrompts.filter(p => p.category === 'image_analysis'),
  titleGeneration: initialPrompts.filter(p => p.category === 'title_generation'),
  storyGeneration: initialPrompts.filter(p => p.category === 'story_generation'),
  conversation: initialPrompts.filter(p => p.category === 'conversation'),
  storyStyles: initialPrompts.filter(p => p.category === 'story_styles'),
  general: initialPrompts.filter(p => p.category === 'general')
};

/**
 * Get active prompts only
 */
export const activePrompts = initialPrompts.filter(p => p.is_active);

/**
 * Get inactive prompts only
 */
export const inactivePrompts = initialPrompts.filter(p => !p.is_active);

/**
 * Prompt validation and migration utilities
 */
export const promptMigrationUtils = {

  /**
   * Validate all prompts have required fields
   * @returns {Object} Validation result
   */
  validatePrompts() {
    const required = ['prompt_key', 'title', 'category', 'model', 'max_tokens', 'temperature', 'user_prompt_template'];
    const errors = [];

    initialPrompts.forEach((prompt, index) => {
      required.forEach(field => {
        if (!prompt[field]) {
          errors.push(`Prompt ${index} (${prompt.prompt_key || 'unknown'}) missing field: ${field}`);
        }
      });
    });

    return {
      valid: errors.length === 0,
      errors,
      totalPrompts: initialPrompts.length
    };
  },

  /**
   * Check for duplicate prompt keys
   * @returns {Array} Array of duplicate keys
   */
  checkDuplicateKeys() {
    const keys = initialPrompts.map(p => p.prompt_key);
    const duplicates = keys.filter((key, index) => keys.indexOf(key) !== index);
    return [...new Set(duplicates)];
  },

  /**
   * Get statistics about the initial prompts
   * @returns {Object} Statistics object
   */
  getStats() {
    const stats = {
      total: initialPrompts.length,
      active: activePrompts.length,
      inactive: inactivePrompts.length,
      byCategory: {},
      byModel: {},
      byResponseFormat: {}
    };

    initialPrompts.forEach(prompt => {
      // By category
      if (!stats.byCategory[prompt.category]) {
        stats.byCategory[prompt.category] = 0;
      }
      stats.byCategory[prompt.category]++;

      // By model
      if (!stats.byModel[prompt.model]) {
        stats.byModel[prompt.model] = 0;
      }
      stats.byModel[prompt.model]++;

      // By response format
      if (!stats.byResponseFormat[prompt.response_format]) {
        stats.byResponseFormat[prompt.response_format] = 0;
      }
      stats.byResponseFormat[prompt.response_format]++;
    });

    return stats;
  }
}; 