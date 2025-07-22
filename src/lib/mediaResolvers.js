import { getEmberPhotos } from '@/lib/photos';
import { getEmberSupportingMedia } from '@/lib/database';

/**
 * Resolve media reference to actual file URL
 * Extracted from scriptParser.js to avoid unnecessary dependencies
 * @param {Object} segment - Media segment with mediaId or mediaName
 * @param {string} emberId - Current ember ID for scoping
 * @returns {Promise<string|null>} - Resolved media URL or null if not found
 */
export const resolveMediaReference = async (segment, emberId) => {
    if (!segment || (!segment.media_id && !segment.media_name && !segment.media_url)) {
        console.log('⚠️ No media reference to resolve');
        return null;
    }

    try {
        // If we have a direct URL, return it immediately (new format)
        if (segment.media_url) {
            console.log(`✅ Using direct media URL: ${segment.media_url}`);
            return segment.media_url;
        }

        // Get all available media for this ember (legacy format)
        let emberPhotos = [];
        let supportingMedia = [];

        // Try to fetch photos and supporting media
        [emberPhotos, supportingMedia] = await Promise.all([
            getEmberPhotos(emberId),
            getEmberSupportingMedia(emberId)
        ]);

        console.log(`🔍 Resolving media reference: ${segment.media_id || segment.media_name}`);
        console.log(`📸 Available photos: ${emberPhotos.length}`);
        console.log(`📁 Available supporting media: ${supportingMedia.length}`);

        // Search by ID first (more specific)
        if (segment.media_id) {
            // Check ember photos
            const photoMatch = emberPhotos.find(photo => photo.id === segment.media_id);
            if (photoMatch) {
                console.log(`✅ Found photo by ID: ${photoMatch.display_name || photoMatch.original_filename}`);
                return photoMatch.storage_url;
            }

            // Check supporting media
            const mediaMatch = supportingMedia.find(media => media.id === segment.media_id);
            if (mediaMatch) {
                console.log(`✅ Found supporting media by ID: ${mediaMatch.display_name || mediaMatch.file_name}`);
                return mediaMatch.file_url;
            }

            // Check if we should fallback to main ember image
            // This handles: 1) No media library access, 2) Media ID not found in available media
            if ((emberPhotos.length === 0 && supportingMedia.length === 0) ||
                (!photoMatch && !mediaMatch)) {
                console.log('📸 No media library found or media ID not found - attempting fallback to main ember image...');
                try {
                    const { getEmber } = await import('./database');
                    const emberData = await getEmber(emberId);
                    if (emberData?.image_url) {
                        console.log('✅ Using main ember image as media fallback:', emberData.image_url);
                        return emberData.image_url;
                    }
                } catch (emberError) {
                    console.warn('⚠️ Could not get main ember image for fallback:', emberError);
                }
            }

            // Legacy: treat media_id as direct URL if no match found and no fallback available
            console.log(`ℹ️ No ID match found, treating as legacy reference: ${segment.media_id}`);
            return segment.media_id;
        }

        // Search by display name
        if (segment.media_name) {
            // Check ember photos
            const photoMatch = emberPhotos.find(photo =>
                photo.display_name === segment.media_name ||
                photo.original_filename === segment.media_name
            );
            if (photoMatch) {
                console.log(`✅ Found photo by name: ${photoMatch.display_name || photoMatch.original_filename}`);
                return photoMatch.storage_url;
            }

            // Check supporting media
            const mediaMatch = supportingMedia.find(media =>
                media.display_name === segment.media_name ||
                media.file_name === segment.media_name
            );
            if (mediaMatch) {
                console.log(`✅ Found supporting media by name: ${mediaMatch.display_name || mediaMatch.file_name}`);
                return mediaMatch.file_url;
            }

            console.log(`⚠️ No media found with name: ${segment.media_name}`);
            return null;
        }

        return null;
    } catch (error) {
        console.error('❌ Error resolving media reference:', error);
        return null;
    }
}; 