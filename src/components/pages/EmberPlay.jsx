import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { PlayCircle, X, Gear } from 'phosphor-react';
import { useEmberData } from '@/lib/useEmberData';
import { useUIState } from '@/lib/useUIState';
import { autoTriggerImageAnalysis, autoTriggerExifProcessing, autoTriggerLocationProcessing, handlePlay as handleMediaPlay, handlePlaybackComplete as handleMediaPlaybackComplete, handleExitPlay as handleMediaExitPlay } from '@/lib/mediaHandlers';
import { debugRecordedAudio, generateSegmentAudio, playMultiVoiceAudio, stopMultiVoiceAudio } from '@/lib/emberPlayer';
import { getEmberTaggedPeople } from '@/lib/database';
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
  
  @keyframes fadeOut {
    from {
      opacity: 1;
    }
    to {
      opacity: 0;
    }
  }
  
  @keyframes textFadeIn {
    from {
      opacity: 0;
      transform: translateY(10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  
  @keyframes logoFadeIn {
    from {
      opacity: 0;
      transform: scale(0.8);
    }
    to {
      opacity: 1;
      transform: scale(1);
    }
  }
  
  @keyframes endTextFadeIn {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
`;

export default function EmberPlay() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user, userProfile } = useStore();

    // Remove excessive debug logging that was causing infinite console output
    // console.log('🎬 EmberPlay: Rendering');
    // console.log('🎬 EmberPlay: Current URL:', window.location.href);
    // console.log('🎬 EmberPlay: Ember ID:', id);

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

    // Load tagged people for zoom target resolution
    useEffect(() => {
        if (id) {
            const loadTaggedPeople = async () => {
                try {
                    console.log('👤 EmberPlay: Loading tagged people for zoom targets...');
                    const people = await getEmberTaggedPeople(id);
                    setTaggedPeople(people || []);
                    console.log('✅ EmberPlay: Loaded tagged people:', people?.length || 0);
                } catch (error) {
                    console.warn('⚠️ EmberPlay: Could not load tagged people:', error);
                    setTaggedPeople([]);
                }
            };
            loadTaggedPeople();
        }
    }, [id]);

    // Listen for script updates from StoryCutStudio
    useEffect(() => {
        const handleScriptUpdate = (event) => {
            const { emberId, storyCutId, timestamp } = event.detail;

            // Only refresh if this is for the current ember
            if (emberId === id && fetchStoryCuts) {
                console.log('🔄 EmberPlay: Received script update notification from StoryCutStudio');
                console.log('🔄 Refreshing story cuts to get latest script changes...');

                // Refresh story cuts data
                fetchStoryCuts();

                // Also refresh ember data if available
                if (fetchEmber) {
                    fetchEmber();
                }
            }
        };

        // Add event listener for script updates
        window.addEventListener('emberScriptUpdated', handleScriptUpdate);

        // Cleanup event listener
        return () => {
            window.removeEventListener('emberScriptUpdated', handleScriptUpdate);
        };
    }, [id, fetchStoryCuts, fetchEmber]);

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

        message,
        setMessage
    } = useUIState();

    // Progress tracking state for timeline
    const [currentProgress, setCurrentProgress] = useState(0);
    const [totalDuration, setTotalDuration] = useState(0);
    const [currentTimelineStep, setCurrentTimelineStep] = useState(0);
    const [totalTimelineSteps, setTotalTimelineSteps] = useState(0);
    const [currentSegmentStartTime, setCurrentSegmentStartTime] = useState(0);
    const [currentAudioElement, setCurrentAudioElement] = useState(null);
    const [textKey, setTextKey] = useState(0); // For triggering text animation
    const [showEndHold, setShowEndHold] = useState(false);
    const [showEndLogo, setShowEndLogo] = useState(false);
    const [showEndText, setShowEndText] = useState(false);
    const [taggedPeople, setTaggedPeople] = useState([]); // For zoom target person lookup
    const [zoomAnimationPhase, setZoomAnimationPhase] = useState('idle'); // 'idle', 'starting', 'animating'

    // Playback control refs
    const playbackStoppedRef = useRef(false);
    const progressIntervalRef = useRef(null);
    const mediaTimeoutsRef = useRef([]);

    // Helper function to calculate transform-origin for zoom targets using stored metadata
    const calculateTransformOrigin = async (target, taggedPeople, currentBlock, emberId) => {
        if (!target || target.type === 'center') {
            return 'center center';
        }

        try {
            // Import the media dimensions utility
            const { getMediaDimensions, getMediaDimensionsByUrl, toPercent, validateCoordinates } = await import('@/lib/mediaDimensions');

            // Get image dimensions from stored metadata
            let dimensions = null;

            if (currentBlock?.media_id) {
                dimensions = await getMediaDimensions(currentBlock.media_id, emberId);
            } else if (currentBlock?.media_url) {
                dimensions = await getMediaDimensionsByUrl(currentBlock.media_url, emberId);
            }

            if (!dimensions) {
                console.log('⚠️ No stored dimensions found - falling back to center');
                return 'center center';
            }

            console.log(`📐 Using stored dimensions: ${dimensions.width}x${dimensions.height}`);

            if (target.type === 'person' && target.personId) {
                // Find the tagged person by ID
                const person = taggedPeople.find(p => p.id === target.personId);
                if (person && person.face_coordinates) {
                    const coords = person.face_coordinates;

                    // Validate coordinates against stored dimensions
                    if (validateCoordinates(coords, dimensions)) {
                        // Face coordinates are stored in natural image dimensions
                        // Convert to percentages for transform-origin
                        const centerX = coords.x + (coords.width / 2);
                        const centerY = coords.y + (coords.height / 2);

                        const percentX = toPercent(centerX, dimensions.width);
                        const percentY = toPercent(centerY, dimensions.height);

                        console.log(`🎯 Zoom target: Person "${person.person_name}" at (${Math.round(percentX)}%, ${Math.round(percentY)}%)`);
                        return `${percentX.toFixed(1)}% ${percentY.toFixed(1)}%`;
                    } else {
                        console.warn(`⚠️ Person coordinates exceed stored dimensions - using center`);
                    }
                }
            } else if (target.type === 'custom' && target.coordinates) {
                // Custom coordinates should also be in natural image dimensions
                const coords = target.coordinates;

                // Validate coordinates against stored dimensions
                if (validateCoordinates(coords, dimensions)) {
                    const percentX = toPercent(coords.x, dimensions.width);
                    const percentY = toPercent(coords.y, dimensions.height);

                    console.log(`🎯 Zoom target: Custom point at (${Math.round(percentX)}%, ${Math.round(percentY)}%)`);
                    return `${percentX.toFixed(1)}% ${percentY.toFixed(1)}%`;
                } else {
                    console.warn(`⚠️ Custom zoom coordinates (${coords.x}, ${coords.y}) exceed stored dimensions (${dimensions.width}x${dimensions.height}) - using center`);
                }
            }

            return 'center center';
        } catch (error) {
            console.error('❌ Error calculating transform origin:', error);
            return 'center center';
        }
    };

    // Combined visual effects state for simultaneous effects
    const [combinedEffectStyles, setCombinedEffectStyles] = useState({
        transform: 'scale(1) translateX(0)',
        opacity: 1,
        transition: 'transform 0.5s ease-out, opacity 0.5s ease-out'
    });

    // Combine multiple visual effects using direct effect handling
    useEffect(() => {
        const applyEffects = async () => {
            const transforms = [];
            let opacity = 1;
            let animation = null;
            let transformOrigin = 'center center';
            let transitionDuration = '0.5s';

            // Handle pan effects
            if (currentPanEffect && typeof currentPanEffect === 'object') {
                const direction = currentPanEffect.type === 'left' ? '-' : '';
                transforms.push(`translateX(${direction}${currentPanEffect.distance}%)`);
                transitionDuration = `${currentPanEffect.duration}s`;
            }

            // Handle zoom effects with start and end scales
            if (currentZoomEffect && typeof currentZoomEffect === 'object') {
                const startScale = currentZoomEffect.startScale || 1.0;
                const endScale = currentZoomEffect.endScale || 1.0;

                // Calculate transform-origin first for zoom animations
                let zoomTransformOrigin = 'center center';
                if (currentZoomEffect.target && ember?.id) {
                    const mockBlock = {
                        media_url: currentMediaImageUrl || ember?.image_url
                    };
                    zoomTransformOrigin = await calculateTransformOrigin(
                        currentZoomEffect.target,
                        taggedPeople,
                        mockBlock,
                        ember.id
                    );
                }

                // Create CSS animation for start-to-end zoom
                if (startScale !== endScale) {
                    const animationName = `zoom-${Date.now()}`;
                    const keyframes = `
                        @keyframes ${animationName} {
                            0% { 
                                transform: scale(${startScale}); 
                                transform-origin: ${zoomTransformOrigin};
                            }
                            100% { 
                                transform: scale(${endScale}); 
                                transform-origin: ${zoomTransformOrigin};
                            }
                        }
                    `;

                    // Inject keyframes into document
                    const style = document.createElement('style');
                    style.textContent = keyframes;
                    document.head.appendChild(style);

                    // Use animation instead of transform
                    animation = `${animationName} ${currentZoomEffect.duration}s ease-out forwards`;

                    // Clean up animation after it's done
                    setTimeout(() => {
                        try {
                            if (style && style.parentNode) {
                                document.head.removeChild(style);
                            }
                        } catch (error) {
                            console.warn('Failed to cleanup zoom animation style:', error);
                        }
                    }, (currentZoomEffect.duration + 1) * 1000);
                } else {
                    // No animation needed if start and end are the same
                    transforms.push(`scale(${endScale})`);
                    transitionDuration = `${currentZoomEffect.duration}s`;
                }

                console.log(`🔍 Zoom effect: ${startScale} → ${endScale} over ${currentZoomEffect.duration}s`);

                // Set transform-origin for non-animated zoom (when start = end)
                if (startScale === endScale) {
                    transformOrigin = zoomTransformOrigin;
                }
            }

            // Handle fade effects - use CSS animation (only if zoom isn't already using animation)
            if (currentFadeEffect && typeof currentFadeEffect === 'object' && !animation) {
                const duration = currentFadeEffect.duration;
                if (currentFadeEffect.type === 'in') {
                    animation = `fadeIn ${duration}s ease-out forwards`;
                    opacity = 0; // Start invisible
                } else {
                    animation = `fadeOut ${duration}s ease-out forwards`;
                    opacity = 1; // Start visible
                }
            }

            // Use the longest duration for transitions
            const panDuration = currentPanEffect?.duration || 0;
            const zoomDuration = currentZoomEffect?.duration || 0;
            const maxTransitionDuration = Math.max(panDuration, zoomDuration, 0.5);

            const combinedStyles = {
                transform: transforms.length > 0 ? transforms.join(' ') : 'scale(1) translateX(0)',
                transformOrigin,
                opacity,
                animation: animation || 'none',
                transition: animation
                    ? `transform ${maxTransitionDuration}s ease-out`
                    : `transform ${maxTransitionDuration}s ease-out, opacity ${maxTransitionDuration}s ease-out`
            };

            setCombinedEffectStyles(combinedStyles);

            console.log('🎬 Combined effects applied directly:', {
                effects: {
                    fade: currentFadeEffect,
                    pan: currentPanEffect,
                    zoom: currentZoomEffect
                },
                combinedStyles
            });
        };

        applyEffects();
    }, [currentPanEffect, currentZoomEffect, currentFadeEffect, taggedPeople, currentMediaImageUrl, ember?.image_url, ember?.id]);

    // Track text changes to trigger fade-in animation
    useEffect(() => {
        if (currentDisplayText) {
            setTextKey(prev => prev + 1);
        }
    }, [currentDisplayText]);

    // Handle zoom animation phases for smooth zoom effects
    useEffect(() => {
        if (currentZoomEffect && currentZoomEffect.scale && currentZoomEffect.duration) {
            // Start zoom animation
            setZoomAnimationPhase('starting');

            // After a brief delay, trigger the actual zoom animation
            const timer = setTimeout(() => {
                setZoomAnimationPhase('animating');
            }, 50); // Short delay to ensure starting state is applied first

            return () => clearTimeout(timer);
        } else {
            // Reset animation phase when no zoom effect
            setZoomAnimationPhase('idle');
        }
    }, [currentZoomEffect]);

    // Handle end screen animation sequence
    useEffect(() => {
        if (showEndHold) {
            // Reset animation states
            setShowEndLogo(false);
            setShowEndText(false);

            // Start logo fade-in immediately
            setTimeout(() => {
                setShowEndLogo(true);
            }, 100);

            // Start text fade-in after logo
            setTimeout(() => {
                setShowEndText(true);
            }, 800);
        } else {
            // Reset states when end screen is hidden
            setShowEndLogo(false);
            setShowEndText(false);
        }
    }, [showEndHold]);

    // Progress tracking functions
    const calculateTotalDuration = useCallback((blocks) => {
        if (!blocks || !Array.isArray(blocks) || blocks.length === 0) return 0;

        let total = 0;
        blocks.forEach(block => {
            if (block.type === 'hold') {
                total += parseFloat(block.duration || 3.0);
            } else if (block.type === 'loadscreen') {
                total += parseFloat(block.loadDuration || 2.0);
            } else if (block.type === 'media') {
                total += 2.0; // Media blocks are typically 2 seconds
            } else if (block.type === 'voice') {
                // ✅ FIXED: Handle AI-generated voice blocks
                const cleanContent = block.content.replace(/<[^>]+>/g, '').trim();
                const estimatedDuration = Math.max(1, cleanContent.length * 0.08);
                total += estimatedDuration;
            } else if (block.type === 'ember' || block.type === 'narrator' || block.type === 'contributor') {
                // Legacy format compatibility
                const cleanContent = block.content.replace(/<[^>]+>/g, '').trim();
                const estimatedDuration = Math.max(1, cleanContent.length * 0.08);
                total += estimatedDuration;
            }
        });

        console.log(`📊 Calculated total duration: ${total.toFixed(2)} seconds`);
        return total;
    }, []);

    const updateProgress = useCallback((currentStep, blocks) => {
        if (!blocks || !Array.isArray(blocks) || blocks.length === 0) return;

        let elapsedTime = 0;

        // Calculate elapsed time from completed blocks
        for (let i = 0; i < currentStep && i < blocks.length; i++) {
            const block = blocks[i];
            if (block.type === 'hold') {
                elapsedTime += parseFloat(block.duration || 3.0);
            } else if (block.type === 'loadscreen') {
                elapsedTime += parseFloat(block.loadDuration || 2.0);
            } else if (block.type === 'media') {
                elapsedTime += 2.0;
            } else if (block.type === 'voice') {
                // ✅ FIXED: Handle AI-generated voice blocks
                const cleanContent = block.content.replace(/<[^>]+>/g, '').trim();
                const estimatedDuration = Math.max(1, cleanContent.length * 0.08);
                elapsedTime += estimatedDuration;
            } else if (block.type === 'ember' || block.type === 'narrator' || block.type === 'contributor') {
                // Legacy format compatibility
                const cleanContent = block.content.replace(/<[^>]+>/g, '').trim();
                const estimatedDuration = Math.max(1, cleanContent.length * 0.08);
                elapsedTime += estimatedDuration;
            }
        }

        setCurrentProgress(elapsedTime);
        setCurrentTimelineStep(currentStep);
        setCurrentSegmentStartTime(elapsedTime); // Track where current block starts
    }, []);

    const startSmoothProgress = useCallback((audioElement, segmentStartTime = 0) => {
        if (!audioElement) return;

        // Clear any existing interval
        if (progressIntervalRef.current) {
            clearInterval(progressIntervalRef.current);
        }

        setCurrentAudioElement(audioElement);

        // Update progress every 100ms for smooth animation
        progressIntervalRef.current = setInterval(() => {
            if (audioElement && !audioElement.paused && !audioElement.ended) {
                const currentAudioTime = audioElement.currentTime || 0;
                const newProgress = segmentStartTime + currentAudioTime;
                setCurrentProgress(newProgress);
            }
        }, 100);
    }, []);

    const stopSmoothProgress = useCallback(() => {
        if (progressIntervalRef.current) {
            clearInterval(progressIntervalRef.current);
            progressIntervalRef.current = null;
        }
        setCurrentAudioElement(null);
    }, []);

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    // Progress Bar Component
    const ProgressBar = () => {
        const percentage = totalDuration > 0 ? Math.min((currentProgress / totalDuration) * 100, 100) : 0;

        return (
            <div className="w-full bg-black/50 backdrop-blur-sm px-4 py-2">
                <div className="w-full bg-gray-700 rounded-full h-1">
                    <div
                        className="bg-white h-1 rounded-full transition-all duration-300 ease-out"
                        style={{ width: `${percentage}%` }}
                    />
                </div>
            </div>
        );
    };

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

    // Cleanup all audio when component unmounts or user leaves the view
    useEffect(() => {
        return () => {
            console.log('🧹 EmberPlay: Component unmounting, cleaning up timeline...');
            // Use the timeline stop function to ensure all audio is stopped
            stopMultiVoiceAudio({
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
            });
        };
    }, []); // Empty dependency array - only runs on unmount

    // Calculate total duration when story cut is available
    useEffect(() => {
        if (primaryStoryCut) {
            try {
                console.log('🔍 EmberPlay: Primary story cut structure:', primaryStoryCut);
                console.log('🔍 EmberPlay: blocks field:', primaryStoryCut.blocks);
                console.log('🔍 EmberPlay: blocks type:', typeof primaryStoryCut.blocks);
                console.log('🔍 EmberPlay: blocks is array:', Array.isArray(primaryStoryCut.blocks));

                // Extract blocks from versioned structure: {blocks: Array, version: '2.0'} or direct array
                let blocks = null;
                if (Array.isArray(primaryStoryCut.blocks)) {
                    // Direct array format
                    blocks = primaryStoryCut.blocks;
                    console.log('✅ EmberPlay: Using direct blocks array');
                } else if (primaryStoryCut.blocks && Array.isArray(primaryStoryCut.blocks.blocks)) {
                    // Versioned object format: {blocks: Array, version: '2.0'}
                    blocks = primaryStoryCut.blocks.blocks;
                    console.log('✅ EmberPlay: Using versioned blocks array from blocks.blocks');
                    console.log('🔍 EmberPlay: Version:', primaryStoryCut.blocks.version);
                }

                if (blocks && Array.isArray(blocks)) {
                    const duration = calculateTotalDuration(blocks);
                    setTotalDuration(duration);
                    setTotalTimelineSteps(blocks.length);
                    setCurrentProgress(0);
                    setCurrentTimelineStep(0);
                    console.log(`📊 Timeline initialized: ${blocks.length} blocks, ${duration.toFixed(2)}s total`);
                } else {
                    console.warn('⚠️ EmberPlay: No valid blocks array found in primaryStoryCut');
                    console.warn('⚠️ EmberPlay: Available fields:', Object.keys(primaryStoryCut));
                    setTotalDuration(0);
                    setTotalTimelineSteps(0);
                }
            } catch (error) {
                console.error('Error calculating timeline duration:', error);
            }
        }
    }, [primaryStoryCut, calculateTotalDuration]);

    // Cleanup progress interval on component unmount
    useEffect(() => {
        return () => {
            if (progressIntervalRef.current) {
                clearInterval(progressIntervalRef.current);
            }
        };
    }, []);

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
        // Don't allow play if ember data isn't loaded yet
        if (!ember || !storyCuts) {
            console.log('⏳ Ember data not loaded yet, please wait...');
            return;
        }

        // Reset progress when starting playback
        setCurrentProgress(0);
        setCurrentTimelineStep(0);
        setCurrentSegmentStartTime(0);
        stopSmoothProgress();

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
            setCurrentZoomEffect,
            // Add progress tracking
            updateProgress,
            startSmoothProgress,
            stopSmoothProgress
        });
    };

    const handleStop = () => {
        console.log('🛑 Stop button pressed - using timeline stop mechanism...');

        // Use the new timeline-integrated stop function
        stopMultiVoiceAudio({
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
        });

        // Additional EmberPlay-specific cleanup
        setCurrentlyPlayingStoryCut(null);
        setCurrentAudio(null);


        // Reset progress tracking
        setCurrentProgress(0);
        setCurrentTimelineStep(0);
        setCurrentSegmentStartTime(0);

        console.log('✅ Timeline stop completed');
    };

    const handleExitPlay = () => {
        handleStop();
        // Go back to the previous screen in browser history
        navigate(-1);
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


        // Reset progress tracking
        setCurrentProgress(totalDuration);
        setCurrentTimelineStep(totalTimelineSteps);
        stopSmoothProgress();

        // Clear timeouts
        sentenceTimeouts.forEach(timeout => clearTimeout(timeout));
        setSentenceTimeouts([]);
        mediaTimeouts.forEach(timeout => clearTimeout(timeout));
        setMediaTimeouts([]);
        mediaTimeoutsRef.current = [];
    };



    // Remove loading screen - show ember immediately while data loads in background
    // if (loading) {
    //     return (
    //         <div className="fixed inset-0 z-50 bg-black flex items-center justify-center">
    //             <div className="flex flex-col items-center space-y-4">
    //                 <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
    //                 <p className="text-white text-lg font-medium">Loading ember...</p>
    //             </div>
    //         </div>
    //     );
    // }

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
            {/* Inject CSS keyframes */}
            <style dangerouslySetInnerHTML={{ __html: fadeInKeyframes }} />

            {/* Mobile Layout */}
            <div className="md:hidden h-screen overflow-hidden">
                <Card className="py-0 w-full h-full bg-black rounded-none border-0">
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
                                {!isGeneratingAudio && !currentMediaColor && currentMediaImageUrl && (
                                    <img
                                        src={currentMediaImageUrl}
                                        alt={ember?.title || 'Ember'}
                                        className="absolute inset-0 w-full h-full object-cover"
                                        style={combinedEffectStyles}
                                    />
                                )}

                                {/* Show main ember image when no media image and playing without story cut - with visual effects coordination */}
                                {!isGeneratingAudio && !showEndHold && !currentMediaColor && !currentMediaImageUrl && (isPlaying && !currentlyPlayingStoryCut) && ember?.image_url && (
                                    <img
                                        src={ember.image_url}
                                        alt={ember?.title || 'Ember'}
                                        className="absolute inset-0 w-full h-full object-cover"
                                        style={combinedEffectStyles}
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
                                        <div className="h-px w-6 bg-gray-300 my-1"></div>

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

                                        {/* Horizontal divider - Only show if there are avatars above */}
                                        {(ember?.owner || sharedUsers.length > 0) && (
                                            <div className="h-px w-6 bg-gray-300 my-1"></div>
                                        )}

                                        {/* Play/Stop Button - toggles between play and stop */}
                                        <button
                                            className="p-1 hover:bg-white/70 rounded-full transition-colors disabled:opacity-50"
                                            onClick={isPlaying ? handleStop : handlePlay}
                                            aria-label={isGeneratingAudio ? "Preparing Story..." : (!ember || !storyCuts) ? "Loading..." : (isPlaying ? "Stop story" : "Play story")}
                                            type="button"
                                            disabled={isGeneratingAudio || !ember || !storyCuts}
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

                            {/* Progress Bar - Between photo and text sections */}
                            {isPlaying && totalDuration > 0 && (
                                <div className="mt-2.5">
                                    <ProgressBar />
                                </div>
                            )}

                            {/* Text Display - Positioned below progress bar */}
                            <div className="mt-4 px-6">
                                <div className="text-center max-w-md mx-auto">
                                    {currentDisplayText && (
                                        <div className="mb-4">
                                            <p
                                                key={textKey}
                                                className="text-white text-xl font-bold leading-relaxed"
                                                style={{
                                                    animation: 'textFadeIn 0.5s ease-out forwards'
                                                }}
                                            >
                                                {currentDisplayText}
                                            </p>
                                        </div>
                                    )}

                                    {!isPlaying && !isGeneratingAudio && !currentDisplayText && (
                                        <div className="text-center">
                                            <p className="text-white text-lg font-bold leading-relaxed">
                                                Press play to start this Ember
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Bottom Section - Black background area - flexible height */}
                            <div className="relative flex-1 overflow-hidden">
                                {/* Background for remaining area */}
                                <div className="absolute inset-0 bg-black"></div>

                                {/* End hold screen */}
                                {showEndHold && (
                                    <div className="absolute inset-0 flex items-center justify-center bg-black">
                                        <div className="text-center">
                                            <div className="flex justify-center mb-4">
                                                <img
                                                    src="/EMBERFAV.svg"
                                                    alt="Ember Logo"
                                                    className="w-16 h-16"
                                                    style={{
                                                        opacity: showEndLogo ? 1 : 0,
                                                        animation: showEndLogo ? 'logoFadeIn 0.8s ease-out forwards' : 'none'
                                                    }}
                                                />
                                            </div>
                                            <p
                                                className="text-white text-lg font-medium"
                                                style={{
                                                    opacity: showEndText ? 1 : 0,
                                                    animation: showEndText ? 'endTextFadeIn 0.8s ease-out forwards' : 'none'
                                                }}
                                            >
                                                Ask Ember AI
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
                <Card className="py-0 w-full h-full bg-black rounded-none border-0">
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
                                        className="absolute inset-0 w-full h-full object-cover"
                                        style={combinedEffectStyles}
                                    />
                                )}

                                {/* Show main ember image when no media image and playing without story cut - with visual effects coordination */}
                                {!isGeneratingAudio && !showEndHold && !currentMediaColor && !currentMediaImageUrl && (isPlaying && !currentlyPlayingStoryCut) && ember?.image_url && (
                                    <img
                                        src={ember.image_url}
                                        alt={ember?.title || 'Ember'}
                                        className="absolute inset-0 w-full h-full object-cover"
                                        style={combinedEffectStyles}
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
                                        <div className="h-px w-6 bg-gray-300 my-1"></div>

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

                                        {/* Horizontal divider - Only show if there are avatars above */}
                                        {(ember?.owner || sharedUsers.length > 0) && (
                                            <div className="h-px w-6 bg-gray-300 my-1"></div>
                                        )}

                                        {/* Play/Stop Button - toggles between play and stop */}
                                        <button
                                            className="p-1 hover:bg-white/70 rounded-full transition-colors disabled:opacity-50"
                                            onClick={isPlaying ? handleStop : handlePlay}
                                            aria-label={isGeneratingAudio ? "Preparing Story..." : (!ember || !storyCuts) ? "Loading..." : (isPlaying ? "Stop story" : "Play story")}
                                            type="button"
                                            disabled={isGeneratingAudio || !ember || !storyCuts}
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

                                {/* Progress Bar - Near bottom of area */}
                                {(isPlaying || showEndHold) && totalDuration > 0 && (
                                    <div className="absolute bottom-20 left-0 right-0">
                                        <ProgressBar />
                                    </div>
                                )}

                                {/* Text Display - Positioned below progress bar */}
                                <div className="absolute bottom-0 left-0 right-0 p-8">
                                    <div className="text-center max-w-md mx-auto">
                                        {currentDisplayText && (
                                            <div className="mb-4">
                                                <p
                                                    key={textKey}
                                                    className="text-white text-xl font-bold leading-relaxed"
                                                    style={{
                                                        animation: 'textFadeIn 0.5s ease-out forwards'
                                                    }}
                                                >
                                                    {currentDisplayText}
                                                </p>
                                            </div>
                                        )}

                                        {!isPlaying && !isGeneratingAudio && !currentDisplayText && (
                                            <div className="text-center">
                                                <p className="text-white text-lg font-bold leading-relaxed">
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
                                            <div className="flex justify-center">
                                                <img
                                                    src="/EMBERFAV.svg"
                                                    alt="Ember Logo"
                                                    className="w-16 h-16"
                                                    style={{
                                                        opacity: showEndLogo ? 1 : 0,
                                                        animation: showEndLogo ? 'logoFadeIn 0.8s ease-out forwards' : 'none'
                                                    }}
                                                />
                                            </div>
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