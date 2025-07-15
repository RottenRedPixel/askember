import { getEmberPhotos } from '@/lib/photos';
import { getEmberSupportingMedia } from '@/lib/database';

/**
 * Script parsing utility functions
 * Extracted from EmberDetail.jsx to improve maintainability
 */

// Enhanced Sacred Format regex that handles flexible spacing around pipes
const SACRED_FORMAT_REGEX = /\[([^|]+?)\s*\|\s*([^|]+?)\s*\|\s*([^\]]+?)\]\s*<([^>]*)>/g;

/**
 * Parse sacred format voice line: [NAME | preference | ID] <content>
 * @param {string} line - Line to parse
 * @returns {Object|null} Parsed sacred data or null if not sacred format
 */
const parseSacredVoiceLine = (line) => {
    // Reset regex for each use (global flag requires this)
    SACRED_FORMAT_REGEX.lastIndex = 0;

    // Match sacred format with flexible spacing: [NAME | preference | ID] <content>
    const sacredMatch = SACRED_FORMAT_REGEX.exec(line);
    if (sacredMatch) {
        const name = sacredMatch[1].trim();
        const preference = sacredMatch[2].trim();
        const contributionId = sacredMatch[3].trim() || null;
        const content = sacredMatch[4].trim();

        return {
            name,
            preference,
            contributionId,
            content,
            sacredData: `${name} | ${preference} | ${contributionId || ''}`,
            format: 'sacred',
            voiceType: determineSacredVoiceType(name)
        };
    }
    return null;
};

/**
 * Parse legacy format voice line: [NAME:preference:ID] content or [NAME:preference] content
 * @param {string} line - Line to parse  
 * @returns {Object|null} Parsed legacy data or null if not legacy format
 */
const parseLegacyVoiceLine = (line) => {
    // Match legacy format: [NAME:preference:ID] content or [NAME:preference] content
    const legacyMatch = line.match(/^\[([^\]]+)\]\s*(.*)$/);
    if (legacyMatch) {
        const voiceTag = legacyMatch[1];
        const content = legacyMatch[2].trim();

        // Extract preference and message ID from voice tag (existing logic)
        const { preference, messageId } = extractPreferenceAndMessageId(voiceTag);

        // Extract base name (remove preference and ID suffixes)
        const name = voiceTag.replace(/:.*$/, '').trim();

        return {
            name,
            preference,
            contributionId: messageId,
            content,
            sacredData: null, // Legacy format doesn't have structured sacred data
            format: 'legacy',
            voiceType: determineLegacyVoiceType(voiceTag)
        };
    }
    return null;
};

/**
 * Determine voice type from sacred format name
 * @param {string} name - Name from sacred format
 * @returns {string} Voice type: 'ember', 'narrator', 'media', or 'contributor'
 */
const determineSacredVoiceType = (name) => {
    const lowerName = name.toLowerCase().trim();

    if (lowerName === 'ember voice' || lowerName === 'ember') {
        return 'ember';
    } else if (lowerName === 'narrator') {
        return 'narrator';
    } else if (lowerName === 'media') {
        return 'media';
    } else {
        return 'contributor';
    }
};

/**
 * Determine voice type from legacy format voice tag (preserve existing logic)
 * @param {string} voiceTag - Legacy voice tag
 * @returns {string} Voice type: 'ember', 'narrator', or 'contributor'
 */
const determineLegacyVoiceType = (voiceTag) => {
    const lowerVoiceTag = voiceTag.toLowerCase();
    if (lowerVoiceTag.includes('ember voice') || lowerVoiceTag.includes('ember')) {
        return 'ember';
    } else if (lowerVoiceTag.includes('narrator')) {
        return 'narrator';
    } else {
        return 'contributor';
    }
};

/**
 * Parse script into voice segments for multi-voice playback
 * @param {string} script - The script content to parse
 * @returns {Array} Array of script segments
 */
