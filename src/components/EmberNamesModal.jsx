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
import { Aperture, Plus, Check, BarChart, Users } from 'phosphor-react';
import { submitVote, getVotingResults, getUserVote } from '@/lib/voting';
import useStore from '@/store';

export default function EmberNamesModal({ isOpen, onClose, ember }) {
  const { user } = useStore();
  
  // Suggested names
  const suggestedNames = [
    'Sunset Memory',
    'Golden Hour',
    'Perfect Moment'
  ];

  const [selectedName, setSelectedName] = useState('');
  const [customName, setCustomName] = useState('');
  const [isAddingCustom, setIsAddingCustom] = useState(false);
  const [viewMode, setViewMode] = useState('voting'); // 'voting' or 'results'
  const [hasVoted, setHasVoted] = useState(false);
  const [userVote, setUserVote] = useState(null);
  const [votingResults, setVotingResults] = useState([]);
  const [totalVotes, setTotalVotes] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    if (isOpen && ember?.id) {
      loadVotingData();
    }
  }, [isOpen, ember?.id]);

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

    } catch (error) {
      console.error('Error loading voting data:', error);
      setMessage({ type: 'error', text: 'Failed to load voting data' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectSuggestion = (name) => {
    if (hasVoted) return; // Prevent selection if already voted
    setSelectedName(name);
    setCustomName('');
    setIsAddingCustom(false);
  };

  const handleSelectCustom = () => {
    if (customName.trim()) {
      setSelectedName(customName.trim());
      setIsAddingCustom(false);
    }
  };

  const handleAddCustom = () => {
    if (hasVoted) return; // Prevent adding custom if already voted
    setIsAddingCustom(true);
    setSelectedName('');
  };

  const handleSubmitVote = async () => {
    if (!selectedName || !user) return;

    try {
      setIsLoading(true);
      setMessage(null);

      const isCustom = !suggestedNames.includes(selectedName);
      await submitVote(ember.id, selectedName, isCustom);
      
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

        {/* Toggle View Mode Button */}
        {totalVotes > 0 && (
          <div className="flex justify-center">
            <Button
              variant="outline"
              size="sm"
              onClick={toggleViewMode}
              className="flex items-center gap-2"
            >
              {viewMode === 'voting' ? (
                <>
                  <BarChart size={16} />
                  View Results
                </>
              ) : (
                <>
                  <Users size={16} />
                  Back to Voting
                </>
              )}
            </Button>
          </div>
        )}

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
            {suggestedNames.map((name, index) => (
              <Card 
                key={index}
                className={`transition-all h-6 flex items-center ${
                  hasVoted 
                    ? 'opacity-60 cursor-not-allowed' 
                    : 'cursor-pointer hover:border-gray-300'
                } ${
                  selectedName === name 
                    ? 'border-blue-500 bg-blue-50' 
                    : ''
                }`}
                onClick={() => handleSelectSuggestion(name)}
              >
                <CardContent className="px-3 py-0.5 flex items-center justify-between w-full">
                  <span className="text-2xl font-bold">{name}</span>
                  {selectedName === name && (
                    <Check size={16} className="text-blue-500" />
                  )}
                </CardContent>
              </Card>
            ))}

            {/* Custom Name Input */}
            {isAddingCustom ? (
              <div className="space-y-2">
                <Input
                  placeholder="Enter your custom name..."
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSelectCustom()}
                  disabled={hasVoted}
                />
                <div className="flex gap-2">
                  <Button 
                    onClick={handleSelectCustom}
                    disabled={!customName.trim() || hasVoted}
                    size="sm"
                  >
                    Select This Name
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
              <Button
                variant="outline"
                onClick={handleAddCustom}
                className="w-full h-6 flex items-center justify-center gap-2"
                disabled={hasVoted}
              >
                <Plus size={16} />
                Add Your Own Name
              </Button>
            )}

            {hasVoted && userVote && (
              <div className="text-center text-sm text-gray-600 bg-gray-50 p-2 rounded">
                Your vote: <strong>{userVote.suggested_name}</strong>
              </div>
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
                            {result.percentage}% ({result.vote_count})
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

        <div className="flex justify-end gap-2 pt-4">
          <Button variant="outline" onClick={onClose}>
            {viewMode === 'results' ? 'Close' : 'Cancel'}
          </Button>
          {viewMode === 'voting' && !hasVoted && (
            <Button 
              onClick={handleSubmitVote}
              disabled={!selectedName || isLoading || !user}
            >
              {isLoading ? 'Submitting...' : 'Submit Vote'}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
} 