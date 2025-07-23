import { useState, useEffect, useCallback } from 'react';
import {
    getEmber,
    getStoryCutsForEmber,
    getPrimaryStoryCut,
    setPrimaryStoryCut,
    getAllStoryMessagesForEmber,
    getEmberTaggedPeople,
    getEmberSupportingMedia
} from '@/lib/database';
import { getEmberWithSharing } from '@/lib/sharing';
import { getEmberPhotos } from '@/lib/photos';
import { getVoices } from '@/lib/elevenlabs';

// Hook for fetching ElevenLabs voices
export const useVoices = () => {
    const [availableVoices, setAvailableVoices] = useState([]);
    const [voicesLoading, setVoicesLoading] = useState(false);
    const [selectedEmberVoice, setSelectedEmberVoice] = useState('');
    const [selectedNarratorVoice, setSelectedNarratorVoice] = useState('');

    const fetchVoices = async () => {
        try {
            setVoicesLoading(true);
            const voices = await getVoices();
            setAvailableVoices(voices);

            // Set default voices if none selected
            if (!selectedEmberVoice && voices.length > 0) {
                // Try to find "Lily" for Ember voice
                const lilyVoice = voices.find(voice => voice.name && voice.name.toLowerCase() === 'lily');
                if (lilyVoice) {
                    setSelectedEmberVoice(lilyVoice.voice_id);
                } else {
                    // Fall back to first voice if Lily not found
                    setSelectedEmberVoice(voices[0].voice_id);
                }
            }
            if (!selectedNarratorVoice && voices.length > 0) {
                // Try to find "George" for Narrator voice
                const georgeVoice = voices.find(voice => voice.name && voice.name.toLowerCase() === 'george');
                if (georgeVoice) {
                    setSelectedNarratorVoice(georgeVoice.voice_id);
                } else if (voices.length > 1) {
                    // Fall back to second voice if George not found
                    setSelectedNarratorVoice(voices[1].voice_id);
                } else {
                    // Fall back to first voice if only one voice available
                    setSelectedNarratorVoice(voices[0].voice_id);
                }
            }
        } catch (error) {
            console.error('Failed to fetch voices:', error);
        } finally {
            setVoicesLoading(false);
        }
    };

    useEffect(() => {
        fetchVoices();
    }, []);

    return {
        availableVoices,
        voicesLoading,
        selectedEmberVoice,
        setSelectedEmberVoice,
        selectedNarratorVoice,
        setSelectedNarratorVoice,
        fetchVoices
    };
};

// Hook for fetching story styles
export const useStoryStyles = () => {
    const [availableStoryStyles, setAvailableStoryStyles] = useState([]);
    const [stylesLoading, setStylesLoading] = useState(false);

    const fetchStoryStyles = async () => {
        try {
            setStylesLoading(true);

            // Load story style prompts from our prompt management system
            const { getPromptsByCategory } = await import('@/lib/promptManager');
            const storyStylePrompts = await getPromptsByCategory('story_styles');

            // Transform prompts into the format expected by the UI
            const styles = storyStylePrompts
                .filter(prompt => prompt.is_active)
                .map(prompt => ({
                    id: prompt.prompt_key,
                    name: prompt.title,
                    description: prompt.description,
                    subcategory: prompt.subcategory,
                    prompt_key: prompt.prompt_key
                }));

            console.log('📚 Loaded story styles:', styles.map(s => s.name));
            setAvailableStoryStyles(styles);
        } catch (error) {
            console.error('Failed to fetch story styles:', error);
            setAvailableStoryStyles([]);
        } finally {
            setStylesLoading(false);
        }
    };

    useEffect(() => {
        fetchStoryStyles();
    }, []);

    return {
        availableStoryStyles,
        stylesLoading,
        fetchStoryStyles
    };
};

