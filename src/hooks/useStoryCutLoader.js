import { useState, useEffect } from 'react';
import { getStoryCutById, getPrimaryStoryCut, getEmber, getAllStoryMessagesForEmber, getStoryCutsForEmber, getUserVoiceModel, getEmberTaggedPeople, updateStoryCut } from '@/lib/database';
import { getEmberWithSharing } from '@/lib/sharing';
import { resolveMediaReference } from '@/lib/scriptParser';

// Smart function to split effects by commas while preserving custom coordinates
function smartSplitEffects(content) {
    const effects = [];
    let current = '';
    let insideTarget = false;

    for (let i = 0; i < content.length; i++) {
        const char = content[i];

        // Check if we're entering a target parameter
        if (content.substr(i, 7) === 'target=') {
            insideTarget = true;
            current += char;
        }
        // Check if we're at a comma
        else if (char === ',') {
            if (insideTarget) {
                // Inside target parameter, this comma is part of coordinates
                current += char;
                // Check if we're at the end of the target parameter (next effect starts)
                const remaining = content.substr(i + 1);
                if (remaining.match(/^\s*(FADE-|PAN-|ZOOM-)/)) {
                    insideTarget = false;
                }
            } else {
                // Normal comma separation between effects
                if (current.trim()) {
                    effects.push(current.trim());
                }
                current = '';
            }
        }
        // Any other character
        else {
            current += char;
        }
    }

    // Add the last effect
    if (current.trim()) {
        effects.push(current.trim());
    }

    console.log(`🎯 Smart split effects: "${content}" → `, effects);
    return effects;
}

