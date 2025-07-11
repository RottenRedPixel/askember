import { useState, useRef } from 'react';

// Hook for managing all modal states
export const useModalState = () => {
    const [showFullImage, setShowFullImage] = useState(false);
    const [showEmberSharing, setShowEmberSharing] = useState(false);
    const [showInviteModal, setShowInviteModal] = useState(false);
    const [showNamesModal, setShowNamesModal] = useState(false);
    const [showEmberWiki, setShowEmberWiki] = useState(false);
    const [showStoryCutCreator, setShowStoryCutCreator] = useState(false);
    const [showEmberStoryCuts, setShowEmberStoryCuts] = useState(false);
    const [showStoryModal, setShowStoryModal] = useState(false);
    const [showLocationModal, setShowLocationModal] = useState(false);
    const [showTimeDateModal, setShowTimeDateModal] = useState(false);
    const [showImageAnalysisModal, setShowImageAnalysisModal] = useState(false);
    const [showTaggedPeopleModal, setShowTaggedPeopleModal] = useState(false);
    const [showSupportingMediaModal, setShowSupportingMediaModal] = useState(false);
    const [showStoryCutDetail, setShowStoryCutDetail] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    const closeAllModals = () => {
        setShowFullImage(false);
        setShowEmberSharing(false);
        setShowInviteModal(false);
        setShowNamesModal(false);
        setShowEmberWiki(false);
        setShowStoryCutCreator(false);
        setShowEmberStoryCuts(false);
        setShowStoryModal(false);
        setShowLocationModal(false);
        setShowTimeDateModal(false);
        setShowImageAnalysisModal(false);
        setShowTaggedPeopleModal(false);
        setShowSupportingMediaModal(false);
        setShowStoryCutDetail(false);
        setShowDeleteConfirm(false);
    };

    return {
        // Modal states
        showFullImage, setShowFullImage,
        showEmberSharing, setShowEmberSharing,
        showInviteModal, setShowInviteModal,
        showNamesModal, setShowNamesModal,
        showEmberWiki, setShowEmberWiki,
        showStoryCutCreator, setShowStoryCutCreator,
        showEmberStoryCuts, setShowEmberStoryCuts,
        showStoryModal, setShowStoryModal,
        showLocationModal, setShowLocationModal,
        showTimeDateModal, setShowTimeDateModal,
        showImageAnalysisModal, setShowImageAnalysisModal,
        showTaggedPeopleModal, setShowTaggedPeopleModal,
        showSupportingMediaModal, setShowSupportingMediaModal,
        showStoryCutDetail, setShowStoryCutDetail,
        showDeleteConfirm, setShowDeleteConfirm,
        // Utility function
        closeAllModals
    };
};

