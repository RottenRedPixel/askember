import React, { useState, useEffect } from 'react';
import { getStoryCutAudioPreferences, getUserVoiceModel, updateMessageAudioPreference } from '@/lib/database';

/**
 * Audio controls for owner messages in story cuts
 * Extracted from EmberDetail.jsx to improve maintainability
 */
const OwnerMessageAudioControls = ({ line, messageIndex, messageType, storyMessages, ember, storyCutId }) => {
    const [messagePreferences, setMessagePreferences] = useState({});

    // Expose data globally for debugging
    useEffect(() => {
        if (typeof window !== 'undefined') {
            window.storyMessages = storyMessages;
        }
    }, [storyMessages]);

    // Load preferences from database when component mounts
    useEffect(() => {
        const loadPreferences = async () => {
            if (!storyCutId) return;

            try {
                const savedPreferences = await getStoryCutAudioPreferences(storyCutId);
                if (savedPreferences) {
                    setMessagePreferences(savedPreferences);
                }
            } catch (error) {
                console.error('Error loading audio preferences:', error);
            }
        };

        loadPreferences();
    }, [storyCutId]);

    // Analyze this specific message
    useEffect(() => {
        const analyzeMessage = async () => {
            if (!line || !storyMessages?.length || !ember?.user_id) return;

            const messageKey = `${messageIndex}-${line.substring(0, 50)}`;

            try {
                // Check if owner has a personal voice model
                const userVoiceModel = await getUserVoiceModel(ember.user_id);
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

                setMessagePreferences(prev => ({
                    ...prev,
                    [messageKey]: prev[messageKey] || defaultPreference
                }));
            } catch (error) {
                console.log(`⚠️ Error analyzing message ${messageIndex}:`, error.message);
                // Still show controls even if there's an error - text response is always available
                setMessagePreferences(prev => ({
                    ...prev,
                    [messageKey]: prev[messageKey] || 'text'
                }));
            }
        };

        analyzeMessage();
    }, [line, messageIndex, messageType, storyMessages, ember]);

    // Store preferences globally for audio generation
    useEffect(() => {
        if (typeof window !== 'undefined') {
            window.messageAudioPreferences = messagePreferences;
        }
    }, [messagePreferences]);

    const handlePreferenceChange = async (messageKey, preference) => {
        // Update local state immediately
        setMessagePreferences(prev => ({
            ...prev,
            [messageKey]: preference
        }));

        // Save to database
        if (storyCutId) {
            try {
                await updateMessageAudioPreference(storyCutId, messageKey, preference);
                console.log(`✅ Saved preference for message ${messageIndex}: ${preference}`);
            } catch (error) {
                console.error('Error saving audio preference:', error);
            }
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

export default OwnerMessageAudioControls; 