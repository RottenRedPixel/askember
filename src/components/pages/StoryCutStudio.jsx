import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Plus, ArrowLeft, ArrowUp, ArrowDown, Edit, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { FilmSlate, PlayCircle } from 'phosphor-react';
import { getStoryCutById, getPrimaryStoryCut, updateStoryCut, getEmber, getAllStoryMessagesForEmber, getStoryCutsForEmber, getUserVoiceModel, getEmberTaggedPeople, getEditableVoiceBlocks } from '@/lib/database';
import { getEmberWithSharing } from '@/lib/sharing';
import { getStyleDisplayName } from '@/lib/styleUtils';
import { formatDuration } from '@/lib/dateUtils';
import { useVoices } from '@/lib/useEmberData';

import { handlePlay as handleMediaPlay, handlePlaybackComplete as handleMediaPlaybackComplete, handleExitPlay as handleMediaExitPlay } from '@/lib/mediaHandlers';
import useStore from '@/store';
import { useUIState } from '@/lib/useUIState';
import AddBlockModal from '@/components/AddBlockModal';
import ZoomTargetModal from '@/components/ZoomTargetModal';
import MediaEffectPreview from '@/components/MediaEffectPreview';

// Conversion functions between slider values (-5 to +5) and actual zoom scales
const sliderToScale = (sliderValue) => {
    // Slider -5 → scale(0.2) (looks zoomed out)
    // Slider 0 → scale(1.0) (normal)  
    // Slider +5 → scale(5.0) (zoomed in)
    if (sliderValue <= 0) {
        // Negative: 1.0 + (slider * 0.16) → -5 gives 0.2x, 0 gives 1.0x
        return 1.0 + (sliderValue * 0.16);
    } else {
        // Positive: 1.0 + (slider * 0.8) → +5 gives 5.0x
        return 1.0 + (sliderValue * 0.8);
    }
};

const scaleToSlider = (scaleValue) => {
    // Convert actual scale back to slider value
    if (scaleValue <= 1.0) {
        // Scale 0.2-1.0 maps to slider -5 to 0
        return (scaleValue - 1.0) / 0.16;
    } else {
        // Scale 1.0-5.0 maps to slider 0 to +5
        return (scaleValue - 1.0) / 0.8;
    }
};

// Conversion functions between slider values (-50 to +50) and actual pan positions (percentage)
const sliderToPanPosition = (sliderValue) => {
    // Slider -50 → -50% (far left)
    // Slider 0 → 0% (center)
    // Slider +50 → +50% (far right)
    return sliderValue;
};

const panPositionToSlider = (panPosition) => {
    // Convert pan position back to slider value
    return panPosition;
};

