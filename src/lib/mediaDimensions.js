/**
 * Media Dimensions Utility
 * Gets image dimensions from stored metadata instead of DOM queries
 */

import { getEmberPhotos } from '@/lib/photos';
import { getEmberSupportingMedia } from '@/lib/database';

/**
 * Get image dimensions from stored metadata
 * @param {string} mediaId - Media ID to look up
 * @param {string} emberId - Ember ID for scoping the search
 * @returns {Promise<{width: number, height: number}|null>} - Image dimensions or null
 */
export const getMediaDimensions = async (mediaId, emberId) => {
    try {
        console.log(`🔍 Getting dimensions for media ID: ${mediaId}`);

        // Get all available media for this ember
        const [emberPhotos, supportingMedia] = await Promise.all([
            getEmberPhotos(emberId),
            getEmberSupportingMedia(emberId)
        ]);

        // Search ember photos first
        const photo = emberPhotos.find(p => p.id === mediaId);
        if (photo && photo.image_width && photo.image_height) {
            console.log(`✅ Found photo dimensions: ${photo.image_width}x${photo.image_height}`);
            return {
                width: photo.image_width,
                height: photo.image_height
            };
        }

        // Search supporting media
        const media = supportingMedia.find(m => m.id === mediaId);
        if (media && media.image_width && media.image_height) {
            console.log(`✅ Found supporting media dimensions: ${media.image_width}x${media.image_height}`);
            return {
                width: media.image_width,
                height: media.image_height
            };
        }

        console.log(`⚠️ No dimensions found for media ID: ${mediaId}`);
        return null;
    } catch (error) {
        console.error('❌ Error getting media dimensions:', error);
        return null;
    }
};

/**
 * Get dimensions by media URL (fallback method)
 * @param {string} mediaUrl - Media URL to match
 * @param {string} emberId - Ember ID for scoping the search
 * @returns {Promise<{width: number, height: number}|null>} - Image dimensions or null
 */
export const getMediaDimensionsByUrl = async (mediaUrl, emberId) => {
    try {
        console.log(`🔍 Getting dimensions for media URL: ${mediaUrl}`);

        // Get all available media for this ember
        const [emberPhotos, supportingMedia] = await Promise.all([
            getEmberPhotos(emberId),
            getEmberSupportingMedia(emberId)
        ]);

        // Search ember photos by URL
        const photo = emberPhotos.find(p => p.storage_url === mediaUrl);
        if (photo && photo.image_width && photo.image_height) {
            console.log(`✅ Found photo dimensions by URL: ${photo.image_width}x${photo.image_height}`);
            return {
                width: photo.image_width,
                height: photo.image_height
            };
        }

        // Search supporting media by URL
        const media = supportingMedia.find(m => m.file_url === mediaUrl);
        if (media && media.image_width && media.image_height) {
            console.log(`✅ Found supporting media dimensions by URL: ${media.image_width}x${media.image_height}`);
            return {
                width: media.image_width,
                height: media.image_height
            };
        }

        console.log(`⚠️ No dimensions found for media URL: ${mediaUrl}`);
        return null;
    } catch (error) {
        console.error('❌ Error getting media dimensions by URL:', error);
        return null;
    }
};

/**
 * Convert natural coordinates to percentage-based coordinates
 * @param {number} coord - Coordinate in natural dimensions
 * @param {number} dimension - Total dimension (width or height)
 * @returns {number} - Percentage (0-100)
 */
export const toPercent = (coord, dimension) => {
    if (!dimension || dimension === 0) return 50; // Default to center
    return Math.max(0, Math.min(100, (coord / dimension) * 100));
};

/**
 * Convert percentage coordinates to natural coordinates
 * @param {number} percent - Percentage (0-100)
 * @param {number} dimension - Total dimension (width or height)
 * @returns {number} - Coordinate in natural dimensions
 */
export const fromPercent = (percent, dimension) => {
    if (!dimension || dimension === 0) return 0;
    return Math.max(0, Math.min(dimension, (percent / 100) * dimension));
};

/**
 * Validate coordinates against image dimensions
 * @param {Object} coords - Coordinates to validate {x, y}
 * @param {Object} dimensions - Image dimensions {width, height}
 * @returns {boolean} - True if coordinates are valid
 */
export const validateCoordinates = (coords, dimensions) => {
    if (!coords || !dimensions) return false;
    if (!coords.x || !coords.y || !dimensions.width || !dimensions.height) return false;

    return coords.x >= 0 && coords.x <= dimensions.width &&
        coords.y >= 0 && coords.y <= dimensions.height;
}; 