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

// Self-contained AI script to Ember script processing (API version)
function processAIScriptToEmberScriptAPI(aiScript, emberData, selectedMedia = []) {
  try {
    console.log('🔄 API: Processing AI script to Ember script format');
    console.log('📝 API: Input ai_script:', aiScript?.substring(0, 100) + '...');
    console.log('📸 API: Selected media:', selectedMedia?.length || 0, 'files');
    
    if (!aiScript || aiScript.trim() === '') {
      console.error('❌ API: AI script is empty or null');
      throw new Error('AI script is required');
    }

    // 1. Opening HOLD segment (2-second black fade-in)
    const openingHold = '[[HOLD]] <COLOR:#000000,duration=2.0>';
    
    // 2. Process voice lines from AI script - add auto-colorization
    const processedVoiceLines = aiScript
      .split('\n\n')
      .filter(line => line.trim())
      .map(line => {
        const trimmedLine = line.trim();
        
        // Skip if already processed or malformed
        if (!trimmedLine.includes('[') || !trimmedLine.includes(']')) {
          return trimmedLine;
        }

        // Extract voice tag and content
        const voiceMatch = trimmedLine.match(/^\[([^\]]+)\]\s*(.*)$/);
        if (!voiceMatch) {
          return trimmedLine;
        }

        const [, voiceTag, content] = voiceMatch;
        const cleanContent = content.trim();

        // Determine voice type for auto-colorization
        let autoColor = '';
        const lowerVoiceTag = voiceTag.toLowerCase();
        
        if (lowerVoiceTag === 'ember voice') {
          autoColor = ' <COLOR:#FF0000,TRAN:0.2>'; // Red for ember voice
        } else if (lowerVoiceTag === 'narrator') {
          autoColor = ' <COLOR:#0000FF,TRAN:0.2>'; // Blue for narrator
        } else {
          // Contributor voices (actual names like [Amado], [Sarah])
          autoColor = ' <COLOR:#00FF00,TRAN:0.2>'; // Green for contributors
        }

        return `[${voiceTag}]${autoColor} ${cleanContent}`;
      })
      .join('\n\n');

    // 3. Build MEDIA elements from selected media
    let mediaElements = '';
    if (selectedMedia && selectedMedia.length > 0) {
      console.log('📸 API: Adding selected media to script:', selectedMedia.map(m => m.name));
      mediaElements = selectedMedia
        .map(media => `[[MEDIA]] <name="${media.filename || media.name}">`)
        .join('\n\n');
    } else {
      // No media selected - create story without media elements
      console.log('📸 API: No media selected, creating story without media elements');
      mediaElements = ''; // Empty - no media in the story
    }
    
    // 4. Closing HOLD segment (4-second black fade-out)
    const closingHold = '[[HOLD]] <COLOR:#000000,duration=4.0>';

    // 5. Combine all elements into complete ember script
    const scriptParts = [openingHold, processedVoiceLines];
    if (mediaElements) {
      scriptParts.push(mediaElements);
    }
    scriptParts.push(closingHold);
    
    const emberScript = scriptParts.join('\n\n');

    console.log('✅ API: Ember script generated successfully');
    console.log('📝 API: Output script length:', emberScript?.length || 0);
    console.log('📝 API: Output script preview:', emberScript?.substring(0, 200) + '...');
    
    return emberScript;
  } catch (error) {
    console.error('❌ API: Error processing AI script to Ember script:', error);
    console.log('🔄 API: Falling back to basic processing...');
    return processAIScriptToEmberScriptBasic(aiScript, selectedMedia);
  }
}