export function parseScriptSegments(script) {
    const lines = script.split('\n');
    const segments = [];

    // Remove excessive debug logging
    // console.log('🔍 parseScriptSegments: Processing', lines.length, 'lines');
    // console.log('🔍 FULL SCRIPT CONTENT:', script);

    lines.forEach((line, index) => {
        // Remove excessive debug logging
        // console.log(`🔍 Line ${index + 1}: "${line}"`);

        if (line.trim() === '') return;

        // Remove excessive debug logging
        // console.log(`🔍 Processing line: "${line.substring(0, 50)}..."`);

        // Check for media references first
        const mediaMatch = line.match(/^\[\[([A-Z]+)\]\]\s*(.*)$/);
        if (mediaMatch) {
            // Remove excessive debug logging
            // console.log('🔍 MEDIA match found:', { fullMatch: line, type: mediaMatch[1], content: mediaMatch[2] });

            const mediaType = mediaMatch[1];
            const mediaContent = mediaMatch[2];

            // Parse media reference
            const parsedMedia = parseMediaReference(mediaContent);

            // Extract visual actions
            const visualActions = extractVisualActions(mediaContent);
            console.log(`🔍 DEBUG: Media content: "${mediaContent}"`);
            console.log(`🔍 DEBUG: Extracted visual actions:`, visualActions);

            // Create media segment
            const mediaSegment = {
                line: line,
                finalContent: mediaContent,
                mediaReference: parsedMedia.mediaReference,
                mediaId: parsedMedia.mediaId,
                mediaName: parsedMedia.mediaName,
                mediaPath: parsedMedia.mediaPath,
                fallbackName: parsedMedia.fallbackName,
                visualActions: visualActions,
                type: mediaType.toLowerCase(),
                originalContent: mediaContent,
                content: mediaContent,
                voiceTag: mediaType,
                voiceType: 'media',
                voiceId: null,
                preference: null,
                speaker: null,
                visualActionsList: visualActions
            };

            // Remove excessive debug logging
            // console.log(`🎬 Parsed ${mediaType} segment:`, mediaSegment);

            segments.push(mediaSegment);
            return;
        }

        // Try to parse as sacred format first
        const sacredData = parseSacredVoiceLine(line);
        if (sacredData) {
            // Create voice segment with sacred format data
            const voiceSegment = {
                line: line,
                finalContent: sacredData.content,
                originalContent: sacredData.content,
                content: sacredData.content,
                voiceTag: sacredData.name,
                voiceType: sacredData.voiceType,
                voiceId: null, // Will be extracted from other sources if needed
                preference: sacredData.preference,
                messageId: sacredData.contributionId,
                contributionId: sacredData.contributionId, // NEW: Direct access to contribution ID
                speaker: sacredData.name,
                type: sacredData.voiceType,
                visualActions: 0,
                visualActionsList: [],
                format: 'sacred',
                sacredData: sacredData.sacredData
            };

            segments.push(voiceSegment);
            return;
        }

        // Fall back to legacy format parsing
        const legacyData = parseLegacyVoiceLine(line);
        if (legacyData) {
            // Extract inline voice ID if present (existing logic)
            const inlineVoiceId = extractInlineVoiceId(legacyData.name);

            // Clean the content (existing logic)
            const cleanContent = cleanTextContent(legacyData.content);

            // Create voice segment with legacy format data
            const voiceSegment = {
                line: line,
                finalContent: cleanContent,
                originalContent: cleanContent,
                content: cleanContent,
                voiceTag: legacyData.name,
                voiceType: legacyData.voiceType,
                voiceId: inlineVoiceId,
                preference: legacyData.preference,
                messageId: legacyData.contributionId,
                contributionId: legacyData.contributionId, // NEW: Also available for legacy
                speaker: extractSpeakerName(legacyData.name),
                type: legacyData.voiceType,
                visualActions: 0,
                visualActionsList: [],
                format: 'legacy',
                sacredData: null
            };

            segments.push(voiceSegment);
        }
    });

    // Remove excessive debug logging
    // console.log('📝 Parsed script segments:', segments.length, 'segments');
    // console.log('🎨 Applied auto-colorization based on voice types:');

    // segments.forEach((segment, index) => {
    //     console.log(`  ${index + 1}. [${segment.voiceTag}] → ${segment.type.toUpperCase()} SEGMENT (${segment.finalContent.substring(0, 50)}...)`);
    // });

    // Remove duplicates
    const uniqueSegments = removeDuplicateSegments(segments);

    return uniqueSegments;
}

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
 * Format script for display - simplified for ember script format with UI-friendly formatting
 * @param {string} script - Script to format
 * @param {Object} ember - Ember object with ID
 * @param {Object} storyCut - Story cut object
 * @returns {Promise<string>} Formatted script with clean display format
 */
