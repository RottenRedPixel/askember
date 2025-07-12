import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import EmberPlay from './EmberPlay';
import { useEmberData } from '@/lib/useEmberData';
import { useAudioState } from '@/lib/useUIState';
import { handlePlay as handleMediaPlay, handlePlaybackComplete as handleMediaPlaybackComplete, handleExitPlay as handleMediaExitPlay } from '@/lib/mediaHandlers';
import useStore from '@/store';

// Example usage of the standalone EmberPlay component
export default function EmberPlayExample() {
    // Get user data from store
    const { userProfile } = useStore();
    
    // For testing purposes, we'll try to get ember ID from URL params, 
    // or use a hardcoded test ID if none provided
    const { id: urlId } = useParams();
    const testEmberId = urlId || '1'; // Use URL param or fallback to '1' for testing
    
    // Get real ember data using the same hook as EmberDetail
    const {
        ember,
        loading,
        error,
        sharedUsers,
        storyCuts,
        primaryStoryCut,
        selectedEmberVoice
    } = useEmberData(testEmberId, userProfile);

    // Use real audio state management
    const {
        isPlaying, setIsPlaying,
        isGeneratingAudio, setIsGeneratingAudio,
        showFullscreenPlay, setShowFullscreenPlay,
        isPlayerFadingOut, setIsPlayerFadingOut,
        currentAudio, setCurrentAudio,
        activeAudioSegments, setActiveAudioSegments,
        showEndHold, setShowEndHold,
        currentVoiceType, setCurrentVoiceType,
        currentVoiceTransparency, setCurrentVoiceTransparency,
        currentMediaColor, setCurrentMediaColor,
        currentZoomScale, setCurrentZoomScale,
        currentMediaImageUrl, setCurrentMediaImageUrl,
        currentlyPlayingStoryCut, setCurrentlyPlayingStoryCut,
        currentDisplayText, setCurrentDisplayText,
        currentVoiceTag, setCurrentVoiceTag,
        currentSentenceIndex, setCurrentSentenceIndex,
        currentSegmentSentences, setCurrentSegmentSentences,
        sentenceTimeouts, setSentenceTimeouts,
        mediaTimeouts, setMediaTimeouts,
        playbackStoppedRef,
        mediaTimeoutsRef
    } = useAudioState();

    // Message state for error handling
    const [message, setMessage] = useState(null);

    // Real handlePlay function using actual audio generation
    const handlePlay = async () => {
        await handleMediaPlay(ember, storyCuts, primaryStoryCut, selectedEmberVoice, { isPlaying }, {
            setShowFullscreenPlay,
            setIsGeneratingAudio,
            setCurrentlyPlayingStoryCut,
            setIsPlaying,
            setCurrentAudio,
            handleExitPlay,
            handlePlaybackComplete,
            setActiveAudioSegments,
            playbackStoppedRef,
            setCurrentVoiceType,
            setCurrentVoiceTransparency,
            setCurrentMediaColor,
            setCurrentZoomScale,
            setCurrentMediaImageUrl,
            setCurrentDisplayText,
            setCurrentVoiceTag,
            setCurrentSentenceIndex,
            setCurrentSegmentSentences,
            setSentenceTimeouts,
            sentenceTimeouts,
            setMediaTimeouts,
            mediaTimeouts,
            mediaTimeoutsRef,
            setMessage
        });
    };

    // Real handleExitPlay function
    const handleExitPlay = () => {
        handleMediaExitPlay(
            setIsPlaying,
            setShowFullscreenPlay,
            setIsPlayerFadingOut,
            setCurrentAudio,
            setActiveAudioSegments,
            setShowEndHold,
            setCurrentVoiceType,
            setCurrentVoiceTransparency,
            setCurrentMediaColor,
            setCurrentZoomScale,
            setCurrentMediaImageUrl,
            setCurrentlyPlayingStoryCut,
            setCurrentDisplayText,
            setCurrentVoiceTag,
            setCurrentSentenceIndex,
            setCurrentSegmentSentences,
            setSentenceTimeouts,
            setMediaTimeouts,
            playbackStoppedRef,
            mediaTimeoutsRef
        );
    };

    // Real handlePlaybackComplete function
    const handlePlaybackComplete = () => {
        handleMediaPlaybackComplete(
            setIsPlaying,
            setShowFullscreenPlay,
            setIsPlayerFadingOut,
            setCurrentAudio,
            setActiveAudioSegments,
            setShowEndHold,
            setCurrentVoiceType,
            setCurrentVoiceTransparency,
            setCurrentMediaColor,
            setCurrentZoomScale,
            setCurrentMediaImageUrl,
            setCurrentlyPlayingStoryCut,
            setCurrentDisplayText,
            setCurrentVoiceTag,
            setCurrentSentenceIndex,
            setCurrentSegmentSentences,
            setSentenceTimeouts,
            setMediaTimeouts,
            playbackStoppedRef,
            mediaTimeoutsRef
        );
    };

    // Handle loading state
    if (loading) {
        return (
            <div className="p-8 text-center">
                <div className="text-lg text-gray-500">Loading ember data...</div>
            </div>
        );
    }

    // Handle error state
    if (error || !ember) {
        return (
            <div className="p-8 text-center">
                <div className="text-red-600">
                    Error loading ember data: {error || 'Ember not found'}
                </div>
                <p className="mt-2 text-gray-600">
                    Try using a valid ember ID: <code>/test-emberplay/:emberId</code>
                </p>
            </div>
        );
    }

    return (
        <div>
            {/* Show a simple trigger button when not playing */}
            {!isPlaying && !isGeneratingAudio && (
                <div className="p-8">
                    <button
                        onClick={handlePlay}
                        className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700"
                    >
                        Test EmberPlay Component
                    </button>
                    <p className="mt-4 text-gray-600">
                        Click to test the standalone EmberPlay interface with real data
                    </p>
                    <div className="mt-4 p-4 bg-gray-100 rounded-lg">
                        <h3 className="font-semibold">Loaded Ember Data:</h3>
                        <p><strong>Title:</strong> {ember.title || 'Untitled'}</p>
                        <p><strong>Owner:</strong> {ember.owner ? `${ember.owner.first_name} ${ember.owner.last_name}` : 'Unknown'}</p>
                        <p><strong>Shared Users:</strong> {sharedUsers?.length || 0}</p>
                        <p><strong>Story Cuts:</strong> {storyCuts?.length || 0}</p>
                        <p><strong>Primary Story Cut:</strong> {primaryStoryCut?.title || 'None'}</p>
                        <p><strong>Selected Voice:</strong> {selectedEmberVoice || 'None'}</p>
                    </div>
                    {message && (
                        <div className={`mt-4 p-4 rounded-lg ${message.type === 'error' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
                            {message.text}
                        </div>
                    )}
                </div>
            )}

            {/* Show EmberPlay when active */}
            {(isPlaying || isGeneratingAudio) && (
                <EmberPlay
                    ember={ember}
                    sharedUsers={sharedUsers || []}
                    isPlaying={isPlaying}
                    isGeneratingAudio={isGeneratingAudio}
                    showEndHold={showEndHold}
                    currentDisplayText={currentDisplayText}
                    currentSegmentSentences={currentSegmentSentences}
                    currentSentenceIndex={currentSentenceIndex}
                    currentMediaColor={currentMediaColor}
                    currentMediaImageUrl={currentMediaImageUrl}
                    currentlyPlayingStoryCut={currentlyPlayingStoryCut}
                    onPlay={handlePlay}
                    onExitPlay={handleExitPlay}
                />
            )}
        </div>
    );
} 