// Hook for managing audio playback state
export const useAudioState = () => {
    const [isPlaying, setIsPlaying] = useState(false);
    const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
    const [showFullscreenPlay, setShowFullscreenPlay] = useState(false);
    const [currentAudio, setCurrentAudio] = useState(null);
    const [activeAudioSegments, setActiveAudioSegments] = useState([]);
    const [showEndHold, setShowEndHold] = useState(false);
    const [currentVoiceType, setCurrentVoiceType] = useState(null);
    const [currentVoiceTransparency, setCurrentVoiceTransparency] = useState(0.2);
    const [currentMediaColor, setCurrentMediaColor] = useState(null);
    const [currentZoomScale, setCurrentZoomScale] = useState({ start: 1.0, end: 1.0 });
    const [currentMediaImageUrl, setCurrentMediaImageUrl] = useState(null);
    const [currentlyPlayingStoryCut, setCurrentlyPlayingStoryCut] = useState(null);

    // Sentence-by-sentence display state
    const [currentDisplayText, setCurrentDisplayText] = useState('');
    const [currentVoiceTag, setCurrentVoiceTag] = useState('');
    const [currentSentenceIndex, setCurrentSentenceIndex] = useState(0);
    const [currentSegmentSentences, setCurrentSegmentSentences] = useState([]);
    const [sentenceTimeouts, setSentenceTimeouts] = useState([]);
    const [mediaTimeouts, setMediaTimeouts] = useState([]);

    // Refs for audio management
    const playbackStoppedRef = useRef(false);
    const mediaTimeoutsRef = useRef([]);

    const resetAudioState = () => {
        setIsPlaying(false);
        setIsGeneratingAudio(false);
        setShowFullscreenPlay(false);
        setCurrentAudio(null);
        setActiveAudioSegments([]);
        setShowEndHold(false);
        setCurrentVoiceType(null);
        setCurrentVoiceTransparency(0.2);
        setCurrentMediaColor(null);
        setCurrentZoomScale({ start: 1.0, end: 1.0 });
        setCurrentMediaImageUrl(null);
        setCurrentlyPlayingStoryCut(null);
        setCurrentDisplayText('');
        setCurrentVoiceTag('');
        setCurrentSentenceIndex(0);
        setCurrentSegmentSentences([]);
        setSentenceTimeouts([]);
        setMediaTimeouts([]);
        playbackStoppedRef.current = false;
        mediaTimeoutsRef.current = [];
    };

    return {
        // Audio playback state
        isPlaying, setIsPlaying,
        isGeneratingAudio, setIsGeneratingAudio,
        showFullscreenPlay, setShowFullscreenPlay,
        currentAudio, setCurrentAudio,
        activeAudioSegments, setActiveAudioSegments,
        showEndHold, setShowEndHold,
        currentVoiceType, setCurrentVoiceType,
        currentVoiceTransparency, setCurrentVoiceTransparency,
        currentMediaColor, setCurrentMediaColor,
        currentZoomScale, setCurrentZoomScale,
        currentMediaImageUrl, setCurrentMediaImageUrl,
        currentlyPlayingStoryCut, setCurrentlyPlayingStoryCut,

        // Sentence display state
        currentDisplayText, setCurrentDisplayText,
        currentVoiceTag, setCurrentVoiceTag,
        currentSentenceIndex, setCurrentSentenceIndex,
        currentSegmentSentences, setCurrentSegmentSentences,
        sentenceTimeouts, setSentenceTimeouts,
        mediaTimeouts, setMediaTimeouts,

        // Refs
        playbackStoppedRef,
        mediaTimeoutsRef,

        // Utility function
        resetAudioState
    };
};

// Hook for managing form and editing state
export const useFormState = () => {
    const [isEditingTitle, setIsEditingTitle] = useState(false);
    const [newTitle, setNewTitle] = useState('');
    const [message, setMessage] = useState(null);
    const [isEditingScript, setIsEditingScript] = useState(false);
    const [editedScript, setEditedScript] = useState('');
    const [isSavingScript, setIsSavingScript] = useState(false);
    const [formattedScript, setFormattedScript] = useState('');

    const resetFormState = () => {
        setIsEditingTitle(false);
        setNewTitle('');
        setMessage(null);
        setIsEditingScript(false);
        setEditedScript('');
        setIsSavingScript(false);
        setFormattedScript('');
    };

    return {
        // Title editing
        isEditingTitle, setIsEditingTitle,
        newTitle, setNewTitle,

        // Messages
        message, setMessage,

        // Script editing
        isEditingScript, setIsEditingScript,
        editedScript, setEditedScript,
        isSavingScript, setIsSavingScript,
        formattedScript, setFormattedScript,

        // Utility function
        resetFormState
    };
};