export const formatScriptForDisplay = async (script, ember, storyCut) => {
    if (!script) return '';

    console.log('🎨 formatScriptForDisplay called (UI-friendly mode)');
    console.log('🎨 Script preview (first 200 chars):', script.substring(0, 200));

    // Get all media for this ember to resolve display names
    try {
        const [emberPhotos, supportingMedia] = await Promise.all([
            getEmberPhotos(ember.id),
            getEmberSupportingMedia(ember.id)
        ]);

        // Start with media ID resolution (existing functionality)
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

        // NEW: UI-friendly formatting for voice lines
        console.log('🎨 Applying UI-friendly voice line formatting...');

        const lines = displayScript.split('\n');
        const formattedLines = lines.map(line => {
            const trimmedLine = line.trim();
            if (!trimmedLine) return line;

            // Handle sacred format voice lines: [NAME | preference | ID] <content>
            const sacredMatch = trimmedLine.match(/^(\[([^|]+)\|([^|]*)\|([^\]]*)\])\s*<(.+)>$/);
            if (sacredMatch) {
                const [fullMatch, fullVoiceTag, name, preference, messageId, content] = sacredMatch;

                // Hide technical metadata for contributors with recordings
                if (preference === 'recorded' && messageId && messageId !== 'null') {
                    console.log(`🎨 Hiding technical metadata for contributor: ${name}`);
                    // Show clean format: [Name] content (no pipes, no IDs, no brackets)
                    return `[${name.trim()}] ${content}`;
                } else {
                    // For EMBER VOICE, NARRATOR, or contributors without recordings, show clean format
                    return `[${name.trim()}] ${content}`;
                }
            }

            // Handle legacy format voice lines: [NAME] content or [NAME] <content>
            const legacyMatch = trimmedLine.match(/^(\[[^\]]+\])\s*<?([^>]+)>?$/);
            if (legacyMatch) {
                const [fullMatch, voiceTag, content] = legacyMatch;
                // Remove any angle brackets and clean up
                return `${voiceTag} ${content.trim()}`;
            }

            // Handle media and other special blocks (keep as-is)
            if (trimmedLine.startsWith('[[') && trimmedLine.includes(']]')) {
                return line; // Keep media/hold blocks unchanged
            }

            // Return line unchanged if no patterns match
            return line;
        });

        const userFriendlyScript = formattedLines.join('\n');

        console.log('✅ UI-friendly script formatting complete');
        console.log('🎨 Sample output (first 200 chars):', userFriendlyScript.substring(0, 200));

        return userFriendlyScript;

    } catch (error) {
        console.error('❌ Error formatting script for display:', error);
        // Fallback: return script as-is
        return script;
    }
};

/**
 * Reconstruct original script format from user-friendly edited script
 * @param {string} editedScript - User-friendly script that may have been edited
 * @param {string} originalScript - Original script with full metadata
 * @param {Object} storyCut - Story cut object for context
 * @returns {string} Reconstructed script with proper sacred format
 */
