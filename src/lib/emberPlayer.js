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
 * Audio engine for ember playback
 * Extracted from EmberDetail.jsx to improve maintainability
 */

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

    // Use attribution style with fallback voice
    const narratedContent = `${voiceTag} said, "${audioContent}"`;
    const audioBlob = await textToSpeech(narratedContent, fallbackVoiceId);
    const audioUrl = URL.createObjectURL(audioBlob);
    const audio = new Audio(audioUrl);

    return {
      type: 'text_response',
      audio,
      url: audioUrl,
      blob: audioBlob,
      voiceTag,
      content: narratedContent,
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
    return {
      type: 'recorded',
      audio,
      url: audioData.audio_url,
      voiceTag,
      content
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

    const narratedContent = `${voiceTag} said, "${content}"`;
    const audioBlob = await textToSpeech(narratedContent, fallbackVoiceId);
    const audioUrl = URL.createObjectURL(audioBlob);
    const audio = new Audio(audioUrl);

    return {
      type: 'attribution_fallback',
      audio,
      url: audioUrl,
      blob: audioBlob,
      voiceTag,
      content: narratedContent,
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

    const narratedContent = `${voiceTag} said, "${content}"`;
    const audioBlob = await textToSpeech(narratedContent, fallbackVoiceId);
    const audioUrl = URL.createObjectURL(audioBlob);
    const audio = new Audio(audioUrl);

    return {
      type: 'text_response_fallback',
      audio,
      url: audioUrl,
      blob: audioBlob,
      voiceTag,
      content: narratedContent,
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

      const narratedContent = `${voiceTag} said, "${content}"`;
      const audioBlob = await textToSpeech(narratedContent, fallbackVoiceId);
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);

      return {
        type: 'text_response',
        audio,
        url: audioUrl,
        blob: audioBlob,
        voiceTag,
        content: narratedContent,
        fallbackVoice: fallbackVoiceName
      };
    } else if (userPreference === 'recorded' && hasRecordedAudio) {
      console.log(`🎙️ ✅ Using recorded audio (final fallback)`);
      const audio = new Audio(audioData.audio_url);
      return {
        type: 'recorded',
        audio,
        url: audioData.audio_url,
        voiceTag,
        content
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

      const narratedContent = `${voiceTag} said, "${content}"`;
      const audioBlob = await textToSpeech(narratedContent, fallbackVoiceId);
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);

      return {
        type: 'ultimate_fallback',
        audio,
        url: audioUrl,
        blob: audioBlob,
        voiceTag,
        content: narratedContent,
        fallbackVoice: fallbackVoiceName
      };
    }
  }
};

/**
 * Debug helper to inspect recorded audio data and script segment matching
 * @param {Object} recordedAudio - Available recorded audio data
 * @param {Array} scriptSegments - Script segments to analyze
 */