// Hook for managing story creation state
export const useStoryCreationState = () => {
    const [emberLength, setEmberLength] = useState(10);
    const [selectedVoices, setSelectedVoices] = useState([]);
    const [useEmberVoice, setUseEmberVoice] = useState(true);
    const [useNarratorVoice, setUseNarratorVoice] = useState(true);
    const [selectedStoryStyle, setSelectedStoryStyle] = useState('');
    const [isGeneratingStoryCut, setIsGeneratingStoryCut] = useState(false);
    const [storyTitle, setStoryTitle] = useState('');
    const [storyFocus, setStoryFocus] = useState('');
    const [selectedStoryCut, setSelectedStoryCut] = useState(null);

    const resetStoryCreationState = () => {
        setEmberLength(10);
        setSelectedVoices([]);
        setUseEmberVoice(true);
        setUseNarratorVoice(true);
        setSelectedStoryStyle('');
        setIsGeneratingStoryCut(false);
        setStoryTitle('');
        setStoryFocus('');
        setSelectedStoryCut(null);
    };

    return {
        // Story creation settings
        emberLength, setEmberLength,
        selectedVoices, setSelectedVoices,
        useEmberVoice, setUseEmberVoice,
        useNarratorVoice, setUseNarratorVoice,
        selectedStoryStyle, setSelectedStoryStyle,
        isGeneratingStoryCut, setIsGeneratingStoryCut,
        storyTitle, setStoryTitle,
        storyFocus, setStoryFocus,
        selectedStoryCut, setSelectedStoryCut,

        // Utility function
        resetStoryCreationState
    };
};

// Hook for managing deletion state
export const useDeletionState = () => {
    const [storyCutToDelete, setStoryCutToDelete] = useState(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const resetDeletionState = () => {
        setStoryCutToDelete(null);
        setIsDeleting(false);
    };

    return {
        storyCutToDelete, setStoryCutToDelete,
        isDeleting, setIsDeleting,
        resetDeletionState
    };
};

// Hook for managing loading states
export const useLoadingState = () => {
    const [isAutoAnalyzing, setIsAutoAnalyzing] = useState(false);
    const [isAutoLocationProcessing, setIsAutoLocationProcessing] = useState(false);
    const [isExifProcessing, setIsExifProcessing] = useState(false);

    const resetLoadingState = () => {
        setIsAutoAnalyzing(false);
        setIsAutoLocationProcessing(false);
        setIsExifProcessing(false);
    };

    return {
        isAutoAnalyzing, setIsAutoAnalyzing,
        isAutoLocationProcessing, setIsAutoLocationProcessing,
        isExifProcessing, setIsExifProcessing,
        resetLoadingState
    };
};

// Hook for managing voting state
export const useVotingState = () => {
    const [hasVoted, setHasVoted] = useState(false);
    const [votingResults, setVotingResults] = useState([]);
    const [totalVotes, setTotalVotes] = useState(0);
    const [userVote, setUserVote] = useState(null);

    const resetVotingState = () => {
        setHasVoted(false);
        setVotingResults([]);
        setTotalVotes(0);
        setUserVote(null);
    };

    return {
        hasVoted, setHasVoted,
        votingResults, setVotingResults,
        totalVotes, setTotalVotes,
        userVote, setUserVote,
        resetVotingState
    };
};

// Composite hook that combines all UI state management
export const useUIState = () => {
    const modalState = useModalState();
    const audioState = useAudioState();
    const formState = useFormState();
    const storyCreationState = useStoryCreationState();
    const deletionState = useDeletionState();
    const loadingState = useLoadingState();
    const votingState = useVotingState();

    const resetAllUIState = () => {
        modalState.closeAllModals();
        audioState.resetAudioState();
        formState.resetFormState();
        storyCreationState.resetStoryCreationState();
        deletionState.resetDeletionState();
        loadingState.resetLoadingState();
        votingState.resetVotingState();
    };

    return {
        // Modal state
        ...modalState,
        // Audio state
        ...audioState,
        // Form state
        ...formState,
        // Story creation state
        ...storyCreationState,
        // Deletion state
        ...deletionState,
        // Loading state
        ...loadingState,
        // Voting state
        ...votingState,
        // Global reset
        resetAllUIState
    };
}; 