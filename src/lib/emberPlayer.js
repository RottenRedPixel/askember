import { getUserVoiceModel } from '@/lib/database';
import { textToSpeech } from '@/lib/elevenlabs';
import {
  estimateSegmentDuration,
  extractZoomScaleFromAction,
  extractFadeFromAction,
  extractPanFromAction,
  extractZoomFromAction,
  resolveMediaReference
} from '@/lib/scriptParser';

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

      // Use clean content without attribution
      const audioBlob = await textToSpeech(audioContent, fallbackVoiceId);
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      registerAudio(audio);

      return {
        type: 'text_response',
        audio,
        url: audioUrl,
        blob: audioBlob,
        voiceTag,
        content: audioContent, // Use clean content
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
    const segmentVoiceTag = segment.voiceTag || segment.speaker || 'Unknown';

    console.log(`  📋 Segment ${index + 1}:`);
    console.log(`    - Voice Tag: "${segmentVoiceTag}"`);
    console.log(`    - Content: "${segment.content}"`);
    console.log(`    - Type: ${segment.type}`);
    console.log(`    - Speaker: ${segment.speaker || 'NONE'}`);
    console.log(`    - Message ID: ${segment.messageId || 'NONE'}`);
    console.log(`    - Preference: ${segment.preference || 'NONE'}`);

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
  const { voiceTag, content, originalContent, type, speaker } = segment;

  // ✅ ENHANCED: Derive actual voice type for backward compatibility  
  let actualVoiceType = type;
  let actualVoiceTag = voiceTag || speaker || 'Unknown Voice';

  // For type 'voice' blocks, derive the actual type from speaker
  if (type === 'voice' && speaker) {
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

      // PRIORITY 1: Check if preference is embedded in script segment (from sacred format)
      if (segment.preference) {
        // Convert script preference format to audio generation format
        if (segment.preference === 'synth') {
          userPreference = 'personal';
        } else if (segment.preference === 'recorded') {
          userPreference = 'recorded';
        } else if (segment.preference === 'text') {
          userPreference = 'text';
        }
        foundStudioPreference = true;
        console.log(`🎯 ✅ Using ${segment.format || 'embedded'} script preference: ${segment.preference} → ${userPreference}`);
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
        // NEW: Prioritize sacred format contributionId for 100% reliable matching
        if (segment.contributionId && segment.contributionId !== 'null' && storyCut.metadata?.messageIdMap) {
          const messageData = storyCut.metadata.messageIdMap[segment.contributionId];

          if (messageData) {
            console.log(`🆔 SACRED FORMAT: Direct message ID match using contributionId ${segment.contributionId}`);
            console.log(`🆔 Message data:`, messageData);

            // Check if we have recorded audio for this message
            const hasRecordedAudio = !!(messageData.audio_url);

            if (hasRecordedAudio) {
              console.log(`🎯 RECORDED AUDIO FOUND via sacred contributionId: Using recorded audio`);
              console.log(`🎯 Audio URL: ${messageData.audio_url}`);
              console.log(`🎯 Content: "${messageData.content}"`);

              const audio = new Audio(messageData.audio_url);
              registerAudio(audio);
              return {
                type: 'contributor_recorded',
                audio,
                url: messageData.audio_url,
                voiceTag,
                content: messageData.content,
                userId: messageData.user_id,
                messageId: segment.contributionId,
                source: 'sacred_format'
              };
            } else {
              console.log(`⚠️ Sacred contributionId found but no recorded audio - using fallback`);
            }
          } else {
            console.log(`⚠️ Sacred contributionId ${segment.contributionId} not found in messageIdMap`);
            console.log(`⚠️ Available message IDs:`, Object.keys(storyCut.metadata?.messageIdMap || {}));
          }
        }

        // FALLBACK: Legacy message ID lookup (backward compatibility)
        if (segment.messageId && segment.messageId !== segment.contributionId && storyCut.metadata?.messageIdMap && storyCut.metadata.messageIdMap[segment.messageId]) {
          const messageData = storyCut.metadata.messageIdMap[segment.messageId];
          console.log(`🆔 LEGACY FORMAT: Using legacy messageId ${segment.messageId} for ${voiceTag}`);
          console.log(`🆔 Message data:`, messageData);

          // Check if we have recorded audio for this message
          const hasRecordedAudio = !!(messageData.audio_url);

          if (hasRecordedAudio) {
            console.log(`🎯 RECORDED AUDIO FOUND via legacy messageId: Using recorded audio`);
            console.log(`🎯 Audio URL: ${messageData.audio_url}`);
            console.log(`🎯 Content: "${messageData.content}"`);

            const audio = new Audio(messageData.audio_url);
            registerAudio(audio);
            return {
              type: 'contributor_recorded',
              audio,
              url: messageData.audio_url,
              voiceTag,
              content: messageData.content,
              userId: messageData.user_id,
              messageId: segment.messageId,
              source: 'legacy_format'
            };
          } else {
            console.log(`⚠️ Legacy messageId found but no recorded audio - using user fallback`);
            // Continue with user-based fallback logic below
          }
        } else if (segment.messageId || segment.contributionId) {
          const idToCheck = segment.contributionId || segment.messageId;
          console.log(`⚠️ Message ID ${idToCheck} not found in messageIdMap - using fallback matching`);
          console.log(`⚠️ Available message IDs:`, Object.keys(storyCut.metadata?.messageIdMap || {}));
        } else {
          console.log(`ℹ️ No contribution/message ID in segment - using traditional matching`);
        }
      }

      // Use the existing sophisticated contributor audio generation logic
      console.log(`🎯 Using handleContributorAudioGeneration with preference: ${userPreference}`);

      // Get recorded audio data if available (for handleContributorAudioGeneration)
      let audioData = null;
      let hasRecordedAudio = false;

      if (segment.contributionId && storyCut.metadata?.messageIdMap) {
        const messageData = storyCut.metadata.messageIdMap[segment.contributionId];
        if (messageData && messageData.audio_url) {
          audioData = messageData;
          hasRecordedAudio = true;
          console.log(`🎙️ Found recorded audio for contribution ${segment.contributionId}`);
        }
      }

      // Check for personal voice model
      let hasPersonalVoice = false;
      let userVoiceModel = null;

      // Try to get user ID from contribution data
      let userId = null;
      if (audioData && audioData.user_id) {
        userId = audioData.user_id;
      } else if (segment.contributionId && storyCut.metadata?.messageIdMap) {
        const messageData = storyCut.metadata.messageIdMap[segment.contributionId];
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
            console.log(`🎤 Found personal voice model for ${voiceTag}:`, {
              userId,
              voiceId: userVoiceModel.elevenlabs_voice_id,
              voiceName: userVoiceModel.elevenlabs_voice_name
            });
          } else {
            console.log(`⚠️ No personal voice model found for ${voiceTag} (userId: ${userId})`);
          }
        } catch (error) {
          console.error(`❌ Error looking up voice model for ${voiceTag}:`, error);
          hasPersonalVoice = false;
          userVoiceModel = null;
        }
      } else {
        console.log(`⚠️ No user ID found for ${voiceTag} - cannot check for personal voice model`);
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

      // ✅ ENHANCED: Get voice tag for all blocks (for consistent logging)
      const voiceTag = block.voiceTag || block.speaker || 'Unknown Voice';

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
        console.log(`📺 Timeline ${index + 1}: MEDIA switch - ${(block.content || block.mediaName || 'Media').substring(0, 50)}...`);
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
      } else {
        console.warn(`⚠️ Skipping timeline step ${index + 1}: No audio available for [${voiceTag}]`);
      }
    }

    console.log('✅ Generated', audioSegments.length, 'audio segments');
    console.log('🎬 Starting unified timeline playback...');
    console.log(`🎭 Timeline has ${timeline.length} sequential steps`);

    // Initialize loading state for the first segment
    setCurrentLoadingState(false);
    setIsGeneratingAudio(false);
    setIsPlaying(true);

    // Use imperative playback approach with nested callbacks
    // This ensures proper sequential timing and visual effect coordination
    // No background media processing - MEDIA elements are now in timeline

    let currentTimelineIndex = 0;
    let currentBlockIndex = -1; // Track which block we're currently processing (start at -1 so first block triggers update)

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
          } else if (block.type === 'ember' || block.type === 'narrator' || block.type === 'contributor') {
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
        // Media step - switch background image and continue immediately
        const block = currentStep.block;

        console.log(`📺 Switching to media: ${(block.content || block.mediaName || 'Media').substring(0, 50)}...`);

        // Resolve the media reference to get the actual image URL
        resolveMediaReference(block, ember.id).then(resolvedMediaUrl => {
          console.log(`🔍 Resolved media URL for "${block.mediaPath || block.mediaName || block.mediaId}":`, resolvedMediaUrl);

          if (resolvedMediaUrl) {
            // Extract all effects directly from Sacred Format content  
            let fadeEffect = null;
            let panEffect = null;
            let zoomEffect = null;
            let hasLegacyZoomEffects = false;

            // Extract effects from Sacred Format content: <ZOOM-OUT:duration=3.5>
            const contentForEffects = block.content || '';
            console.log(`🔍 Processing Sacred Format content for effects: "${contentForEffects}"`);

            // Extract fade effects directly from content
            if (contentForEffects.includes('FADE-') && !fadeEffect) {
              fadeEffect = extractFadeFromAction(contentForEffects);
              if (fadeEffect) {
                console.log(`🎬 Fade effect extracted from content: ${fadeEffect.type} - ${fadeEffect.duration}s`);
              }
            }

            // Extract pan effects directly from content
            if (contentForEffects.includes('PAN-') && !panEffect) {
              panEffect = extractPanFromAction(contentForEffects);
              if (panEffect) {
                console.log(`🎬 Pan effect extracted from content: ${panEffect.direction} - ${panEffect.duration}s`);
              }
            }

            // Extract zoom effects directly from content
            if (contentForEffects.includes('ZOOM-') && !zoomEffect) {
              zoomEffect = extractZoomFromAction(contentForEffects);
              if (zoomEffect) {
                console.log(`🎬 Zoom effect extracted from content: ${zoomEffect.type} - ${zoomEffect.duration}s`);
              }
            }

            // Check for legacy zoom effects
            if (contentForEffects.includes('Z-OUT:')) {
              hasLegacyZoomEffects = true;
            }

            // Apply legacy zoom effects (Z-OUT: system)
            if (hasLegacyZoomEffects) {
              const zoomScale = extractZoomScaleFromAction(block.content);
              console.log(`🎬 Applying legacy zoom effect: from ${zoomScale.start} to ${zoomScale.end}`);
              setCurrentZoomScale(zoomScale);
            }

            // 🎯 NEW APPROACH: Coordinate image and effects through React state coordination
            console.log(`🎬 Setting image URL and effects through React state coordination`);

            // Set effects state first, then image URL - this allows EmberPlay to coordinate properly
            setCurrentFadeEffect(fadeEffect);
            setCurrentPanEffect(panEffect);
            setCurrentZoomEffect(zoomEffect);

            // Force React state change by clearing first, then setting - ensures re-render even with same URL
            setCurrentMediaImageUrl(null);
            setTimeout(() => {
              setCurrentMediaImageUrl(resolvedMediaUrl);
            }, 10); // Brief delay to ensure React processes the null first

            // Log effects for debugging
            if (fadeEffect) {
              console.log(`🎬 Fade effect set in React state: ${fadeEffect.type} - ${fadeEffect.duration}s`);
            }
            if (panEffect) {
              console.log(`🎬 Pan effect set in React state: ${panEffect.direction} - ${panEffect.duration}s`);
            }
            if (zoomEffect) {
              console.log(`🎬 Zoom effect set in React state: ${zoomEffect.type} - ${zoomEffect.duration}s`);
            }

            // Clear any color overlays when switching to image
            setCurrentMediaColor(null);
          } else {
            console.warn(`⚠️ Could not resolve media reference: ${block.mediaPath || block.mediaName || block.mediaId}`);
          }

          // Continue immediately to next timeline step (media changes are instant)
          currentTimelineIndex++;
          playNextTimelineStep();
        }).catch(error => {
          console.error('❌ Error resolving media reference:', error);
          // Continue anyway
          currentTimelineIndex++;
          playNextTimelineStep();
        });

      } else if (currentStep.type === 'voice') {
        // Voice step - play audio
        if (!currentStep.audio || !currentStep.audio.audio) {
          console.error(`❌ No audio available for voice block [${currentStep.voiceTag || currentStep.block?.voiceTag || currentStep.block?.speaker || 'Unknown Voice'}] - skipping`);
          currentTimelineIndex++;
          playNextTimelineStep();
          return;
        }

        const audio = currentStep.audio.audio;
        const block = currentStep.block;

        console.log(`▶️ Playing voice block: [${block.voiceTag}]`);

        // Clear any color overlays during voice playback
        setCurrentVoiceType(null);
        setCurrentMediaColor(null);

        // 🎯 Simplified Text Display: Show full block text when voice starts
        // Use the generated audio content (which contains recorded content if available) instead of script content
        const displayText = currentStep.audio.content || block.originalContent || block.content;
        const voiceTag = block.voiceTag;

        console.log(`📝 Displaying text for [${voiceTag}]: "${displayText}"`);
        console.log(`📝 Audio content: "${currentStep.audio.content}"`);
        console.log(`📝 Original script content: "${block.originalContent || block.content}"`);

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

          console.log(`✅ Completed voice block: [${block.voiceTag}]`);

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

          console.error(`❌ Error playing voice block [${block.voiceTag}]:`, error);

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

          console.error(`❌ Failed to play voice block [${block.voiceTag}]:`, error);
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