// Fallback basic processing without ember data
function processAIScriptToEmberScriptBasic(aiScript, selectedMedia = []) {
  try {
    console.log('🔄 API: Using basic processing fallback');
    console.log('📝 API: Basic processing input:', aiScript?.substring(0, 100) + '...');
    console.log('📸 API: Basic processing with selected media:', selectedMedia?.length || 0, 'files');
    
    if (!aiScript || aiScript.trim() === '') {
      console.error('❌ API: Basic processing - no script content available');
      return '[EMBER VOICE] No script content available';
    }

    // Basic processing with minimal ember format
    const openingHold = '[[HOLD]] <COLOR:#000000,duration=2.0>';
    const closingHold = '[[HOLD]] <COLOR:#000000,duration=4.0>';
    
    // Build media elements from selected media or none
    let mediaElements = '';
    if (selectedMedia && selectedMedia.length > 0) {
      console.log('📸 API: Basic processing - adding selected media:', selectedMedia.map(m => m.name));
      mediaElements = selectedMedia
        .map(media => `[[MEDIA]] <name="${media.filename || media.name}">`)
        .join('\n\n');
    } else {
      console.log('📸 API: Basic processing - no media selected, creating story without media');
      mediaElements = ''; // Empty - no media in the story
    }

    // Add basic colorization
    const processedContent = aiScript
      .split('\n\n')
      .filter(line => line.trim())
      .map(line => {
        const trimmedLine = line.trim();
        if (!trimmedLine.includes('[') || !trimmedLine.includes(']')) {
          return trimmedLine;
        }

        const voiceMatch = trimmedLine.match(/^\[([^\]]+)\]\s*(.*)$/);
        if (!voiceMatch) return trimmedLine;

        const [, voiceTag, content] = voiceMatch;
        const lowerVoiceTag = voiceTag.toLowerCase();
        
        let autoColor = '';
        if (lowerVoiceTag === 'ember voice') {
          autoColor = ' <COLOR:#FF0000,TRAN:0.2>';
        } else if (lowerVoiceTag === 'narrator') {
          autoColor = ' <COLOR:#0000FF,TRAN:0.2>';
        } else {
          autoColor = ' <COLOR:#00FF00,TRAN:0.2>';
        }

        return `[${voiceTag}]${autoColor} ${content.trim()}`;
      })
      .join('\n\n');

    const scriptParts = [openingHold, processedContent];
    if (mediaElements) {
      scriptParts.push(mediaElements);
    }
    scriptParts.push(closingHold);
    
    const finalScript = scriptParts.join('\n\n');
    
    console.log('✅ API: Basic processing completed');
    console.log('📝 API: Basic output length:', finalScript?.length || 0);
    console.log('📝 API: Basic output preview:', finalScript?.substring(0, 200) + '...');
    
    return finalScript;
  } catch (error) {
    console.error('❌ API: Error in basic processing:', error);
    return '[EMBER VOICE] Error processing script content';
  }
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
    contributorQuotes,
    selectedMedia
  } = req.body;

  console.log('📸 API: Received selected media:', selectedMedia?.length || 0, 'files');
  if (selectedMedia && selectedMedia.length > 0) {
    console.log('📸 API: Media details:', selectedMedia.map(m => ({
      id: m.id,
      name: m.name,
      filename: m.filename,
      type: m.type,
      category: m.category
    })));
  }

  try {
    const openai = new OpenAI({ apiKey });
    
    // Calculate approximate word count (3 words per second)
    const approximateWords = Math.round(formData.duration * 3);
    
    // Get all story messages for the ember to extract recorded audio (using same RPC as frontend)
    console.log('🎙️ Loading story messages for recorded audio...');
    const { data: storyMessages, error: messagesError } = await supabase.rpc('get_all_story_messages_for_ember', {
      input_ember_id: emberId
    });
    
    if (messagesError) {
      console.warn('Could not load story messages for recorded audio:', messagesError);
    }
    
    // Extract recorded audio URLs from story messages (RPC returns array directly)
    const recordedAudioMap = new Map();
    if (storyMessages && Array.isArray(storyMessages)) {
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
    
    console.log('🎙️ API - Found recorded audio for users:', Array.from(recordedAudioMap.keys()));
    console.log('🔍 API DEBUG - Story messages loaded from RPC:', storyMessages?.length || 0);
    console.log('🔍 API DEBUG - Voice casting contributors:', voiceCasting.contributors?.length || 0);
    
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
      console.log('📝 AI script received:', generatedStoryCut.ai_script?.substring(0, 200) + '...');
      
      // 🔍 DEBUG: Log what OpenAI actually returned
      console.log('🔍 API DEBUG - Raw OpenAI response:', storyCut);
      console.log('🔍 API DEBUG - Parsed generatedStoryCut:', generatedStoryCut);
      console.log('🔍 API DEBUG - ai_script field:', generatedStoryCut.ai_script);
      console.log('🔍 API DEBUG - ai_script length:', generatedStoryCut.ai_script?.length || 0);
      
      // 🔄 PROCESS AI SCRIPT TO EMBER SCRIPT
      if (generatedStoryCut.ai_script) {
        console.log('🔄 Processing AI script to Ember script format...');
        console.log('📝 AI script content preview:', generatedStoryCut.ai_script.substring(0, 200) + '...');
        
        try {
          // Get ember data needed for processing
          const { data: emberData, error: emberError } = await supabase
            .from('embers')
            .select('*')
            .eq('id', emberId)
            .single();
          
          if (emberError) {
            console.warn('⚠️ Could not load ember data for script processing:', emberError);
            // Fallback: use basic ember format without ember data
            console.log('🔄 Using basic processing fallback...');
            generatedStoryCut.full_script = processAIScriptToEmberScriptBasic(generatedStoryCut.ai_script, selectedMedia);
          } else {
            // Use full processing with ember data
            console.log('🔄 Using full processing with ember data...');
            generatedStoryCut.full_script = processAIScriptToEmberScriptAPI(generatedStoryCut.ai_script, emberData, selectedMedia);
          }
          
          // Ensure we always have a full_script
          if (!generatedStoryCut.full_script) {
            console.error('❌ Processing failed - full_script is still null/undefined');
            console.log('🔄 Emergency fallback - creating basic script...');
            
            // Build emergency media elements from selected media
            let emergencyMediaElements = '';
            if (selectedMedia && selectedMedia.length > 0) {
              console.log('🔄 Emergency fallback using selected media:', selectedMedia.map(m => m.name));
              emergencyMediaElements = selectedMedia
                .map(media => `[[MEDIA]] <name="${media.filename || media.name}">`)
                .join('\n\n');
            } else {
              console.log('🔄 Emergency fallback - no media selected, creating story without media');
              emergencyMediaElements = ''; // Empty - no media in the story
            }
            
            const emergencyScriptParts = [`[[HOLD]] <COLOR:#000000,duration=2.0>`, generatedStoryCut.ai_script];
            if (emergencyMediaElements) {
              emergencyScriptParts.push(emergencyMediaElements);
            }
            emergencyScriptParts.push(`[[HOLD]] <COLOR:#000000,duration=4.0>`);
            
            generatedStoryCut.full_script = emergencyScriptParts.join('\n\n');
          }
          
        } catch (processingError) {
          console.error('❌ Error during script processing:', processingError);
          console.log('🔄 Emergency fallback - creating basic script...');
          
          // Build emergency media elements from selected media
          let emergencyMediaElements = '';
          if (selectedMedia && selectedMedia.length > 0) {
            console.log('🔄 Emergency fallback using selected media:', selectedMedia.map(m => m.name));
            emergencyMediaElements = selectedMedia
              .map(media => `[[MEDIA]] <name="${media.filename || media.name}">`)
              .join('\n\n');
          } else {
            console.log('🔄 Emergency fallback - no media selected, creating story without media');
            emergencyMediaElements = ''; // Empty - no media in the story
          }
          
          const emergencyScriptParts = [`[[HOLD]] <COLOR:#000000,duration=2.0>`, generatedStoryCut.ai_script];
          if (emergencyMediaElements) {
            emergencyScriptParts.push(emergencyMediaElements);
          }
          emergencyScriptParts.push(`[[HOLD]] <COLOR:#000000,duration=4.0>`);
          
          generatedStoryCut.full_script = emergencyScriptParts.join('\n\n');
        }
        
        console.log('✅ Ember script generated');
        console.log('📝 Ember script length:', generatedStoryCut.full_script?.length || 0);
        console.log('📝 Ember script preview:', generatedStoryCut.full_script?.substring(0, 300) + '...');
      } else {
        console.warn('⚠️ No ai_script found in OpenAI response');
        console.error('🔍 Available fields in OpenAI response:', Object.keys(generatedStoryCut));
        generatedStoryCut.full_script = '[EMBER VOICE] No script content generated';
      }
      
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
      
      console.log('🎙️ API - Added recorded audio to story cut:', Object.keys(generatedStoryCut.recordedAudio));
      console.log('🔍 API DEBUG - Contributors to map:', voiceCasting.contributors?.map(c => ({id: c.id, name: c.name})) || []);
      console.log('🔍 API DEBUG - Available audio users in map:', Array.from(recordedAudioMap.keys()));
      
      // Debug the mapping process
      if (voiceCasting.contributors) {
        voiceCasting.contributors.forEach(contributor => {
          const hasAudio = recordedAudioMap.has(contributor.id);
          console.log(`🔍 API DEBUG - Contributor ${contributor.name} (${contributor.id}): ${hasAudio ? 'HAS AUDIO' : 'NO AUDIO'}`);
        });
      }
      
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