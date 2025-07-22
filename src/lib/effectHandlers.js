/**
 * Direct effect handling for EmberPlay
 * Replaces string-based parsing with object-based effect application
 */

/**
 * Apply multiple effects to generate combined CSS styles
 * @param {HTMLElement} element - Target element (optional, for transform-origin calculation)
 * @param {Object} effects - Effects object containing fade, pan, zoom
 * @param {Array} taggedPeople - Tagged people for zoom target resolution
 * @param {string} imageUrl - Current image URL for target calculation
 * @returns {Object} Combined CSS styles
 */
export const applyEffectsToElement = (element, effects, taggedPeople = [], imageUrl = null) => {
    const transforms = [];
    let opacity = 1;
    let animation = null;
    let transformOrigin = 'center center';
    let transitionDuration = '0.5s';

    // Handle pan effects
    if (effects.pan && typeof effects.pan === 'object') {
        const direction = effects.pan.type === 'left' ? '-' : '';
        transforms.push(`translateX(${direction}${effects.pan.distance}%)`);
        transitionDuration = `${effects.pan.duration}s`;
    }

    // Handle zoom effects
    if (effects.zoom && typeof effects.zoom === 'object') {
        let finalScale = effects.zoom.scale;

        // For zoom-out, if scale > 1, invert it to create zoom-out effect
        if (effects.zoom.type === 'out' && finalScale > 1) {
            finalScale = 1 / finalScale;
        }

        transforms.push(`scale(${finalScale})`);
        transitionDuration = `${effects.zoom.duration}s`;

        // Calculate transform-origin for zoom targets
        if (effects.zoom.target) {
            transformOrigin = calculateTransformOrigin(effects.zoom.target, taggedPeople, imageUrl);
        }
    }

    // Handle fade effects - use CSS animation
    if (effects.fade && typeof effects.fade === 'object') {
        const duration = effects.fade.duration;
        if (effects.fade.type === 'in') {
            animation = `fadeIn ${duration}s ease-out forwards`;
            opacity = 0; // Start invisible
        } else {
            animation = `fadeOut ${duration}s ease-out forwards`;
            opacity = 1; // Start visible
        }
    }

    // Use the longest duration for transitions
    const panDuration = effects.pan?.duration || 0;
    const zoomDuration = effects.zoom?.duration || 0;
    const maxTransitionDuration = Math.max(panDuration, zoomDuration, 0.5);

    return {
        transform: transforms.length > 0 ? transforms.join(' ') : 'scale(1) translateX(0)',
        transformOrigin,
        opacity,
        animation: animation || 'none',
        transition: animation
            ? `transform ${maxTransitionDuration}s ease-out`
            : `transform ${maxTransitionDuration}s ease-out, opacity ${maxTransitionDuration}s ease-out`
    };
};

/**
 * Calculate transform-origin for zoom targets
 * @param {Object} target - Target object {type, personId, coordinates}
 * @param {Array} taggedPeople - Array of tagged people with face coordinates
 * @param {string} imageUrl - Current image URL
 * @returns {string} CSS transform-origin value
 */
