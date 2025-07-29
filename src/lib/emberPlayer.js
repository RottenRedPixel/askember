import { getUserVoiceModel } from '@/lib/database';
import { textToSpeech } from '@/lib/elevenlabs';
import { resolveMediaReference } from '@/lib/mediaResolvers';

/**
 * Audio engine for ember playback
 * Extracted from EmberDetail.jsx to improve maintainability
 */

// Global audio tracking for reliable stopping
let activeAudioRegistry = [];

/**
 * Register an audio object for tracking
 * @param {Audio} audio - Audio object to track
 */
const registerAudio = (audio) => {
  activeAudioRegistry.push(audio);
  console.log(`🎵 Registered audio object - Registry size: ${activeAudioRegistry.length}`);
}

/**
 * Clear all tracked audio objects
 */
const clearAudioRegistry = () => {
  console.log(`🧹 Clearing audio registry - Stopping ${activeAudioRegistry.length} audio objects`);

  activeAudioRegistry.forEach((audio, index) => {
    try {
      audio.pause();
      audio.currentTime = 0;
      audio.src = ''; // Stops ElevenLabs streaming downloads
      // Remove event listeners to prevent any delayed callbacks
      audio.onended = null;
      audio.onerror = null;
      audio.onloadeddata = null;
      audio.oncanplay = null;
      console.log(`🛑 Stopped tracked audio ${index + 1}`);
    } catch (error) {
      console.warn(`⚠️ Error stopping tracked audio ${index + 1}:`, error);
    }
  });

  activeAudioRegistry = [];
  console.log('✅ Audio registry cleared');
}

/**
 * Get voice ID with script configuration priority over story cut
 * @param {Object} segment - Segment with voice configuration
 * @param {Object} storyCut - Story cut with fallback voice IDs
 * @param {string} voiceType - 'ember' or 'narrator'
 * @returns {string|null} Voice ID or null if not found
 */
const getVoiceId = (segment, storyCut, voiceType) => {
  if (segment.voiceConfiguration && segment.voiceConfiguration[voiceType]) {
    console.log(`🎤 Using ${voiceType} voice ID from script: ${segment.voiceConfiguration[voiceType]}`);
    return segment.voiceConfiguration[voiceType];
  }

  const storyCutKey = `${voiceType}_voice_id`;
  if (storyCut[storyCutKey]) {
    console.log(`🎤 Using ${voiceType} voice ID from story cut: ${storyCut[storyCutKey]}`);
    return storyCut[storyCutKey];
  }

  return null;
};

/**
 * Handle complex contributor audio generation with preference fallbacks
 * @param {string} userPreference - User's audio preference 
 * @param {boolean} hasRecordedAudio - Whether recorded audio exists
 * @param {boolean} hasPersonalVoice - Whether personal voice model exists
 * @param {Object} audioData - Recorded audio data
 * @param {Object} userVoiceModel - User's voice model
 * @param {Object} storyCut - Story cut configuration
 * @param {string} voiceTag - Voice tag (user name)
 * @param {string} audioContent - Clean audio content
 * @param {string} content - Full content with visual actions
 * @returns {Promise<Object>} Generated audio segment
 */