// Hook for fetching ember data and sharing information
export const useEmber = (id, userProfile = null) => {
    const [ember, setEmber] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [sharedUsers, setSharedUsers] = useState([]);
    const [userPermission, setUserPermission] = useState('none');
    const [imageAnalysisData, setImageAnalysisData] = useState(null);
    const [isRefreshing, setIsRefreshing] = useState(false);

    const fetchEmber = useCallback(async () => {
        try {
            setLoading(true);
            setIsRefreshing(true);
            const data = await getEmber(id);
            console.log('Fetched ember data:', data);
            console.log('Image URL:', data?.image_url);

            // Check if image analysis exists for this ember
            try {
                const { getImageAnalysis } = await import('@/lib/database');
                const analysisData = await getImageAnalysis(id);
                data.image_analysis_completed = !!analysisData;
                setImageAnalysisData(analysisData); // Store the full analysis data
            } catch (analysisError) {
                console.warn('Failed to check image analysis status:', analysisError);
                data.image_analysis_completed = false;
                setImageAnalysisData(null);
            }

            setEmber(data);

            // Only fetch sharing information for authenticated users
            if (userProfile && userProfile.user_id) {
                try {
                    const sharingData = await getEmberWithSharing(id);
                    console.log('Sharing data:', sharingData);

                    // Set user's permission level
                    setUserPermission(sharingData.userPermission || 'none');
                    console.log('User permission:', sharingData.userPermission);

                    if (sharingData.shares && sharingData.shares.length > 0) {
                        // Extract shared users with their profile information
                        // Only include users who have actually created accounts (have user_id)
                        const invitedUsers = sharingData.shares
                            .filter(share => share.shared_user && share.shared_user.user_id) // Must have actual user account
                            .map(share => ({
                                id: share.shared_user.id,
                                user_id: share.shared_user.user_id,
                                first_name: share.shared_user.first_name,
                                last_name: share.shared_user.last_name,
                                avatar_url: share.shared_user.avatar_url,
                                email: share.shared_with_email,
                                permission_level: share.permission_level
                            }));
                        setSharedUsers(invitedUsers);
                        console.log('Invited users:', invitedUsers);
                    } else {
                        setSharedUsers([]);
                    }
                } catch (sharingError) {
                    console.error('Error fetching sharing data:', sharingError);
                    // Don't fail the whole component if sharing data fails
                    setSharedUsers([]);
                    setUserPermission('none');
                }
            } else {
                // For public/unauthenticated users, use unified avatar display approach
                console.log('🌍 Public user - using unified avatar display approach...');

                // Set permission as public
                setUserPermission('public');

                // Use story messages for avatar data (consistent for both auth states)
                try {
                    const storyData = await getAllStoryMessagesForEmber(id);
                    const allMessages = storyData.messages || [];

                    // Filter to user responses and extract unique contributors
                    const userResponses = allMessages.filter(message =>
                        message.sender === 'user' || message.message_type === 'response'
                    );

                    // Build unique user map from story messages
                    const userMap = new Map();
                    userResponses.forEach(message => {
                        if (message.user_id && !userMap.has(message.user_id)) {
                            userMap.set(message.user_id, {
                                id: message.user_id,
                                user_id: message.user_id,
                                first_name: message.user_first_name || 'Unknown',
                                last_name: message.user_last_name || '',
                                avatar_url: message.user_avatar_url || null,
                                email: message.user_email || '',
                                permission_level: 'view'
                            });
                        }
                    });

                    const contributorUsers = Array.from(userMap.values());
                    setSharedUsers(contributorUsers);
                    console.log('🌍 Public avatar display successful - extracted from story messages:', contributorUsers);
                } catch (storyError) {
                    console.warn('⚠️ Could not extract avatar data from story messages:', storyError);
                    setSharedUsers([]);
                }
            }
        } catch (err) {
            console.error('Error fetching ember:', err);
            setError('Ember not found');
        } finally {
            setLoading(false);
            setIsRefreshing(false);
        }
    }, [id, userProfile]);

    useEffect(() => {
        if (id) {
            fetchEmber();
        }
    }, [id, fetchEmber]);

    const updateImageAnalysis = async () => {
        // Refresh the image analysis data when it's updated
        if (!ember?.id) return;

        try {
            const { getImageAnalysis } = await import('@/lib/database');
            const analysisData = await getImageAnalysis(ember.id);
            setImageAnalysisData(analysisData);

            // Update the ember state to reflect completion status
            setEmber(prev => ({
                ...prev,
                image_analysis_completed: !!analysisData
            }));
        } catch (error) {
            console.error('Error refreshing image analysis:', error);
        }
    };

    return {
        ember,
        setEmber,
        loading,
        error,
        sharedUsers,
        userPermission,
        imageAnalysisData,
        isRefreshing,
        fetchEmber,
        updateImageAnalysis
    };
};

