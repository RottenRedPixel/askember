import { useState } from 'react';
import { updateStoryCut, getUserVoiceModel } from '@/lib/database';
import { generateScript } from '@/lib/scriptUtils';

export const useBlockManager = ({
    blocks,
    setBlocks,
    selectedEffects,
    effectDirections,
    effectDurations,
    effectDistances,
    effectScales,
    effectTargets,
    contributorAudioPreferences,
    updateEffectState,
    storyCut,
    user,
    id,
    contributors = []
}) => {
    // Block reordering functions
    const moveBlockUp = async (index) => {
        if (index === 0) return; // Can't move first block up

        const newBlocks = [...blocks];
        const blockToMove = newBlocks[index];
        newBlocks[index] = newBlocks[index - 1];
        newBlocks[index - 1] = blockToMove;

        setBlocks(newBlocks);
        console.log(`🔄 Moved block ${blockToMove.id} up (index ${index} → ${index - 1})`);

        // Auto-save the reordered script to database
        if (user && storyCut) {
            try {
                // Wait for state to update, then generate and save
                setTimeout(async () => {
                    const updatedScript = generateScript({
                        blocks: newBlocks,
                        selectedEffects,
                        effectDirections,
                        effectDurations,
                        effectDistances,
                        effectScales,
                        effectTargets,
                        contributorAudioPreferences
                    });
                    await updateStoryCut(storyCut.id, {
                        full_script: updatedScript
                    }, user.id);
                    console.log('✅ Block reordering auto-saved to database');

                    // 🔄 Notify other components about the script update
                    window.dispatchEvent(new CustomEvent('emberScriptUpdated', {
                        detail: {
                            emberId: id,
                            storyCutId: storyCut.id,
                            timestamp: Date.now()
                        }
                    }));
                }, 100);
            } catch (error) {
                console.error('❌ Failed to auto-save reordered blocks:', error);
            }
        }
    };

    const moveBlockDown = async (index) => {
        if (index === blocks.length - 1) return; // Can't move last block down

        const newBlocks = [...blocks];
        const blockToMove = newBlocks[index];
        newBlocks[index] = newBlocks[index + 1];
        newBlocks[index + 1] = blockToMove;

        setBlocks(newBlocks);
        console.log(`🔄 Moved block ${blockToMove.id} down (index ${index} → ${index + 1})`);

        // Auto-save the reordered script to database
        if (user && storyCut) {
            try {
                // Wait for state to update, then generate and save
                setTimeout(async () => {
                    const updatedScript = generateScript({
                        blocks: newBlocks,
                        selectedEffects,
                        effectDirections,
                        effectDurations,
                        effectDistances,
                        effectScales,
                        effectTargets,
                        contributorAudioPreferences
                    });
                    await updateStoryCut(storyCut.id, {
                        full_script: updatedScript
                    }, user.id);
                    console.log('✅ Block reordering auto-saved to database');

                    // 🔄 Notify other components about the script update
                    window.dispatchEvent(new CustomEvent('emberScriptUpdated', {
                        detail: {
                            emberId: id,
                            storyCutId: storyCut.id,
                            timestamp: Date.now()
                        }
                    }));
                }, 100);
            } catch (error) {
                console.error('❌ Failed to auto-save reordered blocks:', error);
            }
        }
    };

    // Helper function to get contributor avatar data
    const getContributorAvatarData = (voiceTag, contributors) => {
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

    // Handle adding a new media block
    const handleAddMediaBlock = async (selection) => {
        if (!selection || !user || !storyCut) return;

        // Handle both old format (direct media) and new format (object with media/contributions)
        const selectedMedia = selection.media || (selection.name ? selection : null);
        const selectedContributions = selection.contributions || [];

        if (!selectedMedia && selectedContributions.length === 0) return;

        try {
            const newBlocks = [...blocks];
            const endBlockIndex = newBlocks.findIndex(block => block.type === 'end');
            let insertIndex = endBlockIndex !== -1 ? endBlockIndex : newBlocks.length;

            // Create new blocks array to hold all new blocks
            const blocksToAdd = [];
            let currentBlockId = Math.max(...blocks.map(b => b.id), 0) + 1;

            // Add media block if selected and it has the required properties
            if (selectedMedia && selectedMedia.name && selectedMedia.id) {
                console.log('➕ Adding new media block:', selectedMedia.name);

                const mediaBlock = {
                    id: currentBlockId++,
                    type: 'media',
                    mediaName: selectedMedia.name,
                    mediaId: selectedMedia.id,
                    mediaUrl: selectedMedia.url,
                    effect: null,
                    duration: 0
                };

                // Apply same URL resolution as original MEDIA blocks
                try {
                    const { getEmberPhotos } = await import('@/lib/photos');
                    const { getEmberSupportingMedia } = await import('@/lib/database');

                    const [emberPhotos, supportingMedia] = await Promise.all([
                        getEmberPhotos(id),
                        getEmberSupportingMedia(id)
                    ]);

                    const photoMatch = emberPhotos.find(photo => photo.id === mediaBlock.mediaId);
                    const mediaMatch = supportingMedia.find(media => media.id === mediaBlock.mediaId);

                    if (photoMatch) {
                        mediaBlock.mediaName = photoMatch.display_name || photoMatch.original_filename;
                        mediaBlock.mediaUrl = photoMatch.storage_url;
                        console.log('📸 Resolved added photo:', mediaBlock.mediaName, ':', mediaBlock.mediaUrl);
                    } else if (mediaMatch) {
                        mediaBlock.mediaName = mediaMatch.display_name || mediaMatch.file_name;
                        mediaBlock.mediaUrl = mediaMatch.file_url;
                        console.log('📸 Resolved added supporting media:', mediaBlock.mediaName, ':', mediaBlock.mediaUrl);
                    } else {
                        console.log('⚠️ No media found with ID for added block:', mediaBlock.mediaId);
                    }
                } catch (error) {
                    console.error('❌ Failed to resolve media for added block', mediaBlock.mediaId, ':', error);
                }

                blocksToAdd.push(mediaBlock);
            }

            // Add voice blocks from contributions
            for (const contribution of selectedContributions) {
                console.log('➕ Adding new voice block:', contribution.user_first_name, contribution.content.substring(0, 50));

                // Check for voice model BEFORE creating block
                let hasVoiceModel = false;
                if (contribution.user_id) {
                    try {
                        const userVoiceModel = await getUserVoiceModel(contribution.user_id);
                        hasVoiceModel = !!(userVoiceModel && userVoiceModel.elevenlabs_voice_id);
                        console.log(`🎤 Voice model check for ${contribution.user_first_name}: ${hasVoiceModel ? 'available' : 'not available'}`);
                    } catch (error) {
                        console.warn(`Failed to check voice model for ${contribution.user_first_name}:`, error);
                    }
                }

                // Get contributor data for real avatar
                const contributorData = getContributorAvatarData(contribution.user_first_name, contributors);

                const voiceBlock = {
                    id: currentBlockId++,
                    type: 'voice',
                    voiceTag: contribution.user_first_name,
                    content: contribution.content,
                    voiceType: 'contributor',
                    avatarUrl: contributorData.avatarUrl,
                    contributorData: contributorData, // Store full contributor data for avatar fallbacks
                    messageType: contribution.has_audio ? 'Audio Message' : 'Text Response',
                    preference: contribution.has_audio ? 'recorded' : 'text',
                    messageId: contribution.id || contribution.message_id || null,
                    hasVoiceModel: hasVoiceModel // Store voice model availability
                };

                blocksToAdd.push(voiceBlock);
            }

            // Insert all new blocks at once
            newBlocks.splice(insertIndex, 0, ...blocksToAdd);

            setBlocks(newBlocks);
            console.log(`✅ Added ${blocksToAdd.length} new block(s) successfully`);

            // Initialize effects state for all new blocks
            const newEffectDirections = {};
            const newEffectDurations = {};
            const newEffectDistances = {};
            const newEffectScales = {};
            const newSelectedEffects = {};

            blocksToAdd.forEach(block => {
                if (block.type === 'media') {
                    // Initialize media block effects
                    newEffectDirections[`fade-${block.id}`] = 'in';
                    newEffectDirections[`pan-${block.id}`] = 'left';
                    newEffectDirections[`zoom-${block.id}`] = 'in';

                    newEffectDurations[`fade-${block.id}`] = 3.0;
                    newEffectDurations[`pan-${block.id}`] = 4.0;
                    newEffectDurations[`zoom-${block.id}`] = 3.5;

                    newEffectDistances[`pan-${block.id}`] = 25;
                    newEffectScales[`zoom-${block.id}`] = 1.5;

                    newSelectedEffects[`effect-${block.id}`] = [];
                }
                // Voice blocks don't need effects initialization
            });

            updateEffectState(newEffectDirections, newEffectDurations, newEffectDistances, newEffectScales, newSelectedEffects);

            console.log('✅ Effects state initialized for new blocks');

            // Auto-save the updated script to database
            try {
                // Wait for state to update, then generate and save
                setTimeout(async () => {
                    const updatedScript = generateScript({
                        blocks: newBlocks,
                        selectedEffects: { ...selectedEffects, ...newSelectedEffects },
                        effectDirections: { ...effectDirections, ...newEffectDirections },
                        effectDurations: { ...effectDurations, ...newEffectDurations },
                        effectDistances: { ...effectDistances, ...newEffectDistances },
                        effectScales: { ...effectScales, ...newEffectScales },
                        effectTargets,
                        contributorAudioPreferences
                    });
                    await updateStoryCut(storyCut.id, {
                        full_script: updatedScript
                    }, user.id);
                    console.log('✅ Script with new block auto-saved to database');

                    // 🔄 Notify other components about the script update
                    window.dispatchEvent(new CustomEvent('emberScriptUpdated', {
                        detail: {
                            emberId: id,
                            storyCutId: storyCut.id,
                            timestamp: Date.now()
                        }
                    }));
                }, 100);
            } catch (error) {
                console.error('❌ Failed to auto-save script with new block:', error);
            }

        } catch (error) {
            console.error('❌ Failed to add media block:', error);
        }
    };

    return {
        moveBlockUp,
        moveBlockDown,
        handleAddMediaBlock
    };
}; 