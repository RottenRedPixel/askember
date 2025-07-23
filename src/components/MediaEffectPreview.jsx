import { useState, useEffect, useMemo } from 'react';

// Conversion functions matching StoryCutStudio
const sliderToScale = (sliderValue) => {
    if (sliderValue <= 0) {
        return 1.0 + (sliderValue * 0.16);
    } else {
        return 1.0 + (sliderValue * 0.8);
    }
};

const sliderToPanPosition = (sliderValue) => {
    return sliderValue;
};

/**
 * MediaEffectPreview - Shows real-time preview of pan and zoom effects
 * @param {Object} props
 * @param {Object} props.block - Media block data
 * @param {Object} props.selectedEffects - Currently selected effects
 * @param {Object} props.effectStartPositions - Pan start positions
 * @param {Object} props.effectEndPositions - Pan end positions  
 * @param {Object} props.effectStartScales - Zoom start scales
 * @param {Object} props.effectEndScales - Zoom end scales
 * @param {Object} props.effectDurations - Effect durations
 * @param {Object} props.effectDirections - Effect directions (in/out, left/right)
 */
const MediaEffectPreview = ({
    block,
    selectedEffects,
    effectStartPositions,
    effectEndPositions,
    effectStartScales,
    effectEndScales,
    effectDurations,
    effectDirections
}) => {
    const [previewMode, setPreviewMode] = useState('start'); // 'start', 'end', 'animated'
    const [isAnimating, setIsAnimating] = useState(false);

    // Get effects for this block
    const blockEffects = selectedEffects[`effect-${block.id}`] || [];
    const hasPan = blockEffects.includes('pan');
    const hasZoom = blockEffects.includes('zoom');
    const hasFade = blockEffects.includes('fade');
    const hasEffects = hasPan || hasZoom || hasFade;

    // Calculate CSS transforms and opacity based on current preview mode
    const transforms = useMemo(() => {
        if (!hasEffects) {
            return {
                start: { transform: 'scale(1) translateX(0)', opacity: 1 },
                end: { transform: 'scale(1) translateX(0)', opacity: 1 },
                animated: { transform: 'scale(1) translateX(0)', opacity: 1 }
            };
        }

        const calculateTransform = (mode) => {
            const transforms = [];
            let opacity = 1;

            // Pan calculations
            if (hasPan) {
                let panValue = 0;
                if (mode === 'start') {
                    panValue = effectStartPositions[`pan-${block.id}`] || -25;
                } else if (mode === 'end') {
                    panValue = effectEndPositions[`pan-${block.id}`] || 25;
                } else {
                    // For animated mode, show end position
                    panValue = effectEndPositions[`pan-${block.id}`] || 25;
                }
                const panPosition = sliderToPanPosition(panValue);
                transforms.push(`translateX(${panPosition}%)`);
            }

            // Zoom calculations  
            if (hasZoom) {
                let scaleValue = 0;
                if (mode === 'start') {
                    scaleValue = effectStartScales[`zoom-${block.id}`] || 0;
                } else if (mode === 'end') {
                    scaleValue = effectEndScales[`zoom-${block.id}`] || 0;
                } else {
                    // For animated mode, show end scale
                    scaleValue = effectEndScales[`zoom-${block.id}`] || 0;
                }
                const scale = sliderToScale(scaleValue);
                transforms.push(`scale(${scale})`);
            }

            // Fade calculations
            if (hasFade) {
                const fadeDirection = effectDirections?.[`fade-${block.id}`] || 'in';
                if (mode === 'start') {
                    opacity = fadeDirection === 'in' ? 0.3 : 1;
                } else if (mode === 'end') {
                    opacity = fadeDirection === 'in' ? 1 : 0.3;
                } else {
                    // For animated mode, show end opacity
                    opacity = fadeDirection === 'in' ? 1 : 0.3;
                }
            }

            return {
                transform: transforms.length > 0 ? transforms.join(' ') : 'scale(1) translateX(0)',
                opacity
            };
        };

        return {
            start: calculateTransform('start'),
            end: calculateTransform('end'),
            animated: calculateTransform('end')
        };
    }, [
        hasEffects, hasPan, hasZoom, hasFade, block.id,
        effectStartPositions, effectEndPositions,
        effectStartScales, effectEndScales, effectDirections
    ]);

    // Animation duration based on effect settings
    const animationDuration = useMemo(() => {
        const panDuration = hasPan ? effectDurations[`pan-${block.id}`] || 4.0 : 0;
        const zoomDuration = hasZoom ? effectDurations[`zoom-${block.id}`] || 3.5 : 0;
        const fadeDuration = hasFade ? effectDurations[`fade-${block.id}`] || 3.0 : 0;
        return Math.max(panDuration, zoomDuration, fadeDuration, 1.0);
    }, [hasPan, hasZoom, hasFade, effectDurations, block.id]);

    // Handle animation toggle
    const handleAnimationToggle = () => {
        if (!hasEffects) return;

        setIsAnimating(true);
        setPreviewMode('animated');

        // Reset after animation completes
        setTimeout(() => {
            setIsAnimating(false);
            setPreviewMode('start');
        }, animationDuration * 1000);
    };

    // Cycle through preview modes
    const cyclePreviews = () => {
        if (!hasEffects) return;

        if (previewMode === 'start') {
            setPreviewMode('end');
        } else if (previewMode === 'end') {
            handleAnimationToggle();
        } else {
            setPreviewMode('start');
        }
    };

    // Don't render if no media URL
    if (!block.mediaUrl) {
        return null;
    }

    // Container classes based on size and active effects
    const getBorderColor = () => {
        const effectCount = [hasPan, hasZoom, hasFade].filter(Boolean).length;
        if (effectCount > 1) return 'border-purple-400'; // Multiple effects
        if (hasZoom) return 'border-purple-400'; // Zoom effect
        if (hasPan) return 'border-blue-400'; // Pan effect  
        if (hasFade) return 'border-green-400'; // Fade effect
        return 'border-gray-400'; // Default
    };

    const containerClasses = hasEffects
        ? `w-28 h-28 rounded-xl relative overflow-hidden bg-gray-100 border-2 ${getBorderColor()} shadow-md transition-all duration-300`
        : 'w-20 h-20 rounded-xl relative overflow-hidden bg-gray-100 transition-all duration-300';

    const currentStyles = transforms[previewMode] || transforms.start;
    const transition = isAnimating
        ? `transform ${animationDuration}s ease-out, opacity ${animationDuration}s ease-out`
        : 'transform 0.3s ease-out, opacity 0.3s ease-out';

    // If no effects, show single thumbnail
    if (!hasEffects) {
        return (
            <div className={containerClasses}>
                <img
                    src={block.mediaUrl}
                    alt={block.mediaName || 'Media Preview'}
                    className="w-full h-full object-contain"
                    onError={(e) => {
                        e.target.style.display = 'none';
                    }}
                />
            </div>
        );
    }

    // If effects are active, show dual thumbnails (start + end)
    const startStyles = transforms.start;
    const endStyles = transforms.end;

    // Container for dual thumbnails
    const dualContainerClasses = `flex gap-1 ${getBorderColor()} border-2 shadow-md rounded-xl p-1 transition-all duration-300`;
    const thumbnailClasses = 'w-32 h-32 rounded-lg relative overflow-hidden bg-gray-100';

    return (
        <div className={dualContainerClasses}>
            {/* Start State Thumbnail */}
            <div className={thumbnailClasses}>
                <img
                    src={block.mediaUrl}
                    alt={`${block.mediaName || 'Media'} - Start`}
                    className="w-full h-full object-contain"
                    style={{
                        transform: startStyles.transform,
                        opacity: startStyles.opacity,
                        transformOrigin: 'center center'
                    }}
                    onError={(e) => {
                        e.target.style.display = 'none';
                    }}
                />

                {/* Start Label */}
                <div className="absolute bottom-0 left-0 right-0 bg-blue-600 bg-opacity-90 text-white text-xs text-center py-0.5 font-medium">
                    START
                </div>

                {/* Effect Indicators on Start */}
                <div className="absolute top-1 left-1 flex gap-1">
                    {hasPan && (
                        <div className="px-1 py-0.5 bg-blue-600 text-white text-xs rounded font-medium">
                            P
                        </div>
                    )}
                    {hasZoom && (
                        <div className="px-1 py-0.5 bg-purple-600 text-white text-xs rounded font-medium">
                            Z
                        </div>
                    )}
                    {hasFade && (
                        <div className="px-1 py-0.5 bg-green-600 text-white text-xs rounded font-medium">
                            F
                        </div>
                    )}
                </div>
            </div>

            {/* End State Thumbnail */}
            <div className={thumbnailClasses}>
                <img
                    src={block.mediaUrl}
                    alt={`${block.mediaName || 'Media'} - End`}
                    className="w-full h-full object-contain"
                    style={{
                        transform: endStyles.transform,
                        opacity: endStyles.opacity,
                        transformOrigin: 'center center'
                    }}
                    onError={(e) => {
                        e.target.style.display = 'none';
                    }}
                />

                {/* End Label */}
                <div className="absolute bottom-0 left-0 right-0 bg-orange-600 bg-opacity-90 text-white text-xs text-center py-0.5 font-medium">
                    END
                </div>


            </div>

            {/* Animation Indicator for dual view */}
            {isAnimating && (
                <div className="absolute top-1 right-1">
                    <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                </div>
            )}
        </div>
    );
};

export default MediaEffectPreview; 