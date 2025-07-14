import { getEmberPhotos } from '@/lib/photos';
import { getEmberSupportingMedia } from '@/lib/database';

/**
 * Script parsing utility functions
 * Extracted from EmberDetail.jsx to improve maintainability
 */

/**
 * Parse script into voice segments for multi-voice playback
 * @param {string} script - The script content to parse
 * @returns {Array} Array of script segments
 */
export const parseScriptSegments = (script) => {
    if (!script) return [];

    const segments = [];
    const lines = script.split('\n');
    let voiceConfiguration = null;

    console.log('🔍 parseScriptSegments: Processing', lines.length, 'lines');
    console.log('🔍 FULL SCRIPT CONTENT:', script);
    lines.forEach((line, index) => {
        console.log(`🔍 Line ${index + 1}: "${line}"`);
    });

    for (const line of lines) {
        const trimmedLine = line.trim();
        if (!trimmedLine) continue;

        console.log(`🔍 Processing line: "${trimmedLine.substring(0, 100)}..."`);

        // Voice configuration is now handled inline with voice lines

        // Skip malformed lines (common parsing artifacts)
        if ((trimmedLine.includes('[[MEDIA]') && !trimmedLine.includes('[[MEDIA]]')) ||
            (trimmedLine.includes('[[HOLD]') && !trimmedLine.includes('[[HOLD]]'))) {
            console.log('⚠️ Skipping malformed MEDIA/HOLD line:', trimmedLine);
            continue;
        }

        // Match media tags like [[MEDIA]], [[HOLD]], or [[LOAD SCREEN]] with content
        const mediaMatch = trimmedLine.match(/^\[\[(MEDIA|HOLD|LOAD SCREEN)\]\]\s*(.*)$/);

        if (mediaMatch) {
            const mediaType = mediaMatch[1]; // MEDIA, HOLD, or LOAD SCREEN
            const content = mediaMatch[2].trim();

            console.log(`🔍 ${mediaType} match found:`, {
                fullMatch: mediaMatch[0],
                type: mediaType,
                content: content
            });

            // Skip if content is empty or just whitespace
            if (!content) {
                console.log(`⚠️ Skipping empty ${mediaType} segment`);
                continue;
            }

            // Extract visual actions (but NOT media references like <name="file.jpg">, <id=abc123>, or <path="url">)
            const existingVisualActions = [];
            let cleanContent = content.replace(/\<([^>]+)\>/g, (match, action) => {
                // Don't treat media references as visual actions
                if (action.startsWith('name=') || action.startsWith('id=') || action.startsWith('path=')) {
                    return match; // Keep media references in the content
                }
                // Extract all visual actions for HOLD/MEDIA segments (including COLOR:)
                existingVisualActions.push(action);
                return '';
            }).trim();

            // For media lines, the content after removing actions should be the media reference
            const mediaReference = cleanContent;

            // Parse media reference to extract path, ID, or name
            let mediaId = null;
            let mediaName = null;
            let mediaPath = null;
            let fallbackName = null;
            let resolvedMediaReference = mediaReference;

            console.log(`🔍 Parsing media reference: "${mediaReference}"`);

            if (mediaReference) {
                // Check for path="URL",fallback="name" format (new format)
                const pathMatch = mediaReference.match(/path="([^"]+)"(?:,fallback="([^"]+)")?/);
                console.log(`🔍 Path regex test result:`, pathMatch);
                if (pathMatch) {
                    mediaPath = pathMatch[1];
                    fallbackName = pathMatch[2] || 'ember_image';
                    resolvedMediaReference = mediaReference; // Keep original for display
                    console.log(`✅ Extracted media path: ${mediaPath}, fallback: ${fallbackName}`);
                } else {
                    // Check for id=abc123 format (legacy)
                    const idMatch = mediaReference.match(/id=([a-zA-Z0-9\-_]+)/);
                    console.log(`🔍 ID regex test result:`, idMatch);
                    if (idMatch) {
                        mediaId = idMatch[1];
                        resolvedMediaReference = mediaReference; // Keep original for display
                        console.log(`✅ Extracted media ID: ${mediaId}`);
                    } else {
                        // Check for name="Display Name" format (legacy)
                        const nameMatch = mediaReference.match(/name="([^"]+)"/);
                        console.log(`🔍 Name regex test result:`, nameMatch);
                        if (nameMatch) {
                            mediaName = nameMatch[1];
                            resolvedMediaReference = mediaReference; // Keep original for display
                            console.log(`✅ Extracted media name: ${mediaName}`);
                        } else {
                            // If no path=, id=, or name= format, treat as legacy media reference
                            mediaId = mediaReference;
                            console.log(`🔄 Using legacy media reference: ${mediaId}`);
                        }
                    }
                }
            }

            // Reconstruct content with visual actions FOR DISPLAY
            const allVisualActions = existingVisualActions.map(action => `<${action}>`).join('');
            const finalContent = mediaReference ? `${mediaReference} ${allVisualActions}`.trim() : allVisualActions;

            // Handle LOAD SCREEN segments differently
            if (mediaType === 'LOAD SCREEN') {
                // Parse LOAD SCREEN attributes: message, duration, icon
                let loadMessage = 'Loading...';
                let loadDuration = 2.0;
                let loadIcon = 'default';

                // Extract message
                const messageMatch = content.match(/message="([^"]+)"/);
                if (messageMatch) {
                    loadMessage = messageMatch[1];
                }

                // Extract duration
                const durationMatch = content.match(/duration=([0-9.]+)/);
                if (durationMatch) {
                    loadDuration = parseFloat(durationMatch[1]);
                }

                // Extract icon
                const iconMatch = content.match(/icon="([^"]+)"/);
                if (iconMatch) {
                    loadIcon = iconMatch[1];
                }

                segments.push({
                    voiceTag: 'System',
                    content: finalContent,
                    originalContent: content,
                    type: 'loadscreen',
                    visualActions: existingVisualActions,
                    hasAutoColorize: false,
                    // LOAD SCREEN specific properties
                    loadMessage: loadMessage,
                    loadDuration: loadDuration,
                    loadIcon: loadIcon,
                    // Add voice configuration
                    voiceConfiguration: voiceConfiguration
                });

                console.log(`🎬 Parsed LOAD SCREEN segment:`, {
                    line: trimmedLine,
                    message: loadMessage,
                    duration: loadDuration,
                    icon: loadIcon,
                    type: 'loadscreen'
                });
            } else if (finalContent || existingVisualActions.length > 0) {
                // Handle MEDIA and HOLD segments
                const segmentType = mediaType.toLowerCase(); // 'media' or 'hold'
                segments.push({
                    voiceTag: mediaType,
                    content: finalContent,
                    originalContent: mediaReference,
                    type: segmentType,
                    visualActions: existingVisualActions,
                    hasAutoColorize: false,
                    // Add media reference resolution data
                    mediaId: mediaId,
                    mediaName: mediaName,
                    mediaPath: mediaPath,
                    fallbackName: fallbackName,
                    resolvedMediaReference: resolvedMediaReference,
                    // Add voice configuration
                    voiceConfiguration: voiceConfiguration
                });
                console.log(`🎬 Parsed ${mediaType} segment:`, {
                    line: trimmedLine,
                    finalContent,
                    mediaReference,
                    visualActions: existingVisualActions.length,
                    type: segmentType,
                    mediaId: mediaId,
                    mediaName: mediaName,
                    resolvedMediaReference: resolvedMediaReference
                });

                // 🐛 HOLD SPECIFIC DEBUG
                if (segmentType === 'hold') {
                    console.log(`🔍 HOLD SEGMENT DEBUG:`, {
                        originalInput: trimmedLine,
                        extractedContent: content,
                        cleanContent: cleanContent,
                        mediaReference: mediaReference,
                        visualActions: existingVisualActions,
                        allVisualActions: allVisualActions,
                        finalContent: finalContent,
                        passedCondition: (finalContent || existingVisualActions.length > 0)
                    });
                }
            } else {
                console.log(`❌ SKIPPED ${mediaType} segment - no content or visual actions:`, {
                    finalContent,
                    existingVisualActionsLength: existingVisualActions.length
                });
            }
        } else {
            // Match voice tags with optional voice ID and preference: [voiceTag - voice_id:preference] or [voiceTag:preference] or [voiceTag]
            const voiceMatch = trimmedLine.match(/^\[([^:\]]+)(?::([^:\]]+))?\]\s*(.+)$/);

            if (voiceMatch) {
                console.log(`🔍 Voice match found:`, {
                    fullMatch: voiceMatch[0],
                    voiceTag: voiceMatch[1],
                    preference: voiceMatch[2] || 'text',
                    content: voiceMatch[3]
                });

                // Extract voice ID from voice tag if present (format: "voiceTag - voice_id")
                const voiceTagFull = voiceMatch[1].trim();
                const voiceIdMatch = voiceTagFull.match(/^(.+)\s*-\s*([a-zA-Z0-9]+)$/);
                let voiceTag, voiceId;

                if (voiceIdMatch) {
                    voiceTag = voiceIdMatch[1].trim();
                    voiceId = voiceIdMatch[2].trim();
                    console.log(`🎤 Extracted inline voice ID: ${voiceTag} → ${voiceId}`);
                } else {
                    voiceTag = voiceTagFull;
                    voiceId = null;
                    console.log(`🎤 No inline voice ID found for: ${voiceTag}`);
                }

                const preference = voiceMatch[2]?.trim() || 'text'; // Default to 'text' if no preference
                let content = voiceMatch[3].trim();
                const voiceType = getVoiceType(voiceTag);

                // Extract visual actions (but NOT media references like <name="file.jpg">, <id=abc123>, or <path="url">)
                // Also ignore color overlay commands for voice segments
                const existingVisualActions = [];
                let cleanContent = content.replace(/\<([^>]+)\>/g, (match, action) => {
                    // Don't treat media references as visual actions
                    if (action.startsWith('name=') || action.startsWith('id=') || action.startsWith('path=')) {
                        return match; // Keep media references in the content
                    }
                    // Skip color overlay commands for voice segments (COLOR:, TRAN:)
                    if (action.startsWith('COLOR:') || action.startsWith('TRAN:')) {
                        return ''; // Remove color overlay commands
                    }
                    // Only extract actual visual actions (zoom, etc.)
                    existingVisualActions.push(action);
                    return '';
                }).trim();

                // No automatic colorization - removed color overlay system

                // Reconstruct content with visual actions FOR DISPLAY
                const allVisualActions = existingVisualActions.map(action => `<${action}>`).join('');
                const finalContent = `${allVisualActions} ${cleanContent}`.trim();

                if (cleanContent) {
                    // Create voice configuration with inline voice ID
                    const segmentVoiceConfig = { ...voiceConfiguration };
                    if (voiceId) {
                        segmentVoiceConfig[voiceType] = voiceId;
                    }
                    
                    segments.push({
                        voiceTag,
                        content: finalContent, // For display (includes visual actions)
                        originalContent: cleanContent, // For audio synthesis (clean text only)
                        type: voiceType,
                        visualActions: existingVisualActions,
                        hasAutoColorize: false, // No auto-colorization anymore
                        // Add voice configuration (inline voice ID takes precedence)
                        voiceConfiguration: segmentVoiceConfig,
                        // Add embedded preference from script
                        preference: preference
                    });
                }
            }
        }
    }

    console.log('📝 Parsed script segments:', segments.length, 'segments');
    console.log('🎨 Applied auto-colorization based on voice types:');
    segments.forEach((segment, index) => {
        if (segment.type === 'media' || segment.type === 'hold') {
            console.log(`  ${index + 1}. [[${segment.voiceTag}]] → ${segment.type.toUpperCase()} SEGMENT (${segment.content})`);
        } else if (segment.hasAutoColorize) {
            const colorMap = {
                ember: 'RED (255,0,0,0.2)',
                narrator: 'BLUE (0,0,255,0.2)',
                contributor: 'GREEN (0,255,0,0.2)'
            };
            console.log(`  ${index + 1}. [${segment.voiceTag}] → ${colorMap[segment.type]}`);
        }
    });

    // Remove exact duplicates (but preserve HOLD segments since opening/closing are legitimately the same)
    const uniqueSegments = [];
    const seenSegments = new Set();

    console.log('🔄 Removing duplicates from', segments.length, 'segments...');

    segments.forEach((segment, index) => {
        // Skip duplicate removal for HOLD segments - opening and closing are expected to be the same
        if (segment.type === 'hold') {
            uniqueSegments.push(segment);
            console.log(`  ✅ Kept HOLD segment ${index + 1}: [[${segment.voiceTag}]] "${segment.content.substring(0, 50)}..." (skipping duplicate check)`);
            return;
        }

        const key = `${segment.type}-${segment.voiceTag}-${segment.content}`;
        console.log(`🔍 Checking segment ${index + 1}: Key="${key.substring(0, 50)}..."`);

        if (seenSegments.has(key)) {
            console.warn('⚠️ Removing duplicate segment:', {
                index: index + 1,
                key: key.substring(0, 100),
                segment: `${(segment.type === 'media' || segment.type === 'hold') ? '[[' + segment.voiceTag + ']]' : '[' + segment.voiceTag + ']'} ${segment.content.substring(0, 50)}...`
            });
        } else {
            seenSegments.add(key);
            uniqueSegments.push(segment);
            console.log(`  ✅ Kept segment ${index + 1}: ${(segment.type === 'media' || segment.type === 'hold') ? '[[' + segment.voiceTag + ']]' : '[' + segment.voiceTag + ']'} "${segment.content.substring(0, 50)}..."`);
        }
    });

    console.log(`📝 Removed ${segments.length - uniqueSegments.length} duplicate segments`);
    console.log('📝 Final unique segments order:');
    uniqueSegments.forEach((segment, index) => {
        console.log(`  ${index + 1}. ${(segment.type === 'media' || segment.type === 'hold') ? '[[' + segment.voiceTag + ']]' : '[' + segment.voiceTag + ']'} "${segment.content.substring(0, 30)}..."`);
    });

    // 🚨 CRITICAL DEBUG: Count HOLD segments specifically
    const holdSegments = uniqueSegments.filter(seg => seg.type === 'hold');
    console.log(`🚨 HOLD SEGMENTS COUNT: ${holdSegments.length}`);
    holdSegments.forEach((holdSeg, index) => {
        console.log(`  🚨 HOLD ${index + 1}: "${holdSeg.content}" (type: ${holdSeg.type}, voiceTag: ${holdSeg.voiceTag})`);
    });

    return uniqueSegments;
};