export function useStoryCutLoader(id, storyCutId, user) {
    // Real story cut data
    const [storyCut, setStoryCut] = useState(null);
    const [ember, setEmber] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Parsed blocks and related data
    const [blocks, setBlocks] = useState([]);
    const [storyMessages, setStoryMessages] = useState([]);
    const [contributors, setContributors] = useState([]);
    const [taggedPeople, setTaggedPeople] = useState([]);

    // Effect states
    const [selectedEffects, setSelectedEffects] = useState({});
    const [effectDirections, setEffectDirections] = useState({});
    const [effectDurations, setEffectDurations] = useState({});
    const [effectDistances, setEffectDistances] = useState({});
    const [effectScales, setEffectScales] = useState({});
    const [effectTargets, setEffectTargets] = useState({});

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

                            // Method 2: Contains match (script content is contained in message)
                            if (msgContent.includes(scriptContent) && scriptContent.length > 10) {
                                console.log(`  ✅ CONTAINS MATCH found! has_audio: ${msg.has_audio}`);
                                return msg.has_audio ? 'Audio Message' : 'Text Response';
                            }

                            // Method 3: Partial match (first 20 characters)
                            if (msgContent.length > 20 && scriptContent.length > 20) {
                                const msgStart = msgContent.substring(0, 20);
                                const scriptStart = scriptContent.substring(0, 20);
                                if (msgStart === scriptStart) {
                                    console.log(`  ✅ PARTIAL MATCH found! has_audio: ${msg.has_audio}`);
                                    return msg.has_audio ? 'Audio Message' : 'Text Response';
                                }
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

                    // Try to find the best unused matching message
                    for (const msg of contributorMessages) {
                        // Skip if this contribution has already been used
                        if (usedContributions.has(msg.id)) {
                            console.log(`  ⏭️ Skipping used contribution: "${msg.content?.substring(0, 30)}..."`);
                            continue;
                        }

                        if (msg.content && msg.content.trim()) {
                            console.log(`  Checking unused message: "${msg.content}" (has_audio: ${msg.has_audio})`);

                            // More flexible matching approach
                            const msgContent = msg.content.toLowerCase().trim();
                            const scriptContent = content.toLowerCase().trim();

                            // Method 1: Exact match
                            if (msgContent === scriptContent) {
                                console.log(`  ✅ EXACT MATCH found! has_audio: ${msg.has_audio}`);
                                usedContributions.add(msg.id); // Mark as used
                                return msg.has_audio ? 'Audio Message' : 'Text Response';
                            }

                            // Method 2: Contains match (script content is contained in message)
                            if (msgContent.includes(scriptContent) && scriptContent.length > 10) {
                                console.log(`  ✅ CONTAINS MATCH found! has_audio: ${msg.has_audio}`);
                                usedContributions.add(msg.id); // Mark as used
                                return msg.has_audio ? 'Audio Message' : 'Text Response';
                            }

                            // Method 3: Partial match (first 20 characters)
                            if (msgContent.length > 20 && scriptContent.length > 20) {
                                const msgStart = msgContent.substring(0, 20);
                                const scriptStart = scriptContent.substring(0, 20);
                                if (msgStart === scriptStart) {
                                    console.log(`  ✅ PARTIAL MATCH found! has_audio: ${msg.has_audio}`);
                                    usedContributions.add(msg.id); // Mark as used
                                    return msg.has_audio ? 'Audio Message' : 'Text Response';
                                }
                            }
                        }
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
                const initialScales = {};
                const initialTargets = {};

                // Parse voice declarations and override story cut voice names
                let embedVoiceNames = {
                    ember: targetStoryCut.ember_voice_name || 'Unknown Voice',
                    narrator: targetStoryCut.narrator_voice_name || 'Unknown Voice'
                };

                const scriptContent = targetStoryCut.full_script || '';
                const lines = scriptContent.split('\n');
                let blockId = 2; // Start from 2 since start block is 1

                for (let i = 0; i < lines.length; i++) {
                    const line = lines[i];
                    const trimmedLine = line.trim();

                    if (!trimmedLine) continue;

                    // Parse voice declarations (e.g., "[[VOICE:ember:Rachel]]")
                    const voiceDeclarationMatch = trimmedLine.match(/^\[\[VOICE:([^:]+):([^\]]+)\]\]$/);
                    if (voiceDeclarationMatch) {
                        const voiceRole = voiceDeclarationMatch[1];
                        const voiceName = voiceDeclarationMatch[2];
                        embedVoiceNames[voiceRole] = voiceName;
                        console.log(`🎤 Voice declaration: ${voiceRole} = ${voiceName}`);
                        continue;
                    }

                    // Check for MEDIA blocks first (use angle brackets)
                    const mediaMatch = trimmedLine.match(/^<(.*?)>\s*(.*)$/);
                    if (mediaMatch) {
                        const mediaReference = mediaMatch[1].trim();
                        const content = mediaMatch[2].trim();

                        console.log(`🎬 Found MEDIA block: reference="${mediaReference}", content="${content}"`);

                        let mediaId = null;
                        let mediaUrl = null;
                        let mediaName = 'Media';

                        // Extract media ID or name from the reference
                        if (mediaReference.startsWith('id=')) {
                            mediaId = mediaReference.substring(3);
                            console.log('🔍 Extracted media ID:', mediaId);
                        } else if (mediaReference.startsWith('name=')) {
                            mediaName = mediaReference.substring(5);
                            console.log('🔍 Extracted media name:', mediaName);
                        } else if (mediaReference === 'media') {
                            // Generic media reference
                            mediaName = 'Media';
                        } else {
                            // Treat the whole reference as a name
                            mediaName = mediaReference;
                            console.log('🔍 Using reference as media name:', mediaName);
                        }

                        // Also try to extract additional info from the content
                        if (content) {
                            let extractedMediaName = mediaName;

                            // Look for patterns like: id=123 path=/uploads/... name=DisplayName
                            const pathMatch = content.match(/path=([^\s]+)(?:\s+name=([^}]+))?/);
                            const idContentMatch = content.match(/id=([^\s]+)/);
                            const nameMatch = content.match(/name=([^}]+)/);

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

                        // Skip media references (id= or name=) - content is already extracted from angle brackets
                        if (!content.startsWith('id=') && !content.startsWith('name=') && content !== 'media') {
                            console.log(`🎬 Parsing effects from content: "${content}" for block ${currentBlockId}`);

                            const effects = smartSplitEffects(content);

                            effects.forEach(effect => {
                                const effectTrimmed = effect.trim();
                                console.log(`🎬 Processing effect: "${effectTrimmed}" for block ${currentBlockId}`);

                                // Parse FADE effects
                                const fadeMatch = effectTrimmed.match(/^FADE-(IN|OUT)(?:\s+(\d+(?:\.\d+)?)s)?$/i);
                                if (fadeMatch) {
                                    const direction = fadeMatch[1].toLowerCase();
                                    const duration = fadeMatch[2] ? parseFloat(fadeMatch[2]) : 3.0;

                                    currentBlockEffects.push('fade');
                                    initialDirections[`fade-${currentBlockId}`] = direction;
                                    initialDurations[`fade-${currentBlockId}`] = duration;

                                    console.log(`🎬 Parsed FADE effect: ${direction} ${duration}s for block ${currentBlockId}`);
                                }

                                // Parse PAN effects
                                const panMatch = effectTrimmed.match(/^PAN-(LEFT|RIGHT)(?:\s+(\d+)%)?(?:\s+(\d+(?:\.\d+)?)s)?$/i);
                                if (panMatch) {
                                    const direction = panMatch[1].toLowerCase();
                                    const distance = panMatch[2] ? parseInt(panMatch[2]) : 25;
                                    const duration = panMatch[3] ? parseFloat(panMatch[3]) : 4.0;

                                    currentBlockEffects.push('pan');
                                    initialDirections[`pan-${currentBlockId}`] = direction;
                                    initialDistances[`pan-${currentBlockId}`] = distance;
                                    initialDurations[`pan-${currentBlockId}`] = duration;

                                    console.log(`🎬 Parsed PAN effect: ${direction} ${distance}% ${duration}s for block ${currentBlockId}`);
                                }

                                // Parse ZOOM effects with target support
                                const zoomMatch = effectTrimmed.match(/^ZOOM-(IN|OUT)(?:\s+(\d+(?:\.\d+)?)x)?(?:\s+(\d+(?:\.\d+)?)s)?(?:\s+target=([^,\s]+(?:,\s*[^,\s]+)*))?$/i);
                                if (zoomMatch) {
                                    const direction = zoomMatch[1].toLowerCase();
                                    const scale = zoomMatch[2] ? parseFloat(zoomMatch[2]) : 1.5;
                                    const duration = zoomMatch[3] ? parseFloat(zoomMatch[3]) : 3.5;
                                    const target = zoomMatch[4] ? zoomMatch[4].trim() : 'center';

                                    currentBlockEffects.push('zoom');
                                    initialDirections[`zoom-${currentBlockId}`] = direction;
                                    initialScales[`zoom-${currentBlockId}`] = scale;
                                    initialDurations[`zoom-${currentBlockId}`] = duration;
                                    initialTargets[`zoom-${currentBlockId}`] = target;

                                    console.log(`🎬 Parsed ZOOM effect: ${direction} ${scale ? scale + 'x' : 'default'} ${duration}s${target ? ' target=' + target : ''} for block ${currentBlockId}`);
                                }
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

                        if (voiceTag && content) {
                            // Determine voice type
                            let voiceType, voiceName;
                            if (voiceTag === 'ember' || voiceTag === 'narrator') {
                                voiceType = voiceTag;
                                voiceName = embedVoiceNames[voiceTag] || 'Unknown Voice';
                            } else {
                                voiceType = 'contributor';
                                voiceName = voiceTag; // Use the contributor's name
                            }

                            // Determine message type using contributor tracking
                            const messageType = determineMessageTypeWithTracking(voiceTag, content, voiceType);

                            // Determine preference if not explicitly set
                            let finalPreference = explicitPreference;
                            if (!finalPreference) {
                                // Auto-determine based on message type
                                if (messageType === 'Audio Message') {
                                    finalPreference = 'recorded';
                                } else if (messageType === 'Text Response') {
                                    finalPreference = 'synth';
                                } else {
                                    finalPreference = 'synth'; // Default for AI voices
                                }
                            }

                            console.log(`🎤 Voice line: [${voiceTag}] "${content.substring(0, 50)}..." Type: ${messageType}, Preference: ${finalPreference}`);

                            realBlocks.push({
                                id: blockId++,
                                type: 'voice',
                                voiceTag: voiceTag,
                                voiceType: voiceType,
                                voiceName: voiceName,
                                content: content,
                                messageType: messageType,
                                messageId: messageId || null,
                                audioPreference: finalPreference,
                                hasVoiceModel: false // Will be set later
                            });
                        }
                    }
                }

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

                // Add voice model checking for existing contributor blocks
                for (const block of realBlocks) {
                    if (block.type === 'voice' && block.voiceType === 'contributor') {
                        let userId = null;

                        // Try to get user ID from message data first
                        if (block.messageId && loadedStoryMessages && loadedStoryMessages.length > 0) {
                            const foundMessage = loadedStoryMessages.find(msg => msg.id === block.messageId);
                            if (foundMessage) {
                                userId = foundMessage.user_id;
                                console.log(`🔍 Found user ID ${userId} for ${block.voiceTag} via messageId ${block.messageId}`);
                            }
                        }

                        // Fallback: try to find user ID by matching contributor name
                        if (!userId && loadedStoryMessages && loadedStoryMessages.length > 0) {
                            const nameMatch = loadedStoryMessages.find(msg =>
                                msg.user_first_name && msg.user_first_name.toLowerCase() === block.voiceTag.toLowerCase()
                            );
                            if (nameMatch) {
                                userId = nameMatch.user_id;
                                console.log(`🔍 Found user ID ${userId} for ${block.voiceTag} via name matching`);
                            }
                        }

                        // Check voice model if we found a user ID
                        if (userId) {
                            try {
                                const userVoiceModel = await getUserVoiceModel(userId);
                                block.hasVoiceModel = !!(userVoiceModel && userVoiceModel.elevenlabs_voice_id);
                                console.log(`🎤 Voice model check for ${block.voiceTag}: ${block.hasVoiceModel ? 'available' : 'not available'}`);
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

                    // Set default distances and scales (only if not already set)
                    if (!initialDistances[`pan-${block.id}`]) {
                        initialDistances[`pan-${block.id}`] = 25;
                    }
                    if (!initialScales[`zoom-${block.id}`]) {
                        initialScales[`zoom-${block.id}`] = 1.5;
                    }
                });
                setSelectedEffects(initialEffects);
                setEffectDirections(initialDirections);
                setEffectDurations(initialDurations);
                setEffectDistances(initialDistances);
                setEffectScales(initialScales);
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
    }, [id, storyCutId]);

    return {
        // Core data
        storyCut,
        setStoryCut,
        ember,
        blocks,
        setBlocks,
        contributors,
        storyMessages,
        taggedPeople,

        // Loading states
        loading,
        error,

        // Effect states
        selectedEffects,
        setSelectedEffects,
        effectDirections,
        setEffectDirections,
        effectDurations,
        setEffectDurations,
        effectDistances,
        setEffectDistances,
        effectScales,
        setEffectScales,
        effectTargets,
        setEffectTargets
    };
} 