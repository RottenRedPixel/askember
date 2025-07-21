import { useState } from 'react';

export function useEffectState() {
    const [selectedEffects, setSelectedEffects] = useState({}); // Track selected checkboxes (can be multiple per block)
    const [effectDirections, setEffectDirections] = useState({}); // Track effect directions (in/out, left/right)
    const [effectDurations, setEffectDurations] = useState({}); // Track effect duration values from sliders
    const [effectDistances, setEffectDistances] = useState({}); // Track pan distances
    const [effectScales, setEffectScales] = useState({}); // Track zoom scales
    const [effectTargets, setEffectTargets] = useState({}); // Track zoom targets (center, person, custom)

    // Initialize all effect state from initial values
    const initializeEffectState = (initialEffects, initialDirections, initialDurations, initialDistances, initialScales, initialTargets) => {
        setSelectedEffects(initialEffects);
        setEffectDirections(initialDirections);
        setEffectDurations(initialDurations);
        setEffectDistances(initialDistances);
        setEffectScales(initialScales);
        setEffectTargets(initialTargets);
    };

    // Update multiple effect states at once (used for adding new blocks)
    const updateEffectState = (newEffectDirections, newEffectDurations, newEffectDistances, newEffectScales, newSelectedEffects) => {
        setEffectDirections(prev => ({ ...prev, ...newEffectDirections }));
        setEffectDurations(prev => ({ ...prev, ...newEffectDurations }));
        setEffectDistances(prev => ({ ...prev, ...newEffectDistances }));
        setEffectScales(prev => ({ ...prev, ...newEffectScales }));
        setSelectedEffects(prev => ({ ...prev, ...newSelectedEffects }));
    };

    return {
        // State values
        selectedEffects,
        effectDirections,
        effectDurations,
        effectDistances,
        effectScales,
        effectTargets,

        // State setters (for direct manipulation)
        setSelectedEffects,
        setEffectDirections,
        setEffectDurations,
        setEffectDistances,
        setEffectScales,
        setEffectTargets,

        // Helper functions
        initializeEffectState,
        updateEffectState
    };
} 