const calculateTransformOrigin = (target, taggedPeople, imageUrl) => {
    if (!target || target.type === 'center') {
        return 'center center';
    }

    if (target.type === 'person' && target.personId) {
        // Find the tagged person by ID
        const person = taggedPeople.find(p => p.id === target.personId);
        if (person && person.face_coordinates) {
            const coords = person.face_coordinates;

            // Get the current media element to calculate natural dimensions
            if (imageUrl) {
                const mediaElement = document.querySelector(`img[src*="${imageUrl.split('/').pop()}"]`);
                if (mediaElement && mediaElement.naturalWidth && mediaElement.naturalHeight &&
                    coords.x >= 0 && coords.y >= 0 &&
                    coords.x <= mediaElement.naturalWidth && coords.y <= mediaElement.naturalHeight) {

                    // Convert pixel coordinates to percentage for transform-origin
                    const originX = (coords.x / mediaElement.naturalWidth) * 100;
                    const originY = (coords.y / mediaElement.naturalHeight) * 100;

                    console.log(`🎯 Zoom target: Person "${person.person_name}" at (${Math.round(originX)}%, ${Math.round(originY)}%)`);
                    return `${originX}% ${originY}%`;
                } else {
                    console.warn(`⚠️ Could not resolve zoom target for person "${person.person_name}" - using center`);
                }
            }
        }
    } else if (target.type === 'custom' && target.coordinates) {
        // Use custom pixel coordinates
        const coords = target.coordinates;

        if (imageUrl) {
            const mediaElement = document.querySelector(`img[src*="${imageUrl.split('/').pop()}"]`);
            if (mediaElement && mediaElement.naturalWidth && mediaElement.naturalHeight &&
                coords.x >= 0 && coords.y >= 0 &&
                coords.x <= mediaElement.naturalWidth && coords.y <= mediaElement.naturalHeight) {

                // Convert pixel coordinates to percentage for transform-origin
                const originX = (coords.x / mediaElement.naturalWidth) * 100;
                const originY = (coords.y / mediaElement.naturalHeight) * 100;

                console.log(`🎯 Zoom target: Custom point at (${Math.round(originX)}%, ${Math.round(originY)}%)`);
                return `${originX}% ${originY}%`;
            } else {
                console.warn(`⚠️ Could not resolve custom zoom target at (${coords.x}, ${coords.y}) - using center`);
            }
        }
    }

    return 'center center';
};

/**
 * Generate effect object from UI state (for StoryCutStudio)
 * @param {Object} uiState - UI state containing effect settings
 * @param {string} blockId - Block ID for effect lookup
 * @returns {Object} Effects object
 */
export const generateEffectObject = (uiState, blockId) => {
    const {
        selectedEffects,
        effectDirections,
        effectDurations,
        effectDistances,
        effectScales,
        effectTargets
    } = uiState;

    const effects = {};
    const blockEffects = selectedEffects[`effect-${blockId}`] || [];

    if (blockEffects.includes('fade')) {
        effects.fade = {
            type: effectDirections[`fade-${blockId}`] || 'in',
            duration: effectDurations[`fade-${blockId}`] || 3.0
        };
    }

    if (blockEffects.includes('pan')) {
        effects.pan = {
            type: effectDirections[`pan-${blockId}`] || 'left',
            distance: effectDistances[`pan-${blockId}`] || 25,
            duration: effectDurations[`pan-${blockId}`] || 4.0
        };
    }

    if (blockEffects.includes('zoom')) {
        const target = effectTargets[`zoom-${blockId}`];
        effects.zoom = {
            type: effectDirections[`zoom-${blockId}`] || 'in',
            scale: effectScales[`zoom-${blockId}`] || 1.5,
            duration: effectDurations[`zoom-${blockId}`] || 3.5,
            target: target || { type: 'center' }
        };
    }

    return effects;
};

/**
 * Validate effect object structure
 * @param {Object} effects - Effects object to validate
 * @returns {Object} Validation result {isValid, errors}
 */
export const validateEffectObject = (effects) => {
    const errors = [];

    if (effects.fade) {
        if (!['in', 'out'].includes(effects.fade.type)) {
            errors.push('Fade type must be "in" or "out"');
        }
        if (typeof effects.fade.duration !== 'number' || effects.fade.duration <= 0) {
            errors.push('Fade duration must be a positive number');
        }
    }

    if (effects.pan) {
        if (!['left', 'right'].includes(effects.pan.type)) {
            errors.push('Pan type must be "left" or "right"');
        }
        if (typeof effects.pan.distance !== 'number' || effects.pan.distance < 0) {
            errors.push('Pan distance must be a non-negative number');
        }
        if (typeof effects.pan.duration !== 'number' || effects.pan.duration <= 0) {
            errors.push('Pan duration must be a positive number');
        }
    }

    if (effects.zoom) {
        if (!['in', 'out'].includes(effects.zoom.type)) {
            errors.push('Zoom type must be "in" or "out"');
        }
        if (typeof effects.zoom.scale !== 'number' || effects.zoom.scale <= 0) {
            errors.push('Zoom scale must be a positive number');
        }
        if (typeof effects.zoom.duration !== 'number' || effects.zoom.duration <= 0) {
            errors.push('Zoom duration must be a positive number');
        }
    }

    return {
        isValid: errors.length === 0,
        errors
    };
}; 