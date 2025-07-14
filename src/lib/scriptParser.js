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
            const mediaReference = parseMediaReference(mediaContent);

            // Extract visual actions
            const visualActions = extractVisualActions(mediaContent);

            // Create media segment
            const mediaSegment = {
                line: line,
                finalContent: mediaContent,
                mediaReference: mediaReference,
                visualActions: visualActions.length,
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

        // Check for voice segments
        const voiceMatch = line.match(/^\[([^\]]+)\]\s*(.*)$/);
        if (voiceMatch) {
            // Remove excessive debug logging
            // console.log('🔍 Voice match found:', { fullMatch: line, voiceTag: voiceMatch[1], preference: null, content: voiceMatch[2] });

            const voiceTag = voiceMatch[1];
            const content = voiceMatch[2];

            // Extract inline voice ID if present
            const inlineVoiceId = extractInlineVoiceId(voiceTag);

            // Remove excessive debug logging
            // if (inlineVoiceId) {
            //     console.log('🎤 Extracted inline voice ID:', voiceTag, '→', inlineVoiceId);
            // } else {
            //     console.log('🎤 No inline voice ID found for:', voiceTag);
            // }

            // Clean the content
            const cleanContent = cleanTextContent(content);

            // Determine voice type
            let voiceType = 'contributor';
            if (voiceTag.includes('Ember Voice')) {
                voiceType = 'ember';
                // Remove excessive debug logging
                // console.log('✅ Detected EMBER voice:', `"${voiceTag}"`);
            } else if (voiceTag.includes('Narrator')) {
                voiceType = 'narrator';
                // Remove excessive debug logging
                // console.log('✅ Detected NARRATOR voice:', `"${voiceTag}"`);
            } else {
                voiceType = 'contributor';
                // Remove excessive debug logging
                // console.log('✅ Detected CONTRIBUTOR voice:', `"${voiceTag}"`);
            }

            // Extract preference from voice tag
            const preference = extractPreference(voiceTag);

            // Remove excessive debug logging
            // console.log('🐛 SEGMENT DEBUG - Creating segment for [' + voiceTag + ']:');
            // console.log('🐛   Original line:', line);
            // console.log('🐛   Extracted content:', content);
            // console.log('🐛   Clean content:', cleanContent);
            // console.log('🐛   Final content:', cleanContent);
            // console.log('🐛   Voice type:', voiceType);
            // console.log('🐛   Voice ID:', inlineVoiceId);

            // Create voice segment
            const voiceSegment = {
                line: line,
                finalContent: cleanContent,
                originalContent: cleanContent,
                content: cleanContent,
                voiceTag: voiceTag.replace(/:.*$/, ''), // Remove preference suffix for name matching
                voiceType: voiceType,
                voiceId: inlineVoiceId,
                preference: preference,
                speaker: extractSpeakerName(voiceTag),
                type: voiceType,
                visualActions: 0,
                visualActionsList: []
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

// Helper function to parse media references
function parseMediaReference(content) {
    if (!content) return '';

    // Check for path="URL",fallback="name" format
    const pathMatch = content.match(/path="([^"]+)"(?:,fallback="([^"]+)")?/);
    if (pathMatch) {
        return content; // Return original format
    }

    // Check for id=abc123 format
    const idMatch = content.match(/id=([a-zA-Z0-9\-_]+)/);
    if (idMatch) {
        return content; // Return original format
    }

    // Check for name="Display Name" format
    const nameMatch = content.match(/name="([^"]+)"/);
    if (nameMatch) {
        return content; // Return original format
    }

    return content; // Return as-is if no specific format
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

// Helper function to extract preference from voice tag
function extractPreference(voiceTag) {
    const preferenceMatch = voiceTag.match(/:([^:]+)$/);
    return preferenceMatch ? preferenceMatch[1].trim() : 'text';
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