// Hook for fetching story cuts
export const useStoryCuts = (emberId, userProfile) => {
    const [storyCuts, setStoryCuts] = useState([]);
    const [storyCutsLoading, setStoryCutsLoading] = useState(false);
    const [primaryStoryCut, setPrimaryStoryCutState] = useState(null);

    const fetchStoryCuts = useCallback(async () => {
        if (!emberId) return;

        try {
            setStoryCutsLoading(true);
            const { getStoryCutsWithBlocks } = await import('./blockDatabase.js');
            const cuts = await getStoryCutsWithBlocks(emberId);
            console.log('📚 Story cuts fetched:', {
                cutsLength: cuts?.length,
                cutsType: typeof cuts,
                cutsIsArray: Array.isArray(cuts),
                cuts: cuts
            });
            setStoryCuts(cuts);

            // Also fetch the primary story cut
            const primary = await getPrimaryStoryCut(emberId);
            console.log('🎬 Primary story cut fetched:', primary);
            setPrimaryStoryCutState(primary);

            // 🚫 REMOVED: Auto-set single story cut as "The One" - this was causing story cut reuse
            // This logic was preventing multiple story cuts from being created
            /*
            // Auto-set single story cut as "The One" if no primary exists
            if (cuts.length === 1 && !primary && userProfile?.user_id) {
                try {
                    console.log('🎬 Auto-setting single story cut as "The One":', cuts[0].title);
                    await setPrimaryStoryCut(cuts[0].id, emberId, userProfile.user_id);

                    // Refresh to get the updated primary status
                    const updatedPrimary = await getPrimaryStoryCut(emberId);
                    setPrimaryStoryCutState(updatedPrimary);
                } catch (error) {
                    console.error('Error auto-setting primary story cut:', error);
                }
            }
            */
        } catch (error) {
            console.error('Error fetching story cuts:', error);
            setStoryCuts([]);
        } finally {
            setStoryCutsLoading(false);
        }
    }, [emberId, userProfile?.user_id]);

    useEffect(() => {
        if (emberId) {
            fetchStoryCuts();
        }
    }, [emberId, fetchStoryCuts]);

    return {
        storyCuts,
        setStoryCuts,
        storyCutsLoading,
        primaryStoryCut,
        setPrimaryStoryCutState,
        fetchStoryCuts
    };
};

// Hook for fetching story messages
export const useStoryMessages = (emberId) => {
    const [storyMessages, setStoryMessages] = useState([]);
    const [storyContributorCount, setStoryContributorCount] = useState(0);

    const fetchStoryMessages = async () => {
        if (!emberId) return;

        try {
            const result = await getAllStoryMessagesForEmber(emberId);
            const allMessages = result.messages || [];

            // Filter to only include user responses (not AI questions)
            const userResponses = allMessages.filter(message =>
                message.sender === 'user' || message.message_type === 'response'
            );

            setStoryMessages(userResponses);

            // Count unique contributors from user responses only
            const uniqueContributors = new Set();
            userResponses.forEach(message => {
                if (message.user_id) {
                    uniqueContributors.add(message.user_id);
                }
            });

            setStoryContributorCount(uniqueContributors.size);
            console.log(`📝 Story messages: ${userResponses.length} messages from ${uniqueContributors.size} contributors`);
        } catch (error) {
            console.error('Error fetching story messages:', error);
            setStoryMessages([]);
            setStoryContributorCount(0);
        }
    };

    useEffect(() => {
        if (emberId) {
            fetchStoryMessages();
        }
    }, [emberId]);

    return {
        storyMessages,
        storyContributorCount,
        fetchStoryMessages
    };
};

