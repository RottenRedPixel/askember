/**
 * Date and time utility functions
 * Extracted from EmberDetail.jsx to improve maintainability
 */

/**
 * Format a date string as relative time (e.g., "2 hours ago", "Just now")
 * @param {string} dateString - ISO date string
 * @returns {string} Formatted relative time string
 */
export const formatRelativeTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now - date) / (1000 * 60));

    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes} minute${diffInMinutes === 1 ? '' : 's'} ago`;

    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours} hour${diffInHours === 1 ? '' : 's'} ago`;

    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays} day${diffInDays === 1 ? '' : 's'} ago`;

    return date.toLocaleDateString();
};

/**
 * Format duration in seconds to mm:ss format
 * @param {number} seconds - Duration in seconds
 * @returns {string} Formatted duration string (e.g., "2:30")
 */
export const formatDuration = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
};

/**
 * Format a timestamp for display in carousel cards
 * @param {string} timestamp - ISO timestamp string
 * @returns {string|null} Formatted date string or null if invalid
 */
export const formatDisplayDate = (timestamp) => {
    if (!timestamp) return null;

    try {
        const date = new Date(timestamp);
        if (isNaN(date.getTime())) return null;

        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    } catch (error) {
        console.error('Error formatting date:', error);
        return null;
    }
};

/**
 * Format location data for display in carousel cards
 * @param {Object} ember - Ember object containing location data
 * @returns {string|null} Formatted location string or null if no location
 */
export const formatDisplayLocation = (ember) => {
    if (!ember) return null;

    // Use structured location data (City, State, Country)
    if (ember.city || ember.state || ember.country) {
        const locationParts = [];

        if (ember.city && ember.city.trim()) {
            locationParts.push(ember.city.trim());
        }
        if (ember.state && ember.state.trim()) {
            locationParts.push(ember.state.trim());
        }
        if (ember.country && ember.country.trim()) {
            locationParts.push(ember.country.trim());
        }

        if (locationParts.length > 0) {
            return locationParts.join(', ');
        }
    }

    // Fall back to manual location (free text entry)
    if (ember.manual_location && ember.manual_location.trim()) {
        return ember.manual_location.trim();
    }

    // Fall back to GPS coordinates as last resort
    if (ember.latitude && ember.longitude) {
        const lat = parseFloat(ember.latitude).toFixed(4);
        const lng = parseFloat(ember.longitude).toFixed(4);
        return `${lat}, ${lng}`;
    }

    return null;
}; 