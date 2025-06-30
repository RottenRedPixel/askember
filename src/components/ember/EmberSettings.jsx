import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ArrowClockwise } from 'phosphor-react';
import { 
  BarChart3,
  Vote,
  Trash2,
  AlertTriangle
} from 'lucide-react';
import { deleteEmber } from '@/lib/database';
import { getVotingResults } from '@/lib/voting';
import { supabase } from '@/lib/supabase';
import useStore from '@/store';

export default function EmberSettings({ 
  ember, 
  onRefresh, 
  isRefreshing,
  onClose 
}) {
  const navigate = useNavigate();
  const { user } = useStore();
  
  // Settings tab state
  const [votingResults, setVotingResults] = useState([]);
  const [totalVotes, setTotalVotes] = useState(0);
  const [showVotingResults, setShowVotingResults] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [settingsMessage, setSettingsMessage] = useState(null);

  // Check if current user is owner
  const isOwner = user && ember?.user_id === user.id;

  // Voting management functions
  const loadVotingResults = async () => {
    try {
      const results = await getVotingResults(ember.id);
      setVotingResults(results.results);
      setTotalVotes(results.totalVotes);
    } catch (error) {
      console.error('Error loading voting results:', error);
      setSettingsMessage({ type: 'error', text: 'Failed to load voting results' });
    }
  };

  const handleResetVoting = async () => {
    if (!window.confirm('Are you sure you want to reset all votes? This action cannot be undone.')) {
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('ember_name_votes')
        .delete()
        .eq('ember_id', ember.id);

      if (error) throw error;

      setSettingsMessage({ type: 'success', text: 'All votes have been reset' });
      setVotingResults([]);
      setTotalVotes(0);
      setShowVotingResults(false);
    } catch (error) {
      console.error('Error resetting votes:', error);
      setSettingsMessage({ type: 'error', text: 'Failed to reset votes' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewVotingResults = async () => {
    if (!showVotingResults) {
      await loadVotingResults();
    }
    setShowVotingResults(!showVotingResults);
  };

  // Delete ember functions
  const handleDeleteEmber = async () => {
    setIsDeleting(true);
    try {
      await deleteEmber(ember.id, user.id);
      setSettingsMessage({ type: 'success', text: 'Ember deleted successfully. Redirecting...' });
      
      // Close the dialog and redirect after a short delay
      setTimeout(() => {
        setShowDeleteConfirm(false);
        onClose(); // Close the settings panel
        navigate('/embers');
      }, 2000);
    } catch (error) {
      setSettingsMessage({ type: 'error', text: 'Failed to delete ember' });
      setTimeout(() => setSettingsMessage(null), 3000);
    } finally {
      setIsDeleting(false);
    }
  };

  const resetDeleteConfirm = () => {
    setShowDeleteConfirm(false);
    setIsDeleting(false);
  };

  // Clear messages after timeout
  useEffect(() => {
    if (settingsMessage) {
      const timer = setTimeout(() => setSettingsMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [settingsMessage]);

  return (
    <>
      <Card className="h-full rounded-none">
        <CardContent className="px-6 pb-6 space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-900 text-left flex items-center gap-2">
                Ember Settings
                {onRefresh && (
                  <button
                    onClick={onRefresh}
                    disabled={isRefreshing}
                    className="p-1 hover:bg-gray-100 rounded transition-colors disabled:opacity-50"
                    title="Refresh settings data"
                  >
                    <ArrowClockwise 
                      size={16} 
                      className={`text-gray-400 ${isRefreshing ? 'animate-spin' : ''}`} 
                    />
                  </button>
                )}
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                Manage voting, advanced settings, and ember deletion
              </p>
            </div>
          </div>

          {/* Settings Message */}
          {settingsMessage && (
            <Alert className={settingsMessage.type === 'error' ? 'border-red-200 bg-red-50' : 'border-green-200 bg-green-50'}>
              <AlertDescription>{settingsMessage.text}</AlertDescription>
            </Alert>
          )}

          {/* Voting Management - Only for owners */}
          {isOwner && (
            <div className="space-y-3">
              <h4 className="font-medium flex items-center gap-2">
                <Vote className="w-4 h-4" />
                Voting Management
              </h4>
              <div className="space-y-2">
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-blue-500" />
                    <span className="text-sm">
                      Total Votes: {totalVotes}
                    </span>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleViewVotingResults}
                    disabled={isLoading}
                  >
                    {showVotingResults ? 'Hide Results' : 'View Results'}
                  </Button>
                </div>
                
                {showVotingResults && votingResults.length > 0 && (
                  <div className="p-3 border rounded-lg bg-gray-50">
                    <div className="space-y-2">
                      {votingResults.map((result, index) => (
                        <div key={index} className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{result.suggested_name}</span>
                            {result.is_custom && (
                              <Badge variant="secondary" className="text-xs">Custom</Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-16 bg-gray-200 rounded-full h-2">
                              <div 
                                className="bg-blue-500 h-2 rounded-full transition-all"
                                style={{ width: `${result.percentage}%` }}
                              />
                            </div>
                            <span className="text-xs text-gray-600">
                              {result.percentage}% ({result.vote_count})
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {totalVotes > 0 && (
                  <div className="p-3 border border-orange-200 rounded-lg bg-orange-50">
                    <p className="text-sm text-orange-700 mb-2">
                      Reset all votes for this ember. This will permanently delete all voting data.
                    </p>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={handleResetVoting}
                      disabled={isLoading}
                      className="border-orange-300 text-orange-700 hover:bg-orange-100"
                    >
                      <Trash2 className="w-4 h-4 mr-1" />
                      Reset All Votes
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Privacy Settings */}
          <div className="space-y-3">
            <h3 className="font-medium text-gray-900 text-left">Privacy & Visibility</h3>
            <div className="text-sm text-gray-600 text-left">
              Privacy controls and visibility settings will appear here...
            </div>
          </div>

          {/* Notification Settings */}
          <div className="space-y-3">
            <h3 className="font-medium text-gray-900 text-left">Notifications</h3>
            <div className="text-sm text-gray-600 text-left">
              Notification preferences will appear here...
            </div>
          </div>

          {/* Danger Zone - Only for owners */}
          {isOwner && (
            <>
              <Separator />
              <div className="space-y-3">
                <h4 className="font-medium text-red-600 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  Danger Zone
                </h4>
                <div className="p-3 border border-red-200 rounded-lg bg-red-50">
                  <p className="text-sm text-red-700 mb-3">
                    Delete this ember permanently. This action cannot be undone and will remove all associated data including shares and chat messages.
                  </p>
                  <Button 
                    variant="destructive" 
                    size="sm" 
                    onClick={() => setShowDeleteConfirm(true)}
                    disabled={isLoading}
                  >
                    <Trash2 className="w-4 h-4 mr-1" />
                    Delete Ember
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteConfirm} onOpenChange={resetDeleteConfirm}>
        <DialogContent className="max-w-md bg-white focus:outline-none">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="w-5 h-5" />
              Delete Ember
            </DialogTitle>
            <DialogDescription className="text-gray-600">
              This action cannot be undone. This will permanently delete the ember and all associated data.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="p-3 border border-yellow-200 rounded-lg bg-yellow-50">
              <p className="text-sm text-yellow-800">
                <strong>Warning:</strong> This will also delete:
              </p>
              <ul className="text-sm text-yellow-700 mt-1 ml-4 list-disc">
                <li>All sharing permissions</li>
                <li>All chat messages and conversations</li>
                <li>The ember image and metadata</li>
              </ul>
            </div>

            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={resetDeleteConfirm}
                disabled={isDeleting}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleDeleteEmber}
                disabled={isDeleting}
              >
                {isDeleting ? 'Deleting...' : 'Delete Ember'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
} 