const handleContributorAudioGeneration = async (userPreference, hasRecordedAudio, hasPersonalVoice, audioData, userVoiceModel, storyCut, voiceTag, audioContent, content, segment) => {
  // Decide which audio to use based on availability and preference
  if (userPreference === 'text') {
    // User wants basic text response - use narrator or ember voice for basic TTS
    console.log(`📝 ✅ Using basic text response for ${voiceTag}`);

    let fallbackVoiceId = null;
    let fallbackVoiceName = null;

    // Try script configuration first, then fallback to story cut
    fallbackVoiceId = getVoiceId(segment, storyCut, 'narrator');
    if (fallbackVoiceId) {
      fallbackVoiceName = 'narrator';
    } else {
      fallbackVoiceId = getVoiceId(segment, storyCut, 'ember');
      if (fallbackVoiceId) {
        fallbackVoiceName = 'ember';
      } else {
        throw new Error(`No voice available for text response from ${voiceTag}`);
      }
    }

    // Add speaker attribution for text response
    const attributedContent = `${voiceTag} said, ${audioContent}`;
    const audioBlob = await textToSpeech(attributedContent, fallbackVoiceId);
    const audioUrl = URL.createObjectURL(audioBlob);
    const audio = new Audio(audioUrl);
    registerAudio(audio);

    return {
      type: 'text_response',
      audio,
      url: audioUrl,
      blob: audioBlob,
      voiceTag,
      content: attributedContent, // Use attributed content
      fallbackVoice: fallbackVoiceName
    };
  } else if (userPreference === 'personal' && hasPersonalVoice) {
    // User wants personal voice model and it's available
    console.log(`🎙️ ✅ Using personal voice model for ${voiceTag} (user preference)`);
    console.log(`🎤 Personal voice ID: ${userVoiceModel.elevenlabs_voice_id}`);

    // Use the original transcribed text if this is a recorded message, otherwise use script content
    const textToSynthesize = hasRecordedAudio && audioData.message_content
      ? audioData.message_content
      : audioContent;

    console.log(`📝 Synthesizing text: "${textToSynthesize.substring(0, 50)}..." (${hasRecordedAudio ? 'from recording' : 'from script'})`);

    const audioBlob = await textToSpeech(textToSynthesize, userVoiceModel.elevenlabs_voice_id);
    const audioUrl = URL.createObjectURL(audioBlob);
    const audio = new Audio(audioUrl);
    registerAudio(audio);

    return {
      type: 'personal_voice_model',
      audio,
      url: audioUrl,
      blob: audioBlob,
      voiceTag,
      content: textToSynthesize,
      originalContent: audioContent,
      personalVoice: userVoiceModel.elevenlabs_voice_name,
      sourceType: hasRecordedAudio ? 'transcription' : 'script'
    };
  } else if (userPreference === 'recorded' && hasRecordedAudio) {
    // User wants recorded audio and it's available
    console.log(`🎙️ ✅ Using recorded audio for ${voiceTag} (user preference)`);
    console.log(`🔗 Matched with recorded: "${audioData.message_content}"`);
    console.log(`🔗 Audio URL:`, audioData.audio_url);

    const audio = new Audio(audioData.audio_url);
    registerAudio(audio);
    return {
      type: 'recorded',
      audio,
      url: audioData.audio_url,
      voiceTag,
      content: audioData.message_content || content // Use recorded content if available, fallback to script content
    };
  } else if (userPreference === 'recorded' && !hasRecordedAudio) {
    // User wants "recorded" but no recorded audio exists - fallback to text response
    console.log(`⚠️ User wanted recorded audio but none available for ${voiceTag} - falling back to text response`);

    let fallbackVoiceId = null;
    let fallbackVoiceName = null;

    // For TEXT RESPONSE fallback, ALWAYS use narrator/ember voice, never contributor's personal voice
    fallbackVoiceId = getVoiceId(segment, storyCut, 'narrator');
    if (fallbackVoiceId) {
      fallbackVoiceName = 'narrator';
    } else {
      fallbackVoiceId = getVoiceId(segment, storyCut, 'ember');
      if (fallbackVoiceId) {
        fallbackVoiceName = 'ember';
      } else {
        throw new Error(`No voice available for fallback attribution from ${voiceTag}`);
      }
    }

    // Use clean content without attribution
    const audioBlob = await textToSpeech(audioContent, fallbackVoiceId);
    const audioUrl = URL.createObjectURL(audioBlob);
    const audio = new Audio(audioUrl);
    registerAudio(audio);

    return {
      type: 'attribution_fallback',
      audio,
      url: audioUrl,
      blob: audioBlob,
      voiceTag,
      content: audioContent, // Use clean content
      fallbackVoice: fallbackVoiceName
    };
  } else if (userPreference === 'personal' && !hasPersonalVoice) {
    // User wants personal voice but none available - fallback to text response
    console.log(`⚠️ User wanted personal voice but none available for ${voiceTag} - falling back to text response`);
    console.log(`⚠️ Voice model check failed:`, {
      userVoiceModel,
      hasPersonalVoice,
      elevenlabs_voice_id: userVoiceModel?.elevenlabs_voice_id
    });

    let fallbackVoiceId = null;
    let fallbackVoiceName = null;

    if (storyCut.narrator_voice_id) {
      fallbackVoiceId = storyCut.narrator_voice_id;
      fallbackVoiceName = 'narrator';
      console.log(`🎤 Using narrator voice for text response fallback`);
    } else if (storyCut.ember_voice_id) {
      fallbackVoiceId = storyCut.ember_voice_id;
      fallbackVoiceName = 'ember';
      console.log(`🎤 Using ember voice for text response fallback`);
    } else {
      throw new Error(`No voice available for text response fallback from ${voiceTag}`);
    }

    // Add speaker attribution for text response fallback
    const attributedContent = `${voiceTag} said, ${audioContent}`;
    const audioBlob = await textToSpeech(attributedContent, fallbackVoiceId);
    const audioUrl = URL.createObjectURL(audioBlob);
    const audio = new Audio(audioUrl);
    registerAudio(audio);

    return {
      type: 'text_response_fallback',
      audio,
      url: audioUrl,
      blob: audioBlob,
      voiceTag,
      content: attributedContent, // Use attributed content
      fallbackVoice: fallbackVoiceName
    };
  } else {
    // Final fallback - respect user preference even when falling back
    console.log(`🔄 Using final fallback logic for ${voiceTag}, preference: ${userPreference}`);

    if (userPreference === 'text') {
      // User wants text response - ALWAYS use narrator/ember voice with attribution
      console.log(`📝 ✅ Using text response (final fallback, user preference)`);

      let fallbackVoiceId = null;
      let fallbackVoiceName = null;

      if (storyCut.narrator_voice_id) {
        fallbackVoiceId = storyCut.narrator_voice_id;
        fallbackVoiceName = 'narrator';
      } else if (storyCut.ember_voice_id) {
        fallbackVoiceId = storyCut.ember_voice_id;
        fallbackVoiceName = 'ember';
      } else {
        throw new Error(`No voice available for text response fallback from ${voiceTag}`);
      }

      // Add speaker attribution for text response
      const attributedContent = `${voiceTag} said, ${audioContent}`;
      const audioBlob = await textToSpeech(attributedContent, fallbackVoiceId);
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      registerAudio(audio);

      return {
        type: 'text_response',
        audio,
        url: audioUrl,
        blob: audioBlob,
        voiceTag,
        content: attributedContent, // Use attributed content
        fallbackVoice: fallbackVoiceName
      };
    } else if (userPreference === 'recorded' && hasRecordedAudio) {
      console.log(`🎙️ ✅ Using recorded audio (final fallback)`);
      const audio = new Audio(audioData.audio_url);
      registerAudio(audio);
      return {
        type: 'recorded',
        audio,
        url: audioData.audio_url,
        voiceTag,
        content: audioData.message_content || content // Use recorded content if available, fallback to script content
      };
    } else if (userPreference === 'personal' && hasPersonalVoice) {
      console.log(`🎤 ✅ Using personal voice model (final fallback)`);

      // Use the original transcribed text if this is a recorded message, otherwise use script content
      const textToSynthesize = hasRecordedAudio && audioData.message_content
        ? audioData.message_content
        : content;

      console.log(`📝 Synthesizing text (final fallback): "${textToSynthesize.substring(0, 50)}..." (${hasRecordedAudio ? 'from recording' : 'from script'})`);

      const audioBlob = await textToSpeech(textToSynthesize, userVoiceModel.elevenlabs_voice_id);
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      registerAudio(audio);

      return {
        type: 'personal_voice_model',
        audio,
        url: audioUrl,
        blob: audioBlob,
        voiceTag,
        content: textToSynthesize,
        originalContent: content,
        personalVoice: userVoiceModel.elevenlabs_voice_name,
        sourceType: hasRecordedAudio ? 'transcription' : 'script'
      };
    } else {
      // Ultimate fallback when preference can't be satisfied - use narrator/ember voice
      console.log(`📝 ✅ Using text response (ultimate fallback - preference not available)`);

      let fallbackVoiceId = null;
      let fallbackVoiceName = null;

      if (storyCut.narrator_voice_id) {
        fallbackVoiceId = storyCut.narrator_voice_id;
        fallbackVoiceName = 'narrator';
      } else if (storyCut.ember_voice_id) {
        fallbackVoiceId = storyCut.ember_voice_id;
        fallbackVoiceName = 'ember';
      } else {
        throw new Error(`No voice available for ultimate fallback from ${voiceTag}`);
      }

      // Use clean content without attribution
      const audioBlob = await textToSpeech(audioContent, fallbackVoiceId);
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      registerAudio(audio);

      return {
        type: 'ultimate_fallback',
        audio,
        url: audioUrl,
        blob: audioBlob,
        voiceTag,
        content: audioContent, // Use clean content
        fallbackVoice: fallbackVoiceName
      };
    }
  }
};

/**
 * Debug helper to inspect recorded audio data and block matching
 * @param {Object} recordedAudio - Available recorded audio data
 * @param {Array} blocks - JSON blocks to analyze
 */
