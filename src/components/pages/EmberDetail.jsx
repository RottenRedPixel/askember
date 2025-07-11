import { useState, useEffect, startTransition, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from '@/components/ui/carousel';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from '@/components/ui/drawer';
import { Label } from '@/components/ui/label';
import { getEmber, updateEmberTitle, saveStoryCut, getStoryCutsForEmber, getAllStoryMessagesForEmber, deleteStoryCut, setPrimaryStoryCut, getPrimaryStoryCut, getEmberSupportingMedia } from '@/lib/database';
import { getEmberWithSharing } from '@/lib/sharing';
import { getEmberPhotos } from '@/lib/photos';
import EmberChat from '@/components/EmberChat';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Flower, Microphone, Keyboard, CornersOut, ArrowCircleUp, Aperture, Chats, Smiley, ShareNetwork, PencilSimple, Info, Camera, MapPin, MagnifyingGlass, Campfire, Gear, PenNib, CheckCircle, BookOpen, Users, Lightbulb, Eye, Clock, Package, UsersThree, PlayCircle, Sliders, CirclesFour, FilmSlate, ImageSquare, House, UserCirclePlus, Trash, Link, Copy, QrCode, ArrowsClockwise, Heart, HeartStraight, Calendar, Play, Pause, X, Circle, Share, Export, Star } from 'phosphor-react';
import { Sparkles } from 'lucide-react';

import FeaturesCard from '@/components/FeaturesCard';

import InviteModal from '@/components/InviteModal';
import StoryModal from '@/components/StoryModal';
import LocationModal from '@/components/LocationModal';
import TimeDateModal from '@/components/TimeDateModal';
import ImageAnalysisModal from '@/components/ImageAnalysisModal';
import TaggedPeopleModal from '@/components/TaggedPeopleModal';
import SupportingMediaModal from '@/components/SupportingMediaModal';


import EmberNamesModal from '@/components/EmberNamesModal';
import EmberWikiPanel from '@/components/EmberWikiPanel';
import QRCodeGenerator from '@/components/QRCodeGenerator';
import { textToSpeech, getVoices } from '@/lib/elevenlabs';
// Prompts functionality has been removed
import { cn } from '@/lib/utils';
import useStore from '@/store';
import { formatRelativeTime, formatDuration, formatDisplayDate, formatDisplayLocation } from '@/lib/dateUtils';
import { getStyleDisplayName } from '@/lib/styleUtils';
import OwnerMessageAudioControls from '@/components/OwnerMessageAudioControls';
import ShareSlideOutContent from '@/components/ShareSlideOutContent';
import {
  parseScriptSegments,
  parseSentences,
  estimateSentenceTimings,
  getVoiceType,
  extractColorFromAction,
  extractTransparencyFromAction,
  extractZoomScaleFromAction,
  estimateSegmentDuration,
  resolveMediaReference,
  formatScriptForDisplay
} from '@/lib/scriptParser';
import { debugRecordedAudio, generateSegmentAudio, playMultiVoiceAudio } from '@/lib/emberPlayer';

import StoryCutDetailContent from '@/components/StoryCutDetailContent';
import StoryModalContent from '@/components/StoryModalContent';


