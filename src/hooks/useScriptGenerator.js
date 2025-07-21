export const useScriptGenerator = ({
    blocks,
    selectedEffects,
    effectDirections,
    effectDurations,
    effectDistances,
    effectScales,
    effectTargets,
    contributorAudioPreferences
}) => {
    const generateScript = () => {
        // Generate scripts using the new SACRED FORMAT to preserve critical data
        console.log('🔍 DEBUG - generateScript() ENTRY');
        console.log('🔍 DEBUG - Current blocks:', blocks?.length, blocks?.map(b => ({ type: b.type, id: b.id, mediaId: b.mediaId })));

        const scriptLines = blocks.map(block => {
            console.log('🔍 DEBUG - Processing block:', { type: block.type, id: block.id, mediaId: block.mediaId });

            switch (block.type) {
                case 'media':
                    // PRESERVE Sacred Format metadata - only update <content>
                    let mediaId = block.mediaId || 'generated';
                    let mediaName = block.mediaName || 'media';

                    console.log('🔍 DEBUG - MEDIA block generation:', {
                        blockId: block.id,
                        mediaId: block.mediaId,
                        mediaUrl: block.mediaUrl?.substring(0, 50) + '...',
                        mediaName: block.mediaName
                    });

                    // Build effects string from UI controls
                    const blockEffects = selectedEffects[`effect-${block.id}`] || [];
                    let effectsArray = [];

                    if (blockEffects.includes('fade')) {
                        const direction = effectDirections[`fade-${block.id}`] || 'in';
                        const duration = effectDurations[`fade-${block.id}`] || 3.0;
                        effectsArray.push(`FADE-${direction.toUpperCase()}:duration=${duration}`);
                    }

                    if (blockEffects.includes('pan')) {
                        const direction = effectDirections[`pan-${block.id}`] || 'left';
                        const duration = effectDurations[`pan-${block.id}`] || 4.0;
                        const distance = effectDistances[`pan-${block.id}`] || 25;
                        effectsArray.push(`PAN-${direction.toUpperCase()}:distance=${distance}%:duration=${duration}`);
                    }

                    if (blockEffects.includes('zoom')) {
                        const direction = effectDirections[`zoom-${block.id}`] || 'in';
                        const duration = effectDurations[`zoom-${block.id}`] || 3.5;
                        const scale = effectScales[`zoom-${block.id}`] || 1.5;
                        const target = effectTargets[`zoom-${block.id}`];

                        let zoomEffect = `ZOOM-${direction.toUpperCase()}:scale=${scale}:duration=${duration}`;

                        // Add target information if specified
                        if (target && target.type !== 'center') {
                            if (target.type === 'person' && target.personId) {
                                zoomEffect += `:target=person:${target.personId}`;
                            } else if (target.type === 'custom' && target.coordinates) {
                                // Use pixel coordinates (same as tagged people system)
                                zoomEffect += `:target=custom:${Math.round(target.coordinates.x)},${Math.round(target.coordinates.y)}`;
                            }
                        }

                        effectsArray.push(zoomEffect);
                    }

                    // Join effects with commas, fallback to 'media' if no effects
                    const effectsString = effectsArray.length > 0 ? effectsArray.join(',') : 'media';
                    const mediaLine = `[MEDIA | ${mediaName} | ${mediaId}] <${effectsString}>`;
                    console.log('🔍 DEBUG - Generated MEDIA line with effects:', mediaLine);
                    return mediaLine;

                case 'voice':
                    // Voice blocks use Sacred Format: [NAME | preference | contributionID] <content>
                    const contributorName = block.contributorName || block.voiceTag || 'Unknown';

                    // Get audio preference from the current state
                    const blockKey = `${block.voiceTag || block.contributorName}-${block.id}`;
                    const audioPreference = contributorAudioPreferences[blockKey] || block.preference || 'text';
                    const contributionId = block.messageId || block.contributionId || 'no-audio';

                    console.log('🔍 DEBUG - Voice block generation:', {
                        blockId: block.id,
                        contributorName,
                        audioPreference,
                        contributionId,
                        content: block.content?.substring(0, 30) + '...'
                    });

                    const voiceLine = `[${contributorName} | ${audioPreference} | ${contributionId}] <${block.content}>`;
                    console.log('🔍 DEBUG - Generated voice line:', voiceLine);
                    return voiceLine;



                case 'loadscreen':
                    return `[[LOAD SCREEN]] (message="${block.message}",duration=${block.duration},icon="${block.icon}")`;

                case 'start':
                    return ''; // Start blocks don't generate script content
                case 'end':
                    return ''; // End blocks don't generate script content
                default:
                    console.log('🔍 DEBUG - Unknown block type:', block.type);
                    return '';
            }
        });

        const finalScript = scriptLines.filter(line => line.trim()).join('\n\n');
        console.log('🔍 DEBUG - generateScript() EXIT');
        console.log('🔍 DEBUG - Final script length:', finalScript.length);
        console.log('🔍 DEBUG - Final script preview:', finalScript.substring(0, 200) + '...');

        return finalScript;
    };

    return {
        generateScript
    };
}; 