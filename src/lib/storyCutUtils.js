// Helper function to get arrow button colors based on block type
export const getArrowButtonColors = (block) => {
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

// Helper function to format duration from seconds to readable format
export const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins > 0) {
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }
    return `${secs} sec`;
};

// Helper function to group blocks by type for display
export const groupBlocksByType = (blocks) => {
    return {
        mediaBlocks: blocks.filter(block => block.type === 'media'),
        voiceBlocks: blocks.filter(block => block.type === 'voice'),

        loadScreenBlocks: blocks.filter(block => block.type === 'loadscreen')
    };
};

// Helper function to get contributor avatar data
export const getContributorAvatarData = (voiceTag, contributors) => {
    // Find contributor by first name (voice tag is typically the first name)
    const contributor = contributors.find(c =>
        c.first_name && c.first_name.toLowerCase() === voiceTag.toLowerCase().trim()
    );

    if (contributor) {
        console.log(`✅ Found contributor data for ${voiceTag} via name matching:`, contributor);
        return {
            avatarUrl: contributor.avatar_url || null,
            firstName: contributor.first_name,
            lastName: contributor.last_name,
            email: contributor.email,
            fallbackText: contributor.first_name?.[0] || contributor.last_name?.[0] || contributor.email?.[0]?.toUpperCase() || voiceTag[0]?.toUpperCase() || '?'
        };
    }

    console.log(`⚠️ No contributor found for ${voiceTag} via name matching, using defaults`);
    return {
        avatarUrl: null, // Will fall back to UI placeholder handling
        firstName: voiceTag,
        lastName: null,
        email: null,
        fallbackText: voiceTag[0]?.toUpperCase() || '?'
    };
}; 