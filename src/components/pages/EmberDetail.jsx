import { useState, useEffect } from 'react';
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
import { getEmber, updateEmberTitle, saveStoryCut, getStoryCutsForEmber, getAllStoryMessagesForEmber, deleteStoryCut, setPrimaryStoryCut, getPrimaryStoryCut } from '@/lib/database';
import { getEmberWithSharing } from '@/lib/sharing';
import EmberChat from '@/components/EmberChat';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Flower, Microphone, Keyboard, CornersOut, ArrowCircleUp, Aperture, Chats, Smiley, ShareNetwork, PencilSimple, Info, Camera, MapPin, MagnifyingGlass, Campfire, Gear, PenNib, CheckCircle, BookOpen, Users, Lightbulb, Eye, Clock, Package, UsersThree, PlayCircle, Sliders, CirclesFour, FilmSlate, ImageSquare, House, UserCirclePlus, Trash, Link, Copy, QrCode, ArrowsClockwise, Heart, HeartStraight, Calendar, Play, Pause, X, Circle, Share, Export, Star } from 'phosphor-react';

import FeaturesCard from '@/components/FeaturesCard';

import InviteModal from '@/components/InviteModal';
import StoryModal from '@/components/StoryModal';
import LocationModal from '@/components/LocationModal';
import TimeDateModal from '@/components/TimeDateModal';
import ImageAnalysisModal from '@/components/ImageAnalysisModal';
import TaggedPeopleModal from '@/components/TaggedPeopleModal';

import EmberNamesModal from '@/components/EmberNamesModal';
import EmberSettingsPanel from '@/components/EmberSettingsPanel';
import QRCodeGenerator from '@/components/QRCodeGenerator';
import { textToSpeech, getVoices } from '@/lib/elevenlabs';
import { getStoryCutStyles, getStoryCutStylesFromDB, STORY_CUT_PROMPTS, STORY_CUT_STYLES, buildEmberContext, generateStoryCutWithOpenAI } from '@/lib/prompts';
import useStore from '@/store';