/**
 * Parse text into sentences for synchronized display
 * @param {string} text - Text to parse into sentences
 * @returns {Array} Array of sentences
 */
export const parseSentences = (text) => {
    if (!text) return [];

    // Split by sentence-ending punctuation, keeping the punctuation
    const sentences = text.split(/([.!?]+)/).filter(s => s.trim()).reduce((acc, part, index, array) => {
        if (index % 2 === 0) {
            // This is the text part
            const nextPart = array[index + 1];
            const sentence = nextPart ? part + nextPart : part;
            if (sentence.trim()) {
                acc.push(sentence.trim());
            }
        }
        return acc;
    }, []);

    // If no sentences found, return the whole text as one sentence
    if (sentences.length === 0) {
        return [text.trim()];
    }

    return sentences;
};

/**
 * Estimate timing for sentence display within an audio segment
 * @param {Array} sentences - Array of sentences
 * @param {number} totalDuration - Total duration in seconds
 * @returns {Array} Array of sentence timing objects
 */
export const estimateSentenceTimings = (sentences, totalDuration) => {
    if (!sentences || sentences.length === 0) return [];

    // Simple estimation: divide time proportionally by sentence length
    const totalCharacters = sentences.reduce((sum, sentence) => sum + sentence.length, 0);
    let accumulatedTime = 0;

    return sentences.map((sentence, index) => {
        const sentenceWeight = sentence.length / totalCharacters;
        const sentenceStartTime = accumulatedTime;
        const sentenceDuration = totalDuration * sentenceWeight;

        accumulatedTime += sentenceDuration;

        return {
            sentence,
            startTime: sentenceStartTime,
            duration: sentenceDuration,
            index
        };
    });
};