export default function EmberDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [ember, setEmber] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showFullImage, setShowFullImage] = useState(false);
  const [showEmberSharing, setShowEmberSharing] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showNamesModal, setShowNamesModal] = useState(false);
  const [showEmberWiki, setShowEmberWiki] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [message, setMessage] = useState(null);
  const { user, userProfile } = useStore();
  const [hasVoted, setHasVoted] = useState(false);
  const [votingResults, setVotingResults] = useState([]);
  const [totalVotes, setTotalVotes] = useState(0);
  const [userVote, setUserVote] = useState(null);
  const [sharedUsers, setSharedUsers] = useState([]);
  const [showStoryCutCreator, setShowStoryCutCreator] = useState(false);
  const [showEmberStoryCuts, setShowEmberStoryCuts] = useState(false);
  const [showStoryModal, setShowStoryModal] = useState(false);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [showTimeDateModal, setShowTimeDateModal] = useState(false);
  const [showImageAnalysisModal, setShowImageAnalysisModal] = useState(false);
  const [showTaggedPeopleModal, setShowTaggedPeopleModal] = useState(false);
  const [showSupportingMediaModal, setShowSupportingMediaModal] = useState(false);

  const [taggedPeopleCount, setTaggedPeopleCount] = useState(0);
  const [taggedPeopleData, setTaggedPeopleData] = useState([]);
  const [emberLength, setEmberLength] = useState(10);
  const [selectedVoices, setSelectedVoices] = useState([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [userPermission, setUserPermission] = useState('none');
  const [isPlaying, setIsPlaying] = useState(false);
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
  const [showFullscreenPlay, setShowFullscreenPlay] = useState(false);
  const [currentAudio, setCurrentAudio] = useState(null);
  const [activeAudioSegments, setActiveAudioSegments] = useState([]);
  const playbackStoppedRef = useRef(false);
  const [showEndHold, setShowEndHold] = useState(false);
  const [currentVoiceType, setCurrentVoiceType] = useState(null);
  const [currentVoiceTransparency, setCurrentVoiceTransparency] = useState(0.2);
  const [currentMediaColor, setCurrentMediaColor] = useState(null);
  const [currentZoomScale, setCurrentZoomScale] = useState({ start: 1.0, end: 1.0 });
  const [currentMediaImageUrl, setCurrentMediaImageUrl] = useState(null);
  const [availableVoices, setAvailableVoices] = useState([]);
  const [selectedEmberVoice, setSelectedEmberVoice] = useState('');
  const [selectedNarratorVoice, setSelectedNarratorVoice] = useState('');
  const [voicesLoading, setVoicesLoading] = useState(false);
  const [useEmberVoice, setUseEmberVoice] = useState(true);
  const [useNarratorVoice, setUseNarratorVoice] = useState(true);
  const [selectedStoryStyle, setSelectedStoryStyle] = useState('');
  const [isGeneratingStoryCut, setIsGeneratingStoryCut] = useState(false);
  const [storyTitle, setStoryTitle] = useState('');
  const [storyFocus, setStoryFocus] = useState('');
  const [storyCuts, setStoryCuts] = useState([]);
  const [storyCutsLoading, setStoryCutsLoading] = useState(false);
  const [availableStoryStyles, setAvailableStoryStyles] = useState([]);
  const [stylesLoading, setStylesLoading] = useState(false);
  const [selectedStoryCut, setSelectedStoryCut] = useState(null);
  const [showStoryCutDetail, setShowStoryCutDetail] = useState(false);
  const [currentlyPlayingStoryCut, setCurrentlyPlayingStoryCut] = useState(null);
  const [primaryStoryCut, setPrimaryStoryCutState] = useState(null);

  // Delete story cut state
  const [storyCutToDelete, setStoryCutToDelete] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Image analysis data state
  const [imageAnalysisData, setImageAnalysisData] = useState(null);

  // Story messages state
  const [storyMessages, setStoryMessages] = useState([]);
  const [storyContributorCount, setStoryContributorCount] = useState(0);

  // Supporting media state
  const [supportingMedia, setSupportingMedia] = useState([]);

  // Media selection for story cuts
  const [availableMediaForStory, setAvailableMediaForStory] = useState([]);
  const [selectedMediaForStory, setSelectedMediaForStory] = useState([]);
  const [mediaLoadingForStory, setMediaLoadingForStory] = useState(false);

  // Script editing state
  const [isEditingScript, setIsEditingScript] = useState(false);
  const [editedScript, setEditedScript] = useState('');
  const [isSavingScript, setIsSavingScript] = useState(false);
  const [formattedScript, setFormattedScript] = useState('');

  // Synchronized text display state (Option 1B: Sentence-by-Sentence)
  const [currentDisplayText, setCurrentDisplayText] = useState('');
  const [currentVoiceTag, setCurrentVoiceTag] = useState('');
  const [currentSentenceIndex, setCurrentSentenceIndex] = useState(0);
  const [currentSegmentSentences, setCurrentSegmentSentences] = useState([]);
  const [sentenceTimeouts, setSentenceTimeouts] = useState([]);
  const [mediaTimeouts, setMediaTimeouts] = useState([]);

  // 🎯 State for auto-analysis loading indicator
  const [isAutoAnalyzing, setIsAutoAnalyzing] = useState(false);

  // 🎯 State for auto-location processing loading indicator
  const [isAutoLocationProcessing, setIsAutoLocationProcessing] = useState(false);

  // 🎯 State for EXIF processing loading indicator
  const [isExifProcessing, setIsExifProcessing] = useState(false);

  // 🐛 DEBUG: Test prompt format
  const testPromptFormat = async () => {
    try {
      const { testCurrentPrompt } = await import('@/lib/initializePrompts');
      const result = await testCurrentPrompt();

      if (result) {
        const status = result.hasAiScript ? '✅ CORRECT (ai_script)' : '❌ OLD (full_script)';
        console.log(`🔍 PROMPT STATUS: ${status}`);
        console.log(`📝 Version: ${result.version}`);
        setMessage({
          type: result.hasAiScript ? 'success' : 'error',
          text: `Prompt ${status} - Version: ${result.version}`
        });
      } else {
        console.log('❌ No prompt found');
        setMessage({ type: 'error', text: 'No prompt found in database' });
      }
    } catch (error) {
      console.error('❌ Error testing prompt:', error);
      setMessage({ type: 'error', text: 'Error testing prompt format' });
    }
  };

  // 🐛 EXPOSE DEBUG FUNCTION TO CONSOLE
  useEffect(() => {
    window.testPromptFormat = testPromptFormat;
    console.log('🐛 DEBUG: Call window.testPromptFormat() to test current prompt format');

    return () => {
      delete window.testPromptFormat;
    };
  }, []);

  // Media query hook for responsive design
  const useMediaQuery = (query) => {
    const [matches, setMatches] = useState(false);

    useEffect(() => {
      const media = window.matchMedia(query);
      if (media.matches !== matches) {
        setMatches(media.matches);
      }
      const listener = () => setMatches(media.matches);
      media.addListener(listener);
      return () => media.removeListener(listener);
    }, [query]);

    return matches;
  };

  const isMobile = useMediaQuery('(max-width: 768px)');

  // Fetch available ElevenLabs voices
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

  // Fetch available story styles from database
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

      // Force a re-render by updating the story cuts state
      if (storyCuts.length > 0) {
        setStoryCuts(prev => [...prev]);
      }
    } catch (error) {
      console.error('Failed to fetch story styles:', error);
      setAvailableStoryStyles([]);
    } finally {
      setStylesLoading(false);
    }
  };

  // Fetch voices and story styles on component mount
  useEffect(() => {
    fetchVoices();
    fetchStoryStyles();
  }, []);

  // Fetch media when story creation modal opens
  useEffect(() => {
    if (showStoryCutCreator && ember?.id) {
      fetchMediaForStory();
    }
  }, [showStoryCutCreator, ember?.id]);

  // Format script for display when selectedStoryCut changes
  useEffect(() => {
    const formatScript = async () => {
      if (selectedStoryCut && selectedStoryCut.full_script && ember) {
        try {
          const formatted = await formatScriptForDisplay(selectedStoryCut.full_script, ember, selectedStoryCut);
          setFormattedScript(formatted);
        } catch (error) {
          console.error('Error formatting script:', error);
          setFormattedScript('Error formatting script for display');
        }
      } else {
        setFormattedScript('');
      }
    };

    formatScript();
  }, [selectedStoryCut, ember]);

  // Cleanup all audio when component unmounts
  useEffect(() => {
    return () => {
      console.log('🧹 Component unmounting, cleaning up audio...');
      // Stop any playing audio
      if (currentAudio) {
        currentAudio.pause();
        currentAudio.currentTime = 0;
      }

      playbackStoppedRef.current = true;
    };
  }, [currentAudio]);

  // Create a ref to store media timeouts for cleanup
  const mediaTimeoutsRef = useRef([]);

  // Cleanup media timeouts when component unmounts
  useEffect(() => {
    return () => {
      // Clean up any media timeouts on unmount
      mediaTimeoutsRef.current.forEach(timeoutId => clearTimeout(timeoutId));
    };
  }, []); // Empty dependency array - only runs on unmount

  // Fetch tagged people data for the current ember
  const fetchTaggedPeopleData = async () => {
    if (!ember?.id) return;

    try {
      const { getEmberTaggedPeople } = await import('@/lib/database');
      const taggedPeople = await getEmberTaggedPeople(ember.id);
      setTaggedPeopleData(taggedPeople);
      setTaggedPeopleCount(taggedPeople.length);
    } catch (error) {
      console.error('Error fetching tagged people:', error);
      setTaggedPeopleData([]);
      setTaggedPeopleCount(0);
    }
  };

  // Fetch story cuts for the current ember
  const fetchStoryCuts = async () => {
    if (!ember?.id) return;

    try {
      setStoryCutsLoading(true);
      const cuts = await getStoryCutsForEmber(ember.id);
      setStoryCuts(cuts);

      // Also fetch the primary story cut
      const primary = await getPrimaryStoryCut(ember.id);
      setPrimaryStoryCutState(primary);

      // Auto-set single story cut as "The One" if no primary exists
      if (cuts.length === 1 && !primary && userProfile?.user_id) {
        try {
          console.log('🎬 Auto-setting single story cut as "The One":', cuts[0].title);
          await setPrimaryStoryCut(cuts[0].id, ember.id, userProfile.user_id);

          // Refresh to get the updated primary status
          const updatedPrimary = await getPrimaryStoryCut(ember.id);
          setPrimaryStoryCutState(updatedPrimary);
        } catch (error) {
          console.error('Error auto-setting primary story cut:', error);
        }
      }
    } catch (error) {
      console.error('Error fetching story cuts:', error);
      setStoryCuts([]);
    } finally {
      setStoryCutsLoading(false);
    }
  };

  // Fetch story messages for the current ember
  const fetchStoryMessages = async () => {
    if (!ember?.id) return;

    try {
      const result = await getAllStoryMessagesForEmber(ember.id);
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

      console.log(`📊 Story data updated: ${userResponses.length} user responses from ${uniqueContributors.size} contributors (${allMessages.length} total messages)`);
    } catch (error) {
      console.error('Error fetching story messages:', error);
      setStoryMessages([]);
      setStoryContributorCount(0);
    }
  };

  // Set a story cut as the primary one
  const handleSetPrimary = async (storyCutId) => {
    if (!ember?.id || !userProfile?.user_id) return;

    try {
      await setPrimaryStoryCut(storyCutId, ember.id, userProfile.user_id);

      // Refresh the story cuts and primary status
      await fetchStoryCuts();

      setMessage({
        type: 'success',
        text: 'Story cut set as "The One" successfully!'
      });
    } catch (error) {
      console.error('Error setting primary story cut:', error);
      setMessage({
        type: 'error',
        text: 'Failed to set as primary. Only the ember owner can do this.'
      });
    } finally {
      setTimeout(() => setMessage(null), 3000);
    }
  };

  // Fetch story cuts and tagged people when ember changes
  useEffect(() => {
    if (ember?.id) {
      fetchStoryCuts();
      fetchTaggedPeopleData();
    }
  }, [ember?.id]);

  // Force re-render of story cuts when styles are loaded
  useEffect(() => {
    if (availableStoryStyles.length > 0 && storyCuts.length > 0) {
      // Trigger a re-render by updating the story cuts state
      setStoryCuts(prev => [...prev]);
    }
  }, [availableStoryStyles.length]);

  // Set up global actions for EmberWikiPanel to access
  useEffect(() => {
    window.EmberDetailActions = {
      openStoryCutCreator: () => {
        setShowStoryCutCreator(true);
      },
      refreshStoryCuts: fetchStoryCuts,
      // 🐛 DEBUG: Expose debug helper globally
      debugRecordedAudio: (recordedAudio, scriptSegments) => {
        debugRecordedAudio(recordedAudio, scriptSegments);
      }
    };

    // Cleanup
    return () => {
      delete window.EmberDetailActions;
    };
  }, []);

  // Auto-select owner's voice when story cut creator opens
  useEffect(() => {
    if (showStoryCutCreator && ember?.user_id && !selectedVoices.includes(ember.user_id)) {
      console.log('🎤 Auto-selecting owner\'s voice for story cut creator');
      setSelectedVoices(prev => [...prev, ember.user_id]);
    }
  }, [showStoryCutCreator, ember?.user_id]);

  // 🎯 Auto-trigger image analysis if not yet completed (mobile fix)
  const autoTriggerImageAnalysis = async (ember) => {
    if (!ember?.id || !ember?.image_url || !user?.id) {
      console.log('🔍 [AUTO-ANALYSIS] Missing required data for auto-analysis');
      return;
    }

    // Check if analysis already exists or is in progress
    if (ember.image_analysis_completed || imageAnalysisData || isAutoAnalyzing) {
      console.log('🔍 [AUTO-ANALYSIS] Analysis already exists/in progress, skipping auto-trigger');
      return;
    }

    try {
      console.log('🔍 [AUTO-ANALYSIS] Starting automatic image analysis for ember:', ember.id);
      console.log('📸 [AUTO-ANALYSIS] Image URL:', ember.image_url.substring(0, 50) + '...');

      // Set loading state
      setIsAutoAnalyzing(true);

      // Import the analysis functions dynamically
      const { triggerImageAnalysis, saveImageAnalysis } = await import('@/lib/database');

      // Trigger the analysis
      const analysisResult = await triggerImageAnalysis(ember.id, ember.image_url);

      if (analysisResult && analysisResult.success) {
        console.log('💾 [AUTO-ANALYSIS] Saving analysis result...');

        // Save the analysis result
        await saveImageAnalysis(
          ember.id,
          user.id,
          analysisResult.analysis,
          ember.image_url,
          analysisResult.model,
          analysisResult.tokensUsed
        );

        console.log('✅ [AUTO-ANALYSIS] Image analysis completed and saved automatically');

        // Refresh ember data to show the analysis
        await fetchEmber();

      } else {
        console.warn('⚠️ [AUTO-ANALYSIS] Analysis result was not successful:', analysisResult);
      }

    } catch (error) {
      console.error('❌ [AUTO-ANALYSIS] Automatic image analysis failed:', error);
      // Don't show user error for background auto-analysis - they can always trigger manually
    } finally {
      // Clear loading state
      setIsAutoAnalyzing(false);
    }
  };

  // 🎯 Auto-trigger EXIF processing if not yet completed (ultra-fast creation)
  const autoTriggerExifProcessing = async (ember) => {
    if (!ember?.id || !ember?.image_url || !user?.id) {
      console.log('📸 [AUTO-EXIF] Missing required data for auto-EXIF processing');
      return;
    }

    // Check if EXIF processing already done or in progress
    if (isExifProcessing) {
      console.log('📸 [AUTO-EXIF] EXIF processing already in progress, skipping');
      return;
    }

    // Check if we already have photos with EXIF data for this ember
    try {
      const { getEmberPhotos } = await import('@/lib/photos');
      const photos = await getEmberPhotos(ember.id);

      if (photos && photos.length > 0) {
        console.log('📸 [AUTO-EXIF] EXIF processing already completed, skipping');
        return;
      }
    } catch (error) {
      console.log('📸 [AUTO-EXIF] Could not check existing photos, proceeding with EXIF processing');
    }

    try {
      console.log('📸 [AUTO-EXIF] Starting automatic EXIF processing for ember:', ember.id);
      console.log('📸 [AUTO-EXIF] Image URL:', ember.image_url.substring(0, 50) + '...');

      // Set loading state
      setIsExifProcessing(true);

      // Fetch the image from the blob URL
      console.log('📸 [AUTO-EXIF] Fetching image from blob URL...');
      const response = await fetch(ember.image_url);
      const blob = await response.blob();

      // Convert blob to File object
      const file = new File([blob], 'ember-image.jpg', { type: blob.type });

      // Import the photo functions dynamically
      const { uploadImageWithExif } = await import('@/lib/photos');
      const { autoUpdateEmberTimestamp } = await import('@/lib/geocoding');

      // Process EXIF data
      console.log('📸 [AUTO-EXIF] Processing EXIF data...');
      const photoResult = await uploadImageWithExif(file, user.id, ember.id);

      if (photoResult.success) {
        console.log('📸 [AUTO-EXIF] EXIF processing completed successfully');

        // Process timestamp data
        try {
          console.log('🕐 [AUTO-EXIF] Processing timestamp data...');
          await autoUpdateEmberTimestamp(ember, photoResult, user.id);
          console.log('✅ [AUTO-EXIF] Timestamp data processed successfully');
        } catch (timestampError) {
          console.warn('⚠️ [AUTO-EXIF] Failed to process timestamp data:', timestampError);
        }

        // Refresh ember data to show the updates
        await fetchEmber();

      } else {
        console.warn('⚠️ [AUTO-EXIF] EXIF processing was not successful:', photoResult);
      }

    } catch (error) {
      console.error('❌ [AUTO-EXIF] Automatic EXIF processing failed:', error);
      // Don't show user error for background auto-EXIF - not critical for user experience
    } finally {
      // Clear loading state
      setIsExifProcessing(false);
    }
  };

  // 🎯 Auto-trigger location processing if not yet completed (Android mobile fix)
  const autoTriggerLocationProcessing = async (ember) => {
    if (!ember?.id || !user?.id) {
      console.log('📍 [AUTO-LOCATION] Missing required data for auto-location processing');
      return;
    }

    // Check if location already exists or is in progress
    if (ember.latitude && ember.longitude || isAutoLocationProcessing) {
      console.log('📍 [AUTO-LOCATION] Location already exists/in progress, skipping auto-trigger');
      return;
    }

    try {
      console.log('📍 [AUTO-LOCATION] Starting automatic location processing for ember:', ember.id);

      // Set loading state
      setIsAutoLocationProcessing(true);

      // Import the photo functions dynamically
      const { getEmberPhotos } = await import('@/lib/photos');
      const { autoUpdateEmberLocation } = await import('@/lib/geocoding');

      // Get photos for this ember
      const photos = await getEmberPhotos(ember.id);

      if (photos && photos.length > 0) {
        // Find the first photo with GPS data
        const photoWithGPS = photos.find(photo => photo.latitude && photo.longitude);

        if (photoWithGPS) {
          console.log('📍 [AUTO-LOCATION] Found photo with GPS data, processing location...');

          // Create photoResult-like object for the location processing function
          const photoResult = {
            success: true,
            photo: photoWithGPS,
            hasGPS: true,
            hasTimestamp: !!photoWithGPS.timestamp
          };

          // Trigger the location processing
          const locationResult = await autoUpdateEmberLocation(ember, photoResult, user.id);

          if (locationResult) {
            console.log('✅ [AUTO-LOCATION] Location processing completed successfully');

            // Refresh ember data to show the location
            await fetchEmber();
          } else {
            console.log('📍 [AUTO-LOCATION] Location processing completed but no update needed');
          }
        } else {
          console.log('📍 [AUTO-LOCATION] No photos with GPS data found for this ember');
        }
      } else {
        console.log('📍 [AUTO-LOCATION] No photos found for this ember');
      }

    } catch (error) {
      console.error('❌ [AUTO-LOCATION] Automatic location processing failed:', error);
      // Don't show user error for background auto-location - location isn't critical
    } finally {
      // Clear loading state
      setIsAutoLocationProcessing(false);
    }
  };

  // Helper function to format relative time










  // Handle story cut deletion
  const handleDeleteStoryCut = async () => {
    if (!storyCutToDelete || !userProfile?.user_id) return;

    try {
      setIsDeleting(true);
      await deleteStoryCut(storyCutToDelete.id, userProfile.user_id);

      // Refresh the story cuts list
      await fetchStoryCuts();

      // Close modals and reset state
      setShowDeleteConfirm(false);
      setStoryCutToDelete(null);

      // If the deleted story cut was selected, close the detail view
      if (selectedStoryCut?.id === storyCutToDelete.id) {
        setSelectedStoryCut(null);
        setShowStoryCutDetail(false);
      }

      setMessage({
        type: 'success',
        text: `Story cut "${storyCutToDelete.title}" deleted successfully!`
      });

    } catch (error) {
      console.error('Error deleting story cut:', error);
      setMessage({
        type: 'error',
        text: 'Failed to delete story cut. Please try again.'
      });
    } finally {
      setIsDeleting(false);
      setTimeout(() => setMessage(null), 3000);
    }
  };

  // Check if current user can delete a story cut (must be creator)
  const canDeleteStoryCut = (storyCut) => {
    return userProfile?.user_id === storyCut.creator_user_id;
  };



  // Generate story cut with OpenAI
  const handleGenerateStoryCut = async () => {
    try {
      setIsGeneratingStoryCut(true);
      setMessage(null);

      // 🔄 ENSURE DATABASE HAS UPDATED AI-SCRIPT PROMPT
      console.log('🔄 Checking/updating prompt in database...');
      try {
        const { updateStoryCutGenerationPrompt } = await import('@/lib/initializePrompts');
        await updateStoryCutGenerationPrompt();
        console.log('✅ Prompt database updated successfully');
      } catch (promptError) {
        console.warn('⚠️ Could not update prompt, but continuing:', promptError.message);
      }

      // Form validation
      if (!selectedStoryStyle) {
        throw new Error('Please select a story style');
      }

      if (!emberLength || emberLength < 10 || emberLength > 300) {
        throw new Error('Duration must be between 10 and 300 seconds');
      }

      if (!useEmberVoice && !useNarratorVoice) {
        throw new Error('Please select at least one voice agent');
      }

      if (useEmberVoice && !selectedEmberVoice) {
        throw new Error('Please select an Ember voice');
      }

      if (useNarratorVoice && !selectedNarratorVoice) {
        throw new Error('Please select a Narrator voice');
      }

      if (!storyTitle.trim()) {
        throw new Error('Please enter a story title');
      }

      console.log('🎬 STARTING STORY CUT GENERATION');
      console.log('='.repeat(80));

      // Build form data
      const formData = {
        title: storyTitle.trim(),
        duration: emberLength,
        focus: storyFocus?.trim() || null
      };

      // Get story messages for richer context
      console.log('📖 Loading story circle conversations...');
      const allStoryMessages = await getAllStoryMessagesForEmber(ember.id);

      // Filter story messages to only include selected contributors' responses for direct quotes
      const selectedContributorQuotes = [];
      if (allStoryMessages?.messages) {
        allStoryMessages.messages.forEach(message => {
          // Only include user responses (not AI questions) from selected contributors
          if (message.sender === 'user' && message.message_type === 'answer' && selectedVoices.includes(message.user_id)) {
            selectedContributorQuotes.push({
              contributor_name: message.user_first_name || 'Anonymous',
              user_id: message.user_id,
              content: message.content,
              timestamp: message.created_at
            });
          }
        });
      }

      // Note: Direct OpenAI function builds its own context internally

      // Get selected voice details
      const emberVoiceInfo = useEmberVoice ? availableVoices.find(v => v.voice_id === selectedEmberVoice) : null;
      const narratorVoiceInfo = useNarratorVoice ? availableVoices.find(v => v.voice_id === selectedNarratorVoice) : null;

      // Get selected users for voice casting
      const selectedUserDetails = [];
      if (ember?.owner && selectedVoices.includes(ember.user_id)) {
        selectedUserDetails.push({
          id: ember.user_id,
          name: ember.owner.first_name || 'Owner',
          role: 'owner'
        });
      }
      sharedUsers.forEach(user => {
        if (selectedVoices.includes(user.user_id)) {
          selectedUserDetails.push({
            id: user.user_id,
            name: user.first_name || 'User',
            role: user.permission_level
          });
        }
      });

      // Build voice casting object
      const voiceCasting = {
        useEmberVoice: useEmberVoice,
        useNarratorVoice: useNarratorVoice,
        ember: useEmberVoice ? {
          voice_id: selectedEmberVoice,
          name: emberVoiceInfo?.name || 'Selected Voice',
          labels: emberVoiceInfo?.labels || {}
        } : null,
        narrator: useNarratorVoice ? {
          voice_id: selectedNarratorVoice,
          name: narratorVoiceInfo?.name || 'Selected Voice',
          labels: narratorVoiceInfo?.labels || {}
        } : null,
        contributors: selectedUserDetails
      };

      console.log('📊 GENERATION DETAILS:');
      console.log('🎭 Style:', selectedStoryStyle);
      console.log('📚 Story Messages:', allStoryMessages?.messages?.length || 0);
      console.log('💬 Direct Quotes:', selectedContributorQuotes.length);
      console.log('⏱️ Duration:', emberLength, 'seconds');
      console.log('🎤 Voice Casting:', {
        ember: emberVoiceInfo?.name,
        narrator: narratorVoiceInfo?.name,
        contributors: selectedUserDetails.length
      });
      console.log('🎯 Focus:', formData.focus || 'General storytelling');
      console.log('='.repeat(80));

      // Generate story cut using unified API route (both localhost and deployed)
      console.log('🤖 Generating story cut...');

      // Build context for API call
      console.log('🌍 Building context for API call...');
      const { emberContextBuilders } = await import('@/lib/emberContext');
      const emberContext = await emberContextBuilders.forStoryCut(ember.id);

      const storyConversations = allStoryMessages?.messages ?
        allStoryMessages.messages
          .map(msg => `[${msg.sender === 'user' ? msg.user_first_name || 'User' : 'Ember AI'}]: ${msg.content}`)
          .join('\n\n') :
        'No story circle conversations available yet.';

      console.log('🔍 FRONTEND DEBUG - Voice casting being sent to API:', voiceCasting);
      console.log('🔍 FRONTEND DEBUG - Contributors array:', JSON.stringify(voiceCasting.contributors?.map(c => ({ id: c.id, name: c.name })), null, 2));

      // Get selected media details for API
      const selectedMediaDetails = availableMediaForStory.filter(media =>
        selectedMediaForStory.includes(media.id)
      );
      console.log('🚨 FRONTEND DEBUG - selectedMediaForStory IDs:', selectedMediaForStory);
      console.log('🚨 FRONTEND DEBUG - availableMediaForStory length:', availableMediaForStory.length);
      console.log('🚨 FRONTEND DEBUG - selectedMediaDetails length:', selectedMediaDetails.length);
      console.log('📸 FRONTEND DEBUG - Selected media for story:', selectedMediaDetails.map(m => ({
        id: m.id,
        name: m.name,
        filename: m.filename,
        type: m.type,
        category: m.category
      })));
      console.log('📸 FRONTEND DEBUG - FULL selected media objects:', selectedMediaDetails);

      // Use unified API approach instead of dynamic imports
      const response = await fetch('/api/generate-story-cut', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          formData,
          selectedStyle: selectedStoryStyle,
          emberContext,
          storyConversations,
          voiceCasting,
          emberId: ember.id,
          contributorQuotes: selectedContributorQuotes,
          selectedMedia: selectedMediaDetails
        })
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to generate story cut');
      }

      // Parse the generated story cut
      const generatedStoryCut = typeof result.data === 'string' ? JSON.parse(result.data) : result.data;

      console.log('✅ Story cut generated successfully:', generatedStoryCut.title);
      console.log('📄 Script length:', generatedStoryCut.full_script?.length || 0, 'characters');

      // 🔍 DEBUG: Log the complete API response structure
      console.log('🔍 DEBUG - Raw API result:', result);
      console.log('🔍 DEBUG - Generated story cut object:', generatedStoryCut);
      console.log('🔍 DEBUG - ai_script content:', generatedStoryCut.ai_script);
      console.log('🔍 DEBUG - full_script content:', generatedStoryCut.full_script);
      console.log('🔍 DEBUG - All fields in response:', Object.keys(generatedStoryCut));

      // Check if full_script is null/undefined and prevent database error
      if (!generatedStoryCut.full_script) {
        console.error('❌ CRITICAL: full_script is null/undefined. Cannot save story cut.');
        console.log('🔍 Available fields:', Object.keys(generatedStoryCut).join(', '));
        throw new Error('Story generation failed - no script content received from API');
      }

      // Save the story cut to database
      console.log('💾 Saving story cut to database...');
      const storyCutData = {
        emberId: ember.id,
        creatorUserId: userProfile.user_id,
        title: generatedStoryCut.title,
        style: selectedStoryStyle,
        duration: generatedStoryCut.duration,
        wordCount: generatedStoryCut.wordCount,
        storyFocus: formData.focus,
        full_script: generatedStoryCut.full_script,
        ember_voice_lines: generatedStoryCut.ember_voice_lines,
        narrator_voice_lines: generatedStoryCut.narrator_voice_lines,
        ember_voice_name: generatedStoryCut.ember_voice_name,
        narrator_voice_name: generatedStoryCut.narrator_voice_name,
        recordedAudio: generatedStoryCut.recordedAudio || {},
        voiceCasting: {
          emberVoice: voiceCasting.ember,
          narratorVoice: voiceCasting.narrator,
          contributors: voiceCasting.contributors
        },
        metadata: {
          ...generatedStoryCut.metadata,
          tokensUsed: result.tokensUsed,
          promptUsed: result.promptUsed,
          styleUsed: result.styleUsed,
          model: result.model,
          owner_lines: generatedStoryCut.owner_lines,
          contributor_lines: generatedStoryCut.contributor_lines,
          owner_first_name: generatedStoryCut.owner_first_name
        }
      };

      const savedStoryCut = await saveStoryCut(storyCutData);

      console.log('✅ Story cut saved with ID:', savedStoryCut.id);



      // Refresh the story cuts list to show the new one
      await fetchStoryCuts();

      // Close the creation modal
      setShowStoryCutCreator(false);

      // Show success message
      setMessage({
        type: 'success',
        text: `Story cut "${generatedStoryCut.title}" created successfully!`
      });

      // Reset form
      setStoryTitle('');
      setStoryFocus('');
      setSelectedVoices([]);
      setSelectedMediaForStory([]);

    } catch (error) {
      console.error('❌ Error generating story cut:', error);

      // Provide more specific error messages for different failure types
      let errorMessage = 'Failed to generate story cut. Please try again.';

      if (error.message.includes('OpenAI API key')) {
        errorMessage = 'OpenAI API key not configured. Please check your environment variables.';
      } else if (error.message.includes('quota exceeded')) {
        errorMessage = 'OpenAI API quota exceeded. Please check your billing or try again later.';
      } else if (error.message.includes('not found')) {
        errorMessage = 'Story generation prompts not properly configured. Please contact support.';
      } else if (error.message.includes('JSON')) {
        errorMessage = 'Failed to parse AI response. Please try again with a different configuration.';
      } else if (error.message.includes('HTTP')) {
        errorMessage = `API Error: ${error.message}`;
      } else {
        errorMessage = error.message;
      }

      setMessage({
        type: 'error',
        text: errorMessage
      });
    } finally {
      setIsGeneratingStoryCut(false);
      setTimeout(() => setMessage(null), 5000);
    }
  };

  // Handle voice selection
  const toggleVoiceSelection = (userId) => {
    setSelectedVoices(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  // Handle ember agent voice selection
  const toggleEmberVoice = () => {
    setUseEmberVoice(prev => !prev);
  };

  const toggleNarratorVoice = () => {
    setUseNarratorVoice(prev => !prev);
  };





  const fetchEmber = async () => {
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

      // Also fetch sharing information to get invited users and permission level
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
    } catch (err) {
      console.error('Error fetching ember:', err);
      setError('Ember not found');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchEmber();
  }, [id]);

  // Set initial story title when ember loads
  useEffect(() => {
    if (ember?.title) {
      setStoryTitle(ember.title);
    } else {
      setStoryTitle('Untitled Ember');
    }
  }, [ember?.title]);

  // Fetch dependent data when ember loads
  useEffect(() => {
    if (ember?.id) {
      fetchStoryMessages();
      fetchTaggedPeopleData();
      fetchStoryCuts();
      fetchSupportingMedia();

      // 🎯 Auto-trigger EXIF processing if needed (ultra-fast creation)
      autoTriggerExifProcessing(ember);

      // 🎯 Auto-trigger image analysis if needed (mobile fix)
      autoTriggerImageAnalysis(ember);

      // 🎯 Auto-trigger location processing if needed (Android mobile fix)
      autoTriggerLocationProcessing(ember);
    }
  }, [ember?.id]);

  const handleTitleEdit = () => {
    setNewTitle(ember.title || '');
    setIsEditingTitle(true);
  };

  const handleTitleCancel = () => {
    setIsEditingTitle(false);
    setNewTitle('');
  };

  const handleTitleSave = async () => {
    if (newTitle.trim() === '' || newTitle.trim() === ember.title) {
      setIsEditingTitle(false);
      return;
    }

    try {
      await updateEmberTitle(ember.id, newTitle, user.id);
      // Refetch complete ember data to preserve owner information
      await fetchEmber();
      setIsEditingTitle(false);
      setMessage({ type: 'success', text: 'Title updated successfully!' });
    } catch (error) {
      console.error('Failed to update title', error);
      setMessage({ type: 'error', text: 'Failed to update title.' });
    } finally {
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const handleEmberUpdate = async () => {
    // Refetch ember data when title is updated via modal
    await fetchEmber();
  };

  const handleTaggedPeopleUpdate = async () => {
    await fetchTaggedPeopleData();
  };

  const handleImageAnalysisUpdate = async () => {
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

  const handleStoryUpdate = async () => {
    // Refresh story data when updated via modal
    await fetchStoryMessages();
  };

  // Fetch supporting media for the current ember
  const fetchSupportingMedia = async () => {
    if (!ember?.id) return;

    try {
      const media = await getEmberSupportingMedia(ember.id);
      setSupportingMedia(media);
      console.log(`📁 Supporting media updated: ${media.length} files`);
    } catch (error) {
      console.error('Error fetching supporting media:', error);
      setSupportingMedia([]);
    }
  };

  const handleSupportingMediaUpdate = async () => {
    // Refresh supporting media data when updated
    await fetchSupportingMedia();
  };

  // Fetch available media for story cut creation
  const fetchMediaForStory = async () => {
    if (!ember?.id) return;

    try {
      setMediaLoadingForStory(true);
      console.log('📸 Fetching available media for story creation...');

      const [emberPhotos, supportingMediaFiles] = await Promise.all([
        getEmberPhotos(ember.id),
        getEmberSupportingMedia(ember.id)
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

      // Don't auto-select any media - let user choose
      setSelectedMediaForStory([]);

    } catch (error) {
      console.error('❌ Error fetching media for story:', error);
      setAvailableMediaForStory([]);
      setSelectedMediaForStory([]);
    } finally {
      setMediaLoadingForStory(false);
    }
  };

  // Media selection handlers for story creation
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

  // Script editing handlers
  const handleSaveScript = async () => {
    if (!selectedStoryCut || !editedScript.trim()) return;

    try {
      setIsSavingScript(true);

      console.log('💾 Saving script...');
      console.log('🔍 Edited script content (first 500 chars):', editedScript.trim().substring(0, 500));
      console.log('📝 Script has MEDIA lines:', editedScript.includes('[[MEDIA]]'));
      console.log('📝 Script has HOLD lines:', editedScript.includes('[[HOLD]]'));
      console.log('📝 Original selectedStoryCut script before save (first 500 chars):', selectedStoryCut.full_script.substring(0, 500));
      console.log('✅ SAVING EXACTLY what user typed - no modifications applied during save');

      // Count MEDIA and HOLD lines in edited script
      const mediaLines = (editedScript.match(/\[\[MEDIA\]\]/g) || []).length;
      const holdLines = (editedScript.match(/\[\[HOLD\]\]/g) || []).length;
      console.log('📊 Number of MEDIA lines in edited script:', mediaLines);
      console.log('📊 Number of HOLD lines in edited script:', holdLines);

      // 🚨 CRITICAL DEBUG: Find all HOLD lines in the edited script
      const holdMatches = editedScript.match(/\[\[HOLD\]\].*$/gm) || [];
      console.log('🚨 HOLD LINES FOUND IN EDITED SCRIPT:');
      holdMatches.forEach((holdLine, index) => {
        console.log(`  🚨 HOLD ${index + 1}: "${holdLine}"`);
      });

      // Import the update function
      const { updateStoryCut } = await import('@/lib/database');

      // Update the story cut with the new script
      const updatedStoryCut = await updateStoryCut(
        selectedStoryCut.id,
        { full_script: editedScript.trim() },
        user.id
      );

      console.log('📝 Database returned script (first 500 chars):', updatedStoryCut.full_script?.substring(0, 500));
      console.log('📝 Database script has MEDIA lines:', updatedStoryCut.full_script?.includes('[[MEDIA]]'));
      console.log('📝 Database script has HOLD lines:', updatedStoryCut.full_script?.includes('[[HOLD]]'));

      // Count MEDIA and HOLD lines in database response
      const dbMediaLines = (updatedStoryCut.full_script?.match(/\[\[MEDIA\]\]/g) || []).length;
      const dbHoldLines = (updatedStoryCut.full_script?.match(/\[\[HOLD\]\]/g) || []).length;
      console.log('📊 Number of MEDIA lines in database response:', dbMediaLines);
      console.log('📊 Number of HOLD lines in database response:', dbHoldLines);

      console.log('✅ Script saved successfully');

      // Update the local state with the actual saved script
      const updatedStoryCutWithScript = {
        ...updatedStoryCut,
        full_script: editedScript.trim() // Ensure we use the edited script
      };

      console.log('🔄 Updating selectedStoryCut with (first 500 chars):', updatedStoryCutWithScript.full_script.substring(0, 500));
      console.log('🔄 Updated script has MEDIA lines:', updatedStoryCutWithScript.full_script.includes('[[MEDIA]]'));
      console.log('🔄 Updated script has HOLD lines:', updatedStoryCutWithScript.full_script.includes('[[HOLD]]'));

      // Count MEDIA and HOLD lines in final state
      const finalMediaLines = (updatedStoryCutWithScript.full_script.match(/\[\[MEDIA\]\]/g) || []).length;
      const finalHoldLines = (updatedStoryCutWithScript.full_script.match(/\[\[HOLD\]\]/g) || []).length;
      console.log('📊 Number of MEDIA lines in final state:', finalMediaLines);
      console.log('📊 Number of HOLD lines in final state:', finalHoldLines);

      setSelectedStoryCut(updatedStoryCutWithScript);
      setStoryCuts(prev =>
        prev.map(cut =>
          cut.id === selectedStoryCut.id
            ? { ...cut, full_script: editedScript.trim() }
            : cut
        )
      );

      // Exit editing mode
      setIsEditingScript(false);
      setMessage({ type: 'success', text: 'Script updated successfully!' });

      // Refresh story cuts to ensure we have the latest data
      console.log('🔄 Refreshing story cuts to get latest data...');
      await fetchStoryCuts();
      console.log('🔄 Story cuts refreshed');

      // 🚨 FINAL DEBUG: Check what's actually in the selectedStoryCut after save
      console.log('🚨 FINAL SCRIPT AFTER SAVE:', selectedStoryCut.full_script);
      const finalHoldMatches = selectedStoryCut.full_script?.match(/\[\[HOLD\]\].*$/gm) || [];
      console.log('🚨 FINAL HOLD LINES IN STORED SCRIPT:');
      finalHoldMatches.forEach((holdLine, index) => {
        console.log(`  🚨 FINAL HOLD ${index + 1}: "${holdLine}"`);
      });

    } catch (error) {
      console.error('Failed to update script:', error);
      setMessage({ type: 'error', text: 'Failed to update script. Please try again.' });
    } finally {
      setIsSavingScript(false);
    }
  };

  const handleCancelScriptEdit = async () => {
    console.log('🔄 Canceling script edit...');
    console.log('📝 Current stored script:', selectedStoryCut.full_script);
    // Use the same formatting as the display view
    const editableScript = await formatScriptForDisplay(selectedStoryCut.full_script, ember, selectedStoryCut);
    console.log('📝 Loaded editable script:', editableScript);
    setEditedScript(editableScript);
    setIsEditingScript(false);
  };

  // Set edited script when selectedStoryCut changes
  useEffect(() => {
    const updateEditedScript = async () => {
      if (selectedStoryCut && selectedStoryCut.full_script && !isSavingScript) {
        console.log('🔄 useEffect: selectedStoryCut changed, updating edited script');
        console.log('📝 New selectedStoryCut script:', selectedStoryCut.full_script);

        // 🚨 CRITICAL DEBUG: Check for HOLD segments in the stored script
        const storedHoldMatches = selectedStoryCut.full_script.match(/\[\[HOLD\]\].*$/gm) || [];
        console.log('🚨 HOLD SEGMENTS IN STORED SCRIPT (useEffect):');
        storedHoldMatches.forEach((holdLine, index) => {
          console.log(`  🚨 STORED HOLD ${index + 1}: "${holdLine}"`);
        });

        // Use the same formatting as the display view
        const editableScript = await formatScriptForDisplay(selectedStoryCut.full_script, ember, selectedStoryCut);
        console.log('📝 Setting editedScript to:', editableScript);

        // 🚨 CRITICAL DEBUG: Check for HOLD segments in the editable script
        const editableHoldMatches = editableScript.match(/\[\[HOLD\]\].*$/gm) || [];
        console.log('🚨 HOLD SEGMENTS IN EDITABLE SCRIPT (useEffect):');
        editableHoldMatches.forEach((holdLine, index) => {
          console.log(`  🚨 EDITABLE HOLD ${index + 1}: "${holdLine}"`);
        });

        setEditedScript(editableScript);
      } else if (isSavingScript) {
        console.log('🔄 useEffect: Skipping script update because save is in progress');
      }
    };

    updateEditedScript();
  }, [selectedStoryCut, ember, isSavingScript]);

  // Extract all wiki content as text for narration
  const extractWikiContent = (ember) => {
    return `${ember.title}. ${ember.description}`;
  };



  // Handle completion of playback
  const handlePlaybackComplete = () => {
    console.log('🎬 Playback complete, showing end hold...');

    // Stop multi-voice playback chain
    playbackStoppedRef.current = true;

    // Stop all active audio segments
    activeAudioSegments.forEach((segment, index) => {
      if (segment.audio) {
        console.log(`🛑 Stopping segment ${index + 1}: [${segment.voiceTag}]`);
        segment.audio.pause();
        segment.audio.currentTime = 0;

        // Clean up blob URLs
        if (segment.url && segment.url.startsWith('blob:')) {
          URL.revokeObjectURL(segment.url);
        }
      }
    });

    // Clear states immediately
    setIsPlaying(false);
    setCurrentVoiceType(null);
    setCurrentVoiceTransparency(0.2); // Reset to default
    setCurrentMediaColor(null);
    setCurrentZoomScale({ start: 1.0, end: 1.0 }); // Reset to default
    setActiveAudioSegments([]);

    // Clean up any remaining media timeouts
    console.log('🧹 Cleaning up media timeouts on playback complete:', mediaTimeouts.length);
    mediaTimeouts.forEach(timeoutId => clearTimeout(timeoutId));
    mediaTimeoutsRef.current.forEach(timeoutId => clearTimeout(timeoutId));
    setMediaTimeouts([]);
    mediaTimeoutsRef.current = [];

    // Exit immediately after script completes
    handleExitPlay();
  };

  const handleExitPlay = () => {
    // Stop multi-voice playback chain
    playbackStoppedRef.current = true;

    // Stop current single audio if it exists
    if (currentAudio) {
      currentAudio.pause();
      currentAudio.currentTime = 0;
    }

    // Stop all active audio segments from multi-voice playbook
    activeAudioSegments.forEach((segment, index) => {
      if (segment.audio) {
        console.log(`🛑 Stopping segment ${index + 1}: [${segment.voiceTag}]`);
        segment.audio.pause();
        segment.audio.currentTime = 0;

        // Clean up blob URLs
        if (segment.url && segment.url.startsWith('blob:')) {
          URL.revokeObjectURL(segment.url);
        }
      }
    });

    // 🎯 Clean up sentence-by-sentence display
    sentenceTimeouts.forEach(timeout => clearTimeout(timeout));
    setSentenceTimeouts([]);
    setCurrentDisplayText('');
    setCurrentVoiceTag('');
    setCurrentSentenceIndex(0);
    setCurrentSegmentSentences([]);

    // 🎯 Clean up media timeouts
    console.log('🧹 Cleaning up media timeouts on exit:', mediaTimeouts.length);
    mediaTimeouts.forEach(timeoutId => clearTimeout(timeoutId));
    mediaTimeoutsRef.current.forEach(timeoutId => clearTimeout(timeoutId));
    setMediaTimeouts([]);
    mediaTimeoutsRef.current = [];

    // Batch all state updates together
    setIsPlaying(false);
    setIsGeneratingAudio(false);
    setShowFullscreenPlay(false);
    setShowEndHold(false);
    setCurrentlyPlayingStoryCut(null);
    setCurrentAudio(null);
    setActiveAudioSegments([]);
    setCurrentVoiceType(null);
    setCurrentVoiceTransparency(0.2); // Reset to default
    setCurrentMediaColor(null);
    setCurrentZoomScale({ start: 1.0, end: 1.0 }); // Reset to default
    console.log('🎬 Voice type reset on exit');

    // Reset playback flag for next play
    playbackStoppedRef.current = false;
  };

  // Handle play button click - now uses story cuts if available
  // Detect frame type based on image orientation
  const determineFrameType = (imageUrl) => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const aspectRatio = img.naturalWidth / img.naturalHeight;

        if (aspectRatio > 1) {
          // Landscape
          resolve('landscape');
        } else {
          // Portrait
          resolve('portrait');
        }
      };
      img.src = imageUrl;
    });
  };

  const handlePlay = async () => {
    if (isPlaying) {
      // Stop current audio with smooth exit
      handleExitPlay();
      return;
    }

    try {
      setShowFullscreenPlay(true);
      setIsGeneratingAudio(true); // Show loading state

      console.log('🎬 Visual effects will be driven by audio segments');

      // Check if we have story cuts available
      if (storyCuts && storyCuts.length > 0) {
        // Prioritize "The One" primary story cut, fallback to most recent
        let selectedStoryCut;
        if (primaryStoryCut) {
          selectedStoryCut = primaryStoryCut;
          console.log('🎬 Playing "The One" primary story cut:', selectedStoryCut.title, '(' + selectedStoryCut.style + ')');
        } else {
          selectedStoryCut = storyCuts[0]; // They're ordered by created_at DESC
          console.log('🎬 Playing most recent story cut:', selectedStoryCut.title, '(' + selectedStoryCut.style + ')');
        }

        setCurrentlyPlayingStoryCut(selectedStoryCut);



        console.log('📖 Story cut script:', selectedStoryCut.full_script);

        // Check if we have recorded audio URLs in the story cut
        const recordedAudio = selectedStoryCut.metadata?.recordedAudio || {};
        console.log('🎙️ Recorded audio available:', Object.keys(recordedAudio));

        // Always use multi-voice playback system (recorded audio is optional)
        console.log('🎵 Using multi-voice playback system');
        console.log('🎙️ Available recorded audio:', recordedAudio);
        console.log('🔍 Story cut voice IDs:', {
          ember: selectedStoryCut.ember_voice_id,
          narrator: selectedStoryCut.narrator_voice_id,
          ember_name: selectedStoryCut.ember_voice_name,
          narrator_name: selectedStoryCut.narrator_voice_name
        });

        // Parse the script into segments
        const segments = parseScriptSegments(selectedStoryCut.full_script);

        if (segments.length > 0) {
          // Use multi-voice playback system (works with or without recorded audio)
          await playMultiVoiceAudio(segments, selectedStoryCut, recordedAudio, {
            setIsGeneratingAudio,
            setIsPlaying,
            handleExitPlay,
            handlePlaybackComplete,
            setActiveAudioSegments,
            playbackStoppedRef,
            setCurrentVoiceType,
            setCurrentVoiceTransparency,
            setCurrentMediaColor,
            setCurrentZoomScale,
            setCurrentMediaImageUrl,
            // 🎯 Add sentence-by-sentence display state setters
            setCurrentDisplayText,
            setCurrentVoiceTag,
            setCurrentSentenceIndex,
            setCurrentSegmentSentences,
            setSentenceTimeouts,
            sentenceTimeouts,
            // 🎯 Add media timeout management
            setMediaTimeouts,
            mediaTimeouts,
            mediaTimeoutsRef
          }, ember);
        } else {
          // Fallback if no segments could be parsed
          console.log('⚠️ No segments could be parsed, falling back to single voice');
          setIsGeneratingAudio(false);
          setIsPlaying(true);

          const content = selectedStoryCut.full_script;
          const voiceId = selectedStoryCut.ember_voice_id;

          const audioBlob = await textToSpeech(content, voiceId);
          const audioUrl = URL.createObjectURL(audioBlob);
          const audio = new Audio(audioUrl);

          setCurrentAudio(audio);

          audio.onended = () => {
            handlePlaybackComplete();
            URL.revokeObjectURL(audioUrl);
          };

          audio.onerror = () => {
            console.error('Audio playback failed');
            handleExitPlay();
            URL.revokeObjectURL(audioUrl);
          };

          await audio.play();
        }

      } else {
        // Fallback to basic wiki content if no story cuts exist
        console.log('📖 No story cuts found, using basic wiki content');
        console.log('💡 Tip: Create a story cut for richer, AI-generated narration!');



        setIsGeneratingAudio(false);
        setIsPlaying(true);

        // Simple fallback content
        const content = "Let's build this story together by pressing Story Cuts on the bottom left.";
        console.log('📖 Content to narrate:', content);

        // Generate speech using ElevenLabs with Ember voice (Lily)
        const audioBlob = await textToSpeech(content, selectedEmberVoice);

        // Create audio URL and play
        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);

        setCurrentAudio(audio);

        // Handle audio end
        audio.onended = () => {
          handlePlaybackComplete();
          URL.revokeObjectURL(audioUrl);

          // Show helpful message about creating story cuts for richer narration
          setTimeout(() => {
            setMessage({
              type: 'info',
              text: 'Want richer narration? Create a Story Cut with AI-generated scripts in different styles!'
            });
            setTimeout(() => setMessage(null), 6000);
          }, 1000);
        };

        // Handle audio error
        audio.onerror = () => {
          console.error('Audio playback failed');
          handleExitPlay();
          URL.revokeObjectURL(audioUrl);
        };

        await audio.play();
      }

    } catch (error) {
      console.error('🔊 Play error:', error);
      setIsPlaying(false);
      setIsGeneratingAudio(false);
      setShowFullscreenPlay(false);
      alert('Failed to generate audio. Please check your ElevenLabs API key configuration.');
    }
  };

  const handleTitleDelete = async () => {
    try {
      await updateEmberTitle(ember.id, '', user.id);
      // Refetch complete ember data to preserve owner information
      await fetchEmber();
      setMessage({ type: 'success', text: 'Title deleted successfully!' });
    } catch (error) {
      console.error('Failed to delete title', error);
      setMessage({ type: 'error', text: 'Failed to delete title.' });
    } finally {
      setTimeout(() => setMessage(null), 3000);
    }
  };

  // Check if current user is the owner of this ember
  const isOwner = user && ember?.user_id === user.id;

  // Check if user can edit (owner or contributor)
  const canEdit = isOwner || userPermission === 'edit' || userPermission === 'contributor';

  // Helper function to get story progress info
  const getStoryProgress = () => {
    const current = storyMessages.length;
    const required = 6;
    const isComplete = current >= required;
    return { current, required, isComplete };
  };

  // Helper function to determine section completion status
  const getSectionStatus = (sectionType) => {
    switch (sectionType) {
      case 'title':
        return ember?.title && ember.title.trim() !== '' && ember.title !== 'Untitled Ember';
      case 'contributors':
        return sharedUsers.length > 0;
      case 'location':
        return !!(ember?.latitude && ember?.longitude) || !!ember?.manual_location;
      case 'time-date':
        return !!ember?.ember_timestamp || !!ember?.manual_datetime;
      case 'analysis':
        return !!ember?.image_analysis_completed;
      case 'people':
        return taggedPeopleCount > 0;
      case 'story':
        return storyMessages.length >= 6;
      case 'supporting-media':
        return supportingMedia.length > 0;
      case 'media-management':
        return true; // Always available - represents having media names set up
      default:
        return false;
    }
  };

  // Calculate wiki progress (8 sections total)
  const calculateWikiProgress = (ember, sharedUsers = []) => {
    const sections = [
      'title',
      'location',
      'time-date',
      'story',
      'people',
      'contributors',
      'supporting-media',
      'analysis'
    ];

    const completedSections = sections.filter(section => getSectionStatus(section));
    return {
      completed: completedSections.length,
      total: sections.length,
      percentage: Math.round((completedSections.length / sections.length) * 100)
    };
  };

  const wikiProgress = calculateWikiProgress(ember, sharedUsers);

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-lg text-gray-500">Loading ember...</div>
      </div>
    );
  }

  if (error || !ember) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Ember Not Found</h1>
          <p className="text-gray-600">This ember doesn't exist or may have been deleted.</p>
        </div>
      </div>
    );
  }

  // Define all cards (keep full definitions for potential future use)
  const allCardsDefinitions = [
    {
      id: 'photo',
      title: 'Photo',
      content: (
        <div className="h-full flex flex-col bg-gray-100 md:rounded-xl overflow-hidden">
          {/* Photo area (with toggle, blurred bg, main image, icon bar) */}
          <div className="relative w-screen left-1/2 right-1/2 -translate-x-1/2 flex-shrink-0 h-[65vh] md:w-full md:left-0 md:right-0 md:translate-x-0 md:h-auto overflow-hidden">
            {/* Top right vertical capsule: Owner Avatar and Invited Users */}
            <div className="absolute top-4 right-4 z-30 flex flex-col items-center gap-2 bg-white/50 backdrop-blur-sm px-2 py-3 rounded-full shadow-lg">
              {/* Home Icon - clickable to go to My Embers */}
              <button
                className="rounded-full p-1 hover:bg-white/70 transition-colors"
                onClick={() => navigate('/embers')}
                aria-label="Go to My Embers"
                type="button"
              >
                <House size={24} className="text-gray-700" />
              </button>

              {/* Horizontal divider below home icon */}
              <div className="h-px w-6 bg-gray-300 my-1"></div>

              {/* Ember Wiki button - Only show for ember owner */}
              {isOwner && (
                <button
                  className="rounded-full p-1 hover:bg-white/70 transition-colors"
                  onClick={() => setShowEmberWiki(true)}
                  aria-label="Ember Wiki"
                  type="button"
                >
                  <Info size={24} className="text-gray-700" />
                </button>
              )}

              {/* Story Cuts button - Show for all users */}
              <button
                className="rounded-full p-1 hover:bg-white/70 transition-colors relative"
                onClick={() => setShowEmberStoryCuts(true)}
                aria-label="Story Cuts"
                type="button"
              >
                <FilmSlate size={24} className="text-gray-700" />
                {/* Indicator dot when story cuts exist */}
                {storyCuts.length > 0 && (
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full shadow-sm"></div>
                )}
              </button>

              {/* Share button - View-only sharing for everyone */}
              {(!ember?.is_public || user) && (
                <button
                  className="rounded-full p-1 hover:bg-white/70 transition-colors"
                  onClick={() => setShowEmberSharing(true)}
                  aria-label="Share ember (view-only)"
                  type="button"
                >
                  <ShareNetwork size={24} className="text-gray-700" />
                </button>
              )}
            </div>
            {/* Blurred background with fade */}
            <img
              src={ember.image_url}
              alt="Ember blurred background"
              className={`absolute inset-0 w-full h-full object-cover blur-lg scale-110 brightness-75 transition-opacity duration-300 ${showFullImage ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
              aria-hidden="true"
              style={{ zIndex: 1 }}
              onError={(e) => {
                console.error('Background image failed to load:', ember.image_url);
                e.target.style.display = 'none';
              }}
            />
            {/* Main image with object-fit transition */}
            <img
              src={ember.image_url}
              alt="Ember"
              className={`relative w-full h-full z-10 transition-all duration-300 ${showFullImage ? 'object-contain' : 'object-cover'}`}
              onError={(e) => {
                console.error('Image failed to load:', ember.image_url);
                // Create a simple colored rectangle as fallback
                e.target.style.backgroundColor = '#f3f4f6';
                e.target.style.display = 'flex';
                e.target.style.alignItems = 'center';
                e.target.style.justifyContent = 'center';
                e.target.alt = 'Image unavailable';
                e.target.src = 'data:image/svg+xml;base64,' + btoa(`
                  <svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200">
                    <rect width="200" height="200" fill="#f3f4f6"/>
                    <text x="100" y="100" text-anchor="middle" dy="0.3em" font-family="Arial, sans-serif" font-size="14" fill="#6b7280">
                      Image unavailable
                    </text>
                  </svg>
                `);
              }}
            />
            {/* Title Overlay */}
            <div className="absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black/60 to-transparent pointer-events-none z-20">
              <div className="container mx-auto max-w-4xl">
                <h1 className="text-white text-2xl font-bold truncate drop-shadow-md text-left pl-2">
                  {ember.title || 'Untitled Ember'}
                </h1>
              </div>
            </div>

            {/* Bottom right capsule: Action icons above horizontal divider above feature icons */}
            <div className="absolute right-4 bottom-4 z-20">
              <div className="flex flex-col items-center gap-2 bg-white/50 backdrop-blur-sm px-2 py-3 rounded-full shadow-lg">
                {/* Action Icons */}
                <button
                  className="rounded-full p-1 hover:bg-white/50 transition-colors"
                  onClick={() => setShowFullImage((prev) => !prev)}
                  aria-label={showFullImage ? 'Show cropped view' : 'Show full image with blur'}
                  type="button"
                >
                  <CornersOut size={24} className="text-gray-700" />
                </button>

                {/* Owner Avatar - Always at the top of the stack */}
                {ember?.owner && (
                  <div
                    className="p-1 hover:bg-white/70 rounded-full transition-colors"
                    style={{
                      marginTop: '0px',
                      zIndex: 35 // Highest z-index to appear on top
                    }}
                    title={`${ember.owner.first_name || ''} ${ember.owner.last_name || ''}`.trim() || 'Owner'}
                  >
                    <Avatar className="h-6 w-6 ring-2 ring-amber-400">
                      <AvatarImage
                        src={ember.owner.avatar_url}
                        alt={`${ember.owner.first_name || ''} ${ember.owner.last_name || ''}`.trim() || 'Owner'}
                      />
                      <AvatarFallback className="text-xs bg-amber-100 text-amber-700">
                        {ember.owner.first_name?.[0] || ember.owner.last_name?.[0] || 'O'}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                )}

                {/* Invited Users Avatars - Stacked with 16px overlap */}
                {sharedUsers.map((sharedUser, index) => (
                  <div
                    key={sharedUser.id || index}
                    className="p-1 hover:bg-white/70 rounded-full transition-colors"
                    style={{
                      marginTop: ember?.owner ? '-24px' : (index === 0 ? '-8px' : '-24px'),
                      zIndex: ember?.owner ? (34 - index) : (30 - index) // Adjust z-index if owner is present
                    }}
                    title={`${sharedUser.first_name || ''} ${sharedUser.last_name || ''}`.trim() || sharedUser.email}
                  >
                    <Avatar className="h-6 w-6 ring-1 ring-white">
                      <AvatarImage
                        src={sharedUser.avatar_url}
                        alt={`${sharedUser.first_name || ''} ${sharedUser.last_name || ''}`.trim() || sharedUser.email}
                      />
                      <AvatarFallback className="text-xs bg-gray-200 text-gray-700">
                        {sharedUser.first_name?.[0] || sharedUser.last_name?.[0] || sharedUser.email?.[0]?.toUpperCase() || '?'}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                ))}

                {/* Horizontal divider */}
                <div className="h-px w-6 bg-gray-300 my-1"></div>

                {/* Feature Icons */}
                <button
                  className="p-1 hover:bg-white/50 rounded-full transition-colors"
                  onClick={handlePlay}
                  aria-label={isGeneratingAudio ? "Preparing Story..." : (isPlaying ? "Stop playing" : "Play ember story")}
                  type="button"
                  disabled={isGeneratingAudio}
                >
                  {isGeneratingAudio ? (
                    <div className="w-6 h-6 flex items-center justify-center">
                      <div className="w-4 h-4 border-2 border-gray-700 border-t-transparent rounded-full animate-spin" />
                    </div>
                  ) : (
                    <PlayCircle size={24} className={`text-gray-700 ${isPlaying ? 'text-blue-600' : ''}`} />
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Wiki Progress Bar - Full Width Capsule */}
          <div className="w-full px-4 pt-3 pb-1.5 md:px-6">
            <div className="w-full bg-gray-200 rounded-full h-4">
              <div
                className="bg-blue-500 h-4 rounded-full transition-all duration-300 ease-out"
                style={{ width: `${wikiProgress.percentage}%` }}
              />
            </div>
          </div>

          {/* Progress Message */}
          <div className="w-full px-4 pt-2 pb-2 md:px-6">
            <p className="text-lg font-bold text-gray-800 text-center">
              {wikiProgress.percentage === 100
                ? `Congrats ${userProfile?.first_name || 'User'}! We did it! Now let's try Story Cuts!`
                : `${userProfile?.first_name || 'User'}, we have to complete all these cards...`
              }
            </p>
          </div>

          {/* Content area - Card Carousel */}
          <div className="flex-1 flex flex-col justify-start pb-1 md:pb-8">
            <Carousel
              className="w-full"
              opts={{
                align: "center",
                loop: false,
                skipSnaps: false,
                dragFree: true
              }}
            >
              <CarouselContent className="pl-4 md:pl-6 -ml-2 md:-ml-4">
                {/* Story Cuts Square Card - New 1:1 Aspect Ratio Style */}
                <CarouselItem className="pl-2 md:pl-4 basis-auto flex-shrink-0">
                  <Card
                    className="w-32 h-32 bg-blue-600 border-blue-700 cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => setShowStoryCutCreator(true)}
                  >
                    <CardContent className="p-2 h-full flex flex-col justify-center items-center">
                      <div className="flex justify-center items-center mb-1">
                        <FilmSlate size={18} className="text-white" />
                      </div>
                      <h4 className="text-sm font-medium text-white text-center leading-tight">
                        Story Cuts
                      </h4>
                      <p className="text-xs text-blue-100 text-center leading-tight mt-0.5">
                        Creator
                      </p>
                    </CardContent>
                  </Card>
                </CarouselItem>

                {(() => {
                  // Define all carousel cards with their configuration
                  const carouselCards = [
                    {
                      id: 'title',
                      sectionType: 'title',
                      icon: PenNib,
                      title: () => 'Title',
                      description: (isComplete) => (!isComplete ? 'pick the perfect title' : ember.title),
                      onClick: () => () => setShowNamesModal(true)
                    },
                    {
                      id: 'location',
                      sectionType: 'location',
                      icon: MapPin,
                      title: () => 'Location',
                      description: (isComplete) => {
                        if (isAutoLocationProcessing) {
                          return 'Processing location...';
                        }
                        if (isComplete) {
                          const formattedLocation = formatDisplayLocation(ember);
                          return formattedLocation || 'Location information available';
                        }
                        return 'Where this moment happened';
                      },
                      onClick: () => () => setShowLocationModal(true)
                    },
                    {
                      id: 'time-date',
                      sectionType: 'time-date',
                      icon: Clock,
                      title: () => 'Time & Date',
                      description: (isComplete) => {
                        if (isExifProcessing) {
                          return 'Processing image data...';
                        }
                        if (isComplete) {
                          const dateToShow = ember?.ember_timestamp || ember?.manual_datetime;
                          const formattedDate = formatDisplayDate(dateToShow);
                          return formattedDate || 'Date information available';
                        }
                        return 'When this moment occurred';
                      },
                      onClick: () => () => setShowTimeDateModal(true)
                    },
                    {
                      id: 'story',
                      sectionType: 'story',
                      icon: BookOpen,
                      title: () => 'Story Circle',
                      description: (isComplete) => {
                        if (isComplete) {
                          return `${storyMessages.length} comments from ${storyContributorCount} contributor${storyContributorCount !== 1 ? 's' : ''}`;
                        }
                        return 'The narrative behind this ember';
                      },
                      onClick: () => () => setShowStoryModal(true)
                    },
                    {
                      id: 'people',
                      sectionType: 'people',
                      icon: UsersThree,
                      title: () => 'Tagged People',
                      description: (isComplete) => (!isComplete ? 'Identify and tag people in this image' : `${taggedPeopleCount} ${taggedPeopleCount !== 1 ? 'people' : 'person'} tagged`),
                      onClick: () => () => setShowTaggedPeopleModal(true)
                    },
                    {
                      id: 'supporting-media',
                      sectionType: 'supporting-media',
                      icon: ImageSquare,
                      title: () => 'Supporting Media',
                      description: (isComplete) => {
                        if (isComplete) {
                          return `${supportingMedia.length} media file${supportingMedia.length !== 1 ? 's' : ''} added`;
                        }
                        return 'Additional photos and videos';
                      },
                      onClick: () => () => setShowSupportingMediaModal(true)
                    },
                    {
                      id: 'analysis',
                      sectionType: 'analysis',
                      icon: Sparkles,
                      title: () => 'Image Analysis',
                      description: (isComplete) => {
                        if (isAutoAnalyzing) {
                          return 'Auto-analyzing image...';
                        }
                        if (isComplete && imageAnalysisData?.tokens_used) {
                          return `${imageAnalysisData.tokens_used} tokens used to complete`;
                        }
                        return 'Deep analysis of this image';
                      },
                      onClick: () => () => setShowImageAnalysisModal(true)
                    },
                    {
                      id: 'contributors',
                      sectionType: 'contributors',
                      icon: UserCirclePlus,
                      title: () => 'Contributors',
                      description: (isComplete) => (!isComplete ? 'Invite people to edit and contribute' : `${sharedUsers.length} contributor${sharedUsers.length !== 1 ? 's' : ''} invited`),
                      onClick: () => () => setShowInviteModal(true)
                    }
                  ];

                  // Sort cards: Story Circle always first, then Not Done, then Done
                  const sortedCards = carouselCards.sort((a, b) => {
                    // Story Circle always comes first
                    if (a.sectionType === 'story') return -1;
                    if (b.sectionType === 'story') return 1;

                    const aComplete = getSectionStatus(a.sectionType);
                    const bComplete = getSectionStatus(b.sectionType);

                    // If completion status is the same, maintain original order
                    if (aComplete === bComplete) return 0;

                    // Not Done (false) comes first, Done (true) comes last
                    return aComplete - bComplete;
                  });

                  return sortedCards.map((card) => {
                    const isComplete = getSectionStatus(card.sectionType);
                    const IconComponent = card.icon;

                    // Special handling for story card to show progress
                    let statusText = isComplete ? 'Done' : 'Not Done';
                    if (card.sectionType === 'story' && !isComplete) {
                      const storyProgress = getStoryProgress();
                      statusText = `${storyProgress.current} of ${storyProgress.required}`;
                    }

                    return (
                      <CarouselItem key={card.id} className="pl-2 md:pl-4 basis-3/5 md:basis-1/3 lg:basis-2/5">
                        <Card
                          className="h-32 bg-white border-gray-200 cursor-pointer hover:shadow-md transition-all duration-200"
                          onClick={card.onClick()}
                        >
                          <CardContent className="px-4 pt-1 pb-2 h-full flex flex-col justify-between">
                            <div>
                              {/* Header with icon and status badge */}
                              <div className="flex justify-center items-center relative mb-2">
                                <IconComponent size={22} className="text-blue-600" />
                                <div className={`absolute right-0 px-2 py-1 text-xs rounded-full font-medium ${isComplete
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-gray-100 text-gray-600'
                                  }`}>
                                  {statusText}
                                </div>
                              </div>

                              {/* Wiki Title */}
                              <h3 className="font-semibold text-gray-900 text-center mb-1">
                                {card.title(isComplete)}
                              </h3>

                              {/* Dynamic Content */}
                              <p className="text-sm text-gray-600 text-center">
                                {card.description(isComplete)}
                              </p>
                            </div>
                          </CardContent>
                        </Card>
                      </CarouselItem>
                    );
                  });
                })()}
              </CarouselContent>
            </Carousel>
          </div>
        </div>
      )
    },
    {
      id: 'story-circle',
      title: 'Story Circle',
      content: (
        <div className="h-full w-full bg-white rounded-xl">
          <Card className="h-full">
            <CardContent className="p-6">
              {/* Header */}
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-gray-900 text-left">Story Circle</h2>
                  <p className="text-sm text-gray-600 mt-1">
                    Discuss and explore the story behind this ember
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )
    },
    {
      id: 'wiki',
      title: 'Ember Wiki',
      content: (
        <div className="h-full w-full bg-white rounded-xl">
          <Card className="h-full">
            <CardContent className="p-6 space-y-6">
              {/* Header */}
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-gray-900 text-left">Ember Wiki</h2>
                  <p className="text-sm text-gray-600 mt-1">
                    Knowledge and information about this ember
                  </p>
                </div>
              </div>

              {/* Content Sections */}
              <div className="space-y-4 text-left">
                {/* Basic Info Section */}
                <div className="space-y-3">
                  <h3 className="font-medium text-gray-900 text-left">Basic Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-4 text-sm">
                    <div className="space-y-2 text-left">
                      <span className="text-gray-500 font-medium">Title</span>
                      {isEditingTitle ? (
                        <div className="flex items-center gap-2">
                          <Input
                            type="text"
                            value={newTitle}
                            onChange={(e) => setNewTitle(e.target.value)}
                            maxLength="30"
                            className="h-10"
                          />
                          <Button size="lg" variant="blue" onClick={handleTitleSave}>Save</Button>
                          <Button size="sm" variant="outline" onClick={handleTitleCancel}>Cancel</Button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className="text-gray-900">{ember.title || 'N/A'}</span>
                          {canEdit && (
                            <button onClick={handleTitleEdit} className="text-gray-400 hover:text-blue-600">
                              <PencilSimple size={16} />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="space-y-2 text-left">
                      <span className="text-gray-500 font-medium">Owner</span>
                      <span className="block text-gray-900">Coming soon...</span>
                    </div>
                  </div>
                </div>

                {/* Location Section */}
                <div className="space-y-3">
                  <h3 className="font-medium text-gray-900 text-left">Location</h3>
                  <div className="text-sm text-gray-600 text-left">
                    Geolocation data will appear here...
                  </div>
                </div>



                {/* Tagged People Section */}
                <div className="space-y-3">
                  <h3 className="font-medium text-gray-900 text-left">Tagged People</h3>
                  <div className="space-y-3">
                    {taggedPeopleData.length > 0 ? (
                      taggedPeopleData.map((person, index) => (
                        <div key={person.id || index} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50">
                          <div className="flex-shrink-0">
                            <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                              <Users className="h-5 w-5 text-blue-600" />
                            </div>
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-gray-900">
                                {person.person_name}
                              </span>
                              {person.contributor_info && (
                                <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full">
                                  Contributor
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-gray-600">
                              {person.contributor_info
                                ? `Tagged and connected to contributor ${person.contributor_email}`
                                : 'Tagged person identified in this image'}
                            </p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-sm text-gray-500 text-left p-3 rounded-xl bg-gray-50">
                        No people have been tagged in this image yet. Use the "Tagged People" feature to identify faces.
                      </div>
                    )}
                  </div>
                </div>

                {/* Contributors Section */}
                <div className="space-y-3">
                  <h3 className="font-medium text-gray-900 text-left">Contributors</h3>
                  <div className="space-y-3">
                    {/* Owner */}
                    {ember?.owner && (
                      <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50">
                        <Avatar className="h-10 w-10">
                          <AvatarImage
                            src={ember.owner.avatar_url}
                            alt={`${ember.owner.first_name || ''} ${ember.owner.last_name || ''}`.trim() || 'Owner'}
                          />
                          <AvatarFallback className="text-sm bg-gray-200 text-gray-700">
                            {ember.owner.first_name?.[0] || ember.owner.last_name?.[0] || '?'}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-gray-900">
                              {`${ember.owner.first_name || ''} ${ember.owner.last_name || ''}`.trim() || 'Owner'}
                            </span>
                            <span className="px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded-full">Owner</span>
                          </div>
                          <p className="text-sm text-gray-600">Created this ember</p>
                        </div>
                      </div>
                    )}

                    {/* Invited Contributors */}
                    {sharedUsers.length > 0 ? (
                      sharedUsers.map((contributor, index) => (
                        <div key={contributor.id || index} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50">
                          <Avatar className="h-10 w-10">
                            <AvatarImage
                              src={contributor.avatar_url}
                              alt={`${contributor.first_name || ''} ${contributor.last_name || ''}`.trim() || contributor.email}
                            />
                            <AvatarFallback className="text-sm bg-gray-200 text-gray-700">
                              {contributor.first_name?.[0] || contributor.last_name?.[0] || contributor.email?.[0]?.toUpperCase() || '?'}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-gray-900">
                                {`${contributor.first_name || ''} ${contributor.last_name || ''}`.trim() || contributor.email}
                              </span>
                              <span className={`px-2 py-1 text-xs rounded-full ${contributor.permission_level === 'contributor'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-gray-100 text-gray-800'
                                }`}>
                                {contributor.permission_level === 'contributor' ? 'Contributor' : 'Viewer'}
                              </span>
                            </div>
                            <p className="text-sm text-gray-600">
                              {contributor.permission_level === 'contributor'
                                ? 'Can edit and contribute to this ember'
                                : 'Can view this ember'}
                            </p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-sm text-gray-500 text-left p-3 rounded-xl bg-gray-50">
                        No other contributors have been invited to this ember yet.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )
    },
    {
      id: 'features',
      title: 'Features',
      content: (
        <div className="h-full w-full bg-white rounded-xl">
          <FeaturesCard ember={ember} />
        </div>
      )
    }
  ];



  return (
    <div className="md:min-h-screen bg-white">
      {/* Mobile Layout */}
      <div className="md:hidden -m-[0.67rem] -mt-[0.67rem] h-screen overflow-hidden">
        <Card className="py-0 w-full h-full bg-gray-100 rounded-none">
          <CardContent className="p-0 h-full">
            {allCardsDefinitions[0].content}
          </CardContent>
        </Card>
      </div>

      {/* Desktop Layout */}
      <div className="hidden md:block">
        <div className="container mx-auto px-1.5 py-8">
          <div className="max-w-4xl mx-auto">
            <div className="rounded-xl bg-white shadow-sm">
              <Card className="py-0 w-full bg-gray-100">
                <CardContent className="p-0 h-full">
                  {allCardsDefinitions[0].content}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>

      {/* Share Slide Out */}
      {ember && (
        <>
          {/* Overlay */}
          {showEmberSharing && (
            <div
              className="fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity"
              onClick={() => setShowEmberSharing(false)}
            />
          )}

          {/* Side Panel */}
          <div className={cn(
            "fixed top-0 right-0 h-full w-[calc(100%-2rem)] max-w-2xl bg-white shadow-xl z-50 transform transition-transform duration-300 ease-in-out",
            showEmberSharing ? "translate-x-0" : "translate-x-full"
          )}>
            <div className="p-6 border-b">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShareNetwork size={24} className="text-blue-600" />
                  <h2 className="text-xl font-bold text-gray-900">Share Ember</h2>
                </div>
                <button
                  onClick={() => setShowEmberSharing(false)}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <span className="sr-only">Close</span>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              <ShareSlideOutContent ember={ember} />
            </div>
          </div>
        </>
      )}

      {/* Invite Contributors Modal */}
      {ember && (
        <InviteModal
          ember={ember}
          isOpen={showInviteModal}
          onClose={() => setShowInviteModal(false)}
          onUpdate={handleEmberUpdate}
        />
      )}

      {/* Ember Names Modal */}
      {ember && (
        <EmberNamesModal
          ember={ember}
          isOpen={showNamesModal}
          onClose={() => setShowNamesModal(false)}
          onEmberUpdate={handleEmberUpdate}
        />
      )}

      {/* Story Modal */}
      {ember && (
        <StoryModal
          ember={ember}
          isOpen={showStoryModal}
          onClose={() => setShowStoryModal(false)}
          question="Tell us about this moment. What was happening when this photo was taken?"
          onSubmit={async (submissionData) => {
            console.log('Story submission:', submissionData);
            // TODO: Handle story submission (save to database, process audio, etc.)
          }}
          onRefresh={handleStoryUpdate}
          isRefreshing={isRefreshing}
        />
      )}

      {/* Ember Wiki Panel */}
      {ember && (
        <EmberWikiPanel
          ember={ember}
          isOpen={showEmberWiki}
          onClose={() => setShowEmberWiki(false)}
          isEditingTitle={isEditingTitle}
          setIsEditingTitle={setIsEditingTitle}
          newTitle={newTitle}
          setNewTitle={setNewTitle}
          handleTitleSave={handleTitleSave}
          handleTitleCancel={handleTitleCancel}
          handleTitleEdit={handleTitleEdit}
          handleTitleDelete={handleTitleDelete}
          message={message}
          onRefresh={fetchEmber}
          onOpenSupportingMedia={() => setShowSupportingMediaModal(true)}
        />
      )}

      {/* Location Modal */}
      {ember && (
        <LocationModal
          ember={ember}
          isOpen={showLocationModal}
          onClose={() => setShowLocationModal(false)}
          isMobile={isMobile}
          onRefresh={fetchEmber}
        />
      )}

      {/* Time & Date Modal */}
      {ember && (
        <TimeDateModal
          ember={ember}
          isOpen={showTimeDateModal}
          onClose={() => setShowTimeDateModal(false)}
          isMobile={isMobile}
          onRefresh={fetchEmber}
        />
      )}

      {/* Image Analysis Modal */}
      {ember && (
        <ImageAnalysisModal
          ember={ember}
          isOpen={showImageAnalysisModal}
          onClose={() => setShowImageAnalysisModal(false)}
          onRefresh={handleImageAnalysisUpdate}
        />
      )}

      {/* Tagged People Modal */}
      {ember && (
        <TaggedPeopleModal
          ember={ember}
          isOpen={showTaggedPeopleModal}
          onClose={() => setShowTaggedPeopleModal(false)}
          onUpdate={handleTaggedPeopleUpdate}
        />
      )}

      {/* Supporting Media Modal */}
      {ember && (
        <SupportingMediaModal
          ember={ember}
          isOpen={showSupportingMediaModal}
          onClose={() => setShowSupportingMediaModal(false)}
          onUpdate={handleSupportingMediaUpdate}
        />
      )}



      {/* Story Cuts Panel */}
      {ember && (
        <>
          {/* Overlay */}
          {showEmberStoryCuts && (
            <div
              className="fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity"
              onClick={() => setShowEmberStoryCuts(false)}
            />
          )}

          {/* Side Panel */}
          <div className={cn(
            "fixed top-0 right-0 h-full w-[calc(100%-2rem)] max-w-2xl bg-white shadow-xl z-50 transform transition-transform duration-300 ease-in-out",
            showEmberStoryCuts ? "translate-x-0" : "translate-x-full"
          )}>
            <div className="p-6 border-b">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FilmSlate size={24} className="text-blue-600" />
                  <h2 className="text-xl font-bold text-gray-900">Story Cuts</h2>
                </div>
                <button
                  onClick={() => setShowEmberStoryCuts(false)}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <span className="sr-only">Close</span>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {/* Loading State */}
              {storyCutsLoading && (
                <div className="flex items-center justify-center py-8">
                  <div className="text-gray-500">Loading story cuts...</div>
                </div>
              )}

              {/* Real Story Cuts */}
              {!storyCutsLoading && storyCuts.map((cut) => {
                const isPrimary = primaryStoryCut?.id === cut.id;
                return (
                  <div
                    key={cut.id}
                    className="bg-gray-50 rounded-xl p-4 hover:bg-gray-100 transition-colors border border-gray-200 relative group"
                  >
                    {/* Primary Badge - Matches media section "Cover" badge style */}
                    {isPrimary && (
                      <div className="absolute top-2 left-2 bg-blue-600 text-white px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 z-10">
                        <Star size={12} weight="fill" />
                        The One
                      </div>
                    )}



                    {/* Clickable content area */}
                    <div
                      className="cursor-pointer"
                      onClick={() => {
                        setSelectedStoryCut(cut);
                        setShowStoryCutDetail(true);
                      }}
                    >
                      <div className="flex gap-4">
                        {/* Thumbnail - Using ember image for now */}
                        <div className="flex-shrink-0">
                          <img
                            src={ember.image_url}
                            alt={cut.title}
                            className="w-24 h-24 rounded-lg object-cover"
                          />
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0" style={{ textAlign: 'left' }}>
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0 text-left" style={{ textAlign: 'left' }}>
                              <h3 className="font-medium text-gray-900 truncate text-left" style={{ textAlign: 'left' }}>{cut.title}</h3>
                              {cut.story_focus && (
                                <p className="text-sm text-gray-600 mt-1 line-clamp-2 text-left" style={{ textAlign: 'left' }}>
                                  {cut.story_focus}
                                </p>
                              )}
                            </div>
                          </div>

                          {/* Metadata */}
                          <div className="mt-3 text-xs text-gray-500" style={{ textAlign: 'left' }}>
                            <div className="flex items-center gap-1 mb-1">
                              <Avatar className="h-3 w-3">
                                <AvatarImage src={cut.creator?.avatar_url} alt={`${cut.creator?.first_name || ''} ${cut.creator?.last_name || ''}`.trim()} />
                                <AvatarFallback className="bg-blue-100 text-blue-800 text-xs">
                                  {cut.creator?.first_name?.[0] || cut.creator?.last_name?.[0] || 'U'}
                                </AvatarFallback>
                              </Avatar>
                              {`${cut.creator?.first_name || ''} ${cut.creator?.last_name || ''}`.trim() || 'Unknown Creator'}
                            </div>
                            <div className="flex items-center gap-4">
                              <span className="flex items-center gap-1">
                                <Clock size={12} />
                                {formatDuration(cut.duration)}
                              </span>
                              <span>{formatRelativeTime(cut.created_at)}</span>
                            </div>
                          </div>

                          {/* Style Badge with Actions */}
                          <div className="mt-2 text-left flex items-center justify-between" style={{ textAlign: 'left' }}>
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              {getStyleDisplayName(cut.style, availableStoryStyles)}
                            </span>

                            {/* Action buttons */}
                            <div className="flex items-center gap-1">
                              {/* Make Primary Button - Only show for owner and non-primary cuts */}
                              {!isPrimary && userPermission === 'owner' && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleSetPrimary(cut.id);
                                  }}
                                  className="p-1 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-full transition-colors duration-200"
                                  title="Make This The One"
                                >
                                  <Star size={12} weight="fill" />
                                </button>
                              )}

                              {/* Delete Button - Only show for creators */}
                              {canDeleteStoryCut(cut) && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setStoryCutToDelete(cut);
                                    setShowDeleteConfirm(true);
                                  }}
                                  className="p-1 bg-red-100 hover:bg-red-200 text-red-600 rounded-full transition-colors duration-200"
                                  title="Delete story cut"
                                >
                                  <Trash size={12} />
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Empty State - Show when no cuts exist */}
              {!storyCutsLoading && storyCuts.length === 0 && (
                <div className="flex flex-col items-center justify-center py-12">
                  <FilmSlate size={48} className="text-gray-300 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2 text-center">No Story Cuts Yet</h3>
                  <p className="text-gray-600 mb-4 text-center">Story cuts will appear here when created</p>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Story Cut Creator - Responsive Modal/Drawer */}
      {ember && (
        <>
          {isMobile ? (
            <Drawer open={showStoryCutCreator} onOpenChange={setShowStoryCutCreator}>
              <DrawerContent className="bg-white focus:outline-none">
                <DrawerHeader className="bg-white">
                  <DrawerTitle className="flex items-center gap-2 text-xl font-bold text-gray-900">
                    <FilmSlate size={20} className="text-blue-600" />
                    Story Cuts Creator
                  </DrawerTitle>
                  <DrawerDescription className="text-left text-gray-600">
                    Compose your own version of this ember
                  </DrawerDescription>
                </DrawerHeader>
                <div className="px-4 pb-4 bg-white max-h-[70vh] overflow-y-auto">
                  <StoryModalContent
                    userProfile={userProfile}
                    storyTitle={storyTitle}
                    setStoryTitle={setStoryTitle}
                    emberLength={emberLength}
                    setEmberLength={setEmberLength}
                    ember={ember}
                    sharedUsers={sharedUsers}
                    selectedVoices={selectedVoices}
                    toggleVoiceSelection={toggleVoiceSelection}
                    selectedStoryStyle={selectedStoryStyle}
                    setSelectedStoryStyle={setSelectedStoryStyle}
                    stylesLoading={stylesLoading}
                    availableStoryStyles={availableStoryStyles}
                    storyFocus={storyFocus}
                    setStoryFocus={setStoryFocus}
                    selectedEmberVoice={selectedEmberVoice}
                    setSelectedEmberVoice={setSelectedEmberVoice}
                    selectedNarratorVoice={selectedNarratorVoice}
                    setSelectedNarratorVoice={setSelectedNarratorVoice}
                    voicesLoading={voicesLoading}
                    availableVoices={availableVoices}
                    handleGenerateStoryCut={handleGenerateStoryCut}
                    isGeneratingStoryCut={isGeneratingStoryCut}
                    storyMessages={storyMessages}
                    useEmberVoice={useEmberVoice}
                    toggleEmberVoice={toggleEmberVoice}
                    useNarratorVoice={useNarratorVoice}
                    toggleNarratorVoice={toggleNarratorVoice}
                    availableMediaForStory={availableMediaForStory}
                    selectedMediaForStory={selectedMediaForStory}
                    mediaLoadingForStory={mediaLoadingForStory}
                    toggleMediaSelection={toggleMediaSelection}
                    selectAllMedia={selectAllMedia}
                    clearMediaSelection={clearMediaSelection}
                  />
                </div>
              </DrawerContent>
            </Drawer>
          ) : (
            <Dialog open={showStoryCutCreator} onOpenChange={setShowStoryCutCreator}>
              <DialogContent className="w-[calc(100%-2rem)] max-w-2xl max-h-[90vh] overflow-y-auto bg-white sm:w-full sm:max-w-2xl rounded-2xl focus:outline-none">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2 text-xl font-bold text-gray-900">
                    <FilmSlate size={20} className="text-blue-600" />
                    Story Cuts Creator
                  </DialogTitle>
                  <DialogDescription className="text-gray-600">
                    Compose your own version of this ember
                  </DialogDescription>
                </DialogHeader>
                <StoryModalContent
                  userProfile={userProfile}
                  storyTitle={storyTitle}
                  setStoryTitle={setStoryTitle}
                  emberLength={emberLength}
                  setEmberLength={setEmberLength}
                  ember={ember}
                  sharedUsers={sharedUsers}
                  selectedVoices={selectedVoices}
                  toggleVoiceSelection={toggleVoiceSelection}
                  selectedStoryStyle={selectedStoryStyle}
                  setSelectedStoryStyle={setSelectedStoryStyle}
                  stylesLoading={stylesLoading}
                  availableStoryStyles={availableStoryStyles}
                  storyFocus={storyFocus}
                  setStoryFocus={setStoryFocus}
                  selectedEmberVoice={selectedEmberVoice}
                  setSelectedEmberVoice={setSelectedEmberVoice}
                  selectedNarratorVoice={selectedNarratorVoice}
                  setSelectedNarratorVoice={setSelectedNarratorVoice}
                  voicesLoading={voicesLoading}
                  availableVoices={availableVoices}
                  handleGenerateStoryCut={handleGenerateStoryCut}
                  isGeneratingStoryCut={isGeneratingStoryCut}
                  storyMessages={storyMessages}
                  useEmberVoice={useEmberVoice}
                  toggleEmberVoice={toggleEmberVoice}
                  useNarratorVoice={useNarratorVoice}
                  toggleNarratorVoice={toggleNarratorVoice}
                  availableMediaForStory={availableMediaForStory}
                  selectedMediaForStory={selectedMediaForStory}
                  mediaLoadingForStory={mediaLoadingForStory}
                  toggleMediaSelection={toggleMediaSelection}
                  selectAllMedia={selectAllMedia}
                  clearMediaSelection={clearMediaSelection}
                />
              </DialogContent>
            </Dialog>
          )}
        </>
      )}

      {/* Story Cut Detail Viewer - Responsive Modal/Drawer */}
      {selectedStoryCut && (
        <>
          {isMobile ? (
            <Drawer open={showStoryCutDetail} onOpenChange={setShowStoryCutDetail}>
              <DrawerContent className="bg-white focus:outline-none">
                <DrawerHeader className="bg-white text-left">
                  <DrawerTitle className="flex items-center gap-2 text-xl font-bold text-gray-900 text-left">
                    <FilmSlate size={20} className="text-blue-600" />
                    {selectedStoryCut.title}
                  </DrawerTitle>
                  <DrawerDescription className="text-left text-gray-600">
                    {getStyleDisplayName(selectedStoryCut.style, availableStoryStyles)} • {formatDuration(selectedStoryCut.duration)} • Created by {`${selectedStoryCut.creator?.first_name || ''} ${selectedStoryCut.creator?.last_name || ''}`.trim() || 'Unknown Creator'}
                  </DrawerDescription>
                </DrawerHeader>
                <div className="px-4 pb-4 bg-white max-h-[70vh] overflow-y-auto">
                  <StoryCutDetailContent
                    selectedStoryCut={selectedStoryCut}
                    isEditingScript={isEditingScript}
                    setIsEditingScript={setIsEditingScript}
                    editedScript={editedScript}
                    setEditedScript={setEditedScript}
                    handleSaveScript={handleSaveScript}
                    handleCancelScriptEdit={handleCancelScriptEdit}
                    isSavingScript={isSavingScript}
                    formatDuration={formatDuration}
                    availableStoryStyles={availableStoryStyles}
                    formatRelativeTime={formatRelativeTime}
                    storyMessages={storyMessages}
                    ember={ember}
                    formattedScript={formattedScript}
                  />
                </div>
              </DrawerContent>
            </Drawer>
          ) : (
            <Dialog open={showStoryCutDetail} onOpenChange={setShowStoryCutDetail}>
              <DialogContent className="w-[calc(100%-2rem)] max-w-2xl max-h-[90vh] overflow-y-auto bg-white sm:w-full sm:max-w-2xl rounded-2xl focus:outline-none">
                <DialogHeader className="text-left">
                  <DialogTitle className="flex items-center gap-2 text-xl font-bold text-gray-900 text-left">
                    <FilmSlate size={20} className="text-blue-600" />
                    {selectedStoryCut.title}
                  </DialogTitle>
                  <DialogDescription className="text-left text-gray-600">
                    {getStyleDisplayName(selectedStoryCut.style, availableStoryStyles)} • {formatDuration(selectedStoryCut.duration)} • Created by {`${selectedStoryCut.creator?.first_name || ''} ${selectedStoryCut.creator?.last_name || ''}`.trim() || 'Unknown Creator'}
                  </DialogDescription>
                </DialogHeader>
                <StoryCutDetailContent
                  selectedStoryCut={selectedStoryCut}
                  isEditingScript={isEditingScript}
                  setIsEditingScript={setIsEditingScript}
                  editedScript={editedScript}
                  setEditedScript={setEditedScript}
                  handleSaveScript={handleSaveScript}
                  handleCancelScriptEdit={handleCancelScriptEdit}
                  isSavingScript={isSavingScript}
                  formatDuration={formatDuration}
                  availableStoryStyles={availableStoryStyles}
                  formatRelativeTime={formatRelativeTime}
                  storyMessages={storyMessages}
                  ember={ember}
                  formattedScript={formattedScript}
                />
              </DialogContent>
            </Dialog>
          )}
        </>
      )}

      {/* Fullscreen Play Mode */}
      {showFullscreenPlay && (
        <>
          <div className="fixed inset-0 bg-black z-50">
            {/* Background Image - only show when script contains MEDIA elements */}
            {!isGeneratingAudio && !showEndHold && !currentMediaColor && currentMediaImageUrl && (
              <img
                src={currentMediaImageUrl}
                alt={ember.title || 'Ember'}
                className="absolute inset-0 w-full h-full object-cover"
              />
            )}

            {/* Voice Type Overlay - only show when playing, not in end hold, and no media color effect */}
            {!isGeneratingAudio && !showEndHold && !currentMediaColor && currentVoiceType && (
              <div
                className="absolute inset-0"
                style={{
                  backgroundColor: currentVoiceType === 'ember' ? `rgba(255, 0, 0, ${currentVoiceTransparency})` :
                    currentVoiceType === 'narrator' ? `rgba(0, 0, 255, ${currentVoiceTransparency})` :
                      currentVoiceType === 'contributor' ? `rgba(0, 255, 0, ${currentVoiceTransparency})` :
                        'transparent'
                }}
              />
            )}

            {/* Media Color Screen - solid color background when color effect is active */}
            {!isGeneratingAudio && !showEndHold && currentMediaColor && (
              <div
                className="absolute inset-0"
                style={{
                  backgroundColor: currentMediaColor
                }}
              />
            )}



            {/* Title Overlay - only show when playing, not in end hold, and no media color effect */}
            {!isGeneratingAudio && !showEndHold && !currentMediaColor && (
              <div className="absolute top-0 left-0 right-0 p-4 pointer-events-none z-20">
                <div className="container mx-auto max-w-4xl">
                  <h1 className="text-white text-2xl font-bold truncate text-left pl-2">
                    {ember.title || 'Untitled Ember'}
                  </h1>
                </div>
              </div>
            )}

            {/* 🎯 Synchronized Text Display (Option 1B: Sentence-by-Sentence) */}
            {!isGeneratingAudio && !showEndHold && !currentMediaColor && currentDisplayText && (
              <div className="absolute bottom-20 left-0 right-0 p-4 pointer-events-none z-20">
                <div className="container mx-auto max-w-4xl">
                  <div className="bg-black p-6">
                    {/* Current sentence text */}
                    <p className="text-white text-xl leading-relaxed font-medium">
                      {currentDisplayText}
                    </p>

                    {/* Progress indicator for sentences */}
                    {currentSegmentSentences.length > 1 && (
                      <div className="flex justify-center mt-4">
                        <div className="flex gap-1">
                          {currentSegmentSentences.map((_, index) => (
                            <div
                              key={index}
                              className={`w-2 h-2 rounded-full ${index === currentSentenceIndex ? 'bg-white' : 'bg-white/30'
                                }`}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}



            {/* Bottom right capsule: Play controls and exit - hide during end hold */}
            {!showEndHold && (
              <div className="absolute right-4 bottom-4 z-20">
                <div className="flex flex-col items-center gap-2 bg-white px-2 py-3 rounded-full">

                  {/* Play/Pause Button */}
                  <button
                    onClick={handlePlay}
                    className="rounded-full p-1"
                    aria-label={isGeneratingAudio ? "Preparing Story..." : (isPlaying ? "Pause playing" : "Resume playing")}
                    type="button"
                    disabled={isGeneratingAudio}
                  >
                    {isGeneratingAudio ? (
                      <div className="w-6 h-6 flex items-center justify-center">
                        <div className="w-4 h-4 border-2 border-gray-700 border-t-transparent rounded-full" />
                      </div>
                    ) : isPlaying ? (
                      <div className="w-6 h-6 flex items-center justify-center">
                        <div className="w-1.5 h-4 bg-gray-700 mx-0.5 rounded-sm"></div>
                        <div className="w-1.5 h-4 bg-gray-700 mx-0.5 rounded-sm"></div>
                      </div>
                    ) : (
                      <PlayCircle size={24} className="text-gray-700" />
                    )}
                  </button>

                  {/* Horizontal divider */}
                  <div className="h-px w-6 bg-gray-300 my-1"></div>

                  {/* Close button */}
                  <button
                    onClick={handleExitPlay}
                    className="rounded-full p-1"
                    aria-label="Close fullscreen"
                    type="button"
                  >
                    <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
            )}

            {/* Loading screen - pure black with loading indicator */}
            {isGeneratingAudio && (
              <div className="absolute inset-0 bg-black z-30 flex items-center justify-center">
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full" />
                  <span className="text-white text-lg font-medium">Preparing Story...</span>
                </div>
              </div>
            )}

            {/* End hold screen - pure black */}
            {showEndHold && (
              <div className="absolute inset-0 bg-black z-30">
                {/* Completely black screen */}
              </div>
            )}
          </div>
        </>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent className="w-[calc(100%-2rem)] max-w-2xl bg-white sm:w-full sm:max-w-2xl rounded-2xl focus:outline-none">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl font-bold text-red-700">
              <Trash size={20} className="text-red-600" />
              Delete Story Cut
            </DialogTitle>
            <DialogDescription className="text-gray-600">
              Are you sure you want to delete "{storyCutToDelete?.title}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          <div className="flex gap-3 mt-6">
            <Button
              variant="outline"
              onClick={() => {
                setShowDeleteConfirm(false);
                setStoryCutToDelete(null);
              }}
              className="flex-1"
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleDeleteStoryCut}
              disabled={isDeleting}
              className="flex-1 bg-red-600 hover:bg-red-700 text-white border-red-600 hover:border-red-700"
            >
              {isDeleting ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Deleting...
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Trash size={16} />
                  Delete
                </div>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
}