export const reconstructScript = (editedScript, originalScript, storyCut = null) => {
    if (!editedScript || !originalScript) return editedScript || originalScript || '';

    console.log('🔧 Reconstructing script from user-friendly format...');
    console.log('🔧 Edited script preview:', editedScript.substring(0, 200));
    console.log('🔧 Original script preview:', originalScript.substring(0, 200));

    // Parse original script to extract metadata mapping
    const originalLines = originalScript.split('\n');
    const metadataMap = new Map();

    originalLines.forEach(line => {
        const trimmedLine = line.trim();
        if (!trimmedLine) return;

        // Extract metadata from sacred format lines
        const sacredMatch = trimmedLine.match(/^(\[([^|]+)\|([^|]*)\|([^\]]*)\])\s*<(.+)>$/);
        if (sacredMatch) {
            const [, fullVoiceTag, name, preference, messageId, content] = sacredMatch;

            // Use content as key to find matching edited lines
            const contentKey = content.trim().toLowerCase();
            metadataMap.set(contentKey, {
                name: name.trim(),
                preference: preference.trim(),
                messageId: messageId.trim(),
                fullVoiceTag,
                originalLine: trimmedLine
            });

            // Also map by name for simpler matching
            const nameKey = `[${name.trim()}]`.toLowerCase();
            if (!metadataMap.has(nameKey)) {
                metadataMap.set(nameKey, {
                    name: name.trim(),
                    preference: preference.trim(),
                    messageId: messageId.trim(),
                    fullVoiceTag,
                    originalLine: trimmedLine
                });
            }
        }
    });

    // Reconstruct script from edited version
    const editedLines = editedScript.split('\n');
    const reconstructedLines = editedLines.map(line => {
        const trimmedLine = line.trim();
        if (!trimmedLine) return line;

        // Check if this is a voice line in simple format: [Name] content
        const simpleVoiceMatch = trimmedLine.match(/^(\[([^\]]+)\])\s*(.+)$/);
        if (simpleVoiceMatch) {
            const [, voiceTag, name, content] = simpleVoiceMatch;

            // Try to find metadata for this voice line
            const nameKey = voiceTag.toLowerCase();
            const contentKey = content.trim().toLowerCase();

            // First try to match by content
            let metadata = null;
            for (const [key, meta] of metadataMap.entries()) {
                if (key.includes(contentKey.substring(0, 30)) || contentKey.includes(key.substring(0, 30))) {
                    metadata = meta;
                    break;
                }
            }

            // If no content match, try by name
            if (!metadata) {
                metadata = metadataMap.get(nameKey);
            }

            if (metadata) {
                // Reconstruct sacred format with original metadata
                console.log(`🔧 Reconstructing sacred format for [${name}]: ${metadata.preference} | ${metadata.messageId}`);
                return `[${metadata.name} | ${metadata.preference} | ${metadata.messageId}] <${content}>`;
            } else {
                // No metadata found, create basic sacred format
                console.log(`🔧 No metadata found for [${name}], creating basic sacred format`);
                return `[${name} | text | null] <${content}>`;
            }
        }

        // For media and other special blocks, keep unchanged
        if (trimmedLine.startsWith('[[') || !trimmedLine.startsWith('[')) {
            return line;
        }

        // Return unchanged if no patterns match
        return line;
    });

    const reconstructedScript = reconstructedLines.join('\n');

    console.log('✅ Script reconstruction complete');
    console.log('🔧 Reconstructed preview:', reconstructedScript.substring(0, 200));

    return reconstructedScript;
};

// Helper function to parse media references
function parseMediaReference(content) {
    if (!content) return { mediaReference: '', mediaId: null, mediaName: null, mediaPath: null };

    // Check for path="URL",fallback="name" format (new format)
    const pathMatch = content.match(/path="([^"]+)"(?:,fallback="([^"]+)")?/);
    if (pathMatch) {
        return {
            mediaReference: content,
            mediaId: null,
            mediaName: null,
            mediaPath: pathMatch[1],
            fallbackName: pathMatch[2] || 'Ember Image'
        };
    }

    // Check for id=abc123 format (legacy)
    const idMatch = content.match(/id=([a-zA-Z0-9\-_]+)/);
    if (idMatch) {
        return {
            mediaReference: content,
            mediaId: idMatch[1],
            mediaName: null,
            mediaPath: null
        };
    }

    // Check for name="Display Name" format (legacy)
    const nameMatch = content.match(/name="([^"]+)"/);
    if (nameMatch) {
        return {
            mediaReference: content,
            mediaId: null,
            mediaName: nameMatch[1],
            mediaPath: null
        };
    }

    // If no specific format, treat as legacy media reference
    return {
        mediaReference: content,
        mediaId: content,
        mediaName: null,
        mediaPath: null
    };
}

// Helper function to extract visual actions
function extractVisualActions(content) {
    const actions = [];
    content.replace(/\<([^>]+)\>/g, (match, action) => {
        // Don't treat media references as visual actions
        if (action.startsWith('name=') || action.startsWith('id=') || action.startsWith('path=')) {
            return match; // Keep media references
        }
        actions.push(action);
        return '';
    });
    return actions;
}

