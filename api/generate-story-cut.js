import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client for database operations
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Template variable replacement function
function replaceVariables(template, variables) {
  let result = template;

  Object.entries(variables).forEach(([key, value]) => {
    // Handle different value types appropriately
    let replacementValue;
    if (typeof value === 'object' && value !== null) {
      replacementValue = JSON.stringify(value);
    } else if (typeof value === 'boolean') {
      replacementValue = value.toString();
    } else if (typeof value === 'number') {
      replacementValue = value.toString();
    } else if (value === null || value === undefined) {
      replacementValue = '';
    } else {
      replacementValue = value.toString();
    }

    const regex = new RegExp(`{{${key}}}`, 'g');
    result = result.replace(regex, replacementValue);
  });

  return result;
}

export default async function handler(req, res) {
  // Debug: Force fresh deployment - v1.0.282+
  console.log('🚀 API Handler loaded - v1.0.282+');
  
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

  console.log('🔍 API DEBUG - Received voiceCasting:', JSON.stringify(voiceCasting, null, 2));
  console.log('🔍 API DEBUG - formData:', JSON.stringify(formData, null, 2));
  console.log('🔍 API DEBUG - selectedStyle:', selectedStyle);
  console.log('🔍 API DEBUG - emberId:', emberId);

  console.log('📸 API: Received selected media:', selectedMedia?.length || 0, 'files');
  console.log('🔍 API DEBUG: selectedMedia raw data:', JSON.stringify(selectedMedia, null, 2));

  if (selectedMedia && selectedMedia.length > 0) {
    console.log('📸 API: Media details:', selectedMedia.map(m => ({
      id: m.id,
      name: m.name,
      filename: m.filename,
      type: m.type,
      category: m.category,
      file_url: m.file_url,
      storage_url: m.storage_url,
      display_name: m.display_name
    })));

    // Check specifically for ember photos
    const emberPhotos = selectedMedia.filter(m => m.category === 'ember');
    console.log('🔍 API DEBUG: Ember photos found:', emberPhotos.length);
    emberPhotos.forEach((photo, i) => {
      console.log(`🔍 API DEBUG: Ember photo ${i + 1}:`, JSON.stringify(photo, null, 2));
    });
  } else {
    console.log('🔍 API DEBUG: No selectedMedia or empty array');
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
    const messageIdMap = new Map(); // NEW: Map message IDs to message data
    if (storyMessages && Array.isArray(storyMessages)) {
      storyMessages.forEach(msg => {
        if (msg.sender === 'user') {
          // Store in recordedAudioMap only if has audio (for backward compatibility)
          if (msg.audio_url) {
            recordedAudioMap.set(msg.user_id, {
              audio_url: msg.audio_url,
              audio_filename: msg.audio_filename,
              audio_duration_seconds: msg.audio_duration_seconds,
              user_first_name: msg.user_first_name,
              message_content: msg.content
            });
          }

          // Store ALL user messages in messageIdMap (with or without audio)
          messageIdMap.set(msg.id, {
            user_id: msg.user_id,
            user_first_name: msg.user_first_name,
            content: msg.content,
            audio_url: msg.audio_url || null,
            audio_filename: msg.audio_filename || null,
            audio_duration_seconds: msg.audio_duration_seconds || null
          });
        }
      });
    }

    // NEW: Enhanced contributor quotes with message IDs
    let enhancedContributorQuotes = contributorQuotes;
    if (contributorQuotes && contributorQuotes.length > 0) {
      enhancedContributorQuotes = contributorQuotes.map(quote => {
        // Try to find matching message ID from the message content
        for (const [messageId, messageData] of messageIdMap.entries()) {
          if (messageData.content && quote.content &&
            messageData.content.trim() === quote.content.trim()) {
            return {
              ...quote,
              message_id: messageId,
              user_id: messageData.user_id
            };
          }
        }
        return quote; // Return original if no match found
      });

      console.log('✅ Enhanced contributor quotes with message IDs');
    }

    // Get ember owner's information for proper voice attribution
    let ownerFirstName = 'Owner';
    if (voiceCasting.contributors && voiceCasting.contributors.length > 0) {
      const owner = voiceCasting.contributors.find(c => c.role === 'owner');
      if (owner && owner.name) {
        ownerFirstName = owner.name;
      }
    }

    // Get the master story cut generation prompt
    console.log('🔍 Loading master story cut generation prompt...');
    const { data: masterPrompt, error: promptError } = await supabase
      .from('prompts')
      .select('*')
      .eq('prompt_key', 'story_cut_generation')
      .eq('is_active', true)
      .single();

    if (promptError || !masterPrompt) {
      throw new Error(`Master prompt not found: ${promptError?.message || 'story_cut_generation prompt not active'}`);
    }

    console.log('✅ Loaded master prompt:', masterPrompt.title);

    // Get the selected style prompt
    console.log('🎨 Loading style prompt:', selectedStyle);
    const { data: stylePrompt, error: styleError } = await supabase
      .from('prompts')
      .select('*')
      .eq('prompt_key', selectedStyle)
      .eq('is_active', true)
      .single();

    if (styleError || !stylePrompt) {
      throw new Error(`Style prompt not found: ${selectedStyle}`);
    }

    console.log('✅ Loaded style prompt:', stylePrompt.title);

    // Format story conversations with proper voice attribution
    let storyConversations_formatted = 'No story circle conversations available yet.';
    if (storyConversations && storyConversations.length > 0) {
      storyConversations_formatted = storyConversations
        .map(msg => {
          if (msg.sender === 'ember') {
            return `Ember AI: ${msg.content}`;
          } else {
            const userLabel = msg.user_first_name || 'User';
            return `${userLabel}: ${msg.content}`;
          }
        })
        .join('\n');
    }

    console.log('🎙️ Found recorded audio for users:', Array.from(recordedAudioMap.keys()));

    // Prepare all the variables for the master prompt
    const promptVariables = {
      ember_context: emberContext,
      story_conversations: storyConversations_formatted,
      selected_media: selectedMedia ? JSON.stringify(selectedMedia, null, 2) : 'No media selected',
      style_prompt: stylePrompt.system_prompt,
      story_title: formData.title,
      duration: formData.duration,
      word_count: approximateWords,
      story_focus: formData.focus || 'General storytelling approach',
      owner_first_name: ownerFirstName,
      selected_contributors: voiceCasting.contributors?.map(c => c.name).join(', ') || 'None',
      ember_voice_name: voiceCasting.ember?.name || 'Selected Voice',
      ember_voice_id: voiceCasting.ember?.voice_id || 'null',
      narrator_voice_name: voiceCasting.narrator?.name || 'Selected Voice',
      narrator_voice_id: voiceCasting.narrator?.voice_id || 'null',
      voice_casting_info: JSON.stringify(voiceCasting, null, 2),
      contributor_quotes: enhancedContributorQuotes ? JSON.stringify(enhancedContributorQuotes, null, 2) : 'No direct quotes available',
      selected_style: selectedStyle,
      selected_contributors_json: JSON.stringify(voiceCasting.contributors || []),
      contributor_count: voiceCasting.contributors?.length || 0,
      has_quotes: enhancedContributorQuotes && enhancedContributorQuotes.length > 0,
      timestamp: new Date().toISOString(),
      use_ember_voice: voiceCasting.ember !== null,
      use_narrator_voice: voiceCasting.narrator !== null
    };

    // Format the master prompt with all variables
    let systemPrompt = replaceVariables(masterPrompt.system_prompt, promptVariables);
    let userPrompt = replaceVariables(masterPrompt.user_prompt_template, promptVariables);

    console.log('🤖 Generating story cut with:', {
      style: stylePrompt.title,
      duration: formData.duration,
      wordCount: approximateWords,
      contributorCount: voiceCasting.contributors?.length || 0,
      hasQuotes: enhancedContributorQuotes && enhancedContributorQuotes.length > 0,
      selectedMediaCount: selectedMedia?.length || 0
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

      // 🚀 NEW: Process JSON blocks if available (preferred format)
      if (generatedStoryCut.blocks && Array.isArray(generatedStoryCut.blocks)) {
        console.log('🚀 API - New JSON blocks format detected:', generatedStoryCut.blocks.length, 'blocks');

        // Enhanced blocks with message ID mapping and user IDs
        const enhancedBlocks = generatedStoryCut.blocks.map((block, index) => {
          const enhancedBlock = { ...block };

          // Ensure order is set
          if (!enhancedBlock.order) {
            enhancedBlock.order = index + 1;
          }

          // Map recorded contributor blocks to correct message IDs and user IDs
          if (block.voice_preference === 'recorded' && block.speaker && enhancedContributorQuotes) {
            const matchingQuote = enhancedContributorQuotes.find(quote =>
              quote.contributor === block.speaker &&
              quote.content === block.content
            );

            if (matchingQuote && matchingQuote.message_id) {
              enhancedBlock.message_id = matchingQuote.message_id;

              // Find user ID from messageIdMap
              const messageData = messageIdMap.get(matchingQuote.message_id);
              if (messageData) {
                enhancedBlock.user_id = messageData.user_id;
                console.log(`🆔 Enhanced block for ${block.speaker}: message_id=${matchingQuote.message_id}, user_id=${messageData.user_id}`);
              }
            }
          }

          return enhancedBlock;
        });

        // Store enhanced blocks
        generatedStoryCut.blocks = enhancedBlocks;
        console.log('✅ Enhanced', enhancedBlocks.length, 'JSON blocks with message IDs and user IDs');
      } else {
        console.log('⚠️ No JSON blocks found in AI response - this should not happen with new prompt format');
      }

      // Add recorded audio URLs to the story cut data
      generatedStoryCut.recordedAudio = {};

      // Map recorded audio to contributors with message IDs
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

      // NEW: Add message ID mapping to metadata for audio matching
      generatedStoryCut.messageIdMap = Object.fromEntries(messageIdMap);

      console.log('🎙️ API - Added recorded audio to story cut:', Object.keys(generatedStoryCut.recordedAudio));
      console.log('🆔 API - Added message ID mapping:', Object.keys(generatedStoryCut.messageIdMap || {}));

    } catch (parseError) {
      console.error('OpenAI returned invalid JSON:', storyCut);
      throw new Error('OpenAI returned invalid JSON response');
    }

    return res.status(200).json({
      success: true,
      data: JSON.stringify(generatedStoryCut),
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