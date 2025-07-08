import { useState, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, Check, ChartBar, Users, Sparkle, ArrowClockwise, XCircle, PenNib } from 'phosphor-react';
import { submitVote, getVotingResults, getUserVote, getParticipantVotingStatus, deleteVote } from '@/lib/voting';
import { getEmberWithSharing } from '@/lib/sharing';
import { getEmberSuggestedNames, addSuggestedName, initializeDefaultSuggestedNames, deleteSuggestedName } from '@/lib/suggestedNames';
import { updateEmberTitle, getImageAnalysis } from '@/lib/database';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import useStore from '@/store';

// Custom hook to detect mobile devices
function useMediaQuery(query) {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(query);
    setMatches(media.matches);
    
    const listener = () => setMatches(media.matches);
    media.addListener(listener);
    
    return () => media.removeListener(listener);
  }, [query]);

  return matches;
}

// Extract ModalContent to prevent re-mounting on every render
const ModalContent = ({ 
  emberParticipants, 
  isLoading, 
  votedUserIds, 
  message, 
  viewMode, 
  allSuggestedNames, 
  ember, 
  user, 
  hasVoted, 
  selectedName, 
  handleSelectSuggestion, 
  handleDeleteSuggestedName, 
  isAddingCustom, 
  customInputRef, 
  customName, 
  setCustomName, 
  handleSelectCustom, 
  handleAddCustom, 
  aiSuggestedName, 
  handleSelectAiSuggestion, 
  handleAiSuggestion, 
  isAiLoading,
  votingResults, 
  userVote,
  totalVotes,
  toggleViewMode,
  handleChangeVote,
  handleUseTitle
}) => (
  <div className="space-y-4">
    {/* Participants Display */}
    <div className="flex justify-center gap-2 flex-wrap min-h-[48px]">
      {isLoading ? (
        // Show single skeleton avatar while loading to prevent jumping
        <div className="h-12 w-12 bg-gray-200 rounded-full border-4 border-gray-300 animate-pulse"></div>
      ) : emberParticipants.length > 0 ? (
        emberParticipants.map((participant, index) => {
          const hasVotedStatus = participant.user_id && votedUserIds.includes(participant.user_id);
          const borderColor = hasVotedStatus ? 'border-green-500' : 'border-gray-300';
          
          return (
            <div key={index} className="flex flex-col items-center">
              <Avatar className={`h-12 w-12 border-4 ${borderColor} transition-colors`}>
                <AvatarImage 
                  src={participant.avatar_url} 
                  alt={`${participant.first_name || ''} ${participant.last_name || ''}`.trim() || participant.email}
                />
                <AvatarFallback className="text-xs bg-gray-200 text-gray-700">
                  {participant.first_name?.[0] || participant.last_name?.[0] || participant.email?.[0]?.toUpperCase() || '?'}
                </AvatarFallback>
              </Avatar>
            </div>
          );
        })
      ) : (
        // Show single skeleton if no participants loaded yet
        <div className="h-12 w-12 bg-gray-200 rounded-full border-4 border-gray-300 animate-pulse"></div>
      )}
    </div>

    {/* Message Display */}
    {message && (
      <div className={`p-3 rounded-md text-sm ${
        message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
      }`}>
        {message.text}
      </div>
    )}

    {/* Voting View */}
    {viewMode === 'voting' && (
      <div className="space-y-3">
        {/* Suggested Names */}
        {isLoading ? (
          // Show skeleton for 3 suggested names while loading
          Array.from({ length: 3 }).map((_, index) => (
            <Card key={`skeleton-${index}`} className="py-0 rounded-md border-gray-200">
              <CardContent className="px-3 py-2 flex items-center justify-between h-10">
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded animate-pulse w-32"></div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          allSuggestedNames.map((nameObj, index) => {
          const isOwner = ember?.user_id === user?.id;
          return (
            <Card 
              key={nameObj.id || `${nameObj.suggested_name}-${index}`}
              className={`transition-all border py-0 rounded-md ${
                hasVoted 
                  ? 'opacity-60 cursor-not-allowed' 
                  : 'hover:border-gray-300 cursor-pointer'
              } ${
                selectedName === nameObj.suggested_name 
                  ? 'border-blue-500 bg-blue-50' 
                  : 'border-gray-200'
              }`}
              onClick={() => !hasVoted && handleSelectSuggestion(nameObj.suggested_name)}
            >
              <CardContent className="px-3 py-2 flex items-center justify-between h-10">
                <div className="flex items-center gap-2">
                  <span className="text-base font-bold">{nameObj.suggested_name}</span>
                </div>
                <div className="flex items-center gap-2">
                  {selectedName === nameObj.suggested_name && (
                    <Check size={16} className="text-blue-500" />
                  )}
                  {isOwner && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteSuggestedName(nameObj.id, nameObj.suggested_name);
                      }}
                      className="p-1 hover:bg-red-100 rounded transition-colors"
                      disabled={isLoading}
                      title={`Delete "${nameObj.suggested_name}"`}
                    >
                      <XCircle size={16} className="text-red-500 hover:text-red-700" />
                    </button>
                  )}
                </div>
              </CardContent>
            </Card>
                      );
          })
        )}

        {/* Custom Name Input */}
        {!hasVoted && (
          isAddingCustom ? (
            <div className="space-y-2">
              <Input
                ref={customInputRef}
                placeholder="Enter your custom title..."
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSelectCustom()}
                className="h-10"
              />
              <div>
                <Button 
                  onClick={handleSelectCustom}
                  disabled={!customName.trim()}
                  size="lg"
                  className="w-full"
                >
                  Submit This Title
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <Button
                variant="outline"
                size="lg"
                onClick={handleAddCustom}
                className="w-full flex items-center justify-center gap-2 border-dashed"
              >
                <Plus size={16} />
                Add Your Own Title
              </Button>
              
              {/* AI Suggested Name Card */}
              {aiSuggestedName && (
                <Card className="py-0 rounded-md border-blue-200 bg-blue-50">
                  <CardContent className="px-3 py-2 flex items-center justify-between h-10">
                    <div className="flex items-center gap-2">
                      <Sparkle size={16} className="text-blue-600" />
                      <span className="text-base font-bold text-blue-900">{aiSuggestedName}</span>
                    </div>
                    <Button
                      size="sm"
                      onClick={handleSelectAiSuggestion}
                      className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-2"
                    >
                      Add
                    </Button>
                  </CardContent>
                </Card>
              )}
              
              <Button
                onClick={handleAiSuggestion}
                disabled={isAiLoading}
                size="lg"
                className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Sparkle size={16} />
                {isAiLoading ? 'Ember is thinking...' : 'Let Ember Try'}
              </Button>
            </div>
          )
        )}
      </div>
    )}

    {/* Results View */}
    {viewMode === 'results' && (
      <div className="space-y-3">
        {votingResults.length === 0 ? (
          <div className="text-center text-gray-500 py-4">
            No votes yet. Be the first to vote!
          </div>
        ) : (
          votingResults.map((result, index) => (
            <Card 
              key={`${result.suggested_name}-${result.vote_count}`}
              className={`py-0 rounded-md ${
                userVote?.suggested_name === result.suggested_name 
                  ? 'border-blue-500 bg-blue-50' 
                  : ''
              }`}
            >
              <CardContent className="px-3 py-3">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-bold">{result.suggested_name}</span>
                      {userVote?.suggested_name === result.suggested_name && (
                        <Check size={16} className="text-blue-500" />
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex-1 bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-500 h-2 rounded-full transition-all"
                          style={{ width: `${result.percentage}%` }}
                        />
                      </div>
                      <span className="text-sm text-gray-600">
                        {result.vote_count} votes
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    )}

    {/* Footer Actions - Only render when there are actual actions to show */}
    {((totalVotes > 0 && viewMode === 'voting') || 
      (hasVoted && viewMode === 'results') || 
      (viewMode === 'results' && votingResults.length > 0 && ember?.user_id === user?.id)) && (
      <div className="space-y-3 mt-6 pt-4">
        {/* View Results Button - Only show when in voting mode */}
        {totalVotes > 0 && viewMode === 'voting' && (
          <Button
            variant="blue"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white"
            size="lg"
            onClick={toggleViewMode}
          >
            View Results
          </Button>
        )}
        
        <div className="flex items-center justify-center gap-2">
          {/* Change Vote Button - only show when user has voted and is in results view */}
          {hasVoted && viewMode === 'results' && (
            <Button
              variant="outline"
              size="lg"
              onClick={handleChangeVote}
              disabled={isLoading}
              className="text-orange-600 border-orange-300 hover:bg-orange-50"
            >
              Change Vote
            </Button>
          )}
          
          {/* Use This Title Button - only show for ember owner in results view */}
          {viewMode === 'results' && votingResults.length > 0 && ember?.user_id === user?.id && (
            <Button
              onClick={handleUseTitle}
              disabled={isLoading}
              className="bg-green-600 hover:bg-green-700 text-white"
              size="lg"
            >
              Use This Title
            </Button>
          )}
        </div>
      </div>
    )}
  </div>
);

export default function EmberNamesModal({ isOpen, onClose, ember, onEmberUpdate }) {
  const { user } = useStore();
  const isMobile = useMediaQuery("(max-width: 768px)");

  const [selectedName, setSelectedName] = useState('');
  const [allSuggestedNames, setAllSuggestedNames] = useState([]); // Will store full objects with id and suggested_name
  const [customName, setCustomName] = useState('');
  const [isAddingCustom, setIsAddingCustom] = useState(false);
  const [viewMode, setViewMode] = useState('voting'); // 'voting' or 'results'
  const [hasVoted, setHasVoted] = useState(false);
  const [userVote, setUserVote] = useState(null);
  const [votingResults, setVotingResults] = useState([]);
  const [totalVotes, setTotalVotes] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [emberParticipants, setEmberParticipants] = useState([]);
  const [votedUserIds, setVotedUserIds] = useState([]);
  const [aiSuggestedName, setAiSuggestedName] = useState(null);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const customInputRef = useRef(null);

  useEffect(() => {
    if (isOpen && ember?.id) {
      loadVotingData();
    }
  }, [isOpen, ember?.id]);

  // Preload avatar images to prevent modal jumping
  const preloadAvatars = async (participants) => {
    const promises = participants
      .filter(participant => participant.avatar_url)
      .map(participant => {
        return new Promise((resolve, reject) => {
          const img = new Image();
          img.onload = resolve;
          img.onerror = resolve; // Resolve even on error to not block loading
          img.src = participant.avatar_url;
          // Timeout after 2 seconds to not block indefinitely
          setTimeout(resolve, 2000);
        });
      });
    
    // Wait for all images to load (or timeout)
    await Promise.all(promises);
  };

  const loadVotingData = async () => {
    try {
      setIsLoading(true);
      
      // Check if user has voted
      const vote = await getUserVote(ember.id);
      if (vote) {
        setUserVote(vote);
        setHasVoted(true);
        setSelectedName(vote.suggested_name);
      }

      // Load voting results
      const results = await getVotingResults(ember.id);
      setVotingResults(results.results);
      setTotalVotes(results.totalVotes);

      // Load suggested names from dedicated table
      const suggestedNames = await getEmberSuggestedNames(ember.id);
      
      // If no suggested names exist, initialize with AI-generated defaults
      if (suggestedNames.length === 0) {
        // Gather all wiki data for AI analysis
        const emberData = { ...ember };
        
        // Get image analysis data if available
        try {
          const imageAnalysis = await getImageAnalysis(ember.id);
          if (imageAnalysis && imageAnalysis.analysis_text) {
            emberData.image_analysis = imageAnalysis.analysis_text;
          }
        } catch (analysisError) {
          console.log('No image analysis available for default title generation');
        }
        
        await initializeDefaultSuggestedNames(ember.id, emberData);
        const defaultNames = await getEmberSuggestedNames(ember.id);
        setAllSuggestedNames(defaultNames); // Store full objects with id and suggested_name
      } else {
        setAllSuggestedNames(suggestedNames); // Store full objects with id and suggested_name
      }

      // Load voting status for all participants
      const votedIds = await getParticipantVotingStatus(ember.id);
      setVotedUserIds(votedIds);

      // Load ember participants (owner + shared users)
      const emberData = await getEmberWithSharing(ember.id);
      const participants = [];
      
      // Add owner - use owner data from sharing function
      if (emberData.owner) {
        participants.push({
          id: emberData.owner.id,
          user_id: emberData.owner.user_id,
          email: emberData.owner.email || 'Owner',
          first_name: emberData.owner.first_name || '',
          last_name: emberData.owner.last_name || '',
          avatar_url: emberData.owner.avatar_url || null,
          role: 'owner'
        });
      } else if (ember.owner) {
        // Fallback to ember prop owner data
        participants.push({
          id: ember.owner.id,
          user_id: ember.owner.user_id || ember.owner.id,
          email: ember.owner.email || 'Owner',
          first_name: ember.owner.first_name || '',
          last_name: ember.owner.last_name || '',
          avatar_url: ember.owner.avatar_url || null,
          role: 'owner'
        });
      } else {
        // Final fallback: add owner based on ember user_id
        participants.push({
          id: ember.user_id,
          user_id: ember.user_id,
          email: 'Owner',
          first_name: '',
          last_name: '',
          avatar_url: null,
          role: 'owner'
        });
      }
      
      // Add shared users - only those who have created accounts
      if (emberData.shares) {
        emberData.shares.forEach(share => {
          // Only include users who have actually created accounts (have user_id)
          if (share.shared_user && share.shared_user.user_id) {
            participants.push({
              id: share.shared_user.id,
              user_id: share.shared_user.user_id,
              email: share.shared_with_email,
              first_name: share.shared_user.first_name || '',
              last_name: share.shared_user.last_name || '',
              avatar_url: share.shared_user.avatar_url || null,
              role: share.permission_level
            });
          }
          // Note: Users without accounts (email-only invitations) are excluded from voting
        });
      }
      
      console.log('Ember data:', emberData);
      console.log('Participants:', participants);
      
      // Preload avatar images before setting participants
      await preloadAvatars(participants);
      setEmberParticipants(participants);

    } catch (error) {
      console.error('Error loading voting data:', error);
      setMessage({ type: 'error', text: 'Failed to load voting data' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectSuggestion = async (name) => {
    if (hasVoted) return; // Prevent selection if already voted
    setSelectedName(name);
    setCustomName('');
    setIsAddingCustom(false);
    
    // Automatically submit the vote
    await handleSubmitVote(name, false);
  };

  const handleSelectCustom = async () => {
    if (customName.trim()) {
      const customNameValue = customName.trim();
      
      try {
        // Add the custom name to the database
        await addSuggestedName(ember.id, customNameValue, true);
        
        // Refetch suggested names to get the new name with its ID
        const updatedSuggestedNames = await getEmberSuggestedNames(ember.id);
        setAllSuggestedNames(updatedSuggestedNames);
        
        // Reset the form
        setCustomName('');
        setIsAddingCustom(false);
        
        // Show success message
        setMessage({ type: 'success', text: 'Custom title added!' });
        setTimeout(() => setMessage(null), 2000);
        
      } catch (error) {
        console.error('Error adding custom name:', error);
        setMessage({ type: 'error', text: 'Failed to add custom title' });
        setTimeout(() => setMessage(null), 2000);
      }
    }
  };

  const handleAddCustom = () => {
    if (hasVoted) return; // Prevent adding custom if already voted
    setIsAddingCustom(true);
    setSelectedName('');
  };

  // Focus the custom input when it becomes visible
  useEffect(() => {
    if (isAddingCustom && customInputRef.current) {
      // Small delay to ensure the input is rendered
      const timeoutId = setTimeout(() => {
        customInputRef.current?.focus();
      }, 100);
      
      return () => clearTimeout(timeoutId);
    }
  }, [isAddingCustom]);

  const handleSubmitVote = async (voteName = null, isCustomVote = null) => {
    const nameToVote = voteName || selectedName;
    const isCustom = isCustomVote !== null ? isCustomVote : isAddingCustom;
    
    if (!nameToVote || !user || hasVoted) return;

    try {
      setIsLoading(true);
      await submitVote(ember.id, nameToVote, isCustom);
      
      // Refresh voting data
      await loadVotingData();
      
      setMessage({ type: 'success', text: 'Vote submitted successfully!' });
      setTimeout(() => setMessage(null), 2000);
    } catch (error) {
      console.error('Error submitting vote:', error);
      setMessage({ type: 'error', text: 'Failed to submit vote' });
      setTimeout(() => setMessage(null), 2000);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleViewMode = () => {
    setViewMode(viewMode === 'voting' ? 'results' : 'voting');
  };

  const handleChangeVote = async () => {
    try {
      setIsLoading(true);
      await deleteVote(ember.id);
      
      // Reset voting state
      setHasVoted(false);
      setUserVote(null);
      setSelectedName('');
      setViewMode('voting');
      
      // Refresh data
      await loadVotingData();
      
      setMessage({ type: 'success', text: 'Vote reset! You can now vote again.' });
      setTimeout(() => setMessage(null), 2000);
    } catch (error) {
      console.error('Error changing vote:', error);
      setMessage({ type: 'error', text: 'Failed to change vote' });
      setTimeout(() => setMessage(null), 2000);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAiSuggestion = async () => {
    if (isAiLoading) return;
    
    console.log('🎯 [FRONTEND] Let Ember Try clicked - starting AI suggestion...');
    setIsAiLoading(true);
    setAiSuggestedName(null);
    
    try {
      // Start with basic ember data
      const emberData = {
        id: ember.id,
        title: ember.title,
        description: ember.description,
        location: ember.location,
        date: ember.date,
        time: ember.time,
        tagged_people: ember.tagged_people,
        supporting_media: ember.supporting_media,
        image_analysis: ember.image_analysis
      };
      
      // Fetch missing wiki data if not already in ember prop
      console.log('🔍 [FRONTEND] Fetching missing wiki data...');
      
      // Get image analysis data if not already present
      if (!emberData.image_analysis) {
        try {
          const imageAnalysis = await getImageAnalysis(ember.id);
          if (imageAnalysis && imageAnalysis.analysis_text) {
            emberData.image_analysis = imageAnalysis.analysis_text;
            console.log('✅ [FRONTEND] Fetched image analysis data');
          }
        } catch (analysisError) {
          console.log('⚠️ [FRONTEND] No image analysis available');
        }
      }
      
      // Get tagged people data if not already present
      if (!emberData.tagged_people) {
        try {
          const { getEmberTaggedPeople } = await import('@/lib/database');
          const taggedPeople = await getEmberTaggedPeople(ember.id);
          if (taggedPeople && taggedPeople.length > 0) {
            emberData.tagged_people = taggedPeople;
            console.log('✅ [FRONTEND] Fetched tagged people data:', taggedPeople.length, 'people');
          }
        } catch (taggedError) {
          console.log('⚠️ [FRONTEND] No tagged people data available');
        }
      }
      
      // Get supporting media data if not already present
      if (!emberData.supporting_media) {
        try {
          const { getEmberSupportingMedia } = await import('@/lib/database');
          const supportingMedia = await getEmberSupportingMedia(ember.id);
          if (supportingMedia && supportingMedia.length > 0) {
            emberData.supporting_media = supportingMedia;
            console.log('✅ [FRONTEND] Fetched supporting media data:', supportingMedia.length, 'files');
          }
        } catch (mediaError) {
          console.log('⚠️ [FRONTEND] No supporting media data available');
        }
      }
      
      console.log('🔍 [FRONTEND] Ember data being sent:', {
        id: emberData.id,
        hasTitle: !!emberData.title,
        hasDescription: !!emberData.description,
        hasLocation: !!emberData.location,
        hasImageAnalysis: !!emberData.image_analysis,
        taggedPeopleCount: emberData.tagged_people?.length || 0,
        supportingMediaCount: emberData.supporting_media?.length || 0
      });
      
      // Use unified API approach instead of dynamic imports
      console.log('🔍 [FRONTEND] Calling API with type: single');
      const response = await fetch('/api/ai-title-suggestion', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ emberData, type: 'single' })
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      console.log('✅ [FRONTEND] API response received:', data);
      console.log('🔍 [FRONTEND] AI suggestion:', data.suggestion);
      
      setAiSuggestedName(data.suggestion);
      
    } catch (error) {
      console.error('❌ [FRONTEND] Error getting AI suggestion:', error);
      console.log('🔍 [FRONTEND] Error details:', error.message);
      setMessage({ type: 'error', text: 'Failed to get AI suggestion' });
      setTimeout(() => setMessage(null), 2000);
    } finally {
      console.log('🔍 [FRONTEND] Let Ember Try completed');
      setIsAiLoading(false);
    }
  };

  const handleSelectAiSuggestion = async () => {
    if (aiSuggestedName) {
      try {
        // Add the AI suggested name to the database
        const newNameId = await addSuggestedName(ember.id, aiSuggestedName, true);
        
        // Add to existing list instead of refetching everything
        const newSuggestion = {
          id: newNameId,
          suggested_name: aiSuggestedName,
          is_custom: true,
          created_by_user_id: user?.id,
          created_at: new Date().toISOString()
        };
        
        setAllSuggestedNames(prevNames => [...prevNames, newSuggestion]);
        
        // Clear AI suggestion
        setAiSuggestedName(null);
        
        // Show success message
        setMessage({ type: 'success', text: 'AI suggestion added!' });
        setTimeout(() => setMessage(null), 2000);
        
      } catch (error) {
        console.error('Error adding AI suggestion:', error);
        setMessage({ type: 'error', text: 'Failed to add AI suggestion' });
        setTimeout(() => setMessage(null), 2000);
      }
    }
  };

  const handleUseTitle = async () => {
    if (votingResults.length === 0) return;
    
    // Find the highest voted title
    const winningResult = votingResults.reduce((prev, current) => 
      (prev.vote_count > current.vote_count) ? prev : current
    );
    
    try {
      setIsLoading(true);
      
      // Update the ember title in the database
      await updateEmberTitle(ember.id, winningResult.suggested_name, user.id);
      
      // Close the modal immediately after successful update
      onClose();
      
      // Call the onEmberUpdate callback to refresh the parent component after closing
      if (onEmberUpdate) {
        onEmberUpdate();
      }
      
    } catch (error) {
      console.error('Error updating ember title:', error);
      setMessage({ type: 'error', text: 'Failed to update ember title' });
      setTimeout(() => setMessage(null), 2000);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteSuggestedName = async (nameId, suggestedName) => {
    if (!nameId) {
      console.error('No nameId provided for deletion');
      return;
    }

    try {
      setIsLoading(true);
      await deleteSuggestedName(nameId);
      
      // Refresh suggested names
      const updatedSuggestedNames = await getEmberSuggestedNames(ember.id);
      setAllSuggestedNames(updatedSuggestedNames);
      
      setMessage({ type: 'success', text: `"${suggestedName}" deleted successfully!` });
      setTimeout(() => setMessage(null), 2000);
      
    } catch (error) {
      console.error('Error deleting suggested name:', error);
      setMessage({ type: 'error', text: 'Failed to delete suggested name' });
      setTimeout(() => setMessage(null), 2000);
    } finally {
      setIsLoading(false);
    }
  };

  // Shared content component for both Dialog and Drawer


  // Responsive render: Drawer on mobile, Dialog on desktop
  if (isMobile) {
    return (
      <Drawer open={isOpen} onOpenChange={onClose}>
        <DrawerContent className="bg-white focus:outline-none">
          <DrawerHeader className="bg-white">
            <DrawerTitle className="flex items-center gap-2 text-xl font-bold text-gray-900">
              <PenNib size={20} className="text-blue-600" />
              Ember Title
              <button
                onClick={loadVotingData}
                disabled={isLoading}
                className="p-1 hover:bg-gray-100 rounded transition-colors"
                title="Refresh data"
              >
                <ArrowClockwise size={16} className="text-gray-400" />
              </button>
              {totalVotes > 0 && <span className="text-sm text-gray-500">({totalVotes} votes)</span>}
            </DrawerTitle>
            <DrawerDescription className="text-left text-gray-600">
              {viewMode === 'voting' 
                ? (hasVoted ? 'You have voted! Switch to results to see how others voted.' : 'Pick the best name for this memory!')
                : 'See how everyone voted on the ember title'
              }
            </DrawerDescription>
          </DrawerHeader>
          <div className="px-4 pb-4 bg-white max-h-[70vh] overflow-y-auto">
            <ModalContent 
              emberParticipants={emberParticipants}
              isLoading={isLoading}
              votedUserIds={votedUserIds}
              message={message}
              viewMode={viewMode}
              allSuggestedNames={allSuggestedNames}
              ember={ember}
              user={user}
              hasVoted={hasVoted}
              selectedName={selectedName}
              handleSelectSuggestion={handleSelectSuggestion}
              handleDeleteSuggestedName={handleDeleteSuggestedName}
              isAddingCustom={isAddingCustom}
              customInputRef={customInputRef}
              customName={customName}
              setCustomName={setCustomName}
              handleSelectCustom={handleSelectCustom}
              handleAddCustom={handleAddCustom}
              aiSuggestedName={aiSuggestedName}
              handleSelectAiSuggestion={handleSelectAiSuggestion}
              handleAiSuggestion={handleAiSuggestion}
              isAiLoading={isAiLoading}
              votingResults={votingResults}
              userVote={userVote}
              totalVotes={totalVotes}
              toggleViewMode={toggleViewMode}
              handleChangeVote={handleChangeVote}
              handleUseTitle={handleUseTitle}
            />
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  // Desktop Dialog
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
                  <DialogContent className="w-[calc(100%-2rem)] max-w-2xl max-h-[90vh] overflow-y-auto bg-white sm:w-full sm:max-w-2xl rounded-2xl focus:outline-none">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-bold text-gray-900">
            <PenNib size={20} className="text-blue-600" />
            Ember Title
            <button
              onClick={loadVotingData}
              disabled={isLoading}
              className="p-1 hover:bg-gray-100 rounded transition-colors"
              title="Refresh data"
            >
              <ArrowClockwise size={16} className="text-gray-400" />
            </button>
            {totalVotes > 0 && <span className="text-sm text-gray-500">({totalVotes} votes)</span>}
          </DialogTitle>
          <DialogDescription className="text-gray-600">
            {viewMode === 'voting' 
              ? (hasVoted ? 'You have voted! Switch to results to see how others voted.' : 'Pick the best name for this memory!')
              : 'See how everyone voted on the ember title'
            }
          </DialogDescription>
        </DialogHeader>
        <div className="px-4 pb-4">
          <ModalContent 
            emberParticipants={emberParticipants}
            isLoading={isLoading}
            votedUserIds={votedUserIds}
            message={message}
            viewMode={viewMode}
            allSuggestedNames={allSuggestedNames}
            ember={ember}
            user={user}
            hasVoted={hasVoted}
            selectedName={selectedName}
            handleSelectSuggestion={handleSelectSuggestion}
            handleDeleteSuggestedName={handleDeleteSuggestedName}
            isAddingCustom={isAddingCustom}
            customInputRef={customInputRef}
            customName={customName}
            setCustomName={setCustomName}
            handleSelectCustom={handleSelectCustom}
            handleAddCustom={handleAddCustom}
            aiSuggestedName={aiSuggestedName}
            handleSelectAiSuggestion={handleSelectAiSuggestion}
            handleAiSuggestion={handleAiSuggestion}
            isAiLoading={isAiLoading}
            votingResults={votingResults}
            userVote={userVote}
            totalVotes={totalVotes}
            toggleViewMode={toggleViewMode}
            handleChangeVote={handleChangeVote}
            handleUseTitle={handleUseTitle}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
} 