// Helper function to extract inline voice ID
function extractInlineVoiceId(voiceTag) {
    const voiceIdMatch = voiceTag.match(/^(.+)\s*-\s*([a-zA-Z0-9]+)$/);
    if (voiceIdMatch) {
        return voiceIdMatch[2].trim();
    }
    return null;
}

/**
 * Extract preference and message ID from voice tag
 * @param {string} voiceTag - Voice tag like "Amado:recorded:uuid" or "Sarah:text" or "Amado:recorded:2025-07-13T18:14:36.186067+00:00"
 * @returns {Object} { preference, messageId }
 */
const extractPreferenceAndMessageId = (voiceTag) => {
    const parts = voiceTag.split(':');
    if (parts.length >= 2) {
        const preference = parts[1];
        if (parts.length >= 3) {
            const thirdPart = parts[2];
            // Check if it's a UUID (contains hyphens and is 36 characters) or a timestamp (contains T and +)
            if (thirdPart.includes('-') && thirdPart.length === 36 && !thirdPart.includes('T')) {
                // It's a UUID message ID
                return { preference, messageId: thirdPart };
            } else if (thirdPart.includes('T') && thirdPart.includes('+')) {
                // It's a timestamp - this is the old format, ignore it for now
                console.log('⚠️ Found timestamp in voice tag instead of message ID:', thirdPart);
                return { preference, messageId: null };
            } else {
                // Unknown format, treat as message ID
                return { preference, messageId: thirdPart };
            }
        }
        return { preference, messageId: null };
    }
    return { preference: null, messageId: null };
};

/**
 * Extract preference from voice tag (legacy function - now enhanced)
 * @param {string} voiceTag - Voice tag to analyze
 * @returns {string|null} Preference type or null
 */
export const extractPreference = (voiceTag) => {
    const { preference } = extractPreferenceAndMessageId(voiceTag);
    return preference;
};

/**
 * Extract message ID from voice tag
 * @param {string} voiceTag - Voice tag to analyze
 * @returns {string|null} Message ID or null
 */
export const extractMessageId = (voiceTag) => {
    const { messageId } = extractPreferenceAndMessageId(voiceTag);
    return messageId;
};

// Helper function to clean text content
function cleanTextContent(content) {
    // Remove visual actions but keep media references
    return content.replace(/\<([^>]+)\>/g, (match, action) => {
        // Keep media references
        if (action.startsWith('name=') || action.startsWith('id=') || action.startsWith('path=')) {
            return match;
        }
        // Remove visual actions
        return '';
    }).trim();
}

// Helper function to extract speaker name
function extractSpeakerName(voiceTag) {
    // Remove voice ID and preference to get clean speaker name
    const cleanTag = voiceTag.replace(/\s*-\s*[a-zA-Z0-9]+/, '').replace(/:.*$/, '');

    // Extract name from parentheses for voices like "Ember Voice (Lily)"
    const nameMatch = cleanTag.match(/\(([^)]+)\)/);
    if (nameMatch) {
        return nameMatch[1];
    }

    return cleanTag;
}

// Helper function to remove duplicate segments
function removeDuplicateSegments(segments) {
    const uniqueSegments = [];
    const seenSegments = new Set();

    // Remove excessive debug logging
    // console.log('🔄 Removing duplicates from', segments.length, 'segments...');

    segments.forEach((segment, index) => {
        // Skip duplicate removal for HOLD segments
        if (segment.type === 'hold') {
            uniqueSegments.push(segment);
            // Remove excessive debug logging
            // console.log(`  ✅ Kept HOLD segment ${index + 1}: [[${segment.voiceTag}]] "${segment.content.substring(0, 50)}..." (skipping duplicate check)`);
            return;
        }

        const key = `${segment.type}-${segment.voiceTag}-${segment.content}`;
        // Remove excessive debug logging
        // console.log(`🔍 Checking segment ${index + 1}: Key="${key.substring(0, 50)}..."`);

        if (seenSegments.has(key)) {
            // Remove excessive debug logging
            // console.warn('⚠️ Removing duplicate segment:', { index: index + 1, segment: `[${segment.voiceTag}] ${segment.content.substring(0, 50)}...` });
        } else {
            seenSegments.add(key);
            uniqueSegments.push(segment);
            // Remove excessive debug logging
            // console.log(`  ✅ Kept segment ${index + 1}: [${segment.voiceTag}] "${segment.content.substring(0, 50)}..."`);
        }
    });

    // Remove excessive debug logging
    // console.log(`📝 Removed ${segments.length - uniqueSegments.length} duplicate segments`);
    // console.log('📝 Final unique segments order:');
    // uniqueSegments.forEach((segment, index) => {
    //     console.log(`  ${index + 1}. [${segment.voiceTag}] "${segment.content.substring(0, 30)}..."`);
    // });

    return uniqueSegments;
}

