// Smart function to split effects by commas while preserving custom coordinates
export function smartSplitEffects(content) {
    const effects = [];
    let current = '';
    let insideTarget = false;

    for (let i = 0; i < content.length; i++) {
        const char = content[i];

        // Check if we're entering a target parameter
        if (content.substr(i, 7) === 'target=') {
            insideTarget = true;
            current += char;
        }
        // Check if we're at a comma
        else if (char === ',') {
            if (insideTarget) {
                // Inside target parameter, this comma is part of coordinates
                current += char;
                // Check if we're at the end of the target parameter (next effect starts)
                const remaining = content.substr(i + 1);
                if (remaining.match(/^\s*(FADE-|PAN-|ZOOM-)/)) {
                    insideTarget = false;
                }
            } else {
                // Normal comma separation between effects
                if (current.trim()) {
                    effects.push(current.trim());
                }
                current = '';
            }
        }
        // Any other character
        else {
            current += char;
        }
    }

    // Add the last effect
    if (current.trim()) {
        effects.push(current.trim());
    }

    console.log(`🎯 Smart split effects: "${content}" → `, effects);
    return effects;
} 