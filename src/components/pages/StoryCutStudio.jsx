import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Eye, Code, Plus, Save, X, ArrowLeft, ArrowUp, ArrowDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { FilmSlate, PencilSimple } from 'phosphor-react';
import { getStoryCutById, getPrimaryStoryCut, updateStoryCut, getEmber, getAllStoryMessagesForEmber, getStoryCutsForEmber } from '@/lib/database';
import { getEmberWithSharing } from '@/lib/sharing';
import { getStyleDisplayName } from '@/lib/styleUtils';
import { formatDuration } from '@/lib/dateUtils';
import { resolveMediaReference } from '@/lib/scriptParser';
import { handlePlay as handleMediaPlay, handlePlaybackComplete as handleMediaPlaybackComplete, handleExitPlay as handleMediaExitPlay } from '@/lib/mediaHandlers';
import useStore from '@/store';
import { useUIState } from '@/lib/useUIState';
import AddBlockModal from '@/components/AddBlockModal';

export default function StoryCutStudio() {
    const { id, storyCutId } = useParams(); // id is ember ID, storyCutId is story cut ID
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

    // Contributors data for real user avatars
    const [contributors, setContributors] = useState([]);

    // Contributor audio preferences - store per block
    const [contributorAudioPreferences, setContributorAudioPreferences] = useState({});

    // Script editing state
    const [isEditingScript, setIsEditingScript] = useState(false);
    const [editedScript, setEditedScript] = useState('');
    const [isSavingScript, setIsSavingScript] = useState(false);

    // Add Block modal state
    const [showAddBlockModal, setShowAddBlockModal] = useState(false);



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
        showEndHold, setShowEndHold,
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

    // Load real story cut data
    useEffect(() => {
        const loadStoryCut = async () => {
            if (!id) return;

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

                // Load ember data for the player
                console.log('🌟 Loading ember data for player...');
                const emberData = await getEmber(id);
                setEmber(emberData);

                // Load sharing data for contributor avatars
                console.log('👥 Loading contributor data for avatars...');
                try {
                    const sharingData = await getEmberWithSharing(id);
                    if (sharingData.shares && sharingData.shares.length > 0) {
                        // Extract contributor data with real user profiles
                        const contributorData = sharingData.shares
                            .filter(share => share.shared_user && share.shared_user.user_id)
                            .map(share => ({
                                user_id: share.shared_user.user_id,
                                first_name: share.shared_user.first_name,
                                last_name: share.shared_user.last_name,
                                avatar_url: share.shared_user.avatar_url,
                                email: share.shared_with_email
                            }));
                        setContributors(contributorData);
                        console.log('✅ Loaded contributors:', contributorData);
                    } else {
                        setContributors([]);
                    }
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

                // Helper function to get contributor avatar data
                const getContributorAvatarData = (voiceTag) => {
                    // Find contributor by first name (voice tag is typically the first name)
                    const contributor = contributors.find(c =>
                        c.first_name && c.first_name.toLowerCase() === voiceTag.toLowerCase().trim()
                    );

                    if (contributor) {
                        console.log(`✅ Found contributor data for ${voiceTag}:`, contributor);
                        return {
                            avatarUrl: contributor.avatar_url || null,
                            firstName: contributor.first_name,
                            lastName: contributor.last_name,
                            email: contributor.email,
                            fallbackText: contributor.first_name?.[0] || contributor.last_name?.[0] || contributor.email?.[0]?.toUpperCase() || voiceTag[0]?.toUpperCase() || '?'
                        };
                    }

                    console.log(`⚠️ No contributor found for ${voiceTag}, using defaults`);
                    return {
                        avatarUrl: 'https://i.pravatar.cc/40?img=1', // Fallback to placeholder for unknown contributors
                        firstName: voiceTag,
                        lastName: null,
                        email: null,
                        fallbackText: voiceTag[0]?.toUpperCase() || '?'
                    };
                };

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

                // ✅ NEW: Enhanced function to determine message type with contribution tracking
                const usedContributions = new Set(); // Track which contributions have been used
                const determineMessageTypeWithTracking = (voiceTag, content, voiceType) => {
                    if (voiceType !== 'contributor') {
                        return 'AI Voice';
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

                // Parse voice declarations and override story cut voice names
                let embedVoiceNames = {
                    ember: targetStoryCut.ember_voice_name || 'Unknown Voice',
                    narrator: targetStoryCut.narrator_voice_name || 'Unknown Voice'
                };

                if (targetStoryCut.full_script) {
                    const lines = targetStoryCut.full_script.split('\n');
                    let blockId = 2;

                    // Voice IDs are now handled inline with voice lines

                    for (const line of lines) {
                        const trimmedLine = line.trim();
                        if (!trimmedLine) continue;

                        console.log('🔍 DEBUG - Parsing line:', trimmedLine);

                        // Voice IDs are now handled inline with voice lines

                        // Enhanced MEDIA parsing - Handle multiple format variations
                        let mediaMatch = null;
                        let mediaId = null;
                        let mediaName = null;
                        let content = null;
                        let formatType = null;

                        // 1. Sacred Format (3-part): [MEDIA | name | id] <content>
                        mediaMatch = trimmedLine.match(/^\[MEDIA\s*\|\s*([^|]+?)\s*\|\s*([^\]]+?)\]\s*<(.+)>$/);
                        if (mediaMatch) {
                            mediaName = mediaMatch[1].trim();
                            mediaId = mediaMatch[2].trim();
                            content = mediaMatch[3].trim();
                            formatType = 'sacred_format';
                            console.log('🔍 DEBUG - MEDIA Sacred Format MATCH:', {
                                fullLine: trimmedLine,
                                mediaName,
                                mediaId,
                                content,
                                formatType
                            });
                        }

                        // 2. Legacy format: [MEDIA | id] <content>
                        if (!mediaMatch) {
                            mediaMatch = trimmedLine.match(/^\[MEDIA\s*\|\s*([^\]]+)\]\s*<(.+)>$/);
                            if (mediaMatch) {
                                mediaId = mediaMatch[1].trim();
                                content = mediaMatch[2].trim();
                                formatType = 'legacy_single_bracket';
                                console.log('🔍 DEBUG - MEDIA Legacy Pattern MATCH:', {
                                    fullLine: trimmedLine,
                                    mediaId,
                                    content,
                                    formatType
                                });
                            }
                        }

                        // 2. Old format: [[MEDIA | id]] (content)
                        if (!mediaMatch) {
                            mediaMatch = trimmedLine.match(/^\[\[MEDIA\s*\|\s*([^\]]+)\]\]\s*\((.+)\)$/);
                            if (mediaMatch) {
                                mediaId = mediaMatch[1].trim();
                                content = mediaMatch[2].trim();
                                formatType = 'old_double_bracket';
                                console.log('🔍 DEBUG - MEDIA Pattern 2 MATCH:', {
                                    fullLine: trimmedLine,
                                    mediaId,
                                    content,
                                    formatType
                                });
                            }
                        }

                        // 3. Legacy format: [[MEDIA]] <content>
                        if (!mediaMatch) {
                            mediaMatch = trimmedLine.match(/^\[\[MEDIA\]\]\s*<(.+)>$/);
                            if (mediaMatch) {
                                mediaId = 'legacy';
                                content = mediaMatch[1].trim();
                                formatType = 'legacy_no_id';
                                console.log('🔍 DEBUG - MEDIA Pattern 3 MATCH:', {
                                    fullLine: trimmedLine,
                                    mediaId,
                                    content,
                                    formatType
                                });
                            }
                        }



                        if (mediaMatch) {
                            console.log(`📸 DEBUG - Parsed MEDIA block - Format: ${formatType}, ID: ${mediaId}, Content: ${content}, Name: ${mediaName}`);

                            // For Sacred Format, we already have the mediaName - don't override it
                            if (formatType === 'sacred_format') {
                                // mediaName already extracted from Sacred Format parsing
                                console.log('🔍 Sacred Format: Using extracted mediaName:', mediaName);
                            } else {
                                // Extract media name, ID, or path from content for non-Sacred formats
                                // Check for path format: path="url",fallback="name"
                                const pathMatch = content.match(/path="([^"]+)"(?:,fallback="([^"]+)")?/);
                                // Check for ID format: id="abc123"
                                const idContentMatch = content.match(/id="([^"]+)"/);
                                // Check for name format: name="filename"
                                const nameMatch = content.match(/name="([^"]+)"/);

                                let extractedMediaName = 'Unknown Media';
                                let mediaUrl = null;

                                if (pathMatch) {
                                    mediaUrl = pathMatch[1];
                                    extractedMediaName = pathMatch[2] || mediaId || 'Media';
                                    console.log('🔍 Extracted media path:', mediaUrl, 'fallback:', extractedMediaName);
                                } else if (idContentMatch) {
                                    extractedMediaName = 'Loading...'; // Will be replaced with actual display name
                                    console.log('🔍 Extracted media from ID content:', idContentMatch[1]);
                                } else if (nameMatch) {
                                    extractedMediaName = nameMatch[1];
                                    console.log('🔍 Extracted media name:', extractedMediaName);
                                } else {
                                    // Use the media ID as fallback name
                                    extractedMediaName = mediaId || 'Media';
                                    console.log('🔍 Using media ID as name fallback:', extractedMediaName);
                                }

                                mediaName = extractedMediaName;
                            }

                            // Parse effects from the content
                            const currentBlockId = blockId;
                            const blockKey = `effect-${currentBlockId}`;
                            const currentBlockEffects = [];

                            // Find all effect patterns like <FADE-IN:duration=3.0,PAN-LEFT:duration=4.0>
                            const effectsMatch = content.match(/<([^>]+)>/g);
                            if (effectsMatch) {
                                effectsMatch.forEach(effectMatch => {
                                    const effectContent = effectMatch.slice(1, -1); // Remove < >

                                    // Skip media references (id= or name=)
                                    if (effectContent.startsWith('id=') || effectContent.startsWith('name=')) {
                                        return;
                                    }

                                    // Parse individual effects separated by commas
                                    const effects = effectContent.split(',');
                                    effects.forEach(effect => {
                                        const trimmedEffect = effect.trim();

                                        // Parse FADE effects: FADE-IN:duration=3.0 or FADE-OUT:duration=2.5
                                        const fadeMatch = trimmedEffect.match(/FADE-(IN|OUT):duration=([0-9.]+)/);
                                        if (fadeMatch) {
                                            const [, direction, duration] = fadeMatch;
                                            currentBlockEffects.push('fade');
                                            initialDirections[`fade-${currentBlockId}`] = direction.toLowerCase();
                                            initialDurations[`fade-${currentBlockId}`] = parseFloat(duration);
                                            console.log(`🎬 Parsed FADE effect: ${direction} ${duration}s for block ${currentBlockId}`);
                                        }

                                        // Parse PAN effects: PAN-LEFT:duration=4.0 or PAN-RIGHT:duration=3.5
                                        const panMatch = trimmedEffect.match(/PAN-(LEFT|RIGHT):duration=([0-9.]+)/);
                                        if (panMatch) {
                                            const [, direction, duration] = panMatch;
                                            currentBlockEffects.push('pan');
                                            initialDirections[`pan-${currentBlockId}`] = direction.toLowerCase();
                                            initialDurations[`pan-${currentBlockId}`] = parseFloat(duration);
                                            console.log(`🎬 Parsed PAN effect: ${direction} ${duration}s for block ${currentBlockId}`);
                                        }

                                        // Parse ZOOM effects: ZOOM-IN:duration=3.5 or ZOOM-OUT:duration=2.0
                                        const zoomMatch = trimmedEffect.match(/ZOOM-(IN|OUT):duration=([0-9.]+)/);
                                        if (zoomMatch) {
                                            const [, direction, duration] = zoomMatch;
                                            currentBlockEffects.push('zoom');
                                            initialDirections[`zoom-${currentBlockId}`] = direction.toLowerCase();
                                            initialDurations[`zoom-${currentBlockId}`] = parseFloat(duration);
                                            console.log(`🎬 Parsed ZOOM effect: ${direction} ${duration}s for block ${currentBlockId}`);
                                        }
                                    });
                                });
                            }

                            // Store parsed effects for this block
                            if (currentBlockEffects.length > 0) {
                                initialEffects[blockKey] = currentBlockEffects;
                                console.log(`🎬 Stored effects for block ${currentBlockId}:`, currentBlockEffects);
                            }

                            realBlocks.push({
                                id: blockId++,
                                type: 'media',
                                mediaName: mediaName,
                                mediaId: mediaId,
                                mediaUrl: mediaUrl || 'https://picsum.photos/400/300?random=1', // Use parsed URL or fallback
                                effect: null,
                                duration: 0
                            });

                            // ✅ CRITICAL: Skip voice processing for MEDIA blocks
                            console.log('✅ DEBUG - MEDIA block processed, skipping voice parsing');
                            continue; // Skip to next line, don't process as voice
                        }

                        // Check for HOLD and LOAD SCREEN blocks (still use double brackets)
                        const holdLoadMatch = trimmedLine.match(/^\[\[(HOLD|LOAD SCREEN)\]\]\s*(.*)$/);
                        if (holdLoadMatch) {
                            const blockType = holdLoadMatch[1];
                            const content = holdLoadMatch[2].trim();

                            if (blockType === 'HOLD') {
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
                            } else if (blockType === 'LOAD SCREEN') {
                                // Parse LOAD SCREEN attributes
                                const messageMatch = content.match(/message="([^"]+)"/);
                                const durationMatch = content.match(/duration=([0-9.]+)/);
                                const iconMatch = content.match(/icon="([^"]+)"/);

                                const message = messageMatch ? messageMatch[1] : 'Loading...';
                                const duration = durationMatch ? parseFloat(durationMatch[1]) : 2.0;
                                const icon = iconMatch ? iconMatch[1] : 'default';

                                realBlocks.push({
                                    id: blockId++,
                                    type: 'loadscreen',
                                    message: message,
                                    duration: duration,
                                    icon: icon,
                                    effect: `LOADING:${duration}s`
                                });
                            }
                        } else {
                            // Parse voice line - check Sacred Format first, then legacy format
                            let voiceTag, explicitPreference, messageId, content;

                            // Check for Sacred Format first: [NAME | preference | ID] <content>
                            const sacredMatch = trimmedLine.match(/^\[([^|]+)\|([^|]+)\|([^\]]*)\]\s*<(.+)>$/);
                            if (sacredMatch) {
                                voiceTag = sacredMatch[1].trim();
                                explicitPreference = sacredMatch[2].trim();
                                messageId = sacredMatch[3].trim() || null;
                                content = sacredMatch[4].trim(); // Content already extracted from <content>
                            } else {
                                // Fallback to legacy format: [voiceTag:preference:messageId] content
                                const voiceMatch = trimmedLine.match(/^\[([^:\]]+)(?::([^:\]]+))?(?::([^:\]]+))?\]\s*(.+)$/);
                                if (voiceMatch) {
                                    voiceTag = voiceMatch[1].trim();
                                    explicitPreference = voiceMatch[2]?.trim();
                                    messageId = voiceMatch[3]?.trim();
                                    content = voiceMatch[4].trim();
                                }
                            }

                            // If we successfully parsed either format, process the voice line
                            if (voiceTag && content) {
                                // Determine voice type and enhance display name
                                let voiceType = 'contributor';
                                let enhancedVoiceTag = voiceTag;

                                if (voiceTag.toLowerCase().includes('ember')) {
                                    voiceType = 'ember';
                                    enhancedVoiceTag = 'Ember Voice';
                                } else if (voiceTag.toLowerCase().includes('narrator')) {
                                    voiceType = 'narrator';
                                    enhancedVoiceTag = 'Narrator';
                                }

                                // NEW: Determine message type using direct message ID lookup when available
                                let originalMessageType = 'Text Response'; // Default for non-contributors

                                if (voiceType === 'contributor') {
                                    if (messageId && loadedStoryMessages && loadedStoryMessages.length > 0) {
                                        // Direct lookup using message ID - 100% accurate!
                                        const exactMessage = loadedStoryMessages.find(msg => msg.id === messageId);
                                        if (exactMessage) {
                                            originalMessageType = exactMessage.has_audio || exactMessage.audio_url ? 'Audio Message' : 'Text Response';
                                            console.log(`🎯 DIRECT MESSAGE LOOKUP: ${voiceTag} message ${messageId} -> ${originalMessageType}`);
                                        } else {
                                            console.log(`⚠️ Message ID ${messageId} not found, falling back to fuzzy matching for ${voiceTag}`);
                                            // Fallback to fuzzy matching if message ID not found
                                            originalMessageType = determineMessageType(voiceTag, content, voiceType);
                                        }
                                    } else {
                                        // Fallback to fuzzy matching when no message ID available
                                        console.log(`📝 No message ID available for ${voiceTag}, using fuzzy matching`);
                                        originalMessageType = determineMessageType(voiceTag, content, voiceType);
                                    }
                                } else {
                                    originalMessageType = 'AI Voice';
                                }

                                // Set preference: use explicit preference if provided, otherwise default based on message type
                                const preference = explicitPreference || (originalMessageType === 'Audio Message' ? 'recorded' : 'text');

                                // Get contributor data for avatars and fallbacks
                                const contributorData = voiceType === 'contributor' ? getContributorAvatarData(voiceTag) : null;

                                realBlocks.push({
                                    id: blockId++,
                                    type: 'voice',
                                    voiceTag: enhancedVoiceTag,
                                    content: content,
                                    voiceType: voiceType,
                                    avatarUrl: voiceType === 'contributor' ? contributorData.avatarUrl : '/EMBERFAV.svg',
                                    contributorData: contributorData, // Store full contributor data for avatar fallbacks
                                    messageType: originalMessageType, // SACRED: Original message type - never changes
                                    preference: preference, // Current playback preference - can change
                                    messageId: messageId // Store message ID for future reference
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
                realBlocks.forEach(block => {
                    if (block.type === 'hold') {
                        // Only set default empty array if no effects were already parsed
                        if (!initialEffects[`hold-${block.id}`]) {
                            initialEffects[`hold-${block.id}`] = [];
                        }
                        // Only set default duration if not already parsed
                        if (!initialDurations[`hold-duration-${block.id}`]) {
                            initialDurations[`hold-duration-${block.id}`] = block.duration || 4.0;
                        }
                    }

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
                    // Set default direction for HOLD fade effects
                    if (!initialDirections[`hold-fade-${block.id}`]) {
                        initialDirections[`hold-fade-${block.id}`] = 'in';
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
    }, [id, storyCutId]);

    // Sync editedScript with storyCut when entering edit mode
    useEffect(() => {
        if (isEditingScript && storyCut?.full_script) {
            console.log('🔍 DEBUG - useEffect sync: storyCut.full_script changed while editing');
            console.log('🔍 DEBUG - New script content:', storyCut.full_script);
            setEditedScript(storyCut.full_script);
        }
    }, [isEditingScript, storyCut?.full_script]);

    // Auto-generate and save complete script when blocks are loaded (but not when manually edited)
    useEffect(() => {
        console.log('🔍 DEBUG - Auto-generation useEffect TRIGGERED');
        console.log('🔍 DEBUG - Dependencies:', {
            blocks: blocks?.length,
            storyCut: !!storyCut,
            user: !!user,
            contributorAudioPreferences: Object.keys(contributorAudioPreferences || {}).length
        });

        if (!blocks || blocks.length === 0 || !storyCut || !user) {
            console.log('🔍 DEBUG - Auto-generation EARLY RETURN - missing dependencies');
            return;
        }

        // ✅ ENHANCED: Check for existing MEDIA blocks to prevent duplication
        const existingMediaBlocks = blocks.filter(b => b.type === 'media');
        const storedScript = storyCut.full_script?.trim() || '';

        console.log('🔍 DEBUG - Auto-generation check:', {
            totalBlocks: blocks.length,
            mediaBlocks: existingMediaBlocks.length,
            scriptLength: storedScript.length,
            storedScriptPreview: storedScript.substring(0, 100) + '...'
        });

        // Don't auto-generate if multiple MEDIA blocks exist (likely duplicates)
        if (existingMediaBlocks.length > 1) {
            console.log('⚠️ DEBUG - Multiple MEDIA blocks detected - skipping auto-generation to prevent duplicates');
            console.log('🔍 DEBUG - Existing MEDIA blocks:', existingMediaBlocks.map(b => ({
                id: b.id,
                mediaId: b.mediaId,
                mediaUrl: b.mediaUrl?.substring(0, 30) + '...'
            })));
            return;
        }

        // Don't auto-generate if the script appears to be manually edited
        const hasManualFormatting = storedScript.includes('\n\n\n') || // Extra spacing
            storedScript.includes('  ') || // Extra spaces
            /[a-z]\s*\[/.test(storedScript) || // Text before voice tags
            storedScript.split('\n').some(line => line.trim() && !line.match(/^\[\[|^\[/)); // Non-standard lines

        if (hasManualFormatting) {
            console.log('📝 DEBUG - Script appears to be manually edited - skipping auto-generation');
            return;
        }

        // Wait for all state to settle, then auto-generate complete script
        const timeout = setTimeout(async () => {
            try {
                console.log('🔄 DEBUG - Auto-generation STARTING...');

                // ✅ NEW: Better detection of script completeness for inline voice format
                const hasInlineVoiceFormat = /\[[^\]]+\s*-\s*[^:]+:[^:\]]+\]/.test(storedScript);
                const hasOldAudioSuffixes = storedScript.includes(':recorded') || storedScript.includes(':text') || storedScript.includes(':synth');

                // Check if script already has the new inline voice format with preferences
                const isScriptComplete = hasInlineVoiceFormat || hasOldAudioSuffixes;

                console.log('🔍 DEBUG - Script completeness check:', {
                    hasInlineVoiceFormat,
                    hasOldAudioSuffixes,
                    isScriptComplete,
                    scriptLength: storedScript.length
                });

                if (isScriptComplete) {
                    console.log('✅ DEBUG - Script already has proper voice format - no auto-generation needed');
                    return;
                }

                // ✅ NEW: Only generate if script is genuinely incomplete
                console.log('🔄 DEBUG - Calling generateScript()...');
                const generatedScript = generateScript();
                console.log('🔄 DEBUG - generateScript() returned:', generatedScript.length, 'characters');

                // ✅ NEW: More conservative update logic
                if (generatedScript !== storedScript) {
                    console.log('💾 DEBUG - Scripts differ - updating database...');
                    console.log('📝 DEBUG - Stored script preview:', storedScript.substring(0, 200) + '...');
                    console.log('📝 DEBUG - Generated script preview:', generatedScript.substring(0, 200) + '...');

                    await updateStoryCut(storyCut.id, {
                        full_script: generatedScript
                    }, user.id);

                    // Update local state
                    setStoryCut(prev => ({
                        ...prev,
                        full_script: generatedScript
                    }));

                    console.log('✅ DEBUG - Auto-saved complete script to database for EmberPlay');

                    // 🔄 Notify other components about the script update
                    window.dispatchEvent(new CustomEvent('emberScriptUpdated', {
                        detail: {
                            emberId: id,
                            storyCutId: storyCut.id,
                            timestamp: Date.now()
                        }
                    }));
                } else {
                    console.log('✅ DEBUG - Database script matches generated script - no update needed');
                }
            } catch (error) {
                console.error('❌ DEBUG - Failed to auto-generate complete script:', error);
            }
        }, 1000); // Wait for all state to settle

        return () => {
            console.log('🔍 DEBUG - Auto-generation useEffect CLEANUP');
            clearTimeout(timeout);
        };
    }, [blocks, user, contributorAudioPreferences]); // Removed storyCut from dependencies to avoid triggering on manual edits

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
            }
        } else if (block.type === 'hold') {
            return {
                active: 'bg-gray-100 hover:bg-gray-200 text-gray-600',
                disabled: 'bg-gray-50 text-gray-300 cursor-not-allowed'
            };
        } else if (block.type === 'loadscreen') {
            // Use same styling as HOLD blocks
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

        // Auto-save the reordered script to database
        if (user && storyCut) {
            try {
                // Wait for state to update, then generate and save
                setTimeout(async () => {
                    const updatedScript = generateScript();
                    await updateStoryCut(storyCut.id, {
                        full_script: updatedScript
                    }, user.id);
                    console.log('✅ Block reordering auto-saved to database');

                    // 🔄 Notify other components about the script update
                    window.dispatchEvent(new CustomEvent('emberScriptUpdated', {
                        detail: {
                            emberId: id,
                            storyCutId: storyCut.id,
                            timestamp: Date.now()
                        }
                    }));
                }, 100);
            } catch (error) {
                console.error('❌ Failed to auto-save reordered blocks:', error);
            }
        }
    };

    const moveBlockDown = async (index) => {
        if (index === blocks.length - 1) return; // Can't move last block down

        const newBlocks = [...blocks];
        const blockToMove = newBlocks[index];
        newBlocks[index] = newBlocks[index + 1];
        newBlocks[index + 1] = blockToMove;

        setBlocks(newBlocks);
        console.log(`🔄 Moved block ${blockToMove.id} down (index ${index} → ${index + 1})`);

        // Auto-save the reordered script to database
        if (user && storyCut) {
            try {
                // Wait for state to update, then generate and save
                setTimeout(async () => {
                    const updatedScript = generateScript();
                    await updateStoryCut(storyCut.id, {
                        full_script: updatedScript
                    }, user.id);
                    console.log('✅ Block reordering auto-saved to database');

                    // 🔄 Notify other components about the script update
                    window.dispatchEvent(new CustomEvent('emberScriptUpdated', {
                        detail: {
                            emberId: id,
                            storyCutId: storyCut.id,
                            timestamp: Date.now()
                        }
                    }));
                }, 100);
            } catch (error) {
                console.error('❌ Failed to auto-save reordered blocks:', error);
            }
        }
    };

    const generateScript = () => {
        // Generate scripts using the new SACRED FORMAT to preserve critical data
        console.log('🔍 DEBUG - generateScript() ENTRY');
        console.log('🔍 DEBUG - Current blocks:', blocks?.length, blocks?.map(b => ({ type: b.type, id: b.id, mediaId: b.mediaId })));

        const scriptLines = blocks.map(block => {
            console.log('🔍 DEBUG - Processing block:', { type: block.type, id: block.id, mediaId: block.mediaId });

            switch (block.type) {
                case 'media':
                    // Media blocks use Sacred Format: [MEDIA | id] <media>
                    let mediaId = block.mediaId || 'generated';

                    console.log('🔍 DEBUG - MEDIA block generation:', {
                        blockId: block.id,
                        mediaId: block.mediaId,
                        mediaUrl: block.mediaUrl?.substring(0, 50) + '...',
                        mediaName: block.mediaName
                    });

                    // Simplified Sacred Format content - ID contains the reference, content is simple
                    const mediaLine = `[MEDIA | ${mediaId}] <media>`;
                    console.log('🔍 DEBUG - Generated MEDIA line:', mediaLine);
                    return mediaLine;

                case 'voice':
                    // Voice blocks use Sacred Format: [NAME | preference | contributionID] <content>
                    const contributorName = block.contributorName || block.voiceTag || 'Unknown';

                    // Get audio preference from the current state
                    const blockKey = `${block.voiceTag || block.contributorName}-${block.id}`;
                    const audioPreference = contributorAudioPreferences[blockKey] || block.preference || 'text';
                    const contributionId = block.messageId || block.contributionId || 'no-audio';

                    console.log('🔍 DEBUG - Voice block generation:', {
                        blockId: block.id,
                        contributorName,
                        audioPreference,
                        contributionId,
                        content: block.content?.substring(0, 30) + '...'
                    });

                    const voiceLine = `[${contributorName} | ${audioPreference} | ${contributionId}] <${block.content}>`;
                    console.log('🔍 DEBUG - Generated voice line:', voiceLine);
                    return voiceLine;

                case 'hold':
                    // Hold blocks use existing logic but with new format
                    const holdEffects = selectedEffects[`hold-${block.id}`] || [];
                    const holdDuration = effectDurations[`hold-duration-${block.id}`] || block.duration || 4.0;
                    const holdFadeDirection = effectDirections[`hold-fade-${block.id}`] || 'in';

                    let holdAttributes = `COLOR:${block.color || '#000000'},duration=${holdDuration}`;

                    if (holdEffects.includes('fade')) {
                        holdAttributes += `,FADE-${holdFadeDirection.toUpperCase()}:duration=${holdDuration}`;
                    }

                    return `[[HOLD]] (${holdAttributes})`;

                case 'loadscreen':
                    return `[[LOAD SCREEN]] (message="${block.message}",duration=${block.duration},icon="${block.icon}")`;

                case 'start':
                    return ''; // Start blocks don't generate script content
                case 'end':
                    return ''; // End blocks don't generate script content
                default:
                    console.log('🔍 DEBUG - Unknown block type:', block.type);
                    return '';
            }
        });

        const finalScript = scriptLines.filter(line => line.trim()).join('\n\n');
        console.log('🔍 DEBUG - generateScript() EXIT');
        console.log('🔍 DEBUG - Final script length:', finalScript.length);
        console.log('🔍 DEBUG - Final script preview:', finalScript.substring(0, 200) + '...');

        return finalScript;
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
    const handleEditScript = async () => {
        console.log('🔍 DEBUG - handleEditScript called');
        console.log('🔍 DEBUG - storyCut:', storyCut);
        console.log('🔍 DEBUG - storyCut?.full_script:', storyCut?.full_script);

        try {
            // Load user-friendly formatted script for editing
            const { formatScriptForDisplay } = await import('@/lib/scriptParser');
            const formattedScript = await formatScriptForDisplay(storyCut?.full_script || '', ember, storyCut);

            console.log('🎨 StoryCutStudio: Loading user-friendly script for editing');
            console.log('🎨 Formatted script preview:', formattedScript.substring(0, 200));

            setEditedScript(formattedScript);
            setIsEditingScript(true);
        } catch (error) {
            console.error('❌ Error formatting script for editing:', error);
            // Fallback to raw script
            const scriptContent = storyCut?.full_script || '';
            setEditedScript(scriptContent);
            setIsEditingScript(true);
        }
    };

    const handleCancelScriptEdit = () => {
        console.log('🔍 DEBUG - handleCancelScriptEdit called');
        setIsEditingScript(false);
        setEditedScript('');
    };

    const handleSaveScript = async () => {
        if (!user || !storyCut?.id || !editedScript.trim()) return;

        try {
            setIsSavingScript(true);

            console.log('🔄 Saving edited script...');

            // Import script reconstruction function
            const { reconstructScript } = await import('@/lib/scriptParser');

            // Reconstruct the original format to preserve metadata (voice IDs, preferences, etc.)
            const reconstructedScript = reconstructScript(
                editedScript.trim(),
                storyCut.full_script,
                storyCut
            );

            console.log('🔧 StoryCutStudio: Reconstructed script preview:', reconstructedScript.substring(0, 200));
            console.log('🔧 StoryCutStudio: Original metadata preserved in reconstructed script');

            // Update the story cut in the database with reconstructed script
            await updateStoryCut(storyCut.id, {
                full_script: reconstructedScript
            }, user.id);

            console.log('✅ Script updated successfully');

            // Update the local state with reconstructed script
            setStoryCut(prev => ({
                ...prev,
                full_script: reconstructedScript
            }));

            // Exit edit mode
            setIsEditingScript(false);
            setEditedScript('');

            // 🔄 Notify EmberPlay and other components to refresh data
            console.log('🔄 Broadcasting script update to other components...');

            // Dispatch custom event to notify other components
            window.dispatchEvent(new CustomEvent('emberScriptUpdated', {
                detail: {
                    emberId: id,
                    storyCutId: storyCut.id,
                    timestamp: Date.now()
                }
            }));

            // Also trigger global refresh actions if available
            if (window.EmberDetailActions?.refreshStoryCuts) {
                window.EmberDetailActions.refreshStoryCuts();
            }

        } catch (error) {
            console.error('❌ Error updating script:', error);
            setError('Failed to update script. Please try again.');
        } finally {
            setIsSavingScript(false);
        }
    };

    // Handle adding a new media block
    const handleAddMediaBlock = async (selection) => {
        if (!selection || !user || !storyCut) return;

        // Handle both old format (direct media) and new format (object with media/contributions)
        const selectedMedia = selection.media || (selection.name ? selection : null);
        const selectedContributions = selection.contributions || [];

        if (!selectedMedia && selectedContributions.length === 0) return;

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

                blocksToAdd.push(mediaBlock);
            }

            // Add voice blocks from contributions
            selectedContributions.forEach(contribution => {
                console.log('➕ Adding new voice block:', contribution.user_first_name, contribution.content.substring(0, 50));

                const voiceBlock = {
                    id: currentBlockId++,
                    type: 'voice',
                    voiceTag: contribution.user_first_name,
                    content: contribution.content,
                    voiceType: 'contributor',
                    avatarUrl: 'https://i.pravatar.cc/40?img=1',
                    messageType: contribution.has_audio ? 'Audio Message' : 'Text Response',
                    preference: contribution.has_audio ? 'recorded' : 'text',
                    messageId: contribution.id || contribution.message_id || null
                };

                blocksToAdd.push(voiceBlock);
            });

            // Insert all new blocks at once
            newBlocks.splice(insertIndex, 0, ...blocksToAdd);

            setBlocks(newBlocks);
            console.log(`✅ Added ${blocksToAdd.length} new block(s) successfully`);

            // Initialize effects state for all new blocks
            const newEffectDirections = {};
            const newEffectDurations = {};
            const newSelectedEffects = {};

            blocksToAdd.forEach(block => {
                if (block.type === 'media') {
                    // Initialize media block effects
                    newEffectDirections[`fade-${block.id}`] = 'in';
                    newEffectDirections[`pan-${block.id}`] = 'left';
                    newEffectDirections[`zoom-${block.id}`] = 'in';

                    newEffectDurations[`fade-${block.id}`] = 3.0;
                    newEffectDurations[`pan-${block.id}`] = 4.0;
                    newEffectDurations[`zoom-${block.id}`] = 3.5;

                    newSelectedEffects[`effect-${block.id}`] = [];
                }
                // Voice blocks don't need effects initialization
            });

            setEffectDirections(prev => ({ ...prev, ...newEffectDirections }));
            setEffectDurations(prev => ({ ...prev, ...newEffectDurations }));
            setSelectedEffects(prev => ({ ...prev, ...newSelectedEffects }));

            console.log('✅ Effects state initialized for new blocks');

            // Auto-save the updated script to database
            try {
                // Wait for state to update, then generate and save
                setTimeout(async () => {
                    const updatedScript = generateScript();
                    await updateStoryCut(storyCut.id, {
                        full_script: updatedScript
                    }, user.id);
                    console.log('✅ Script with new block auto-saved to database');

                    // 🔄 Notify other components about the script update
                    window.dispatchEvent(new CustomEvent('emberScriptUpdated', {
                        detail: {
                            emberId: id,
                            storyCutId: storyCut.id,
                            timestamp: Date.now()
                        }
                    }));
                }, 100);
            } catch (error) {
                console.error('❌ Failed to auto-save script with new block:', error);
            }

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
                                        }
                                    } else if (block.type === 'hold') {
                                        bgColor = 'bg-gray-50';
                                        borderColor = 'border-gray-200';
                                        textColor = 'text-gray-600';
                                        ringColor = 'ring-gray-500';
                                        hoverColor = 'hover:bg-gray-100';
                                    } else if (block.type === 'loadscreen') {
                                        // Use same styling as HOLD blocks
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
                                                            {/* Reorder Controls */}
                                                            <div className="flex flex-col gap-2.5">
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        moveBlockUp(index);
                                                                    }}
                                                                    disabled={index === 0}
                                                                    className={`p-1 rounded-full transition-colors duration-200 ${index === 0
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
                                                                    disabled={index === blocks.length - 1}
                                                                    className={`p-1 rounded-full transition-colors duration-200 ${index === blocks.length - 1
                                                                        ? getArrowButtonColors(block).disabled
                                                                        : getArrowButtonColors(block).active
                                                                        }`}
                                                                    title="Move down"
                                                                >
                                                                    <ArrowDown className="w-4 h-4" />
                                                                </button>
                                                            </div>

                                                            {/* Media Thumbnail */}
                                                            {block.mediaUrl && (
                                                                <div className="flex-shrink-0">
                                                                    <img
                                                                        src={block.mediaUrl}
                                                                        alt={block.mediaName || 'Media'}
                                                                        className="w-16 h-16 object-cover rounded-lg border border-gray-300"
                                                                        onError={(e) => {
                                                                            e.target.style.display = 'none';
                                                                        }}
                                                                    />
                                                                </div>
                                                            )}

                                                            <div className="flex items-center gap-2">
                                                                <span
                                                                    className={`font-semibold ${textColor}`}
                                                                    title={block.mediaName || ''}
                                                                >
                                                                    {block.mediaName && block.mediaName.length > 15 ? `${block.mediaName.substring(0, 15)}...` : block.mediaName}
                                                                </span>
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
                                                                            max="30"
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
                                                                            max="30"
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
                                                                    {/* Reorder Controls */}
                                                                    <div className="flex flex-col gap-2.5 mr-1">
                                                                        <button
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                moveBlockUp(index);
                                                                            }}
                                                                            disabled={index === 0}
                                                                            className={`p-1 rounded-full transition-colors duration-200 ${index === 0
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
                                                                            disabled={index === blocks.length - 1}
                                                                            className={`p-1 rounded-full transition-colors duration-200 ${index === blocks.length - 1
                                                                                ? getArrowButtonColors(block).disabled
                                                                                : getArrowButtonColors(block).active
                                                                                }`}
                                                                            title="Move down"
                                                                        >
                                                                            <ArrowDown className="w-4 h-4" />
                                                                        </button>
                                                                    </div>
                                                                    <div className="flex items-center gap-2">
                                                                        {block.voiceType === 'contributor' && block.contributorData ? (
                                                                            <Avatar className="h-8 w-8">
                                                                                <AvatarImage
                                                                                    src={block.contributorData.avatarUrl}
                                                                                    alt={`${block.contributorData.firstName || ''} ${block.contributorData.lastName || ''}`.trim() || block.voiceTag}
                                                                                />
                                                                                <AvatarFallback className="text-xs bg-gray-200 text-gray-700">
                                                                                    {block.contributorData.fallbackText}
                                                                                </AvatarFallback>
                                                                            </Avatar>
                                                                        ) : (
                                                                            <img
                                                                                src={block.avatarUrl}
                                                                                alt={block.voiceTag}
                                                                                className="w-8 h-8 rounded-full object-cover"
                                                                                onError={(e) => {
                                                                                    e.target.style.display = 'none';
                                                                                }}
                                                                            />
                                                                        )}
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
                                                                {/* Reorder Controls */}
                                                                <div className="flex flex-col gap-2.5 mr-1">
                                                                    <button
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            moveBlockUp(index);
                                                                        }}
                                                                        disabled={index === 0}
                                                                        className={`p-1 rounded-full transition-colors duration-200 ${index === 0
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
                                                                        disabled={index === blocks.length - 1}
                                                                        className={`p-1 rounded-full transition-colors duration-200 ${index === blocks.length - 1
                                                                            ? getArrowButtonColors(block).disabled
                                                                            : getArrowButtonColors(block).active
                                                                            }`}
                                                                        title="Move down"
                                                                    >
                                                                        <ArrowDown className="w-4 h-4" />
                                                                    </button>
                                                                </div>
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
                                                            {/* Reorder Controls */}
                                                            <div className="flex flex-col gap-2.5 mr-1">
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        moveBlockUp(index);
                                                                    }}
                                                                    disabled={index === 0}
                                                                    className={`p-1 rounded-full transition-colors duration-200 ${index === 0
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
                                                                    disabled={index === blocks.length - 1}
                                                                    className={`p-1 rounded-full transition-colors duration-200 ${index === blocks.length - 1
                                                                        ? getArrowButtonColors(block).disabled
                                                                        : getArrowButtonColors(block).active
                                                                        }`}
                                                                    title="Move down"
                                                                >
                                                                    <ArrowDown className="w-4 h-4" />
                                                                </button>
                                                            </div>
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
                                                                    checked={selectedEffects[`hold-${block.id}`]?.includes('fade') || false}
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
                                                    {selectedEffects[`hold-${block.id}`]?.includes('fade') && (
                                                        <div className="mt-3" style={{ marginLeft: '24px' }}>
                                                            <div className="flex items-center gap-4">
                                                                <div className="flex-1 space-y-2">
                                                                    <div className="flex items-center justify-between">
                                                                        <span className="text-sm text-gray-700">Fade Duration</span>
                                                                        <span className="text-sm text-gray-700">{effectDurations[`hold-duration-${block.id}`] || 4.0} sec</span>
                                                                    </div>
                                                                    <input
                                                                        type="range"
                                                                        min="0"
                                                                        max="30"
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
                                                                <div className="flex-shrink-0 flex flex-col items-end">
                                                                    <div className="text-xs text-gray-700 mb-1">
                                                                        {effectDirections[`hold-fade-${block.id}`] === 'out' ? 'OUT' : 'IN'}
                                                                    </div>
                                                                    <button
                                                                        onClick={() => {
                                                                            setEffectDirections(prev => ({
                                                                                ...prev,
                                                                                [`hold-fade-${block.id}`]: prev[`hold-fade-${block.id}`] === 'in' ? 'out' : 'in'
                                                                            }));
                                                                        }}
                                                                        className="px-2 py-1 bg-gray-200 text-gray-700 rounded text-xs hover:bg-gray-300 transition-colors"
                                                                    >
                                                                        Toggle
                                                                    </button>
                                                                </div>
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
                                    onClick={() => navigate(`/embers/${id}/manage?view=story-cuts`)}
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
                    <div className="space-y-4">
                        {/* Code View Header */}
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Code size={20} className="text-blue-600" />
                                <h3 className="text-lg font-semibold text-gray-900">
                                    Script Editor
                                </h3>
                            </div>
                            {!isEditingScript && (
                                <Button
                                    onClick={handleEditScript}
                                    size="sm"
                                    variant="outline"
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
                            <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 overflow-hidden">
                                <div className="text-gray-700 leading-relaxed font-mono text-sm overflow-auto">
                                    <pre className="whitespace-pre-wrap break-words max-w-full" style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
                                        {storyCut?.full_script || 'Loading script...'}
                                    </pre>
                                </div>
                            </div>
                        )}
                    </div>
                )}
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
                                                        transform: `scale(${currentZoomScale})`,
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
                </>
            )}

            {/* Add Block Modal */}
            <AddBlockModal
                isOpen={showAddBlockModal}
                onClose={() => setShowAddBlockModal(false)}
                emberId={id}
                onAddBlock={handleAddMediaBlock}
                storyMessages={storyMessages}
            />
        </div>
    );
}