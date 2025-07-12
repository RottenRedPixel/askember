import React, { useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { PlayCircle, X } from 'phosphor-react';

export default function EmberPlay({
    // Ember data
    ember,
    sharedUsers = [],

    // Playback state
    isPlaying = false,
    isGeneratingAudio = false,
    showEndHold = false,

    // Visual state
    currentDisplayText = '',
    currentSegmentSentences = [],
    currentSentenceIndex = 0,
    currentMediaColor = null,
    currentMediaImageUrl = null,
    currentlyPlayingStoryCut = null,

    // Handlers
    onPlay = () => { },
    onStop = () => { },
    onExitPlay = () => { },

    // Optional styling overrides
    className = '',
    isMobile = false
}) {
    // Log when the standalone EmberPlay component is being used
    useEffect(() => {
        console.log('🎬 EmberPlay: Using standalone EmberPlay component!', {
            ember: ember?.title || 'Untitled',
            isPlaying,
            timestamp: new Date().toISOString()
        });
    }, []); // Only log once when component mounts

    return (
        <div className={`fixed inset-0 z-50 ${className}`} data-component="EmberPlay-standalone">
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
                                    onClick={onExitPlay}
                                    aria-label="Exit EmberPlay"
                                    type="button"
                                >
                                    <X size={20} className="text-white" />
                                </button>

                                {/* Background Image - blurred when playing without story cut */}
                                {!isGeneratingAudio && !showEndHold && !currentMediaColor && currentMediaImageUrl && (
                                    <img
                                        src={currentMediaImageUrl}
                                        alt={ember?.title || 'Ember'}
                                        className="absolute inset-0 w-full h-full object-cover transition-opacity duration-1000"
                                        id="ember-background-image"
                                    />
                                )}

                                {/* Show main ember image when no media image and playing without story cut */}
                                {!isGeneratingAudio && !showEndHold && !currentMediaColor && !currentMediaImageUrl && (isPlaying && !currentlyPlayingStoryCut) && ember?.image_url && (
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

                                {/* Bottom right capsule: Main EmberPlay capsule in top section */}
                                {!showEndHold && (
                                    <div className="absolute right-4 bottom-4 z-[60]">
                                        <div className="flex flex-col items-center gap-2 bg-white/50 backdrop-blur-sm px-2 py-3 rounded-full shadow-lg">
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
                                                onClick={isPlaying ? onStop : onPlay}
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
                                )}
                            </div>

                            {/* Progress Message */}
                            <div className="w-full px-4 pt-3 pb-2 md:px-6 bg-black">
                                {/* 🎯 Synchronized Text Display */}
                                {!isGeneratingAudio && !showEndHold && currentDisplayText && (
                                    <div className="text-center p-6">
                                        <p className="text-lg font-bold text-white text-center">
                                            {currentDisplayText}
                                        </p>

                                        {/* Progress indicator for sentences */}
                                        {currentSegmentSentences.length > 1 && (
                                            <div className="flex justify-center mt-2">
                                                <div className="flex gap-1">
                                                    {currentSegmentSentences.map((_, index) => (
                                                        <div
                                                            key={index}
                                                            className={`w-2 h-2 rounded-full ${index === currentSentenceIndex ? 'bg-white' : 'bg-gray-500'}`}
                                                        />
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Show ember content when not playing story cuts OR when playing without story cut */}
                                {!isGeneratingAudio && !showEndHold && !currentDisplayText && !currentlyPlayingStoryCut && (
                                    <p className="text-lg font-bold text-white text-center">
                                        {isPlaying
                                            ? (ember?.content || "Let's build this story together! Add your voice, memories, and details to bring this ember to life.")
                                            : (ember?.content || 'No content available')
                                        }
                                    </p>
                                )}
                            </div>

                            {/* Text Area - 35vh */}
                            <div className="h-[35vh] bg-black relative">
                                {/* Reserved for future use - text now displayed in progress message area */}
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Desktop Layout */}
            <div className="hidden md:block">
                <div className="container mx-auto px-1.5 py-8">
                    <div className="max-w-4xl mx-auto">
                        <div className="rounded-xl bg-white shadow-sm">
                            <Card className="py-0 w-full bg-black">
                                <CardContent className="p-0 h-full">
                                    <div className="h-full flex flex-col bg-black md:rounded-xl overflow-hidden">
                                        {/* Photo Area - responsive height on desktop */}
                                        <div className="relative w-full h-[65vh] overflow-hidden bg-black">
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
                                                onClick={onExitPlay}
                                                aria-label="Exit EmberPlay"
                                                type="button"
                                            >
                                                <X size={20} className="text-white" />
                                            </button>

                                            {/* Background Image - blurred when playing without story cut */}
                                            {!isGeneratingAudio && !showEndHold && !currentMediaColor && currentMediaImageUrl && (
                                                <img
                                                    src={currentMediaImageUrl}
                                                    alt={ember?.title || 'Ember'}
                                                    className="absolute inset-0 w-full h-full object-cover transition-opacity duration-1000"
                                                    id="ember-background-image"
                                                />
                                            )}

                                            {/* Show main ember image when no media image and playing without story cut */}
                                            {!isGeneratingAudio && !showEndHold && !currentMediaColor && !currentMediaImageUrl && (isPlaying && !currentlyPlayingStoryCut) && ember?.image_url && (
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

                                            {/* Bottom right capsule: Main EmberPlay capsule in top section */}
                                            {!showEndHold && (
                                                <div className="absolute right-4 bottom-4 z-[60]">
                                                    <div className="flex flex-col items-center gap-2 bg-white/50 backdrop-blur-sm px-2 py-3 rounded-full shadow-lg">
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
                                                            onClick={isPlaying ? onStop : onPlay}
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
                                            )}
                                        </div>

                                        {/* Progress Message */}
                                        <div className="w-full px-4 pt-3 pb-2 md:px-6 bg-black">
                                            {/* 🎯 Synchronized Text Display */}
                                            {!isGeneratingAudio && !showEndHold && currentDisplayText && (
                                                <div className="text-center p-6">
                                                    <p className="text-lg font-bold text-white text-center">
                                                        {currentDisplayText}
                                                    </p>

                                                    {/* Progress indicator for sentences */}
                                                    {currentSegmentSentences.length > 1 && (
                                                        <div className="flex justify-center mt-2">
                                                            <div className="flex gap-1">
                                                                {currentSegmentSentences.map((_, index) => (
                                                                    <div
                                                                        key={index}
                                                                        className={`w-2 h-2 rounded-full ${index === currentSentenceIndex ? 'bg-white' : 'bg-gray-500'}`}
                                                                    />
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            {/* Show ember content when not playing story cuts OR when playing without story cut */}
                                            {!isGeneratingAudio && !showEndHold && !currentDisplayText && !currentlyPlayingStoryCut && (
                                                <p className="text-lg font-bold text-white text-center">
                                                    {isPlaying
                                                        ? (ember?.content || "Let's build this story together! Add your voice, memories, and details to bring this ember to life.")
                                                        : (ember?.content || 'No content available')
                                                    }
                                                </p>
                                            )}
                                        </div>

                                        {/* Text Area - 35vh */}
                                        <div className="h-[35vh] bg-black relative">
                                            {/* Reserved for future use - text now displayed in progress message area */}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </div>
            </div>

            {/* End hold screen - pure black */}
            {showEndHold && (
                <div className="absolute inset-0 bg-black z-30">
                    {/* Completely black screen */}
                </div>
            )}
        </div>
    );
} 