export const debugRecordedAudio = (recordedAudio, blocks) => {
  console.log('🐛 ===== RECORDED AUDIO DEBUG REPORT =====');
  console.log('🎙️ Available recorded audio:');
  Object.entries(recordedAudio).forEach(([userId, audioData]) => {
    console.log(`  📤 User ${userId}:`);
    console.log(`    - Name: "${audioData.user_first_name}"`);
    console.log(`    - Message: "${audioData.message_content}"`);
    console.log(`    - Audio URL: ${audioData.audio_url ? '✅ EXISTS' : '❌ MISSING'}`);
    console.log(`    - Duration: ${audioData.audio_duration_seconds}s`);
  });

  console.log('\n📝 Blocks requiring recorded audio:');
  blocks.filter(seg =>
    seg.type === 'contributor' ||
    (seg.type === 'voice' && seg.speaker && seg.speaker !== 'EMBER VOICE' && seg.speaker !== 'NARRATOR')
  ).forEach((segment, index) => {
    // ✅ FIXED: Use standard AI field names
    const segmentVoiceTag = segment.speaker || 'Unknown';

    console.log(`  📋 Segment ${index + 1}:`);
    console.log(`    - Voice Tag: "${segmentVoiceTag}"`);
    console.log(`    - Content: "${segment.content}"`);
    console.log(`    - Type: ${segment.type}`);
    console.log(`    - Speaker: ${segment.speaker || 'NONE'}`);
    console.log(`    - Message ID: ${segment.message_id || 'NONE'}`);
    console.log(`    - User ID: ${segment.user_id || 'NONE'}`);
    console.log(`    - Voice Preference: ${segment.voice_preference || 'NONE'}`);

    // Check for matches
    const matches = Object.entries(recordedAudio).filter(([userId, audioData]) => {
      const nameMatches = audioData.user_first_name === segmentVoiceTag;
      const recordedContent = audioData.message_content?.toLowerCase() || '';
      const segmentContent = segment.content.toLowerCase();
      const contentMatches = recordedContent === segmentContent ||
        recordedContent.includes(segmentContent) ||
        segmentContent.includes(recordedContent);
      return nameMatches && contentMatches;
    });

    if (matches.length > 0) {
      console.log(`    - 🎙️ MATCH FOUND: User ${matches[0][0]} (${matches[0][1].user_first_name})`);
    } else {
      console.log(`    - ❌ NO MATCH`);
      console.log(`    - Available names: ${Object.values(recordedAudio).map(a => a.user_first_name).join(', ')}`);

      // Check for personal voice model as fallback
      const nameMatches = Object.entries(recordedAudio).filter(([userId, audioData]) => {
        return audioData.user_first_name === segmentVoiceTag;
      });

      if (nameMatches.length > 0) {
        const [userId] = nameMatches[0];
        getUserVoiceModel(userId).then(voiceModel => {
          if (voiceModel && voiceModel.elevenlabs_voice_id) {
            console.log(`    - 🎤 Personal Voice Model Available: ${voiceModel.elevenlabs_voice_name}`);
          } else {
            console.log(`    - 🎤 No personal voice model available`);
          }
        }).catch(err => {
          console.log(`    - ⚠️ Error checking voice model: ${err.message}`);
        });
      }
    }
  });
  console.log('🐛 ===== END DEBUG REPORT =====');
};

/**
 * Generate audio for a single voice segment with complex preference handling
 * @param {Object} segment - Voice segment with content and metadata
 * @param {Object} storyCut - Story cut configuration with voice IDs
 * @param {Object} recordedAudio - Available recorded audio data
 * @returns {Promise<Object>} Audio segment with metadata
 */
