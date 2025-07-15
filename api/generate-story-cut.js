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

// Self-contained AI script to Ember script processing (API version) - SACRED FORMAT
function processAIScriptToEmberScriptAPI(aiScript, emberData, selectedMedia = [], voiceCasting = {}) {
  try {
    console.log('🔄 API: Processing AI script to Ember script format (SACRED FORMAT)');
    console.log('📝 API: Input ai_script:', aiScript?.substring(0, 100) + '...');
    console.log('📸 API: Selected media:', selectedMedia?.length || 0, 'files');
    console.log('🎤 API: Voice casting:', voiceCasting);

    if (!aiScript || aiScript.trim() === '') {
      console.error('❌ API: AI script is empty or null');
      throw new Error('AI script is required');
    }

    // 1. Check if AI script is already in sacred format
    const isSacredFormat = aiScript.includes(' | ') && aiScript.includes('<') && aiScript.includes('>');
    console.log('🔍 API: AI script format detection - Sacred format:', isSacredFormat);

    // 2. Build MEDIA elements from selected media - prioritize ember photo first
    let emberImage = '';
    let additionalMediaElements = '';

    console.log('🔍 API DEBUG: Starting media processing...');
    console.log('🔍 API DEBUG: selectedMedia exists:', !!selectedMedia);
    console.log('🔍 API DEBUG: selectedMedia length:', selectedMedia?.length || 0);

    if (selectedMedia && selectedMedia.length > 0) {
      console.log('📸 API: Adding selected media to script:', selectedMedia.map(m => m.name));
      console.log('🔍 API DEBUG: Full selectedMedia objects:', JSON.stringify(selectedMedia, null, 2));

      // Sort media to put ember photo first
      const sortedMedia = [...selectedMedia].sort((a, b) => {
        const aIsEmber = a.category === 'ember' || (a.name && a.name.toLowerCase().includes('ember'));
        const bIsEmber = b.category === 'ember' || (b.name && b.name.toLowerCase().includes('ember'));

        console.log(`🔍 API DEBUG: Checking media "${a.name}" - category: "${a.category}", isEmber: ${aIsEmber}`);
        console.log(`🔍 API DEBUG: Checking media "${b.name}" - category: "${b.category}", isEmber: ${bIsEmber}`);

        if (aIsEmber && !bIsEmber) return -1;
        if (!aIsEmber && bIsEmber) return 1;
        return 0;
      });

      console.log('🔍 API DEBUG: Sorted media order:', sortedMedia.map(m => `${m.name} (${m.category})`));

      // Use new sacred format for media elements
      console.log('🔍 API DEBUG: MEDIA generation starting');
      console.log('🔍 API DEBUG: sortedMedia length:', sortedMedia?.length);
      console.log('🔍 API DEBUG: sortedMedia summary:', sortedMedia?.map(m => ({
        id: m.id,
        name: m.name,
        category: m.category,
        storage_url: m.storage_url?.substring(0, 50) + '...'
      })));

      if (sortedMedia.length > 0) {
        const firstMedia = sortedMedia[0];
        console.log('🔍 API DEBUG: First media object:', JSON.stringify(firstMedia, null, 2));

        if (firstMedia.file_url || firstMedia.storage_url) {
          const mediaUrl = firstMedia.file_url || firstMedia.storage_url;
          const fallbackName = firstMedia.display_name || firstMedia.filename || firstMedia.name || 'media';
          emberImage = `[MEDIA | ${firstMedia.id || 'generated'}] <path="${mediaUrl}",fallback="${fallbackName}">`;
          console.log('✅ API DEBUG: Created emberImage with URL:', emberImage);
        } else if (firstMedia.id) {
          emberImage = `[MEDIA | ${firstMedia.id}] <media>`;
          console.log('✅ API DEBUG: Created emberImage with ID only:', emberImage);
        } else {
          emberImage = `[MEDIA | generated] <name="${firstMedia.filename || firstMedia.name}">`;
          console.log('✅ API DEBUG: Created emberImage with name only:', emberImage);
        }

        // Additional media (if any)
        if (sortedMedia.length > 1) {
          console.log('🔍 API DEBUG: Processing additional media elements:', sortedMedia.length - 1);
          additionalMediaElements = sortedMedia.slice(1)
            .map(media => {
              console.log('🔍 API DEBUG: Processing additional media:', {
                id: media.id,
                name: media.name,
                storage_url: media.storage_url?.substring(0, 30) + '...'
              });

              let line;
              if (media.file_url || media.storage_url) {
                const mediaUrl = media.file_url || media.storage_url;
                const fallbackName = media.display_name || media.filename || media.name || 'media';
                line = `[MEDIA | ${media.id || 'generated'}] <path="${mediaUrl}",fallback="${fallbackName}">`;
                console.log('✅ API DEBUG: Created additional MEDIA line with URL:', line);
              } else if (media.id) {
                line = `[MEDIA | ${media.id}] <media>`;
                console.log('✅ API DEBUG: Created additional MEDIA line with ID:', line);
              } else {
                line = `[MEDIA | generated] <name="${media.filename || media.name}">`;
                console.log('✅ API DEBUG: Created additional MEDIA line with name:', line);
              }
              return line;
            })
            .join('\n\n');
          console.log('🔍 API DEBUG: additionalMediaElements:', additionalMediaElements);
        }
      }
    } else {
      // No media selected - use ember's own image data if available
      console.log('📸 API: No media selected, checking for ember image from emberData');
      console.log('🔍 API DEBUG: emberData exists:', !!emberData);
      console.log('🔍 API DEBUG: emberData.original_filename:', emberData?.original_filename);

      if (emberData && emberData.original_filename) {
        emberImage = `[MEDIA | ember_image] <name="${emberData.original_filename}">`;
        console.log('✅ API DEBUG: Created fallback emberImage:', emberImage);
      } else {
        console.log('❌ API DEBUG: No fallback ember image could be created');
        console.log('🔍 API DEBUG: emberData object:', JSON.stringify(emberData, null, 2));
      }
    }

    // 🔧 GUARANTEED EMBER PHOTO FALLBACK - Always ensure we have an ember image
    if (!emberImage) {
      console.log('🚨 API DEBUG: No ember image created yet - applying guaranteed fallback');

      // Try multiple fallback strategies
      if (emberData) {
        if (emberData.storage_url) {
          emberImage = `[MEDIA | ${emberData.id || 'ember_main'}] <path="${emberData.storage_url}",fallback="ember_photo">`;
          console.log('✅ API DEBUG: Fallback 1 - Using emberData.storage_url:', emberImage);
        } else if (emberData.original_filename) {
          emberImage = `[MEDIA | ${emberData.id || 'ember_main'}] <name="${emberData.original_filename}">`;
          console.log('✅ API DEBUG: Fallback 2 - Using emberData.original_filename:', emberImage);
        } else if (emberData.id) {
          emberImage = `[MEDIA | ${emberData.id}] <media>`;
          console.log('✅ API DEBUG: Fallback 3 - Using emberData.id only:', emberImage);
        }
      }

      // Ultimate fallback - create a placeholder ember image reference
      if (!emberImage) {
        emberImage = `[MEDIA | ember_photo] <name="ember_image">`;
        console.log('✅ API DEBUG: Ultimate fallback - Generic ember image:', emberImage);
      }
    } else {
      console.log('✅ API DEBUG: Ember image already created successfully:', emberImage);
    }

    // 3. Process AI script - preserve sacred format if already present
    let processedVoiceLines = aiScript;

    if (isSacredFormat) {
      // AI script is already in sacred format - preserve it exactly
      console.log('✅ API: AI script already in sacred format - preserving as-is');
      processedVoiceLines = aiScript.trim();
    } else {
      // Legacy format - convert to sacred format for backward compatibility
      console.log('🔄 API: Converting legacy format to sacred format');
      processedVoiceLines = aiScript
        .split('\n\n')
        .filter(line => line.trim())
        .map(line => {
          const trimmedLine = line.trim();

          // Skip if already processed or malformed
          if (!trimmedLine.includes('[') || !trimmedLine.includes(']')) {
            return trimmedLine;
          }

          // Extract voice tag and content from legacy format
          const voiceMatch = trimmedLine.match(/^\[([^\]]+)\]\s*(.*)$/);
          if (!voiceMatch) {
            return trimmedLine;
          }

          const [, voiceTag, content] = voiceMatch;
          const cleanContent = content.trim();

          // Convert to sacred format
          let sacredName = voiceTag;
          let preference = 'text';
          let contributionId = 'null';

          // Check if it's already partially sacred (has colons)
          const colonParts = voiceTag.split(':');
          if (colonParts.length >= 2) {
            sacredName = colonParts[0];
            preference = colonParts[1];
            contributionId = colonParts[2] || 'null';
          }

          // Normalize voice names for sacred format and populate actual voice data
          if (sacredName.toLowerCase().includes('ember')) {
            sacredName = 'EMBER VOICE';
            // Use actual ember voice data from voiceCasting
            preference = voiceCasting.ember?.preference || 'text';
            contributionId = voiceCasting.ember?.contributionId || 'null';
          } else if (sacredName.toLowerCase().includes('narrator')) {
            sacredName = 'NARRATOR';
            // Use actual narrator voice data from voiceCasting
            preference = voiceCasting.narrator?.preference || 'text';
            contributionId = voiceCasting.narrator?.contributionId || 'null';
          }

          // Build sacred format with actual voice data
          return `[${sacredName} | ${preference} | ${contributionId}] <${cleanContent}>`;
        })
        .join('\n\n');
    }

    // 4. Combine all elements into complete ember script (no closing HOLD)
    const scriptParts = [];

    console.log('🔍 API DEBUG: Script assembly starting...');
    console.log('🔍 API DEBUG: emberImage value:', emberImage);
    console.log('🔍 API DEBUG: emberImage is truthy:', !!emberImage);

    // Add ember image immediately (no black opening)
    if (emberImage) {
      scriptParts.push(emberImage);
      console.log('✅ API DEBUG: Added ember image to scriptParts:', emberImage);
    } else {
      console.log('❌ API DEBUG: No ember image to add - emberImage is empty/null');
    }

    // Add voice content
    scriptParts.push(processedVoiceLines);
    console.log('🔍 API DEBUG: Added voice content, scriptParts length now:', scriptParts.length);

    // Add any additional media
    if (additionalMediaElements) {
      scriptParts.push(additionalMediaElements);
      console.log('🔍 API DEBUG: Added additional media, scriptParts length now:', scriptParts.length);
    }

    // Story ends naturally without HOLD block

    const emberScript = scriptParts.join('\n\n');

    console.log('✅ API: Sacred format ember script generated successfully');
    console.log('📝 API: Output script length:', emberScript?.length || 0);
    console.log('📝 API: Final scriptParts array:', scriptParts.map((part, i) => `${i}: ${part.substring(0, 100)}...`));
    console.log('📝 API: Output script preview:', emberScript?.substring(0, 300) + '...');

    return emberScript;
  } catch (error) {
    console.error('❌ API: Error processing AI script to Ember script:', error);
    console.log('🔄 API: Falling back to basic processing...');
    return processAIScriptToEmberScriptBasic(aiScript, selectedMedia, voiceCasting);
  }
}

