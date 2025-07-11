import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Eye, Code, Plus, GripVertical, Save, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { FilmSlate, PencilSimple } from 'phosphor-react';
import { getStoryCutById, getPrimaryStoryCut, updateStoryCut, getEmber, getAllStoryMessagesForEmber, saveContributorAudioPreferences, loadContributorAudioPreferences } from '@/lib/database';
import { getStyleDisplayName } from '@/lib/styleUtils';
import { formatDuration } from '@/lib/dateUtils';
import { resolveMediaReference } from '@/lib/scriptParser';
import { handlePlay as handleMediaPlay, handlePlaybackComplete as handleMediaPlaybackComplete, handleExitPlay as handleMediaExitPlay } from '@/lib/mediaHandlers';
import useStore from '@/store';
import { useUIState } from '@/lib/useUIState';

export default function StoryCutStudio() {
    const { id } = useParams(); // This is the ember ID
    const navigate = useNavigate();
    const { user } = useStore();
    const [blocks, setBlocks] = useState([]);
    const [selectedBlock, setSelectedBlock] = useState(null);
    const [viewMode, setViewMode] = useState('visual'); // 'visual' or 'code'
    const [selectedEffects, setSelectedEffects] = useState({}); // Track selected checkboxes (can be multiple per block)
    const [effectDirections, setEffectDirections] = useState({}); // Track effect directions (in/out, left/right)
    const [effectDurations, setEffectDurations] = useState({}); // Track effect duration values from sliders

    // Real story cut data
    const [storyCut, setStoryCut] = useState(null);
    const [ember, setEmber] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [updating, setUpdating] = useState(false);

    // Story messages for determining contributor message types
    const [storyMessages, setStoryMessages] = useState([]);

    // Contributor audio preferences - store per block
    const [contributorAudioPreferences, setContributorAudioPreferences] = useState({});

    // Script editing state
    const [isEditingScript, setIsEditingScript] = useState(false);
    const [editedScript, setEditedScript] = useState('');
    const [isSavingScript, setIsSavingScript] = useState(false);

    // Load saved preferences from database on component mount
    useEffect(() => {
        if (id && user) {
            const loadPreferences = async () => {
                try {
                    console.log('🔄 Loading contributor preferences from database...');
                    const databasePreferences = await loadContributorAudioPreferences(id);

                    // Migration: Check for existing localStorage data
                    const localStorageKey = `contributorAudioPreferences_${id}`;
                    const localStoragePreferences = localStorage.getItem(localStorageKey);

                    if (localStoragePreferences && Object.keys(databasePreferences).length === 0) {
                        // Migrate localStorage data to database
                        try {
                            const parsed = JSON.parse(localStoragePreferences);
                            console.log('🔄 Migrating localStorage preferences to database:', parsed);
                            await saveContributorAudioPreferences(id, parsed);
                            setContributorAudioPreferences(parsed);

                            // Clean up localStorage after successful migration
                            localStorage.removeItem(localStorageKey);
                            console.log('✅ Migration complete, localStorage cleaned up');
                        } catch (migrationError) {
                            console.warn('⚠️ Failed to migrate localStorage data:', migrationError);
                            setContributorAudioPreferences(databasePreferences);
                        }
                    } else {
                        // Use database preferences
                        setContributorAudioPreferences(databasePreferences);
                        console.log('✅ Loaded contributor preferences from database:', databasePreferences);
                    }
                } catch (error) {
                    console.warn('⚠️ Failed to load preferences from database:', error);
                    // Fallback to localStorage if database fails
                    try {
                        const savedPreferences = localStorage.getItem(`contributorAudioPreferences_${id}`);
                        if (savedPreferences) {
                            const parsed = JSON.parse(savedPreferences);
                            setContributorAudioPreferences(parsed);
                            console.log('🔄 Fallback: Loaded preferences from localStorage:', parsed);
                        }
                    } catch (fallbackError) {
                        console.warn('⚠️ Fallback to localStorage also failed:', fallbackError);
                    }
                }
            };

            loadPreferences();
        }
    }, [id, user]);

    // Initialize contributor preferences when blocks are loaded
    useEffect(() => {
        if (blocks && blocks.length > 0) {
            const contributorBlocks = blocks.filter(block => block.voiceType === 'contributor');

            setContributorAudioPreferences(prev => {
                const newPreferences = { ...prev };
                let hasChanges = false;

                contributorBlocks.forEach(block => {
                    // Use unique key for each block (voiceTag + block content)
                    const blockKey = `${block.voiceTag}-${block.id}`;

                    // Only set default if no preference exists yet
                    if (!newPreferences[blockKey]) {
                        // Set default based on message type
                        const defaultPreference = block.messageType === 'Audio Message' ? 'recorded' : 'text';
                        newPreferences[blockKey] = defaultPreference;
                        hasChanges = true;
                        console.log(`🎯 Setting default preference for ${blockKey} (${block.messageType}): ${defaultPreference}`);
                    }
                });

                // Only return new object if there were changes
                return hasChanges ? newPreferences : prev;
            });
        }
    }, [blocks]);

    // Save preferences to database whenever they change
    useEffect(() => {
        if (id && user && Object.keys(contributorAudioPreferences).length > 0) {
            const savePreferences = async () => {
                try {
                    await saveContributorAudioPreferences(id, contributorAudioPreferences);
                    console.log('💾 Saved contributor preferences to database:', contributorAudioPreferences);
                } catch (error) {
                    console.warn('⚠️ Failed to save preferences to database:', error);
                    // Fallback to localStorage if database fails
                    try {
                        localStorage.setItem(`contributorAudioPreferences_${id}`, JSON.stringify(contributorAudioPreferences));
                        console.log('💾 Fallback: Saved preferences to localStorage');
                    } catch (fallbackError) {
                        console.warn('⚠️ Fallback to localStorage also failed:', fallbackError);
                    }
                }
            };

            // Debounce saving to avoid too many database calls
            const timeoutId = setTimeout(savePreferences, 500);
            return () => clearTimeout(timeoutId);
        }
    }, [contributorAudioPreferences, id, user]);

    // Expose contributor preferences globally for audio generation
    useEffect(() => {
        if (typeof window !== 'undefined') {
            // For multiple blocks per contributor, use block-specific preferences
            // The audio player will match blocks individually rather than consolidating
            window.contributorAudioPreferences = contributorAudioPreferences;
            console.log('🎭 Updated contributor audio preferences for audio player:', contributorAudioPreferences);
            console.log('🎭 Raw block preferences:', contributorAudioPreferences);
        }
    }, [contributorAudioPreferences]);

    // Use the same UI state management as EmberDetail
    const uiState = useUIState();
    const {
        // Audio states
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
        mediaTimeoutsRef,
        message, setMessage
    } = uiState;

    // Load real story cut data
    useEffect(() => {
        const loadStoryCut = async () => {
            if (!id) return;

            try {
                setLoading(true);
                setError(null);

                // Get the primary story cut for this ember
                console.log('🎬 Loading primary story cut for ember:', id);
                const primaryStoryCut = await getPrimaryStoryCut(id);

                if (!primaryStoryCut) {
                    setError('No primary story cut found for this ember.');
                    return;
                }

                console.log('✅ Loaded story cut:', primaryStoryCut.title);
                setStoryCut(primaryStoryCut);

                // Load ember data for the player
                console.log('🌟 Loading ember data for player...');
                const emberData = await getEmber(id);
                setEmber(emberData);

                // Load story messages for contributor type detection
                console.log('📖 Loading story messages for contributor type detection...');
                let loadedStoryMessages = [];
                try {
                    const allStoryMessages = await getAllStoryMessagesForEmber(id);
                    loadedStoryMessages = allStoryMessages?.messages || [];
                    setStoryMessages(loadedStoryMessages);
                    console.log('✅ Loaded story messages:', loadedStoryMessages.length);
                } catch (messageError) {
                    console.warn('⚠️ Could not load story messages:', messageError);
                    setStoryMessages([]);
                }

                // Function to determine message type based on original story messages
                const determineMessageType = (voiceTag, content, voiceType) => {
                    if (voiceType !== 'contributor') {
                        return 'AI Voice';
                    }

                    // For contributors, try to match with original story messages
                    if (!loadedStoryMessages || loadedStoryMessages.length === 0) {
                        console.log(`🔍 No story messages available for ${voiceTag}`);
                        return 'Text Response'; // Default to text if no messages available
                    }

                    console.log(`🔍 DEBUGGING ${voiceTag}:`);
                    console.log(`  Script content: "${content}"`);
                    console.log(`  Total story messages: ${loadedStoryMessages.length}`);
                    console.log(`  Ember owner user_id: ${emberData?.user_id}`);

                    // Debug all messages before filtering
                    loadedStoryMessages.forEach((msg, index) => {
                        console.log(`  Message ${index}: user_id="${msg.user_id}", sender="${msg.sender}", content="${msg.content?.substring(0, 50)}...", has_audio=${msg.has_audio}`);
                    });

                    // Get contributor messages (filter by sender - "user" messages are from contributors)
                    const contributorMessages = loadedStoryMessages.filter(msg => msg.sender === 'user')
                        .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

                    console.log(`  Available contributor messages after filtering: ${contributorMessages.length}`);

                    // Try to find a message that corresponds to this voice line by content matching
                    for (const msg of contributorMessages) {
                        if (msg.content && msg.content.trim()) {
                            console.log(`  Checking message: "${msg.content}" (has_audio: ${msg.has_audio})`);

                            // More flexible matching approach
                            const msgContent = msg.content.toLowerCase().trim();
                            const scriptContent = content.toLowerCase().trim();

                            // Method 1: Exact match
                            if (msgContent === scriptContent) {
                                console.log(`  ✅ EXACT MATCH found! has_audio: ${msg.has_audio}`);
                                return msg.has_audio ? 'Audio Message' : 'Text Response';
                            }

                            // Method 2: One contains the other
                            if (msgContent.includes(scriptContent) || scriptContent.includes(msgContent)) {
                                console.log(`  ✅ SUBSTRING MATCH found! has_audio: ${msg.has_audio}`);
                                return msg.has_audio ? 'Audio Message' : 'Text Response';
                            }

                            // Method 3: Word-based matching with lower threshold
                            const msgWords = msgContent.split(/\s+/).filter(word => word.length > 2);
                            const scriptWords = scriptContent.split(/\s+/).filter(word => word.length > 2);

                            // Count matching words
                            let matchingWords = 0;
                            for (const word of msgWords) {
                                if (scriptWords.includes(word)) {
                                    matchingWords++;
                                }
                            }

                            // If more than 50% of words match, consider it a match
                            const matchPercentage = matchingWords / Math.min(msgWords.length, scriptWords.length);
                            console.log(`  Word match: ${matchingWords}/${Math.min(msgWords.length, scriptWords.length)} = ${Math.round(matchPercentage * 100)}%`);

                            if (matchPercentage >= 0.5 && matchingWords >= 2) {
                                console.log(`  ✅ WORD MATCH found! has_audio: ${msg.has_audio}`);
                                return msg.has_audio ? 'Audio Message' : 'Text Response';
                            }
                        }
                    }

                    // Default to text response if no match found
                    console.log(`  ❌ No message match found for "${content.substring(0, 50)}..." - defaulting to Text Response`);
                    return 'Text Response';
                };

                // Parse the actual script and create blocks with real content
                const realBlocks = [];

                // Always add start block
                realBlocks.push({
                    id: 1,
                    type: 'start',
                    title: 'Start Story'
                });

                // Parse the actual script
                if (primaryStoryCut.full_script) {
                    const lines = primaryStoryCut.full_script.split('\n');
                    let blockId = 2;

                    for (const line of lines) {
                        const trimmedLine = line.trim();
                        if (!trimmedLine) continue;

                        // Match media tags
                        const mediaMatch = trimmedLine.match(/^\[\[(MEDIA|HOLD)\]\]\s*(.*)$/);
                        if (mediaMatch) {
                            const mediaType = mediaMatch[1];
                            const content = mediaMatch[2].trim();

                            if (mediaType === 'MEDIA') {
                                // Extract media name or ID
                                console.log('🔍 Parsing MEDIA content:', content);

                                // Check for ID format first
                                const idMatch = content.match(/id=([a-zA-Z0-9\-_]+)/);
                                // Check for name format
                                const nameMatch = content.match(/name="([^"]+)"/);

                                let mediaName = 'Unknown Media';
                                let mediaId = null;

                                if (idMatch) {
                                    mediaId = idMatch[1];
                                    mediaName = 'Loading...'; // Will be replaced with actual display name
                                    console.log('🔍 Extracted media ID:', mediaId);
                                } else if (nameMatch) {
                                    mediaName = nameMatch[1];
                                    console.log('🔍 Extracted media name:', mediaName);
                                }

                                realBlocks.push({
                                    id: blockId++,
                                    type: 'media',
                                    mediaName: mediaName,
                                    mediaId: mediaId,
                                    mediaUrl: 'https://picsum.photos/400/300?random=1', // Will be resolved
                                    effect: null,
                                    duration: 0
                                });
                            } else if (mediaType === 'HOLD') {
                                // Extract color and duration
                                const colorMatch = content.match(/COLOR:(#[0-9A-Fa-f]{6})/);
                                const durationMatch = content.match(/duration=([\d.]+)/);
                                const color = colorMatch ? colorMatch[1] : '#000000';
                                const duration = durationMatch ? parseFloat(durationMatch[1]) : 4.0;

                                realBlocks.push({
                                    id: blockId++,
                                    type: 'hold',
                                    effect: `COLOR:${color}`,
                                    duration: duration,
                                    color: color
                                });
                            }
                        } else {
                            // Match voice tags
                            const voiceMatch = trimmedLine.match(/^\[([^\]]+)\]\s*(.+)$/);
                            if (voiceMatch) {
                                const voiceTag = voiceMatch[1].trim();
                                const content = voiceMatch[2].trim();

                                // Determine voice type and enhance display name
                                let voiceType = 'contributor';
                                let enhancedVoiceTag = voiceTag;

                                if (voiceTag.toLowerCase().includes('ember')) {
                                    voiceType = 'ember';
                                    const emberVoiceName = primaryStoryCut.ember_voice_name || 'Unknown Voice';
                                    enhancedVoiceTag = `Ember Voice (${emberVoiceName})`;
                                } else if (voiceTag.toLowerCase().includes('narrator')) {
                                    voiceType = 'narrator';
                                    const narratorVoiceName = primaryStoryCut.narrator_voice_name || 'Unknown Voice';
                                    enhancedVoiceTag = `Narrator (${narratorVoiceName})`;
                                }

                                // Determine the correct message type
                                const messageType = determineMessageType(voiceTag, content, voiceType);

                                realBlocks.push({
                                    id: blockId++,
                                    type: 'voice',
                                    voiceTag: enhancedVoiceTag,
                                    content: content,
                                    voiceType: voiceType,
                                    avatarUrl: voiceType === 'contributor' ? 'https://i.pravatar.cc/40?img=1' : '/EMBERFAV.svg',
                                    messageType: messageType
                                });
                            }
                        }
                    }
                }

                // Always add end block
                realBlocks.push({
                    id: 999,
                    type: 'end',
                    title: 'End Story'
                });

                // Resolve actual media URLs and display names for media blocks
                for (let block of realBlocks) {
                    if (block.type === 'media' && block.mediaId) {
                        try {
                            // Get all available media for this ember to find display name
                            const { getEmberPhotos } = await import('@/lib/photos');
                            const { getEmberSupportingMedia } = await import('@/lib/database');

                            const [emberPhotos, supportingMedia] = await Promise.all([
                                getEmberPhotos(id),
                                getEmberSupportingMedia(id)
                            ]);

                            // Search for the media by ID
                            const photoMatch = emberPhotos.find(photo => photo.id === block.mediaId);
                            const mediaMatch = supportingMedia.find(media => media.id === block.mediaId);

                            if (photoMatch) {
                                block.mediaName = photoMatch.display_name || photoMatch.original_filename;
                                block.mediaUrl = photoMatch.storage_url;
                                console.log('📸 Resolved photo:', block.mediaName, ':', block.mediaUrl);
                            } else if (mediaMatch) {
                                block.mediaName = mediaMatch.display_name || mediaMatch.file_name;
                                block.mediaUrl = mediaMatch.file_url;
                                console.log('📸 Resolved supporting media:', block.mediaName, ':', block.mediaUrl);
                            } else {
                                console.log('⚠️ No media found with ID:', block.mediaId);
                                block.mediaName = 'Media Not Found';
                            }
                        } catch (error) {
                            console.error('❌ Failed to resolve media for ID', block.mediaId, ':', error);
                            block.mediaName = 'Error Loading Media';
                        }
                    } else if (block.type === 'media' && block.mediaName && block.mediaName !== 'Loading...') {
                        // Handle name-based media references
                        try {
                            const fakeSegment = { mediaName: block.mediaName, mediaId: null };
                            const resolvedUrl = await resolveMediaReference(fakeSegment, id);
                            if (resolvedUrl) {
                                block.mediaUrl = resolvedUrl;
                                console.log('📸 Resolved media URL for', block.mediaName, ':', resolvedUrl);
                            }
                        } catch (error) {
                            console.error('❌ Failed to resolve media URL for', block.mediaName, ':', error);
                        }
                    }
                }

                setBlocks(realBlocks);

                // Initialize selected effects for blocks that have effects by default
                const initialEffects = {};
                const initialDirections = {};
                const initialDurations = {};
                realBlocks.forEach(block => {
                    if (block.type === 'hold') {
                        initialEffects[`hold-${block.id}`] = [];
                        initialDurations[`hold-duration-${block.id}`] = block.duration || 4.0;
                    }
                    // Set default directions for all effects
                    initialDirections[`fade-${block.id}`] = 'in';
                    initialDirections[`pan-${block.id}`] = 'left';
                    initialDirections[`zoom-${block.id}`] = 'in';

                    // Set default durations for all effects
                    initialDurations[`fade-${block.id}`] = 3.0;
                    initialDurations[`pan-${block.id}`] = 4.0;
                    initialDurations[`zoom-${block.id}`] = 3.5;
                });
                setSelectedEffects(initialEffects);
                setEffectDirections(initialDirections);
                setEffectDurations(initialDurations);

            } catch (err) {
                console.error('Failed to load story cut:', err);
                setError(err.message || 'Failed to load story cut');
            } finally {
                setLoading(false);
            }
        };

        loadStoryCut();
    }, [id]);

    // Cleanup all audio when component unmounts
    useEffect(() => {
        return () => {
            console.log('🧹 StoryCutStudio unmounting, cleaning up audio...');
            // Stop any playing audio
            if (currentAudio) {
                currentAudio.pause();
                currentAudio.currentTime = 0;
            }

            playbackStoppedRef.current = true;

            // Clean up any timeouts
            sentenceTimeouts.forEach(timeoutId => clearTimeout(timeoutId));
            mediaTimeouts.forEach(timeoutId => clearTimeout(timeoutId));
            mediaTimeoutsRef.current.forEach(timeoutId => clearTimeout(timeoutId));
        };
    }, [currentAudio, sentenceTimeouts, mediaTimeouts]);

    const generateScript = () => {
        return blocks.map(block => {
            switch (block.type) {
                case 'media':
                    // Use ID format if available, otherwise fallback to name format
                    let mediaLine = block.mediaId ?
                        `[[MEDIA]] <id=${block.mediaId}>` :
                        `[[MEDIA]] <name="${block.mediaName}">`;

                    // Build effects from current state
                    const blockEffects = selectedEffects[`effect-${block.id}`] || [];
                    const effectParts = [];

                    blockEffects.forEach(effectType => {
                        const direction = effectDirections[`${effectType}-${block.id}`];
                        const duration = effectDurations[`${effectType}-${block.id}`] || 0;

                        if (duration > 0) {
                            let effectString = '';
                            if (effectType === 'fade') {
                                effectString = `FADE-${direction?.toUpperCase() || 'IN'}:duration=${duration}`;
                            } else if (effectType === 'pan') {
                                effectString = `PAN-${direction?.toUpperCase() || 'LEFT'}:duration=${duration}`;
                            } else if (effectType === 'zoom') {
                                effectString = `ZOOM-${direction?.toUpperCase() || 'IN'}:duration=${duration}`;
                            }
                            if (effectString) effectParts.push(effectString);
                        }
                    });

                    if (effectParts.length > 0) {
                        mediaLine += ` <${effectParts.join(',')}>`;
                    }

                    return mediaLine;
                case 'voice':
                    return `[${block.voiceTag}] ${block.content}`;
                case 'hold':
                    const holdEffects = selectedEffects[`hold-${block.id}`] || [];
                    const holdDuration = effectDurations[`hold-duration-${block.id}`] || block.duration || 4.0;

                    if (holdEffects.includes('fade')) {
                        return `[[HOLD]] <COLOR:${block.color},duration=${holdDuration}>`;
                    } else {
                        return `[[HOLD]] <COLOR:${block.color}>`;
                    }
                case 'start':
                    return ''; // Start blocks don't generate script content
                case 'end':
                    return ''; // End blocks don't generate script content
                default:
                    return '';
            }
        }).filter(line => line.trim() !== '').join('\n\n');
    };

    // Handle updating the story cut
    const handleUpdateStoryCut = async () => {
        if (!user || !storyCut) return;

        try {
            setUpdating(true);

            // Generate the updated script from current visual controls
            const updatedScript = generateScript();
            console.log('🔄 Updating story cut with script:', updatedScript);

            // Update the story cut in the database
            await updateStoryCut(storyCut.id, {
                full_script: updatedScript
            }, user.id);

            console.log('✅ Story cut updated successfully');

            // Update the local state to reflect the changes
            setStoryCut(prev => ({
                ...prev,
                full_script: updatedScript
            }));

            // Optionally, show a success message or navigate back
            // navigate(`/embers/${id}`);

        } catch (error) {
            console.error('❌ Failed to update story cut:', error);
            setError('Failed to update story cut. Please try again.');
        } finally {
            setUpdating(false);
        }
    };

    // Script editing handlers
    const handleEditScript = () => {
        setEditedScript(storyCut?.full_script || '');
        setIsEditingScript(true);
    };

    const handleCancelScriptEdit = () => {
        setIsEditingScript(false);
        setEditedScript('');
    };

    const handleSaveScript = async () => {
        if (!user || !storyCut?.id || !editedScript.trim()) return;

        try {
            setIsSavingScript(true);

            console.log('🔄 Saving edited script...');

            // Update the story cut in the database
            await updateStoryCut(storyCut.id, {
                full_script: editedScript.trim()
            }, user.id);

            console.log('✅ Script updated successfully');

            // Update the local state
            setStoryCut(prev => ({
                ...prev,
                full_script: editedScript.trim()
            }));

            // Exit edit mode
            setIsEditingScript(false);
            setEditedScript('');

        } catch (error) {
            console.error('❌ Error updating script:', error);
            setError('Failed to update script. Please try again.');
        } finally {
            setIsSavingScript(false);
        }
    };

    // Handle previewing the story cut


    // Player handlers
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

    // Helper functions
    const formatDuration = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        if (mins > 0) {
            return `${mins}:${secs.toString().padStart(2, '0')}`;
        }
        return `${secs} sec`;
    };



    // Group blocks by type for display
    const mediaBlocks = blocks.filter(block => block.type === 'media');
    const voiceBlocks = blocks.filter(block => block.type === 'voice');
    const holdBlocks = blocks.filter(block => block.type === 'hold');

    return (
        <div className="min-h-screen bg-white">
            {/* Header - matches EmberDetail style */}
            <div className="bg-white sticky top-0 z-10">
                <div className="max-w-4xl mx-auto px-4 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setViewMode('visual')}
                                className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${viewMode === 'visual'
                                    ? 'bg-blue-100 text-blue-800'
                                    : 'text-gray-600 hover:text-gray-800'
                                    }`}
                            >
                                <Eye className="w-4 h-4 inline mr-1" />
                                Visual
                            </button>
                            <button
                                onClick={() => setViewMode('code')}
                                className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${viewMode === 'code'
                                    ? 'bg-blue-100 text-blue-800'
                                    : 'text-gray-600 hover:text-gray-800'
                                    }`}
                            >
                                <Code className="w-4 h-4 inline mr-1" />
                                Code
                            </button>

                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content - matches StoryCutDetailContent layout */}
            <div className="max-w-4xl mx-auto px-4 pb-6">
                {viewMode === 'visual' ? (
                    <div className="space-y-4">
                        {/* Timeline Header */}
                        <div className="flex items-center justify-between">
                            <div className="flex-1">
                                <div className="flex items-center gap-2">
                                    <FilmSlate size={20} className="text-blue-600" />
                                    <h3 className="text-lg font-semibold text-gray-900">
                                        {loading ? 'Loading...' : storyCut?.title || 'Untitled Story Cut'}
                                    </h3>
                                </div>
                                {storyCut && !loading && (
                                    <div className="flex items-center justify-between mt-2">
                                        <div className="flex items-center gap-2">
                                            <Badge variant="outline" className="text-xs">
                                                {getStyleDisplayName(storyCut.style)}
                                            </Badge>
                                            <Badge variant="outline" className="text-xs">
                                                {formatDuration(storyCut.duration)}
                                            </Badge>
                                            <Badge variant="outline" className="text-xs">
                                                {storyCut.word_count} words
                                            </Badge>
                                        </div>
                                        <button className="text-sm text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1">
                                            <Plus className="w-4 h-4" />
                                            Add Block
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Loading State */}
                        {loading && (
                            <div className="flex items-center justify-center py-12">
                                <div className="text-gray-500">Loading story cut...</div>
                            </div>
                        )}

                        {/* Error State */}
                        {error && !loading && (
                            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                                <div className="text-red-700">{error}</div>
                                <button
                                    onClick={() => navigate(`/embers/${id}`)}
                                    className="text-red-600 hover:text-red-800 text-sm mt-2 underline"
                                >
                                    ← Go back to ember
                                </button>
                            </div>
                        )}

                        {/* All Blocks in Chronological Order */}
                        {!loading && !error && (
                            <div className="space-y-3">
                                {blocks.map((block, index) => {
                                    // Determine styling based on block type
                                    let bgColor, borderColor, textColor, ringColor, hoverColor;

                                    if (block.type === 'media') {
                                        bgColor = 'bg-blue-50';
                                        borderColor = 'border-blue-200';
                                        textColor = 'text-blue-600';
                                        ringColor = 'ring-blue-500';
                                        hoverColor = 'hover:bg-blue-100';
                                    } else if (block.type === 'voice') {
                                        if (block.voiceType === 'ember') {
                                            bgColor = 'bg-purple-50';
                                            borderColor = 'border-purple-200';
                                            textColor = 'text-purple-600';
                                            ringColor = 'ring-purple-500';
                                            hoverColor = 'hover:bg-purple-100';
                                        } else if (block.voiceType === 'narrator') {
                                            bgColor = 'bg-yellow-50';
                                            borderColor = 'border-yellow-200';
                                            textColor = 'text-yellow-600';
                                            ringColor = 'ring-yellow-500';
                                            hoverColor = 'hover:bg-yellow-100';
                                        } else if (block.voiceType === 'contributor') {
                                            bgColor = 'bg-green-50';
                                            borderColor = 'border-green-200';
                                            textColor = 'text-green-600';
                                            ringColor = 'ring-green-500';
                                            hoverColor = 'hover:bg-green-100';
                                        }
                                    } else if (block.type === 'hold') {
                                        bgColor = 'bg-gray-50';
                                        borderColor = 'border-gray-200';
                                        textColor = 'text-gray-600';
                                        ringColor = 'ring-gray-500';
                                        hoverColor = 'hover:bg-gray-100';
                                    } else if (block.type === 'start' || block.type === 'end') {
                                        bgColor = 'bg-gray-200';
                                        borderColor = 'border-gray-400';
                                        textColor = 'text-gray-800';
                                        ringColor = 'ring-gray-500';
                                        hoverColor = 'hover:bg-gray-300';
                                    }

                                    return (
                                        <div
                                            key={block.id}
                                            className={`p-3 ${bgColor} rounded-lg border ${borderColor} cursor-pointer transition-all ${selectedBlock?.id === block.id ? `ring-2 ${ringColor}` : hoverColor}`}
                                            onClick={() => setSelectedBlock(block)}
                                        >
                                            {block.type === 'media' && (
                                                <>
                                                    <div className="flex items-center justify-between mb-2">
                                                        <div className="flex items-center gap-3">
                                                            <GripVertical className="w-4 h-4 text-gray-400 cursor-grab" />

                                                            {/* Media Thumbnail */}
                                                            {block.mediaUrl && (
                                                                <div className="flex-shrink-0">
                                                                    <img
                                                                        src={block.mediaUrl}
                                                                        alt={block.mediaName}
                                                                        className="w-16 h-16 object-cover rounded-lg border border-gray-300"
                                                                        onError={(e) => {
                                                                            e.target.style.display = 'none';
                                                                        }}
                                                                    />
                                                                </div>
                                                            )}

                                                            <div className="flex items-center gap-2">
                                                                <span className={`font-semibold ${textColor}`}>{block.mediaName}</span>
                                                                {block.effect && (
                                                                    <span className={`text-xs ${bgColor.replace('50', '100')} ${textColor.replace('600', '800')} px-2 py-1 rounded`}>
                                                                        {block.effect} {block.duration > 0 ? `${block.duration} sec` : ''}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                                                            Media File
                                                        </span>
                                                    </div>

                                                    {/* Visual Effect Radio Buttons */}
                                                    <div className="mt-3" style={{ marginLeft: '24px' }}>
                                                        <div className="flex items-center gap-4">
                                                            <label className="flex items-center gap-2 cursor-pointer">
                                                                <input
                                                                    type="checkbox"
                                                                    value="fade"
                                                                    defaultChecked={block.effect && block.effect.includes('FADE')}
                                                                    className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500 rounded"
                                                                    onChange={(e) => {
                                                                        setSelectedEffects(prev => {
                                                                            const blockKey = `effect-${block.id}`;
                                                                            const currentEffects = prev[blockKey] || [];

                                                                            if (e.target.checked) {
                                                                                return {
                                                                                    ...prev,
                                                                                    [blockKey]: [...currentEffects, 'fade']
                                                                                };
                                                                            } else {
                                                                                return {
                                                                                    ...prev,
                                                                                    [blockKey]: currentEffects.filter(effect => effect !== 'fade')
                                                                                };
                                                                            }
                                                                        });
                                                                    }}
                                                                />
                                                                <span className="text-sm text-blue-700">Fade</span>
                                                            </label>
                                                            <label className="flex items-center gap-2 cursor-pointer">
                                                                <input
                                                                    type="checkbox"
                                                                    value="pan"
                                                                    defaultChecked={block.effect && block.effect.includes('PAN')}
                                                                    className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500 rounded"
                                                                    onChange={(e) => {
                                                                        setSelectedEffects(prev => {
                                                                            const blockKey = `effect-${block.id}`;
                                                                            const currentEffects = prev[blockKey] || [];

                                                                            if (e.target.checked) {
                                                                                return {
                                                                                    ...prev,
                                                                                    [blockKey]: [...currentEffects, 'pan']
                                                                                };
                                                                            } else {
                                                                                return {
                                                                                    ...prev,
                                                                                    [blockKey]: currentEffects.filter(effect => effect !== 'pan')
                                                                                };
                                                                            }
                                                                        });
                                                                    }}
                                                                />
                                                                <span className="text-sm text-blue-700">Pan</span>
                                                            </label>
                                                            <label className="flex items-center gap-2 cursor-pointer">
                                                                <input
                                                                    type="checkbox"
                                                                    value="zoom"
                                                                    defaultChecked={block.effect && block.effect.includes('ZOOM')}
                                                                    className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500 rounded"
                                                                    onChange={(e) => {
                                                                        setSelectedEffects(prev => {
                                                                            const blockKey = `effect-${block.id}`;
                                                                            const currentEffects = prev[blockKey] || [];

                                                                            if (e.target.checked) {
                                                                                return {
                                                                                    ...prev,
                                                                                    [blockKey]: [...currentEffects, 'zoom']
                                                                                };
                                                                            } else {
                                                                                return {
                                                                                    ...prev,
                                                                                    [blockKey]: currentEffects.filter(effect => effect !== 'zoom')
                                                                                };
                                                                            }
                                                                        });
                                                                    }}
                                                                />
                                                                <span className="text-sm text-blue-700">Zoom</span>
                                                            </label>
                                                        </div>
                                                    </div>

                                                    {/* Effect Duration Sliders */}
                                                    {selectedEffects[`effect-${block.id}`] && selectedEffects[`effect-${block.id}`].length > 0 && (
                                                        <div className="mt-3 space-y-3">
                                                            {selectedEffects[`effect-${block.id}`].includes('fade') && (
                                                                <div className="flex items-center gap-4">
                                                                    <div className="flex-1 space-y-2">
                                                                        <div className="flex items-center justify-between">
                                                                            <span className="text-sm text-blue-700">Fade Duration</span>
                                                                            <span className="text-sm text-blue-700">{effectDurations[`fade-${block.id}`] || 3.0} sec</span>
                                                                        </div>
                                                                        <input
                                                                            type="range"
                                                                            min="0"
                                                                            max="5"
                                                                            step="0.1"
                                                                            value={effectDurations[`fade-${block.id}`] || 3.0}
                                                                            onChange={(e) => {
                                                                                setEffectDurations(prev => ({
                                                                                    ...prev,
                                                                                    [`fade-${block.id}`]: parseFloat(e.target.value)
                                                                                }));
                                                                            }}
                                                                            className="w-full h-2 bg-blue-200 rounded-lg appearance-none cursor-pointer"
                                                                        />
                                                                    </div>
                                                                    <div className="flex-shrink-0 flex flex-col items-end">
                                                                        <div className="text-xs text-blue-700 mb-1">
                                                                            {effectDirections[`fade-${block.id}`] === 'out' ? 'OUT' : 'IN'}
                                                                        </div>
                                                                        <button
                                                                            onClick={() => {
                                                                                setEffectDirections(prev => ({
                                                                                    ...prev,
                                                                                    [`fade-${block.id}`]: prev[`fade-${block.id}`] === 'out' ? 'in' : 'out'
                                                                                }));
                                                                            }}
                                                                            className="w-12 h-6 rounded-full transition-colors duration-200 relative bg-blue-600"
                                                                        >
                                                                            <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition-transform duration-200 ${effectDirections[`fade-${block.id}`] === 'out'
                                                                                ? 'translate-x-6'
                                                                                : 'translate-x-0.5'
                                                                                }`} />
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            )}
                                                            {selectedEffects[`effect-${block.id}`].includes('pan') && (
                                                                <div className="flex items-center gap-4">
                                                                    <div className="flex-1 space-y-2">
                                                                        <div className="flex items-center justify-between">
                                                                            <span className="text-sm text-blue-700">Pan Duration</span>
                                                                            <span className="text-sm text-blue-700">{effectDurations[`pan-${block.id}`] || 4.0} sec</span>
                                                                        </div>
                                                                        <input
                                                                            type="range"
                                                                            min="0"
                                                                            max="5"
                                                                            step="0.1"
                                                                            value={effectDurations[`pan-${block.id}`] || 4.0}
                                                                            onChange={(e) => {
                                                                                setEffectDurations(prev => ({
                                                                                    ...prev,
                                                                                    [`pan-${block.id}`]: parseFloat(e.target.value)
                                                                                }));
                                                                            }}
                                                                            className="w-full h-2 bg-blue-200 rounded-lg appearance-none cursor-pointer"
                                                                        />
                                                                    </div>
                                                                    <div className="flex-shrink-0 flex flex-col items-end">
                                                                        <div className="text-xs text-blue-700 mb-1">
                                                                            {effectDirections[`pan-${block.id}`] === 'right' ? 'RIGHT' : 'LEFT'}
                                                                        </div>
                                                                        <button
                                                                            onClick={() => {
                                                                                setEffectDirections(prev => ({
                                                                                    ...prev,
                                                                                    [`pan-${block.id}`]: prev[`pan-${block.id}`] === 'right' ? 'left' : 'right'
                                                                                }));
                                                                            }}
                                                                            className="w-12 h-6 rounded-full transition-colors duration-200 relative bg-blue-600"
                                                                        >
                                                                            <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition-transform duration-200 ${effectDirections[`pan-${block.id}`] === 'right'
                                                                                ? 'translate-x-6'
                                                                                : 'translate-x-0.5'
                                                                                }`} />
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            )}
                                                            {selectedEffects[`effect-${block.id}`].includes('zoom') && (
                                                                <div className="flex items-center gap-4">
                                                                    <div className="flex-1 space-y-2">
                                                                        <div className="flex items-center justify-between">
                                                                            <span className="text-sm text-blue-700">Zoom Duration</span>
                                                                            <span className="text-sm text-blue-700">{effectDurations[`zoom-${block.id}`] || 3.5} sec</span>
                                                                        </div>
                                                                        <input
                                                                            type="range"
                                                                            min="0"
                                                                            max="5"
                                                                            step="0.1"
                                                                            value={effectDurations[`zoom-${block.id}`] || 3.5}
                                                                            onChange={(e) => {
                                                                                setEffectDurations(prev => ({
                                                                                    ...prev,
                                                                                    [`zoom-${block.id}`]: parseFloat(e.target.value)
                                                                                }));
                                                                            }}
                                                                            className="w-full h-2 bg-blue-200 rounded-lg appearance-none cursor-pointer"
                                                                        />
                                                                    </div>
                                                                    <div className="flex-shrink-0 flex flex-col items-end">
                                                                        <div className="text-xs text-blue-700 mb-1">
                                                                            {effectDirections[`zoom-${block.id}`] === 'out' ? 'OUT' : 'IN'}
                                                                        </div>
                                                                        <button
                                                                            onClick={() => {
                                                                                setEffectDirections(prev => ({
                                                                                    ...prev,
                                                                                    [`zoom-${block.id}`]: prev[`zoom-${block.id}`] === 'out' ? 'in' : 'out'
                                                                                }));
                                                                            }}
                                                                            className="w-12 h-6 rounded-full transition-colors duration-200 relative bg-blue-600"
                                                                        >
                                                                            <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition-transform duration-200 ${effectDirections[`zoom-${block.id}`] === 'out'
                                                                                ? 'translate-x-6'
                                                                                : 'translate-x-0.5'
                                                                                }`} />
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                </>
                                            )}

                                            {block.type === 'voice' && (
                                                <>
                                                    {block.avatarUrl ? (
                                                        <>
                                                            <div className="flex items-center justify-between mb-2">
                                                                <div className="flex items-center gap-2">
                                                                    <GripVertical className="w-4 h-4 text-gray-400 cursor-grab" />
                                                                    <div className="flex items-center gap-2">
                                                                        <img
                                                                            src={block.avatarUrl}
                                                                            alt={block.voiceTag}
                                                                            className="w-8 h-8 rounded-full object-cover"
                                                                            onError={(e) => {
                                                                                e.target.style.display = 'none';
                                                                            }}
                                                                        />
                                                                        <span className={`font-semibold ${textColor}`}>{block.voiceTag}</span>
                                                                    </div>
                                                                </div>
                                                                {block.messageType && (
                                                                    <span className={`text-xs px-2 py-1 rounded-full ${block.voiceType === 'contributor'
                                                                        ? 'bg-green-100 text-green-800'
                                                                        : block.voiceType === 'narrator'
                                                                            ? 'bg-yellow-100 text-yellow-800'
                                                                            : 'bg-purple-100 text-purple-800'
                                                                        }`}>
                                                                        {block.messageType}
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <p className={`${textColor.replace('600', '700')} text-left`} style={{ marginLeft: '24px' }}>{block.content}</p>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <div className="flex items-center gap-2 mb-2">
                                                                <GripVertical className="w-4 h-4 text-gray-400 cursor-grab" />
                                                                <span className={`font-semibold ${textColor}`}>[{block.voiceTag}]</span>
                                                            </div>
                                                            <p className={`${textColor.replace('600', '700')} ml-6`}>{block.content}</p>
                                                        </>
                                                    )}

                                                    {block.voiceType === 'contributor' && (() => {
                                                        const blockKey = `${block.voiceTag}-${block.id}`;
                                                        return (
                                                            <div className="mt-3" style={{ marginLeft: '24px' }}>
                                                                <div className="flex items-center gap-4">
                                                                    {/* Show "Recorded" option only if contributor left an audio message */}
                                                                    {block.messageType === 'Audio Message' && (
                                                                        <label className="flex items-center gap-2 cursor-pointer">
                                                                            <input
                                                                                type="radio"
                                                                                name={`audio-${block.id}`}
                                                                                value="recorded"
                                                                                checked={contributorAudioPreferences[blockKey] === 'recorded'}
                                                                                onChange={(e) => {
                                                                                    if (e.target.checked) {
                                                                                        setContributorAudioPreferences(prev => ({
                                                                                            ...prev,
                                                                                            [blockKey]: 'recorded'
                                                                                        }));
                                                                                        console.log(`🎙️ Set ${blockKey} to use recorded audio (DATABASE PERSISTENT)`);
                                                                                    }
                                                                                }}
                                                                                className="w-4 h-4 text-green-600 border-gray-300 focus:ring-green-500"
                                                                            />
                                                                            <span className="text-sm text-green-700">Recorded</span>
                                                                        </label>
                                                                    )}
                                                                    <label className="flex items-center gap-2 cursor-pointer">
                                                                        <input
                                                                            type="radio"
                                                                            name={`audio-${block.id}`}
                                                                            value="synth"
                                                                            checked={contributorAudioPreferences[blockKey] === 'synth'}
                                                                            onChange={(e) => {
                                                                                if (e.target.checked) {
                                                                                    setContributorAudioPreferences(prev => ({
                                                                                        ...prev,
                                                                                        [blockKey]: 'synth'
                                                                                    }));
                                                                                    console.log(`🎤 Set ${blockKey} to use synth voice (DATABASE PERSISTENT)`);
                                                                                }
                                                                            }}
                                                                            className="w-4 h-4 text-green-600 border-gray-300 focus:ring-green-500"
                                                                        />
                                                                        <span className="text-sm text-green-700">Synth</span>
                                                                    </label>
                                                                    <label className="flex items-center gap-2 cursor-pointer">
                                                                        <input
                                                                            type="radio"
                                                                            name={`audio-${block.id}`}
                                                                            value="text"
                                                                            checked={contributorAudioPreferences[blockKey] === 'text'}
                                                                            onChange={(e) => {
                                                                                if (e.target.checked) {
                                                                                    setContributorAudioPreferences(prev => ({
                                                                                        ...prev,
                                                                                        [blockKey]: 'text'
                                                                                    }));
                                                                                    console.log(`📝 Set ${blockKey} to use text response (DATABASE PERSISTENT)`);
                                                                                }
                                                                            }}
                                                                            className="w-4 h-4 text-green-600 border-gray-300 focus:ring-green-500"
                                                                        />
                                                                        <span className="text-sm text-green-700">Text Response</span>
                                                                    </label>
                                                                </div>
                                                            </div>
                                                        );
                                                    })()}
                                                </>
                                            )}

                                            {block.type === 'hold' && (
                                                <>
                                                    <div className="flex items-center justify-between mb-2">
                                                        <div className="flex items-center gap-2">
                                                            <GripVertical className="w-4 h-4 text-gray-400 cursor-grab" />
                                                            <div
                                                                className="w-8 h-8 rounded border border-gray-300"
                                                                style={{ backgroundColor: block.color }}
                                                            />
                                                            <span className={`font-semibold ${textColor}`}>Hold Color (FF6600)</span>
                                                        </div>
                                                        <span className="text-xs bg-gray-100 text-gray-800 px-2 py-1 rounded-full">
                                                            Screen Effect
                                                        </span>
                                                    </div>

                                                    {/* Fade Radio Button */}
                                                    <div className="mt-3" style={{ marginLeft: '24px' }}>
                                                        <div className="flex items-center gap-4">
                                                            <label className="flex items-center gap-2 cursor-pointer">
                                                                <input
                                                                    type="checkbox"
                                                                    value="fade"
                                                                    className="w-4 h-4 text-gray-600 border-gray-300 focus:ring-gray-500 rounded"
                                                                    onChange={(e) => {
                                                                        setSelectedEffects(prev => {
                                                                            const blockKey = `hold-${block.id}`;
                                                                            const currentEffects = prev[blockKey] || [];

                                                                            if (e.target.checked) {
                                                                                return {
                                                                                    ...prev,
                                                                                    [blockKey]: [...currentEffects, 'fade']
                                                                                };
                                                                            } else {
                                                                                return {
                                                                                    ...prev,
                                                                                    [blockKey]: currentEffects.filter(effect => effect !== 'fade')
                                                                                };
                                                                            }
                                                                        });
                                                                    }}
                                                                />
                                                                <span className="text-sm text-gray-700">Fade</span>
                                                            </label>
                                                        </div>
                                                    </div>

                                                    {/* Hold Duration Slider - only show when fade is selected */}
                                                    {selectedEffects[`hold-${block.id}`] && selectedEffects[`hold-${block.id}`].includes('fade') && (
                                                        <div className="mt-3" style={{ marginLeft: '24px', marginRight: '24px' }}>
                                                            <div className="space-y-2">
                                                                <div className="flex items-center justify-between">
                                                                    <span className="text-sm text-gray-700">Fade Duration</span>
                                                                    <span className="text-sm text-gray-700">{effectDurations[`hold-duration-${block.id}`] || 4.0} sec</span>
                                                                </div>
                                                                <input
                                                                    type="range"
                                                                    min="0"
                                                                    max="10"
                                                                    step="0.1"
                                                                    value={effectDurations[`hold-duration-${block.id}`] || 4.0}
                                                                    onChange={(e) => {
                                                                        setEffectDurations(prev => ({
                                                                            ...prev,
                                                                            [`hold-duration-${block.id}`]: parseFloat(e.target.value)
                                                                        }));
                                                                    }}
                                                                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                                                                />
                                                            </div>
                                                        </div>
                                                    )}


                                                </>
                                            )}

                                            {(block.type === 'start' || block.type === 'end') && (
                                                <>
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-2">
                                                            <span className={`font-semibold ${textColor}`}>{block.title}</span>
                                                        </div>
                                                        <span className={`text-xs px-2 py-1 rounded-full ${block.type === 'start' ? 'bg-gray-300 text-gray-900' : 'bg-gray-300 text-gray-900'}`}>
                                                            {block.type === 'start' ? 'Story Start' : 'Story End'}
                                                        </span>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {/* Action Buttons */}
                        {!loading && !error && (
                            <div className="mt-6 flex gap-3 max-w-md mx-auto">
                                <Button
                                    onClick={() => navigate(`/embers/${id}?view=story-cuts`)}
                                    variant="outline"
                                    size="lg"
                                    className="px-6 py-3 h-auto flex-1"
                                >
                                    Back
                                </Button>
                                <Button
                                    onClick={handleUpdateStoryCut}
                                    disabled={updating}
                                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 h-auto disabled:opacity-50 flex-1"
                                    size="lg"
                                >
                                    {updating ? 'Updating...' : 'Update'}
                                </Button>
                            </div>
                        )}
                    </div>
                ) : (
                    /* Code View - Script editing functionality */
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-semibold text-gray-900">Generated Script</h3>
                            {!isEditingScript && (
                                <Button
                                    onClick={handleEditScript}
                                    variant="outline"
                                    size="sm"
                                    className="flex items-center gap-2"
                                >
                                    <PencilSimple size={16} />
                                    Edit
                                </Button>
                            )}
                        </div>

                        {isEditingScript ? (
                            /* Edit Mode */
                            <div className="space-y-3">
                                <textarea
                                    value={editedScript}
                                    onChange={(e) => setEditedScript(e.target.value)}
                                    className="w-full h-96 p-4 bg-white border border-gray-300 rounded-lg font-mono text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    placeholder="Enter your script here..."
                                />
                                <div className="flex items-center gap-3">
                                    <Button
                                        onClick={handleSaveScript}
                                        disabled={isSavingScript || !editedScript.trim()}
                                        className="bg-blue-600 hover:bg-blue-700 text-white"
                                    >
                                        <Save size={16} className="mr-2" />
                                        {isSavingScript ? 'Saving...' : 'Save'}
                                    </Button>
                                    <Button
                                        onClick={handleCancelScriptEdit}
                                        variant="outline"
                                        disabled={isSavingScript}
                                    >
                                        <X size={16} className="mr-2" />
                                        Cancel
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            /* View Mode */
                            <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                                <div className="text-gray-700 leading-relaxed font-mono text-sm">
                                    <pre className="whitespace-pre-wrap">{storyCut?.full_script || 'Loading script...'}</pre>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* EmberPlay - Same wrapper structure as EmberDetail */}
            {showFullscreenPlay && (
                <>
                    {/* Mobile Layout */}
                    <div className="md:hidden h-screen overflow-hidden">
                        <div className={`h-full bg-gray-100 flex flex-col ${isPlayerFadingOut ? 'animate-fade-out' : 'opacity-0 animate-fade-in'}`}>
                            {/* Top Section - Clean background, no orange */}
                            <div className="h-[70vh] relative bg-black">
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

                                {/* Loading State */}
                                {isGeneratingAudio && (
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <div className="text-white text-center">
                                            <div className="mb-4">
                                                <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto"></div>
                                            </div>
                                            <p className="text-lg">Generating audio...</p>
                                        </div>
                                    </div>
                                )}

                                {/* Story Cut Content Display */}
                                {!isGeneratingAudio && currentDisplayText && (
                                    <div className="absolute inset-0 flex items-center justify-center p-4">
                                        <div className="container mx-auto max-w-4xl">
                                            <div className="text-center">
                                                {/* Voice Tag */}
                                                {currentVoiceTag && (
                                                    <div className="mb-4">
                                                        <span className="inline-block px-3 py-1 bg-white/20 text-white rounded-full text-sm font-medium backdrop-blur-sm">
                                                            {currentVoiceTag}
                                                        </span>
                                                    </div>
                                                )}

                                                {/* Display Text */}
                                                <p className="text-white text-lg font-bold">
                                                    {currentDisplayText}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Bottom right capsule: Main EmberDetail capsule in top section */}
                                <div className="absolute right-4 bottom-4 z-20">
                                    <div className="flex flex-col items-center gap-2 bg-white/50 backdrop-blur-sm px-2 py-3 rounded-full shadow-lg">
                                        <button
                                            className="p-1 hover:bg-white/70 rounded-full transition-colors"
                                            onClick={handleExitPlay}
                                            aria-label="Close player"
                                            type="button"
                                        >
                                            <X size={24} className="text-gray-700" />
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Bottom Section - Black - 30% height to match EmberDetail */}
                            <div className="h-[30vh] bg-black relative">
                                {/* End Hold Effect */}
                                {showEndHold && (
                                    <div className="absolute inset-0 bg-black" />
                                )}

                                {/* Text Content Display */}
                                <div className="w-full px-4 pt-3 pb-2 md:px-6 flex-shrink-0">
                                    {/* Voice Tag */}
                                    {currentVoiceTag && (
                                        <div className="text-center mb-2">
                                            <span className="inline-block px-3 py-1 bg-white/20 text-white rounded-full text-sm font-medium backdrop-blur-sm">
                                                {currentVoiceTag}
                                            </span>
                                        </div>
                                    )}

                                    {/* Display Text */}
                                    <p className="text-lg font-bold text-white text-center">
                                        {currentDisplayText}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Desktop Layout */}
                    <div className="hidden md:block">
                        <div className="container mx-auto px-1.5 py-8">
                            <div className="max-w-4xl mx-auto">
                                <div className="rounded-xl bg-white shadow-sm">
                                    <Card className="py-0 w-full bg-gray-100">
                                        <CardContent className="p-0 h-full">
                                            <div className={`h-screen flex flex-col ${isPlayerFadingOut ? 'animate-fade-out' : 'opacity-0 animate-fade-in'}`}>
                                                {/* Top Section - Clean background, no orange */}
                                                <div className="h-[70vh] relative bg-black">
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

                                                    {/* Loading State */}
                                                    {isGeneratingAudio && (
                                                        <div className="absolute inset-0 flex items-center justify-center">
                                                            <div className="text-white text-center">
                                                                <div className="mb-4">
                                                                    <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto"></div>
                                                                </div>
                                                                <p className="text-lg">Generating audio...</p>
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Story Cut Content Display */}
                                                    {!isGeneratingAudio && currentDisplayText && (
                                                        <div className="absolute inset-0 flex items-center justify-center p-4">
                                                            <div className="container mx-auto max-w-4xl">
                                                                <div className="text-center">
                                                                    {/* Voice Tag */}
                                                                    {currentVoiceTag && (
                                                                        <div className="mb-4">
                                                                            <span className="inline-block px-3 py-1 bg-white/20 text-white rounded-full text-sm font-medium backdrop-blur-sm">
                                                                                {currentVoiceTag}
                                                                            </span>
                                                                        </div>
                                                                    )}

                                                                    {/* Display Text */}
                                                                    <p className="text-white text-lg font-bold">
                                                                        {currentDisplayText}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Bottom right capsule: Main EmberDetail capsule in top section */}
                                                    <div className="absolute right-4 bottom-4 z-20">
                                                        <div className="flex flex-col items-center gap-2 bg-white/50 backdrop-blur-sm px-2 py-3 rounded-full shadow-lg">
                                                            <button
                                                                className="p-1 hover:bg-white/70 rounded-full transition-colors"
                                                                onClick={handleExitPlay}
                                                                aria-label="Close player"
                                                                type="button"
                                                            >
                                                                <X size={24} className="text-gray-700" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Bottom Section - Black - 30% height to match EmberDetail */}
                                                <div className="h-[30vh] bg-black relative">
                                                    {/* End Hold Effect */}
                                                    {showEndHold && (
                                                        <div className="absolute inset-0 bg-black" />
                                                    )}

                                                    {/* Text Content Display */}
                                                    <div className="w-full px-4 pt-3 pb-2 md:px-6 flex-shrink-0">
                                                        {/* Voice Tag */}
                                                        {currentVoiceTag && (
                                                            <div className="text-center mb-2">
                                                                <span className="inline-block px-3 py-1 bg-white/20 text-white rounded-full text-sm font-medium backdrop-blur-sm">
                                                                    {currentVoiceTag}
                                                                </span>
                                                            </div>
                                                        )}

                                                        {/* Display Text */}
                                                        <p className="text-lg font-bold text-white text-center">
                                                            {currentDisplayText}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </div>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
} 