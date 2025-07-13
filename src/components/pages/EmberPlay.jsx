import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { PlayCircle, X, Gear } from 'phosphor-react';
import { useEmberData } from '@/lib/useEmberData';
import { useUIState } from '@/lib/useUIState';
import { autoTriggerImageAnalysis, autoTriggerExifProcessing, autoTriggerLocationProcessing, handlePlay as handleMediaPlay, handlePlaybackComplete as handleMediaPlaybackComplete, handleExitPlay as handleMediaExitPlay } from '@/lib/mediaHandlers';
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
        if (currentAudio) {
            currentAudio.pause();
            currentAudio.currentTime = 0;
        }
        setIsPlaying(false);
        setCurrentlyPlayingStoryCut(null);
        setCurrentAudio(null);
        playbackStoppedRef.current = true;

        // Clear all timeouts
        sentenceTimeouts.forEach(timeout => clearTimeout(timeout));
        setSentenceTimeouts([]);
        mediaTimeouts.forEach(timeout => clearTimeout(timeout));
        setMediaTimeouts([]);
        mediaTimeoutsRef.current = [];

        // Reset visual states
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

                                {/* Exit Button - Top Right */}
                                <button
                                    className="absolute top-4 right-4 p-2 bg-black/50 hover:bg-black/70 rounded-full transition-colors z-30 pointer-events-auto"
                                    onClick={handleExitPlay}
                                    aria-label="Exit EmberPlay"
                                    type="button"
                                >
                                    <X size={20} className="text-white" />
                                </button>

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
                                {!showEndHold && (
                                    <div className="absolute right-4 bottom-4 z-[60]">
                                        <div className="flex flex-col items-center gap-2 bg-white/50 backdrop-blur-sm px-2 py-3 rounded-full shadow-lg">
                                            {/* Owner Avatar - Always at the top of the stack */}
                                            {ember?.owner && (
                                                <div className="p-1 hover:bg-white/70 rounded-full transition-colors">
                                                    <Avatar className="w-8 h-8 border-2 border-white/80">
                                                        <AvatarImage src={ember.owner.avatar_url} alt={`${ember.owner.first_name} ${ember.owner.last_name}`} />
                                                        <AvatarFallback className="text-xs bg-gradient-to-r from-blue-500 to-purple-600 text-white">
                                                            {ember.owner.first_name?.[0]}{ember.owner.last_name?.[0]}
                                                        </AvatarFallback>
                                                    </Avatar>
                                                </div>
                                            )}

                                            {/* Contributor Avatars - Show shared users */}
                                            {sharedUsers && sharedUsers.slice(0, 3).map((contributor, index) => (
                                                <div
                                                    key={contributor.id}
                                                    className="p-1 hover:bg-white/70 rounded-full transition-colors"
                                                >
                                                    <Avatar className="w-8 h-8 border-2 border-white/80">
                                                        <AvatarImage src={contributor.avatar_url} alt={`${contributor.first_name} ${contributor.last_name}`} />
                                                        <AvatarFallback className="text-xs bg-gradient-to-r from-green-500 to-blue-600 text-white">
                                                            {contributor.first_name?.[0]}{contributor.last_name?.[0]}
                                                        </AvatarFallback>
                                                    </Avatar>
                                                </div>
                                            ))}

                                            {/* Play Button */}
                                            <button
                                                className="p-1 hover:bg-white/50 rounded-full transition-colors"
                                                onClick={isPlaying ? handleStop : handlePlay}
                                                aria-label={isGeneratingAudio ? "Preparing Story..." : (isPlaying ? "Stop playing" : "Play ember story")}
                                                type="button"
                                                disabled={isGeneratingAudio}
                                            >
                                                {isGeneratingAudio ? (
                                                    <div className="w-6 h-6 flex items-center justify-center">
                                                        <div className="w-4 h-4 border-2 border-gray-700 border-t-transparent rounded-full animate-spin" />
                                                    </div>
                                                ) : (
                                                    <PlayCircle size={24} className={`text-gray-700 ${isPlaying ? 'text-blue-600' : ''}`} />
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Bottom Section - Text Display Area - 35vh */}
                            <div className="relative flex-1 h-[35vh] overflow-hidden">
                                {/* Background for text area */}
                                <div className="absolute inset-0 bg-black"></div>

                                {/* Text Display */}
                                <div className="absolute inset-0 flex items-center justify-center p-6">
                                    <div className="text-center max-w-4xl">
                                        {currentDisplayText && (
                                            <div className="mb-4">
                                                <p className="text-white text-lg leading-relaxed">
                                                    {currentDisplayText}
                                                </p>
                                                {currentVoiceTag && (
                                                    <p className="text-gray-400 text-sm mt-2">
                                                        {currentVoiceTag}
                                                    </p>
                                                )}
                                            </div>
                                        )}

                                        {!isPlaying && !isGeneratingAudio && !currentDisplayText && (
                                            <div className="text-center">
                                                <p className="text-white text-xl leading-relaxed">
                                                    Press play to experience this ember's story
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

                                {/* Exit Button - Top Right */}
                                <button
                                    className="absolute top-6 right-6 p-2 bg-black/50 hover:bg-black/70 rounded-full transition-colors z-30 pointer-events-auto"
                                    onClick={handleExitPlay}
                                    aria-label="Exit EmberPlay"
                                    type="button"
                                >
                                    <X size={20} className="text-white" />
                                </button>

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
                                {!showEndHold && (
                                    <div className="absolute right-6 bottom-6 z-[60]">
                                        <div className="flex flex-col items-center gap-2 bg-white/50 backdrop-blur-sm px-2 py-3 rounded-full shadow-lg">
                                            {/* Owner Avatar - Always at the top of the stack */}
                                            {ember?.owner && (
                                                <div className="p-1 hover:bg-white/70 rounded-full transition-colors">
                                                    <Avatar className="w-8 h-8 border-2 border-white/80">
                                                        <AvatarImage src={ember.owner.avatar_url} alt={`${ember.owner.first_name} ${ember.owner.last_name}`} />
                                                        <AvatarFallback className="text-xs bg-gradient-to-r from-blue-500 to-purple-600 text-white">
                                                            {ember.owner.first_name?.[0]}{ember.owner.last_name?.[0]}
                                                        </AvatarFallback>
                                                    </Avatar>
                                                </div>
                                            )}

                                            {/* Contributor Avatars - Show shared users */}
                                            {sharedUsers && sharedUsers.slice(0, 3).map((contributor, index) => (
                                                <div
                                                    key={contributor.id}
                                                    className="p-1 hover:bg-white/70 rounded-full transition-colors"
                                                >
                                                    <Avatar className="w-8 h-8 border-2 border-white/80">
                                                        <AvatarImage src={contributor.avatar_url} alt={`${contributor.first_name} ${contributor.last_name}`} />
                                                        <AvatarFallback className="text-xs bg-gradient-to-r from-green-500 to-blue-600 text-white">
                                                            {contributor.first_name?.[0]}{contributor.last_name?.[0]}
                                                        </AvatarFallback>
                                                    </Avatar>
                                                </div>
                                            ))}

                                            {/* Play Button */}
                                            <button
                                                className="p-1 hover:bg-white/50 rounded-full transition-colors"
                                                onClick={isPlaying ? handleStop : handlePlay}
                                                aria-label={isGeneratingAudio ? "Preparing Story..." : (isPlaying ? "Stop playing" : "Play ember story")}
                                                type="button"
                                                disabled={isGeneratingAudio}
                                            >
                                                {isGeneratingAudio ? (
                                                    <div className="w-6 h-6 flex items-center justify-center">
                                                        <div className="w-4 h-4 border-2 border-gray-700 border-t-transparent rounded-full animate-spin" />
                                                    </div>
                                                ) : (
                                                    <PlayCircle size={24} className={`text-gray-700 ${isPlaying ? 'text-blue-600' : ''}`} />
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                )}
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
                                                <p className="text-white text-xl leading-relaxed">
                                                    {currentDisplayText}
                                                </p>
                                                {currentVoiceTag && (
                                                    <p className="text-gray-400 text-sm mt-2">
                                                        {currentVoiceTag}
                                                    </p>
                                                )}
                                            </div>
                                        )}

                                        {!isPlaying && !isGeneratingAudio && !currentDisplayText && (
                                            <div className="text-center">
                                                <p className="text-white text-lg leading-relaxed">
                                                    Press play to experience this ember's story
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