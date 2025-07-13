import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { PlayCircle, X, Gear } from 'phosphor-react';
import { useEmberData } from '@/lib/useEmberData';
import { useUIState } from '@/lib/useUIState';
import { autoTriggerImageAnalysis, autoTriggerExifProcessing, autoTriggerLocationProcessing, handlePlay as handleMediaPlay, handlePlaybackComplete as handleMediaPlaybackComplete, handleExitPlay as handleMediaExitPlay } from '@/lib/mediaHandlers';
import { debugRecordedAudio, generateSegmentAudio, playMultiVoiceAudio } from '@/lib/emberPlayer';
import useStore from '@/store';

// CSS keyframes for fade-in animation
const fadeInKeyframes = `
  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
`;

export default function EmberPlay() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user, userProfile } = useStore();

    console.log('🎬 EmberPlay: Rendering');
    console.log('🎬 EmberPlay: Current URL:', window.location.href);
    console.log('🎬 EmberPlay: Ember ID:', id);

    // Use the same data fetching hooks as EmberDetail
    const {
        ember,
        loading,
        error,
        sharedUsers,
        storyCuts,
        primaryStoryCut,
        selectedEmberVoice,
        fetchEmber,
        fetchStoryCuts
    } = useEmberData(id, userProfile);

    // Force refresh story cuts when component mounts to ensure latest script
    useEffect(() => {
        if (fetchStoryCuts && id) {
            console.log('🔄 EmberPlay: Force refreshing story cuts to get latest script...');
            // Add a small delay to avoid race conditions with initial data loading
            const timer = setTimeout(() => {
                fetchStoryCuts();
            }, 100);
            return () => clearTimeout(timer);
        }
    }, [id]); // Only depend on ID to avoid infinite loops

    // Use the same UI state hooks as EmberDetail
    const {
        showFullscreenPlay,
        setShowFullscreenPlay,
        isPlaying,
        setIsPlaying,
        isGeneratingAudio,
        setIsGeneratingAudio,
        currentlyPlayingStoryCut,
        setCurrentlyPlayingStoryCut,
        currentAudio,
        setCurrentAudio,
        currentDisplayText,
        setCurrentDisplayText,
        currentVoiceTag,
        setCurrentVoiceTag,
        currentMediaColor,
        setCurrentMediaColor,
        currentMediaImageUrl,
        setCurrentMediaImageUrl,
        currentZoomScale,
        setCurrentZoomScale,
        currentVoiceType,
        setCurrentVoiceType,
        currentVoiceTransparency,
        setCurrentVoiceTransparency,
        currentLoadingState,
        setCurrentLoadingState,
        currentLoadingMessage,
        setCurrentLoadingMessage,
        currentLoadingIcon,
        setCurrentLoadingIcon,
        currentSentenceIndex,
        setCurrentSentenceIndex,
        currentSegmentSentences,
        setCurrentSegmentSentences,
        sentenceTimeouts,
        setSentenceTimeouts,
        mediaTimeouts,
        setMediaTimeouts,
        activeAudioSegments,
        setActiveAudioSegments,
        currentFadeEffect,
        setCurrentFadeEffect,
        currentPanEffect,
        setCurrentPanEffect,
        currentZoomEffect,
        setCurrentZoomEffect,
        showEndHold,
        setShowEndHold,
        message,
        setMessage
    } = useUIState();

    // Playback control refs
    const playbackStoppedRef = useRef(false);
    const mediaTimeoutsRef = useRef([]);

    // Auto-trigger background processing when ember loads (removed for shared users)
    // These functions are not needed for public sharing
    /*
    useEffect(() => {
        if (ember && ember.id && user) {
            // Only trigger for authenticated users
            autoTriggerImageAnalysis(ember, setMessage);
            autoTriggerExifProcessing(ember, setMessage);
            autoTriggerLocationProcessing(ember, setMessage);
        }
    }, [ember, setMessage, user]);
    */

    // Initialize fullscreen play mode
    useEffect(() => {
        setShowFullscreenPlay(true);
    }, [setShowFullscreenPlay]);



    // Debug recorded audio data when primaryStoryCut is available
    useEffect(() => {
        if (primaryStoryCut) {
            console.log('🔍 EMBERPLAY DEBUG - Primary Story Cut:', primaryStoryCut.title);
            console.log('🎙️ EMBERPLAY DEBUG - Recorded Audio in Metadata:', primaryStoryCut.metadata?.recordedAudio);
            console.log('📊 EMBERPLAY DEBUG - Full Metadata:', primaryStoryCut.metadata);
        }
    }, [primaryStoryCut]);

    // 🐛 DEBUG: Expose debug helpers globally for EmberPlay
    useEffect(() => {
        window.EmberPlayActions = {
            debugRecordedAudio: (recordedAudio, scriptSegments) => {
                debugRecordedAudio(recordedAudio, scriptSegments);
            },
            inspectStoryCut: () => {
                if (primaryStoryCut) {
                    console.log('🔍 EMBERPLAY STORY CUT INSPECTION:');
                    console.log('📝 Title:', primaryStoryCut.title);
                    console.log('🎭 Contributors:', primaryStoryCut.selected_contributors);
                    console.log('🎙️ Recorded Audio in Metadata:', primaryStoryCut.metadata?.recordedAudio);
                    console.log('📊 Full Metadata:', primaryStoryCut.metadata);
                    console.log('🔍 Full Story Cut Object:', primaryStoryCut);
                }
            }
        };

        return () => {
            delete window.EmberPlayActions;
        };
    }, [primaryStoryCut]);

    // Inject CSS keyframes for fade-in animation
    useEffect(() => {
        const style = document.createElement('style');
        style.textContent = fadeInKeyframes;
        document.head.appendChild(style);
        return () => document.head.removeChild(style);
    }, []);

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
            setCurrentLoadingState,
            setCurrentLoadingMessage,
            setCurrentLoadingIcon,
            setCurrentDisplayText,
            setCurrentVoiceTag,
            setCurrentSentenceIndex,
            setCurrentSegmentSentences,
            setSentenceTimeouts,
            sentenceTimeouts,
            setMediaTimeouts,
            mediaTimeouts,
            mediaTimeoutsRef,
            setMessage,
            setCurrentFadeEffect,
            setCurrentPanEffect,
            setCurrentZoomEffect
        });
    };

    const handleStop = () => {
        console.log('🛑 Stop button pressed - immediately stopping all audio...');

        // CRITICAL: Set stop flag FIRST to prevent any new audio from starting
        playbackStoppedRef.current = true;

        // Stop the main current audio if it exists
        if (currentAudio) {
            console.log('🛑 Stopping current audio...');
            currentAudio.pause();
            currentAudio.currentTime = 0;
        }

        // Stop ALL active audio segments (multi-voice system)
        if (activeAudioSegments && activeAudioSegments.length > 0) {
            console.log(`🛑 Stopping ${activeAudioSegments.length} active audio segments...`);
            activeAudioSegments.forEach((audioSegment, index) => {
                if (audioSegment && audioSegment.audio) {
                    try {
                        audioSegment.audio.pause();
                        audioSegment.audio.currentTime = 0;
                        console.log(`✅ Stopped audio segment ${index + 1}: [${audioSegment.voiceTag}]`);
                    } catch (error) {
                        console.warn(`⚠️ Error stopping audio segment ${index + 1}:`, error);
                    }
                }
            });
        }

        // Update state immediately
        setIsPlaying(false);
        setCurrentlyPlayingStoryCut(null);
        setCurrentAudio(null);

        // Clear all timeouts immediately
        sentenceTimeouts.forEach(timeout => clearTimeout(timeout));
        setSentenceTimeouts([]);
        mediaTimeouts.forEach(timeout => clearTimeout(timeout));
        setMediaTimeouts([]);
        mediaTimeoutsRef.current.forEach(timeout => clearTimeout(timeout));
        mediaTimeoutsRef.current = [];

        // Reset visual states immediately
        setCurrentDisplayText('');
        setCurrentVoiceTag('');
        setCurrentMediaColor(null);
        setCurrentMediaImageUrl(null);
        setCurrentZoomScale(1);
        setCurrentVoiceType(null);
        setCurrentVoiceTransparency(0);
        setCurrentLoadingState(false);
        setCurrentLoadingMessage('');
        setCurrentLoadingIcon('default');
        setCurrentSentenceIndex(0);
        setCurrentSegmentSentences([]);
        setActiveAudioSegments([]);
        setCurrentFadeEffect(null);
        setCurrentPanEffect(null);
        setCurrentZoomEffect(null);
        setShowEndHold(false);

        console.log('✅ All audio stopped immediately');
    };

    const handleExitPlay = () => {
        handleStop();
        // If user is authenticated, go to management view, otherwise go to home
        if (user) {
            navigate(`/embers/${id}/manage`);
        } else {
            navigate('/');
        }
    };

    const handlePlaybackComplete = () => {
        // Reset playback state
        setIsPlaying(false);
        setCurrentlyPlayingStoryCut(null);
        setCurrentAudio(null);
        setCurrentDisplayText('');
        setCurrentVoiceTag('');
        setCurrentMediaColor(null);
        setCurrentMediaImageUrl(null);
        setCurrentZoomScale(1);
        setCurrentVoiceType(null);
        setCurrentVoiceTransparency(0);
        setCurrentLoadingState(false);
        setCurrentLoadingMessage('');
        setCurrentLoadingIcon('default');
        setCurrentSentenceIndex(0);
        setCurrentSegmentSentences([]);
        setActiveAudioSegments([]);
        setCurrentFadeEffect(null);
        setCurrentPanEffect(null);
        setCurrentZoomEffect(null);
        setShowEndHold(true);

        // Clear timeouts
        sentenceTimeouts.forEach(timeout => clearTimeout(timeout));
        setSentenceTimeouts([]);
        mediaTimeouts.forEach(timeout => clearTimeout(timeout));
        setMediaTimeouts([]);
        mediaTimeoutsRef.current = [];
    };

    // Helper function to get the correct CSS class for pan/zoom effects
    const getEffectClass = (effect, effectType) => {
        if (!effect) return '';

        if (effectType === 'pan') {
            const duration = Math.round(effect.duration || 1);
            return `ember-pan-${effect.direction}-${duration}s`;
        } else if (effectType === 'zoom') {
            const duration = Math.round(effect.duration || 1);
            return `ember-zoom-${effect.type}-${duration}s`;
        }

        return '';
    };

    // Show loading state
    if (loading) {
        return (
            <div className="fixed inset-0 z-50 bg-black flex items-center justify-center">
                <div className="flex flex-col items-center space-y-4">
                    <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-white text-lg font-medium">Loading ember...</p>
                </div>
            </div>
        );
    }

    // Show error state
    if (error) {
        return (
            <div className="fixed inset-0 z-50 bg-black flex items-center justify-center">
                <div className="flex flex-col items-center space-y-4 text-center">
                    <div className="text-red-500 text-6xl">⚠️</div>
                    <p className="text-white text-lg font-medium">Error loading ember</p>
                    <p className="text-gray-300 text-sm">{error}</p>
                    <button
                        onClick={() => navigate('/')}
                        className="mt-4 px-4 py-2 bg-white text-black rounded-lg hover:bg-gray-200 transition-colors"
                    >
                        Go Home
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-50" data-component="EmberPlay-standalone">
            {/* Mobile Layout */}
            <div className="md:hidden h-screen overflow-hidden">
                <Card className="py-0 w-full h-full bg-black rounded-none">
                    <CardContent className="p-0 h-full">
                        <div className="h-full flex flex-col bg-black overflow-hidden">
                            {/* Photo Area - 65vh */}
                            <div className="relative w-screen left-1/2 right-1/2 -translate-x-1/2 flex-shrink-0 h-[65vh] overflow-hidden bg-black">
                                {/* Title Overlay */}
                                <div className="absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black/60 to-transparent pointer-events-none z-20">
                                    <div className="container mx-auto max-w-4xl">
                                        <h1 className="text-white text-2xl font-bold truncate drop-shadow-md text-left pl-2">
                                            {ember?.title || 'Untitled Ember'}
                                        </h1>
                                    </div>
                                </div>



                                {/* Background Image - with visual effects coordination */}
                                {!isGeneratingAudio && !showEndHold && !currentMediaColor && currentMediaImageUrl && (
                                    <img
                                        src={currentMediaImageUrl}
                                        alt={ember?.title || 'Ember'}
                                        className={`absolute inset-0 w-full h-full object-cover ${currentFadeEffect
                                            ? currentFadeEffect.type === 'in'
                                                ? 'opacity-0 transition-opacity duration-1000 animate-fade-in'
                                                : 'opacity-100 transition-opacity duration-1000'
                                            : 'opacity-100 transition-opacity duration-1000'
                                            } ${getEffectClass(currentZoomEffect, 'zoom')}`}
                                        style={{
                                            opacity: currentFadeEffect?.type === 'in' ? 0 : 1,
                                            animation: currentFadeEffect?.type === 'in'
                                                ? 'fadeIn 1s ease-in-out forwards'
                                                : currentPanEffect
                                                    ? `pan-${currentPanEffect.direction} ${currentPanEffect.duration}s ease-out forwards`
                                                    : currentZoomEffect
                                                        ? `zoom-${currentZoomEffect.type} ${currentZoomEffect.duration}s ease-out forwards`
                                                        : 'none'
                                        }}
                                    />
                                )}

                                {/* Show main ember image when no media image and playing without story cut - with visual effects coordination */}
                                {!isGeneratingAudio && !showEndHold && !currentMediaColor && !currentMediaImageUrl && (isPlaying && !currentlyPlayingStoryCut) && ember?.image_url && (
                                    <img
                                        src={ember.image_url}
                                        alt={ember?.title || 'Ember'}
                                        className={`absolute inset-0 w-full h-full object-cover ${currentFadeEffect
                                            ? currentFadeEffect.type === 'in'
                                                ? 'opacity-0 transition-opacity duration-1000 animate-fade-in'
                                                : 'opacity-100 transition-opacity duration-1000'
                                            : 'opacity-100'
                                            } ${getEffectClass(currentZoomEffect, 'zoom')}`}
                                        style={{
                                            opacity: currentFadeEffect?.type === 'in' ? 0 : 1,
                                            animation: currentFadeEffect?.type === 'in'
                                                ? 'fadeIn 1s ease-in-out forwards'
                                                : currentPanEffect
                                                    ? `pan-${currentPanEffect.direction} ${currentPanEffect.duration}s ease-out forwards`
                                                    : currentZoomEffect
                                                        ? `zoom-${currentZoomEffect.type} ${currentZoomEffect.duration}s ease-out forwards`
                                                        : 'none'
                                        }}
                                    />
                                )}

                                {/* Default ember image when not playing */}
                                {!isPlaying && !isGeneratingAudio && !showEndHold && !currentMediaColor && !currentMediaImageUrl && ember?.image_url && (
                                    <img
                                        src={ember.image_url}
                                        alt={ember?.title || 'Ember'}
                                        className="absolute inset-0 w-full h-full object-cover"
                                    />
                                )}

                                {/* Media Color Screen - solid color background when color effect is active */}
                                {!isGeneratingAudio && !showEndHold && currentMediaColor && (
                                    <div
                                        className="absolute inset-0"
                                        style={{
                                            backgroundColor: currentMediaColor
                                        }}
                                    />
                                )}

                                {/* Loading Screen - shows when generating audio OR when currentLoadingState is true */}
                                {(isGeneratingAudio || currentLoadingState) && (
                                    <div className="absolute inset-0 flex flex-col items-center justify-center" style={{ backgroundColor: 'black' }}>
                                        <div className="flex flex-col items-center space-y-4">
                                            {/* Loading Spinner */}
                                            <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
                                            {/* Loading Message */}
                                            <p className="text-white text-lg font-medium text-center">
                                                {isGeneratingAudio ?
                                                    "Preparing Story..." :
                                                    currentLoadingMessage
                                                }
                                            </p>
                                        </div>
                                    </div>
                                )}

                                {/* Bottom right capsule: Main EmberPlay capsule in top section */}
                                <div className="absolute right-4 bottom-4 z-[60]">
                                    <div className="flex flex-col items-center gap-2 bg-white/50 backdrop-blur-sm px-2 py-3 rounded-full shadow-lg">
                                        {/* Exit Button */}
                                        <button
                                            className="p-1 hover:bg-white/50 rounded-full transition-colors"
                                            onClick={handleExitPlay}
                                            aria-label="Exit EmberPlay"
                                            type="button"
                                        >
                                            <X size={24} weight="bold" className="text-gray-700" />
                                        </button>

                                        {/* Horizontal Divider */}
                                        <div className="w-4 h-px bg-gray-400 my-1"></div>

                                        {/* Owner Avatar - Always at the top of the stack */}
                                        {ember?.owner && (
                                            <div
                                                className="p-1 hover:bg-white/70 rounded-full transition-colors"
                                                style={{
                                                    marginTop: '0px',
                                                    zIndex: 35 // Highest z-index to appear on top
                                                }}
                                                title={`${ember.owner.first_name || ''} ${ember.owner.last_name || ''}`.trim() || 'Owner'}
                                            >
                                                <Avatar className="h-6 w-6 ring-2 ring-amber-400">
                                                    <AvatarImage
                                                        src={ember.owner.avatar_url}
                                                        alt={`${ember.owner.first_name || ''} ${ember.owner.last_name || ''}`.trim() || 'Owner'}
                                                    />
                                                    <AvatarFallback className="text-xs bg-amber-100 text-amber-700">
                                                        {ember.owner.first_name?.[0] || ember.owner.last_name?.[0] || 'O'}
                                                    </AvatarFallback>
                                                </Avatar>
                                            </div>
                                        )}

                                        {/* Invited Users Avatars - Stacked with 16px overlap */}
                                        {sharedUsers.map((sharedUser, index) => (
                                            <div
                                                key={sharedUser.id || index}
                                                className="p-1 hover:bg-white/70 rounded-full transition-colors"
                                                style={{
                                                    marginTop: ember?.owner ? '-24px' : (index === 0 ? '-8px' : '-24px'),
                                                    zIndex: ember?.owner ? (34 - index) : (30 - index) // Adjust z-index if owner is present
                                                }}
                                                title={`${sharedUser.first_name || ''} ${sharedUser.last_name || ''}`.trim() || sharedUser.email}
                                            >
                                                <Avatar className="h-6 w-6 ring-1 ring-white">
                                                    <AvatarImage
                                                        src={sharedUser.avatar_url}
                                                        alt={`${sharedUser.first_name || ''} ${sharedUser.last_name || ''}`.trim() || sharedUser.email}
                                                    />
                                                    <AvatarFallback className="text-xs bg-gray-200 text-gray-700">
                                                        {sharedUser.first_name?.[0] || sharedUser.last_name?.[0] || sharedUser.email?.[0]?.toUpperCase() || '?'}
                                                    </AvatarFallback>
                                                </Avatar>
                                            </div>
                                        ))}

                                        {/* Horizontal divider */}
                                        <div className="h-px w-6 bg-gray-300 my-1"></div>

                                        {/* Play/Stop Button - toggles between play and stop */}
                                        <button
                                            className="p-1 hover:bg-white/70 rounded-full transition-colors"
                                            onClick={isPlaying ? handleStop : handlePlay}
                                            aria-label={isGeneratingAudio ? "Preparing Story..." : (isPlaying ? "Stop story" : "Play story")}
                                            type="button"
                                            disabled={isGeneratingAudio}
                                        >
                                            {isGeneratingAudio ? (
                                                <div className="w-6 h-6 flex items-center justify-center">
                                                    <div className="w-4 h-4 border-2 border-gray-700 border-t-transparent rounded-full animate-spin" />
                                                </div>
                                            ) : isPlaying ? (
                                                <div className="w-6 h-6 flex items-center justify-center">
                                                    <div className="w-4 h-4 border-2 border-gray-700 rounded-sm"></div>
                                                </div>
                                            ) : (
                                                <PlayCircle size={24} className="text-gray-700" />
                                            )}
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Bottom Section - Text Display Area - 35vh */}
                            <div className="relative flex-1 h-[35vh] overflow-hidden">
                                {/* Background for text area */}
                                <div className="absolute inset-0 bg-black"></div>

                                {/* Text Display */}
                                <div className="absolute inset-0 flex items-center justify-center p-6">
                                    <div className="text-center max-w-md">
                                        {currentDisplayText && (
                                            <div className="mb-4">
                                                <p className="text-white text-xl font-bold leading-relaxed">
                                                    {currentDisplayText}
                                                </p>
                                            </div>
                                        )}

                                        {!isPlaying && !isGeneratingAudio && !currentDisplayText && (
                                            <div className="text-center">
                                                <p className="text-white text-lg leading-relaxed">
                                                    Press play to start this Ember
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* End hold screen */}
                                {showEndHold && (
                                    <div className="absolute inset-0 flex items-center justify-center bg-black">
                                        <div className="text-center">
                                            <p className="text-white text-xl mb-4">
                                                {ember?.title || 'Untitled Ember'}
                                            </p>
                                            <p className="text-gray-400 text-sm">
                                                Story complete
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Desktop Layout */}
            <div className="hidden md:block h-screen overflow-hidden">
                <Card className="py-0 w-full h-full bg-black rounded-none">
                    <CardContent className="p-0 h-full">
                        <div className="h-full flex bg-black overflow-hidden">
                            {/* Left side - Photo Area */}
                            <div className="relative flex-1 overflow-hidden bg-black">
                                {/* Title Overlay */}
                                <div className="absolute top-0 left-0 right-0 p-6 bg-gradient-to-b from-black/60 to-transparent pointer-events-none z-20">
                                    <h1 className="text-white text-3xl font-bold truncate drop-shadow-md">
                                        {ember?.title || 'Untitled Ember'}
                                    </h1>
                                </div>



                                {/* Background Image - with visual effects coordination */}
                                {!isGeneratingAudio && !showEndHold && !currentMediaColor && currentMediaImageUrl && (
                                    <img
                                        src={currentMediaImageUrl}
                                        alt={ember?.title || 'Ember'}
                                        className={`absolute inset-0 w-full h-full object-cover ${currentFadeEffect
                                            ? currentFadeEffect.type === 'in'
                                                ? 'opacity-0 transition-opacity duration-1000 animate-fade-in'
                                                : 'opacity-100 transition-opacity duration-1000'
                                            : 'opacity-100 transition-opacity duration-1000'
                                            } ${getEffectClass(currentZoomEffect, 'zoom')}`}
                                        style={{
                                            opacity: currentFadeEffect?.type === 'in' ? 0 : 1,
                                            animation: currentFadeEffect?.type === 'in'
                                                ? 'fadeIn 1s ease-in-out forwards'
                                                : currentPanEffect
                                                    ? `pan-${currentPanEffect.direction} ${currentPanEffect.duration}s ease-out forwards`
                                                    : currentZoomEffect
                                                        ? `zoom-${currentZoomEffect.type} ${currentZoomEffect.duration}s ease-out forwards`
                                                        : 'none'
                                        }}
                                    />
                                )}

                                {/* Show main ember image when no media image and playing without story cut - with visual effects coordination */}
                                {!isGeneratingAudio && !showEndHold && !currentMediaColor && !currentMediaImageUrl && (isPlaying && !currentlyPlayingStoryCut) && ember?.image_url && (
                                    <img
                                        src={ember.image_url}
                                        alt={ember?.title || 'Ember'}
                                        className={`absolute inset-0 w-full h-full object-cover ${currentFadeEffect
                                            ? currentFadeEffect.type === 'in'
                                                ? 'opacity-0 transition-opacity duration-1000 animate-fade-in'
                                                : 'opacity-100 transition-opacity duration-1000'
                                            : 'opacity-100'
                                            } ${getEffectClass(currentZoomEffect, 'zoom')}`}
                                        style={{
                                            opacity: currentFadeEffect?.type === 'in' ? 0 : 1,
                                            animation: currentFadeEffect?.type === 'in'
                                                ? 'fadeIn 1s ease-in-out forwards'
                                                : currentPanEffect
                                                    ? `pan-${currentPanEffect.direction} ${currentPanEffect.duration}s ease-out forwards`
                                                    : currentZoomEffect
                                                        ? `zoom-${currentZoomEffect.type} ${currentZoomEffect.duration}s ease-out forwards`
                                                        : 'none'
                                        }}
                                    />
                                )}

                                {/* Default ember image when not playing */}
                                {!isPlaying && !isGeneratingAudio && !showEndHold && !currentMediaColor && !currentMediaImageUrl && ember?.image_url && (
                                    <img
                                        src={ember.image_url}
                                        alt={ember?.title || 'Ember'}
                                        className="absolute inset-0 w-full h-full object-cover"
                                    />
                                )}

                                {/* Media Color Screen - solid color background when color effect is active */}
                                {!isGeneratingAudio && !showEndHold && currentMediaColor && (
                                    <div
                                        className="absolute inset-0"
                                        style={{
                                            backgroundColor: currentMediaColor
                                        }}
                                    />
                                )}

                                {/* Loading Screen - shows when generating audio OR when currentLoadingState is true */}
                                {(isGeneratingAudio || currentLoadingState) && (
                                    <div className="absolute inset-0 flex flex-col items-center justify-center" style={{ backgroundColor: 'black' }}>
                                        <div className="flex flex-col items-center space-y-4">
                                            {/* Loading Spinner */}
                                            <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
                                            {/* Loading Message */}
                                            <p className="text-white text-lg font-medium text-center">
                                                {isGeneratingAudio ?
                                                    "Preparing Story..." :
                                                    currentLoadingMessage
                                                }
                                            </p>
                                        </div>
                                    </div>
                                )}

                                {/* Bottom right capsule: Main EmberPlay capsule in left section */}
                                <div className="absolute right-6 bottom-6 z-[60]">
                                    <div className="flex flex-col items-center gap-2 bg-white/50 backdrop-blur-sm px-2 py-3 rounded-full shadow-lg">
                                        {/* Exit Button */}
                                        <button
                                            className="p-1 hover:bg-white/50 rounded-full transition-colors"
                                            onClick={handleExitPlay}
                                            aria-label="Exit EmberPlay"
                                            type="button"
                                        >
                                            <X size={24} weight="bold" className="text-gray-700" />
                                        </button>

                                        {/* Horizontal Divider */}
                                        <div className="w-4 h-px bg-gray-400 my-1"></div>

                                        {/* Owner Avatar - Always at the top of the stack */}
                                        {ember?.owner && (
                                            <div
                                                className="p-1 hover:bg-white/70 rounded-full transition-colors"
                                                style={{
                                                    marginTop: '0px',
                                                    zIndex: 35 // Highest z-index to appear on top
                                                }}
                                                title={`${ember.owner.first_name || ''} ${ember.owner.last_name || ''}`.trim() || 'Owner'}
                                            >
                                                <Avatar className="h-6 w-6 ring-2 ring-amber-400">
                                                    <AvatarImage
                                                        src={ember.owner.avatar_url}
                                                        alt={`${ember.owner.first_name || ''} ${ember.owner.last_name || ''}`.trim() || 'Owner'}
                                                    />
                                                    <AvatarFallback className="text-xs bg-amber-100 text-amber-700">
                                                        {ember.owner.first_name?.[0] || ember.owner.last_name?.[0] || 'O'}
                                                    </AvatarFallback>
                                                </Avatar>
                                            </div>
                                        )}

                                        {/* Invited Users Avatars - Stacked with 16px overlap */}
                                        {sharedUsers.map((sharedUser, index) => (
                                            <div
                                                key={sharedUser.id || index}
                                                className="p-1 hover:bg-white/70 rounded-full transition-colors"
                                                style={{
                                                    marginTop: ember?.owner ? '-24px' : (index === 0 ? '-8px' : '-24px'),
                                                    zIndex: ember?.owner ? (34 - index) : (30 - index) // Adjust z-index if owner is present
                                                }}
                                                title={`${sharedUser.first_name || ''} ${sharedUser.last_name || ''}`.trim() || sharedUser.email}
                                            >
                                                <Avatar className="h-6 w-6 ring-1 ring-white">
                                                    <AvatarImage
                                                        src={sharedUser.avatar_url}
                                                        alt={`${sharedUser.first_name || ''} ${sharedUser.last_name || ''}`.trim() || sharedUser.email}
                                                    />
                                                    <AvatarFallback className="text-xs bg-gray-200 text-gray-700">
                                                        {sharedUser.first_name?.[0] || sharedUser.last_name?.[0] || sharedUser.email?.[0]?.toUpperCase() || '?'}
                                                    </AvatarFallback>
                                                </Avatar>
                                            </div>
                                        ))}

                                        {/* Horizontal divider */}
                                        <div className="h-px w-6 bg-gray-300 my-1"></div>

                                        {/* Play/Stop Button - toggles between play and stop */}
                                        <button
                                            className="p-1 hover:bg-white/70 rounded-full transition-colors"
                                            onClick={isPlaying ? handleStop : handlePlay}
                                            aria-label={isGeneratingAudio ? "Preparing Story..." : (isPlaying ? "Stop story" : "Play story")}
                                            type="button"
                                            disabled={isGeneratingAudio}
                                        >
                                            {isGeneratingAudio ? (
                                                <div className="w-6 h-6 flex items-center justify-center">
                                                    <div className="w-4 h-4 border-2 border-gray-700 border-t-transparent rounded-full animate-spin" />
                                                </div>
                                            ) : isPlaying ? (
                                                <div className="w-6 h-6 flex items-center justify-center">
                                                    <div className="w-4 h-4 border-2 border-gray-700 rounded-sm"></div>
                                                </div>
                                            ) : (
                                                <PlayCircle size={24} className="text-gray-700" />
                                            )}
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Right side - Text Display Area */}
                            <div className="relative w-1/3 min-w-[400px] overflow-hidden">
                                {/* Background for text area */}
                                <div className="absolute inset-0 bg-black"></div>

                                {/* Text Display */}
                                <div className="absolute inset-0 flex items-center justify-center p-8">
                                    <div className="text-center max-w-md">
                                        {currentDisplayText && (
                                            <div className="mb-4">
                                                <p className="text-white text-xl font-bold leading-relaxed">
                                                    {currentDisplayText}
                                                </p>
                                            </div>
                                        )}

                                        {!isPlaying && !isGeneratingAudio && !currentDisplayText && (
                                            <div className="text-center">
                                                <p className="text-white text-lg leading-relaxed">
                                                    Press play to start this Ember
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* End hold screen */}
                                {showEndHold && (
                                    <div className="absolute inset-0 flex items-center justify-center bg-black">
                                        <div className="text-center">
                                            <p className="text-white text-2xl mb-4">
                                                {ember?.title || 'Untitled Ember'}
                                            </p>
                                            <p className="text-gray-400 text-sm">
                                                Story complete
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
} 