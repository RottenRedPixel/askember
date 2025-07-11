// Media processing and analysis handlers for EmberDetail component

// Auto-trigger image analysis if not yet completed (mobile fix)
export const autoTriggerImageAnalysis = async (ember, user, { imageAnalysisData, isAutoAnalyzing, setIsAutoAnalyzing, fetchEmber }) => {
    if (!ember?.id || !ember?.image_url || !user?.id) {
        console.log('🔍 [AUTO-ANALYSIS] Missing required data for auto-analysis');
        return;
    }

    // Check if analysis already exists or is in progress
    if (ember.image_analysis_completed || imageAnalysisData || isAutoAnalyzing) {
        console.log('🔍 [AUTO-ANALYSIS] Analysis already exists/in progress, skipping auto-trigger');
        return;
    }

    try {
        console.log('🔍 [AUTO-ANALYSIS] Starting automatic image analysis for ember:', ember.id);
        console.log('📸 [AUTO-ANALYSIS] Image URL:', ember.image_url.substring(0, 50) + '...');

        // Set loading state
        setIsAutoAnalyzing(true);

        // Import the analysis functions dynamically
        const { triggerImageAnalysis, saveImageAnalysis } = await import('@/lib/database');

        // Trigger the analysis
        const analysisResult = await triggerImageAnalysis(ember.id, ember.image_url);

        if (analysisResult && analysisResult.success) {
            console.log('💾 [AUTO-ANALYSIS] Saving analysis result...');

            // Save the analysis result
            await saveImageAnalysis(
                ember.id,
                user.id,
                analysisResult.analysis,
                ember.image_url,
                analysisResult.model,
                analysisResult.tokensUsed
            );

            console.log('✅ [AUTO-ANALYSIS] Image analysis completed and saved automatically');

            // Refresh ember data to show the analysis
            await fetchEmber();

        } else {
            console.warn('⚠️ [AUTO-ANALYSIS] Analysis result was not successful:', analysisResult);
        }

    } catch (error) {
        console.error('❌ [AUTO-ANALYSIS] Automatic image analysis failed:', error);
        // Don't show user error for background auto-analysis - they can always trigger manually
    } finally {
        // Clear loading state
        setIsAutoAnalyzing(false);
    }
};

// Auto-trigger EXIF processing if not yet completed (ultra-fast creation)
export const autoTriggerExifProcessing = async (ember, user, { isExifProcessing, setIsExifProcessing, fetchEmber }) => {
    if (!ember?.id || !ember?.image_url || !user?.id) {
        console.log('📸 [AUTO-EXIF] Missing required data for auto-EXIF processing');
        return;
    }

    // Check if EXIF processing already done or in progress
    if (isExifProcessing) {
        console.log('📸 [AUTO-EXIF] EXIF processing already in progress, skipping');
        return;
    }

    // Check if we already have photos with EXIF data for this ember
    try {
        const { getEmberPhotos } = await import('@/lib/photos');
        const photos = await getEmberPhotos(ember.id);

        if (photos && photos.length > 0) {
            console.log('📸 [AUTO-EXIF] EXIF processing already completed, skipping');
            return;
        }
    } catch (error) {
        console.log('📸 [AUTO-EXIF] Could not check existing photos, proceeding with EXIF processing');
    }

    try {
        console.log('📸 [AUTO-EXIF] Starting automatic EXIF processing for ember:', ember.id);
        console.log('📸 [AUTO-EXIF] Image URL:', ember.image_url.substring(0, 50) + '...');

        // Set loading state
        setIsExifProcessing(true);

        // Fetch the image from the blob URL
        console.log('📸 [AUTO-EXIF] Fetching image from blob URL...');
        const response = await fetch(ember.image_url);
        const blob = await response.blob();

        // Convert blob to File object
        const file = new File([blob], 'ember-image.jpg', { type: blob.type });

        // Import the photo functions dynamically
        const { uploadImageWithExif } = await import('@/lib/photos');
        const { autoUpdateEmberTimestamp } = await import('@/lib/geocoding');

        // Process EXIF data
        console.log('📸 [AUTO-EXIF] Processing EXIF data...');
        const photoResult = await uploadImageWithExif(file, user.id, ember.id);

        if (photoResult.success) {
            console.log('📸 [AUTO-EXIF] EXIF processing completed successfully');

            // Process timestamp data
            try {
                console.log('🕐 [AUTO-EXIF] Processing timestamp data...');
                await autoUpdateEmberTimestamp(ember, photoResult, user.id);
                console.log('✅ [AUTO-EXIF] Timestamp data processed successfully');
            } catch (timestampError) {
                console.warn('⚠️ [AUTO-EXIF] Failed to process timestamp data:', timestampError);
            }

            // Refresh ember data to show the updates
            await fetchEmber();

        } else {
            console.warn('⚠️ [AUTO-EXIF] EXIF processing was not successful:', photoResult);
        }

    } catch (error) {
        console.error('❌ [AUTO-EXIF] Automatic EXIF processing failed:', error);
        // Don't show user error for background auto-EXIF - not critical for user experience
    } finally {
        // Clear loading state
        setIsExifProcessing(false);
    }
};