/**
 * Determine voice type for segment
 * @param {string} voiceTag - Voice tag to analyze
 * @returns {string} Voice type: 'ember', 'narrator', or 'contributor'
 */
export const getVoiceType = (voiceTag) => {
    // Use flexible matching to handle variations like "Ember Voice (voice_name)"
    const lowerTag = voiceTag.toLowerCase().trim();

    // More robust ember voice detection
    if (lowerTag.includes('ember') || lowerTag === 'ember voice' || lowerTag.startsWith('ember ')) {
        console.log(`✅ Detected EMBER voice: "${voiceTag}"`);
        return 'ember';
    }

    // More robust narrator detection
    if (lowerTag.includes('narrator') || lowerTag === 'narrator' || lowerTag.startsWith('narrator ')) {
        console.log(`✅ Detected NARRATOR voice: "${voiceTag}"`);
        return 'narrator';
    }

    // Everything else is a contributor (user name)
    console.log(`✅ Detected CONTRIBUTOR voice: "${voiceTag}"`);
    return 'contributor';
};

/**
 * Helper function to extract HEX color from COLOR action
 * @param {string} action - Action string to parse
 * @returns {string|null} Hex color string or null
 */
export const extractColorFromAction = (action) => {
    // Support both old format (color=#FF0000) and new format (:FF0000)
    const colorMatch = action.match(/(?:color=|:)#([A-Fa-f0-9]{3,6})/);
    if (colorMatch) {
        const hex = colorMatch[1];
        // Convert 3-digit to 6-digit hex if needed
        if (hex.length === 3) {
            return `#${hex.split('').map(char => char + char).join('')}`;
        }
        return `#${hex}`;
    }
    return null;
};

/**
 * Helper function to extract transparency value from TRAN action
 * @param {string} action - Action string to parse
 * @returns {number} Transparency value between 0 and 1
 */
export const extractTransparencyFromAction = (action) => {
    const transparencyMatch = action.match(/TRAN:([0-9.]+)/);
    if (transparencyMatch) {
        const value = parseFloat(transparencyMatch[1]);
        // Clamp between 0 and 1
        return Math.max(0, Math.min(1, value));
    }
    return 0.2; // Default transparency
};

/**
 * Helper function to extract scale values from Z-OUT action
 * @param {string} action - Action string to parse
 * @returns {Object} Object with start and end scale values
 */
export const extractZoomScaleFromAction = (action) => {
    const scaleMatch = action.match(/scale=([0-9.]+)/);
    if (scaleMatch) {
        const endScale = parseFloat(scaleMatch[1]);
        // Start scale is typically larger for zoom-in effect (reverse of zoom-out)
        // If script specifies scale=0.7, we zoom FROM larger TO 0.7
        const startScale = Math.max(1.2, endScale * 2.0); // More dramatic zoom effect
        return { start: startScale, end: endScale };
    }
    // Default zoom: subtle zoom-in effect (no zoom out)
    return { start: 1.1, end: 1.0 };
};

/**
 * Helper function to extract fade values from FADE-IN/FADE-OUT actions
 * @param {string} action - Action string to parse
 * @returns {Object|null} Object with fade type and duration, or null if no fade
 */
export const extractFadeFromAction = (action) => {
    // Check for FADE-IN with duration
    const fadeInMatch = action.match(/FADE-IN:duration=([0-9.]+)/);
    if (fadeInMatch) {
        const duration = parseFloat(fadeInMatch[1]);
        return {
            type: 'in',
            duration: duration, // Use exact duration from slider
            startOpacity: 0,
            endOpacity: 1
        };
    }

    // Check for FADE-OUT with duration
    const fadeOutMatch = action.match(/FADE-OUT:duration=([0-9.]+)/);
    if (fadeOutMatch) {
        const duration = parseFloat(fadeOutMatch[1]);
        return {
            type: 'out',
            duration: duration, // Use exact duration from slider
            startOpacity: 1,
            endOpacity: 0
        };
    }

    return null; // No fade effect found
};

/**
 * Helper function to extract pan values from PAN-LEFT/PAN-RIGHT actions
 * @param {string} action - Action string to parse
 * @returns {Object|null} Object with pan direction and duration, or null if no pan
 */
export const extractPanFromAction = (action) => {
    // Check for PAN-LEFT with duration
    const panLeftMatch = action.match(/PAN-LEFT:duration=([0-9.]+)/);
    if (panLeftMatch) {
        const duration = parseFloat(panLeftMatch[1]);
        return {
            type: 'left',
            duration: duration, // Use exact duration from slider
            direction: 'left'
        };
    }

    // Check for PAN-RIGHT with duration
    const panRightMatch = action.match(/PAN-RIGHT:duration=([0-9.]+)/);
    if (panRightMatch) {
        const duration = parseFloat(panRightMatch[1]);
        return {
            type: 'right',
            duration: duration, // Use exact duration from slider
            direction: 'right'
        };
    }

    return null; // No pan effect found
};

/**
 * Helper function to extract zoom values from ZOOM-IN/ZOOM-OUT actions
 * @param {string} action - Action string to parse
 * @returns {Object|null} Object with zoom type and duration, or null if no zoom
 */
export const extractZoomFromAction = (action) => {
    // Check for ZOOM-IN with duration
    const zoomInMatch = action.match(/ZOOM-IN:duration=([0-9.]+)/);
    if (zoomInMatch) {
        const duration = parseFloat(zoomInMatch[1]);
        return {
            type: 'in',
            duration: duration, // Use exact duration from slider
            direction: 'in',
            startScale: 1,
            endScale: 1.5
        };
    }

    // Check for ZOOM-OUT with duration
    const zoomOutMatch = action.match(/ZOOM-OUT:duration=([0-9.]+)/);
    if (zoomOutMatch) {
        const duration = parseFloat(zoomOutMatch[1]);
        return {
            type: 'out',
            duration: duration, // Use exact duration from slider
            direction: 'out',
            startScale: 1,
            endScale: 0.7
        };
    }

    return null; // No zoom effect found
};

/**
 * Helper function to estimate segment duration
 * @param {string} content - Content to analyze
 * @param {string} segmentType - Type of segment
 * @returns {string} Estimated duration as string
 */
export const estimateSegmentDuration = (content, segmentType) => {
    // For media, hold, and loadscreen segments, prioritize explicit duration from visual actions
    if (segmentType === 'media' || segmentType === 'hold' || segmentType === 'loadscreen') {
        // Extract duration from any visual action that has it
        const durationMatch = content.match(/duration=([0-9.]+)/);
        if (durationMatch) {
            return parseFloat(durationMatch[1]).toFixed(2);
        }

        // Different defaults for each type
        if (segmentType === 'hold') {
            return "3.00"; // Hold segments default to 3 seconds
        } else if (segmentType === 'loadscreen') {
            return "2.00"; // Load screen segments default to 2 seconds
        } else {
            return "2.00"; // Media segments default to 2 seconds
        }
    }

    // For voice segments, estimate by text length (remove visual actions first)
    const cleanContent = content.replace(/<[^>]+>/g, '').trim();
    const estimatedDuration = Math.max(1, cleanContent.length * 0.08);
    return estimatedDuration.toFixed(2);
};

/**
 * Resolve media reference to actual file URL
 * @param {Object} segment - Media segment with mediaId or mediaName
 * @param {string} emberId - Current ember ID for scoping
 * @returns {Promise<string|null>} - Resolved media URL or null if not found
 */
export const resolveMediaReference = async (segment, emberId) => {
    if (!segment || (!segment.mediaId && !segment.mediaName && !segment.mediaPath)) {
        console.log('⚠️ No media reference to resolve');
        return null;
    }

    try {
        // If we have a direct path, return it immediately (new format)
        if (segment.mediaPath) {
            console.log(`✅ Using direct media path: ${segment.mediaPath}`);
            return segment.mediaPath;
        }

        // Get all available media for this ember (legacy format)
        const [emberPhotos, supportingMedia] = await Promise.all([
            getEmberPhotos(emberId),
            getEmberSupportingMedia(emberId)
        ]);

        console.log(`🔍 Resolving media reference: ${segment.mediaId || segment.mediaName}`);
        console.log(`📸 Available photos: ${emberPhotos.length}`);
        console.log(`📁 Available supporting media: ${supportingMedia.length}`);

        // Search by ID first (more specific)
        if (segment.mediaId) {
            // Check ember photos
            const photoMatch = emberPhotos.find(photo => photo.id === segment.mediaId);
            if (photoMatch) {
                console.log(`✅ Found photo by ID: ${photoMatch.display_name || photoMatch.original_filename}`);
                return photoMatch.storage_url;
            }

            // Check supporting media
            const mediaMatch = supportingMedia.find(media => media.id === segment.mediaId);
            if (mediaMatch) {
                console.log(`✅ Found supporting media by ID: ${mediaMatch.display_name || mediaMatch.file_name}`);
                return mediaMatch.file_url;
            }

            // Legacy: treat mediaId as direct URL if no match found
            console.log(`ℹ️ No ID match found, treating as legacy reference: ${segment.mediaId}`);
            return segment.mediaId;
        }

        // Search by display name
        if (segment.mediaName) {
            // Check ember photos
            const photoMatch = emberPhotos.find(photo =>
                photo.display_name === segment.mediaName ||
                photo.original_filename === segment.mediaName
            );
            if (photoMatch) {
                console.log(`✅ Found photo by name: ${photoMatch.display_name || photoMatch.original_filename}`);
                return photoMatch.storage_url;
            }

            // Check supporting media
            const mediaMatch = supportingMedia.find(media =>
                media.display_name === segment.mediaName ||
                media.file_name === segment.mediaName
            );
            if (mediaMatch) {
                console.log(`✅ Found supporting media by name: ${mediaMatch.display_name || mediaMatch.file_name}`);
                return mediaMatch.file_url;
            }

            console.log(`⚠️ No media found with name: ${segment.mediaName}`);
            return null;
        }

        return null;
    } catch (error) {
        console.error('❌ Error resolving media reference:', error);
        return null;
    }
};

/**
 * Format script for display - simplified for ember script format
 * @param {string} script - Script to format
 * @param {Object} ember - Ember object with ID
 * @param {Object} storyCut - Story cut object
 * @returns {Promise<string>} Formatted script
 */
export const formatScriptForDisplay = async (script, ember, storyCut) => {
    if (!script) return '';

    console.log('🎨 formatScriptForDisplay called (simplified)');
    console.log('🎨 Script preview (first 200 chars):', script.substring(0, 200));

    // Ember script is already properly formatted, just resolve media display names
    console.log('📝 Using ember script format (already processed)...');

    // Get all media for this ember to resolve display names
    try {
        const [emberPhotos, supportingMedia] = await Promise.all([
            getEmberPhotos(ember.id),
            getEmberSupportingMedia(ember.id)
        ]);

        // Simple text replacement for media display names
        let displayScript = script;

        // Replace media ID references with display names
        const mediaIdRegex = /\[\[MEDIA\]\]\s*<[^>]*id=([a-zA-Z0-9\-_]+)[^>]*>/g;
        displayScript = displayScript.replace(mediaIdRegex, (match, mediaId) => {
            console.log(`🔍 Resolving display name for media ID: ${mediaId}`);

            // Search in photos first
            const photoMatch = emberPhotos.find(photo => photo.id === mediaId);
            if (photoMatch) {
                const displayName = photoMatch.display_name || photoMatch.original_filename;
                console.log(`✅ Found photo match: ${displayName}`);
                return match.replace(/id=[a-zA-Z0-9\-_]+/, `name="${displayName}"`);
            }

            // Search in supporting media
            const mediaMatch = supportingMedia.find(media => media.id === mediaId);
            if (mediaMatch) {
                const displayName = mediaMatch.display_name || mediaMatch.file_name;
                console.log(`✅ Found supporting media match: ${displayName}`);
                return match.replace(/id=[a-zA-Z0-9\-_]+/, `name="${displayName}"`);
            }

            console.log(`❌ No match found for media ID: ${mediaId}`);
            return match; // Return unchanged if no match
        });

        console.log('✅ Display script formatting complete');
        return displayScript;

    } catch (error) {
        console.error('❌ Error formatting script for display:', error);
        // Fallback: return script as-is
        return script;
    }
}; 