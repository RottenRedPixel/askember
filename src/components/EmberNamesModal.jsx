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
import { Aperture, Plus, Check, ChartBar, Users, Sparkle } from 'phosphor-react';
import { submitVote, getVotingResults, getUserVote, getParticipantVotingStatus, deleteVote } from '@/lib/voting';
import { getEmberWithSharing } from '@/lib/sharing';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import useStore from '@/store';

export default function EmberNamesModal({ isOpen, onClose, ember }) {
  const { user } = useStore();
  
  // Base suggested names
  const baseSuggestedNames = [
    'Sunset Memory',
    'Golden Hour',
    'Perfect Moment'
  ];

  const [selectedName, setSelectedName] = useState('');
  const [allSuggestedNames, setAllSuggestedNames] = useState(baseSuggestedNames);
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

      // Build dynamic suggested names list (base names + custom names that have been voted on)
      const customNamesFromVotes = results.results
        .filter(result => result.is_custom)
        .map(result => result.suggested_name);
      
      const uniqueCustomNames = [...new Set(customNamesFromVotes)];
      const updatedSuggestedNames = [...baseSuggestedNames, ...uniqueCustomNames];
      setAllSuggestedNames(updatedSuggestedNames);

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
      
      // Add shared users
      if (emberData.shares) {
        emberData.shares.forEach(share => {
          if (share.shared_user) {
            participants.push({
              id: share.shared_user.id,
              user_id: share.shared_user.user_id,
              email: share.shared_with_email,
              first_name: share.shared_user.first_name || '',
              last_name: share.shared_user.last_name || '',
              avatar_url: share.shared_user.avatar_url || null,
              role: share.permission_level
            });
          } else {
            // Fallback for shared users without profile
            participants.push({
              id: share.id,
              user_id: null, // No user_id available for users without profiles
              email: share.shared_with_email,
              first_name: '',
              last_name: '',
              avatar_url: null,
              role: share.permission_level
            });
          }
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
      
      // Add the custom name to the suggested names list
      if (!allSuggestedNames.includes(customNameValue)) {
        setAllSuggestedNames(prev => [...prev, customNameValue]);
      }
      
      // Reset the form
      setCustomName('');
      setIsAddingCustom(false);
      
      // Show success message
      setMessage({ type: 'success', text: 'Title added to options!' });
      setTimeout(() => setMessage(null), 2000);
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
      setMessage({ type: 'success', text: 'Vote submitted successfully!' });
      
      // Reload voting data to show updated results
      await loadVotingData();
      
      // Switch to results view
      setViewMode('results');
      
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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Aperture size={20} className="text-blue-500" />
            Ember Title {totalVotes > 0 && <span className="text-sm text-gray-500">({totalVotes} votes)</span>}
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
            // Show skeleton avatars while loading to prevent jumping
            <div className="flex gap-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-12 w-12 bg-gray-200 rounded-full border-4 border-gray-300 animate-pulse"></div>
              ))}
            </div>
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
             {allSuggestedNames.map((name, index) => {
               const isCustomName = !baseSuggestedNames.includes(name);
               return (
                 <Card 
                   key={index}
                   className={`transition-all cursor-pointer border ${
                     hasVoted 
                       ? 'opacity-60 cursor-not-allowed' 
                       : 'hover:border-gray-300'
                   } ${
                     selectedName === name 
                       ? 'border-blue-500 bg-blue-50' 
                       : 'border-gray-200'
                   }`}
                   onClick={() => handleSelectSuggestion(name)}
                 >
                   <CardContent className="px-3 py-1 flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                         <span className="text-base font-bold">{name}</span>
                       {isCustomName && (
                         <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">Custom</span>
                       )}
                     </div>
                     {selectedName === name && (
                       <Check size={16} className="text-blue-500" />
                     )}
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
                  <Button
                    variant="outline"
                    onClick={() => {/* TODO: Add AI suggestion handler */}}
                    className="w-full flex items-center justify-center gap-2 py-3"
                  >
                    <Sparkle size={16} />
                    Let Ember Try
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
                  className={`h-auto ${
                    userVote?.suggested_name === result.suggested_name 
                      ? 'border-blue-500 bg-blue-50' 
                      : ''
                  }`}
                >
                  <CardContent className="px-3 py-2">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-lg font-bold">{result.suggested_name}</span>
                          {result.is_custom && (
                            <span className="text-xs bg-gray-200 px-2 py-0.5 rounded">Custom</span>
                          )}
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
          {/* Toggle View Mode Button */}
          {totalVotes > 0 ? (
            <Button
              variant="outline"
              size="sm"
              onClick={toggleViewMode}
              className="flex items-center gap-2"
            >
              {viewMode === 'voting' ? (
                <>
                  <ChartBar size={16} />
                  View Results
                </>
              ) : (
                <>
                  <Users size={16} />
                  Back to Voting
                </>
              )}
            </Button>
          ) : (
            <div></div>
          )}
          
          {/* Change Vote Button - only show when user has voted and is in results view */}
          {hasVoted && viewMode === 'results' && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleChangeVote}
              disabled={isLoading}
              className="flex items-center gap-2 text-orange-600 border-orange-300 hover:bg-orange-50"
            >
              <Check size={16} />
              Change Vote
            </Button>
          )}

        </div>
      </DialogContent>
    </Dialog>
  );
} 