// Auto-trigger location processing if not yet completed (Android mobile fix)
export const autoTriggerLocationProcessing = async (ember, user, { isAutoLocationProcessing, setIsAutoLocationProcessing, fetchEmber }) => {
    if (!ember?.id || !user?.id) {
        console.log('📍 [AUTO-LOCATION] Missing required data for auto-location processing');
        return;
    }

    // Check if location already exists or is in progress
    if ((ember.latitude && ember.longitude) || isAutoLocationProcessing) {
        console.log('📍 [AUTO-LOCATION] Location already exists/in progress, skipping auto-trigger');
        return;
    }

    try {
        console.log('📍 [AUTO-LOCATION] Starting automatic location processing for ember:', ember.id);

        // Set loading state
        setIsAutoLocationProcessing(true);

        // Import the photo functions dynamically
        const { getEmberPhotos } = await import('@/lib/photos');
        const { autoUpdateEmberLocation } = await import('@/lib/geocoding');

        // Get photos for this ember
        const photos = await getEmberPhotos(ember.id);

        if (photos && photos.length > 0) {
            // Find the first photo with GPS data
            const photoWithGPS = photos.find(photo => photo.latitude && photo.longitude);

            if (photoWithGPS) {
                console.log('📍 [AUTO-LOCATION] Found photo with GPS data, processing location...');

                // Create photoResult-like object for the location processing function
                const photoResult = {
                    success: true,
                    photo: photoWithGPS,
                    hasGPS: true,
                    hasTimestamp: !!photoWithGPS.timestamp
                };

                // Trigger the location processing
                const locationResult = await autoUpdateEmberLocation(ember, photoResult, user.id);

                if (locationResult) {
                    console.log('✅ [AUTO-LOCATION] Location processing completed successfully');

                    // Refresh ember data to show the location
                    await fetchEmber();
                } else {
                    console.log('📍 [AUTO-LOCATION] Location processing completed but no update needed');
                }
            } else {
                console.log('📍 [AUTO-LOCATION] No photos with GPS data found for this ember');
            }
        } else {
            console.log('📍 [AUTO-LOCATION] No photos found for this ember');
        }

    } catch (error) {
        console.error('❌ [AUTO-LOCATION] Automatic location processing failed:', error);
        // Don't show user error for background auto-location - location isn't critical
    } finally {
        // Clear loading state
        setIsAutoLocationProcessing(false);
    }
};

// Detect frame type based on image orientation
export const determineFrameType = (imageUrl) => {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
            const aspectRatio = img.naturalWidth / img.naturalHeight;

            if (aspectRatio > 1) {
                // Landscape
                resolve('landscape');
            } else {
                // Portrait
                resolve('portrait');
            }
        };
        img.src = imageUrl;
    });
};