export default function StoryCutStudio() {
    const { id, storyCutId } = useParams(); // id is ember ID, storyCutId is story cut ID
    const navigate = useNavigate();
    const { user } = useStore();
    const [blocks, setBlocks] = useState([]);
    const [selectedBlock, setSelectedBlock] = useState(null);
    // Removed viewMode - visual blocks are now the only view
    const [selectedEffects, setSelectedEffects] = useState({}); // Track selected checkboxes (can be multiple per block)
    const [effectDirections, setEffectDirections] = useState({}); // Track effect directions (in/out, left/right)
    const [effectDurations, setEffectDurations] = useState({}); // Track effect duration values from sliders
    const [effectDistances, setEffectDistances] = useState({}); // Track pan distances (legacy)
    const [effectStartPositions, setEffectStartPositions] = useState({}); // Track pan start positions
    const [effectEndPositions, setEffectEndPositions] = useState({}); // Track pan end positions
    const [effectScales, setEffectScales] = useState({}); // Track zoom scales (legacy)
    const [effectStartScales, setEffectStartScales] = useState({}); // Track zoom start scales
    const [effectEndScales, setEffectEndScales] = useState({}); // Track zoom end scales
    const [effectTargets, setEffectTargets] = useState({}); // Track zoom targets (center, person, custom)
    const [showZoomTargetModal, setShowZoomTargetModal] = useState(false);
    const [selectedZoomBlock, setSelectedZoomBlock] = useState(null);
    const [taggedPeople, setTaggedPeople] = useState([]); // Tagged people for target selection

    // Real story cut data
    const [storyCut, setStoryCut] = useState(null);
    const [ember, setEmber] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Story messages for determining contributor message types
    const [storyMessages, setStoryMessages] = useState([]);

    // Contributors data for real user avatars
    const [contributors, setContributors] = useState([]);

    // Contributor audio preferences - store per block
    const [contributorAudioPreferences, setContributorAudioPreferences] = useState({});

    // Editable voice blocks tracking
    const [editableBlocks, setEditableBlocks] = useState([]);
    const [editableBlocksMap, setEditableBlocksMap] = useState(new Map());

    // Add Block modal state
    const [showAddBlockModal, setShowAddBlockModal] = useState(false);

    // Edit voice content modal state
    const [showEditModal, setShowEditModal] = useState(false);
    const [editingBlock, setEditingBlock] = useState(null);
    const [editingBlockIndex, setEditingBlockIndex] = useState(null);
    const [editedContent, setEditedContent] = useState('');



    // Save/Cancel functionality
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    const [originalBlocks, setOriginalBlocks] = useState([]);
    const [isSaving, setIsSaving] = useState(false);
    const [saveError, setSaveError] = useState(null);

    // Store original effects state for change detection
    const [originalEffects, setOriginalEffects] = useState({});
    const [originalDirections, setOriginalDirections] = useState({});
    const [originalDurations, setOriginalDurations] = useState({});
    const [originalDistances, setOriginalDistances] = useState({});
    const [originalStartPositions, setOriginalStartPositions] = useState({});
    const [originalEndPositions, setOriginalEndPositions] = useState({});
    const [originalScales, setOriginalScales] = useState({});
    const [originalStartScales, setOriginalStartScales] = useState({});
    const [originalEndScales, setOriginalEndScales] = useState({});
    const [originalTargets, setOriginalTargets] = useState({});

    // Voice management for AI voices
    const { availableVoices, voicesLoading } = useVoices();
    const [currentEmberVoiceId, setCurrentEmberVoiceId] = useState('');
    const [currentNarratorVoiceId, setCurrentNarratorVoiceId] = useState('');

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

                    // Use embedded preference if available, otherwise set default
                    const preferenceToUse = block.preference || (block.messageType === 'Audio Message' ? 'recorded' : 'text');

                    // Update preference if it's different from what we have
                    if (newPreferences[blockKey] !== preferenceToUse) {
                        newPreferences[blockKey] = preferenceToUse;
                        hasChanges = true;
                        console.log(`🎯 Setting preference for ${blockKey} from ${block.preference ? 'embedded script' : 'default'}: ${preferenceToUse}`);
                    }
                });

                // Only return new object if there were changes
                return hasChanges ? newPreferences : prev;
            });
        }
    }, [blocks]);

    // Expose contributor preferences globally for audio generation (matches EmberDetail pattern)
    useEffect(() => {
        if (typeof window !== 'undefined') {
            window.messageAudioPreferences = contributorAudioPreferences;
            console.log('🎯 StoryCutStudio: Exposed audio preferences globally for preview:', contributorAudioPreferences);
        }
    }, [contributorAudioPreferences]);

    // Expose contributor preferences globally for audio generation


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

        currentVoiceType, setCurrentVoiceType,
        currentVoiceTransparency, setCurrentVoiceTransparency,
        currentMediaColor, setCurrentMediaColor,
        currentZoomScale, setCurrentZoomScale,
        currentMediaImageUrl, setCurrentMediaImageUrl,
        currentlyPlayingStoryCut, setCurrentlyPlayingStoryCut,
        currentLoadingState, setCurrentLoadingState,
        currentLoadingMessage, setCurrentLoadingMessage,
        currentLoadingIcon, setCurrentLoadingIcon,
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

    // Helper function to check if a block has active effects
    const hasActiveEffects = (block) => {
        const blockEffects = selectedEffects[`effect-${block.id}`] || [];
        return blockEffects.includes('pan') || blockEffects.includes('zoom') || blockEffects.includes('fade');
    };

    // Helper function to get contributor display name (consistent with AddBlockModal)
    const getContributorDisplayName = (contributorData, storyMessage, voiceTag) => {
        const firstName = contributorData?.firstName || storyMessage?.user_first_name || '';
        const lastName = contributorData?.lastName || storyMessage?.user_last_name || '';
        const email = contributorData?.email || storyMessage?.user_email || '';

        if (firstName && lastName) {
            return `${firstName} ${lastName}`;
        }
        if (firstName) {
            return firstName;
        }
        if (email) {
            return email.split('@')[0];
        }
        return voiceTag || 'Unknown User';
    };

    // Simple avatar lookup using storyMessages (like AddBlockModal - this works!)
    const getSimpleContributorData = (speakerName, userId, storyMessages) => {
        // Find the message by user_id first (most reliable)
        let message = null;
        if (userId) {
            message = storyMessages.find(msg => msg.user_id === userId);
        }

        // If not found by user_id, try by first name
        if (!message && speakerName) {
            message = storyMessages.find(msg =>
                msg.user_first_name?.toLowerCase() === speakerName.toLowerCase().trim()
            );
        }

        if (message) {
            const result = {
                avatarUrl: message.avatar_url || message.user_avatar_url || '/EMBERFAV.svg',
                firstName: message.user_first_name || speakerName,
                lastName: message.user_last_name || '',
                email: message.user_email || '',
                fallbackText: getUserInitials(message.user_email, message.user_first_name, message.user_last_name)
            };
            console.log(`✅ Simple lookup found for "${speakerName}":`, { avatarUrl: result.avatarUrl ? 'present' : 'missing', firstName: result.firstName });
            return result;
        }

        // Fallback if no message found
        console.log(`⚠️ Simple lookup failed for "${speakerName}" (userId: ${userId}) - using fallback`);
        return {
            avatarUrl: '/EMBERFAV.svg',
            firstName: speakerName || 'Unknown',
            lastName: '',
            email: '',
            fallbackText: speakerName?.[0]?.toUpperCase() || '?'
        };
    };

    // Helper function to get user initials (same as AddBlockModal)
    const getUserInitials = (email, firstName = '', lastName = '') => {
        if (firstName && lastName) {
            return (firstName[0] + lastName[0]).toUpperCase();
        }
        if (firstName) {
            return firstName.substring(0, 2).toUpperCase();
        }
        if (!email) return 'U';
        const parts = email.split('@')[0].split('.');
        if (parts.length >= 2) {
            return (parts[0][0] + parts[1][0]).toUpperCase();
        }
        return email.substring(0, 2).toUpperCase();
    };

    // Load real story cut data
    useEffect(() => {
        const loadStoryCut = async () => {
            if (!id) return;

            // Wait for user to be loaded before processing contributors
            if (!user) {
                console.log('⏳ Waiting for user to load before processing contributors...');
                return;
            }

            // Skip reload if we already have data and it's the same story cut
            if (storyCut && storyCut.id === storyCutId && contributors.length > 0) {
                console.log('📋 Story cut and contributors already loaded, skipping reload');
                return;
            }

            try {
                setLoading(true);
                setError(null);

                let targetStoryCut = null;

                if (storyCutId) {
                    // Load specific story cut by ID
                    console.log('🎬 Loading specific story cut:', storyCutId);
                    targetStoryCut = await getStoryCutById(storyCutId);

                    if (!targetStoryCut) {
                        setError(`Story cut not found: ${storyCutId}`);
                        return;
                    }

                    console.log('✅ Loaded specific story cut:', targetStoryCut.title);
                } else {
                    // Fallback to primary story cut if no specific ID provided
                    console.log('🎬 No story cut ID provided, loading primary story cut for ember:', id);
                    targetStoryCut = await getPrimaryStoryCut(id);

                    if (!targetStoryCut) {
                        // If no primary exists, try to load any available story cut
                        console.log('🔍 No primary story cut found, looking for any available story cut...');
                        const allStoryCuts = await getStoryCutsForEmber(id);

                        if (allStoryCuts && allStoryCuts.length > 0) {
                            console.log('✅ Found available story cut:', allStoryCuts[0].title);
                            targetStoryCut = allStoryCuts[0];
                        } else {
                            setError('No story cuts found for this ember.');
                            return;
                        }
                    } else {
                        console.log('✅ Loaded primary story cut:', targetStoryCut.title);
                    }
                }

                setStoryCut(targetStoryCut);

                console.log('🔍 DEBUG - Story cut loaded:', {
                    id: targetStoryCut?.id,
                    title: targetStoryCut?.title,
                    keys: Object.keys(targetStoryCut || {}),
                    fullObject: targetStoryCut
                });

                // Load ember data for the player
                console.log('🌟 Loading ember data for player...');
                const emberData = await getEmber(id);
                setEmber(emberData);

                // Load sharing data for contributor avatars
                console.log('👥 Loading contributor data for avatars...');
                let loadedContributors = [];
                try {
                    const sharingData = await getEmberWithSharing(id);

                    // Extract contributor data from shares
                    if (sharingData.shares && sharingData.shares.length > 0) {
                        loadedContributors = sharingData.shares
                            .filter(share => share.shared_user && share.shared_user.user_id)
                            .map(share => ({
                                user_id: share.shared_user.user_id,
                                first_name: share.shared_user.first_name,
                                last_name: share.shared_user.last_name,
                                avatar_url: share.shared_user.avatar_url,
                                email: share.shared_with_email
                            }));
                    }

                    // IMPORTANT: Add the ember owner to contributors (they're not in shares list!)
                    // console.log('🔍 DEBUG - Owner check:', {
                    //     'sharingData.user_id': sharingData.user_id,
                    //     'user?.id': user?.id,
                    //     'are they equal?': sharingData.user_id === user?.id,
                    //     'user object present': !!user,
                    //     'user.user_metadata': user?.user_metadata
                    // });

                    if (sharingData.user_id && user?.id === sharingData.user_id) {
                        // Current user is the owner - add their data
                        const ownerData = {
                            user_id: user.id,
                            first_name: user.user_metadata?.first_name || user.user_metadata?.name || 'Owner',
                            last_name: user.user_metadata?.last_name || '',
                            avatar_url: user.user_metadata?.avatar_url || null,
                            email: user.email
                        };

                        // console.log('🔍 DEBUG - Owner data to add:', ownerData);

                        // Check if owner is already in the list (shouldn't be, but just in case)
                        const ownerExists = loadedContributors.some(c => c.user_id === user.id);
                        if (!ownerExists) {
                            loadedContributors.push(ownerData);
                            console.log('➕ Added ember owner to contributors:', ownerData);
                            console.log('👥 Total contributors after adding owner:', loadedContributors.length);
                        } else {
                            console.log('🔍 Owner already exists in contributors list');
                        }
                    } else {
                        console.log('❌ Owner condition not met - not adding owner to contributors');
                        console.log('❌ Detailed failure analysis:', {
                            'sharingData.user_id exists': !!sharingData.user_id,
                            'user?.id exists': !!user?.id,
                            'user is loaded': !!user,
                            'IDs match': sharingData.user_id === user?.id
                        });
                    }

                    setContributors(loadedContributors);
                    console.log('✅ Loaded contributors (including owner):', loadedContributors);
                } catch (sharingError) {
                    console.warn('⚠️ Could not load contributor data:', sharingError);
                    setContributors([]);
                }

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

                // DEPRECATED: Helper function to get contributor avatar data (complex lookup)
                // Now using getSimpleContributorData instead for better reliability
                const getContributorAvatarData = (identifier, contributorList = null) => {
                    // Use provided list or fall back to state (fixes timing issues)
                    const availableContributors = contributorList || contributors;

                    // console.log(`🔍 getContributorAvatarData called with identifier: "${identifier}"`);
                    // console.log(`🔍 Available contributors (${availableContributors.length}):`, availableContributors.map(c => ({ 
                    //     user_id: c.user_id, 
                    //     first_name: c.first_name, 
                    //     avatar_url: c.avatar_url ? 'present' : 'missing' 
                    // })));

                    if (!identifier) {
                        console.log(`⚠️ No identifier provided for contributor lookup`);
                        return {
                            avatarUrl: '/EMBERFAV.svg',
                            firstName: 'Unknown',
                            lastName: null,
                            email: null,
                            fallbackText: '?'
                        };
                    }

                    let contributor = null;

                    // Try to match by user_id first (UUID format)
                    if (identifier.length > 20 && identifier.includes('-')) {
                        // console.log(`🔍 Trying to match by user_id: ${identifier}`);
                        contributor = availableContributors.find(c => c.user_id === identifier);
                        // if (contributor) {
                        //     console.log(`✅ Found contributor by user_id ${identifier}:`, {
                        //         user_id: contributor.user_id,
                        //         first_name: contributor.first_name,
                        //         avatar_url: contributor.avatar_url,
                        //         email: contributor.email
                        //     });
                        // } else {
                        //     console.log(`❌ No match found by user_id ${identifier}`);
                        // }
                    }

                    // If no match by user_id, try by first name
                    if (!contributor) {
                        // console.log(`🔍 Trying to match by first name: ${identifier}`);
                        contributor = availableContributors.find(c =>
                            c.first_name && c.first_name.toLowerCase() === identifier.toLowerCase().trim()
                        );
                        // if (contributor) {
                        //     console.log(`✅ Found contributor by name ${identifier}:`, {
                        //         user_id: contributor.user_id,
                        //         first_name: contributor.first_name,
                        //         avatar_url: contributor.avatar_url,
                        //         email: contributor.email
                        //     });
                        // } else {
                        //     console.log(`❌ No match found by name ${identifier}`);
                        // }
                    }

                    if (contributor) {
                        let avatarUrl = contributor.avatar_url || null;

                        // If no avatar in contributor data, try to find it in storyMessages (like AddBlockModal does)
                        if (!avatarUrl && loadedStoryMessages && loadedStoryMessages.length > 0) {
                            // console.log(`🔍 No avatar in contributor data, checking storyMessages for ${identifier}`);

                            // Try to find message by user_id first
                            let messageWithAvatar = null;
                            if (identifier.length > 20 && identifier.includes('-')) {
                                messageWithAvatar = loadedStoryMessages.find(msg =>
                                    msg.user_id === identifier && (msg.avatar_url || msg.user_avatar_url)
                                );
                            }

                            // If not found by user_id, try by first_name
                            if (!messageWithAvatar && contributor.first_name) {
                                messageWithAvatar = loadedStoryMessages.find(msg =>
                                    msg.user_first_name &&
                                    msg.user_first_name.toLowerCase() === contributor.first_name.toLowerCase() &&
                                    (msg.avatar_url || msg.user_avatar_url)
                                );
                            }

                            if (messageWithAvatar) {
                                avatarUrl = messageWithAvatar.avatar_url || messageWithAvatar.user_avatar_url;
                                // console.log(`✅ Found avatar in storyMessages for ${identifier}: ${avatarUrl ? 'present' : 'missing'}`);
                            } else {
                                // console.log(`❌ No avatar found in storyMessages for ${identifier}`);
                            }
                        }

                        const result = {
                            avatarUrl: avatarUrl,
                            firstName: contributor.first_name,
                            lastName: contributor.last_name,
                            email: contributor.email,
                            fallbackText: contributor.first_name?.[0] || contributor.last_name?.[0] || contributor.email?.[0]?.toUpperCase() || identifier[0]?.toUpperCase() || '?'
                        };
                        // console.log(`✅ Returning contributor data:`, result);
                        return result;
                    }

                    // console.log(`⚠️ No contributor found for ${identifier}, using defaults`);
                    const fallbackResult = {
                        avatarUrl: '/EMBERFAV.svg', // Fallback to Ember favicon for unknown contributors
                        firstName: identifier,
                        lastName: null,
                        email: null,
                        fallbackText: identifier[0]?.toUpperCase() || '?'
                    };
                    // console.log(`⚠️ Returning fallback data:`, fallbackResult);
                    return fallbackResult;
                };

                // Function to determine message type based on original story messages
                const determineMessageType = (voiceTag, content, voiceType) => {
                    if (voiceType === 'ember') {
                        return 'Ember AI';
                    } else if (voiceType === 'narrator') {
                        return 'Narrator';
                    } else if (voiceType === 'demo') {
                        return 'Demo User';
                    } else if (voiceType !== 'contributor') {
                        return null; // Don't show badge for unknown voice types
                    }

                    // For contributors, try to match with original story messages
                    if (!loadedStoryMessages || loadedStoryMessages.length === 0) {
                        console.log(`🔍 No story messages available for ${voiceTag}`);
                        return 'Text Response'; // Default to text if no messages available
                    }

                    // console.log(`🔍 DEBUGGING ${voiceTag}:`);
                    // console.log(`  Script content: "${content}"`);
                    // console.log(`  Total story messages: ${loadedStoryMessages.length}`);
                    // console.log(`  Ember owner user_id: ${emberData?.user_id}`);

                    // Debug all messages before filtering
                    // loadedStoryMessages.forEach((msg, index) => {
                    //     console.log(`  Message ${index}: user_id="${msg.user_id}", sender="${msg.sender}", content="${msg.content?.substring(0, 50)}...", has_audio=${msg.has_audio}`);
                    // });

                    // Get contributor messages (filter by sender - "user" messages are from contributors)
                    const contributorMessages = loadedStoryMessages.filter(msg => msg.sender === 'user')
                        .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

                    // console.log(`  Available contributor messages after filtering: ${contributorMessages.length}`);

                    // Try to find a message that corresponds to this voice line by content matching
                    for (const msg of contributorMessages) {
                        if (msg.content && msg.content.trim()) {
                            // console.log(`  Checking message: "${msg.content}" (has_audio: ${msg.has_audio})`);

                            // More flexible matching approach
                            const msgContent = msg.content.toLowerCase().trim();
                            const scriptContent = content.toLowerCase().trim();

                            // Method 1: Exact match
                            if (msgContent === scriptContent) {
                                // console.log(`  ✅ EXACT MATCH found! has_audio: ${msg.has_audio}`);
                                return msg.has_audio ? 'Audio Message' : 'Text Response';
                            }

                            // Method 2: One contains the other
                            if (msgContent.includes(scriptContent) || scriptContent.includes(msgContent)) {
                                // console.log(`  ✅ SUBSTRING MATCH found! has_audio: ${msg.has_audio}`);
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
                            // console.log(`  Word match: ${matchingWords}/${Math.min(msgWords.length, scriptWords.length)} = ${Math.round(matchPercentage * 100)}%`);

                            if (matchPercentage >= 0.5 && matchingWords >= 2) {
                                // console.log(`  ✅ WORD MATCH found! has_audio: ${msg.has_audio}`);
                                return msg.has_audio ? 'Audio Message' : 'Text Response';
                            }
                        }
                    }

                    // Default to text response if no match found
                    // console.log(`  ❌ No message match found for "${content.substring(0, 50)}..." - defaulting to Text Response`);
                    return 'Text Response';
                };

                // ✅ NEW: Enhanced function to determine message type with contribution tracking
                const usedContributions = new Set(); // Track which contributions have been used
                const determineMessageTypeWithTracking = (voiceTag, content, voiceType) => {
                    if (voiceType === 'ember') {
                        return 'Ember AI';
                    } else if (voiceType === 'narrator') {
                        return 'Narrator';
                    } else if (voiceType !== 'contributor') {
                        return null; // Don't show badge for unknown voice types
                    }

                    // For contributors, try to match with original story messages
                    if (!loadedStoryMessages || loadedStoryMessages.length === 0) {
                        console.log(`🔍 No story messages available for ${voiceTag}`);
                        return 'Text Response'; // Default to text if no messages available
                    }

                    console.log(`🔍 MULTI-CONTRIBUTION MATCHING for ${voiceTag}:`);
                    console.log(`  Script content: "${content}"`);
                    console.log(`  Used contributions so far: ${Array.from(usedContributions).join(', ')}`);

                    // Get contributor messages for this specific user (by first name)
                    const contributorMessages = loadedStoryMessages.filter(msg =>
                        msg.sender === 'user' && msg.user_first_name === voiceTag
                    ).sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

                    console.log(`  Available messages from ${voiceTag}: ${contributorMessages.length}`);

                    // Filter out already used contributions
                    const availableMessages = contributorMessages.filter(msg =>
                        !usedContributions.has(msg.id)
                    );

                    console.log(`  Available unused messages from ${voiceTag}: ${availableMessages.length}`);

                    // Try to find the best match among available messages
                    let bestMatch = null;
                    let bestScore = 0;
                    let bestMatchType = null;

                    for (const msg of availableMessages) {
                        if (msg.content && msg.content.trim()) {
                            const msgContent = msg.content.toLowerCase().trim();
                            const scriptContent = content.toLowerCase().trim();

                            // Method 1: Exact match (highest priority)
                            if (msgContent === scriptContent) {
                                console.log(`  ✅ EXACT MATCH with unused contribution: "${msg.content}"`);
                                bestMatch = msg;
                                bestScore = 100;
                                bestMatchType = 'exact';
                                break;
                            }

                            // Method 2: One contains the other
                            if (msgContent.includes(scriptContent) || scriptContent.includes(msgContent)) {
                                const score = 80;
                                if (score > bestScore) {
                                    console.log(`  ✅ SUBSTRING MATCH with unused contribution: "${msg.content}"`);
                                    bestMatch = msg;
                                    bestScore = score;
                                    bestMatchType = 'substring';
                                }
                            }

                            // Method 3: Word-based matching
                            const msgWords = msgContent.split(/\s+/).filter(word => word.length > 2);
                            const scriptWords = scriptContent.split(/\s+/).filter(word => word.length > 2);

                            let matchingWords = 0;
                            for (const word of msgWords) {
                                if (scriptWords.includes(word)) {
                                    matchingWords++;
                                }
                            }

                            const matchPercentage = matchingWords / Math.min(msgWords.length, scriptWords.length);
                            if (matchPercentage >= 0.5 && matchingWords >= 2) {
                                const score = Math.round(matchPercentage * 70); // Max 70 for word match
                                if (score > bestScore) {
                                    console.log(`  ✅ WORD MATCH (${Math.round(matchPercentage * 100)}%) with unused contribution: "${msg.content}"`);
                                    bestMatch = msg;
                                    bestScore = score;
                                    bestMatchType = 'word';
                                }
                            }
                        }
                    }

                    if (bestMatch) {
                        // Mark this contribution as used
                        usedContributions.add(bestMatch.id);
                        console.log(`  ✅ SELECTED contribution (${bestMatchType}): "${bestMatch.content}" (has_audio: ${bestMatch.has_audio})`);
                        console.log(`  📝 Updated used contributions: ${Array.from(usedContributions).join(', ')}`);
                        return bestMatch.has_audio ? 'Audio Message' : 'Text Response';
                    }

                    // If no unused contributions match, fall back to any available contribution from this user
                    console.log(`  ⚠️ No unused contributions match - falling back to any contribution from ${voiceTag}`);
                    if (contributorMessages.length > 0) {
                        const fallbackMsg = contributorMessages[0];
                        console.log(`  📝 Using fallback contribution: "${fallbackMsg.content}" (has_audio: ${fallbackMsg.has_audio})`);
                        return fallbackMsg.has_audio ? 'Audio Message' : 'Text Response';
                    }

                    // Default to text response if no match found
                    console.log(`  ❌ No contributions found for ${voiceTag} - defaulting to Text Response`);
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

                // Parse the actual script and initialize effects state
                const initialEffects = {};
                const initialDirections = {};
                const initialDurations = {};
                const initialDistances = {};
                const initialStartPositions = {};
                const initialEndPositions = {};
                const initialScales = {};
                const initialStartScales = {};
                const initialEndScales = {};
                const initialTargets = {};

                // Parse voice declarations and override story cut voice names
                let embedVoiceNames = {
                    ember: targetStoryCut.ember_voice_name || 'Unknown Voice',
                    narrator: targetStoryCut.narrator_voice_name || 'Unknown Voice'
                };

                // 🚀 NEW: Check for JSON blocks first (preferred format)
                console.log('🔍 DEBUG - Story cut data structure:', {
                    hasBlocks: !!targetStoryCut.blocks,
                    blocksType: typeof targetStoryCut.blocks,
                    blocksKeys: targetStoryCut.blocks ? Object.keys(targetStoryCut.blocks) : null,
                    hasNestedBlocks: !!(targetStoryCut.blocks && targetStoryCut.blocks.blocks),
                    nestedBlocksType: targetStoryCut.blocks?.blocks ? typeof targetStoryCut.blocks.blocks : null,
                    nestedBlocksIsArray: Array.isArray(targetStoryCut.blocks?.blocks),
                    nestedBlocksLength: Array.isArray(targetStoryCut.blocks?.blocks) ? targetStoryCut.blocks.blocks.length : null,
                    hasFullScript: !!targetStoryCut.full_script,
                    fullScriptLength: targetStoryCut.full_script ? targetStoryCut.full_script.length : 0
                });

                if (targetStoryCut.blocks && targetStoryCut.blocks.blocks && Array.isArray(targetStoryCut.blocks.blocks)) {
                    console.log('🚀 Using JSON blocks directly:', targetStoryCut.blocks.blocks.length, 'blocks');
                    console.log('🔍 DEBUG - Raw JSON blocks:', targetStoryCut.blocks.blocks);

                    let blockId = 2;
                    for (const jsonBlock of targetStoryCut.blocks.blocks) {
                        // console.log('🔍 Processing JSON block:', jsonBlock);

                        if (jsonBlock.type === 'voice') {
                            // Process voice block
                            // First check if voiceType is already saved (new format)
                            let voiceType = jsonBlock.voiceType;

                            // Fallback: Determine voice type from speaker name (legacy format)
                            if (!voiceType) {
                                if (jsonBlock.speaker === 'EMBER VOICE') {
                                    voiceType = 'ember';
                                } else if (jsonBlock.speaker === 'NARRATOR') {
                                    voiceType = 'narrator';
                                } else {
                                    voiceType = 'contributor';
                                }
                            }

                            const messageType = determineMessageType(jsonBlock.speaker, jsonBlock.content, voiceType);

                            // Use simple storyMessages lookup (like AddBlockModal - this works!)
                            const contributorData = getSimpleContributorData(jsonBlock.speaker, jsonBlock.user_id, loadedStoryMessages);

                            const voiceBlock = {
                                id: blockId++,
                                type: 'voice',
                                voiceTag: jsonBlock.speaker,
                                content: jsonBlock.content,
                                voiceType: voiceType,
                                preference: jsonBlock.voice_preference || 'text',
                                messageId: jsonBlock.message_id,
                                messageType: messageType,
                                avatarUrl: contributorData.avatarUrl,
                                contributorData: contributorData,
                                hasVoiceModel: false, // Will be checked later
                                // Demo block specific data
                                demo_contribution_id: jsonBlock.demo_contribution_id || null,
                                demoData: jsonBlock.demo_data || null
                            };

                            realBlocks.push(voiceBlock);
                            // console.log('✅ Added JSON voice block:', voiceBlock.voiceTag);

                        } else if (jsonBlock.type === 'media') {
                            // Process media block
                            const currentBlockId = blockId;
                            const mediaBlock = {
                                id: currentBlockId,
                                type: 'media',
                                mediaId: jsonBlock.media_id,
                                mediaName: jsonBlock.media_name,
                                mediaUrl: jsonBlock.media_url,
                                effects: jsonBlock.effects || {}
                            };

                            // ✅ NEW: Use effects object directly from JSON blocks
                            if (jsonBlock.effects && typeof jsonBlock.effects === 'object') {
                                // Convert effect object to UI state for editing
                                const effects = jsonBlock.effects;
                                const blockEffects = [];

                                if (effects.fade) {
                                    blockEffects.push('fade');
                                    initialDirections[`fade-${currentBlockId}`] = effects.fade.type;
                                    initialDurations[`fade-${currentBlockId}`] = effects.fade.duration;
                                }

                                if (effects.pan) {
                                    blockEffects.push('pan');
                                    initialDurations[`pan-${currentBlockId}`] = effects.pan.duration;

                                    // Handle new start/end position format
                                    if (effects.pan.startPosition !== undefined && effects.pan.endPosition !== undefined) {
                                        // NEW format: convert saved pan positions back to slider values
                                        const startSliderValue = panPositionToSlider(effects.pan.startPosition);
                                        const endSliderValue = panPositionToSlider(effects.pan.endPosition);
                                        initialStartPositions[`pan-${currentBlockId}`] = startSliderValue;
                                        initialEndPositions[`pan-${currentBlockId}`] = endSliderValue;
                                        console.log(`🔄 Loading pan positions for block ${currentBlockId}: saved positions ${effects.pan.startPosition}%→${effects.pan.endPosition}% converted to sliders ${startSliderValue}→${endSliderValue}`);

                                        // Derive direction from start/end positions for UI toggle (use original pan positions for comparison)
                                        if (effects.pan.startPosition < effects.pan.endPosition) {
                                            initialDirections[`pan-${currentBlockId}`] = 'right';  // Panning right (moving to right)
                                            // Set legacy distance to the movement distance
                                            initialDistances[`pan-${currentBlockId}`] = Math.abs(effects.pan.endPosition - effects.pan.startPosition);
                                        } else if (effects.pan.startPosition > effects.pan.endPosition) {
                                            initialDirections[`pan-${currentBlockId}`] = 'left'; // Panning left (moving to left)
                                            // Set legacy distance to the movement distance
                                            initialDistances[`pan-${currentBlockId}`] = Math.abs(effects.pan.startPosition - effects.pan.endPosition);
                                        } else {
                                            initialDirections[`pan-${currentBlockId}`] = 'right';  // Default to 'right' if equal
                                            initialDistances[`pan-${currentBlockId}`] = 25;
                                        }
                                    } else if (effects.pan.distance !== undefined && effects.pan.type !== undefined) {
                                        // LEGACY format: convert type + distance to start/end positions
                                        if (effects.pan.type === 'right') {
                                            initialStartPositions[`pan-${currentBlockId}`] = -effects.pan.distance; // Start left
                                            initialEndPositions[`pan-${currentBlockId}`] = effects.pan.distance; // End right
                                        } else { // pan-left
                                            initialStartPositions[`pan-${currentBlockId}`] = effects.pan.distance; // Start right
                                            initialEndPositions[`pan-${currentBlockId}`] = -effects.pan.distance; // End left
                                        }
                                        // Also populate legacy values for compatibility
                                        initialDistances[`pan-${currentBlockId}`] = effects.pan.distance;
                                        initialDirections[`pan-${currentBlockId}`] = effects.pan.type;
                                    }
                                }

                                if (effects.zoom) {
                                    blockEffects.push('zoom');
                                    initialDurations[`zoom-${currentBlockId}`] = effects.zoom.duration;

                                    // Handle new start/end scale format
                                    if (effects.zoom.startScale !== undefined && effects.zoom.endScale !== undefined) {
                                        // NEW format: convert saved zoom scales back to slider values
                                        const startSliderValue = scaleToSlider(effects.zoom.startScale);
                                        const endSliderValue = scaleToSlider(effects.zoom.endScale);
                                        initialStartScales[`zoom-${currentBlockId}`] = startSliderValue;
                                        initialEndScales[`zoom-${currentBlockId}`] = endSliderValue;
                                        console.log(`🔄 Loading zoom scales for block ${currentBlockId}: saved scales ${effects.zoom.startScale}→${effects.zoom.endScale} converted to sliders ${startSliderValue}→${endSliderValue}`);

                                        // Derive direction from start/end scales for UI toggle (use original zoom scales for comparison)
                                        if (effects.zoom.startScale < effects.zoom.endScale) {
                                            initialDirections[`zoom-${currentBlockId}`] = 'in';  // Zooming in (getting bigger)
                                            // Set legacy scale to the end scale (the zoom target)
                                            initialScales[`zoom-${currentBlockId}`] = effects.zoom.endScale;
                                        } else if (effects.zoom.startScale > effects.zoom.endScale) {
                                            initialDirections[`zoom-${currentBlockId}`] = 'out'; // Zooming out (getting smaller)
                                            // Set legacy scale to the start scale (the zoom starting point)
                                            initialScales[`zoom-${currentBlockId}`] = effects.zoom.startScale;
                                        } else {
                                            initialDirections[`zoom-${currentBlockId}`] = 'in';  // Default to 'in' if equal
                                            initialScales[`zoom-${currentBlockId}`] = effects.zoom.endScale;
                                        }
                                    } else if (effects.zoom.scale !== undefined && effects.zoom.type !== undefined) {
                                        // LEGACY format: convert type + scale to start/end scales
                                        if (effects.zoom.type === 'in') {
                                            initialStartScales[`zoom-${currentBlockId}`] = 0; // Always start at normal (slider 0)
                                            initialEndScales[`zoom-${currentBlockId}`] = scaleToSlider(effects.zoom.scale);
                                        } else { // zoom-out
                                            initialStartScales[`zoom-${currentBlockId}`] = scaleToSlider(effects.zoom.scale);
                                            initialEndScales[`zoom-${currentBlockId}`] = 0; // Always end at normal (slider 0)
                                        }
                                        // Also populate legacy scale for compatibility
                                        initialScales[`zoom-${currentBlockId}`] = effects.zoom.scale;
                                        initialDirections[`zoom-${currentBlockId}`] = effects.zoom.type;
                                    }

                                    if (effects.zoom.target) {
                                        initialTargets[`zoom-${currentBlockId}`] = effects.zoom.target;
                                    }
                                }

                                if (blockEffects.length > 0) {
                                    initialEffects[`effect-${currentBlockId}`] = blockEffects;
                                }

                                console.log(`🎬 Loaded effects from JSON object for block ${currentBlockId}:`, blockEffects);
                            }

                            realBlocks.push(mediaBlock);
                            blockId++;
                            // console.log('✅ Added JSON media block:', mediaBlock.mediaName);
                        }
                    }

                    console.log('✅ JSON blocks processing complete:', realBlocks.length - 1, 'content blocks added');

                } else {
                    console.log('❌ No JSON blocks found - story cut needs to be regenerated with new AI system');
                    setError('This story cut was created with the old system. Please regenerate it to use the block editor.');
                }

                // Always add end block
                realBlocks.push({
                    id: 999,
                    type: 'end',
                    title: 'End Story'
                });

                // Media blocks from JSON already have URLs - no resolution needed

                // Add voice model checking for existing contributor blocks
                for (const block of realBlocks) {
                    if (block.type === 'voice' && block.voiceType === 'contributor') {
                        let userId = null;

                        // Try to get user ID from message data first
                        if (block.messageId && loadedStoryMessages && loadedStoryMessages.length > 0) {
                            const foundMessage = loadedStoryMessages.find(msg => msg.id === block.messageId);
                            if (foundMessage) {
                                userId = foundMessage.user_id;
                                // console.log(`🔍 Found user ID ${userId} for ${block.voiceTag} via messageId ${block.messageId}`);
                            }
                        }

                        // Fallback: try to find user ID by matching contributor name
                        if (!userId && loadedStoryMessages && loadedStoryMessages.length > 0) {
                            const nameMatch = loadedStoryMessages.find(msg =>
                                msg.user_first_name && msg.user_first_name.toLowerCase() === block.voiceTag.toLowerCase()
                            );
                            if (nameMatch) {
                                userId = nameMatch.user_id;
                                // console.log(`🔍 Found user ID ${userId} for ${block.voiceTag} via name matching`);
                            }
                        }

                        // Check voice model if we found a user ID
                        if (userId) {
                            try {
                                const userVoiceModel = await getUserVoiceModel(userId);
                                block.hasVoiceModel = !!(userVoiceModel && userVoiceModel.elevenlabs_voice_id);
                                // console.log(`🎤 Voice model check for ${block.voiceTag}: ${block.hasVoiceModel ? 'available' : 'not available'}`);
                            } catch (error) {
                                console.warn(`Failed to check voice model for ${block.voiceTag}:`, error);
                                block.hasVoiceModel = false;
                            }
                        } else {
                            console.warn(`No user ID found for ${block.voiceTag}, defaulting hasVoiceModel to false`);
                            block.hasVoiceModel = false;
                        }
                    }
                }

                setBlocks(realBlocks);

                // Store original blocks for change detection
                setOriginalBlocks(JSON.parse(JSON.stringify(realBlocks)));

                // ✅ FIXED: Set effect states from parsed data
                setSelectedEffects(initialEffects);
                setEffectDirections(initialDirections);
                setEffectDurations(initialDurations);
                setEffectDistances(initialDistances);
                setEffectStartPositions(initialStartPositions);
                setEffectEndPositions(initialEndPositions);
                setEffectScales(initialScales);
                setEffectStartScales(initialStartScales);
                setEffectEndScales(initialEndScales);
                setEffectTargets(initialTargets);

                // Store original effect states for change detection
                setOriginalEffects(JSON.parse(JSON.stringify(initialEffects)));
                setOriginalDirections(JSON.parse(JSON.stringify(initialDirections)));
                setOriginalDurations(JSON.parse(JSON.stringify(initialDurations)));
                setOriginalDistances(JSON.parse(JSON.stringify(initialDistances)));
                setOriginalStartPositions(JSON.parse(JSON.stringify(initialStartPositions)));
                setOriginalEndPositions(JSON.parse(JSON.stringify(initialEndPositions)));
                setOriginalScales(JSON.parse(JSON.stringify(initialScales)));
                setOriginalStartScales(JSON.parse(JSON.stringify(initialStartScales)));
                setOriginalEndScales(JSON.parse(JSON.stringify(initialEndScales)));
                setOriginalTargets(JSON.parse(JSON.stringify(initialTargets)));

                console.log('🎬 Effect states initialized from JSON blocks:', {
                    effects: Object.keys(initialEffects).length,
                    directions: Object.keys(initialDirections).length,
                    durations: Object.keys(initialDurations).length,
                    distances: Object.keys(initialDistances).length,
                    scales: Object.keys(initialScales).length,
                    targets: Object.keys(initialTargets).length
                });

                // Initialize selected effects for blocks that have effects by default
                realBlocks.forEach(block => {


                    // Set default directions for all effects (only if not already set)
                    if (!initialDirections[`fade-${block.id}`]) {
                        initialDirections[`fade-${block.id}`] = 'in';
                    }
                    if (!initialDirections[`pan-${block.id}`]) {
                        initialDirections[`pan-${block.id}`] = 'left';
                    }
                    if (!initialDirections[`zoom-${block.id}`]) {
                        initialDirections[`zoom-${block.id}`] = 'in';
                    }


                    // Set default durations for all effects (only if not already set)
                    if (!initialDurations[`fade-${block.id}`]) {
                        initialDurations[`fade-${block.id}`] = 3.0;
                    }
                    if (!initialDurations[`pan-${block.id}`]) {
                        initialDurations[`pan-${block.id}`] = 4.0;
                    }
                    if (!initialDurations[`zoom-${block.id}`]) {
                        initialDurations[`zoom-${block.id}`] = 3.5;
                    }

                    // Set default distances and scales (only if not already set)
                    if (!initialDistances[`pan-${block.id}`]) {
                        initialDistances[`pan-${block.id}`] = 25;
                    }
                    if (!initialScales[`zoom-${block.id}`]) {
                        initialScales[`zoom-${block.id}`] = 1.5;
                    }

                    // Set default start and end positions for new pan system
                    if (!initialStartPositions[`pan-${block.id}`]) {
                        initialStartPositions[`pan-${block.id}`] = -25; // Default start position (left side)
                    }
                    if (!initialEndPositions[`pan-${block.id}`]) {
                        initialEndPositions[`pan-${block.id}`] = 25; // Default end position (right side)
                    }

                    // Set default start and end scales for new zoom system
                    if (!initialStartScales[`zoom-${block.id}`]) {
                        initialStartScales[`zoom-${block.id}`] = 0; // Default start scale (normal)
                    }
                    if (!initialEndScales[`zoom-${block.id}`]) {
                        initialEndScales[`zoom-${block.id}`] = 2.5; // Default end scale (slider +2.5 = 1.5x zoom)
                    }
                });
                setSelectedEffects(initialEffects);
                setEffectDirections(initialDirections);
                setEffectDurations(initialDurations);
                setEffectDistances(initialDistances);
                setEffectStartPositions(initialStartPositions);
                setEffectEndPositions(initialEndPositions);
                setEffectScales(initialScales);
                setEffectStartScales(initialStartScales);
                setEffectEndScales(initialEndScales);
                setEffectTargets(initialTargets);

                // Load tagged people for zoom target selection
                console.log('👤 Loading tagged people for zoom targets...');
                try {
                    const people = await getEmberTaggedPeople(id);
                    setTaggedPeople(people || []);
                    console.log('✅ Loaded tagged people:', people?.length || 0);
                } catch (taggedError) {
                    console.warn('⚠️ Could not load tagged people:', taggedError);
                    setTaggedPeople([]);
                }

            } catch (err) {
                console.error('Failed to load story cut:', err);
                setError(err.message || 'Failed to load story cut');
            } finally {
                setLoading(false);
            }
        };

        loadStoryCut();
    }, [id, storyCutId, user]);

    // Initialize voice IDs from story cut data
    useEffect(() => {
        if (storyCut) {
            setCurrentEmberVoiceId(storyCut.ember_voice_id || '');
            setCurrentNarratorVoiceId(storyCut.narrator_voice_id || '');
        }
    }, [storyCut]);

    // Load editable voice blocks for current user
    useEffect(() => {
        const loadEditableBlocks = async () => {
            if (!user?.id) return;

            try {
                console.log('🔍 Loading editable voice blocks for user:', user.id);
                const editableVoiceBlocks = await getEditableVoiceBlocks(user.id);

                // Create a map for quick lookups: story_cut_id-block_index -> block_data
                const blockMap = new Map();
                editableVoiceBlocks.forEach(block => {
                    const key = `${block.story_cut_id}-${block.block_index}`;
                    blockMap.set(key, block);
                });

                setEditableBlocks(editableVoiceBlocks);
                setEditableBlocksMap(blockMap);

                console.log(`✅ Loaded ${editableVoiceBlocks.length} editable voice blocks`);
            } catch (error) {
                console.error('❌ Failed to load editable voice blocks:', error);
            }
        };

        loadEditableBlocks();
    }, [user?.id, storyCut?.id]); // Reload when user or story cut changes

    // Navigation protection for unsaved changes
    useEffect(() => {
        const handleBeforeUnload = (e) => {
            if (hasUnsavedChanges) {
                e.preventDefault();
                e.returnValue = '';
            }
        };

        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [hasUnsavedChanges]);

    // Detect changes and update dirty state
    useEffect(() => {
        if (originalBlocks.length === 0 || blocks.length === 0) return;

        // Deep compare blocks to detect changes
        const hasBlockChanges = JSON.stringify(originalBlocks) !== JSON.stringify(blocks);

        // Deep compare effects to detect changes
        const hasEffectChanges = (
            JSON.stringify(originalEffects) !== JSON.stringify(selectedEffects) ||
            JSON.stringify(originalDirections) !== JSON.stringify(effectDirections) ||
            JSON.stringify(originalDurations) !== JSON.stringify(effectDurations) ||
            JSON.stringify(originalDistances) !== JSON.stringify(effectDistances) ||
            JSON.stringify(originalStartPositions) !== JSON.stringify(effectStartPositions) ||
            JSON.stringify(originalEndPositions) !== JSON.stringify(effectEndPositions) ||
            JSON.stringify(originalScales) !== JSON.stringify(effectScales) ||
            JSON.stringify(originalStartScales) !== JSON.stringify(effectStartScales) ||
            JSON.stringify(originalEndScales) !== JSON.stringify(effectEndScales) ||
            JSON.stringify(originalTargets) !== JSON.stringify(effectTargets)
        );

        const hasChanges = hasBlockChanges || hasEffectChanges;
        setHasUnsavedChanges(hasChanges);

        if (hasEffectChanges) {
            console.log('🎬 Effect changes detected:', {
                effectsChanged: JSON.stringify(originalEffects) !== JSON.stringify(selectedEffects),
                directionsChanged: JSON.stringify(originalDirections) !== JSON.stringify(effectDirections),
                durationsChanged: JSON.stringify(originalDurations) !== JSON.stringify(effectDurations),
                distancesChanged: JSON.stringify(originalDistances) !== JSON.stringify(effectDistances),
                startPositionsChanged: JSON.stringify(originalStartPositions) !== JSON.stringify(effectStartPositions),
                endPositionsChanged: JSON.stringify(originalEndPositions) !== JSON.stringify(effectEndPositions),
                scalesChanged: JSON.stringify(originalScales) !== JSON.stringify(effectScales),
                startScalesChanged: JSON.stringify(originalStartScales) !== JSON.stringify(effectStartScales),
                endScalesChanged: JSON.stringify(originalEndScales) !== JSON.stringify(effectEndScales),
                targetsChanged: JSON.stringify(originalTargets) !== JSON.stringify(effectTargets)
            });
        }
    }, [blocks, originalBlocks, selectedEffects, effectDirections, effectDurations, effectDistances, effectStartPositions, effectEndPositions, effectScales, effectStartScales, effectEndScales, effectTargets, originalEffects, originalDirections, originalDurations, originalDistances, originalStartPositions, originalEndPositions, originalScales, originalStartScales, originalEndScales, originalTargets]);

    // Helper function to parse effects from JSON block content (for loading from database)
    const parseEffectsFromContent = (content, blockId) => {
        const effects = [];
        const directions = {};
        const durations = {};
        const distances = {};
        const scales = {};
        const targets = {};

        if (!content || content === 'media') {
            return { effects, directions, durations, distances, scales, targets };
        }

        // Smart split effects to handle coordinates properly
        const effectList = content.split(',').map(e => e.trim());

        effectList.forEach(effect => {
            // Parse FADE effects: FADE-IN:duration=3.0 or FADE-OUT:duration=2.5
            const fadeMatch = effect.match(/FADE-(IN|OUT):duration=([0-9.]+)/);
            if (fadeMatch) {
                const [, direction, duration] = fadeMatch;
                effects.push('fade');
                directions[`fade-${blockId}`] = direction.toLowerCase();
                durations[`fade-${blockId}`] = parseFloat(duration);
            }

            // Parse PAN effects: PAN-LEFT:distance=25%:duration=4.0 or PAN-RIGHT:distance=30%:duration=3.5
            const panMatch = effect.match(/PAN-(LEFT|RIGHT)(?::distance=([0-9]+)%)?:duration=([0-9.]+)/);
            if (panMatch) {
                const [, direction, distance, duration] = panMatch;
                effects.push('pan');
                directions[`pan-${blockId}`] = direction.toLowerCase();
                durations[`pan-${blockId}`] = parseFloat(duration);
                if (distance) {
                    distances[`pan-${blockId}`] = parseInt(distance);
                }
            }

            // Parse ZOOM effects: ZOOM-IN:scale=1.5:duration=3.5:target=person:123 or ZOOM-OUT:scale=0.8:duration=2.0:target=custom:100,200
            const zoomMatch = effect.match(/ZOOM-(IN|OUT)(?::scale=([0-9.]+))?:duration=([0-9.]+)(?::target=(.*))?$/);
            if (zoomMatch) {
                const [, direction, scale, duration, target] = zoomMatch;
                effects.push('zoom');
                directions[`zoom-${blockId}`] = direction.toLowerCase();
                durations[`zoom-${blockId}`] = parseFloat(duration);
                if (scale) {
                    scales[`zoom-${blockId}`] = parseFloat(scale);
                }

                // Parse target information
                if (target) {
                    if (target.startsWith('person:')) {
                        const personId = target.replace('person:', '');
                        targets[`zoom-${blockId}`] = { type: 'person', personId };
                    } else if (target.startsWith('custom:')) {
                        const coords = target.replace('custom:', '').split(',');
                        if (coords.length === 2) {
                            const parsedCoords = { x: parseInt(coords[0]), y: parseInt(coords[1]) };
                            targets[`zoom-${blockId}`] = {
                                type: 'custom',
                                coordinates: parsedCoords
                            };
                        }
                    }
                }
            }
        });

        return { effects, directions, durations, distances, scales, targets };
    };



    // Helper function to generate effect object from UI state (for EmberPlay compatibility)
    const generateEffectObject = (blockId) => {
        const effects = {};
        const blockEffects = selectedEffects[`effect-${blockId}`] || [];

        if (blockEffects.includes('fade')) {
            effects.fade = {
                type: effectDirections[`fade-${blockId}`] || 'in',
                duration: effectDurations[`fade-${blockId}`] || 3.0
            };
        }

        if (blockEffects.includes('pan')) {
            // Convert slider values to actual pan positions
            const startSliderValue = effectStartPositions[`pan-${blockId}`] || -25;
            const endSliderValue = effectEndPositions[`pan-${blockId}`] || 25;
            const startPosition = sliderToPanPosition(startSliderValue);
            const endPosition = sliderToPanPosition(endSliderValue);

            effects.pan = {
                startPosition,
                endPosition,
                duration: effectDurations[`pan-${blockId}`] || 4.0
            };
        }

        if (blockEffects.includes('zoom')) {
            const target = effectTargets[`zoom-${blockId}`];

            // Convert slider values to actual zoom scales
            const startSliderValue = effectStartScales[`zoom-${blockId}`] || 0;
            const endSliderValue = effectEndScales[`zoom-${blockId}`] || 0;
            const startScale = sliderToScale(startSliderValue);
            const endScale = sliderToScale(endSliderValue);

            effects.zoom = {
                startScale,
                endScale,
                duration: effectDurations[`zoom-${blockId}`] || 3.5,
                target: target || { type: 'center' }
            };
        }

        return effects;
    };

    // Handle saving changes to database
    const handleUpdateStoryCut = async () => {
        console.log('🔍 DEBUG - Save attempt:', {
            storyCut,
            'storyCut.id': storyCut?.id,
            'user.id': user?.id,
            hasUnsavedChanges
        });

        if (!storyCut?.id || !hasUnsavedChanges || !user?.id) {
            console.log('❌ Missing required data for save:', {
                'storyCut.id exists': !!storyCut?.id,
                'user.id exists': !!user?.id,
                'hasUnsavedChanges': hasUnsavedChanges
            });
            return;
        }

        try {
            setIsSaving(true);
            setSaveError(null);

            console.log('📦 Converting blocks to save format...');

            // Convert UI blocks back to JSON format for database
            const blocksToSave = blocks
                .filter(block => block.type !== 'start' && block.type !== 'end')
                .map((block, index) => {
                    if (block.type === 'voice') {
                        return {
                            // ✅ ENHANCED: Core fields
                            type: 'voice',
                            order: index + 1,
                            content: block.content,
                            speaker: block.voiceTag,

                            // ✅ ENHANCED: Voice metadata for EmberPlay
                            voiceType: block.voiceType, // ember | narrator | contributor
                            voiceTag: block.voiceTag,   // Display name

                            // ✅ ENHANCED: User/Audio metadata
                            user_id: block.voiceType === 'contributor' ? (block.contributorData?.user_id || null) : null,
                            voice_preference: (() => {
                                if (block.voiceType === 'contributor') {
                                    const blockKey = `${block.voiceTag}-${block.id}`;
                                    return contributorAudioPreferences[blockKey] || 'text';
                                } else if (block.voiceType === 'demo') {
                                    const blockKey = `${block.voiceTag}-${block.id}`;
                                    return contributorAudioPreferences[blockKey] || 'text';
                                }
                                return block.preference || 'text';
                            })(),
                            message_id: block.messageId || null,

                            // ✅ ENHANCED: Demo block metadata
                            demo_contribution_id: block.voiceType === 'demo' ? block.demo_contribution_id : null,
                            demo_data: block.voiceType === 'demo' ? block.demoData : null,

                            // ✅ ENHANCED: Audio metadata
                            hasRecordedAudio: block.messageType === 'Audio Message',
                            messageType: block.messageType,

                            // ✅ ENHANCED: Visual metadata
                            avatarUrl: block.avatarUrl,
                            displayName: (() => {
                                const storyMessage = storyMessages.find(msg =>
                                    msg.user_id === block.messageId ||
                                    msg.user_first_name?.toLowerCase() === block.voiceTag?.toLowerCase()
                                );
                                return getContributorDisplayName(block.contributorData, storyMessage, block.voiceTag);
                            })(),
                            hasVoiceModel: block.hasVoiceModel
                        };
                    } else if (block.type === 'media') {
                        // ✅ NEW: Generate effect object for direct usage
                        const effectObject = generateEffectObject(block.id);

                        return {
                            // ✅ ENHANCED: Core fields
                            type: 'media',
                            order: index + 1,
                            media_id: block.mediaId,
                            media_name: block.mediaName,
                            media_url: block.mediaUrl,

                            // ✅ NEW: Store effects as object instead of string
                            effects: effectObject,

                            // ✅ ENHANCED: Media metadata
                            mediaType: 'image', // Most media is images
                            displayName: block.mediaName
                        };
                    }
                    return null;
                }).filter(Boolean);

            console.log('💾 Saving blocks to database:', {
                storyCutId: storyCut.id,
                userId: user.id,
                blocksCount: blocksToSave.length,
                blocks: blocksToSave
            });

            // Update the story cut with new blocks (requires userId for permission check)
            await updateStoryCut(storyCut.id, {
                blocks: {
                    blocks: blocksToSave,
                    version: '2.0'
                }
            }, user.id);

            // Reset dirty state and update original blocks and effects
            setOriginalBlocks(JSON.parse(JSON.stringify(blocks)));
            setOriginalEffects(JSON.parse(JSON.stringify(selectedEffects)));
            setOriginalDirections(JSON.parse(JSON.stringify(effectDirections)));
            setOriginalDurations(JSON.parse(JSON.stringify(effectDurations)));
            setOriginalDistances(JSON.parse(JSON.stringify(effectDistances)));
            setOriginalStartPositions(JSON.parse(JSON.stringify(effectStartPositions)));
            setOriginalEndPositions(JSON.parse(JSON.stringify(effectEndPositions)));
            setOriginalScales(JSON.parse(JSON.stringify(effectScales)));
            setOriginalStartScales(JSON.parse(JSON.stringify(effectStartScales)));
            setOriginalEndScales(JSON.parse(JSON.stringify(effectEndScales)));
            setOriginalTargets(JSON.parse(JSON.stringify(effectTargets)));
            setHasUnsavedChanges(false);

            console.log('✅ Story cut updated successfully');

        } catch (error) {
            console.error('❌ Failed to update story cut:', error);
            console.error('❌ Error details:', {
                message: error.message,
                stack: error.stack,
                storyCutId: storyCut?.id,
                userId: user?.id
            });
            setSaveError(error.message || 'Failed to save changes');
        } finally {
            setIsSaving(false);
        }
    };

    // Handle canceling changes
    const handleCancelChanges = () => {
        if (!hasUnsavedChanges) {
            // No changes, just navigate back
            navigate(`/embers/${id}/manage?view=story-cuts`);
            return;
        }

        // Confirm before discarding changes
        if (window.confirm('Are you sure you want to discard all unsaved changes?')) {
            // Revert to original blocks and effects
            setBlocks(JSON.parse(JSON.stringify(originalBlocks)));
            setSelectedEffects(JSON.parse(JSON.stringify(originalEffects)));
            setEffectDirections(JSON.parse(JSON.stringify(originalDirections)));
            setEffectDurations(JSON.parse(JSON.stringify(originalDurations)));
            setEffectDistances(JSON.parse(JSON.stringify(originalDistances)));
            setEffectStartPositions(JSON.parse(JSON.stringify(originalStartPositions)));
            setEffectEndPositions(JSON.parse(JSON.stringify(originalEndPositions)));
            setEffectScales(JSON.parse(JSON.stringify(originalScales)));
            setEffectStartScales(JSON.parse(JSON.stringify(originalStartScales)));
            setEffectEndScales(JSON.parse(JSON.stringify(originalEndScales)));
            setEffectTargets(JSON.parse(JSON.stringify(originalTargets)));
            setHasUnsavedChanges(false);

            // Navigate back
            navigate(`/embers/${id}/manage?view=story-cuts`);
        }
    };

    // Script editing sync removed - JSON blocks are now the canonical representation



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

    // Helper function to check if a block is editable by current user
    const isBlockEditable = (block, blockIndex) => {
        if (!storyCut?.id || !block || block.type !== 'voice') return false;

        // Allow ember and narrator voice editing (existing functionality)
        if (['ember', 'narrator'].includes(block.voiceType)) {
            // Adjust for UI offset: UI has "start" block at index 0, so voice blocks are shifted +1
            // Database returns original JSON block indexes, so we need to subtract 1
            const jsonBlockIndex = blockIndex - 1;
            const key = `${storyCut.id}-${jsonBlockIndex}`;
            return editableBlocksMap.has(key);
        }

        // NEW: Allow editing of ALL contributor voice blocks (collaborative editing)
        if (block.voiceType === 'contributor') {
            console.log(`✅ All contributions are editable: ${block.voiceTag}`);
            return true;
        }

        // NEW: Allow editing of demo voice blocks
        if (block.voiceType === 'demo') {
            console.log(`✅ Demo blocks are editable: ${block.voiceTag}`);
            return true;
        }

        return false;
    };

    // Handle opening edit modal for voice content
    const handleEditVoiceContent = (block, blockIndex) => {
        console.log('🖊️ Opening edit modal for:', block.voiceTag, block.content);
        setEditingBlock(block);
        setEditingBlockIndex(blockIndex);
        setEditedContent(block.content);
        setShowEditModal(true);
    };

    // Handle saving edited voice content
    const handleSaveEditedContent = () => {
        if (!editingBlock || editingBlockIndex === null || !editedContent.trim()) {
            console.log('❌ Invalid edit data');
            return;
        }

        console.log('💾 Saving edited content:', editedContent);

        // Update the block in the UI state
        const updatedBlocks = [...blocks];
        updatedBlocks[editingBlockIndex] = {
            ...updatedBlocks[editingBlockIndex],
            content: editedContent.trim()
        };
        setBlocks(updatedBlocks);

        // Close modal and reset state
        setShowEditModal(false);
        setEditingBlock(null);
        setEditingBlockIndex(null);
        setEditedContent('');

        console.log('✅ Content updated successfully');
    };

    // Handle canceling edit
    const handleCancelEdit = () => {
        setShowEditModal(false);
        setEditingBlock(null);
        setEditingBlockIndex(null);
        setEditedContent('');
    };

    // Helper function to format voice tags with voice names (string version for alt text)
    const formatVoiceTag = (block) => {
        if (!block) return 'Unknown Voice';

        if (block.voiceType === 'ember') {
            const voiceName = storyCut?.ember_voice_name || 'Unknown Voice';
            return `Ember AI (${voiceName})`;
        } else if (block.voiceType === 'narrator') {
            const voiceName = storyCut?.narrator_voice_name || 'Unknown Voice';
            return `Narrator (${voiceName})`;
        } else {
            // For contributors, use the original voiceTag (user's name)
            return block.voiceTag || 'Unknown Voice';
        }
    };

    // Helper function to format voice tags with styled voice names (JSX version for display)
    const formatVoiceTagJSX = (block) => {
        if (!block) return 'Unknown Voice';

        if (block.voiceType === 'ember') {
            const voiceName = storyCut?.ember_voice_name || 'Unknown Voice';
            return (
                <>
                    Ember AI <span className="font-normal text-xs opacity-80">({voiceName})</span>
                </>
            );
        } else if (block.voiceType === 'narrator') {
            const voiceName = storyCut?.narrator_voice_name || 'Unknown Voice';
            return (
                <>
                    Narrator <span className="font-normal text-xs opacity-80">({voiceName})</span>
                </>
            );
        } else {
            // For contributors, use the original voiceTag (user's name)
            return block.voiceTag || 'Unknown Voice';
        }
    };

    // Helper function to get short voice tag for compact displays
    const getShortVoiceTag = (block) => {
        if (!block) return '?';

        if (block.voiceType === 'ember') {
            return 'E';
        } else if (block.voiceType === 'narrator') {
            return 'N';
        } else {
            // For contributors, use first letter of name
            return block.voiceTag?.[0]?.toUpperCase() || '?';
        }
    };

    // Helper function to calculate block duration in seconds
    const calculateBlockDuration = (block) => {
        if (!block) return 0;

        if (block.type === 'voice') {
            // Voice blocks: estimate based on text length (0.08 seconds per character)
            const cleanContent = block.content?.replace(/<[^>]+>/g, '').trim() || '';
            return Math.max(1, cleanContent.length * 0.08);
        } else if (block.type === 'media') {
            // Media blocks: fixed 2 seconds
            return 2.0;
        } else if (block.type === 'loadscreen') {
            // Load screen blocks: use duration or default
            return parseFloat(block.loadDuration || 2.0);
        } else if (block.type === 'hold') {
            // Hold blocks: use duration or default
            return parseFloat(block.duration || 3.0);
        }

        return 0;
    };

    // Helper function to format duration for display (e.g., "2.4s", "12s")
    const formatBlockDuration = (block) => {
        const duration = calculateBlockDuration(block);
        if (duration === 0) return '';

        // Show 1 decimal place if less than 10 seconds and has decimal, otherwise round
        return duration < 10 && duration % 1 !== 0
            ? `${duration.toFixed(1)}s`
            : `${Math.round(duration)}s`;
    };

    // Handle voice change for AI voices (ember/narrator)
    const handleVoiceChange = async (voiceType, newVoiceId) => {
        if (!storyCut?.id || !user?.id) {
            console.error('❌ Cannot change voice: missing storyCut ID or user ID');
            return;
        }

        const selectedVoice = availableVoices.find(v => v.voice_id === newVoiceId);
        if (!selectedVoice) {
            console.error('❌ Selected voice not found:', newVoiceId);
            return;
        }

        try {
            console.log(`🎤 Changing ${voiceType} voice to: ${selectedVoice.name} (${newVoiceId})`);

            // Prepare updates for database
            const updates = {};
            if (voiceType === 'ember') {
                updates.ember_voice_id = newVoiceId;
                updates.ember_voice_name = selectedVoice.name;
                setCurrentEmberVoiceId(newVoiceId);
            } else if (voiceType === 'narrator') {
                updates.narrator_voice_id = newVoiceId;
                updates.narrator_voice_name = selectedVoice.name;
                setCurrentNarratorVoiceId(newVoiceId);
            }

            // Update database
            await updateStoryCut(storyCut.id, updates, user.id);

            // Update local storyCut state
            setStoryCut(prev => ({ ...prev, ...updates }));

            console.log(`✅ Successfully updated ${voiceType} voice to: ${selectedVoice.name}`);

        } catch (error) {
            console.error(`❌ Failed to update ${voiceType} voice:`, error);

            // Revert local state on error
            if (voiceType === 'ember') {
                setCurrentEmberVoiceId(storyCut.ember_voice_id || '');
            } else if (voiceType === 'narrator') {
                setCurrentNarratorVoiceId(storyCut.narrator_voice_id || '');
            }
        }
    };

    // Handle deleting a block
    const handleDeleteBlock = (blockId, blockType) => {
        // Prevent deletion of start and end blocks
        if (blockType === 'start' || blockType === 'end') {
            console.log('❌ Cannot delete start or end blocks');
            return;
        }

        // Show confirmation dialog
        const confirmDelete = window.confirm('Are you sure you want to delete this block? This action cannot be undone.');

        if (confirmDelete) {
            console.log('🗑️ Deleting block:', blockId, blockType);

            // Remove the block from the array
            setBlocks(prev => prev.filter(block => block.id !== blockId));

            // Clean up any effect states for this block
            setSelectedEffects(prev => {
                const updated = { ...prev };
                delete updated[`effect-${blockId}`];
                return updated;
            });

            setEffectDirections(prev => {
                const updated = { ...prev };
                Object.keys(updated).forEach(key => {
                    if (key.includes(`-${blockId}`)) {
                        delete updated[key];
                    }
                });
                return updated;
            });

            setEffectDurations(prev => {
                const updated = { ...prev };
                Object.keys(updated).forEach(key => {
                    if (key.includes(`-${blockId}`)) {
                        delete updated[key];
                    }
                });
                return updated;
            });

            setEffectDistances(prev => {
                const updated = { ...prev };
                Object.keys(updated).forEach(key => {
                    if (key.includes(`-${blockId}`)) {
                        delete updated[key];
                    }
                });
                return updated;
            });

            setEffectScales(prev => {
                const updated = { ...prev };
                Object.keys(updated).forEach(key => {
                    if (key.includes(`-${blockId}`)) {
                        delete updated[key];
                    }
                });
                return updated;
            });

            setEffectTargets(prev => {
                const updated = { ...prev };
                Object.keys(updated).forEach(key => {
                    if (key.includes(`-${blockId}`)) {
                        delete updated[key];
                    }
                });
                return updated;
            });

            console.log('✅ Block deleted successfully');
        }
    };

    // Helper function to get arrow button colors based on block type
    const getArrowButtonColors = (block) => {
        if (block.type === 'media') {
            return {
                active: 'bg-blue-100 hover:bg-blue-200 text-blue-600',
                disabled: 'bg-blue-50 text-blue-300 cursor-not-allowed'
            };
        } else if (block.type === 'voice') {
            if (block.voiceType === 'ember') {
                return {
                    active: 'bg-purple-100 hover:bg-purple-200 text-purple-600',
                    disabled: 'bg-purple-50 text-purple-300 cursor-not-allowed'
                };
            } else if (block.voiceType === 'narrator') {
                return {
                    active: 'bg-yellow-100 hover:bg-yellow-200 text-yellow-600',
                    disabled: 'bg-yellow-50 text-yellow-300 cursor-not-allowed'
                };
            } else if (block.voiceType === 'contributor') {
                return {
                    active: 'bg-green-100 hover:bg-green-200 text-green-600',
                    disabled: 'bg-green-50 text-green-300 cursor-not-allowed'
                };
            } else if (block.voiceType === 'demo') {
                return {
                    active: 'bg-red-100 hover:bg-red-200 text-red-600',
                    disabled: 'bg-red-50 text-red-300 cursor-not-allowed'
                };
            } else {
                // Default fallback for voice blocks with unknown voiceType
                return {
                    active: 'bg-gray-100 hover:bg-gray-200 text-gray-600',
                    disabled: 'bg-gray-50 text-gray-300 cursor-not-allowed'
                };
            }
        } else if (block.type === 'loadscreen') {
            return {
                active: 'bg-gray-100 hover:bg-gray-200 text-gray-600',
                disabled: 'bg-gray-50 text-gray-300 cursor-not-allowed'
            };
        }

        // Default fallback
        return {
            active: 'bg-gray-100 hover:bg-gray-200 text-gray-600',
            disabled: 'bg-gray-50 text-gray-300 cursor-not-allowed'
        };
    };

    // Block reordering functions
    const moveBlockUp = async (index) => {
        if (index === 0) return; // Can't move first block up

        const newBlocks = [...blocks];
        const blockToMove = newBlocks[index];
        newBlocks[index] = newBlocks[index - 1];
        newBlocks[index - 1] = blockToMove;

        setBlocks(newBlocks);
        console.log(`🔄 Moved block ${blockToMove.id} up (index ${index} → ${index - 1})`);

        // Note: Block reordering now only affects UI state - JSON blocks are canonical
    };

    const moveBlockDown = async (index) => {
        if (index === blocks.length - 1) return; // Can't move last block down

        const newBlocks = [...blocks];
        const blockToMove = newBlocks[index];
        newBlocks[index] = newBlocks[index + 1];
        newBlocks[index + 1] = blockToMove;

        setBlocks(newBlocks);
        console.log(`🔄 Moved block ${blockToMove.id} down (index ${index} → ${index + 1})`);

        // Note: Block reordering now only affects UI state - JSON blocks are canonical
    };






    // DEPRECATED: Helper function to get contributor avatar data at component level (fallback method)
    // Now using getSimpleContributorData instead for better reliability
    const getContributorAvatarData = (identifier) => {
        if (!identifier) {
            console.log(`⚠️ No identifier provided for contributor lookup`);
            return {
                avatarUrl: null,
                firstName: 'Unknown',
                lastName: null,
                email: null,
                fallbackText: '?'
            };
        }

        let contributor = null;

        // Try to match by user_id first (UUID format)
        if (identifier.length > 20 && identifier.includes('-')) {
            contributor = contributors.find(c => c.user_id === identifier);
            if (contributor) {
                console.log(`✅ Found contributor by user_id ${identifier}:`, contributor);
            }
        }

        // If no match by user_id, try by first name
        if (!contributor) {
            contributor = contributors.find(c =>
                c.first_name && c.first_name.toLowerCase() === identifier.toLowerCase().trim()
            );
            if (contributor) {
                console.log(`✅ Found contributor by name ${identifier}:`, contributor);
            }
        }

        if (contributor) {
            return {
                avatarUrl: contributor.avatar_url || null,
                firstName: contributor.first_name,
                lastName: contributor.last_name,
                email: contributor.email,
                fallbackText: contributor.first_name?.[0] || contributor.last_name?.[0] || contributor.email?.[0]?.toUpperCase() || identifier[0]?.toUpperCase() || '?'
            };
        }

        console.log(`⚠️ No contributor found for ${identifier}, using defaults`);
        return {
            avatarUrl: null, // Will fall back to UI placeholder handling
            firstName: identifier,
            lastName: null,
            email: null,
            fallbackText: identifier[0]?.toUpperCase() || '?'
        };
    };

    // Handle saving custom zoom target point
    const handleSaveZoomTarget = async (coordinates) => {
        if (!selectedZoomBlock) return;

        setEffectTargets(prev => ({
            ...prev,
            [`zoom-${selectedZoomBlock.id}`]: {
                type: 'custom',
                coordinates
            }
        }));

        console.log(`🎯 Set custom zoom target for block ${selectedZoomBlock.id}:`, coordinates);
    };

    // Handle closing zoom target modal
    const handleCloseZoomTargetModal = () => {
        setShowZoomTargetModal(false);
        setSelectedZoomBlock(null);
    };

    // Handle adding a new block (media, AI content, or contributions)
    const handleAddMediaBlock = async (selection) => {
        if (!selection || !user || !storyCut) return;

        // Handle different block types from new AddBlockModal format
        const blockType = selection.blockType || 'legacy';
        const selectedMedia = selection.media || (selection.name ? selection : null);
        const selectedContributions = selection.contributions || [];
        const emberContent = selection.emberContent || null;
        const narratorContent = selection.narratorContent || null;
        const selectedDemoContributions = selection.demoContributions || [];

        // Validate that we have content for the selected block type
        if (blockType === 'media' && !selectedMedia) return;
        if (blockType === 'ember' && !emberContent) return;
        if (blockType === 'narrator' && !narratorContent) return;
        if (blockType === 'contributions' && selectedContributions.length === 0) return;
        if (blockType === 'demo' && selectedDemoContributions.length === 0) return;
        if (blockType === 'legacy' && !selectedMedia && selectedContributions.length === 0) return;

        try {
            const newBlocks = [...blocks];
            const endBlockIndex = newBlocks.findIndex(block => block.type === 'end');
            let insertIndex = endBlockIndex !== -1 ? endBlockIndex : newBlocks.length;

            // Create new blocks array to hold all new blocks
            const blocksToAdd = [];
            let currentBlockId = Math.max(...blocks.map(b => b.id), 0) + 1;

            // Add media block if selected and it has the required properties
            if (selectedMedia && selectedMedia.name && selectedMedia.id) {
                console.log('➕ Adding new media block:', selectedMedia.name);

                const mediaBlock = {
                    id: currentBlockId++,
                    type: 'media',
                    mediaName: selectedMedia.name,
                    mediaId: selectedMedia.id,
                    mediaUrl: selectedMedia.url,
                    effect: null,
                    duration: 0
                };

                // Apply same URL resolution as original MEDIA blocks
                try {
                    const { getEmberPhotos } = await import('@/lib/photos');
                    const { getEmberSupportingMedia } = await import('@/lib/database');

                    const [emberPhotos, supportingMedia] = await Promise.all([
                        getEmberPhotos(id),
                        getEmberSupportingMedia(id)
                    ]);

                    const photoMatch = emberPhotos.find(photo => photo.id === mediaBlock.mediaId);
                    const mediaMatch = supportingMedia.find(media => media.id === mediaBlock.mediaId);

                    if (photoMatch) {
                        mediaBlock.mediaName = photoMatch.display_name || photoMatch.original_filename;
                        mediaBlock.mediaUrl = photoMatch.storage_url;
                        console.log('📸 Resolved added photo:', mediaBlock.mediaName, ':', mediaBlock.mediaUrl);
                    } else if (mediaMatch) {
                        mediaBlock.mediaName = mediaMatch.display_name || mediaMatch.file_name;
                        mediaBlock.mediaUrl = mediaMatch.file_url;
                        console.log('📸 Resolved added supporting media:', mediaBlock.mediaName, ':', mediaBlock.mediaUrl);
                    } else {
                        console.log('⚠️ No media found with ID for added block:', mediaBlock.mediaId);
                    }
                } catch (error) {
                    console.error('❌ Failed to resolve media for added block', mediaBlock.mediaId, ':', error);
                }

                blocksToAdd.push(mediaBlock);
            }

            // Add Ember AI voice block
            if (blockType === 'ember' && emberContent) {
                console.log('➕ Adding new Ember AI block:', emberContent.substring(0, 50));

                const emberBlock = {
                    id: currentBlockId++,
                    type: 'voice',
                    voiceTag: 'EMBER VOICE',
                    content: emberContent,
                    voiceType: 'ember',
                    avatarUrl: '/EMBERFAV.svg', // Default ember avatar
                    messageType: 'Ember AI',
                    preference: currentEmberVoiceId || 'text',
                    messageId: null, // AI-generated content has no original message
                    hasVoiceModel: true // AI voices are always available
                };

                blocksToAdd.push(emberBlock);
            }

            // Add Narrator voice block
            if (blockType === 'narrator' && narratorContent) {
                console.log('➕ Adding new Narrator block:', narratorContent.substring(0, 50));

                const narratorBlock = {
                    id: currentBlockId++,
                    type: 'voice',
                    voiceTag: 'NARRATOR',
                    content: narratorContent,
                    voiceType: 'narrator',
                    avatarUrl: '/EMBERFAV.svg', // Default narrator avatar
                    messageType: 'Narrator',
                    preference: currentNarratorVoiceId || 'text',
                    messageId: null, // AI-generated content has no original message
                    hasVoiceModel: true // AI voices are always available
                };

                blocksToAdd.push(narratorBlock);
            }

            // Add voice blocks from contributions
            for (const contribution of selectedContributions) {
                console.log('➕ Adding new voice block:', contribution.user_first_name, contribution.content.substring(0, 50));

                // Check for voice model BEFORE creating block
                let hasVoiceModel = false;
                if (contribution.user_id) {
                    try {
                        const userVoiceModel = await getUserVoiceModel(contribution.user_id);
                        hasVoiceModel = !!(userVoiceModel && userVoiceModel.elevenlabs_voice_id);
                        console.log(`🎤 Voice model check for ${contribution.user_first_name}: ${hasVoiceModel ? 'available' : 'not available'}`);
                    } catch (error) {
                        console.warn(`Failed to check voice model for ${contribution.user_first_name}:`, error);
                    }
                }

                // Get contributor data using simple lookup (consistent with AI blocks)
                const contributorData = getSimpleContributorData(contribution.user_first_name, contribution.user_id, storyMessages);

                const voiceBlock = {
                    id: currentBlockId++,
                    type: 'voice',
                    voiceTag: contribution.user_first_name,
                    content: contribution.content,
                    voiceType: 'contributor',
                    avatarUrl: contributorData.avatarUrl,
                    contributorData: contributorData, // Store full contributor data for avatar fallbacks
                    messageType: contribution.has_audio ? 'Audio Message' : 'Text Response',
                    preference: contribution.has_audio ? 'recorded' : 'text',
                    messageId: contribution.id || contribution.message_id || null,
                    hasVoiceModel: hasVoiceModel // Store voice model availability
                };

                blocksToAdd.push(voiceBlock);
            }

            // Add demo contribution voice blocks
            for (const demoContribution of selectedDemoContributions) {
                console.log('➕ Adding new demo block:', demoContribution.first_name, demoContribution.last_name);

                const displayName = demoContribution.last_name
                    ? `${demoContribution.first_name} ${demoContribution.last_name}`
                    : demoContribution.first_name;

                const demoBlock = {
                    id: currentBlockId++,
                    type: 'voice',
                    voiceTag: displayName,
                    content: demoContribution.content,
                    voiceType: 'demo',
                    avatarUrl: null, // Demo users use initials
                    demoData: {
                        firstName: demoContribution.first_name,
                        lastName: demoContribution.last_name,
                        recordedAudioUrl: demoContribution.audio_url,
                        elevenlabsVoiceId: demoContribution.elevenlabs_voice_id,
                        elevenlabsVoiceName: demoContribution.elevenlabs_voice_name
                    },
                    messageType: demoContribution.has_audio ? 'Audio Message' : 'Text Response',
                    preference: demoContribution.has_audio ? 'recorded' :
                        (demoContribution.elevenlabs_voice_id ? demoContribution.elevenlabs_voice_id : 'text'),
                    messageId: null, // Demo contributions don't have original messages
                    hasVoiceModel: !!(demoContribution.has_audio || demoContribution.elevenlabs_voice_id),
                    demo_contribution_id: demoContribution.id // Reference to demo table
                };

                blocksToAdd.push(demoBlock);
            }

            // Insert all new blocks at once
            newBlocks.splice(insertIndex, 0, ...blocksToAdd);

            setBlocks(newBlocks);
            console.log(`✅ Added ${blocksToAdd.length} new block(s) successfully`);

            // Initialize effects state for all new blocks
            const newEffectDirections = {};
            const newEffectDurations = {};
            const newEffectDistances = {};
            const newEffectStartPositions = {};
            const newEffectEndPositions = {};
            const newEffectScales = {};
            const newEffectStartScales = {};
            const newEffectEndScales = {};
            const newSelectedEffects = {};

            blocksToAdd.forEach(block => {
                if (block.type === 'media') {
                    // Initialize media block effects
                    newEffectDirections[`fade-${block.id}`] = 'in';
                    newEffectDirections[`pan-${block.id}`] = 'left';
                    // No longer need direction for zoom - using start/end scales

                    newEffectDurations[`fade-${block.id}`] = 3.0;
                    newEffectDurations[`pan-${block.id}`] = 4.0;
                    newEffectDurations[`zoom-${block.id}`] = 3.5;

                    newEffectDistances[`pan-${block.id}`] = 25;
                    newEffectStartPositions[`pan-${block.id}`] = -25; // Start left  
                    newEffectEndPositions[`pan-${block.id}`] = 25; // End right
                    newEffectScales[`zoom-${block.id}`] = 1.5; // Legacy compatibility
                    newEffectStartScales[`zoom-${block.id}`] = 0; // Start at normal (slider 0)
                    newEffectEndScales[`zoom-${block.id}`] = 2.5; // Default zoom in (slider +2.5 = 1.5x)

                    newSelectedEffects[`effect-${block.id}`] = [];
                }
                // Voice blocks don't need effects initialization
            });

            setEffectDirections(prev => ({ ...prev, ...newEffectDirections }));
            setEffectDurations(prev => ({ ...prev, ...newEffectDurations }));
            setEffectDistances(prev => ({ ...prev, ...newEffectDistances }));
            setEffectStartPositions(prev => ({ ...prev, ...newEffectStartPositions }));
            setEffectEndPositions(prev => ({ ...prev, ...newEffectEndPositions }));
            setEffectScales(prev => ({ ...prev, ...newEffectScales }));
            setEffectStartScales(prev => ({ ...prev, ...newEffectStartScales }));
            setEffectEndScales(prev => ({ ...prev, ...newEffectEndScales }));
            setSelectedEffects(prev => ({ ...prev, ...newSelectedEffects }));

            console.log('✅ Effects state initialized for new blocks');

            // Note: Added blocks now only affect UI state - JSON blocks are canonical

        } catch (error) {
            console.error('❌ Failed to add media block:', error);
        }
    };



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





    // Group blocks by type for display
    const mediaBlocks = blocks.filter(block => block.type === 'media');
    const voiceBlocks = blocks.filter(block => block.type === 'voice');

    return (
        <div className="min-h-screen bg-white">
            {/* Header - matches EmberDetail style */}
            <div className="bg-white sticky top-0 z-10">
                <div className="max-w-4xl mx-auto px-4 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            {/* Back Arrow */}
                            <button
                                onClick={() => {
                                    const url = `/embers/${id}/manage?view=story-cuts`;
                                    console.log('🔙 StoryCut Studio: Navigating to:', url);
                                    console.log('🔙 StoryCut Studio: Ember ID:', id);
                                    navigate(url);
                                }}
                                className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
                                title="Back to Story Cuts"
                            >
                                <ArrowLeft className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="text-center">
                            {hasUnsavedChanges && (
                                <p className="text-sm text-amber-600 font-medium">• Unsaved changes</p>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content - JSON Block Editor */}
            <div className="max-w-4xl mx-auto px-4 pb-6">
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
                                    <button
                                        onClick={() => setShowAddBlockModal(true)}
                                        className="text-sm text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
                                    >
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
                                onClick={() => navigate(`/embers/${id}/manage?view=story-cuts`)}
                                className="text-red-600 hover:text-red-800 text-sm mt-2 underline"
                            >
                                ← Go back to story cuts
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
                                    } else if (block.voiceType === 'demo') {
                                        bgColor = 'bg-red-50';
                                        borderColor = 'border-red-200';
                                        textColor = 'text-red-600';
                                        ringColor = 'ring-red-500';
                                        hoverColor = 'hover:bg-red-100';
                                    } else {
                                        // Default fallback for voice blocks with unknown voiceType
                                        bgColor = 'bg-gray-50';
                                        borderColor = 'border-gray-200';
                                        textColor = 'text-gray-600';
                                        ringColor = 'ring-gray-500';
                                        hoverColor = 'hover:bg-gray-100';
                                    }
                                } else if (block.type === 'loadscreen') {
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
                                } else {
                                    // Ultimate fallback for completely unknown block types
                                    bgColor = 'bg-gray-50';
                                    borderColor = 'border-gray-200';
                                    textColor = 'text-gray-600';
                                    ringColor = 'ring-gray-500';
                                    hoverColor = 'hover:bg-gray-100';
                                }

                                return (
                                    <div
                                        key={block.id}
                                        className={`p-4 ${bgColor} rounded-xl border ${borderColor} cursor-pointer transition-all duration-200 shadow-sm hover:shadow-md ${selectedBlock?.id === block.id ? `ring-2 ${ringColor} shadow-lg scale-[1.02]` : hoverColor} relative group`}
                                        onClick={() => setSelectedBlock(block)}
                                    >
                                        {block.type === 'media' && (
                                            <>
                                                <div className="flex items-center justify-between mb-2">
                                                    <div className="flex items-center gap-3">
                                                        {/* Reorder Controls */}
                                                        <div className="flex flex-col gap-1.5 opacity-100 transition-opacity duration-200">
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    moveBlockUp(index);
                                                                }}
                                                                disabled={index === 0 || block.type === 'start' || block.type === 'end'}
                                                                className={`p-1 rounded-full transition-colors duration-200 ${(index === 0 || block.type === 'start' || block.type === 'end')
                                                                    ? getArrowButtonColors(block).disabled
                                                                    : getArrowButtonColors(block).active
                                                                    }`}
                                                                title="Move up"
                                                            >
                                                                <ArrowUp className="w-4 h-4" />
                                                            </button>
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    moveBlockDown(index);
                                                                }}
                                                                disabled={index === blocks.length - 1 || block.type === 'start' || block.type === 'end'}
                                                                className={`p-1 rounded-full transition-colors duration-200 ${(index === blocks.length - 1 || block.type === 'start' || block.type === 'end')
                                                                    ? getArrowButtonColors(block).disabled
                                                                    : getArrowButtonColors(block).active
                                                                    }`}
                                                                title="Move down"
                                                            >
                                                                <ArrowDown className="w-4 h-4" />
                                                            </button>
                                                        </div>

                                                        {/* Media Effect Preview Thumbnail */}
                                                        {block.mediaUrl && (
                                                            <div className="flex-shrink-0">
                                                                <MediaEffectPreview
                                                                    block={block}
                                                                    selectedEffects={selectedEffects}
                                                                    effectStartPositions={effectStartPositions}
                                                                    effectEndPositions={effectEndPositions}
                                                                    effectStartScales={effectStartScales}
                                                                    effectEndScales={effectEndScales}
                                                                    effectDurations={effectDurations}
                                                                    effectDirections={effectDirections}
                                                                />
                                                            </div>
                                                        )}

                                                        {/* Media Title - Hidden when effects are active */}
                                                        {!hasActiveEffects(block) && (
                                                            <div className="flex items-center gap-2">
                                                                <div className="flex flex-col">
                                                                    <span
                                                                        className={`font-bold text-base text-left sm:text-center ${textColor}`}
                                                                        title={block.mediaName || ''}
                                                                    >
                                                                        {block.mediaName && block.mediaName.length > 20 ? `${block.mediaName.substring(0, 20)}...` : block.mediaName}
                                                                    </span>
                                                                </div>
                                                                {block.effect && (
                                                                    <span className={`text-xs ${bgColor.replace('50', '100')} ${textColor.replace('600', '800')} px-2 py-1 rounded`}>
                                                                        {block.effect} {block.duration > 0 ? `${block.duration} sec` : ''}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                    {/* Control Buttons - Hidden when effects are active */}
                                                    {!hasActiveEffects(block) && (
                                                        <div className="flex items-center gap-2">
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleDeleteBlock(block.id, block.type);
                                                                }}
                                                                className="p-1 bg-blue-100 hover:bg-blue-200 text-blue-600 rounded-full transition-colors duration-200"
                                                                title="Delete media block"
                                                            >
                                                                <X className="w-3 h-3" />
                                                            </button>
                                                            <div className="flex flex-col items-center gap-1">
                                                                <span className="text-xs bg-blue-100 text-blue-800 px-3 py-1.5 rounded-full font-medium shadow-sm">
                                                                    Media
                                                                </span>
                                                                <span className="text-xs text-gray-500 font-medium">
                                                                    {formatBlockDuration(block)}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Visual Effect Radio Buttons */}
                                                <div className="mt-3" style={{ marginLeft: '24px' }}>
                                                    <div className="flex items-center gap-4">
                                                        <label className="flex items-center gap-2 cursor-pointer">
                                                            <input
                                                                type="checkbox"
                                                                value="fade"
                                                                checked={selectedEffects[`effect-${block.id}`]?.includes('fade') || false}
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
                                                                checked={selectedEffects[`effect-${block.id}`]?.includes('pan') || false}
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
                                                                checked={selectedEffects[`effect-${block.id}`]?.includes('zoom') || false}
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
                                                                        max="30"
                                                                        step="0.5"
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
                                                                        max="30"
                                                                        step="0.5"
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
                                                            </div>
                                                        )}
                                                        {selectedEffects[`effect-${block.id}`].includes('pan') && (
                                                            <div className="flex items-center gap-4">
                                                                <div className="flex-1 space-y-2">
                                                                    <div className="flex items-center justify-between">
                                                                        <span className="text-sm text-blue-700">Pan Start Position</span>
                                                                        <span className="text-sm text-blue-700">{(effectStartPositions[`pan-${block.id}`] || -25).toFixed(1)}</span>
                                                                    </div>
                                                                    <input
                                                                        type="range"
                                                                        min="-50"
                                                                        max="50"
                                                                        step="1"
                                                                        value={effectStartPositions[`pan-${block.id}`] || -25}
                                                                        onChange={(e) => {
                                                                            setEffectStartPositions(prev => ({
                                                                                ...prev,
                                                                                [`pan-${block.id}`]: parseInt(e.target.value)
                                                                            }));
                                                                        }}
                                                                        className="w-full h-2 bg-blue-200 rounded-lg appearance-none cursor-pointer"
                                                                    />
                                                                </div>
                                                            </div>
                                                        )}
                                                        {selectedEffects[`effect-${block.id}`].includes('pan') && (
                                                            <div className="flex items-center gap-4">
                                                                <div className="flex-1 space-y-2">
                                                                    <div className="flex items-center justify-between">
                                                                        <span className="text-sm text-blue-700">Pan End Position</span>
                                                                        <span className="text-sm text-blue-700">{(effectEndPositions[`pan-${block.id}`] || 25).toFixed(1)}</span>
                                                                    </div>
                                                                    <input
                                                                        type="range"
                                                                        min="-50"
                                                                        max="50"
                                                                        step="1"
                                                                        value={effectEndPositions[`pan-${block.id}`] || 25}
                                                                        onChange={(e) => {
                                                                            setEffectEndPositions(prev => ({
                                                                                ...prev,
                                                                                [`pan-${block.id}`]: parseInt(e.target.value)
                                                                            }));
                                                                        }}
                                                                        className="w-full h-2 bg-blue-200 rounded-lg appearance-none cursor-pointer"
                                                                    />
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
                                                                        max="30"
                                                                        step="0.5"
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

                                                            </div>
                                                        )}
                                                        {selectedEffects[`effect-${block.id}`].includes('zoom') && (
                                                            <div className="flex items-center gap-4">
                                                                <div className="flex-1 space-y-2">
                                                                    <div className="flex items-center justify-between">
                                                                        <span className="text-sm text-blue-700">Zoom Start Scale</span>
                                                                        <span className="text-sm text-blue-700">{(effectStartScales[`zoom-${block.id}`] || 0).toFixed(1)}</span>
                                                                    </div>
                                                                    <input
                                                                        type="range"
                                                                        min="-5"
                                                                        max="5"
                                                                        step="0.5"
                                                                        value={effectStartScales[`zoom-${block.id}`] || 0}
                                                                        onChange={(e) => {
                                                                            setEffectStartScales(prev => ({
                                                                                ...prev,
                                                                                [`zoom-${block.id}`]: parseFloat(e.target.value)
                                                                            }));
                                                                        }}
                                                                        className="w-full h-2 bg-blue-200 rounded-lg appearance-none cursor-pointer"
                                                                    />
                                                                </div>
                                                            </div>
                                                        )}
                                                        {selectedEffects[`effect-${block.id}`].includes('zoom') && (
                                                            <div className="flex items-center gap-4">
                                                                <div className="flex-1 space-y-2">
                                                                    <div className="flex items-center justify-between">
                                                                        <span className="text-sm text-blue-700">Zoom End Scale</span>
                                                                        <span className="text-sm text-blue-700">{(effectEndScales[`zoom-${block.id}`] || 0).toFixed(1)}</span>
                                                                    </div>
                                                                    <input
                                                                        type="range"
                                                                        min="-5"
                                                                        max="5"
                                                                        step="0.5"
                                                                        value={effectEndScales[`zoom-${block.id}`] || 0}
                                                                        onChange={(e) => {
                                                                            setEffectEndScales(prev => ({
                                                                                ...prev,
                                                                                [`zoom-${block.id}`]: parseFloat(e.target.value)
                                                                            }));
                                                                        }}
                                                                        className="w-full h-2 bg-blue-200 rounded-lg appearance-none cursor-pointer"
                                                                    />
                                                                </div>
                                                            </div>
                                                        )}
                                                        {selectedEffects[`effect-${block.id}`].includes('zoom') && (
                                                            <div className="flex items-center gap-4">
                                                                <div className="flex-1 space-y-2">
                                                                    <div className="flex items-center justify-between">
                                                                        <span className="text-sm text-blue-700">Zoom Target</span>
                                                                    </div>
                                                                    <select
                                                                        value={(() => {
                                                                            const target = effectTargets[`zoom-${block.id}`];
                                                                            if (!target) return 'center';
                                                                            if (target.type === 'person') return `person:${target.personId}`;
                                                                            if (target.type === 'custom') return 'custom';
                                                                            return 'center';
                                                                        })()}
                                                                        onChange={(e) => {
                                                                            const value = e.target.value;
                                                                            if (value === 'center') {
                                                                                setEffectTargets(prev => ({
                                                                                    ...prev,
                                                                                    [`zoom-${block.id}`]: { type: 'center' }
                                                                                }));
                                                                            } else if (value.startsWith('person:')) {
                                                                                const personId = value.replace('person:', '');
                                                                                setEffectTargets(prev => ({
                                                                                    ...prev,
                                                                                    [`zoom-${block.id}`]: { type: 'person', personId }
                                                                                }));
                                                                            } else if (value === 'custom') {
                                                                                // Open modal for custom point selection
                                                                                setSelectedZoomBlock(block);
                                                                                setShowZoomTargetModal(true);
                                                                            }
                                                                        }}
                                                                        className="w-full p-2 border border-gray-300 rounded-lg text-sm text-gray-700 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                                    >
                                                                        <option value="center">Photo Center</option>
                                                                        {taggedPeople.map(person => (
                                                                            <option key={person.id} value={`person:${person.id}`}>
                                                                                {person.person_name}
                                                                            </option>
                                                                        ))}
                                                                        <option value="custom">Select Custom Point...</option>
                                                                    </select>

                                                                    {/* Current Target Display */}
                                                                    <div className="mt-2 text-xs text-gray-600">
                                                                        {(() => {
                                                                            const target = effectTargets[`zoom-${block.id}`];
                                                                            if (!target || target.type === 'center') {
                                                                                return 'Target: Photo Center';
                                                                            } else if (target.type === 'person' && target.personId) {
                                                                                const person = taggedPeople.find(p => p.id === target.personId);
                                                                                return person ? `Target: ${person.person_name}` : 'Target: Unknown Person';
                                                                            } else if (target.type === 'custom' && target.coordinates) {
                                                                                console.log(`🎯 Displaying custom target:`, target.coordinates);
                                                                                return `Target: (${Math.round(target.coordinates.x)}, ${Math.round(target.coordinates.y)}) pixels`;
                                                                            } else if (target.type === 'custom') {
                                                                                console.warn(`🎯 Custom target missing coordinates:`, target);
                                                                                return 'Target: Custom Point (Invalid)';
                                                                            }
                                                                            return 'Target: Photo Center';
                                                                        })()}
                                                                    </div>
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
                                                                {/* Reorder Controls */}
                                                                <div className="flex flex-col gap-1.5 opacity-100 transition-opacity duration-200">
                                                                    <button
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            moveBlockUp(index);
                                                                        }}
                                                                        disabled={index === 0 || block.type === 'start' || block.type === 'end'}
                                                                        className={`p-1 rounded-full transition-colors duration-200 ${(index === 0 || block.type === 'start' || block.type === 'end')
                                                                            ? getArrowButtonColors(block).disabled
                                                                            : getArrowButtonColors(block).active
                                                                            }`}
                                                                        title="Move up"
                                                                    >
                                                                        <ArrowUp className="w-4 h-4" />
                                                                    </button>
                                                                    <button
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            moveBlockDown(index);
                                                                        }}
                                                                        disabled={index === blocks.length - 1 || block.type === 'start' || block.type === 'end'}
                                                                        className={`p-1 rounded-full transition-colors duration-200 ${(index === blocks.length - 1 || block.type === 'start' || block.type === 'end')
                                                                            ? getArrowButtonColors(block).disabled
                                                                            : getArrowButtonColors(block).active
                                                                            }`}
                                                                        title="Move down"
                                                                    >
                                                                        <ArrowDown className="w-4 h-4" />
                                                                    </button>
                                                                </div>
                                                                <div className="flex items-center gap-2">
                                                                    {/* Avatar for all voice types */}
                                                                    <Avatar className="h-10 w-10 shadow-sm">
                                                                        {block.voiceType === 'contributor' && block.contributorData ? (
                                                                            <>
                                                                                <AvatarImage
                                                                                    src={block.contributorData.avatarUrl}
                                                                                    alt={(() => {
                                                                                        const storyMessage = storyMessages.find(msg =>
                                                                                            msg.user_id === block.messageId ||
                                                                                            msg.user_first_name?.toLowerCase() === block.voiceTag?.toLowerCase()
                                                                                        );
                                                                                        return getContributorDisplayName(block.contributorData, storyMessage, block.voiceTag);
                                                                                    })()}
                                                                                />
                                                                                <AvatarFallback className="text-sm font-medium bg-green-100 text-green-800">
                                                                                    {block.contributorData.fallbackText}
                                                                                </AvatarFallback>
                                                                            </>
                                                                        ) : (
                                                                            <>
                                                                                {/* Ember and Narrator use favicon */}
                                                                                <AvatarImage
                                                                                    src="/EMBERFAV.svg"
                                                                                    alt={formatVoiceTag(block)}
                                                                                />
                                                                                <AvatarFallback className={`text-sm font-medium ${block.voiceType === 'ember'
                                                                                    ? 'bg-purple-100 text-purple-800'
                                                                                    : block.voiceType === 'narrator'
                                                                                        ? 'bg-yellow-100 text-yellow-800'
                                                                                        : block.voiceType === 'demo'
                                                                                            ? 'bg-red-100 text-red-800'
                                                                                            : 'bg-gray-100 text-gray-800'
                                                                                    }`}>
                                                                                    {getShortVoiceTag(block)}
                                                                                </AvatarFallback>
                                                                            </>
                                                                        )}
                                                                    </Avatar>
                                                                    <div className="flex flex-col">
                                                                        <span className={`font-bold text-base text-left ${textColor}`}>
                                                                            {(() => {
                                                                                // Use formatVoiceTagJSX for ember/narrator, getContributorDisplayName for contributors
                                                                                if (block.voiceType === 'ember' || block.voiceType === 'narrator') {
                                                                                    return formatVoiceTagJSX(block);
                                                                                } else if (block.voiceType === 'demo') {
                                                                                    // Demo blocks use the voiceTag directly (already formatted)
                                                                                    return block.voiceTag;
                                                                                } else {
                                                                                    // Find corresponding story message for full name (contributors)
                                                                                    const storyMessage = storyMessages.find(msg =>
                                                                                        msg.user_id === block.messageId ||
                                                                                        msg.user_first_name?.toLowerCase() === block.voiceTag?.toLowerCase()
                                                                                    );
                                                                                    return getContributorDisplayName(block.contributorData, storyMessage, block.voiceTag);
                                                                                }
                                                                            })()}
                                                                        </span>
                                                                        {!block.messageType && (
                                                                            <span className="text-xs text-gray-500 font-medium text-left">
                                                                                {formatBlockDuration(block)}
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                {isBlockEditable(block, index) && (
                                                                    <button
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            handleEditVoiceContent(block, index);
                                                                        }}
                                                                        className={`p-1 rounded-full transition-colors duration-200 ${block.voiceType === 'contributor'
                                                                            ? 'bg-green-100 hover:bg-green-200 text-green-600'
                                                                            : block.voiceType === 'narrator'
                                                                                ? 'bg-yellow-100 hover:bg-yellow-200 text-yellow-600'
                                                                                : block.voiceType === 'demo'
                                                                                    ? 'bg-red-100 hover:bg-red-200 text-red-600'
                                                                                    : 'bg-purple-100 hover:bg-purple-200 text-purple-600'
                                                                            }`}
                                                                        title="Edit content"
                                                                    >
                                                                        <Edit className="w-3 h-3" />
                                                                    </button>
                                                                )}
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        handleDeleteBlock(block.id, block.type);
                                                                    }}
                                                                    className={`p-1 rounded-full transition-colors duration-200 ${block.voiceType === 'contributor'
                                                                        ? 'bg-green-100 hover:bg-green-200 text-green-600'
                                                                        : block.voiceType === 'narrator'
                                                                            ? 'bg-yellow-100 hover:bg-yellow-200 text-yellow-600'
                                                                            : block.voiceType === 'demo'
                                                                                ? 'bg-red-100 hover:bg-red-200 text-red-600'
                                                                                : 'bg-purple-100 hover:bg-purple-200 text-purple-600'
                                                                        }`}
                                                                    title="Delete voice block"
                                                                >
                                                                    <X className="w-3 h-3" />
                                                                </button>
                                                                {block.messageType && (
                                                                    <div className="flex flex-col items-center gap-1">
                                                                        <span className={`text-xs px-2 py-1 rounded-full ${block.voiceType === 'contributor'
                                                                            ? 'bg-green-100 text-green-800'
                                                                            : block.voiceType === 'narrator'
                                                                                ? 'bg-yellow-100 text-yellow-800'
                                                                                : block.voiceType === 'demo'
                                                                                    ? 'bg-red-100 text-red-800'
                                                                                    : 'bg-purple-100 text-purple-800'
                                                                            }`}>
                                                                            {block.messageType}
                                                                        </span>
                                                                        <span className="text-xs text-gray-500 font-medium">
                                                                            {formatBlockDuration(block)}
                                                                        </span>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <div className="ml-6 mt-3 p-3 bg-white/50 rounded-lg">
                                                            <p className={`${textColor.replace('600', '700')} text-lg leading-relaxed italic`}>"{block.content}"</p>
                                                        </div>
                                                    </>
                                                ) : (
                                                    <>
                                                        <div className="flex items-center gap-2 mb-2">
                                                            {/* Reorder Controls */}
                                                            <div className="flex flex-col gap-1.5 opacity-100 transition-opacity duration-200">
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        moveBlockUp(index);
                                                                    }}
                                                                    disabled={index === 0 || block.type === 'start' || block.type === 'end'}
                                                                    className={`p-1 rounded-full transition-colors duration-200 ${(index === 0 || block.type === 'start' || block.type === 'end')
                                                                        ? getArrowButtonColors(block).disabled
                                                                        : getArrowButtonColors(block).active
                                                                        }`}
                                                                    title="Move up"
                                                                >
                                                                    <ArrowUp className="w-4 h-4" />
                                                                </button>
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        moveBlockDown(index);
                                                                    }}
                                                                    disabled={index === blocks.length - 1 || block.type === 'start' || block.type === 'end'}
                                                                    className={`p-1 rounded-full transition-colors duration-200 ${(index === blocks.length - 1 || block.type === 'start' || block.type === 'end')
                                                                        ? getArrowButtonColors(block).disabled
                                                                        : getArrowButtonColors(block).active
                                                                        }`}
                                                                    title="Move down"
                                                                >
                                                                    <ArrowDown className="w-4 h-4" />
                                                                </button>
                                                            </div>
                                                            {/* Avatar for all voice types (fallback section) */}
                                                            <Avatar className="h-10 w-10 shadow-sm">
                                                                <AvatarImage
                                                                    src="/EMBERFAV.svg"
                                                                    alt={formatVoiceTag(block)}
                                                                />
                                                                <AvatarFallback className={`text-sm font-medium ${block.voiceType === 'ember'
                                                                    ? 'bg-purple-100 text-purple-800'
                                                                    : block.voiceType === 'narrator'
                                                                        ? 'bg-yellow-100 text-yellow-800'
                                                                        : block.voiceType === 'demo'
                                                                            ? 'bg-red-100 text-red-800'
                                                                            : 'bg-gray-100 text-gray-800'
                                                                    }`}>
                                                                    {getShortVoiceTag(block)}
                                                                </AvatarFallback>
                                                            </Avatar>
                                                            <div className="flex flex-col">
                                                                <span className={`font-bold text-base text-left ${textColor}`}>
                                                                    {(() => {
                                                                        // Use formatVoiceTagJSX for ember/narrator, getContributorDisplayName for contributors
                                                                        if (block.voiceType === 'ember' || block.voiceType === 'narrator') {
                                                                            return formatVoiceTagJSX(block);
                                                                        } else if (block.voiceType === 'demo') {
                                                                            // Demo blocks use the voiceTag directly (already formatted)
                                                                            return block.voiceTag;
                                                                        } else {
                                                                            // Find corresponding story message for full name (contributors)
                                                                            const storyMessage = storyMessages.find(msg =>
                                                                                msg.user_id === block.messageId ||
                                                                                msg.user_first_name?.toLowerCase() === block.voiceTag?.toLowerCase()
                                                                            );
                                                                            return getContributorDisplayName(block.contributorData, storyMessage, block.voiceTag);
                                                                        }
                                                                    })()}
                                                                </span>
                                                                <span className="text-xs text-gray-500 font-medium text-left">
                                                                    {formatBlockDuration(block)}
                                                                </span>
                                                            </div>
                                                            {isBlockEditable(block, index) && (
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        handleEditVoiceContent(block, index);
                                                                    }}
                                                                    className={`text-xs px-2 py-1 rounded-full transition-colors ${block.voiceType === 'contributor'
                                                                        ? 'bg-green-100 hover:bg-green-200 text-green-700'
                                                                        : block.voiceType === 'narrator'
                                                                            ? 'bg-yellow-100 hover:bg-yellow-200 text-yellow-700'
                                                                            : block.voiceType === 'demo'
                                                                                ? 'bg-red-100 hover:bg-red-200 text-red-700'
                                                                                : 'bg-purple-100 hover:bg-purple-200 text-purple-700'
                                                                        }`}
                                                                    title="Edit content"
                                                                >
                                                                    <Edit className="w-3 h-3" />
                                                                </button>
                                                            )}
                                                        </div>
                                                        <div className="ml-6 mt-3 p-3 bg-white/50 rounded-lg">
                                                            <p className={`${textColor.replace('600', '700')} text-lg leading-relaxed italic`}>"{block.content}"</p>
                                                        </div>
                                                    </>
                                                )}

                                                {block.voiceType === 'contributor' && (() => {
                                                    const blockKey = `${block.voiceTag}-${block.id}`;
                                                    return (
                                                        <div className="mt-3" style={{ marginLeft: '24px' }}>
                                                            <div className="flex items-center gap-4">
                                                                {/* Show "Audio" option only if contributor left an audio message */}
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
                                                                        <span className="text-sm text-green-700">Audio</span>
                                                                    </label>
                                                                )}
                                                                {/* Show Synth option only if contributor has a trained voice */}
                                                                {block.hasVoiceModel && (
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
                                                                )}
                                                                {/* Always show Text option - will use narrator voice */}
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
                                                                                console.log(`📝 Set ${blockKey} to use narrator voice with quoted format (DATABASE PERSISTENT)`);
                                                                            }
                                                                        }}
                                                                        className="w-4 h-4 text-green-600 border-gray-300 focus:ring-green-500"
                                                                    />
                                                                    <span className="text-sm text-green-700">Text</span>
                                                                </label>
                                                            </div>
                                                        </div>
                                                    );
                                                })()}
                                            </>
                                        )}

                                        {block.voiceType === 'demo' && (() => {
                                            const blockKey = `${block.voiceTag}-${block.id}`;
                                            return (
                                                <div className="mt-3" style={{ marginLeft: '24px' }}>
                                                    <div className="flex items-center gap-4">
                                                        {/* Show "Audio" option only if demo has recorded audio */}
                                                        {block.demoData?.recordedAudioUrl && (
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
                                                                            console.log(`🎙️ Set demo ${blockKey} to use recorded audio`);
                                                                        }
                                                                    }}
                                                                    className="w-4 h-4 text-red-600 border-gray-300 focus:ring-red-500"
                                                                />
                                                                <span className="text-sm text-red-700">Audio</span>
                                                            </label>
                                                        )}
                                                        {/* Show Synth option if demo has ElevenLabs voice */}
                                                        {block.demoData?.elevenlabsVoiceId && (
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
                                                                            console.log(`🎤 Set demo ${blockKey} to use ElevenLabs voice`);
                                                                        }
                                                                    }}
                                                                    className="w-4 h-4 text-red-600 border-gray-300 focus:ring-red-500"
                                                                />
                                                                <span className="text-sm text-red-700">Synth</span>
                                                            </label>
                                                        )}
                                                        {/* Always show Text option */}
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
                                                                        console.log(`📝 Set demo ${blockKey} to use text-only display`);
                                                                    }
                                                                }}
                                                                className="w-4 h-4 text-red-600 border-gray-300 focus:ring-red-500"
                                                            />
                                                            <span className="text-sm text-red-700">Text</span>
                                                        </label>
                                                    </div>
                                                </div>
                                            );
                                        })()}

                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* Action Bar - Save/Cancel */}
                    {!loading && !error && (
                        <div className="sticky bottom-0 bg-white md:px-4 py-4 mt-6">
                            <div className="max-w-4xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                                {saveError && (
                                    <div className="flex items-center gap-3">
                                        <div className="text-red-600 text-sm">
                                            Error: {saveError}
                                        </div>
                                    </div>
                                )}

                                <div className="flex items-center gap-3 w-full md:w-auto">
                                    <button
                                        onClick={handleCancelChanges}
                                        className="flex-1 md:flex-none px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors font-medium"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={() => {
                                            // Navigate to EmberPlay with this specific story cut
                                            navigate(`/embers/${id}?cut=${storyCut.id}`);
                                        }}
                                        className="flex-1 md:flex-none px-4 py-2 text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors font-medium"
                                    >
                                        Preview
                                    </button>
                                    <button
                                        onClick={handleUpdateStoryCut}
                                        disabled={!hasUnsavedChanges || isSaving}
                                        className="flex-1 md:flex-none px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium disabled:bg-blue-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                    >
                                        {isSaving ? (
                                            <>
                                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                                Saving...
                                            </>
                                        ) : (
                                            'Update'
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                </div>
            </div>

            {/* Fullscreen EmberPlay Preview */}
            {showFullscreenPlay && (
                <>
                    <div className="fixed inset-0 bg-black z-50 flex items-center justify-center">
                        <div className="w-full h-full max-w-md mx-auto relative">
                            {/* Exit Button */}
                            <button
                                onClick={handleExitPlay}
                                className="absolute top-4 right-4 z-10 p-2 bg-white/20 hover:bg-white/30 rounded-full transition-colors backdrop-blur-sm"
                                aria-label="Exit fullscreen"
                            >
                                <X size={24} className="text-white" />
                            </button>

                            {/* Main Content Card */}
                            <Card className="w-full h-full bg-white shadow-2xl overflow-hidden">
                                <CardContent className="p-0 h-full flex flex-col">
                                    {/* Story Content */}
                                    <div className="flex-1 flex flex-col">
                                        {/* Top Section - Photo - 70% height to match EmberDetail */}
                                        <div className="h-[70vh] bg-gray-100 relative overflow-hidden">
                                            {/* Media Display */}
                                            {currentMediaImageUrl && (
                                                <div
                                                    className="w-full h-full bg-cover bg-center transition-all duration-1000 ease-out"
                                                    style={{
                                                        backgroundImage: `url(${currentMediaImageUrl})`,
                                                        backgroundColor: currentMediaColor || '#000000',
                                                        transform: `scale(${typeof currentZoomScale === 'object' ? currentZoomScale.end : currentZoomScale})`,
                                                        opacity: currentVoiceTransparency
                                                    }}
                                                />
                                            )}

                                            {/* Loading State */}
                                            {(currentLoadingState || isGeneratingAudio) && (
                                                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                                                    <div className="text-center text-white">
                                                        <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                                                        <p className="text-lg font-medium">
                                                            {currentLoadingMessage || 'Generating Audio...'}
                                                        </p>
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {/* Bottom Section - Black - 30% height to match EmberDetail */}
                                        <div className="h-[30vh] bg-black relative">


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
                </>
            )}

            {/* Add Block Modal */}
            <AddBlockModal
                isOpen={showAddBlockModal}
                onClose={() => setShowAddBlockModal(false)}
                emberId={id}
                onAddBlock={handleAddMediaBlock}
                storyMessages={storyMessages}
                currentEmberVoiceId={currentEmberVoiceId}
                currentNarratorVoiceId={currentNarratorVoiceId}
            />

            {/* Zoom Target Modal */}
            <ZoomTargetModal
                isOpen={showZoomTargetModal}
                onClose={handleCloseZoomTargetModal}
                mediaUrl={selectedZoomBlock?.mediaUrl}
                onSave={handleSaveZoomTarget}
                currentTarget={selectedZoomBlock ? effectTargets[`zoom-${selectedZoomBlock.id}`]?.coordinates : null}
            />

            {/* Edit Voice Content Modal */}
            {showEditModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-200">
                            <h2 className="text-xl font-semibold text-gray-900">
                                Edit {editingBlock?.voiceType === 'ember' ? 'Ember AI' :
                                    editingBlock?.voiceType === 'narrator' ? 'Narrator' :
                                        'Contribution'} Content
                            </h2>
                            <p className="text-sm text-gray-500 mt-1">
                                Speaker: {formatVoiceTag(editingBlock)}
                            </p>
                            {editingBlock?.voiceType === 'contributor' && (
                                <p className="text-xs text-amber-600 mt-1 font-medium">
                                    ⚠️ Note: This will only change the text content, not the original audio recording
                                </p>
                            )}
                        </div>

                        <div className="px-6 py-4">
                            {/* Voice Selection for AI voices only (not contributors) */}
                            {(editingBlock?.voiceType === 'ember' || editingBlock?.voiceType === 'narrator') && (
                                <div className="mb-4">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        {editingBlock?.voiceType === 'ember' ? 'Ember AI Voice' : 'Narrator Voice'}
                                    </label>
                                    <select
                                        value={editingBlock?.voiceType === 'ember' ? currentEmberVoiceId : currentNarratorVoiceId}
                                        onChange={(e) => handleVoiceChange(editingBlock?.voiceType, e.target.value)}
                                        disabled={voicesLoading}
                                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                                    >
                                        {voicesLoading ? (
                                            <option>Loading voices...</option>
                                        ) : (
                                            <>
                                                <option value="">Select voice...</option>
                                                {availableVoices.map((voice) => (
                                                    <option key={voice.voice_id} value={voice.voice_id}>
                                                        {voice.name} {voice.labels?.gender ? `(${voice.labels.gender})` : ''}
                                                    </option>
                                                ))}
                                            </>
                                        )}
                                    </select>
                                    <p className="text-xs text-gray-500 mt-1">
                                        This will change the voice for ALL {editingBlock?.voiceType === 'ember' ? 'Ember AI' : 'Narrator'} blocks in this story cut
                                    </p>
                                </div>
                            )}

                            {/* Contributor Voice Info (read-only) */}
                            {editingBlock?.voiceType === 'contributor' && (
                                <div className="mb-4 p-3 bg-green-50 rounded-lg border border-green-200">
                                    <div className="flex items-center gap-2 mb-2">
                                        <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center">
                                            <span className="text-green-600 text-sm">👤</span>
                                        </div>
                                        <span className="font-medium text-green-700">Contributor Voice</span>
                                    </div>
                                    <p className="text-sm text-green-600">
                                        Voice: {editingBlock?.messageType === 'Audio Message' ? 'Original Recording' : 'AI Voice Clone'}
                                    </p>
                                    <p className="text-xs text-green-500 mt-1">
                                        Voice settings cannot be changed for contributions - only text content can be edited for story refinement
                                    </p>
                                </div>
                            )}

                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Voice Content
                            </label>
                            <textarea
                                value={editedContent}
                                onChange={(e) => setEditedContent(e.target.value)}
                                placeholder={editingBlock?.voiceType === 'contributor'
                                    ? "Refine the text content for this contribution..."
                                    : "Enter voice content..."}
                                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                                rows={6}
                                autoFocus={editingBlock?.voiceType !== 'contributor'}
                            />
                            <p className="text-xs text-gray-500 mt-2">
                                Original: "{editingBlock?.content}"
                            </p>
                        </div>

                        <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
                            <button
                                onClick={handleCancelEdit}
                                className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSaveEditedContent}
                                disabled={!editedContent.trim()}
                                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:bg-blue-300"
                            >
                                {editingBlock?.voiceType === 'contributor' ? 'Refine Text' : 'Save Changes'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}