// Hook for fetching tagged people data
export const useTaggedPeople = (emberId) => {
    const [taggedPeopleData, setTaggedPeopleData] = useState([]);
    const [taggedPeopleCount, setTaggedPeopleCount] = useState(0);

    const fetchTaggedPeopleData = async () => {
        if (!emberId) return;

        try {
            const taggedPeople = await getEmberTaggedPeople(emberId);
            setTaggedPeopleData(taggedPeople);
            setTaggedPeopleCount(taggedPeople.length);
        } catch (error) {
            console.error('Error fetching tagged people:', error);
            setTaggedPeopleData([]);
            setTaggedPeopleCount(0);
        }
    };

    useEffect(() => {
        if (emberId) {
            fetchTaggedPeopleData();
        }
    }, [emberId]);

    return {
        taggedPeopleData,
        taggedPeopleCount,
        fetchTaggedPeopleData
    };
};

// Hook for fetching supporting media
export const useSupportingMedia = (emberId) => {
    const [supportingMedia, setSupportingMedia] = useState([]);

    const fetchSupportingMedia = async () => {
        if (!emberId) return;

        try {
            const media = await getEmberSupportingMedia(emberId);
            setSupportingMedia(media);
            console.log(`📁 Supporting media updated: ${media.length} files`);
        } catch (error) {
            console.error('Error fetching supporting media:', error);
            setSupportingMedia([]);
        }
    };

    useEffect(() => {
        if (emberId) {
            fetchSupportingMedia();
        }
    }, [emberId]);

    return {
        supportingMedia,
        fetchSupportingMedia
    };
};

// Hook for fetching media for story creation
export const useMediaForStory = (emberId) => {
    const [availableMediaForStory, setAvailableMediaForStory] = useState([]);
    const [selectedMediaForStory, setSelectedMediaForStory] = useState([]);
    const [mediaLoadingForStory, setMediaLoadingForStory] = useState(false);

    const fetchMediaForStory = useCallback(async () => {
        if (!emberId) return;

        try {
            setMediaLoadingForStory(true);
            console.log('📸 Fetching available media for story creation...');

            const [emberPhotos, supportingMediaFiles] = await Promise.all([
                getEmberPhotos(emberId),
                getEmberSupportingMedia(emberId)
            ]);

            // Combine and format all available media
            const allMedia = [
                // Ember photos
                ...emberPhotos.map(photo => ({
                    id: photo.id,
                    name: photo.display_name || photo.original_filename,
                    filename: photo.original_filename,
                    url: photo.storage_url,
                    type: 'photo',
                    category: 'ember',
                    thumbnail: photo.storage_url,
                    duration: 3.0 // Default duration for photos
                })),
                // Supporting media
                ...supportingMediaFiles.map(media => ({
                    id: media.id,
                    name: media.display_name || media.file_name,
                    filename: media.file_name,
                    url: media.file_url,
                    type: media.file_category || 'photo',
                    category: 'supporting',
                    thumbnail: media.file_url,
                    duration: media.file_category === 'video' ? 4.0 : 3.0 // Videos slightly longer
                }))
            ];

            console.log(`📸 Found ${allMedia.length} available media files:`,
                allMedia.map(m => `${m.name} (${m.type})`));

            setAvailableMediaForStory(allMedia);

            // Auto-select ember photo by default, but allow user to deselect
            const emberPhotoMedia = allMedia.filter(media => media.category === 'ember');
            if (emberPhotoMedia.length > 0) {
                // ✅ ENHANCED: Only auto-select if nothing is currently selected
                setSelectedMediaForStory(prev => {
                    if (prev.length === 0) {
                        console.log(`📸 Auto-selected ember photo: ${emberPhotoMedia[0].name}`);
                        return [emberPhotoMedia[0].id]; // Select the first ember photo
                    } else {
                        console.log(`📸 Media already selected (${prev.length} items) - skipping auto-selection`);
                        return prev; // Keep existing selection
                    }
                });
            } else {
                // No ember photos found - don't auto-select anything
                setSelectedMediaForStory([]);
                console.log(`📸 No ember photos found - no default selection`);
            }

        } catch (error) {
            console.error('❌ Error fetching media for story:', error);
            setAvailableMediaForStory([]);
            setSelectedMediaForStory([]);
        } finally {
            setMediaLoadingForStory(false);
        }
    }, [emberId]);

    // Media selection handlers
    const toggleMediaSelection = (mediaId) => {
        setSelectedMediaForStory(prev =>
            prev.includes(mediaId)
                ? prev.filter(id => id !== mediaId)
                : [...prev, mediaId]
        );
    };

    const selectAllMedia = () => {
        setSelectedMediaForStory(availableMediaForStory.map(m => m.id));
    };

    const clearMediaSelection = () => {
        setSelectedMediaForStory([]);
    };

    // Auto-fetch media when emberId changes
    useEffect(() => {
        if (emberId) {
            fetchMediaForStory();
        }
    }, [emberId, fetchMediaForStory]);

    return {
        availableMediaForStory,
        selectedMediaForStory,
        mediaLoadingForStory,
        fetchMediaForStory,
        toggleMediaSelection,
        selectAllMedia,
        clearMediaSelection
    };
};