/**
 * Extract all sacred data from a script (for preservation during updates)
 * @param {string} script - Script to extract sacred data from
 * @returns {Map} Map of line numbers to sacred data
 */
export const extractAllSacredData = (script) => {
    const lines = script.split('\n');
    const sacredDataMap = new Map();

    lines.forEach((line, index) => {
        const sacredData = parseSacredVoiceLine(line);
        if (sacredData) {
            sacredDataMap.set(index, sacredData);
        }
    });

    return sacredDataMap;
};

/**
 * Convert legacy format line to sacred format
 * @param {string} line - Legacy format line
 * @param {Object} voiceInfo - Voice information (voiceId, voiceName)
 * @returns {string} Sacred format line or original line if can't convert
 */
export const convertLegacyToSacred = (line, voiceInfo = {}) => {
    const legacyData = parseLegacyVoiceLine(line);
    if (!legacyData) return line;

    // Build sacred format
    const name = legacyData.name;
    const preference = legacyData.preference || 'text';
    const contributionId = legacyData.contributionId || 'null';
    const content = legacyData.content;

    return `[${name} | ${preference} | ${contributionId}] <${content}>`;
};

/**
 * Check if a script uses the new sacred format
 * @param {string} script - Script to check
 * @returns {boolean} True if script uses sacred format
 */
export const isSacredFormat = (script) => {
    if (!script) return false;

    const lines = script.split('\n');
    const voiceLines = lines.filter(line => line.trim().startsWith('[') && !line.trim().startsWith('[['));

    if (voiceLines.length === 0) return false;

    // Check if majority of voice lines use sacred format
    const sacredLines = voiceLines.filter(line => parseSacredVoiceLine(line));
    return sacredLines.length > voiceLines.length / 2;
};

/**
 * Preserve sacred data during script generation
 * @param {string} originalScript - Original script with sacred data
 * @param {string} newScript - New script to merge sacred data into
 * @returns {string} Script with sacred data preserved
 */
export const preserveSacredData = (originalScript, newScript) => {
    if (!originalScript || !newScript) return newScript;

    const originalLines = originalScript.split('\n');
    const newLines = newScript.split('\n');
    const preservedLines = [];

    newLines.forEach((newLine, index) => {
        if (newLine.trim().startsWith('[') && !newLine.trim().startsWith('[[')) {
            // This is a voice line - try to preserve sacred data
            const originalSacred = originalLines[index] ? parseSacredVoiceLine(originalLines[index]) : null;

            if (originalSacred) {
                // Extract new content from new line
                const newContent = extractContentFromLine(newLine) || originalSacred.content;
                preservedLines.push(`[${originalSacred.sacredData}] <${newContent}>`);
            } else {
                preservedLines.push(newLine);
            }
        } else {
            preservedLines.push(newLine);
        }
    });

    return preservedLines.join('\n');
};

/**
 * Extract content from any line format
 * @param {string} line - Line to extract content from
 * @returns {string|null} Extracted content or null
 */
const extractContentFromLine = (line) => {
    // Try sacred format first
    const sacredData = parseSacredVoiceLine(line);
    if (sacredData) return sacredData.content;

    // Try legacy format
    const legacyData = parseLegacyVoiceLine(line);
    if (legacyData) return legacyData.content;

    return null;
}; 