// Handle audio playback for ember stories
export const handlePlay = async (ember, storyCuts, primaryStoryCut, selectedEmberVoice, audioState, setters) => {
    const {
        isPlaying,
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
    } = setters;

    if (isPlaying) {
        // Stop current audio with smooth exit
        handleExitPlay();
        return;
    }

    try {
        setShowFullscreenPlay(true);
        setIsGeneratingAudio(true); // Show loading state

        console.log('🎬 Visual effects will be driven by audio segments');

        // Check if we have story cuts available
        if (storyCuts && storyCuts.length > 0) {
            // Prioritize "The One" primary story cut, fallback to most recent
            let selectedStoryCut;
            if (primaryStoryCut) {
                selectedStoryCut = primaryStoryCut;
                console.log('🎬 Playing "The One" primary story cut:', selectedStoryCut.title, '(' + selectedStoryCut.style + ')');
            } else {
                selectedStoryCut = storyCuts[0]; // They're ordered by created_at DESC
                console.log('🎬 Playing most recent story cut:', selectedStoryCut.title, '(' + selectedStoryCut.style + ')');
            }

            setCurrentlyPlayingStoryCut(selectedStoryCut);

            console.log('📖 Story cut script:', selectedStoryCut.full_script);

            // Check if we have recorded audio URLs in the story cut
            const recordedAudio = selectedStoryCut.metadata?.recordedAudio || {};
            console.log('🎙️ Recorded audio available:', Object.keys(recordedAudio));

            // Always use multi-voice playback system (recorded audio is optional)
            console.log('🎵 Using multi-voice playback system');
            console.log('🎙️ Available recorded audio:', recordedAudio);
            console.log('🔍 Story cut voice IDs:', {
                ember: selectedStoryCut.ember_voice_id,
                narrator: selectedStoryCut.narrator_voice_id,
                ember_name: selectedStoryCut.ember_voice_name,
                narrator_name: selectedStoryCut.narrator_voice_name
            });

            // Parse the script into segments
            const { parseScriptSegments } = await import('@/lib/scriptParser');
            const { playMultiVoiceAudio } = await import('@/lib/emberPlayer');
            const { textToSpeech } = await import('@/lib/elevenlabs');

            const segments = parseScriptSegments(selectedStoryCut.full_script);

            if (segments.length > 0) {
                // Use multi-voice playback system (works with or without recorded audio)
                await playMultiVoiceAudio(segments, selectedStoryCut, recordedAudio, {
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
                    // 🎯 Add sentence-by-sentence display state setters
                    setCurrentDisplayText,
                    setCurrentVoiceTag,
                    setCurrentSentenceIndex,
                    setCurrentSegmentSentences,
                    setSentenceTimeouts,
                    sentenceTimeouts,
                    // 🎯 Add media timeout management
                    setMediaTimeouts,
                    mediaTimeouts,
                    mediaTimeoutsRef
                }, ember);
            } else {
                // Fallback if no segments could be parsed
                console.log('⚠️ No segments could be parsed, falling back to single voice');
                setIsGeneratingAudio(false);
                setIsPlaying(true);

                const content = selectedStoryCut.full_script;
                const voiceId = selectedStoryCut.ember_voice_id;

                const audioBlob = await textToSpeech(content, voiceId);
                const audioUrl = URL.createObjectURL(audioBlob);
                const audio = new Audio(audioUrl);

                setCurrentAudio(audio);

                audio.onended = () => {
                    handlePlaybackComplete();
                    URL.revokeObjectURL(audioUrl);
                };

                audio.onerror = () => {
                    console.error('Audio playback failed');
                    handleExitPlay();
                    URL.revokeObjectURL(audioUrl);
                };

                await audio.play();
            }

        } else {
            // Fallback to basic wiki content if no story cuts exist
            console.log('📖 No story cuts found, using basic wiki content');
            console.log('💡 Tip: Create a story cut for richer, AI-generated narration!');

            setIsGeneratingAudio(false);
            setIsPlaying(true);

            // Simple fallback content
            const content = "Let's build this story together by pressing Story Cuts on the bottom left.";
            console.log('📖 Content to narrate:', content);

            // Generate speech using ElevenLabs with Ember voice (Lily)
            const { textToSpeech } = await import('@/lib/elevenlabs');
            const audioBlob = await textToSpeech(content, selectedEmberVoice);

            // Create audio URL and play
            const audioUrl = URL.createObjectURL(audioBlob);
            const audio = new Audio(audioUrl);

            setCurrentAudio(audio);

            // Handle audio end
            audio.onended = () => {
                handlePlaybackComplete();
                URL.revokeObjectURL(audioUrl);

                // Show helpful message about creating story cuts for richer narration
                setTimeout(() => {
                    setMessage({
                        type: 'info',
                        text: 'Want richer narration? Create a Story Cut with AI-generated scripts in different styles!'
                    });
                    setTimeout(() => setMessage(null), 6000);
                }, 1000);
            };

            // Handle audio error
            audio.onerror = () => {
                console.error('Audio playback failed');
                handleExitPlay();
                URL.revokeObjectURL(audioUrl);
            };

            await audio.play();
        }

    } catch (error) {
        console.error('🔊 Play error:', error);
        setIsPlaying(false);
        setIsGeneratingAudio(false);
        setShowFullscreenPlay(false);
        alert('Failed to generate audio. Please check your ElevenLabs API key configuration.');
    }
};