export const generateSegmentAudio = async (segment, storyCut, recordedAudio) => {
  // ✅ FIXED: Use standard AI field names from JSON blocks
  const { speaker, content, originalContent, type, message_id, user_id, voice_preference } = segment;

  // ✅ ENHANCED: Derive actual voice type for backward compatibility  
  let actualVoiceType = type;
  let actualVoiceTag = speaker || 'Unknown Voice'; // Use speaker field directly

  // Check for explicit voiceType first (for demo blocks and modern blocks)
  if (segment.voiceType) {
    actualVoiceType = segment.voiceType;
    actualVoiceTag = speaker || segment.voiceTag || actualVoiceTag;
    console.log(`🎯 Using explicit voiceType: ${segment.voiceType} for "${actualVoiceTag}"`);
  } else if (type === 'voice' && speaker) {
    // For legacy type 'voice' blocks, derive the actual type from speaker
    if (speaker === 'EMBER VOICE') {
      actualVoiceType = 'ember';
      actualVoiceTag = 'Ember Voice';
    } else if (speaker === 'NARRATOR') {
      actualVoiceType = 'narrator';
      actualVoiceTag = 'Narrator';
    } else {
      actualVoiceType = 'contributor';
      actualVoiceTag = speaker;
    }
    console.log(`🔄 Derived voice type: ${type} + speaker "${speaker}" → ${actualVoiceType}`);
  }

  // Use originalContent for audio synthesis, content for display/matching
  const rawAudioContent = originalContent || content;

  // Clean content for TTS: remove visual actions and voice tags
  const audioContent = rawAudioContent
    .replace(/<[^>]+>/g, '') // Remove visual actions like <COLOR:#FF0000,TRAN:0.2>
    .replace(/^\[.*?\]\s*/, '') // Remove voice tags like [NARRATOR] or [EMBER VOICE]
    .trim();

  try {
    if (actualVoiceType === 'contributor') {
      // Check per-message preference for this content FIRST
      let userPreference = 'recorded'; // default
      let foundStudioPreference = false;

      // PRIORITY 1: Check if preference is embedded in script segment (from JSON blocks or sacred format)
      const segmentPreference = voice_preference || segment.preference;
      if (segmentPreference) {
        // Convert script preference format to audio generation format
        if (segmentPreference === 'synth') {
          userPreference = 'personal';
        } else if (segmentPreference === 'recorded') {
          userPreference = 'recorded';
        } else if (segmentPreference === 'text') {
          userPreference = 'text';
        }
        foundStudioPreference = true;
        console.log(`🎯 ✅ Using ${voice_preference ? 'JSON blocks' : segment.format || 'embedded'} script preference: ${segmentPreference} → ${userPreference}`);
      } else {
        console.log(`🎯 ❌ No embedded preference found in segment`);
        console.log(`🎯 ❌ Full segment data:`, {
          voiceTag: segment.voiceTag,
          content: segment.content.substring(0, 50) + '...',
          originalContent: segment.originalContent?.substring(0, 50) + '...',
          type: segment.type,
          preference: segment.preference,
          format: segment.format
        });
      }

      // Fallback to detailed message preferences if no studio preference found
      if (!foundStudioPreference && window.messageAudioPreferences) {
        // Strategy 1: Try to find exact content match
        const matchingKey = Object.keys(window.messageAudioPreferences).find(key => {
          const keyContent = key.split('-').slice(1).join('-'); // Remove messageIndex prefix
          return keyContent === audioContent.substring(0, 50) || audioContent.includes(keyContent);
        });

        if (matchingKey) {
          userPreference = window.messageAudioPreferences[matchingKey];
          console.log(`🎯 Found preference match: "${matchingKey}" → ${userPreference}`);
        } else {
          // Strategy 2: Try partial content matching
          const partialMatch = Object.keys(window.messageAudioPreferences).find(key => {
            const keyContent = key.split('-').slice(1).join('-');
            return keyContent.length > 10 && audioContent.includes(keyContent);
          });

          if (partialMatch) {
            userPreference = window.messageAudioPreferences[partialMatch];
            console.log(`🎯 Found partial preference match: "${partialMatch}" → ${userPreference}`);
          } else {
            console.log(`⚠️ No preference match found for content: "${audioContent.substring(0, 50)}..."`);
            console.log(`⚠️ Available preferences:`, Object.keys(window.messageAudioPreferences));
          }
        }
      }

      console.log(`🎤 User preference for "${audioContent.substring(0, 30)}...": ${userPreference}`);
      console.log(`🔍 All available preferences:`, window.messageAudioPreferences);

      // Only look for recorded audio if user preference is 'recorded'
      if (userPreference === 'recorded') {
        // ✅ FIXED: Use standard AI field message_id for direct matching
        if (message_id && storyCut.metadata?.messageIdMap) {
          const messageData = storyCut.metadata.messageIdMap[message_id];

          if (messageData) {
            console.log(`🆔 DIRECT MESSAGE ID MATCH: Using message_id ${message_id}`);
            console.log(`🆔 Message data:`, messageData);

            // Check if we have recorded audio for this message
            const hasRecordedAudio = !!(messageData.audio_url);

            if (hasRecordedAudio) {
              console.log(`🎯 RECORDED AUDIO FOUND via message_id: Using recorded audio`);
              console.log(`🎯 Audio URL: ${messageData.audio_url}`);
              console.log(`🎯 Content: "${messageData.content}"`);

              const audio = new Audio(messageData.audio_url);
              registerAudio(audio);
              return {
                type: 'contributor_recorded',
                audio,
                url: messageData.audio_url,
                voiceTag: actualVoiceTag,
                content: messageData.content,
                userId: messageData.user_id,
                messageId: message_id,
                source: 'ai_generated_block'
              };
            } else {
              console.log(`⚠️ Message ID found but no recorded audio - using fallback`);
            }
          } else {
            console.log(`⚠️ Message ID ${message_id} not found in messageIdMap`);
            console.log(`⚠️ Available message IDs:`, Object.keys(storyCut.metadata?.messageIdMap || {}));
          }
        } else if (message_id) {
          console.log(`⚠️ Message ID ${message_id} found but no messageIdMap in story cut metadata`);
        } else {
          console.log(`ℹ️ No message_id in segment - using traditional matching`);
        }
      }

      // Use the existing sophisticated contributor audio generation logic
      console.log(`🎯 Using handleContributorAudioGeneration with preference: ${userPreference}`);

      // Check for personal voice model
      let hasPersonalVoice = false;
      let userVoiceModel = null;

      // ✅ FIXED: Use user_id from AI block instead of trying to derive it
      let userId = user_id; // Direct from AI block

      // Fallback: try to get user ID from messageIdMap if not in block
      if (!userId && message_id && storyCut.metadata?.messageIdMap) {
        const messageData = storyCut.metadata.messageIdMap[message_id];
        if (messageData && messageData.user_id) {
          userId = messageData.user_id;
        }
      }

      // Look up voice model if we have a user ID
      if (userId) {
        try {
          userVoiceModel = await getUserVoiceModel(userId);
          hasPersonalVoice = !!(userVoiceModel && userVoiceModel.elevenlabs_voice_id);

          if (hasPersonalVoice) {
            console.log(`🎤 Found personal voice model for ${actualVoiceTag}:`, {
              userId,
              voiceId: userVoiceModel.elevenlabs_voice_id,
              voiceName: userVoiceModel.elevenlabs_voice_name
            });
          } else {
            console.log(`⚠️ No personal voice model found for ${actualVoiceTag} (userId: ${userId})`);
          }
        } catch (error) {
          console.error(`❌ Error looking up voice model for ${actualVoiceTag}:`, error);
          hasPersonalVoice = false;
          userVoiceModel = null;
        }
      } else {
        console.log(`⚠️ No user ID found for ${actualVoiceTag} - cannot check for personal voice model`);
      }

      // Get recorded audio data if available (for handleContributorAudioGeneration)
      let audioData = null;
      let hasRecordedAudio = false;

      if (message_id && storyCut.metadata?.messageIdMap) {
        const messageData = storyCut.metadata.messageIdMap[message_id];
        if (messageData && messageData.audio_url) {
          audioData = messageData;
          hasRecordedAudio = true;
          console.log(`🎙️ Found recorded audio for message ${message_id}`);
        }
      }

      // Call the sophisticated contributor audio generation function
      return await handleContributorAudioGeneration(
        userPreference,
        hasRecordedAudio,
        hasPersonalVoice,
        audioData,
        userVoiceModel,
        storyCut,
        actualVoiceTag,
        audioContent,
        content,
        segment
      );
    } else if (actualVoiceType === 'demo') {
      // DEMO VOICE - Handle demo contributions with recorded audio
      console.log(`🎯 Generating DEMO voice audio for: "${actualVoiceTag}"`);

      // DEBUG: Log the entire segment structure for demo blocks
      console.log(`🔍 DEMO DEBUG - Full segment structure:`, {
        id: segment.id,
        type: segment.type,
        voiceType: segment.voiceType,
        speaker: segment.speaker,
        voiceTag: segment.voiceTag,
        demoData: segment.demoData,
        preference: segment.preference,
        voice_preference: segment.voice_preference,
        hasDemo: !!segment.demoData,
        demoKeys: segment.demoData ? Object.keys(segment.demoData) : 'NONE'
      });

      // Get user preference from voice_preference field
      const segmentPreference = voice_preference || segment.preference;
      let userPreference = 'text'; // default for demo

      if (segmentPreference) {
        userPreference = segmentPreference; // recorded, synth, or text
        console.log(`🎯 Demo preference from segment: ${segmentPreference}`);
      } else if (window.messageAudioPreferences) {
        // Check for UI preferences
        const blockKey = `${actualVoiceTag}-${segment.id}`;
        if (window.messageAudioPreferences[blockKey]) {
          userPreference = window.messageAudioPreferences[blockKey];
          console.log(`🎯 Demo preference from UI: ${userPreference}`);
        }
      }

      // Check if demo has recorded audio
      const demoData = segment.demoData;
      const hasRecordedAudio = !!(demoData && demoData.recordedAudioUrl);

      console.log(`🔍 DEMO DEBUG - Audio check:`, {
        hasDemoData: !!demoData,
        hasRecordedAudio,
        recordedAudioUrl: demoData?.recordedAudioUrl,
        userPreference
      });

      if (userPreference === 'recorded' && hasRecordedAudio) {
        // Use the actual recorded audio from demo contribution
        console.log(`🎙️ ✅ Using recorded audio for demo: ${actualVoiceTag}`);
        console.log(`🔗 Demo audio URL:`, demoData.recordedAudioUrl);

        const audio = new Audio(demoData.recordedAudioUrl);
        registerAudio(audio);
        return {
          type: 'demo_recorded',
          audio,
          url: demoData.recordedAudioUrl,
          voiceTag: actualVoiceTag,
          content: audioContent
        };
      } else if (userPreference === 'synth' && demoData?.elevenlabsVoiceId) {
        // Use ElevenLabs voice synthesis for demo
        console.log(`🎤 ✅ Using ElevenLabs voice for demo: ${actualVoiceTag}`);
        console.log(`🔗 Voice ID:`, demoData.elevenlabsVoiceId);

        const audioBlob = await textToSpeech(audioContent, demoData.elevenlabsVoiceId);
        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);
        registerAudio(audio);

        return {
          type: 'demo_synth',
          audio,
          url: audioUrl,
          blob: audioBlob,
          voiceTag: actualVoiceTag,
          content: audioContent,
          voiceModel: demoData.elevenlabsVoiceName
        };
      } else {
        // Fallback to narrator voice for text display with attribution
        console.log(`📝 Using narrator voice for demo text: ${actualVoiceTag}`);

        const voiceId = getVoiceId(segment, storyCut, 'narrator');
        if (!voiceId) {
          throw new Error('No narrator voice ID configured for demo fallback');
        }

        // ✅ Format demo text with attribution like Story Circle contributions
        const demoFirstName = demoData?.firstName || actualVoiceTag;
        const attributedContent = `${demoFirstName} said, "${audioContent}"`;
        console.log(`📝 Demo text with attribution: "${attributedContent}"`);

        const audioBlob = await textToSpeech(attributedContent, voiceId);
        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);
        registerAudio(audio);

        return {
          type: 'demo_text_fallback',
          audio,
          url: audioUrl,
          blob: audioBlob,
          voiceTag: actualVoiceTag,
          content: attributedContent, // Show attributed content
          originalContent: audioContent, // Keep original for reference
          fallbackVoice: 'narrator'
        };
      }
    } else if (actualVoiceType === 'ember') {
      // EMBER VOICE
      console.log(`🔥 Generating EMBER voice audio: "${audioContent}"`);

      const voiceId = getVoiceId(segment, storyCut, 'ember');
      if (!voiceId) {
        throw new Error('No ember voice ID configured for this story cut');
      }

      const audioBlob = await textToSpeech(audioContent, voiceId);
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      registerAudio(audio);

      return {
        type: 'ember',
        audio,
        url: audioUrl,
        blob: audioBlob,
        voiceTag: actualVoiceTag,
        content: audioContent
      };
    } else if (actualVoiceType === 'narrator') {
      // NARRATOR VOICE
      console.log(`🗣️ Generating NARRATOR voice audio: "${audioContent}"`);

      const voiceId = getVoiceId(segment, storyCut, 'narrator');
      if (!voiceId) {
        throw new Error('No narrator voice ID configured for this story cut');
      }

      const audioBlob = await textToSpeech(audioContent, voiceId);
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      registerAudio(audio);

      return {
        type: 'narrator',
        audio,
        url: audioUrl,
        blob: audioBlob,
        voiceTag: actualVoiceTag,
        content: audioContent
      };
    } else {
      throw new Error(`Unsupported voice type: ${actualVoiceType} (original: ${type})`);
    }
  } catch (error) {
    console.error(`❌ Error generating audio for [${actualVoiceTag}]:`, error);
    throw error;
  }
};

