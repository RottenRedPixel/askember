import { OpenAI } from 'openai';
import { createClient } from '@supabase/supabase-js';

// Self-contained Supabase client setup (no import issues)
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase configuration');
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Self-contained prompt management functions (copied from promptManager.js)
async function getActivePrompt(promptKey) {
  try {
    const { data, error } = await supabase.rpc('get_active_prompt', {
      prompt_key_param: promptKey
    });

    if (error) {
      console.error('Error fetching active prompt:', error);
      return null;
    }

    return data && data.length > 0 ? data[0] : null;
  } catch (error) {
    console.error('Error in getActivePrompt:', error);
    return null;
  }
}

// Self-contained variable replacement (copied from promptManager.js)
function replaceVariables(text, variables) {
  if (!text) return '';
  
  let result = text;
  
  // Replace standard variables like {{variable_name}}
  Object.entries(variables).forEach(([key, value]) => {
    const regex = new RegExp(`{{${key}}}`, 'g');
    result = result.replace(regex, value || '');
  });
  
  return result;
}

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
    
    // Get all story messages for the ember to extract recorded audio
    console.log('🎙️ Loading story messages for recorded audio...');
    const { data: storyMessages, error: messagesError } = await supabase
      .from('ember_story_messages')
      .select('*')
      .eq('ember_id', emberId)
      .order('created_at', { ascending: true });
    
    if (messagesError) {
      console.warn('Could not load story messages for recorded audio:', messagesError);
    }
    
    // Extract recorded audio URLs from story messages
    const recordedAudioMap = new Map();
    if (storyMessages) {
      storyMessages.forEach(msg => {
        if (msg.sender === 'user' && msg.audio_url) {
          recordedAudioMap.set(msg.user_id, {
            audio_url: msg.audio_url,
            audio_filename: msg.audio_filename,
            audio_duration_seconds: msg.audio_duration_seconds,
            user_first_name: msg.user_first_name,
            message_content: msg.content
          });
        }
      });
    }
    
    console.log('🎙️ Found recorded audio for users:', Array.from(recordedAudioMap.keys()));
    
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
    
    // Get ember owner's information for proper voice attribution
    let ownerFirstName = 'Owner';
    if (voiceCasting.contributors) {
      const ownerInfo = voiceCasting.contributors.find(c => c.role === 'owner');
      if (ownerInfo?.name) {
        ownerFirstName = ownerInfo.name;
      }
    }
    
    // Prepare all the variables for the master prompt
    const promptVariables = {
      ember_context: emberContext,
      story_conversations: storyConversations || 'No story circle conversations available yet.',
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
      timestamp: new Date().toISOString(),
      use_ember_voice: voiceCasting.ember !== null,
      use_narrator_voice: voiceCasting.narrator !== null
    };
    
    // Dynamically modify the prompt based on voice selections
    let userPrompt = masterPrompt.user_prompt_template;
    
    // Build voice-specific instructions
    const hasEmber = voiceCasting.ember !== null;
    const hasNarrator = voiceCasting.narrator !== null;
    
    if (hasEmber && hasNarrator) {
      // Both voices selected - use original template
      console.log('🎭 Using both Ember and Narrator voices');
    } else if (hasEmber && !hasNarrator) {
      // Only Ember voice selected
      console.log('🎭 Using only Ember voice - modifying prompt');
      
      // Update voice tag instructions to only mention Ember voice
      userPrompt = userPrompt.replace(
        /- Use these voice tags: \[EMBER VOICE\], \[NARRATOR\], \[\{\{owner_first_name\}\}\], \[ACTUAL_CONTRIBUTOR_FIRST_NAME\]/,
        '- Use these voice tags: [EMBER VOICE], [{{owner_first_name}}], [ACTUAL_CONTRIBUTOR_FIRST_NAME]'
      );
      
      // Update format example to exclude narrator
      userPrompt = userPrompt.replace(
        /Format like: "\[EMBER VOICE\] Narrative line\\n\[NARRATOR\] Context line\\n\[\{\{owner_first_name\}\}\] Actual quote from owner\\n\[CONTRIBUTOR_FIRST_NAME\] Quote from contributor"/,
        'Format like: "[EMBER VOICE] Narrative line\\n[{{owner_first_name}}] Actual quote from owner\\n[CONTRIBUTOR_FIRST_NAME] Quote from contributor"'
      );
      
      // Update output format to exclude narrator_voice_lines
      userPrompt = userPrompt.replace(
        /"narrator_voice_lines": \["A dodgeball tournament begins", "Who will claim victory\?"\],/,
        ''
      );
      
      // Update voiceCasting object to exclude narratorVoice
      userPrompt = userPrompt.replace(
        /"narratorVoice": "\{\{narrator_voice_name\}\}",/,
        ''
      );
      
    } else if (!hasEmber && hasNarrator) {
      // Only Narrator voice selected
      console.log('🎭 Using only Narrator voice - modifying prompt');
      
      // Update voice tag instructions to only mention Narrator voice
      userPrompt = userPrompt.replace(
        /- Use these voice tags: \[EMBER VOICE\], \[NARRATOR\], \[\{\{owner_first_name\}\}\], \[ACTUAL_CONTRIBUTOR_FIRST_NAME\]/,
        '- Use these voice tags: [NARRATOR], [{{owner_first_name}}], [ACTUAL_CONTRIBUTOR_FIRST_NAME]'
      );
      
      // Update format example to exclude ember voice
      userPrompt = userPrompt.replace(
        /Format like: "\[EMBER VOICE\] Narrative line\\n\[NARRATOR\] Context line\\n\[\{\{owner_first_name\}\}\] Actual quote from owner\\n\[CONTRIBUTOR_FIRST_NAME\] Quote from contributor"/,
        'Format like: "[NARRATOR] Context line\\n[{{owner_first_name}}] Actual quote from owner\\n[CONTRIBUTOR_FIRST_NAME] Quote from contributor"'
      );
      
      // Update output format to exclude ember_voice_lines
      userPrompt = userPrompt.replace(
        /"ember_voice_lines": \["A classroom buzzes with anticipation", "Faces filled with determination"\],/,
        ''
      );
      
      // Update voiceCasting object to exclude emberVoice
      userPrompt = userPrompt.replace(
        /"emberVoice": "\{\{ember_voice_name\}\}",/,
        ''
      );
    }
    
    // Format the master prompt with all variables
    let systemPrompt = replaceVariables(masterPrompt.system_prompt, promptVariables);
    userPrompt = replaceVariables(userPrompt, promptVariables);
    
    console.log('🤖 Generating story cut with:', {
      style: stylePrompt.title,
      duration: formData.duration,
      wordCount: approximateWords,
      contributors: voiceCasting.contributors?.length || 0,
      hasQuotes: contributorQuotes && contributorQuotes.length > 0,
      useEmberVoice: hasEmber,
      useNarratorVoice: hasNarrator
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
    let generatedStoryCut;
    try {
      generatedStoryCut = JSON.parse(storyCut);
      console.log('✅ Generated story cut:', generatedStoryCut.title);
      
      // Add recorded audio URLs to the story cut data (MISSING LOGIC FROM LOCALHOST)
      generatedStoryCut.recordedAudio = {};
      
      // Map recorded audio to contributors
      if (voiceCasting.contributors) {
        voiceCasting.contributors.forEach(contributor => {
          if (recordedAudioMap.has(contributor.id)) {
            const audioData = recordedAudioMap.get(contributor.id);
            generatedStoryCut.recordedAudio[contributor.id] = {
              audio_url: audioData.audio_url,
              audio_filename: audioData.audio_filename,
              audio_duration_seconds: audioData.audio_duration_seconds,
              user_first_name: audioData.user_first_name,
              message_content: audioData.message_content
            };
          }
        });
      }
      
      console.log('🎙️ Added recorded audio to story cut:', Object.keys(generatedStoryCut.recordedAudio));
      
    } catch (parseError) {
      console.error('OpenAI returned invalid JSON:', storyCut);
      throw new Error('OpenAI returned invalid JSON response');
    }

    return res.status(200).json({
      success: true,
      data: JSON.stringify(generatedStoryCut), // Return the enhanced data with recorded audio
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