// Composite hook that combines all ember-related data fetching
export const useEmberData = (id, userProfile) => {
    const emberData = useEmber(id, userProfile);
    const storyCutsData = useStoryCuts(emberData.ember?.id, userProfile);
    const storyMessagesData = useStoryMessages(emberData.ember?.id);
    const taggedPeopleData = useTaggedPeople(emberData.ember?.id);
    const supportingMediaData = useSupportingMedia(emberData.ember?.id);
    const mediaForStoryData = useMediaForStory(emberData.ember?.id);
    const voicesData = useVoices();
    const storyStylesData = useStoryStyles();

    // 🚫 FIXED: Only auto-select ember photos when NO selection exists (prevent duplicate generation)
    useEffect(() => {
        console.log('🔍 DEBUG - useEmberData auto-selection useEffect TRIGGERED');
        console.log('🔍 DEBUG - Dependencies:', {
            ember: !!emberData.ember,
            availableMedia: mediaForStoryData.availableMediaForStory?.length,
            selectedMedia: mediaForStoryData.selectedMediaForStory?.length,
            userProfile: !!userProfile
        });

        // Only auto-select if ember exists, has photos, and NO selection exists
        if (emberData.ember && mediaForStoryData.availableMediaForStory?.length > 0 && mediaForStoryData.selectedMediaForStory?.length === 0 && userProfile?.user_id) {
            console.log('🔍 DEBUG - Auto-selecting ember photos');
            console.log('🔍 DEBUG - Available photos:', mediaForStoryData.availableMediaForStory.map(p => ({
                id: p.id,
                name: p.name,
                url: p.url?.substring(0, 30) + '...'
            })));

            // Auto-select all available media
            mediaForStoryData.selectAllMedia();
            console.log('✅ DEBUG - Auto-selected ember photos for story generation');
        } else {
            console.log('🔍 DEBUG - Skipping auto-selection:', {
                hasEmber: !!emberData.ember,
                hasPhotos: mediaForStoryData.availableMediaForStory?.length > 0,
                hasExistingSelection: mediaForStoryData.selectedMediaForStory?.length > 0,
                hasUserProfile: !!userProfile?.user_id
            });
        }
    }, [emberData.ember, mediaForStoryData.availableMediaForStory, userProfile?.user_id]); // FIXED: Removed selectedMedia dependency to prevent loops

    return {
        // Ember data
        ...emberData,
        // Story cuts
        ...storyCutsData,
        // Story messages
        ...storyMessagesData,
        // Tagged people
        ...taggedPeopleData,
        // Supporting media
        ...supportingMediaData,
        // Media for story
        ...mediaForStoryData,
        // Voices
        ...voicesData,
        // Story styles
        ...storyStylesData
    };
}; 