export default function EmberDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [ember, setEmber] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showFullImage, setShowFullImage] = useState(false);
  const [showShareSlideOut, setShowShareSlideOut] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showNamesModal, setShowNamesModal] = useState(false);
  const [showSettingsPanel, setShowSettingsPanel] = useState(false);
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
  const [showStoryCuts, setShowStoryCuts] = useState(false);
  const [showStoryModal, setShowStoryModal] = useState(false);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [showTimeDateModal, setShowTimeDateModal] = useState(false);
  const [showImageAnalysisModal, setShowImageAnalysisModal] = useState(false);
  const [showTaggedPeopleModal, setShowTaggedPeopleModal] = useState(false);
  const [taggedPeopleCount, setTaggedPeopleCount] = useState(0);
  const [emberLength, setEmberLength] = useState(30);
  const [selectedVoices, setSelectedVoices] = useState([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [userPermission, setUserPermission] = useState('none');
  const [isPlaying, setIsPlaying] = useState(false);
  const [showFullscreenPlay, setShowFullscreenPlay] = useState(false);
  const [currentAudio, setCurrentAudio] = useState(null);
  const [isExitingPlay, setIsExitingPlay] = useState(false);
  const [availableVoices, setAvailableVoices] = useState([]);
  const [selectedEmberVoice, setSelectedEmberVoice] = useState('');
  const [selectedNarratorVoice, setSelectedNarratorVoice] = useState('');
  const [voicesLoading, setVoicesLoading] = useState(false);
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
        setSelectedEmberVoice(voices[0].voice_id);
      }
      if (!selectedNarratorVoice && voices.length > 1) {
        setSelectedNarratorVoice(voices[1].voice_id);
      } else if (!selectedNarratorVoice && voices.length > 0) {
        setSelectedNarratorVoice(voices[0].voice_id);
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
      const styles = await getStoryCutStyles();
      setAvailableStoryStyles(styles);
    } catch (error) {
      console.error('Failed to fetch story styles:', error);
      // Set fallback styles if database fails
      setAvailableStoryStyles([
        { id: 'cinematic', name: 'Cinematic Drama', description: 'Epic, movie-like storytelling' },
        { id: 'conversational', name: 'Conversational', description: 'Natural, friendly storytelling' },
        { id: 'documentary', name: 'Documentary Style', description: 'Informative, educational approach' }
      ]);
    } finally {
      setStylesLoading(false);
    }
  };

  // Fetch voices and story styles on component mount
  useEffect(() => {
    fetchVoices();
    fetchStoryStyles();
  }, []);

  // Fetch tagged people count for the current ember
  const fetchTaggedPeopleCount = async () => {
    if (!ember?.id) return;
    
    try {
      const { getEmberTaggedPeople } = await import('@/lib/database');
      const taggedPeople = await getEmberTaggedPeople(ember.id);
      setTaggedPeopleCount(taggedPeople.length);
    } catch (error) {
      console.error('Error fetching tagged people count:', error);
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
          console.log('⚠️ Could not auto-set primary (may not be owner):', error.message);
          // This is fine - user might not be the owner
        }
      }
    } catch (error) {
      console.error('Error fetching story cuts:', error);
    } finally {
      setStoryCutsLoading(false);
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
      fetchTaggedPeopleCount();
    }
  }, [ember?.id]);

  // Set up global actions for EmberSettingsPanel to access
  useEffect(() => {
    window.EmberDetailActions = {
      openStoryCutCreator: () => {
        setShowStoryCutCreator(true);
      },
      refreshStoryCuts: fetchStoryCuts
    };

    // Cleanup
    return () => {
      delete window.EmberDetailActions;
    };
  }, []);

  // Helper function to format relative time
  const formatRelativeTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now - date) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes} minute${diffInMinutes === 1 ? '' : 's'} ago`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours} hour${diffInHours === 1 ? '' : 's'} ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays} day${diffInDays === 1 ? '' : 's'} ago`;
    
    return date.toLocaleDateString();
  };

  // Helper function to format duration seconds to mm:ss
  const formatDuration = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // Helper function to get style display name from database styles
  const getStyleDisplayName = (style) => {
    const dbStyle = availableStoryStyles.find(s => s.id === style);
    return dbStyle ? dbStyle.name : style;
  };

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

  // Share slide out content component
  const ShareSlideOutContent = () => {
    const [message, setMessage] = useState(null);
    const [showQRCode, setShowQRCode] = useState(false);

    const copyShareLink = async () => {
      try {
        const link = `${window.location.origin}/embers/${ember.id}`;
        await navigator.clipboard.writeText(link);
        setMessage({ type: 'success', text: 'Link copied to clipboard' });
        setTimeout(() => setMessage(null), 3000);
      } catch (error) {
        setMessage({ type: 'error', text: 'Failed to copy link' });
        setTimeout(() => setMessage(null), 3000);
      }
    };

    const handleNativeShare = async () => {
      try {
        const link = `${window.location.origin}/embers/${ember.id}`;
        const title = ember.title || 'Check out this ember';
        const description = ember.message || 'Shared from ember.ai';
        
        if (navigator.share) {
          await navigator.share({
            title: title,
            text: description,
            url: link,
          });
        }
      } catch (error) {
        console.log('Error sharing:', error);
      }
    };

    return (
      <div className="space-y-6">
        {/* Message */}
        {message && (
          <div className={`p-4 rounded-xl ${message.type === 'error' ? 'border border-red-200 bg-red-50 text-red-800' : 'border border-green-200 bg-green-50 text-green-800'}`}>
            <p className="text-sm">{message.text}</p>
          </div>
        )}

        {/* View-Only Notice */}
        <div className="bg-green-50 border border-green-200 rounded-xl p-4">
          <h4 className="font-medium text-green-900 mb-2">View-Only Sharing</h4>
          <p className="text-sm text-green-800">
            Anyone with this link can view the ember but cannot edit or contribute to it. 
            To invite collaborators with edit access, use the "Invite Contributors" feature.
          </p>
        </div>

        {/* Share Link */}
        <div className="space-y-3">
          <h4 className="font-medium flex items-center gap-2">
            <Link className="w-4 h-4" />
            Share Link (View-Only)
          </h4>
          <div className="flex gap-2">
            <Input
              value={`${window.location.origin}/embers/${ember.id}`}
              readOnly
              className="text-xs min-w-0 flex-1 h-10"
            />
            <Button size="lg" onClick={copyShareLink} variant="blue" className="flex-shrink-0">
              <Copy className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* QR Code Section */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-medium flex items-center gap-2">
              <QrCode className="w-4 h-4" />
              QR Code (View-Only)
            </h4>
            <Button
              variant="outline"
              size="lg"
              onClick={() => setShowQRCode(!showQRCode)}
              className="flex items-center gap-2"
            >
              {showQRCode ? 'Hide' : 'Generate'}
            </Button>
          </div>
          
          {/* Fixed height container to prevent jumping */}
          <div className={`transition-all duration-200 overflow-hidden ${showQRCode ? 'h-[240px]' : 'h-0'}`}>
            {showQRCode && (
              <div className="mt-4">
                <QRCodeGenerator 
                  url={`${window.location.origin}/embers/${ember.id}`}
                  title="Ember QR Code"
                  size={180}
                />
              </div>
            )}
          </div>
        </div>

        {/* Native Share Button - Bottom */}
        {typeof navigator !== 'undefined' && navigator.share && (
          <div className="mt-6 pt-4 border-t">
            <Button 
              onClick={handleNativeShare} 
              variant="blue" 
              size="lg"
              className="w-full flex items-center gap-2"
            >
              <ShareNetwork className="w-4 h-4" />
              Share Ember
            </Button>
          </div>
        )}
      </div>
    );
  };

  // Generate story cut with OpenAI
  const handleGenerateStoryCut = async () => {
    try {
      setIsGeneratingStoryCut(true);
      setMessage(null);

      // Form validation
      if (!selectedStoryStyle) {
        throw new Error('Please select a story style');
      }

      if (!emberLength || emberLength < 10 || emberLength > 300) {
        throw new Error('Duration must be between 10 and 300 seconds');
      }

      if (!selectedEmberVoice || !selectedNarratorVoice) {
        throw new Error('Please select voices for both Ember and Narrator');
      }

      // Get style configuration from database styles instead of hardcoded
      const dbStyles = await getStoryCutStylesFromDB();
      const styleConfig = dbStyles[selectedStoryStyle];
      if (!styleConfig) {
        throw new Error('Invalid story style selected');
      }

      // Log form data for debugging
      const formData = {
        title: ember?.title || 'Untitled',
        duration: emberLength,
        style: selectedStoryStyle,
        focus: storyFocus,
        emberVoice: selectedEmberVoice,
        narratorVoice: selectedNarratorVoice,
        selectedUsers: selectedVoices
      };

      // Get story messages for richer context
      const storyMessages = await getAllStoryMessagesForEmber(ember.id);
      
      // Build comprehensive ember context with story content
      const emberWithStoryContext = {
        ...ember,
        storyMessages: storyMessages || []
      };
      const emberContext = buildEmberContext(emberWithStoryContext);
      
      // Get selected voice details
      const emberVoiceInfo = availableVoices.find(v => v.voice_id === selectedEmberVoice);
      const narratorVoiceInfo = availableVoices.find(v => v.voice_id === selectedNarratorVoice);
      
      // Get selected users for voice casting
      const selectedUserDetails = [];
      if (ember?.owner && selectedVoices.includes(ember.owner.user_id)) {
        selectedUserDetails.push({
          id: ember.owner.user_id,
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

      console.log('🎬 PREPARING OPENAI STORY CUT GENERATION:');
      console.log('='.repeat(80));
      console.log('📚 STORY INTEGRATION:', storyMessages && storyMessages.length > 0 
        ? `✅ Using ${storyMessages.length} story messages from conversations` 
        : '❌ No story content found - using visual analysis only');
      console.log('🎭 STYLE:', styleConfig.name, '-', styleConfig.description);
      console.log('⏱️ DURATION:', emberLength, 'seconds');
      console.log('🎤 VOICE CASTING:', {
        ember: emberVoiceInfo?.name,
        narrator: narratorVoiceInfo?.name,
        contributors: selectedUserDetails.map(u => u.name)
      });
      console.log('🎯 FOCUS:', formData.focus || 'General storytelling');
      console.log('='.repeat(80));
      
      // Use OpenAI to generate the actual story cut
      console.log('🤖 Calling OpenAI to generate story cut...');
      const openaiResult = await generateStoryCutWithOpenAI(
        formData,
        styleConfig,
        emberContext, 
        {
          ember: emberVoiceInfo,
          narrator: narratorVoiceInfo,
          contributors: selectedUserDetails
        }
      );
      
      if (!openaiResult.success) {
        throw new Error('Failed to generate story cut with OpenAI');
      }
      
      const generatedStoryCut = openaiResult.data;
      console.log('✅ OpenAI generated story cut:', generatedStoryCut);
      console.log('📊 Tokens used:', openaiResult.tokensUsed);

      // Save to database
      const storyCutToSave = {
        emberId: ember.id,
        creatorUserId: userProfile?.user_id,
        title: generatedStoryCut.title,
        style: generatedStoryCut.style,
        duration: generatedStoryCut.duration,
        wordCount: generatedStoryCut.wordCount,
        storyFocus: formData.focus,
        script: generatedStoryCut.script,
        voiceCasting: {
          emberVoice: {
            voice_id: selectedEmberVoice,
            name: emberVoiceInfo?.name || 'Unknown Voice'
          },
          narratorVoice: {
            voice_id: selectedNarratorVoice,
            name: narratorVoiceInfo?.name || 'Unknown Voice'
          },
          contributors: selectedUserDetails
        },
        metadata: generatedStoryCut.metadata
      };

      console.log('💾 Saving story cut to database:', storyCutToSave);
      
      const savedStoryCut = await saveStoryCut(storyCutToSave);
      
      console.log('✅ Story cut saved successfully:', savedStoryCut);
      
      // Refresh the story cuts list
      await fetchStoryCuts();
      
      // Also refresh the EmberSettingsPanel if it's open
      if (window.EmberDetailActions?.refreshStoryCuts && window.EmberDetailActions.refreshStoryCuts !== fetchStoryCuts) {
        await window.EmberDetailActions.refreshStoryCuts();
      }
      
      setMessage({ 
        type: 'success', 
        text: `Story cut "${generatedStoryCut.title}" created and saved successfully! Generated by OpenAI with ${openaiResult.tokensUsed} tokens.${
          storyMessages && storyMessages.length > 0 
            ? ` Used ${storyMessages.length} story messages from conversations.`
            : ' Build a story first for even richer content.'
        }` 
      });
      
      // Close the creator modal
      setShowStoryCutCreator(false);
      
    } catch (error) {
      console.error('Error generating story cut:', error);
      
      // Provide more specific error messages for different failure types
      let errorMessage = 'Failed to generate story cut. Please try again.';
      
      if (error.message.includes('OpenAI API key')) {
        errorMessage = 'OpenAI API key not configured. Please check your environment variables.';
      } else if (error.message.includes('quota exceeded')) {
        errorMessage = 'OpenAI API quota exceeded. Please check your billing or try again later.';
      } else if (error.message.includes('development')) {
        errorMessage = 'OpenAI integration only available in development mode with API key configured.';
      } else if (error.message.includes('JSON')) {
        errorMessage = 'Failed to parse AI response. Please try again with a different configuration.';
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

  const StoryCutDetailContent = () => (
    <div className="space-y-6">
      {/* Story Cut Info */}
      <div className="flex flex-col sm:flex-row gap-4 p-4 bg-blue-50 rounded-xl border border-blue-200">
        <div className="flex items-center gap-3">
          <div className="text-sm text-gray-600">
            <div className="font-medium">{formatDuration(selectedStoryCut.duration)}</div>
            <div>{selectedStoryCut.word_count || 'Unknown'} words</div>
          </div>
        </div>
        
        {/* Style Badge */}
        <div className="flex items-center">
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
            {getStyleDisplayName(selectedStoryCut.style)}
          </span>
        </div>
      </div>

      {/* Voice Casting */}
      <div className="space-y-3">
        <h3 className="text-lg font-semibold text-gray-900">Voice Casting</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-3 bg-green-50 rounded-lg border border-green-200">
            <div className="text-sm font-medium text-green-800">Ember Voice</div>
            <div className="text-green-700">{selectedStoryCut.ember_voice_name}</div>
          </div>
          <div className="p-3 bg-purple-50 rounded-lg border border-purple-200">
            <div className="text-sm font-medium text-purple-800">Narrator Voice</div>
            <div className="text-purple-700">{selectedStoryCut.narrator_voice_name}</div>
          </div>
        </div>
      </div>

      {/* Story Focus */}
      {selectedStoryCut.story_focus && (
        <div className="space-y-3">
          <h3 className="text-lg font-semibold text-gray-900">Story Focus</h3>
          <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
            <p className="text-gray-700">{selectedStoryCut.story_focus}</p>
          </div>
        </div>
      )}

      {/* Full Script */}
      {selectedStoryCut.full_script && (
      <div className="space-y-3">
        <h3 className="text-lg font-semibold text-gray-900">Complete Script</h3>
        <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
          <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
            {selectedStoryCut.full_script}
          </p>
        </div>
      </div>
      )}

      {/* Voice Lines Breakdown */}
      {((selectedStoryCut.ember_voice_lines && selectedStoryCut.ember_voice_lines.length > 0) || 
        (selectedStoryCut.narrator_voice_lines && selectedStoryCut.narrator_voice_lines.length > 0)) && (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">Voice Lines Breakdown</h3>
        
        {/* Ember Voice Lines */}
        {selectedStoryCut.ember_voice_lines && selectedStoryCut.ember_voice_lines.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-medium text-green-800 flex items-center gap-2">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              Ember Voice Lines ({selectedStoryCut.ember_voice_name})
            </h4>
            <div className="space-y-2">
              {selectedStoryCut.ember_voice_lines.map((line, index) => (
                <div key={index} className="p-3 bg-green-50 rounded-lg border border-green-200">
                  <p className="text-green-700">{line}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Narrator Voice Lines */}
        {selectedStoryCut.narrator_voice_lines && selectedStoryCut.narrator_voice_lines.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-medium text-purple-800 flex items-center gap-2">
              <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
              Narrator Voice Lines ({selectedStoryCut.narrator_voice_name})
            </h4>
            <div className="space-y-2">
              {selectedStoryCut.narrator_voice_lines.map((line, index) => (
                <div key={index} className="p-3 bg-purple-50 rounded-lg border border-purple-200">
                  <p className="text-purple-700">{line}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      )}

      {/* Contributors */}
      {selectedStoryCut.selected_contributors && selectedStoryCut.selected_contributors.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-lg font-semibold text-gray-900">Selected Contributors</h3>
          <div className="flex flex-wrap gap-2">
            {selectedStoryCut.selected_contributors.map((contributor, index) => (
              <span 
                key={index}
                className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-gray-100 text-gray-700"
              >
                {contributor.name} ({contributor.role})
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Metadata */}
      <div className="pt-4 border-t border-gray-200">
        <div className="text-sm text-gray-500 space-y-1">
          <div>Created: {formatRelativeTime(selectedStoryCut.created_at)}</div>
          {selectedStoryCut.metadata?.generatedAt && (
            <div>Generated: {new Date(selectedStoryCut.metadata.generatedAt).toLocaleString()}</div>
          )}
        </div>
      </div>
    </div>
  );

  const StoryModalContent = () => (
    <div className="space-y-6">
      {/* User Editor Info */}
      <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-xl border border-blue-200">
        <Avatar className="h-8 w-8">
          <AvatarImage 
            src={userProfile?.avatar_url} 
            alt={`${userProfile?.first_name || ''} ${userProfile?.last_name || ''}`.trim() || 'User'} 
          />
          <AvatarFallback className="text-sm bg-gray-200 text-gray-700">
            {userProfile?.first_name?.[0] || userProfile?.last_name?.[0] || 'U'}
          </AvatarFallback>
        </Avatar>
        <div>
          <p className="text-sm font-medium text-gray-900">
            {`${userProfile?.first_name || ''} ${userProfile?.last_name || ''}`.trim() || 'User'}
          </p>
          <p className="text-xs text-gray-500">
            Editing this ember
          </p>
        </div>
      </div>

      {/* Story Title */}
      <div className="space-y-3">
        <Label className="text-sm font-medium text-gray-900 flex items-center gap-2">
          <PenNib size={16} className="text-blue-600" />
          Story Title
        </Label>
        <Input
          type="text"
          value={storyTitle}
          onChange={(e) => setStoryTitle(e.target.value)}
          placeholder="Enter story title..."
          className="w-full h-10"
        />
      </div>

      {/* Ember Length Slider */}
      <div className="space-y-4">
        <Label className="text-sm font-medium text-gray-900 flex items-center gap-2">
          <Sliders size={16} className="text-blue-600" />
          Ember Length
        </Label>
        
        <div className="space-y-3">
          <div>
            <div className="flex justify-between items-center mb-2">
              <Label className="text-xs text-gray-600">Duration</Label>
              <span className="text-xs text-blue-600 font-medium">{emberLength} seconds</span>
            </div>
            <input 
              type="range" 
              min="5" 
              max="60" 
              step="5" 
              value={emberLength}
              onChange={(e) => setEmberLength(Number(e.target.value))}
              className="w-full mt-1" 
            />
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>5s</span>
              <span>20s</span>
              <span>35s</span>
              <span>50s</span>
              <span>60s</span>
            </div>
          </div>
        </div>
      </div>

      {/* Voices Section */}
      <div className="space-y-4">
        <Label className="text-sm font-medium text-gray-900 flex items-center gap-2">
          <Users size={16} className="text-blue-600" />
          Voices
        </Label>
        
        <div className="grid grid-cols-3 gap-3 md:space-y-3 md:grid-cols-1">
          {/* Owner */}
          {ember?.owner && (
            <div 
              onClick={() => toggleVoiceSelection(ember.owner.user_id)}
              className="flex items-center gap-2 md:gap-3 p-2 md:p-3 rounded-xl border cursor-pointer transition-colors hover:bg-gray-50"
              style={{
                borderColor: selectedVoices.includes(ember.owner.user_id) ? '#2563eb' : '#e5e7eb',
                backgroundColor: selectedVoices.includes(ember.owner.user_id) ? '#eff6ff' : 'white'
              }}
            >
              <div className="relative">
                <Avatar className="h-8 w-8 md:h-10 md:w-10">
                  <AvatarImage 
                    src={ember.owner.avatar_url} 
                    alt={ember.owner.first_name || 'Owner'} 
                  />
                  <AvatarFallback className="text-xs md:text-sm bg-gray-200 text-gray-700">
                    {ember.owner.first_name?.[0] || ember.owner.last_name?.[0] || 'O'}
                  </AvatarFallback>
                </Avatar>
                {selectedVoices.includes(ember.owner.user_id) && (
                  <div className="absolute -top-1 -right-1 w-3 h-3 md:w-4 md:h-4 bg-blue-600 rounded-full flex items-center justify-center">
                    <span className="text-white text-xs">✓</span>
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs md:text-sm font-medium text-gray-900 truncate">
                  {ember.owner.first_name || 'Owner'}
                </div>
                <div className="text-xs text-amber-600 bg-amber-100 px-1 md:px-2 py-0.5 md:py-1 rounded-full inline-block mt-0.5 md:mt-1">
                  Owner
                </div>
              </div>
            </div>
          )}

          {/* Shared Users */}
          {sharedUsers.map((user) => (
            <div 
              key={user.user_id}
              onClick={() => toggleVoiceSelection(user.user_id)}
              className="flex items-center gap-2 md:gap-3 p-2 md:p-3 rounded-xl border cursor-pointer transition-colors hover:bg-gray-50"
              style={{
                borderColor: selectedVoices.includes(user.user_id) ? '#2563eb' : '#e5e7eb',
                backgroundColor: selectedVoices.includes(user.user_id) ? '#eff6ff' : 'white'
              }}
            >
              <div className="relative">
                <Avatar className="h-8 w-8 md:h-10 md:w-10">
                  <AvatarImage 
                    src={user.avatar_url} 
                    alt={user.first_name || 'User'} 
                  />
                  <AvatarFallback className="text-xs md:text-sm bg-gray-200 text-gray-700">
                    {user.first_name?.[0] || user.last_name?.[0] || 'U'}
                  </AvatarFallback>
                </Avatar>
                {selectedVoices.includes(user.user_id) && (
                  <div className="absolute -top-1 -right-1 w-3 h-3 md:w-4 md:h-4 bg-blue-600 rounded-full flex items-center justify-center">
                    <span className="text-white text-xs">✓</span>
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs md:text-sm font-medium text-gray-900 truncate">
                  {user.first_name || 'User'}
                </div>
                <div className={`text-xs px-1 md:px-2 py-0.5 md:py-1 rounded-full inline-block mt-0.5 md:mt-1 ${
                  user.permission_level === 'contributor' 
                    ? 'text-blue-600 bg-blue-100' 
                    : 'text-gray-600 bg-gray-100'
                }`}>
                  {user.permission_level === 'contributor' ? 'Contributor' : 'Viewer'}
                </div>
              </div>
            </div>
          ))}

          {/* No users message */}
          {!ember?.owner && sharedUsers.length === 0 && (
            <div className="col-span-3 md:col-span-1 text-center text-gray-500 text-sm py-4">
              No users invited to this ember yet
            </div>
          )}
        </div>
      </div>

      {/* Dropdown Sections */}
      <div className="space-y-4">
        <div>
          <Label className="text-sm font-medium text-gray-900 mb-2 flex items-center gap-2">
            <Package size={16} className="text-blue-600" />
            Story Style
          </Label>
          <select 
            value={selectedStoryStyle}
            onChange={(e) => setSelectedStoryStyle(e.target.value)}
            disabled={stylesLoading}
            className="w-full p-2 border border-gray-300 rounded-md text-sm h-10"
          >
            {stylesLoading ? (
              <option>Loading story styles...</option>
            ) : (
              <>
            <option value="">Select story style...</option>
                {availableStoryStyles.map((style) => (
              <option key={style.id} value={style.id}>
                {style.name} - {style.description}
              </option>
            ))}
              </>
            )}
          </select>
        </div>
      </div>

      {/* Story Focus */}
      <div className="space-y-3">
        <Label className="text-sm font-medium text-gray-900 flex items-center gap-2">
          <Eye size={16} className="text-blue-600" />
          Story Focus
        </Label>
        <Input
          type="text"
          value={storyFocus}
          onChange={(e) => setStoryFocus(e.target.value)}
          placeholder="What should this story focus on? (e.g., emotions, setting, characters, action...)"
          className="w-full h-10"
        />
      </div>

      {/* Voice Selection */}
      <div className="space-y-4">
        <Label className="text-sm font-medium text-gray-900 flex items-center gap-2">
          <Microphone size={16} className="text-purple-600" />
          Voice Selection
        </Label>
        
        <div className="grid grid-cols-1 gap-4">
          {/* Ember Voice */}
          <div className="space-y-2">
            <Label className="text-xs font-medium text-gray-700">Ember Voice</Label>
            <select 
              value={selectedEmberVoice}
              onChange={(e) => setSelectedEmberVoice(e.target.value)}
              disabled={voicesLoading}
              className="w-full p-2 border border-gray-300 rounded-md text-sm h-10 bg-white"
            >
              {voicesLoading ? (
                <option>Loading voices...</option>
              ) : (
                <>
                  <option value="">Select ember voice...</option>
                  {availableVoices.map((voice) => (
                    <option key={voice.voice_id} value={voice.voice_id}>
                      {voice.name} {voice.labels?.gender ? `(${voice.labels.gender})` : ''}
                    </option>
                  ))}
                </>
              )}
            </select>
          </div>

          {/* Story Narrator Voice */}
          <div className="space-y-2">
            <Label className="text-xs font-medium text-gray-700">Story Narrator Voice</Label>
            <select 
              value={selectedNarratorVoice}
              onChange={(e) => setSelectedNarratorVoice(e.target.value)}
              disabled={voicesLoading}
              className="w-full p-2 border border-gray-300 rounded-md text-sm h-10 bg-white"
            >
              {voicesLoading ? (
                <option>Loading voices...</option>
              ) : (
                <>
                  <option value="">Select narrator voice...</option>
                  {availableVoices.map((voice) => (
                    <option key={voice.voice_id} value={voice.voice_id}>
                      {voice.name} {voice.labels?.gender ? `(${voice.labels.gender})` : ''}
                    </option>
                  ))}
                </>
              )}
            </select>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="mt-6 pt-4">
        <Button 
          size="lg" 
          className="w-full" 
          onClick={handleGenerateStoryCut}
          disabled={isGeneratingStoryCut || !selectedStoryStyle || !selectedEmberVoice || !selectedNarratorVoice || !storyTitle.trim()}
        >
          {isGeneratingStoryCut ? 'Generating Story Cut...' : 'Generate New Story Cut'}
        </Button>
        
        {(!selectedStoryStyle || !selectedEmberVoice || !selectedNarratorVoice || !storyTitle.trim()) && (
          <p className="text-xs text-gray-500 mt-2 text-center">
            Please enter title, select story style and both voices to generate
          </p>
        )}
      </div>
    </div>
  );

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
      } catch (analysisError) {
        console.warn('Failed to check image analysis status:', analysisError);
        data.image_analysis_completed = false;
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
    await fetchTaggedPeopleCount();
  };

  // Extract all wiki content as text for narration
  const extractWikiContent = (ember) => {
    let content = [];
    
    // Add title
    if (ember?.title) {
      content.push(`This is ${ember.title}.`);
    }
    
    // Add story messages if they exist
    // Note: We'd need to fetch story messages separately for a real implementation
    content.push("Here's the story behind this moment...");
    
    // Add location info
    if (ember?.location_name) {
      content.push(`This took place at ${ember.location_name}.`);
    }
    
    // Add date/time info  
    if (ember?.date_taken) {
      const date = new Date(ember.date_taken);
      content.push(`This photo was taken on ${date.toLocaleDateString()}.`);
    }
    
    // Add image analysis if available
    if (ember?.analysis_data) {
      content.push("The image shows " + ember.analysis_data);
    }
    
    // Fallback content
    if (content.length <= 1) {
      content.push("This is a beautiful memory captured in time. Each photo tells a unique story waiting to be shared and remembered.");
    }
    
    return content.join(' ');
  };

  // Handle smooth exit from fullscreen play
  const handleExitPlay = () => {
    setIsExitingPlay(true);
    if (currentAudio) {
      currentAudio.pause();
      setCurrentAudio(null);
    }
    setIsPlaying(false);
    setCurrentlyPlayingStoryCut(null);
    
    // Wait for exit animation to complete
    setTimeout(() => {
      setShowFullscreenPlay(false);
      setIsExitingPlay(false);
    }, 500);
  };

  // Handle play button click - now uses story cuts if available
  const handlePlay = async () => {
    if (isPlaying) {
      // Stop current audio with smooth exit
      handleExitPlay();
      return;
    }

    try {
      setShowFullscreenPlay(true);
      setIsPlaying(true);
      setIsExitingPlay(false);

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
        
        // Use the story cut's script and voice
        const content = selectedStoryCut.full_script;
        const voiceId = selectedStoryCut.ember_voice_id; // Use the ember voice from the story cut
        
        // Generate speech using ElevenLabs with the specific voice
        const audioBlob = await textToSpeech(content, voiceId);
        
        // Create audio URL and play
        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);
        
        setCurrentAudio(audio);
        
        // Handle audio end
        audio.onended = () => {
          handleExitPlay();
          URL.revokeObjectURL(audioUrl);
        };
        
        // Handle audio error
        audio.onerror = () => {
          console.error('Audio playback failed');
          handleExitPlay();
          URL.revokeObjectURL(audioUrl);
        };
        
        await audio.play();
        
      } else {
        // Fallback to basic wiki content if no story cuts exist
        console.log('📖 No story cuts found, using basic wiki content');
        console.log('💡 Tip: Create a story cut for richer, AI-generated narration!');
        const content = extractWikiContent(ember);
        console.log('📖 Content to narrate:', content);

        // Generate speech using ElevenLabs (default voice)
        const audioBlob = await textToSpeech(content);
        
        // Create audio URL and play
        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);
        
        setCurrentAudio(audio);
        
        // Handle audio end
        audio.onended = () => {
          handleExitPlay();
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
        case 'supporting-media':
        default:
          return false; // Placeholder - will be true when data exists
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
              
              {/* Horizontal divider between avatars and action buttons */}
              <div className="h-px w-6 bg-gray-300 my-1"></div>
              
              {/* Settings button - Only show for ember owner */}
              {isOwner && (
                <button
                  className="rounded-full p-1 hover:bg-white/70 transition-colors"
                  onClick={() => setShowSettingsPanel(true)}
                  aria-label="Settings"
                  type="button"
                >
                  <Info size={24} className="text-gray-700" />
                </button>
              )}
              
              {/* Share button - View-only sharing for everyone */}
              {(!ember?.is_public || user) && (
                <button
                  className="rounded-full p-1 hover:bg-white/70 transition-colors"
                  onClick={() => setShowShareSlideOut(true)}
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
                
                {/* Horizontal divider */}
                <div className="h-px w-6 bg-gray-300 my-1"></div>
                
                {/* Feature Icons */}
                <button
                  className="p-1 hover:bg-white/50 rounded-full transition-colors"
                  onClick={() => setShowStoryCuts(true)}
                  aria-label="Story Cuts"
                  type="button"
                >
                  <CirclesFour size={24} className="text-gray-700" />
                </button>
                <button
                  className="p-1 hover:bg-white/50 rounded-full transition-colors"
                  onClick={handlePlay}
                  aria-label={isPlaying ? "Stop playing" : "Play ember story"}
                  type="button"
                >
                  <PlayCircle size={24} className={`text-gray-700 ${isPlaying ? 'text-blue-600' : ''}`} />
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
              {userProfile?.first_name || 'User'}, we have to complete all these cards...
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
                      <h4 className="text-xs font-medium text-white text-center leading-tight">
                        Story Cuts
                      </h4>
                      <p className="text-xs text-blue-100 text-center leading-tight mt-0.5">
                        Edit & create
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
                      description: () => 'Where this moment happened',
                      onClick: () => () => setShowLocationModal(true)
                    },
                    {
                      id: 'time-date',
                      sectionType: 'time-date',
                      icon: Clock,
                      title: () => 'Time & Date',
                      description: () => 'When this moment occurred',
                      onClick: () => () => setShowTimeDateModal(true)
                    },
                    {
                      id: 'story',
                      sectionType: 'story',
                      icon: BookOpen,
                      title: () => 'Story Circle',
                      description: () => 'The narrative behind this ember',
                      onClick: () => () => setShowStoryModal(true)
                    },
                    {
                      id: 'people',
                      sectionType: 'people',
                      icon: Users,
                      title: () => 'Tagged People',
                      description: () => 'People identified in this image',
                      onClick: () => () => setShowTaggedPeopleModal(true)
                    },
                    {
                      id: 'supporting-media',
                      sectionType: 'supporting-media',
                      icon: ImageSquare,
                      title: () => 'Supporting Media',
                      description: () => 'Additional photos and videos',
                      onClick: () => () => console.log('Supporting Media modal coming soon')
                    },
                    {
                      id: 'analysis',
                      sectionType: 'analysis',
                      icon: Eye,
                      title: () => 'Image Analysis',
                      description: () => 'Deep analysis of this image',
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

                  // Sort cards: Not Done first, Done last
                  const sortedCards = carouselCards.sort((a, b) => {
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
                                <div className={`absolute right-0 px-2 py-1 text-xs rounded-full font-medium ${
                                  isComplete 
                                    ? 'bg-green-100 text-green-800' 
                                    : 'bg-gray-100 text-gray-600'
                                }`}>
                                  {isComplete ? 'Done' : 'Not Done'}
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



                {/* People & Analysis Section */}
                <div className="space-y-3">
                  <h3 className="font-medium text-gray-900 text-left">Analysis & People</h3>
                  <div className="text-sm text-gray-600 text-left">
                    Deep image analysis and people tagging will appear here...
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
                              <span className={`px-2 py-1 text-xs rounded-full ${
                                contributor.permission_level === 'contributor' 
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
      {ember && showShareSlideOut && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50" onClick={() => setShowShareSlideOut(false)}>
          <div 
            className="fixed right-0 top-0 h-full w-[90%] md:w-[50%] bg-white shadow-xl transform transition-transform duration-300 ease-in-out"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShareNetwork size={24} className="text-blue-600" />
                  <h2 className="text-xl font-bold text-gray-900">Share Ember</h2>
                </div>
                <button
                  onClick={() => setShowShareSlideOut(false)}
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
              <ShareSlideOutContent />
            </div>
          </div>
        </div>
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
          onRefresh={fetchEmber}
          isRefreshing={isRefreshing}
        />
      )}

      {/* Settings Panel */}
      {ember && (
        <EmberSettingsPanel
          ember={ember}
          isOpen={showSettingsPanel}
          onClose={() => setShowSettingsPanel(false)}
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
          onRefresh={fetchEmber}
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

      {/* Story Cuts Panel */}
      {ember && showStoryCuts && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50" onClick={() => setShowStoryCuts(false)}>
          <div 
            className="fixed right-0 top-0 h-full w-[90%] md:w-[50%] bg-white shadow-xl transform transition-transform duration-300 ease-in-out"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CirclesFour size={24} className="text-blue-600" />
                  <h2 className="text-xl font-bold text-gray-900">Story Cuts</h2>
                </div>
                <button
                  onClick={() => setShowStoryCuts(false)}
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
                      <Play size={12} weight="fill" />
                      The One
                    </div>
                  )}

                  {/* Delete Button - Only show for creators */}
                  {canDeleteStoryCut(cut) && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setStoryCutToDelete(cut);
                        setShowDeleteConfirm(true);
                      }}
                      className="absolute bottom-2 right-2 p-1.5 bg-red-100 hover:bg-red-200 text-red-600 rounded-full transition-colors duration-200 z-10"
                      title="Delete story cut"
                    >
                      <Trash size={14} />
                    </button>
                  )}

                  {/* Make Primary Button - Only show for owner and non-primary cuts */}
                  {!isPrimary && userPermission === 'owner' && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSetPrimary(cut.id);
                      }}
                      className="absolute bottom-2 right-10 p-1.5 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-full transition-colors duration-200 z-10"
                      title="Make This The One"
                    >
                      <Star size={14} weight="fill" />
                    </button>
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
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-gray-900 truncate">{cut.title}</h3>
                          <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                              {cut.story_focus || (cut.full_script ? cut.full_script.substring(0, 100) + '...' : '') || 'No description available'}
                          </p>
                        </div>
                        
                        {/* Creator Avatar */}
                        <div className="flex-shrink-0">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={cut.creator?.avatar_url} alt={`${cut.creator?.first_name || ''} ${cut.creator?.last_name || ''}`.trim()} />
                            <AvatarFallback className="bg-blue-100 text-blue-800 text-xs">
                              {cut.creator?.first_name?.[0] || cut.creator?.last_name?.[0] || 'U'}
                            </AvatarFallback>
                          </Avatar>
                        </div>
                      </div>
                      
                      {/* Metadata */}
                      <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <Users size={12} />
                          {`${cut.creator?.first_name || ''} ${cut.creator?.last_name || ''}`.trim() || 'Unknown Creator'}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock size={12} />
                          {formatDuration(cut.duration)}
                        </span>
                        <span>{formatRelativeTime(cut.created_at)}</span>
                      </div>
                      
                      {/* Style Badge */}
                      <div className="mt-2">
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {getStyleDisplayName(cut.style)}
                        </span>
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
                  <CirclesFour size={48} className="text-gray-300 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2 text-center">No Story Cuts Yet</h3>
                  <p className="text-gray-600 mb-4 text-center">Create your first story cut to get started</p>
                  <Button 
                    variant="blue" 
                    onClick={() => {
                      setShowStoryCuts(false);
                      setShowStoryCutCreator(true);
                    }}
                    className="flex items-center gap-2 mx-auto"
                  >
                    <FilmSlate size={16} />
                    Create Story Cut
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
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
                  <StoryModalContent />
                </div>
              </DrawerContent>
            </Drawer>
          ) : (
            <Dialog open={showStoryCutCreator} onOpenChange={setShowStoryCutCreator}>
              <DialogContent className="w-[calc(100%-2rem)] max-w-md max-h-[90vh] overflow-y-auto bg-white sm:w-full sm:max-w-md rounded-2xl focus:outline-none">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2 text-xl font-bold text-gray-900">
                    <FilmSlate size={20} className="text-blue-600" />
                    Story Cuts Creator
                  </DialogTitle>
                  <DialogDescription className="text-gray-600">
                    Compose your own version of this ember
                  </DialogDescription>
                </DialogHeader>
                <StoryModalContent />
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
                <DrawerHeader className="bg-white">
                  <DrawerTitle className="flex items-center gap-2 text-xl font-bold text-gray-900">
                    <PlayCircle size={20} className="text-blue-600" />
                    {selectedStoryCut.title}
                  </DrawerTitle>
                  <DrawerDescription className="text-left text-gray-600">
                    {getStyleDisplayName(selectedStoryCut.style)} • {formatDuration(selectedStoryCut.duration)} • Created by {`${selectedStoryCut.creator?.first_name || ''} ${selectedStoryCut.creator?.last_name || ''}`.trim() || 'Unknown Creator'}
                  </DrawerDescription>
                </DrawerHeader>
                <div className="px-4 pb-4 bg-white max-h-[70vh] overflow-y-auto">
                  <StoryCutDetailContent />
                </div>
              </DrawerContent>
            </Drawer>
          ) : (
            <Dialog open={showStoryCutDetail} onOpenChange={setShowStoryCutDetail}>
              <DialogContent className="w-[calc(100%-2rem)] max-w-2xl max-h-[90vh] overflow-y-auto bg-white sm:w-full sm:max-w-2xl rounded-2xl focus:outline-none">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2 text-xl font-bold text-gray-900">
                    <PlayCircle size={20} className="text-blue-600" />
                    {selectedStoryCut.title}
                  </DialogTitle>
                  <DialogDescription className="text-gray-600">
                    {getStyleDisplayName(selectedStoryCut.style)} • {formatDuration(selectedStoryCut.duration)} • Created by {`${selectedStoryCut.creator?.first_name || ''} ${selectedStoryCut.creator?.last_name || ''}`.trim() || 'Unknown Creator'}
                  </DialogDescription>
                </DialogHeader>
                <StoryCutDetailContent />
              </DialogContent>
            </Dialog>
          )}
        </>
      )}

      {/* Fullscreen Play Mode */}
      {showFullscreenPlay && (
        <div 
          className={`fixed inset-0 bg-black z-50 transition-all duration-500 ease-out ${
            isExitingPlay ? 'opacity-0' : 'opacity-100'
          }`}
          style={{
            animation: isExitingPlay ? 'fadeOut 0.5s ease-out' : 'fadeIn 0.7s ease-out'
          }}
        >
          {/* Background Image */}
          <img 
            src={ember.image_url} 
            alt={ember.title || 'Ember'}
            className="absolute inset-0 w-full h-full object-cover transition-all duration-1000 ease-out"
            style={{
              animation: 'scaleIn 1s ease-out'
            }}
          />
          
          {/* Dark overlay */}
          <div 
            className="absolute inset-0 bg-black bg-opacity-40 transition-opacity duration-1000 ease-out"
            style={{
              animation: 'fadeInOverlay 1.2s ease-out'
            }}
          />
          
          {/* Title Overlay - Same position as normal view */}
          <div className="absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black/60 to-transparent pointer-events-none z-20">
            <div className="container mx-auto max-w-4xl">
              <h1 className="text-white text-2xl font-bold truncate drop-shadow-md text-left pl-2">
                {ember.title || 'Untitled Ember'}
              </h1>
                </div>
            </div>



          {/* Bottom right capsule: Play controls and exit */}
          <div className="absolute right-4 bottom-4 z-20">
            <div className="flex flex-col items-center gap-2 bg-white/50 backdrop-blur-sm px-2 py-3 rounded-full shadow-lg">
            
            {/* Play/Pause Button */}
            <button
              onClick={handlePlay}
                className="rounded-full p-1 hover:bg-white/70 transition-colors"
                aria-label={isPlaying ? "Pause playing" : "Resume playing"}
                type="button"
            >
              {isPlaying ? (
                  <div className="w-6 h-6 flex items-center justify-center">
                    <div className="w-1.5 h-4 bg-gray-700 mx-0.5 rounded-sm transition-all duration-300"></div>
                    <div className="w-1.5 h-4 bg-gray-700 mx-0.5 rounded-sm transition-all duration-300"></div>
                </div>
              ) : (
                  <PlayCircle size={24} className="text-gray-700 transition-all duration-300" />
              )}
            </button>
              
              {/* Horizontal divider */}
              <div className="h-px w-6 bg-gray-300 my-1"></div>
            
            {/* Close button */}
            <button
              onClick={handleExitPlay}
                className="rounded-full p-1 hover:bg-white/70 transition-colors"
              aria-label="Close fullscreen"
                type="button"
            >
                <svg className="w-6 h-6 text-gray-700 transition-all duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent className="w-[calc(100%-2rem)] max-w-md bg-white sm:w-full sm:max-w-md rounded-2xl focus:outline-none">
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

 