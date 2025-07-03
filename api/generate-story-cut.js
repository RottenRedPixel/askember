import { OpenAI } from 'openai';

// Import our prompt management system
// Note: Using relative imports for Vercel API routes
import { getActivePrompt } from '../src/lib/promptManager.js';
import { emberContextBuilders } from '../src/lib/emberContext.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.OPENAI_API_KEY || process.env.VITE_OPENAI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'OpenAI API key not configured' });
  }

  const { 
    formData, 
    selectedStyle, 
    emberContext, 
    storyConversations, 
    voiceCasting, 
    emberId,
    contributorQuotes 
  } = req.body;

  try {
    const openai = new OpenAI({ apiKey });
    
    // Calculate approximate word count (3 words per second)
    const approximateWords = Math.round(formData.duration * 3);
    
    // Get the master story cut generation prompt
    console.log('🔍 Loading master story cut generation prompt...');
    const masterPrompt = await getActivePrompt('story_cut_generation');
    
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
    
    // Prepare all the variables for the master prompt
    const promptVariables = {
      ember_context: emberContext,
      story_conversations: storyConversations || 'No story circle conversations available yet.',
      style_prompt: stylePrompt.system_prompt,
      story_title: formData.title,
      duration: formData.duration,
      word_count: approximateWords,
      story_focus: formData.focus || 'General storytelling approach',
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
    
    // Format the master prompt with all variables
    let systemPrompt = masterPrompt.system_prompt;
    let userPrompt = masterPrompt.user_prompt_template;
    
    // Replace all variables in the prompts
    Object.keys(promptVariables).forEach(key => {
      const placeholder = `{{${key}}}`;
      const value = promptVariables[key];
      systemPrompt = systemPrompt.replace(new RegExp(placeholder, 'g'), value);
      userPrompt = userPrompt.replace(new RegExp(placeholder, 'g'), value);
    });
    
    console.log('🤖 Generating story cut with:', {
      style: stylePrompt.title,
      duration: formData.duration,
      wordCount: approximateWords,
      contributors: voiceCasting.contributors?.length || 0,
      hasQuotes: contributorQuotes && contributorQuotes.length > 0
    });

    const completion = await openai.chat.completions.create({
      model: masterPrompt.model || 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      max_tokens: masterPrompt.max_tokens || 2000,
      temperature: masterPrompt.temperature || 0.7,
      response_format: { type: "json_object" }
    });

    const storyCut = completion.choices[0]?.message?.content || '';
    const tokensUsed = completion.usage?.total_tokens || 0;

    // Validate that we got valid JSON before returning
    try {
      const parsed = JSON.parse(storyCut);
      console.log('✅ Generated story cut:', parsed.title);
    } catch (parseError) {
      console.error('OpenAI returned invalid JSON:', storyCut);
      throw new Error('OpenAI returned invalid JSON response');
    }

    return res.status(200).json({
      success: true,
      data: storyCut,
      tokensUsed,
      promptUsed: masterPrompt.prompt_key,
      styleUsed: stylePrompt.prompt_key,
      model: masterPrompt.model
    });
  } catch (error) {
    console.error('Error generating story cut:', error);
    return res.status(500).json({ 
      error: error.message || 'Failed to generate story cut',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
} 