/**
 * Play multiple audio blocks sequentially with visual effects
 * @param {Array} blocks - Audio blocks to play
 * @param {Object} storyCut - Story cut configuration
 * @param {Object} recordedAudio - Available recorded audio data
 * @param {Object} stateSetters - React state setters for visual effects
 * @param {Object} ember - Ember data for media resolution
 * @returns {Promise<void>}
 */
export const playMultiVoiceAudio = async (blocks, storyCut, recordedAudio, stateSetters, ember) => {
  const {
    setIsGeneratingAudio,
    setIsPlaying,
    handleExitPlay,
    handlePlaybackComplete,
    setActiveAudioSegments,
    playbackStoppedRef,
    setCurrentVoiceType,
    setCurrentVoiceTransparency,
    setCurrentMediaColor,
    setCurrentZoomScale,
    setCurrentMediaImageUrl,
    // 🎯 Loading screen state setters
    setCurrentLoadingState,
    setCurrentLoadingMessage,
    setCurrentLoadingIcon,
    setLoadingSubSteps,
    // 🎯 Visual effects state setters
    setCurrentFadeEffect,
    setCurrentPanEffect,
    setCurrentZoomEffect,
    // 🎯 Sentence-by-sentence display state setters
    setCurrentDisplayText,
    setCurrentVoiceTag,
    setCurrentSentenceIndex,
    setCurrentSegmentSentences,
    setSentenceTimeouts,
    sentenceTimeouts,
    // 🎯 Media timeout management
    setMediaTimeouts,
    mediaTimeouts,
    mediaTimeoutsRef,
    // 🎯 Progress tracking
    updateProgress,
    startSmoothProgress,
    stopSmoothProgress
  } = stateSetters;

  // Validate blocks input
  if (!blocks || !Array.isArray(blocks)) {
    console.error('❌ Invalid blocks input - expected array:', blocks);
    throw new Error('playMultiVoiceAudio requires blocks to be an array');
  }

  console.log('🎭 Starting multi-voice playback with', blocks.length, 'blocks');

  // ✅ ENHANCED: Convert demo_data to demoData for blocks loaded directly from database
  const processedBlocks = blocks.map(block => {
    if (block.type === 'voice' && block.voiceType === 'demo' && block.demo_data && !block.demoData) {
      console.log('🔄 Converting demo_data to demoData for:', block.speaker);
      return {
        ...block,
        demoData: block.demo_data,
        // Keep demo_data for backward compatibility
        demo_data: block.demo_data
      };
    }
    return block;
  });

  // Use processed blocks for the rest of the function
  blocks = processedBlocks;

  // Clear any previous audio registry to start fresh
  clearAudioRegistry();

  // 🐛 DEBUG: Run debug helper to analyze recorded audio matching
  debugRecordedAudio(recordedAudio, blocks);

  // ✅ DEBUG: Inspect block structure to understand voice detection issue
  console.log('🔍 DEBUG: Block structure analysis:');
  blocks.forEach((block, index) => {
    console.log(`  Block ${index + 1}:`, {
      type: block.type,
      voiceType: block.voiceType,
      speaker: block.speaker,
      voiceTag: block.voiceTag,
      hasVoiceType: !!block.voiceType,
      isVoiceBlock: block.type === 'voice',
      matchesDetection: (block.type === 'ember' || block.type === 'narrator' || block.type === 'contributor' || (block.type === 'voice' && block.voiceType))
    });
  });

  // Reset playback flag
  playbackStoppedRef.current = false;

  try {
    // ✅ ENHANCED: Separate media/loadscreen and voice blocks using enriched JSON
    const mediaBlocks = blocks.filter(block => block.type === 'media' || block.type === 'loadscreen');

    // Check both old format (type: 'ember'/'narrator'/'contributor') AND new format (type: 'voice' with voiceType)
    const voiceBlocks = blocks.filter(block => {
      // Old format: direct type matching
      if (block.type === 'ember' || block.type === 'narrator' || block.type === 'contributor') {
        return true;
      }

      // New format: type 'voice' with voiceType field
      if (block.type === 'voice' && block.voiceType) {
        return true;
      }

      // ✅ ENHANCED: Fallback for AI-generated blocks that have type 'voice' but missing voiceType
      if (block.type === 'voice' && block.speaker) {
        // Derive voiceType from speaker name for backward compatibility
        if (block.speaker === 'EMBER VOICE') return true;
        if (block.speaker === 'NARRATOR') return true;
        // Any other speaker is a contributor
        return true;
      }

      return false;
    });

    console.log(`🎭 Block breakdown: ${blocks.length} total → ${mediaBlocks.length} media/loadscreen + ${voiceBlocks.length} voice`);

    // Generate audio for voice blocks only
    console.log('⏳ Generating audio for voice blocks...');
    const audioSegments = [];
    for (let i = 0; i < voiceBlocks.length; i++) {
      const block = voiceBlocks[i];
      console.log(`🔧 Generating block ${i + 1}/${voiceBlocks.length}: [${block.voiceTag}] "${block.originalContent || block.content}"`);

      try {
        const audioSegment = await generateSegmentAudio(block, storyCut, recordedAudio);
        audioSegments.push(audioSegment);
        console.log(`✅ Generated block ${i + 1}: [${block.voiceTag}]`);
      } catch (segmentError) {
        console.error(`❌ Failed to generate block ${i + 1} [${block.voiceTag}]:`, segmentError);
        console.error(`❌ Block content: "${block.originalContent || block.content}"`);
        console.error(`❌ Block type: ${block.type}`);

        // Instead of throwing, push null to maintain index alignment
        audioSegments.push(null);
        console.warn(`⚠️ Skipping block ${i + 1} [${block.voiceTag}] due to audio generation failure`);
      }
    }

    // Create unified timeline with media effects and voice audio
    const timeline = [];
    let lastBlockIndex = -1; // Track which block we're currently processing

    console.log('🎬 Building unified timeline...');
    for (let index = 0; index < blocks.length; index++) {
      const block = blocks[index];

      // ✅ FIXED: Get voice tag from speaker field (standard AI field name)
      const voiceTag = block.speaker || 'Unknown Voice';

      if (block.type === 'loadscreen') {
        // Load screen block - add to timeline for sequential processing
        timeline.push({
          type: 'loadscreen',
          block: block,
          blockIndex: index, // Add block index for progress tracking
          message: block.loadMessage || 'Loading...',
          duration: parseFloat(block.loadDuration || 2.0),
          icon: block.loadIcon || 'default'
        });
        console.log(`📱 Timeline ${index + 1}: LOAD SCREEN for ${block.loadDuration || 2.0}s - ${block.loadMessage || 'Loading...'}...`);
      } else if (block.type === 'media') {
        // Media block - add to timeline for sequential processing
        timeline.push({
          type: 'media',
          block: block,
          blockIndex: index // Add block index for progress tracking
        });
        console.log(`📺 Timeline ${index + 1}: MEDIA switch - ${(block.content || block.media_name || 'Media').substring(0, 50)}...`);
      } else if (block.type === 'ember' || block.type === 'narrator' || block.type === 'contributor' ||
        (block.type === 'voice' && block.voiceType) ||
        (block.type === 'voice' && block.speaker)) {
        // ✅ ENHANCED: Voice block - handle both old and new formats

        // Get voice type from enriched JSON or fallback to old format or derive from speaker
        let voiceType = block.voiceType || block.type; // New format has voiceType, old format uses type directly

        // ✅ ENHANCED: For backward compatibility with AI-generated blocks
        if (block.type === 'voice' && !block.voiceType && block.speaker) {
          if (block.speaker === 'EMBER VOICE') {
            voiceType = 'ember';
          } else if (block.speaker === 'NARRATOR') {
            voiceType = 'narrator';
          } else {
            voiceType = 'contributor';
          }
        }

        // Voice block - find corresponding audio by index instead of voiceTag to prevent repetition
        const audioSegment = audioSegments[lastBlockIndex + 1];
        lastBlockIndex++;

        timeline.push({
          type: 'voice',
          block: block,
          blockIndex: index, // Add block index for progress tracking
          audio: audioSegment,
          // ✅ ENHANCED: Include enriched metadata for easy access
          voiceTag: voiceTag,
          voiceType: voiceType
        });
        console.log(`🎤 Timeline ${index + 1}: VOICE audio - [${voiceTag}] (${voiceType})`);
      }
    }

    console.log('✅ Generated', audioSegments.length, 'audio segments');
    console.log('🎬 Starting unified timeline playback...');
    console.log(`🎭 Timeline has ${timeline.length} sequential steps`);

    // Initialize loading state for the first segment
    setCurrentLoadingState(false);
    setIsGeneratingAudio(false);
    setIsPlaying(true);

    // Mark final sub-step as completed now that timeline is starting
    if (setLoadingSubSteps) {
      setLoadingSubSteps([
        { text: 'Audio Ready', status: 'current' }
      ]);
    }

    // Use imperative playback approach with nested callbacks
    // This ensures proper sequential timing and visual effect coordination
    // No background media processing - MEDIA elements are now in timeline

    let currentTimelineIndex = 0;
    let currentBlockIndex = -1; // Track which block we're currently processing (start at -1 so first block triggers update)
    let pendingEffects = null; // Store visual effects to apply when next audio starts
    let pendingMediaUrl = null; // Store media URL to apply when next audio starts

    const playNextTimelineStep = () => {
      if (playbackStoppedRef.current || currentTimelineIndex >= timeline.length) {
        if (playbackStoppedRef.current) {
          console.log('🛑 Timeline playback stopped');
          // Stop any smooth progress tracking
          if (stopSmoothProgress) {
            stopSmoothProgress();
          }
        } else {
          // All timeline steps finished or playback was stopped
          console.log('🎬 Timeline playback complete');

          // Reset media state to default
          setCurrentMediaColor(null);
          setCurrentZoomScale({ start: 1.0, end: 1.0 }); // Reset to default
          setCurrentMediaImageUrl(null); // Reset to default ember image
          handlePlaybackComplete();
        }
        return;
      }

      const currentStep = timeline[currentTimelineIndex];
      console.log(`🎬 Timeline step ${currentTimelineIndex + 1}/${timeline.length}: ${currentStep.type} - [${currentStep.voiceTag || currentStep.block?.voiceTag || currentStep.block?.speaker || 'Unknown'}]`);

      // Update progress tracking only when we start a new block
      let currentBlockStartTime = 0;
      if (currentStep.blockIndex !== undefined && currentStep.blockIndex !== currentBlockIndex) {
        currentBlockIndex = currentStep.blockIndex;

        // Calculate elapsed time from completed blocks
        for (let i = 0; i < currentBlockIndex && i < blocks.length; i++) {
          const block = blocks[i];
          if (block.type === 'loadscreen') {
            currentBlockStartTime += parseFloat(block.loadDuration || 2.0);
          } else if (block.type === 'media') {
            currentBlockStartTime += 2.0;
          } else if (block.type === 'voice') {
            // ✅ FIXED: Handle AI-generated voice blocks
            const cleanContent = block.content.replace(/<[^>]+>/g, '').trim();
            const estimatedDuration = Math.max(1, cleanContent.length * 0.08);
            currentBlockStartTime += estimatedDuration;
          } else if (block.type === 'ember' || block.type === 'narrator' || block.type === 'contributor') {
            // Legacy format compatibility
            const cleanContent = block.content.replace(/<[^>]+>/g, '').trim();
            const estimatedDuration = Math.max(1, cleanContent.length * 0.08);
            currentBlockStartTime += estimatedDuration;
          }
        }

        if (updateProgress) {
          updateProgress(currentBlockIndex, blocks);
        }
      }

      if (currentStep.type === 'loadscreen') {
        // Load screen step - display loading UI for specified duration
        const block = currentStep.block;
        const duration = currentStep.duration;

        console.log(`⏳ Load screen step: ${duration}s - "${block.loadMessage}"`);

        // Set loading state with message and icon
        setCurrentLoadingMessage(block.loadMessage);
        setCurrentLoadingIcon(block.loadIcon);
        setCurrentLoadingState(true);

        // Clear any background image/color and voice
        setCurrentMediaImageUrl(null);
        setCurrentMediaColor(null);
        setCurrentVoiceType(null);

        // Wait for the specified duration, then continue to next step
        const timeoutId = setTimeout(() => {
          if (!playbackStoppedRef.current) {
            // Clear loading state
            setCurrentLoadingState(false);
            setCurrentLoadingMessage('');
            setCurrentLoadingIcon('default');

            currentTimelineIndex++;
            playNextTimelineStep();
          }
        }, duration * 1000);

        // Track timeout for cleanup
        setMediaTimeouts(prev => [...prev, timeoutId]);
        mediaTimeoutsRef.current.push(timeoutId);

      } else if (currentStep.type === 'media') {
        // Media step - store effects and media URL to apply when next audio starts
        const block = currentStep.block;

        console.log(`📺 Preparing media effects (sync with next audio): ${(block.content || block.media_name || 'Media').substring(0, 50)}...`);

        // Resolve the media reference to get the actual image URL
        resolveMediaReference(block, ember.id).then(resolvedMediaUrl => {
          console.log(`🔍 Resolved media URL for sync: "${block.media_url || block.media_name || block.media_id}":`, resolvedMediaUrl);

          if (resolvedMediaUrl) {
            // Store effects and media URL for synchronized application
            const effects = block.effects || {};
            pendingEffects = {
              fade: effects.fade || null,
              pan: effects.pan || null,
              zoom: effects.zoom || null
            };
            pendingMediaUrl = resolvedMediaUrl;

            console.log(`🎬 Stored pending effects for sync:`, pendingEffects);
            console.log(`📺 Stored pending media URL for sync:`, pendingMediaUrl);
          } else {
            console.warn(`⚠️ Could not resolve media reference for sync: ${block.media_url || block.media_name || block.media_id}`);
            // Clear pending effects if media resolution fails
            pendingEffects = null;
            pendingMediaUrl = null;
          }

          // Continue immediately to next timeline step (media preparation is instant)
          currentTimelineIndex++;
          playNextTimelineStep();
        }).catch(error => {
          console.error('❌ Error resolving media reference for sync:', error);
          // Clear pending effects on error
          pendingEffects = null;
          pendingMediaUrl = null;
          // Continue anyway
          currentTimelineIndex++;
          playNextTimelineStep();
        });

      } else if (currentStep.type === 'voice') {
        // Voice step - apply pending visual effects when audio starts, then play audio
        if (!currentStep.audio || !currentStep.audio.audio) {
          console.error(`❌ No audio available for voice block [${currentStep.voiceTag || currentStep.block?.voiceTag || currentStep.block?.speaker || 'Unknown Voice'}] - skipping`);
          currentTimelineIndex++;
          playNextTimelineStep();
          return;
        }

        const audio = currentStep.audio.audio;
        const block = currentStep.block;

        console.log(`▶️ Playing voice block with synchronized effects: [${block.voiceTag}]`);

        // 🎯 SYNCHRONIZED: Apply pending visual effects when audio starts
        if (pendingEffects || pendingMediaUrl) {
          console.log(`🎬 Applying synchronized visual effects and media`);

          if (pendingEffects) {
            // Apply visual effects synchronized with audio start
            setCurrentFadeEffect(pendingEffects.fade);
            setCurrentPanEffect(pendingEffects.pan);
            setCurrentZoomEffect(pendingEffects.zoom);

            // Log effects for debugging
            if (pendingEffects.fade) {
              console.log(`🎬 Synchronized fade effect: ${pendingEffects.fade.type} - ${pendingEffects.fade.duration}s`);
            }
            if (pendingEffects.pan) {
              console.log(`🎬 Synchronized pan effect: ${pendingEffects.pan.startPosition}% → ${pendingEffects.pan.endPosition}% over ${pendingEffects.pan.duration}s`);
            }
            if (pendingEffects.zoom) {
              console.log(`🎬 Synchronized zoom effect: ${pendingEffects.zoom.startScale}x → ${pendingEffects.zoom.endScale}x over ${pendingEffects.zoom.duration}s`);
            }
          }

          if (pendingMediaUrl) {
            // Apply media URL synchronized with audio start
            setCurrentMediaImageUrl(pendingMediaUrl);
            console.log(`📺 Applied synchronized media URL: ${pendingMediaUrl}`);
          }

          // Clear pending effects after applying
          pendingEffects = null;
          pendingMediaUrl = null;
        }

        // Clear any color overlays during voice playback
        setCurrentVoiceType(null);
        setCurrentMediaColor(null);

        // 🎯 Simplified Text Display: Show full block text when voice starts
        // Use the generated audio content (which contains recorded content if available) instead of script content
        const displayText = currentStep.audio.content || block.originalContent || block.content;
        const voiceTag = block.voiceTag;

        console.log(`📝 Displaying synchronized text for [${voiceTag}]: "${displayText}"`);

        // Set text display immediately when voice starts
        setCurrentDisplayText(displayText);
        setCurrentVoiceTag(voiceTag);

        // Clear any existing sentence timeouts (cleanup from old system)
        sentenceTimeouts.forEach(timeout => clearTimeout(timeout));
        setSentenceTimeouts([]);

        // Reset sentence-related states (no longer needed)
        setCurrentSentenceIndex(0);
        setCurrentSegmentSentences([]);

        // Handle audio completion
        audio.onended = () => {
          if (playbackStoppedRef.current) return; // Don't continue if playback was stopped

          console.log(`✅ Completed synchronized voice block: [${block.voiceTag}]`);

          // Stop smooth progress tracking when audio ends
          if (stopSmoothProgress) {
            stopSmoothProgress();
          }

          currentTimelineIndex++;
          playNextTimelineStep();
        };

        // Handle errors
        audio.onerror = (error) => {
          if (playbackStoppedRef.current) return; // Don't continue if playback was stopped

          console.error(`❌ Error playing synchronized voice block [${block.voiceTag}]:`, error);

          // Stop smooth progress tracking on error
          if (stopSmoothProgress) {
            stopSmoothProgress();
          }

          currentTimelineIndex++;
          playNextTimelineStep(); // Continue to next timeline step
        };

        // Play the audio and start smooth progress tracking
        audio.play().then(() => {
          if (playbackStoppedRef.current) return; // Don't start progress if playback was stopped

          // Start smooth progress tracking for this audio block
          if (startSmoothProgress) {
            startSmoothProgress(audio, currentBlockStartTime);
          }
        }).catch(error => {
          if (playbackStoppedRef.current) return; // Don't continue if playback was stopped

          console.error(`❌ Failed to play synchronized voice block [${block.voiceTag}]:`, error);
          currentTimelineIndex++;
          playNextTimelineStep(); // Continue to next timeline step
        });
      }
    };

    // Start playing the timeline
    playNextTimelineStep();

  } catch (error) {
    console.error('❌ Error in multi-voice playback:', error);
    console.error('❌ Full error details:', error.message, error.stack);

    // Clean up media timeouts on error
    console.log('🧹 Cleaning up media timeouts on error:', mediaTimeouts.length);
    mediaTimeouts.forEach(timeoutId => clearTimeout(timeoutId));
    mediaTimeoutsRef.current.forEach(timeoutId => clearTimeout(timeoutId));
    setMediaTimeouts([]);
    mediaTimeoutsRef.current = [];

    // Stop smooth progress tracking on error
    if (stopSmoothProgress) {
      stopSmoothProgress();
    }

    // Reset states on error
    setIsGeneratingAudio(false);
    setCurrentLoadingState(false);
    setCurrentLoadingMessage('');
    setCurrentLoadingIcon('default');
    setIsPlaying(false);
    setActiveAudioSegments([]);

    throw error;
  }
};

