/**
 * Style utility functions
 * Extracted from EmberDetail.jsx to improve maintainability
 */

/**
 * Convert database style names to user-friendly display names
 * @param {string} style - Database style name (e.g., "documentary_style")
 * @param {Array} availableStoryStyles - Array of style objects from database
 * @returns {string} User-friendly display name (e.g., "Documentary Style")
 */
export const getStyleDisplayName = (style, availableStoryStyles = []) => {
    // If styles aren't loaded yet, try to provide a readable name
    if (availableStoryStyles.length === 0) {
        // Convert common prompt keys to readable names
        const styleMap = {
            'documentary_style': 'Documentary Style',
            'movie_trailer_style': 'Movie Trailer Style',
            'public_radio_style': 'Public Radio Style',
            'podcast_style': 'Podcast Style',
            'sports_commentary_style': 'Sports Commentary Style',
            'dramatic_monologue_style': 'Dramatic Monologue Style',
            'fairy_tale_style': 'Fairy Tale Style',
            'news_report_style': 'News Report Style',
            // Database format mappings
            'story_style_movie_trailer': 'Movie Trailer',
            'story_style_documentary': 'Documentary',
            'story_style_news_report': 'News Report',
            'story_style_public_radio': 'Public Radio',
            'story_style_podcast_narrative': 'Podcast Narrative'
        };

        return styleMap[style] || style;
    }

    const dbStyle = availableStoryStyles.find(s => s.id === style || s.prompt_key === style);
    return dbStyle ? dbStyle.name : style;
}; 