// Fallback basic processing without ember data - SACRED FORMAT
function processAIScriptToEmberScriptBasic(aiScript, selectedMedia = [], voiceCasting = {}) {
  try {
    console.log('🔄 API: Using basic processing fallback (SACRED FORMAT)');
    console.log('📝 API: Basic processing input:', aiScript?.substring(0, 100) + '...');
    console.log('🔍 API DEBUG: Basic processing selectedMedia:', selectedMedia?.length || 0);

    if (!aiScript || aiScript.trim() === '') {
      console.error('❌ API: Basic processing - no script content available');
      return '[EMBER VOICE | Selected Voice | null] <No script content available>';
    }

    // 🔧 BUILD EMBER IMAGE FOR BASIC PROCESSING
    let emberImage = '';

    if (selectedMedia && selectedMedia.length > 0) {
      console.log('📸 API: Basic processing - checking for ember photos in selectedMedia');
      const emberPhoto = selectedMedia.find(m => m.category === 'ember' || (m.name && m.name.toLowerCase().includes('ember')));

      if (emberPhoto) {
        if (emberPhoto.file_url || emberPhoto.storage_url) {
          const mediaUrl = emberPhoto.file_url || emberPhoto.storage_url;
          const fallbackName = emberPhoto.display_name || emberPhoto.filename || emberPhoto.name || 'ember_photo';
          emberImage = `[MEDIA | ${emberPhoto.id || 'ember_main'}] <path="${mediaUrl}",fallback="${fallbackName}">`;
          console.log('✅ API DEBUG: Basic processing created ember image with URL:', emberImage);
        } else if (emberPhoto.id) {
          emberImage = `[MEDIA | ${emberPhoto.id}] <media>`;
          console.log('✅ API DEBUG: Basic processing created ember image with ID:', emberImage);
        } else {
          emberImage = `[MEDIA | ember_basic] <name="${emberPhoto.filename || emberPhoto.name || 'ember_photo'}">`;
          console.log('✅ API DEBUG: Basic processing created ember image with name:', emberImage);
        }
      }
    }

    // Ultimate fallback for basic processing
    if (!emberImage) {
      emberImage = `[MEDIA | ember_fallback] <name="ember_image">`;
      console.log('✅ API DEBUG: Basic processing using ultimate fallback ember image');
    }

    // Check if AI script is already in sacred format
    const isSacredFormat = aiScript.includes(' | ') && aiScript.includes('<') && aiScript.includes('>');
    console.log('🔍 API: Basic processing - Sacred format:', isSacredFormat);

    // Basic processing with minimal sacred format (no closing HOLD)

    // Process the script based on format
    let processedScript = aiScript;
    if (!isSacredFormat) {
      // Convert legacy to sacred format
      console.log('🔄 API: Basic processing - converting to sacred format');
      processedScript = aiScript.replace(/^\[([^\]]+)\]\s*(.+)$/gm, (match, voiceTag, content) => {
        let sacredName = voiceTag;
        let preference = 'text';
        let contributionId = 'null';

        if (sacredName.toLowerCase().includes('ember')) {
          sacredName = 'EMBER VOICE';
          // Use actual ember voice data from voiceCasting
          preference = voiceCasting.ember?.preference || 'text';
          contributionId = voiceCasting.ember?.contributionId || 'null';
        } else if (sacredName.toLowerCase().includes('narrator')) {
          sacredName = 'NARRATOR';
          // Use actual narrator voice data from voiceCasting
          preference = voiceCasting.narrator?.preference || 'text';
          contributionId = voiceCasting.narrator?.contributionId || 'null';
        }
        return `[${sacredName} | ${preference} | ${contributionId}] <${content.trim()}>`;
      });
    }

    // 🔧 ASSEMBLE SCRIPT WITH EMBER IMAGE FIRST
    const scriptParts = [];

    // Always add ember image first
    if (emberImage) {
      scriptParts.push(emberImage);
      console.log('✅ API DEBUG: Basic processing added ember image first');
    }

    // Add processed voice script
    scriptParts.push(processedScript);

    const emberScript = scriptParts.join('\n\n');

    console.log('✅ API: Basic sacred format script generated');
    console.log('📝 API: Basic output length:', emberScript?.length || 0);

    return emberScript;
  } catch (error) {
    console.error('❌ API: Error in basic processing:', error);
    return '[EMBER VOICE | Selected Voice | null] <Error processing script>';
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
          return {
            contributor: quote.contributor_name,
            content: quote.content,
            message_id: quote.message_id
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
          message_id: matchingMessage?.id || null
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

      // 🔧 FIX CONTRIBUTION IDS: Post-process script to use correct message IDs
      console.log('🔧 API DEBUG - Starting contribution ID fix...');
      if (generatedStoryCut.ai_script && enhancedContributorQuotes && enhancedContributorQuotes.length > 0) {
        let correctedScript = generatedStoryCut.ai_script;

        // Create content-to-messageId mapping
        const contentToMessageIdMap = new Map();
        enhancedContributorQuotes.forEach(quote => {
          if (quote.message_id && quote.content) {
            // Use first 30 chars of content as key for matching
            const contentKey = quote.content.substring(0, 30).toLowerCase().trim();
            contentToMessageIdMap.set(contentKey, quote.message_id);
            console.log(`🔧 API DEBUG - Mapped content "${contentKey}" to message ID: ${quote.message_id}`);
          }
        });

        // Find and replace contribution IDs in Sacred Format
        const sacredFormatRegex = /\[([^|]+)\|([^|]+)\|([^\]]+)\]\s*<([^>]+)>/g;
        correctedScript = correctedScript.replace(sacredFormatRegex, (match, name, preference, contributionId, content) => {
          // Skip non-contributor entries (EMBER VOICE, NARRATOR, MEDIA)
          if (name.includes('EMBER VOICE') || name.includes('NARRATOR') || name.includes('MEDIA')) {
            return match;
          }

          // Try to find matching message ID by content
          const contentKey = content.substring(0, 30).toLowerCase().trim();
          const correctMessageId = contentToMessageIdMap.get(contentKey);

          if (correctMessageId && correctMessageId !== contributionId) {
            console.log(`🔧 API DEBUG - Fixed contribution ID for ${name}: ${contributionId} → ${correctMessageId}`);
            return `[${name} | ${preference} | ${correctMessageId}] <${content}>`;
          }

          return match;
        });

        if (correctedScript !== generatedStoryCut.ai_script) {
          console.log('🔧 API DEBUG - Script corrected with proper message IDs');
          generatedStoryCut.ai_script = correctedScript;
        } else {
          console.log('🔧 API DEBUG - No contribution ID corrections needed');
        }
      } else {
        console.log('🔧 API DEBUG - Skipping contribution ID fix (no script or quotes)');
      }

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
            generatedStoryCut.full_script = processAIScriptToEmberScriptBasic(generatedStoryCut.ai_script, selectedMedia, voiceCasting);
          } else {
            // Use full processing with ember data
            console.log('🔄 Using full processing with ember data...');
            generatedStoryCut.full_script = processAIScriptToEmberScriptAPI(generatedStoryCut.ai_script, emberData, selectedMedia, voiceCasting);
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
                .map(media => `[MEDIA | ${media.id || 'emergency'}] <name="${media.filename || media.name}">`)
                .join('\n\n');
            } else {
              console.log('🔄 Emergency fallback - no media selected, creating story without media');
              emergencyMediaElements = ''; // Empty - no media in the story
            }

            const emergencyScriptParts = [generatedStoryCut.ai_script];
            if (emergencyMediaElements) {
              emergencyScriptParts.push(emergencyMediaElements);
            }
            // Emergency script ends naturally without HOLD blocks

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
              .map(media => `[MEDIA | ${media.id || 'emergency'}] <name="${media.filename || media.name}">`)
              .join('\n\n');
          } else {
            console.log('🔄 Emergency fallback - no media selected, creating story without media');
            emergencyMediaElements = ''; // Empty - no media in the story
          }

          const emergencyScriptParts = [generatedStoryCut.ai_script];
          if (emergencyMediaElements) {
            emergencyScriptParts.push(emergencyMediaElements);
          }
          // Emergency script ends naturally without HOLD blocks

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