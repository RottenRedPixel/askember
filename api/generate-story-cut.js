import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client for API usage
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// ✅ JSON-ONLY: Script processing functions removed
// All story generation now uses pure JSON blocks format

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
        // Use message_id directly from the quote if available
        if (quote.message_id) {
          // Find the corresponding message data for user_id
          const messageData = messageIdMap.get(quote.message_id);
          return {
            contributor: quote.contributor_name,
            content: quote.content,
            message_id: quote.message_id,
            user_id: messageData?.user_id || null // ✅ NEW: Include user_id for AI
          };
        }

        // Fallback: Find the corresponding message ID for this quote (legacy compatibility)
        const matchingMessage = storyMessages.find(msg =>
          msg.sender === 'user' &&
          msg.content === quote.content &&
          msg.user_first_name === quote.contributor_name
        );

        return {
          contributor: quote.contributor_name,
          content: quote.content,
          message_id: matchingMessage?.id || null,
          user_id: matchingMessage?.user_id || null // ✅ NEW: Include user_id for AI
        };
      });
    }

    console.log('🎙️ API - Found recorded audio for users:', Array.from(recordedAudioMap.keys()));
    console.log('🔍 API DEBUG - Story messages loaded from RPC:', storyMessages?.length || 0);
    console.log('🔍 API DEBUG - Voice casting contributors:', voiceCasting.contributors?.length || 0);
    console.log('🆔 API DEBUG - Enhanced contributor quotes with message IDs:', enhancedContributorQuotes?.length || 0);
    console.log('🆔 API DEBUG - Message ID map size:', messageIdMap.size);

    // 🐛 DEBUG: Log enhanced contributor quotes details
    console.log('🐛 API DEBUG - Enhanced contributor quotes details:');
    if (enhancedContributorQuotes && enhancedContributorQuotes.length > 0) {
      enhancedContributorQuotes.forEach((quote, index) => {
        console.log(`  Quote ${index + 1}:`);
        console.log(`    - Contributor: ${quote.contributor}`);
        console.log(`    - Message ID: ${quote.message_id}`);
        console.log(`    - Content: "${quote.content?.substring(0, 50)}..."`);
      });
    } else {
      console.log('  No enhanced contributor quotes found');
    }

    // 🐛 ENHANCED DEBUG: Log the EXACT contributor_quotes variable being sent to AI
    console.log('🚨 API DEBUG - EXACT contributor_quotes being sent to OpenAI:');
    console.log('🚨 Raw variable:', enhancedContributorQuotes);
    console.log('🚨 Variable length:', enhancedContributorQuotes?.length || 0);
    if (enhancedContributorQuotes && enhancedContributorQuotes.length > 0) {
      console.log('🚨 Individual quotes that AI should use EXACTLY:');
      enhancedContributorQuotes.forEach((quote, index) => {
        console.log(`🚨   ${quote.contributor}: "${quote.content}"`);
      });
    }

    // 🐛 DEBUG: Log messageIdMap details
    console.log('🐛 API DEBUG - MessageIdMap contents:');
    for (const [messageId, messageData] of messageIdMap.entries()) {
      console.log(`  Message ID: ${messageId}`);
      console.log(`    - User: ${messageData.user_first_name} (${messageData.user_id})`);
      console.log(`    - Content: "${messageData.content?.substring(0, 50)}..."`);
      console.log(`    - Audio URL: ${messageData.audio_url ? 'EXISTS' : 'MISSING'}`);
    }

    // 🐛 ENHANCED DEBUG: Log all story messages details
    console.log('🐛 API DEBUG - All story messages:');
    if (storyMessages && Array.isArray(storyMessages)) {
      storyMessages.forEach((msg, index) => {
        console.log(`  Message ${index + 1}:`);
        console.log(`    - ID: ${msg.id}`);
        console.log(`    - User ID: ${msg.user_id} (${typeof msg.user_id})`);
        console.log(`    - First Name: ${msg.user_first_name}`);
        console.log(`    - Sender: ${msg.sender}`);
        console.log(`    - Content: "${msg.content?.substring(0, 50)}..."`);
        console.log(`    - Audio URL: ${msg.audio_url ? 'EXISTS' : 'MISSING'}`);
        console.log(`    - Audio Filename: ${msg.audio_filename || 'N/A'}`);
        console.log(`    - Audio Duration: ${msg.audio_duration_seconds || 'N/A'}s`);
      });
    } else {
      console.log('  No story messages found or not an array');
    }

    // Get the master story cut generation prompt
    console.log('🔍 Loading master story cut generation prompt...');
    const { data: masterPromptData, error: masterPromptError } = await supabase.rpc('get_active_prompt', {
      prompt_key_param: 'story_cut_generation'
    });

    if (masterPromptError || !masterPromptData || masterPromptData.length === 0) {
      console.error('Failed to load master prompt:', masterPromptError);
      return res.status(500).json({ error: 'Failed to load story generation prompt' });
    }

    const masterPrompt = masterPromptData[0];

    // Get the selected style prompt
    console.log('🎨 Loading style prompt:', selectedStyle);
    const { data: stylePromptData, error: stylePromptError } = await supabase.rpc('get_active_prompt', {
      prompt_key_param: selectedStyle
    });

    if (stylePromptError || !stylePromptData || stylePromptData.length === 0) {
      console.error('Failed to load style prompt:', stylePromptError);
      return res.status(500).json({ error: 'Failed to load style prompt' });
    }

    const stylePrompt = stylePromptData[0];

    console.log('✅ Loaded master prompt:', masterPrompt.title);
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
      use_narrator_voice: voiceCasting.narrator !== null,
      selected_media: selectedMedia ? JSON.stringify(selectedMedia, null, 2) : 'No media selected'
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
    let systemPrompt = masterPrompt.system_prompt;
    userPrompt = userPrompt.replace(/\{\{/g, '{{').replace(/\}\}/g, '}}'); // Ensure proper variable replacement

    // ✅ Simple variable replacement for JSON-only system
    Object.entries(promptVariables).forEach(([key, value]) => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      systemPrompt = systemPrompt.replace(regex, value || '');
      userPrompt = userPrompt.replace(regex, value || '');
    });

    console.log('🤖 Generating story cut with:', {
      style: stylePrompt.title,
      duration: formData.duration,
      wordCount: approximateWords,
      contributors: voiceCasting.contributors?.length || 0,
      hasQuotes: enhancedContributorQuotes && enhancedContributorQuotes.length > 0,
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

      // 🚀 NEW: Process JSON blocks if available (preferred format)
      if (generatedStoryCut.blocks && Array.isArray(generatedStoryCut.blocks)) {
        console.log('🚀 API - New JSON blocks format detected:', generatedStoryCut.blocks.length, 'blocks');

        // ✅ SIMPLIFIED: Just ensure order is set and save blocks directly
        const processedBlocks = generatedStoryCut.blocks.map((block, index) => {
          const processedBlock = { ...block };

          // Ensure order is set
          if (!processedBlock.order) {
            processedBlock.order = index + 1;
          }

          // ✅ AI now includes message_id and user_id directly - no enhancement needed!
          console.log(`✅ Block ${index + 1}: ${block.type} - ${block.speaker || 'No speaker'} - Message ID: ${block.message_id || 'none'}`);

          return processedBlock;
        });

        // Store processed blocks
        generatedStoryCut.blocks = processedBlocks;
        console.log('✅ Saved', processedBlocks.length, 'JSON blocks with direct AI metadata');

        // ✅ JSON-ONLY: No script processing needed anymore!
        console.log('🎯 Using pure JSON blocks - no script processing required');
      } else {
        console.error('❌ No JSON blocks found in AI response - this should not happen with the new prompt');
        throw new Error('AI did not generate the required JSON blocks format');
      }

      // ✅ JSON-ONLY: Remove all script processing code
      console.log('🎯 Pure JSON story cut generated successfully');
      console.log('📊 Generated', generatedStoryCut.blocks?.length || 0, 'blocks total');

      // Add recorded audio URLs to the story cut data (MISSING LOGIC FROM LOCALHOST)
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
      console.log('🔍 API DEBUG - Contributors to map:', voiceCasting.contributors?.map(c => ({ id: c.id, name: c.name })) || []);
      console.log('🔍 API DEBUG - Available audio users in map:', Array.from(recordedAudioMap.keys()));

      // Debug the mapping process
      if (voiceCasting.contributors) {
        voiceCasting.contributors.forEach(contributor => {
          const hasAudio = recordedAudioMap.has(contributor.id);
          console.log(`🔍 API DEBUG - Contributor ${contributor.name} (${contributor.id}): ${hasAudio ? 'HAS AUDIO' : 'NO AUDIO'}`);
          console.log(`🔍 API DEBUG - Contributor ID type: ${typeof contributor.id}`);

          // Check if there's a type mismatch
          const audioUsers = Array.from(recordedAudioMap.keys());
          const matchingUser = audioUsers.find(userId => userId == contributor.id); // Use loose equality
          if (matchingUser) {
            console.log(`🔍 API DEBUG - Found matching user with loose equality: ${matchingUser} (${typeof matchingUser})`);
          }
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