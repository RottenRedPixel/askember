import React, { useState, useEffect } from 'react';
import { getStoryCutAudioPreferences, getUserVoiceModel, updateMessageAudioPreference } from '@/lib/database';

/**
 * Audio controls for voice messages in story cuts (owner and contributors)
 * Extracted from EmberDetail.jsx to improve maintainability
 */
const MessageAudioControls = ({ line, messageIndex, messageType, storyMessages, ember, storyCutId, userId = null }) => {
    const [messagePreferences, setMessagePreferences] = useState({});
    const [preferencesLoaded, setPreferencesLoaded] = useState(false);

    // Expose data globally for debugging
    useEffect(() => {
        if (typeof window !== 'undefined') {
            window.storyMessages = storyMessages;
        }
    }, [storyMessages]);

    // Load preferences from database when component mounts
    useEffect(() => {
        const loadPreferences = async () => {
            if (!storyCutId) {
                setPreferencesLoaded(true);
                return;
            }

            try {
                console.log(`🔄 Loading audio preferences for story cut: ${storyCutId}`);
                const savedPreferences = await getStoryCutAudioPreferences(storyCutId);
                console.log(`✅ Loaded audio preferences:`, savedPreferences);
                if (savedPreferences) {
                    setMessagePreferences(savedPreferences);
                }
                setPreferencesLoaded(true);
            } catch (error) {
                console.error('Error loading audio preferences:', error);
                setPreferencesLoaded(true);
            }
        };

        loadPreferences();
    }, [storyCutId]);

    // Analyze this specific message and set defaults only if no saved preference exists
    useEffect(() => {
        const analyzeMessage = async () => {
            // Only run after preferences have been loaded from database
            if (!preferencesLoaded || !line || !storyMessages?.length) return;

            const messageKey = `${messageIndex}-${line.substring(0, 50)}`;

            // If we already have a saved preference for this message, don't override it
            if (messagePreferences[messageKey]) {
                console.log(`✅ Using saved preference for message ${messageIndex}: ${messagePreferences[messageKey]}`);
                return;
            }

            // Use provided userId or default to ember owner
            const targetUserId = userId || ember?.user_id;

            if (!targetUserId) return;

            try {
                // Check if user has a personal voice model
                const userVoiceModel = await getUserVoiceModel(targetUserId);
                const hasPersonalVoice = userVoiceModel && userVoiceModel.elevenlabs_voice_id;

                // Check if this message has recorded audio
                const hasRecordedAudio = messageType === 'audio';

                console.log(`🎤 Message ${messageIndex}: Recorded=${hasRecordedAudio}, Personal Voice=${hasPersonalVoice}, Type=${messageType}`);

                // Set smart defaults based on message type and available options
                let defaultPreference = 'text'; // fallback default

                if (messageType === 'audio') {
                    // Audio messages: prefer recorded → personal voice → text response
                    if (hasRecordedAudio) {
                        defaultPreference = 'recorded';
                    } else if (hasPersonalVoice) {
                        defaultPreference = 'personal';
                    } else {
                        defaultPreference = 'text';
                    }
                } else {
                    // Text messages: prefer text response → personal voice (no recorded option)
                    defaultPreference = 'text'; // Text messages naturally default to text response
                }

                console.log(`🎯 Setting default preference for message ${messageIndex}: ${defaultPreference}`);
                setMessagePreferences(prev => ({
                    ...prev,
                    [messageKey]: defaultPreference
                }));
            } catch (error) {
                console.log(`⚠️ Error analyzing message ${messageIndex}:`, error.message);
                // Still show controls even if there's an error - text response is always available
                setMessagePreferences(prev => ({
                    ...prev,
                    [messageKey]: 'text'
                }));
            }
        };

        analyzeMessage();
    }, [line, messageIndex, messageType, storyMessages, ember, userId, preferencesLoaded, messagePreferences]);

    // Note: Global preference setting removed to prevent conflicts with StoryCutStudio
    // StoryCutStudio is now the single source of truth for audio preferences

    const handlePreferenceChange = async (messageKey, preference) => {
        console.log(`🔄 Changing preference for message ${messageIndex} (${messageKey}): ${preference}`);

        // Update local state immediately
        setMessagePreferences(prev => ({
            ...prev,
            [messageKey]: preference
        }));

        // Save to database
        if (storyCutId) {
            try {
                console.log(`💾 Saving preference to database: storyCutId=${storyCutId}, messageKey=${messageKey}, preference=${preference}`);
                const result = await updateMessageAudioPreference(storyCutId, messageKey, preference);
                console.log(`✅ Saved preference for message ${messageIndex}: ${preference}`, result);
            } catch (error) {
                console.error('❌ Error saving audio preference:', error);
            }
        } else {
            console.warn('⚠️ No storyCutId provided - cannot save preference');
        }
    };

    // Show contextual controls based on original message type
    const messageKey = `${messageIndex}-${line.substring(0, 50)}`;
    const showRecordedOption = messageType === 'audio'; // Only show "Recorded" if original was audio

    return (
        <div className="flex items-center space-x-2 text-xs">
            {/* 🎙️ Recorded - Only show for original audio messages */}
            {showRecordedOption && (
                <label className="flex items-center space-x-1 cursor-pointer">
                    <input
                        type="radio"
                        name={`message-${messageKey}`}
                        value="recorded"
                        checked={messagePreferences[messageKey] === 'recorded'}
                        onChange={(e) => handlePreferenceChange(messageKey, e.target.value)}
                        className="text-green-600 focus:ring-green-500 w-3 h-3"
                    />
                    <span className="text-xs text-gray-700">🎙️ Recorded</span>
                </label>
            )}

            {/* 🎤 Synth Voice - Always available */}
            <label className="flex items-center space-x-1 cursor-pointer">
                <input
                    type="radio"
                    name={`message-${messageKey}`}
                    value="personal"
                    checked={messagePreferences[messageKey] === 'personal'}
                    onChange={(e) => handlePreferenceChange(messageKey, e.target.value)}
                    className="text-green-600 focus:ring-green-500 w-3 h-3"
                />
                <span className="text-xs text-gray-700">🎤 Synth Voice</span>
            </label>

            {/* 📝 Text Response - Always available */}
            <label className="flex items-center space-x-1 cursor-pointer">
                <input
                    type="radio"
                    name={`message-${messageKey}`}
                    value="text"
                    checked={messagePreferences[messageKey] === 'text'}
                    onChange={(e) => handlePreferenceChange(messageKey, e.target.value)}
                    className="text-green-600 focus:ring-green-500 w-3 h-3"
                />
                <span className="text-xs text-gray-700">📝 Text Response</span>
            </label>
        </div>
    );
};

export default MessageAudioControls;

// Legacy export for backward compatibility
export { MessageAudioControls as OwnerMessageAudioControls }; 