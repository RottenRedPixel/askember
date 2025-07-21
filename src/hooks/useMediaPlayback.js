import { handlePlaybackComplete as handleMediaPlaybackComplete, handleExitPlay as handleMediaExitPlay } from '@/lib/mediaHandlers';

export const useMediaPlayback = ({
    // UI state setters and values needed for playback control
    setIsPlayerFadingOut,
    setIsPlaying,
    setShowFullscreenPlay,
    setCurrentlyPlayingStoryCut,
    setActiveAudioSegments,
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
    setMediaTimeouts,
    // Values needed for handlers
    currentAudio,
    activeAudioSegments,
    sentenceTimeouts,
    mediaTimeouts,
    mediaTimeoutsRef,
    playbackStoppedRef
}) => {
    // Handle preview playback completion
    const handlePlaybackComplete = () => {
        // Start fade-out animation
        setIsPlayerFadingOut(true);

        // After fade-out completes, handle the actual completion
        setTimeout(() => {
            handleMediaPlaybackComplete({
                setIsPlaying,
                setShowFullscreenPlay,
                setCurrentlyPlayingStoryCut,
                setActiveAudioSegments,
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
                setMediaTimeouts,
                sentenceTimeouts,
                mediaTimeouts,
                mediaTimeoutsRef
            });
            setIsPlayerFadingOut(false);
        }, 600); // Match fade-out duration
    };

    const handleExitPlay = () => {
        // Start fade-out animation
        setIsPlayerFadingOut(true);

        // After fade-out completes, handle the actual exit
        setTimeout(() => {
            handleMediaExitPlay({
                currentAudio,
                setIsPlaying,
                setShowFullscreenPlay,
                setCurrentlyPlayingStoryCut,
                activeAudioSegments,
                setActiveAudioSegments,
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
                setMediaTimeouts,
                sentenceTimeouts,
                mediaTimeouts,
                mediaTimeoutsRef,
                playbackStoppedRef
            });
            setIsPlayerFadingOut(false);
        }, 600); // Match fade-out duration
    };

    return {
        handlePlaybackComplete,
        handleExitPlay
    };
}; 