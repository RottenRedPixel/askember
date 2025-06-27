import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Aperture, Plus, Check, ChartBar, Users, Sparkle, ArrowClockwise, XCircle } from 'phosphor-react';
import { submitVote, getVotingResults, getUserVote, getParticipantVotingStatus, deleteVote } from '@/lib/voting';
import { getEmberWithSharing } from '@/lib/sharing';
import { getEmberSuggestedNames, addSuggestedName, initializeDefaultSuggestedNames, deleteSuggestedName } from '@/lib/suggestedNames';
import { updateEmberTitle } from '@/lib/database';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import useStore from '@/store';

export default function EmberNamesModal({ isOpen, onClose, ember, onEmberUpdate }) {
  const { user } = useStore();

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
      
      // If no suggested names exist, initialize with defaults
      if (suggestedNames.length === 0) {
        await initializeDefaultSuggestedNames(ember.id);
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
      }
    }
  };

  const handleAddCustom = () => {
    if (hasVoted) return; // Prevent adding custom if already voted
    setIsAddingCustom(true);
    setSelectedName('');
  };

  const handleSubmitVote = async (voteName = null, isCustomVote = null) => {
    const nameToVote = voteName || selectedName;
    if (!nameToVote || !user || hasVoted) return;

    try {
      setIsLoading(true);
      setMessage(null);

      const isCustom = isCustomVote !== null ? isCustomVote : !allSuggestedNames.includes(nameToVote);
      await submitVote(ember.id, nameToVote, isCustom);
      
      setHasVoted(true);
      
      // Reload voting data to show updated results
      await loadVotingData();
      
      // Switch to results view
      setViewMode('results');
      
      // Show success message after view switches
      setMessage({ type: 'success', text: 'Vote submitted successfully!' });
      setTimeout(() => setMessage(null), 3000);
      
    } catch (error) {
      console.error('Error submitting vote:', error);
      setMessage({ type: 'error', text: 'Failed to submit vote' });
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
      setMessage(null);
      
      // Delete the current vote
      await deleteVote(ember.id);
      
      // Reset voting state
      setHasVoted(false);
      setUserVote(null);
      setSelectedName('');
      
      // Switch back to voting view
      setViewMode('voting');
      
      // Reload voting data to update results
      await loadVotingData();
      
      setMessage({ type: 'success', text: 'Your vote has been reset. You can now vote again.' });
    } catch (error) {
      console.error('Error changing vote:', error);
      setMessage({ type: 'error', text: 'Failed to reset vote. Please try again.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAiSuggestion = async () => {
    // Fake AI name suggestions - replace with real OpenAI integration later
    const aiSuggestions = [
      'Whispered Moments',
      'Captured Serenity', 
      'Timeless Echo',
      'Dancing Light',
      'Stolen Glances',
      'Gentle Reverie',
      'Fleeting Beauty',
      'Sacred Pause',
      'Luminous Memory',
      'Tender Glimpse',
      'Ethereal Instant',
      'Quiet Wonder',
      'Radiant Pause',
      'Soft Embrace',
      'Dreamy Interlude'
    ];
    
    // Simulate AI thinking time
    setIsLoading(true);
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Select a random suggestion that's not already in the list
    const existingNames = allSuggestedNames.map(nameObj => nameObj.suggested_name);
    const availableSuggestions = aiSuggestions.filter(name => !existingNames.includes(name));
    if (availableSuggestions.length > 0) {
      const randomName = availableSuggestions[Math.floor(Math.random() * availableSuggestions.length)];
      setAiSuggestedName(randomName);
    } else {
      setMessage({ type: 'error', text: 'No more AI suggestions available' });
    }
    
    setIsLoading(false);
  };

  const handleSelectAiSuggestion = async () => {
    if (aiSuggestedName) {
      try {
        // Add the AI suggested name to the database
        await addSuggestedName(ember.id, aiSuggestedName, true);
        
        // Refetch suggested names to get the new name with its ID
        const updatedSuggestedNames = await getEmberSuggestedNames(ember.id);
        setAllSuggestedNames(updatedSuggestedNames);
        
        // Clear the AI suggestion
        setAiSuggestedName(null);
        
        // Show success message
        setMessage({ type: 'success', text: 'AI suggestion added to options!' });
        setTimeout(() => setMessage(null), 2000);
        
      } catch (error) {
        console.error('Error adding AI suggestion:', error);
        setMessage({ type: 'error', text: 'Failed to add AI suggestion' });
      }
    }
  };

  const handleUseTitle = async () => {
    if (votingResults.length === 0) return;
    
    // Get the winning title (first in results, which are sorted by vote count)
    const winningTitle = votingResults[0].suggested_name;
    
    try {
      setIsLoading(true);
      await updateEmberTitle(ember.id, winningTitle, user.id);
      
      setMessage({ type: 'success', text: `Title updated to "${winningTitle}"!` });
      
      setTimeout(() => {
        setMessage(null);
        onClose(); // Close modal first
        
        // Then call the callback to update the parent component after modal is closed
        if (onEmberUpdate) {
          setTimeout(() => {
            onEmberUpdate();
          }, 100); // Small delay to ensure modal is fully closed
        }
      }, 1500);
      
    } catch (error) {
      console.error('Error updating ember title:', error);
      setMessage({ type: 'error', text: 'Failed to update ember title' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteSuggestedName = async (nameId, suggestedName) => {
    try {
      setIsLoading(true);
      await deleteSuggestedName(nameId);
      
      // Refetch suggested names to update the list
      const updatedSuggestedNames = await getEmberSuggestedNames(ember.id);
      setAllSuggestedNames(updatedSuggestedNames);
      
      // Show success message
      setMessage({ type: 'success', text: `"${suggestedName}" deleted!` });
      setTimeout(() => setMessage(null), 2000);
      
    } catch (error) {
      console.error('Error deleting suggested name:', error);
      setMessage({ type: 'error', text: 'Failed to delete title' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Aperture size={20} className="text-blue-500" />
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
          <DialogDescription>
            {viewMode === 'voting' 
              ? (hasVoted ? 'You have voted! Switch to results to see how others voted.' : 'Pick the best name for this memory!')
              : 'See how everyone voted on the ember title'
            }
          </DialogDescription>
        </DialogHeader>

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
             {allSuggestedNames.map((nameObj, index) => {
               const isOwner = ember?.user_id === user?.id;
               return (
                 <Card 
                   key={index}
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
             })}

            {/* Custom Name Input */}
            {!hasVoted && (
              isAddingCustom ? (
                <div className="space-y-2">
                  <Input
                    placeholder="Enter your custom title..."
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSelectCustom()}
                  />
                  <div className="flex gap-2">
                    <Button 
                      onClick={handleSelectCustom}
                      disabled={!customName.trim()}
                      size="sm"
                    >
                      Submit This Title
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => setIsAddingCustom(false)}
                      size="sm"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <Button
                    variant="outline"
                    onClick={handleAddCustom}
                    className="w-full flex items-center justify-center gap-2 py-3 border-dashed"
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
                          className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-2 py-1 h-6"
                        >
                          Add
                        </Button>
                      </CardContent>
                    </Card>
                  )}
                  
                  <Button
                    onClick={handleAiSuggestion}
                    disabled={isLoading}
                    className="w-full flex items-center justify-center gap-2 py-3 bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    <Sparkle size={16} />
                    {isLoading ? 'Ember is thinking...' : 'Let Ember Try'}
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
                  key={index}
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

        <div className="flex justify-between items-center pt-4">
          <div className="flex items-center gap-2">
            {/* Toggle View Mode Button */}
            {totalVotes > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={toggleViewMode}
              >
                {viewMode === 'voting' ? 'View Results' : 'Back'}
              </Button>
            )}
            
            {/* Change Vote Button - only show when user has voted and is in results view */}
            {hasVoted && viewMode === 'results' && (
              <Button
                variant="outline"
                size="sm"
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
                size="sm"
              >
                Use This Title
              </Button>
            )}
          </div>

          {/* Done Button */}
          <Button
            onClick={onClose}
            className="bg-blue-600 hover:bg-blue-700 text-white"
            size="sm"
          >
            Done
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
} 