/**
 * Stop multi-voice audio playback immediately
 * Interrupts the timeline and cleans up all resources
 * @param {Object} stateSetters - React state setters for cleanup
 */
export const stopMultiVoiceAudio = (stateSetters) => {
  const {
    setIsGeneratingAudio,
    setIsPlaying,
    setActiveAudioSegments,
    playbackStoppedRef,
    setCurrentVoiceType,
    setCurrentVoiceTransparency,
    setCurrentMediaColor,
    setCurrentZoomScale,
    setCurrentMediaImageUrl,
    setCurrentLoadingState,
    setCurrentLoadingMessage,
    setCurrentLoadingIcon,
    setLoadingSubSteps,
    setCurrentFadeEffect,
    setCurrentPanEffect,
    setCurrentZoomEffect,
    setCurrentDisplayText,
    setCurrentVoiceTag,
    setCurrentSentenceIndex,
    setCurrentSegmentSentences,
    setSentenceTimeouts,
    sentenceTimeouts,
    setMediaTimeouts,
    mediaTimeouts,
    mediaTimeoutsRef,
    stopSmoothProgress
  } = stateSetters;

  console.log('🛑 EmberPlayer: Stopping timeline playback immediately...');

  // CRITICAL: Set stop flag FIRST to prevent any new timeline steps
  playbackStoppedRef.current = true;

  // Clear all timeouts immediately
  if (sentenceTimeouts) {
    sentenceTimeouts.forEach(timeout => clearTimeout(timeout));
    setSentenceTimeouts([]);
  }
  if (mediaTimeouts) {
    mediaTimeouts.forEach(timeout => clearTimeout(timeout));
    setMediaTimeouts([]);
  }
  if (mediaTimeoutsRef && mediaTimeoutsRef.current) {
    mediaTimeoutsRef.current.forEach(timeout => clearTimeout(timeout));
    mediaTimeoutsRef.current = [];
  }

  // Stop smooth progress tracking
  if (stopSmoothProgress) {
    stopSmoothProgress();
  }

  // Reset all states immediately
  setIsGeneratingAudio(false);
  setIsPlaying(false);
  setActiveAudioSegments([]);
  setCurrentVoiceType(null);
  setCurrentVoiceTransparency(0);
  setCurrentMediaColor(null);
  setCurrentZoomScale({ start: 1.0, end: 1.0 });
  setCurrentMediaImageUrl(null);
  setCurrentLoadingState(false);
  setCurrentLoadingMessage('');
  setCurrentLoadingIcon('default');
  if (setLoadingSubSteps) {
    setLoadingSubSteps([]);
  }
  setCurrentFadeEffect(null);
  setCurrentPanEffect(null);
  setCurrentZoomEffect(null);
  setCurrentDisplayText('');
  setCurrentVoiceTag('');
  setCurrentSentenceIndex(0);
  setCurrentSegmentSentences([]);

  // Clear all tracked audio objects
  clearAudioRegistry();

  console.log('✅ EmberPlayer: Timeline playback stopped and all resources cleaned up');
};