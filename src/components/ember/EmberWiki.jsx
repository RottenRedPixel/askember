import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
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
  FileText,
  MapPin,
  Eye,
  Users,
  Clock,
  BookOpen,
  Image,
  Music,
  File,
  ExternalLink,
  Trash2,
  AlertTriangle,
  Sparkles,
  Edit2,
  Check,
  X
} from 'lucide-react';
import { PenNib, UsersThree, UserCirclePlus, ImageSquare } from 'phosphor-react';
import { getEmberWithSharing } from '@/lib/sharing';
import { getImageAnalysis, getAllStoryMessagesForEmber, deleteEmber, getEmberTaggedPeople, getEmberSupportingMedia, updateSupportingMediaDisplayName } from '@/lib/database';
import { getEmberPhotos, updatePhotoDisplayName } from '@/lib/photos';
import useStore from '@/store';

export default function EmberWiki({ 
  ember, 
  onRefresh, 
  isRefreshing,
  onClose
}) {
  const navigate = useNavigate();
  const { user } = useStore();
  
  const [sharedUsers, setSharedUsers] = useState([]); // Users with accounts
  const [emailOnlyInvites, setEmailOnlyInvites] = useState([]); // Email-only invites
  const [imageAnalysis, setImageAnalysis] = useState(null);
  const [storyMessages, setStoryMessages] = useState([]);
  const [taggedPeople, setTaggedPeople] = useState([]);
  const [supportingMedia, setSupportingMedia] = useState([]);
  const [emberPhotos, setEmberPhotos] = useState([]);
  
  // Delete ember state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Media editing state
  const [editingMediaId, setEditingMediaId] = useState(null);
  const [editingMediaName, setEditingMediaName] = useState('');
  
  // Photo editing state
  const [editingPhotoId, setEditingPhotoId] = useState(null);
  const [editingPhotoName, setEditingPhotoName] = useState('');

  // Check if current user is owner
  const isOwner = user && ember?.user_id === user.id;

  useEffect(() => {
    if (ember?.id) {
      fetchSharedUsers();
      fetchImageAnalysis();
      fetchStoryMessages();
      fetchTaggedPeople();
      fetchSupportingMedia();
      fetchEmberPhotos();
    }
  }, [ember?.id]);

  // Helper function to determine section completion status
  const getSectionStatus = (sectionType) => {
    switch (sectionType) {
      case 'title':
        return ember?.title && ember.title.trim() !== '' && ember.title !== 'Untitled Ember';
      case 'location':
        return !!(ember?.latitude && ember?.longitude) || !!ember?.manual_location;
      case 'time-date':
        return !!ember?.ember_timestamp || !!ember?.manual_datetime;
      case 'story':
        return storyMessages && storyMessages.length > 0;
      case 'analysis':
        return !!(imageAnalysis && imageAnalysis.analysis_text);
      case 'people':
        return taggedPeople.length > 0;
      case 'supporting-media':
        return supportingMedia.length > 0;
      case 'photos':
        return emberPhotos.length > 1; // More than just the main ember image
      case 'contributors':
        return sharedUsers.length > 0 || emailOnlyInvites.length > 0;
      default:
        return false;
    }
  };

  // Badge component
  const StatusBadge = ({ isComplete }) => (
    <span className={`px-2 py-1 text-xs rounded-full ${
      isComplete 
        ? 'bg-green-100 text-green-800' 
        : 'bg-gray-100 text-gray-600'
    }`}>
      {isComplete ? 'Complete' : 'Not Complete'}
    </span>
  );

  const fetchSharedUsers = async () => {
    try {
      const sharingData = await getEmberWithSharing(ember.id);
      console.log('Wiki sharing data:', sharingData);
      
      if (sharingData.shares && sharingData.shares.length > 0) {
        // Separate users with accounts from email-only invites
        const usersWithAccounts = [];
        const emailOnly = [];
        
        sharingData.shares.forEach(share => {
          if (share.shared_user && share.shared_user.user_id) {
            // User has created an account
            usersWithAccounts.push({
              id: share.shared_user.id,
              user_id: share.shared_user.user_id,
              first_name: share.shared_user.first_name,
              last_name: share.shared_user.last_name,
              avatar_url: share.shared_user.avatar_url,
              email: share.shared_with_email,
              permission_level: share.permission_level
            });
          } else {
            // Email-only invite (no account yet)
            emailOnly.push({
              email: share.shared_with_email,
              permission_level: share.permission_level
            });
          }
        });
        
        setSharedUsers(usersWithAccounts);
        setEmailOnlyInvites(emailOnly);
        console.log('Users with accounts:', usersWithAccounts);
        console.log('Email-only invites:', emailOnly);
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

  const fetchImageAnalysis = async () => {
    try {
      const analysis = await getImageAnalysis(ember.id);
      console.log('Wiki image analysis data:', analysis);
      setImageAnalysis(analysis);
    } catch (error) {
      console.error('Error fetching image analysis:', error);
      setImageAnalysis(null);
    }
  };

  const fetchStoryMessages = async () => {
    try {
      const result = await getAllStoryMessagesForEmber(ember.id);
      console.log('Wiki story messages result:', result);
      console.log('Wiki story messages data:', result.messages);
      setStoryMessages(result.messages || []);
    } catch (error) {
      console.error('Error fetching story messages:', error);
      setStoryMessages([]);
    }
  };

  const fetchTaggedPeople = async () => {
    try {
      const people = await getEmberTaggedPeople(ember.id);
      console.log('Wiki tagged people data:', people);
      setTaggedPeople(people || []);
    } catch (error) {
      console.error('Error fetching tagged people:', error);
      setTaggedPeople([]);
    }
  };

  const fetchSupportingMedia = async () => {
    try {
      const media = await getEmberSupportingMedia(ember.id);
      console.log('Wiki supporting media data:', media);
      setSupportingMedia(media || []);
    } catch (error) {
      console.error('Error fetching supporting media:', error);
      setSupportingMedia([]);
    }
  };

  const fetchEmberPhotos = async () => {
    try {
      const photos = await getEmberPhotos(ember.id);
      console.log('Wiki ember photos data:', photos);
      setEmberPhotos(photos || []);
    } catch (error) {
      console.error('Error fetching ember photos:', error);
      setEmberPhotos([]);
    }
  };

  // Delete ember functions
  const handleDeleteEmber = async () => {
    setIsDeleting(true);
    try {
      await deleteEmber(ember.id, user.id);
      
      // Close the dialog and redirect after a short delay
      setTimeout(() => {
        setShowDeleteConfirm(false);
        if (onClose) onClose(); // Close the settings panel
        navigate('/embers');
      }, 1000);
    } catch (error) {
      console.error('Failed to delete ember:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  const resetDeleteConfirm = () => {
    setShowDeleteConfirm(false);
    setIsDeleting(false);
  };

  // Media name editing functions
  const handleStartEditMediaName = (media) => {
    setEditingMediaId(media.id);
    setEditingMediaName(media.display_name || media.file_name || '');
  };

  const handleSaveMediaName = async (mediaId) => {
    if (!editingMediaName.trim()) return;
    
    try {
      await updateSupportingMediaDisplayName(mediaId, editingMediaName.trim());
      
      // Update local state
      setSupportingMedia(prev => prev.map(media => 
        media.id === mediaId ? { ...media, display_name: editingMediaName.trim() } : media
      ));
      
      setEditingMediaId(null);
      setEditingMediaName('');
    } catch (error) {
      console.error('Failed to update media display name:', error);
    }
  };

  const handleCancelEditMediaName = () => {
    setEditingMediaId(null);
    setEditingMediaName('');
  };

  // Photo name editing functions
  const handleStartEditPhotoName = (photo) => {
    setEditingPhotoId(photo.id);
    setEditingPhotoName(photo.display_name || photo.original_filename || '');
  };

  const handleSavePhotoName = async (photoId) => {
    if (!editingPhotoName.trim()) return;
    
    try {
      await updatePhotoDisplayName(photoId, editingPhotoName.trim());
      
      // Update local state
      setEmberPhotos(prev => prev.map(photo => 
        photo.id === photoId ? { ...photo, display_name: editingPhotoName.trim() } : photo
      ));
      
      setEditingPhotoId(null);
      setEditingPhotoName('');
    } catch (error) {
      console.error('Failed to update photo display name:', error);
    }
  };

  const handleCancelEditPhotoName = () => {
    setEditingPhotoId(null);
    setEditingPhotoName('');
  };

  return (
    <>
      <Card className="min-h-full rounded-none">
        <CardContent className="px-6 pb-6 space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-900 text-left flex items-center gap-2">
                Ember Wiki
                {onRefresh && (
                  <button
                    onClick={onRefresh}
                    disabled={isRefreshing}
                    className="p-1 hover:bg-gray-100 rounded transition-colors disabled:opacity-50"
                    title="Refresh wiki data"
                  >
                    <ArrowClockwise 
                      size={16} 
                      className={`text-gray-400 ${isRefreshing ? 'animate-spin' : ''}`} 
                    />
                  </button>
                )}
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                Knowledge and information about this ember
              </p>
            </div>
          </div>
        
        {/* Content Sections */}
        <div className="space-y-4 text-left">
          {/* Title Section */}
          <div className="space-y-3">
            <h3 className="font-medium text-lg text-gray-900 text-left flex items-center justify-between">
              <div className="flex items-center gap-2">
                <PenNib className="w-4 h-4 text-blue-600" />
                Title
              </div>
              <StatusBadge isComplete={getSectionStatus('title')} />
            </h3>
            <div className="text-sm text-gray-600 text-left space-y-3">
              {ember.title && ember.title !== 'Untitled Ember' ? (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <PenNib size={16} className="text-gray-600" />
                    <span className="text-sm font-medium text-gray-900">Ember Title</span>
                  </div>
                  <div className="text-gray-900 font-medium">
                    {ember.title}
                  </div>
                  <div className="text-xs text-gray-500 mt-2">
                    Source: {ember.title_source === 'ai' ? 'AI generated' : 'Manual entry'}
                  </div>
                </div>
              ) : (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <PenNib size={16} className="text-gray-600" />
                    <span className="text-sm font-medium text-gray-900">No Title Set</span>
                  </div>
                  <div className="text-gray-500 font-medium">
                    No title has been set for this ember
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Contributors Section */}
          <div className="space-y-3">
            <h3 className="font-medium text-lg text-gray-900 text-left flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UserCirclePlus className="w-4 h-4 text-blue-600" />
                Contributors
              </div>
              <StatusBadge isComplete={getSectionStatus('contributors')} />
            </h3>
            <div className="space-y-4">
              
              {/* Owner Section */}
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 space-y-2">
                <h4 className="text-sm font-medium text-amber-900">Owner</h4>
                {ember?.owner ? (
                  <div className="flex items-center gap-2">
                    <span className="text-amber-900">
                      {`${ember.owner.first_name || ''} ${ember.owner.last_name || ''}`.trim() || 'Owner'}
                    </span>
                    <span className="px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded-full">Owner</span>
                  </div>
                ) : (
                  <div className="text-sm text-amber-700">
                    Owner information not available
                  </div>
                )}
              </div>

              {/* Invited (Accounts Created) Section */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-2">
                <h4 className="text-sm font-medium text-blue-900">Invited (Accounts Created)</h4>
                {sharedUsers.length > 0 ? (
                  <div className="space-y-1">
                    {sharedUsers.map((contributor, index) => (
                      <div key={contributor.id || index} className="flex items-center gap-2">
                        <span className="text-blue-900">
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
                  <div className="text-sm text-blue-700">
                    No users with accounts have been invited yet
                  </div>
                )}
              </div>

              {/* Invited (Accounts Not Created Yet) Section */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-2">
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
                ) : (
                  <div className="text-sm text-gray-500">
                    No pending email invitations
                  </div>
                )}
              </div>
              
            </div>
          </div>



          {/* The Story Section */}
          <div className="space-y-3">
            <h3 className="font-medium text-lg text-gray-900 text-left flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-blue-600" />
                Story Circle
              </div>
              <StatusBadge isComplete={getSectionStatus('story')} />
            </h3>
            <div className="text-sm text-gray-600 text-left space-y-3">
              {storyMessages && storyMessages.length > 0 ? (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-3">
                    <BookOpen size={16} className="text-gray-600" />
                    <span className="text-sm font-medium text-gray-900">Story Conversation</span>
                  </div>
                  <div className="space-y-3">
                    {storyMessages.map((message, index) => (
                      <div key={message.id || index} className="space-y-2">
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1">
                                                         {message.sender === 'ember' ? (
                               <div className="w-2 h-2 bg-gray-400 rounded-full" />
                             ) : (
                               <div className="w-2 h-2 bg-gray-400 rounded-full" />
                             )}
                             <span className="text-xs font-medium text-gray-700">
                               {message.sender === 'ember' ? 'Ember AI' : (
                                 message.user_first_name && message.user_last_name 
                                   ? `${message.user_first_name} ${message.user_last_name}`
                                   : 'User'
                               )}
                             </span>
                          </div>
                          <span className="text-xs text-gray-500">
                            {new Date(message.created_at).toLocaleString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                              hour12: true
                            })}
                          </span>
                        </div>
                                                 <div className={`p-3 rounded-lg text-sm ${
                           message.sender === 'ember' 
                             ? 'bg-purple-50 text-purple-900 border border-purple-200' 
                             : message.user_id === user?.id
                               ? 'bg-green-50 text-green-900 border border-green-200'
                               : 'bg-blue-50 text-blue-900 border border-blue-200'
                         }`}>
                          <div className="whitespace-pre-wrap">
                            {message.content}
                          </div>
                          {/* Message type indicators */}
                          {message.sender === 'ember' ? (
                            <div className="flex items-center gap-2 mt-2">
                              <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                              <span className="text-xs opacity-70">AI Generated</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 mt-2">
                              <div className={`w-2 h-2 rounded-full ${
                                message.has_audio 
                                  ? 'bg-green-500 animate-pulse' 
                                  : message.user_id === user?.id
                                    ? 'bg-green-500'
                                    : 'bg-blue-500'
                              }`}></div>
                              <span className="text-xs opacity-70">
                                {message.has_audio ? 'Audio message' : 'Text response'}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="text-xs text-gray-500 mt-3 pt-2 border-t border-gray-200">
                    <div className="flex items-center justify-between">
                      <span>
                        {storyMessages.length} message{storyMessages.length !== 1 ? 's' : ''} • Source: Story Modal conversations
                      </span>
                      <span>
                        Last updated: {new Date(Math.max(...storyMessages.map(m => new Date(m.created_at)))).toLocaleString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <BookOpen size={16} className="text-gray-600" />
                    <span className="text-sm font-medium text-gray-900">No Story Content</span>
                  </div>
                  <div className="text-gray-500">
                    No story conversations have been created for this ember yet. Use the "Story" modal to build a rich narrative through AI conversations.
                  </div>
                </div>
              )}
            </div>
          </div>



          {/* Tagged People Section */}
          <div className="space-y-3">
            <h3 className="font-medium text-lg text-gray-900 text-left flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UsersThree className="w-4 h-4 text-blue-600" />
                Tagged People
              </div>
              <StatusBadge isComplete={getSectionStatus('people')} />
            </h3>
            <div className="text-sm text-gray-600 text-left space-y-3">
              {taggedPeople.length > 0 ? (
                taggedPeople.map((person, index) => (
                  <div key={person.id || index} className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <UsersThree size={16} className="text-blue-600" />
                      <span className="text-sm font-medium text-blue-900">{person.person_name}</span>
                      {person.contributor_info && (
                        <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full">
                          Contributor
                        </span>
                      )}
                    </div>
                    <div className="text-gray-900">
                      {person.contributor_info 
                        ? `Tagged and connected to contributor ${person.contributor_email}` 
                        : 'Tagged person identified in this image using AI face detection'}
                    </div>
                    <div className="text-xs text-gray-500 mt-2">
                      Face coordinates: {person.face_coordinates?.x?.toFixed(0)}, {person.face_coordinates?.y?.toFixed(0)}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-gray-500">
                  No people have been tagged in this image yet. Use the "Tagged People" feature to identify faces.
                </div>
              )}
            </div>
          </div>

          {/* Photos Section */}
          <div className="space-y-3">
            <h3 className="font-medium text-lg text-gray-900 text-left flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Image className="w-4 h-4 text-blue-600" />
                Photos
              </div>
              <StatusBadge isComplete={getSectionStatus('photos')} />
            </h3>
            <div className="text-sm text-gray-600 text-left space-y-3">
              {emberPhotos.length > 0 ? (
                emberPhotos.map((photo, index) => {
                  const isEditing = editingPhotoId === photo.id;
                  const displayName = photo.display_name || photo.original_filename || 'Untitled';

                  return (
                    <div key={photo.id || index} className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <Image size={16} className="text-orange-600" />
                        {isEditing ? (
                          <div className="flex items-center gap-2 flex-1">
                            <Input
                              value={editingPhotoName}
                              onChange={(e) => setEditingPhotoName(e.target.value)}
                              placeholder="Enter display name"
                              className="text-sm flex-1"
                              autoFocus
                            />
                            <Button
                              onClick={() => handleSavePhotoName(photo.id)}
                              size="sm"
                              className="bg-green-600 hover:bg-green-700 h-8 w-8 p-0"
                            >
                              <Check size={14} />
                            </Button>
                            <Button
                              onClick={handleCancelEditPhotoName}
                              size="sm"
                              variant="outline"
                              className="h-8 w-8 p-0"
                            >
                              <X size={14} />
                            </Button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 flex-1">
                            <span className="text-sm font-medium text-orange-900 flex-1">{displayName}</span>
                            {isOwner && (
                              <button
                                onClick={() => handleStartEditPhotoName(photo)}
                                className="text-gray-400 hover:text-blue-600 transition-colors"
                                title="Edit display name"
                              >
                                <Edit2 size={14} />
                              </button>
                            )}
                          </div>
                        )}
                        {!isEditing && (
                          <a 
                            href={photo.storage_url} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="text-gray-600 hover:text-gray-800 flex-shrink-0"
                            title="Open photo"
                          >
                            <ExternalLink size={14} />
                          </a>
                        )}
                      </div>
                      {/* Show original filename if display name is different */}
                      {photo.display_name && photo.display_name !== photo.original_filename && !isEditing && (
                        <div className="text-xs text-gray-500 mb-2">
                          Original: {photo.original_filename}
                        </div>
                      )}
                      {!isEditing && (
                        <div className="text-xs text-gray-400 mb-2">
                          Script reference: name="{displayName}"
                        </div>
                      )}
                      <div className="text-gray-900 space-y-1">
                        <div className="flex items-center gap-4 text-xs text-gray-600">
                          <span>Photo</span>
                          {photo.file_size && (
                            <span>{(photo.file_size / 1024 / 1024).toFixed(2)} MB</span>
                          )}
                          {photo.image_width && photo.image_height && (
                            <span>{photo.image_width} × {photo.image_height}</span>
                          )}
                        </div>
                        {photo.camera_make && photo.camera_model && (
                          <div className="text-xs text-gray-600">
                            Camera: {photo.camera_make} {photo.camera_model}
                          </div>
                        )}
                        {photo.timestamp && (
                          <div className="text-xs text-gray-500">
                            Taken: {new Date(photo.timestamp).toLocaleString('en-US', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                              hour12: true
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-gray-500">
                  No additional photos have been uploaded for this ember yet.
                </div>
              )}
            </div>
          </div>

          {/* Supporting Media Section */}
          <div className="space-y-3">
            <h3 className="font-medium text-lg text-gray-900 text-left flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ImageSquare className="w-4 h-4 text-blue-600" />
                Supporting Media
              </div>
              <StatusBadge isComplete={getSectionStatus('supporting-media')} />
            </h3>
            <div className="text-sm text-gray-600 text-left space-y-3">
              {supportingMedia.length > 0 ? (
                supportingMedia.map((media, index) => {
                  const getFileIcon = (category) => {
                    if (category === 'image') return Image;
                    if (category === 'audio') return Music;
                    return File;
                  };
                  
                  const IconComponent = getFileIcon(media.file_category);
                  
                  const formatFileSize = (bytes) => {
                    if (bytes === 0) return '0 Bytes';
                    const k = 1024;
                    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
                    const i = Math.floor(Math.log(bytes) / Math.log(k));
                    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
                  };

                  const isEditing = editingMediaId === media.id;
                  const displayName = media.display_name || media.file_name || 'Untitled';

                  return (
                    <div key={media.id || index} className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <IconComponent size={16} className="text-gray-600" />
                        {isEditing ? (
                          <div className="flex items-center gap-2 flex-1">
                            <Input
                              value={editingMediaName}
                              onChange={(e) => setEditingMediaName(e.target.value)}
                              placeholder="Enter display name"
                              className="text-sm flex-1"
                              autoFocus
                            />
                            <Button
                              onClick={() => handleSaveMediaName(media.id)}
                              size="sm"
                              className="bg-green-600 hover:bg-green-700 h-8 w-8 p-0"
                            >
                              <Check size={14} />
                            </Button>
                            <Button
                              onClick={handleCancelEditMediaName}
                              size="sm"
                              variant="outline"
                              className="h-8 w-8 p-0"
                            >
                              <X size={14} />
                            </Button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 flex-1">
                            <span className="text-sm font-medium text-gray-900 flex-1">{displayName}</span>
                            {isOwner && (
                              <button
                                onClick={() => handleStartEditMediaName(media)}
                                className="text-gray-400 hover:text-blue-600 transition-colors"
                                title="Edit display name"
                              >
                                <Edit2 size={14} />
                              </button>
                            )}
                          </div>
                        )}
                        {!isEditing && (
                          <a 
                            href={media.file_url} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="text-gray-600 hover:text-gray-800 flex-shrink-0"
                            title="Open file"
                          >
                            <ExternalLink size={14} />
                          </a>
                        )}
                      </div>
                      {/* Show original filename if display name is different */}
                      {media.display_name && media.display_name !== media.file_name && !isEditing && (
                        <div className="text-xs text-gray-500 mb-2">
                          Original: {media.file_name}
                        </div>
                      )}
                      {!isEditing && (
                        <div className="text-xs text-gray-400 mb-2">
                          Script reference: name="{displayName}"
                        </div>
                      )}
                      <div className="text-gray-900 space-y-1">
                        <div className="flex items-center gap-4 text-xs text-gray-600">
                          <span className="capitalize">{media.file_category}</span>
                          <span>{formatFileSize(media.file_size)}</span>
                          <span>{media.file_type}</span>
                        </div>
                        {media.uploader && (
                          <div className="text-xs text-gray-500">
                            Uploaded by: {media.uploader.first_name} {media.uploader.last_name}
                          </div>
                        )}
                        <div className="text-xs text-gray-500">
                          Added: {new Date(media.created_at).toLocaleString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                            hour12: true
                          })}
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-gray-500">
                  No supporting media has been uploaded yet. Use the "Supporting Media" feature to add additional photos and audio files.
                </div>
              )}
            </div>
          </div>

          {/* Location Section */}
          <div className="space-y-3">
            <h3 className="font-medium text-lg text-gray-900 text-left flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-blue-600" />
                Location
              </div>
              <StatusBadge isComplete={getSectionStatus('location')} />
            </h3>
            <div className="text-sm text-gray-600 text-left space-y-3">
              {ember?.latitude && ember?.longitude ? (
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <MapPin size={16} className="text-orange-600" />
                    <span className="text-sm font-medium text-orange-900">GPS Location</span>
                  </div>
                  <div className="text-gray-900 font-medium">
                    {ember.address || `${ember.latitude.toFixed(6)}°, ${ember.longitude.toFixed(6)}°`}
                  </div>
                  {ember.city && (
                    <div className="text-gray-600 mt-1">
                      {ember.city}{ember.state ? `, ${ember.state}` : ''} • {ember.country}
                    </div>
                  )}
                  {ember.altitude && (
                    <div className="text-gray-600 mt-1">
                      <strong>Altitude:</strong> {ember.altitude > 0 ? `${ember.altitude.toFixed(1)}m above sea level` : `${Math.abs(ember.altitude).toFixed(1)}m below sea level`}
                    </div>
                  )}
                  <div className="text-xs text-gray-500 mt-2">
                    Source: Photo GPS data
                  </div>
                  {ember.camera_make && ember.camera_model && (
                    <div className="mt-2 text-xs text-orange-800">
                      <strong>Camera:</strong> {ember.camera_make} {ember.camera_model}
                    </div>
                  )}
                </div>
              ) : null}
              
              {ember?.manual_location ? (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <MapPin size={16} className="text-gray-600" />
                    <span className="text-sm font-medium text-gray-900">Manual Location</span>
                  </div>
                  <div className="text-gray-900 font-medium">{ember.manual_location}</div>
                  <div className="text-xs text-gray-500 mt-2">Source: Manual entry</div>
                </div>
              ) : null}
              
              {!ember?.latitude && !ember?.longitude && !ember?.manual_location && (
                <div className="text-gray-500">No location data available</div>
              )}
            </div>
          </div>

          {/* Time & Date Section */}
          <div className="space-y-3">
            <h3 className="font-medium text-lg text-gray-900 text-left flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-600" />
                Time & Date
              </div>
              <StatusBadge isComplete={getSectionStatus('time-date')} />
            </h3>
            <div className="text-sm text-gray-600 text-left space-y-3">
              {ember?.ember_timestamp ? (
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock size={16} className="text-orange-600" />
                    <span className="text-sm font-medium text-orange-900">Photo Timestamp</span>
                  </div>
                  <div className="text-gray-900 font-medium">
                    {new Date(ember.ember_timestamp).toLocaleString('en-US', {
                      weekday: 'short',
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                      hour12: true
                    })}
                  </div>
                  <div className="text-xs text-gray-500 mt-2">
                    Source: {ember.datetime_source === 'photo' ? 'Photo EXIF data' : 'Manual entry'}
                  </div>
                  {ember.camera_make && ember.camera_model && (
                    <div className="mt-2 text-xs text-orange-800">
                      <strong>Camera:</strong> {ember.camera_make} {ember.camera_model}
                    </div>
                  )}
                </div>
              ) : null}
              
              {ember?.manual_datetime ? (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock size={16} className="text-gray-600" />
                    <span className="text-sm font-medium text-gray-900">Manual Date & Time</span>
                  </div>
                  <div className="text-gray-900 font-medium">
                    {new Date(ember.manual_datetime).toLocaleString('en-US', {
                      weekday: 'short',
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                      hour12: true
                    })}
                  </div>
                  <div className="text-xs text-gray-500 mt-2">Source: Manual entry</div>
                </div>
              ) : null}
              
              {!ember?.ember_timestamp && !ember?.manual_datetime && (
                <div className="text-gray-500">No date & time data available</div>
              )}
            </div>
          </div>

          {/* Image Analysis Section */}
          <div className="space-y-3">
            <h3 className="font-medium text-lg text-gray-900 text-left flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-blue-600" />
                Image Analysis
              </div>
              <StatusBadge isComplete={getSectionStatus('analysis')} />
            </h3>
            <div className="text-sm text-gray-600 text-left space-y-3">
              {imageAnalysis && imageAnalysis.analysis_text ? (
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles size={16} className="text-purple-600" />
                    <span className="text-sm font-medium text-purple-900">AI Image Analysis</span>
                  </div>
                  <div className="text-gray-900 whitespace-pre-wrap">
                    {imageAnalysis.analysis_text}
                  </div>
                  <div className="text-xs text-gray-500 mt-2 space-y-1">
                    <div>
                      Source: OpenAI {imageAnalysis.openai_model || 'gpt-4o'} • {imageAnalysis.tokens_used} tokens
                    </div>
                    <div>
                      Analyzed: {new Date(imageAnalysis.analysis_timestamp).toLocaleString('en-US', {
                        weekday: 'short',
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: true
                      })}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-gray-500">No image analysis data available</div>
              )}
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
                    Delete this ember permanently. This action cannot be undone and will remove all associated data including shares, chat messages, story conversations, and analysis.
                  </p>
                  <Button 
                    variant="destructive" 
                    size="sm" 
                    onClick={() => setShowDeleteConfirm(true)}
                    disabled={isDeleting}
                  >
                    <Trash2 className="w-4 h-4 mr-1" />
                    Delete Ember
                  </Button>
                </div>
              </div>
            </>
          )}
          </div>
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteConfirm} onOpenChange={resetDeleteConfirm}>
        <DialogContent className="max-w-2xl bg-white focus:outline-none">
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
                <li>All story conversations and responses</li>
                <li>All story cuts and scripts</li>
                <li>Image analysis data</li>
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