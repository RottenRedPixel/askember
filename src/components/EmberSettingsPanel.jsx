import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
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
import { X, Info, Chats, ShareNetwork, PencilSimple, Gear, ArrowClockwise } from 'phosphor-react';
import { 
  BarChart3,
  Vote,
  Trash2,
  AlertTriangle,
  FileText,
  Camera,
  MapPin,
  Eye,
  Users
} from 'lucide-react';
import { cn } from '@/lib/utils';
import EmberChat from '@/components/EmberChat';
import FeaturesCard from '@/components/FeaturesCard';
import { deleteEmber } from '@/lib/database';
import { getVotingResults } from '@/lib/voting';
import { supabase } from '@/lib/supabase';
import { getEmberWithSharing } from '@/lib/sharing';
import useStore from '@/store';

const tabs = [
  {
    id: "story-circle",
    label: "Circle",
    icon: Chats
  },
  {
    id: "wiki",
    label: "Wiki",
    icon: Info
  },
  {
    id: "sharing",
    label: "Sharing",
    icon: ShareNetwork
  },
  {
    id: "settings",
    label: "Settings",
    icon: Gear
  }
];

export default function EmberSettingsPanel({ 
  isOpen, 
  onClose, 
  ember, 
  isEditingTitle,
  setIsEditingTitle,
  newTitle,
  setNewTitle,
  handleTitleSave,
  handleTitleCancel,
  handleTitleEdit,
  message,
  onRefresh
}) {
  const navigate = useNavigate();
  const { user } = useStore();
  
  // Store active tab in localStorage to persist through refreshes
  const getStoredActiveTab = () => {
    if (ember?.id) {
      const stored = localStorage.getItem(`ember-settings-tab-${ember.id}`);
      return stored || "story-circle";
    }
    return "story-circle";
  };
  
  const [activeTab, setActiveTab] = useState(getStoredActiveTab);
  
  // Update stored tab when activeTab changes
  const handleSetActiveTab = (tab) => {
    setActiveTab(tab);
    if (ember?.id) {
      localStorage.setItem(`ember-settings-tab-${ember.id}`, tab);
    }
  };
  
  // Update activeTab when ember changes to get the stored tab for the new ember
  useEffect(() => {
    if (ember?.id) {
      const storedTab = getStoredActiveTab();
      setActiveTab(storedTab);
    }
  }, [ember?.id]);
  
  // Settings tab state
  const [votingResults, setVotingResults] = useState([]);
  const [totalVotes, setTotalVotes] = useState(0);
  const [showVotingResults, setShowVotingResults] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [settingsMessage, setSettingsMessage] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [sharedUsers, setSharedUsers] = useState([]); // Users with accounts
  const [emailOnlyInvites, setEmailOnlyInvites] = useState([]); // Email-only invites

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

  // Refresh function
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      // Refresh ember data from parent component
      if (onRefresh) {
        await onRefresh();
      }
      
      // Refresh tab-specific data
      switch (activeTab) {
        case 'settings':
          if (showVotingResults) {
            await loadVotingResults();
          }
          break;
        case 'story-circle':
          // Chat data will refresh automatically when ember data refreshes
          break;
        case 'wiki':
          // Wiki data will refresh automatically when ember data refreshes
          await fetchSharedUsers();
          break;
        case 'sharing':
          // Sharing data will refresh automatically when ember data refreshes
          break;
      }
      
      setSettingsMessage({ type: 'success', text: 'Data refreshed successfully' });
      setTimeout(() => setSettingsMessage(null), 2000);
    } catch (error) {
      console.error('Error refreshing data:', error);
      setSettingsMessage({ type: 'error', text: 'Failed to refresh data' });
      setTimeout(() => setSettingsMessage(null), 3000);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Fetch shared users for Contributors section
  const fetchSharedUsers = async () => {
    try {
      const sharingData = await getEmberWithSharing(ember.id);
      console.log('Sharing data for settings panel:', sharingData);
      
      if (sharingData.shares && sharingData.shares.length > 0) {
        // Separate users with accounts from email-only invites
        const usersWithAccounts = sharingData.shares
          .filter(share => share.shared_user && share.shared_user.user_id)
          .map(share => ({
            id: share.shared_user.id,
            user_id: share.shared_user.user_id,
            first_name: share.shared_user.first_name,
            last_name: share.shared_user.last_name,
            email: share.shared_with_email,
            permission_level: share.permission_level
          }));
          
        const emailOnlyInvites = sharingData.shares
          .filter(share => !share.shared_user || !share.shared_user.user_id)
          .map(share => ({
            email: share.shared_with_email,
            permission_level: share.permission_level
          }));
          
        setSharedUsers(usersWithAccounts);
        setEmailOnlyInvites(emailOnlyInvites);
        console.log('Users with accounts:', usersWithAccounts);
        console.log('Email-only invites:', emailOnlyInvites);
      } else {
        setSharedUsers([]);
        setEmailOnlyInvites([]);
      }
    } catch (error) {
      console.error('Error fetching shared users:', error);
      setSharedUsers([]);
      setEmailOnlyInvites([]);
    }
  };

  // Load shared users when component mounts or ember changes
  useEffect(() => {
    if (ember?.id) {
      fetchSharedUsers();
    }
  }, [ember?.id]);

  // Check if user is owner
  const isOwner = user && ember.user_id === user.id;

  const renderSectionContent = () => {
    switch (activeTab) {
      case 'wiki':
        return (
          <div className="h-full overflow-auto">
            <Card className="h-full border-0 shadow-none">
              <CardContent className="p-6 space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 text-left flex items-center gap-2">
                      Ember Wiki
                      <button
                        onClick={handleRefresh}
                        disabled={isRefreshing}
                        className="p-1 hover:bg-gray-100 rounded transition-colors disabled:opacity-50"
                        title="Refresh wiki data"
                      >
                        <ArrowClockwise 
                          size={16} 
                          className={`text-gray-400 ${isRefreshing ? 'animate-spin' : ''}`} 
                        />
                      </button>
                    </h2>
                    <p className="text-sm text-gray-600 mt-1">
                      Knowledge and information about this ember
                    </p>
                  </div>
                </div>
                
                {/* Content Sections */}
                <div className="space-y-4 text-left">
                  {/* Basic Info Section */}
                  <div className="space-y-3">
                    <h3 className="font-medium text-gray-900 text-left flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      Basic Information
                    </h3>
                    <div className="grid grid-cols-1 gap-y-4 gap-x-4 text-sm">
                      <div className="space-y-2 text-left">
                        <span className="text-gray-500 font-medium">Title</span>
                        {isEditingTitle ? (
                                                     <div className="flex items-center gap-2">
                             <Input
                               type="text"
                               value={newTitle}
                               onChange={(e) => setNewTitle(e.target.value)}
                               maxLength="45"
                               className="h-8"
                             />
                             <Button size="sm" variant="blue" onClick={handleTitleSave}>Save</Button>
                             <Button size="sm" variant="outline" onClick={handleTitleCancel}>Cancel</Button>
                           </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className="text-gray-900">{ember.title || 'N/A'}</span>
                                                         <button onClick={handleTitleEdit} className="text-gray-400 hover:text-blue-600">
                               <PencilSimple size={16} />
                             </button>
                          </div>
                        )}
                      </div>
                      <div className="space-y-2 text-left">
                        <span className="text-gray-500 font-medium">Owner</span>
                        <span className="block text-gray-900">Coming soon...</span>
                      </div>
                    </div>
                  </div>

                  {/* EXIF Data Section */}
                  <div className="space-y-3">
                    <h3 className="font-medium text-gray-900 text-left flex items-center gap-2">
                      <Camera className="w-4 h-4" />
                      EXIF Data
                    </h3>
                    <div className="text-sm text-gray-600 text-left">
                      Camera settings and metadata will appear here...
                    </div>
                  </div>

                  {/* Location Section */}
                  <div className="space-y-3">
                    <h3 className="font-medium text-gray-900 text-left flex items-center gap-2">
                      <MapPin className="w-4 h-4" />
                      Location
                    </h3>
                    <div className="text-sm text-gray-600 text-left">
                      Geolocation data will appear here...
                    </div>
                  </div>

                  {/* People & Analysis Section */}
                  <div className="space-y-3">
                    <h3 className="font-medium text-gray-900 text-left flex items-center gap-2">
                      <Eye className="w-4 h-4" />
                      Analysis & People
                    </h3>
                    <div className="text-sm text-gray-600 text-left">
                      Deep image analysis and people tagging will appear here...
                    </div>
                  </div>

                  {/* Contributors Section */}
                  <div className="space-y-3">
                    <h3 className="font-medium text-gray-900 text-left flex items-center gap-2">
                      <Users className="w-4 h-4" />
                      Contributors
                    </h3>
                    <div className="space-y-4">
                      
                      {/* Owner Section */}
                      <div className="space-y-2">
                        <h4 className="text-sm font-medium text-gray-700">Owner</h4>
                        {ember?.owner ? (
                          <div className="flex items-center gap-2">
                            <span className="text-gray-900">
                              {`${ember.owner.first_name || ''} ${ember.owner.last_name || ''}`.trim() || 'Owner'}
                            </span>
                            <span className="px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded-full">Owner</span>
                          </div>
                        ) : (
                          <div className="text-sm text-gray-500">
                            Owner information not available
                          </div>
                        )}
                      </div>

                      {/* Invited (Accounts Created) Section */}
                      <div className="space-y-2">
                        <h4 className="text-sm font-medium text-gray-700">Invited (Accounts Created)</h4>
                        {sharedUsers.length > 0 ? (
                          <div className="space-y-1">
                            {sharedUsers.map((contributor, index) => (
                              <div key={contributor.id || index} className="flex items-center gap-2">
                                <span className="text-gray-900">
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
                            ))}
                          </div>
                        ) : (
                          <div className="text-sm text-gray-500">
                            No users with accounts have been invited yet
                          </div>
                        )}
                      </div>

                      {/* Invited (Accounts Not Created Yet) Section */}
                      <div className="space-y-2">
                        <h4 className="text-sm font-medium text-gray-700">Invited (Accounts Not Created Yet)</h4>
                        {emailOnlyInvites.length > 0 ? (
                          <div className="space-y-1">
                            {emailOnlyInvites.map((invite, index) => (
                              <div key={index} className="flex items-center gap-2">
                                <span className="text-gray-900">{invite.email}</span>
                                <span className={`px-2 py-1 text-xs rounded-full ${
                                  invite.permission_level === 'contributor' 
                                    ? 'bg-blue-100 text-blue-800' 
                                    : 'bg-gray-100 text-gray-800'
                                }`}>
                                  {invite.permission_level === 'contributor' ? 'Contributor' : 'Viewer'}
                                </span>
                              </div>
                            ))}
                          </div>
                        ) : null}
                      </div>
                      
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        );

      case 'story-circle':
        return (
          <div className="h-full overflow-hidden">
            <Card className="h-full border-0 shadow-none">
              <CardContent className="p-6 h-full flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 text-left flex items-center gap-2">
                      Story Circle
                      <button
                        onClick={handleRefresh}
                        disabled={isRefreshing}
                        className="p-1 hover:bg-gray-100 rounded transition-colors disabled:opacity-50"
                        title="Refresh story circle data"
                      >
                        <ArrowClockwise 
                          size={16} 
                          className={`text-gray-400 ${isRefreshing ? 'animate-spin' : ''}`} 
                        />
                      </button>
                    </h2>
                    <p className="text-sm text-gray-600 mt-1">
                      Discuss and explore the story behind this ember
                    </p>
                  </div>
                </div>
                {/* Chat Content */}
                <div className="flex-1 min-h-0">
                  <EmberChat emberId={ember.id} />
                </div>
              </CardContent>
            </Card>
          </div>
        );

      case 'sharing':
        return (
          <div className="h-full overflow-auto">
            <FeaturesCard 
              ember={ember} 
              onRefresh={handleRefresh}
              isRefreshing={isRefreshing}
            />
          </div>
        );

      case 'settings':
        return (
          <div className="h-full overflow-auto">
            <Card className="h-full border-0 shadow-none">
              <CardContent className="p-6 space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 text-left flex items-center gap-2">
                      Ember Settings
                      <button
                        onClick={handleRefresh}
                        disabled={isRefreshing}
                        className="p-1 hover:bg-gray-100 rounded transition-colors disabled:opacity-50"
                        title="Refresh settings data"
                      >
                        <ArrowClockwise 
                          size={16} 
                          className={`text-gray-400 ${isRefreshing ? 'animate-spin' : ''}`} 
                        />
                      </button>
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
          </div>
        );

      default:
        return (
          <div className="flex items-center justify-center h-full text-gray-500">
            <div className="text-center">
              <Info size={48} className="mx-auto mb-4 text-gray-300" />
              <p className="text-lg font-medium">Select a section</p>
              <p className="text-sm">Choose from the dropdown above to view ember details</p>
            </div>
          </div>
        );
    }
  };

  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity"
          onClick={onClose}
        />
      )}
      
      {/* Side Panel */}
      <div className={cn(
        "fixed top-0 right-0 h-full w-full md:w-[600px] bg-white shadow-xl z-50 transform transition-transform duration-300 ease-in-out",
        isOpen ? "translate-x-0" : "translate-x-full"
      )}>
                {/* Panel Header */}
        <div className="border-b border-gray-200">
          {/* Header with title and close button */}
          <div className="flex items-center justify-between p-4 pb-2">
            <h2 className="text-lg font-semibold text-gray-900">Ember Settings</h2>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X size={20} />
            </Button>
          </div>
          
          {/* Tab Navigation */}
          <div className="flex border-b border-gray-100">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => handleSetActiveTab(tab.id)}
                className={cn(
                  "flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors",
                  activeTab === tab.id
                    ? "border-blue-600 text-blue-600 bg-blue-50"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                )}
              >
                <tab.icon size={16} />
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Success/Error Messages */}
        {message && (
          <div className={cn(
            "mx-4 mt-4 p-3 rounded-md text-sm",
            message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
          )}>
            {message.text}
          </div>
        )}
        
        {settingsMessage && (
          <div className={cn(
            "mx-4 mt-4 p-3 rounded-md text-sm",
            settingsMessage.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
          )}>
            {settingsMessage.text}
          </div>
        )}

        {/* Panel Content */}
        <div className="h-[calc(100vh-80px)] overflow-hidden">
          {renderSectionContent()}
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteConfirm} onOpenChange={resetDeleteConfirm}>
        <DialogContent className="max-w-md bg-white">
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