// Handle playback completion
export const handlePlaybackComplete = (setters) => {
    const {
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
    } = setters;

    console.log('🎬 Playback completed');
    setIsPlaying(false);
    setShowFullscreenPlay(false);
    setCurrentlyPlayingStoryCut(null);

    // Clear all visual state
    setActiveAudioSegments([]);
    setCurrentVoiceType(null);
    setCurrentVoiceTransparency(0.2);
    setCurrentMediaColor(null);
    setCurrentZoomScale({ start: 1.0, end: 1.0 });
    setCurrentMediaImageUrl(null);

    // Clear sentence-by-sentence display state
    setCurrentDisplayText('');
    setCurrentVoiceTag('');
    setCurrentSentenceIndex(0);
    setCurrentSegmentSentences([]);

    // Clear all sentence timeouts
    sentenceTimeouts.forEach(timeoutId => clearTimeout(timeoutId));
    setSentenceTimeouts([]);

    // Clear all media timeouts
    mediaTimeouts.forEach(timeoutId => clearTimeout(timeoutId));
    setMediaTimeouts([]);
    mediaTimeoutsRef.current.forEach(timeoutId => clearTimeout(timeoutId));
    mediaTimeoutsRef.current = [];

    console.log('🧹 All timeouts and visual state cleared');
};

// Handle exit play with cleanup
export const handleExitPlay = (setters) => {
    const {
        currentAudio,
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
        mediaTimeoutsRef,
        playbackStoppedRef
    } = setters;

    console.log('🔴 Exiting play mode...');

    // Signal that playback should stop
    playbackStoppedRef.current = true;

    // Stop current audio if playing
    if (currentAudio) {
        console.log('⏹️ Stopping current audio...');
        currentAudio.pause();
        currentAudio.currentTime = 0;
    }

    // Clear all visual state immediately
    setIsPlaying(false);
    setShowFullscreenPlay(false);
    setCurrentlyPlayingStoryCut(null);
    setActiveAudioSegments([]);
    setCurrentVoiceType(null);
    setCurrentVoiceTransparency(0.2);
    setCurrentMediaColor(null);
    setCurrentZoomScale({ start: 1.0, end: 1.0 });
    setCurrentMediaImageUrl(null);

    // Clear sentence-by-sentence display state
    setCurrentDisplayText('');
    setCurrentVoiceTag('');
    setCurrentSentenceIndex(0);
    setCurrentSegmentSentences([]);

    // Clear all sentence timeouts
    sentenceTimeouts.forEach(timeoutId => clearTimeout(timeoutId));
    setSentenceTimeouts([]);

    // Clear all media timeouts
    mediaTimeouts.forEach(timeoutId => clearTimeout(timeoutId));
    setMediaTimeouts([]);
    mediaTimeoutsRef.current.forEach(timeoutId => clearTimeout(timeoutId));
    mediaTimeoutsRef.current = [];

    console.log('✅ Play mode exited and all timeouts cleared');

    // Reset the playback stopped flag after a brief delay
    setTimeout(() => {
        playbackStoppedRef.current = false;
    }, 100);
}; 