export const debugRecordedAudio = (recordedAudio, scriptSegments) => {
  console.log('🐛 ===== RECORDED AUDIO DEBUG REPORT =====');
  console.log('🎙️ Available recorded audio:');
  Object.entries(recordedAudio).forEach(([userId, audioData]) => {
    console.log(`  📤 User ${userId}:`);
    console.log(`    - Name: "${audioData.user_first_name}"`);
    console.log(`    - Message: "${audioData.message_content}"`);
    console.log(`    - Audio URL: ${audioData.audio_url ? '✅ EXISTS' : '❌ MISSING'}`);
    console.log(`    - Duration: ${audioData.audio_duration_seconds}s`);
  });

  console.log('\n📝 Script segments requiring recorded audio:');
  scriptSegments.filter(seg => seg.type === 'contributor').forEach((segment, index) => {
    console.log(`  📋 Segment ${index + 1}:`);
    console.log(`    - Voice Tag: "${segment.voiceTag}"`);
    console.log(`    - Content: "${segment.content}"`);
    console.log(`    - Type: ${segment.type}`);

    // Check for matches
    const matches = Object.entries(recordedAudio).filter(([userId, audioData]) => {
      const nameMatches = audioData.user_first_name === segment.voiceTag;
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
        return audioData.user_first_name === segment.voiceTag;
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
  const { voiceTag, content, originalContent, type } = segment;

  // Use originalContent for audio synthesis, content for display/matching
  const rawAudioContent = originalContent || content;

  // Clean content for TTS: remove visual actions and voice tags
  const audioContent = rawAudioContent
    .replace(/<[^>]+>/g, '') // Remove visual actions like <COLOR:#FF0000,TRAN:0.2>
    .replace(/^\[.*?\]\s*/, '') // Remove voice tags like [NARRATOR] or [EMBER VOICE]
    .trim();

  console.log(`🎵 Generating audio for [${voiceTag}]: "${audioContent.substring(0, 50)}..."`);
  console.log(`🔍 Segment type: ${type}`);
  console.log(`🎨 Full content with visual actions: "${content}"`);
  console.log(`🎙️ Audio content (no visual actions): "${audioContent}"`);

  // 🐛 ENHANCED DEBUG: Log all available recorded audio
  console.log('🐛 DEBUG - All recorded audio available:');
  Object.entries(recordedAudio).forEach(([userId, audioData]) => {
    console.log(`  - User ${userId} (${audioData.user_first_name}): "${audioData.message_content?.substring(0, 50)}..."`);
    console.log(`    Audio URL: ${audioData.audio_url ? 'EXISTS' : 'MISSING'}`);
  });

  try {
    if (type === 'contributor') {
      console.log(`🐛 DEBUG - Looking for recorded audio for contributor: ${voiceTag}`);
      console.log(`🐛 DEBUG - Script content: "${audioContent}"`);

      // Check per-message preference for this content
      let userPreference = 'recorded'; // default
      let foundStudioPreference = false;

      // PRIORITY 1: Check if preference is embedded in script segment
      if (segment.preference) {
        console.log(`🎯 ✅ Found embedded preference in script: ${segment.preference}`);
        // Convert script preference format to audio generation format
        if (segment.preference === 'synth') {
          userPreference = 'personal';
        } else if (segment.preference === 'recorded') {
          userPreference = 'recorded';
        } else if (segment.preference === 'text') {
          userPreference = 'text';
        }
        foundStudioPreference = true;
        console.log(`🎯 ✅ Using embedded script preference: ${segment.preference} → ${userPreference}`);
      }

      // PRIORITY 2: Check StoryCutStudio contributor preferences (fallback if no embedded preference)
      if (!foundStudioPreference && window.contributorAudioPreferences) {
        console.log(`🎭 Checking StoryCutStudio contributor preferences for ${voiceTag}`);
        console.log(`🎭 Current audio content: "${audioContent}"`);

        // Try to find block-specific preference by matching content
        const blockSpecificKeys = Object.keys(window.contributorAudioPreferences).filter(key =>
          key.startsWith(voiceTag + '-')
        );

        console.log(`🎯 Found ${blockSpecificKeys.length} block-specific preferences for ${voiceTag}:`, blockSpecificKeys);

        let studioPreference = null;
        let selectedBlockKey = null;

        // If we have block-specific preferences, try to match by content
        if (blockSpecificKeys.length > 0) {
          // Strategy: Match the content with the original story messages to determine which block this is
          console.log(`🎯 Trying to match content "${audioContent}" with block preferences`);

          // Check if this content matches "This was at the Home Depot!" (the text response)
          const isHomeDepotContent = audioContent.toLowerCase().includes('home depot');
          const isWhatItWasContent = audioContent.toLowerCase().includes('no idea what it was');

          console.log(`🎯 Content analysis: isHomeDepot=${isHomeDepotContent}, isWhatItWas=${isWhatItWasContent}`);

          // Find the right block based on content
          for (const blockKey of blockSpecificKeys) {
            const preference = window.contributorAudioPreferences[blockKey];
            console.log(`🎯 Checking block preference: ${blockKey} → ${preference}`);

            // If this is the Home Depot content, and there's a text/synth preference, use it
            if (isHomeDepotContent && (preference === 'text' || preference === 'synth')) {
              studioPreference = preference;
              selectedBlockKey = blockKey;
              console.log(`🎯 ✅ Matched Home Depot content with ${blockKey} → ${preference}`);
              break;
            }
            // If this is the "no idea what it was" content, and there's a recorded preference, use it
            else if (isWhatItWasContent && preference === 'recorded') {
              studioPreference = preference;
              selectedBlockKey = blockKey;
              console.log(`🎯 ✅ Matched "what it was" content with ${blockKey} → ${preference}`);
              break;
            }
          }

          // If no content-based match, use the first block preference
          if (!studioPreference && blockSpecificKeys.length > 0) {
            selectedBlockKey = blockSpecificKeys[0];
            studioPreference = window.contributorAudioPreferences[selectedBlockKey];
            console.log(`🎯 📝 Using first block preference: ${selectedBlockKey} → ${studioPreference}`);
          }
        } else {
          // Fallback to voice tag preference if no block-specific ones exist
          studioPreference = window.contributorAudioPreferences[voiceTag];
          console.log(`🎯 📝 Using voice tag preference: ${voiceTag} → ${studioPreference}`);
        }

        if (studioPreference) {
          foundStudioPreference = true;
          // Convert studio preference format to audio generation format
          if (studioPreference === 'synth') {
            userPreference = 'personal';
          } else if (studioPreference === 'recorded') {
            userPreference = 'recorded';
          } else if (studioPreference === 'text') {
            userPreference = 'text';
          }
          console.log(`🎯 ✅ Found StoryCutStudio preference for ${voiceTag} (${selectedBlockKey}): ${studioPreference} → ${userPreference}`);
        }
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

      // Find the user ID by matching the voice tag (first name) with recorded audio data OR story cut contributors
      let matchingUserId = Object.entries(recordedAudio).find(([userId, audioData]) => {
        return audioData.user_first_name === voiceTag;
      });

      // If not found in recorded audio, check story cut contributors
      if (!matchingUserId && storyCut.selected_contributors) {
        console.log(`🔍 No recorded audio match, checking story cut contributors for: ${voiceTag}`);
        console.log(`🔍 DEBUG: Story cut selected_contributors structure:`, storyCut.selected_contributors);
        console.log(`🔍 DEBUG: Looking for contributor with name: "${voiceTag}"`);

        // Log each contributor for debugging
        storyCut.selected_contributors.forEach((contributor, index) => {
          console.log(`🔍 DEBUG: Contributor ${index}: name="${contributor.name}", id="${contributor.id}", role="${contributor.role}"`);
        });

        const contributor = storyCut.selected_contributors.find(c => c.name === voiceTag);
        if (contributor) {
          console.log(`✅ Found contributor in story cut: ${contributor.name} (ID: ${contributor.id})`);
          matchingUserId = [contributor.id, { user_first_name: contributor.name }];
        } else {
          console.log(`❌ Could not find contributor with name "${voiceTag}" in story cut contributors`);
        }
      }

      if (!matchingUserId) {
        console.log(`🔍 Could not find user ID for voice tag: ${voiceTag}`);
        console.log(`🔄 Using narrator/ember voice fallback for unmatched contributor: ${voiceTag}`);

        // Final fallback: Use narrator or ember voice with attribution
        let fallbackVoiceId = null;
        let fallbackVoiceName = null;

        if (storyCut.narrator_voice_id) {
          fallbackVoiceId = storyCut.narrator_voice_id;
          fallbackVoiceName = 'narrator';
          console.log(`🎤 Using narrator voice for unmatched contributor fallback`);
        } else if (storyCut.ember_voice_id) {
          fallbackVoiceId = storyCut.ember_voice_id;
          fallbackVoiceName = 'ember';
          console.log(`🎤 Using ember voice for unmatched contributor fallback`);
        } else {
          throw new Error(`No voice available for contributor fallback: ${voiceTag}`);
        }

        const narratedContent = `${voiceTag} said, "${audioContent}"`;
        const audioBlob = await textToSpeech(narratedContent, fallbackVoiceId);
        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);

        return {
          type: 'contributor_fallback',
          audio,
          url: audioUrl,
          blob: audioBlob,
          voiceTag,
          content: narratedContent,
          fallbackVoice: fallbackVoiceName
        };
      } else {
        const [userId, audioData] = matchingUserId;
        console.log(`🔍 Found user ID for ${voiceTag}: ${userId}`);

        // Check for recorded audio match (only if we have actual recorded audio data)
        const hasRecordedAudio = (() => {
          // If audioData doesn't have message_content, it's from story cut contributors (no recorded audio)
          if (!audioData.message_content) {
            console.log(`  - No message content - this is from story cut contributors (synth voice only)`);
            return false;
          }

          const recordedContent = audioData.message_content?.toLowerCase() || '';
          const segmentContent = audioContent.toLowerCase();

          console.log(`  - Recorded content: "${recordedContent}"`);
          console.log(`  - Segment content: "${segmentContent}"`);

          const exactMatch = recordedContent === segmentContent;
          const recordedContainsSegment = recordedContent.includes(segmentContent);
          const segmentContainsRecorded = segmentContent.includes(recordedContent);

          console.log(`  - Exact match: ${exactMatch}`);
          console.log(`  - Recorded contains segment: ${recordedContainsSegment}`);
          console.log(`  - Segment contains recorded: ${segmentContainsRecorded}`);

          const contentMatches = exactMatch || recordedContainsSegment || segmentContainsRecorded;
          console.log(`  - Content match result: ${contentMatches}`);

          return contentMatches && audioData.audio_url;
        })();

        // Check for personal voice model
        let userVoiceModel = null;
        try {
          console.log(`🔍 Fetching voice model for ${voiceTag} (userId: ${userId})...`);
          userVoiceModel = await getUserVoiceModel(userId);
          console.log(`✅ Voice model result for ${voiceTag}:`, userVoiceModel);
        } catch (error) {
          console.log(`⚠️ Error fetching voice model for ${voiceTag}:`, error.message);
        }

        const hasPersonalVoice = userVoiceModel && userVoiceModel.elevenlabs_voice_id;

        console.log(`🎤 ${voiceTag} audio options:`);
        console.log(`  - Recorded audio: ${hasRecordedAudio ? '✅' : '❌'}`);
        console.log(`  - Personal voice: ${hasPersonalVoice ? '✅' : '❌'} ${hasPersonalVoice ? `(${userVoiceModel.elevenlabs_voice_name})` : ''}`);
        console.log(`  - User preference: ${userPreference}`);
        console.log(`  - User ID: ${userId}`);
        console.log(`  - Voice model data:`, userVoiceModel);

        // 🚨 DEBUG: Specific synth preference debugging
        if (userPreference === 'personal') {
          console.log(`🚨 DEBUG: User wants SYNTH voice for ${voiceTag}`);
          console.log(`🚨 DEBUG: Found user ID: ${userId}`);
          console.log(`🚨 DEBUG: Voice model lookup result:`, userVoiceModel);
          console.log(`🚨 DEBUG: Voice model keys:`, Object.keys(userVoiceModel || {}));
          console.log(`🚨 DEBUG: Has elevenlabs_voice_id?`, !!userVoiceModel?.elevenlabs_voice_id);
          console.log(`🚨 DEBUG: Voice ID value:`, userVoiceModel?.elevenlabs_voice_id);
          console.log(`🚨 DEBUG: Voice name value:`, userVoiceModel?.elevenlabs_voice_name);
          console.log(`🚨 DEBUG: Story cut selected_contributors:`, storyCut.selected_contributors);

          if (hasPersonalVoice) {
            console.log(`🚨 DEBUG: ✅ Personal voice available - will use direct synthesis`);
            console.log(`🚨 DEBUG: Voice ID: ${userVoiceModel.elevenlabs_voice_id}`);
            console.log(`🚨 DEBUG: Voice Name: ${userVoiceModel.elevenlabs_voice_name}`);
          } else {
            console.log(`🚨 DEBUG: ❌ No personal voice - will fall back to attribution style`);
            console.log(`🚨 DEBUG: Voice model result:`, userVoiceModel);
            console.log(`🚨 DEBUG: Has voice ID? ${!!userVoiceModel?.elevenlabs_voice_id}`);
            console.log(`🚨 DEBUG: typeof voice ID:`, typeof userVoiceModel?.elevenlabs_voice_id);
            console.log(`🚨 DEBUG: Voice ID length:`, userVoiceModel?.elevenlabs_voice_id?.length);
            console.log(`🚨 DEBUG: Voice ID matches expected format?`, /^[a-zA-Z0-9_-]+$/.test(userVoiceModel?.elevenlabs_voice_id || ''));
          }
        }

        // Decision logic for audio preference handling continues in next part...
        return await handleContributorAudioGeneration(userPreference, hasRecordedAudio, hasPersonalVoice, audioData, userVoiceModel, storyCut, voiceTag, audioContent, content, segment);
      }
    } else if (type === 'ember') {
      // EMBER VOICE
      console.log(`🔥 Generating EMBER voice audio: "${audioContent}"`);

      const voiceId = getVoiceId(segment, storyCut, 'ember');
      if (!voiceId) {
        throw new Error('No ember voice ID configured for this story cut');
      }

      const audioBlob = await textToSpeech(audioContent, voiceId);
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);

      return {
        type: 'ember_voice',
        audio,
        url: audioUrl,
        blob: audioBlob,
        voiceTag,
        content: audioContent
      };
    } else if (type === 'narrator') {
      // NARRATOR VOICE
      console.log(`🎤 Generating NARRATOR audio: "${audioContent}"`);

      const voiceId = getVoiceId(segment, storyCut, 'narrator');
      if (!voiceId) {
        throw new Error('No narrator voice ID configured for this story cut');
      }

      const audioBlob = await textToSpeech(audioContent, voiceId);
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);

      return {
        type: 'narrator_voice',
        audio,
        url: audioUrl,
        blob: audioBlob,
        voiceTag,
        content: audioContent
      };
    } else {
      console.log(`⚠️ Unknown segment type: ${type}`);
      throw new Error(`Unknown segment type: ${type}`);
    }
  } catch (error) {
    console.error(`❌ Error generating audio for [${voiceTag}]:`, error);
    console.error(`❌ Segment data:`, {
      voiceTag,
      content,
      originalContent,
      type,
      audioContent
    });
    throw error;
  }
};

/**
 * Play multiple audio segments sequentially with visual effects
 * @param {Array} segments - Audio segments to play
 * @param {Object} storyCut - Story cut configuration
 * @param {Object} recordedAudio - Available recorded audio data
 * @param {Object} stateSetters - React state setters for visual effects
 * @param {Object} ember - Ember data for media resolution
 * @returns {Promise<void>}
 */
export const playMultiVoiceAudio = async (segments, storyCut, recordedAudio, stateSetters, ember) => {
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
    mediaTimeoutsRef
  } = stateSetters;

  console.log('🎭 Starting multi-voice playback with', segments.length, 'segments');

  // 🐛 DEBUG: Run debug helper to analyze recorded audio matching
  debugRecordedAudio(recordedAudio, segments);

  // Reset playback flag
  playbackStoppedRef.current = false;

  try {
    // Separate media/hold/loadscreen and voice segments for different processing
    const mediaSegments = segments.filter(segment => segment.type === 'media' || segment.type === 'hold' || segment.type === 'loadscreen');
    const voiceSegments = segments.filter(segment => segment.type === 'ember' || segment.type === 'narrator' || segment.type === 'contributor');
    console.log(`🎭 Segment breakdown: ${segments.length} total → ${mediaSegments.length} media/hold/loadscreen + ${voiceSegments.length} voice`);

    // Generate audio for voice segments only
    console.log('⏳ Generating audio for voice segments...');
    const audioSegments = [];
    for (let i = 0; i < voiceSegments.length; i++) {
      const segment = voiceSegments[i];
      console.log(`🔧 Generating segment ${i + 1}/${voiceSegments.length}: [${segment.voiceTag}] "${segment.originalContent || segment.content}"`);

      try {
        const audioSegment = await generateSegmentAudio(segment, storyCut, recordedAudio);
        audioSegments.push(audioSegment);
        console.log(`✅ Generated segment ${i + 1}: [${segment.voiceTag}]`);
      } catch (segmentError) {
        console.error(`❌ Failed to generate segment ${i + 1} [${segment.voiceTag}]:`, segmentError);
        console.error(`❌ Segment content: "${segment.originalContent || segment.content}"`);
        console.error(`❌ Segment type: ${segment.type}`);

        // Instead of throwing, push null to maintain index alignment
        audioSegments.push(null);
        console.warn(`⚠️ Skipping segment ${i + 1} [${segment.voiceTag}] due to audio generation failure`);
      }
    }

    // Create unified timeline with media effects and voice audio
    const timeline = [];
    let audioIndex = 0;

    console.log('🎬 Building unified timeline...');
    segments.forEach((segment, index) => {
      if (segment.type === 'hold') {
        // Hold segment - blocks timeline for set duration
        const duration = parseFloat(estimateSegmentDuration(segment.content, segment.type));
        timeline.push({
          type: 'hold',
          segment,
          duration,
          index
        });
        console.log(`⏸️ Timeline ${index + 1}: HOLD effect for ${duration}s - ${segment.content.substring(0, 50)}...`);
      } else if (segment.type === 'loadscreen') {
        // Load screen segment - blocks timeline for set duration with loading UI
        const duration = segment.loadDuration || parseFloat(estimateSegmentDuration(segment.content, segment.type));
        timeline.push({
          type: 'loadscreen',
          segment,
          duration,
          index
        });
        console.log(`⏳ Timeline ${index + 1}: LOAD SCREEN for ${duration}s - "${segment.loadMessage}"`);
      } else if (segment.type === 'media') {
        // Media segment - add to timeline for sequential processing
        timeline.push({
          type: 'media',
          segment,
          index
        });
        console.log(`📺 Timeline ${index + 1}: MEDIA switch - ${segment.content.substring(0, 50)}...`);
      } else if (segment.type === 'ember' || segment.type === 'narrator' || segment.type === 'contributor') {
        // Voice segment - use generated audio
        if (audioIndex < audioSegments.length) {
          const audioSegment = audioSegments[audioIndex];
          if (audioSegment) {
            timeline.push({
              type: 'voice',
              segment,
              audio: audioSegment,
              index
            });
            console.log(`🎤 Timeline ${index + 1}: VOICE audio - [${segment.voiceTag}]`);
          } else {
            console.warn(`⚠️ Skipping timeline step ${index + 1}: No audio available for [${segment.voiceTag}]`);
          }
          audioIndex++;
        }
      } else {
        console.warn(`⚠️ Unknown segment type: ${segment.type} - [${segment.voiceTag}]`);
      }
    });

    console.log('✅ Generated', audioSegments.length, 'audio segments');
    console.log('🎬 Starting unified timeline playback...');
    console.log(`🎭 Timeline has ${timeline.length} sequential steps`);

    // Store audio segments in state for cleanup
    setActiveAudioSegments(audioSegments);

    // Switch from generating to playing state - clear all loading states
    setIsGeneratingAudio(false);
    setCurrentLoadingState(false);
    setCurrentLoadingMessage('');
    setCurrentLoadingIcon('default');
    setIsPlaying(true);

    console.log('✅ Audio generation complete - starting playback');

    // No background media processing - MEDIA elements are now in timeline

    let currentTimelineIndex = 0;
    // Clear any existing media timeouts before starting new playback
    mediaTimeouts.forEach(timeoutId => clearTimeout(timeoutId));
    mediaTimeoutsRef.current.forEach(timeoutId => clearTimeout(timeoutId));
    setMediaTimeouts([]);
    mediaTimeoutsRef.current = [];

    const playNextTimelineStep = () => {
      if (playbackStoppedRef.current || currentTimelineIndex >= timeline.length) {
        // Clean up any remaining media timeouts
        console.log('🧹 Cleaning up', mediaTimeouts.length, 'media timeouts');
        mediaTimeouts.forEach(timeoutId => clearTimeout(timeoutId));
        mediaTimeoutsRef.current.forEach(timeoutId => clearTimeout(timeoutId));
        setMediaTimeouts([]);
        mediaTimeoutsRef.current = [];

        // All timeline steps finished or playback was stopped
        if (!playbackStoppedRef.current) {
          console.log('🎬 Timeline playback complete');
          // Clear any remaining visual effects
          setCurrentVoiceType(null);
          setCurrentVoiceTransparency(0.2); // Reset to default
          setCurrentMediaColor(null);
          setCurrentZoomScale({ start: 1.0, end: 1.0 }); // Reset to default
          setCurrentMediaImageUrl(null); // Reset to default ember image
          handlePlaybackComplete();
        } else {
          console.log('🛑 Timeline playback stopped');
        }
        return;
      }

      const currentStep = timeline[currentTimelineIndex];
      console.log(`🎬 Timeline step ${currentTimelineIndex + 1}/${timeline.length}: ${currentStep.type} - ${currentStep.type === 'hold' ? `${currentStep.duration}s` : `[${currentStep.segment.voiceTag}]`}`);

      if (currentStep.type === 'hold') {
        // Hold step - apply visual effect and wait for duration
        const segment = currentStep.segment;
        const duration = currentStep.duration;

        console.log(`⏸️ Applying hold effect for ${duration}s: ${segment.content}`);

        // Extract fade effects first (same as MEDIA blocks)
        const hasFadeEffects = segment.content.includes('FADE-');
        let fadeEffect = null;

        if (hasFadeEffects) {
          fadeEffect = extractFadeFromAction(segment.content);
          console.log(`🎬 HOLD fade effect detected: ${fadeEffect?.type} - ${fadeEffect?.duration}s`);
        }

        // Extract color from COLOR:#RRGGBB format
        let colorValue = null;
        if (segment.content.includes('COLOR:#')) {
          const colorMatch = segment.content.match(/COLOR:#([0-9A-Fa-f]{6})/);
          if (colorMatch) {
            colorValue = '#' + colorMatch[1];
          }
        }

        // Apply visual effects based on content
        if (segment.content.includes('Z-OUT:')) {
          // Extract zoom scale values from Z-OUT command
          const zoomScale = extractZoomScaleFromAction(segment.content);
          console.log(`🎬 Visual effect: Image zoom out - from ${zoomScale.start} to ${zoomScale.end}`);
          setCurrentVoiceType(null); // Image display, no voice overlay
          setCurrentMediaColor(null); // Clear any color overlay
          setCurrentZoomScale(zoomScale); // Apply dynamic zoom scale
        } else if (colorValue) {
          console.log(`🎬 Visual effect: Color overlay - ${colorValue}`);
          setCurrentVoiceType(null); // Clear any voice overlay

          // 🎯 NEW APPROACH: Set color through React state, effects handled by EmberPlay
          setCurrentMediaColor(colorValue);

          // Log fade effect for debugging if present
          if (fadeEffect) {
            console.log(`🎬 HOLD fade effect will be handled by React: ${fadeEffect.type} - ${fadeEffect.duration}s`);
          }
        } else {
          // Clear any existing color overlays if no explicit color command
          setCurrentVoiceType(null);
          setCurrentMediaColor(null);
        }

        // Wait for the specified duration, then continue to next step
        const timeoutId = setTimeout(() => {
          if (!playbackStoppedRef.current) {
            currentTimelineIndex++;
            playNextTimelineStep();
          }
        }, duration * 1000);

        // Track timeout for cleanup
        setMediaTimeouts(prev => [...prev, timeoutId]);
        mediaTimeoutsRef.current.push(timeoutId);

      } else if (currentStep.type === 'loadscreen') {
        // Load screen step - display loading UI for specified duration
        const segment = currentStep.segment;
        const duration = currentStep.duration;

        console.log(`⏳ Load screen step: ${duration}s - "${segment.loadMessage}"`);

        // Set loading state with message and icon
        setCurrentLoadingMessage(segment.loadMessage);
        setCurrentLoadingIcon(segment.loadIcon);
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
        const segment = currentStep.segment;

        console.log(`📺 Switching to media: ${segment.content.substring(0, 50)}...`);

        // Resolve the media reference to get the actual image URL
        resolveMediaReference(segment, ember.id).then(resolvedMediaUrl => {
          console.log(`🔍 Resolved media URL for "${segment.mediaPath || segment.mediaName || segment.mediaId}":`, resolvedMediaUrl);

          if (resolvedMediaUrl) {
            // Extract all effects from the visual actions array
            let fadeEffect = null;
            let panEffect = null;
            let zoomEffect = null;
            let hasLegacyZoomEffects = false;

            // Process each visual action to extract effects
            if (segment.visualActions && segment.visualActions.length > 0) {
              for (const action of segment.visualActions) {
                console.log(`🔍 Processing visual action: "${action}"`);

                // Extract fade effects
                if (action.includes('FADE-') && !fadeEffect) {
                  fadeEffect = extractFadeFromAction(action);
                  if (fadeEffect) {
                    console.log(`🎬 Fade effect extracted: ${fadeEffect.type} - ${fadeEffect.duration}s`);
                  }
                }

                // Extract pan effects
                if (action.includes('PAN-') && !panEffect) {
                  panEffect = extractPanFromAction(action);
                  if (panEffect) {
                    console.log(`🎬 Pan effect extracted: ${panEffect.direction} - ${panEffect.duration}s`);
                  }
                }

                // Extract zoom effects
                if (action.includes('ZOOM-') && !zoomEffect) {
                  zoomEffect = extractZoomFromAction(action);
                  if (zoomEffect) {
                    console.log(`🎬 Zoom effect extracted: ${zoomEffect.type} - ${zoomEffect.duration}s`);
                  }
                }

                // Check for legacy zoom effects
                if (action.includes('Z-OUT:')) {
                  hasLegacyZoomEffects = true;
                }
              }
            }

            // Apply legacy zoom effects (Z-OUT: system)
            if (hasLegacyZoomEffects) {
              const zoomScale = extractZoomScaleFromAction(segment.content);
              console.log(`🎬 Applying legacy zoom effect: from ${zoomScale.start} to ${zoomScale.end}`);
              setCurrentZoomScale(zoomScale);
            }

            // 🎯 NEW APPROACH: Coordinate image and effects through React state coordination
            console.log(`🎬 Setting image URL and effects through React state coordination`);

            // Set effects state first, then image URL - this allows EmberPlay to coordinate properly
            setCurrentFadeEffect(fadeEffect);
            setCurrentPanEffect(panEffect);
            setCurrentZoomEffect(zoomEffect);

            // Set image URL - EmberPlay will now handle the coordination with effects
            setCurrentMediaImageUrl(resolvedMediaUrl);

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
            console.warn(`⚠️ Could not resolve media reference: ${segment.mediaPath || segment.mediaName || segment.mediaId}`);
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
          console.error(`❌ No audio available for voice segment [${currentStep.segment.voiceTag}] - skipping`);
          currentTimelineIndex++;
          playNextTimelineStep();
          return;
        }

        const audio = currentStep.audio.audio;
        const segment = currentStep.segment;

        console.log(`▶️ Playing voice segment: [${segment.voiceTag}]`);

        // Clear any color overlays during voice playback
        setCurrentVoiceType(null);
        setCurrentMediaColor(null);

        // 🎯 Simplified Text Display: Show full segment text when voice starts
        const displayText = segment.originalContent || segment.content;
        const voiceTag = segment.voiceTag;

        console.log(`📝 Displaying full segment text: "${displayText}"`);

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

          console.log(`✅ Completed voice segment: [${segment.voiceTag}]`);
          currentTimelineIndex++;
          playNextTimelineStep();
        };

        // Handle errors
        audio.onerror = (error) => {
          if (playbackStoppedRef.current) return; // Don't continue if playback was stopped

          console.error(`❌ Error playing voice segment [${segment.voiceTag}]:`, error);
          currentTimelineIndex++;
          playNextTimelineStep(); // Continue to next timeline step
        };

        // Play the audio
        audio.play().catch(error => {
          if (playbackStoppedRef.current) return; // Don't continue if playback was stopped

          console.error(`❌ Failed to play voice segment [${segment.voiceTag}]:`, error);
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