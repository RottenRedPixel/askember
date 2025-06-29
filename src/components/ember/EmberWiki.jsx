import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { ArrowClockwise, PencilSimple, TrashSimple } from 'phosphor-react';
import { 
  FileText,
  MapPin,
  Eye,
  Users,
  Package,
  HelpCircle,
  Heart,
  Clock,
  BookOpen,
  MessageCircle,
  Image
} from 'lucide-react';
import { getEmberWithSharing } from '@/lib/sharing';

export default function EmberWiki({ 
  ember, 
  onRefresh, 
  isRefreshing,
  isEditingTitle,
  setIsEditingTitle,
  newTitle,
  setNewTitle,
  handleTitleSave,
  handleTitleCancel,
  handleTitleEdit,
  handleTitleDelete
}) {
  const [sharedUsers, setSharedUsers] = useState([]); // Users with accounts
  const [emailOnlyInvites, setEmailOnlyInvites] = useState([]); // Email-only invites

  useEffect(() => {
    if (ember?.id) {
      fetchSharedUsers();
    }
  }, [ember?.id]);

  // Helper function to determine section completion status
  const getSectionStatus = (sectionType) => {
    switch (sectionType) {
      case 'title':
        return ember?.title && ember.title.trim() !== '' && ember.title !== 'Untitled Ember';
      case 'location':
        return false; // Placeholder - will be true when location data exists
      case 'time-date':
        return false; // Placeholder - will be true when time/date data exists
      case 'story':
        return false; // Placeholder - will be true when story data exists
      case 'why':
        return false; // Placeholder - will be true when why data exists
      case 'feelings':
        return false; // Placeholder - will be true when feelings data exists
      case 'analysis':
        return false; // Placeholder - will be true when analysis data exists
      case 'objects':
        return false; // Placeholder - will be true when tagged objects exist
      case 'people':
        return false; // Placeholder - will be true when tagged people exist
      case 'comments-observations':
        return false; // Placeholder - will be true when comments/observations exist
      case 'supporting-media':
        return false; // Placeholder - will be true when supporting media exists
      case 'contributors':
        return ember?.owner || sharedUsers.length > 0 || emailOnlyInvites.length > 0;
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

  return (
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
                <FileText className="w-4 h-4" />
                Title
              </div>
              <StatusBadge isComplete={getSectionStatus('title')} />
            </h3>
            <div className="text-left">
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
                  <span className="text-sm text-gray-900">{ember.title || 'N/A'}</span>
                  <button onClick={handleTitleEdit} className="text-gray-400 hover:text-blue-600">
                    <PencilSimple size={16} />
                  </button>
                  {ember.title && ember.title !== 'N/A' && (
                    <button onClick={handleTitleDelete} className="text-gray-400 hover:text-red-600">
                      <TrashSimple size={16} />
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Location Section */}
          <div className="space-y-3">
            <h3 className="font-medium text-lg text-gray-900 text-left flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                Location
              </div>
              <StatusBadge isComplete={getSectionStatus('location')} />
            </h3>
            <div className="text-sm text-gray-600 text-left">
              Geolocation data will appear here...
            </div>
          </div>

          {/* Time & Date Section */}
          <div className="space-y-3">
            <h3 className="font-medium text-lg text-gray-900 text-left flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Time & Date
              </div>
              <StatusBadge isComplete={getSectionStatus('time-date')} />
            </h3>
            <div className="text-sm text-gray-600 text-left">
              Timestamp and date information will appear here...
            </div>
          </div>

          {/* The Story Section */}
          <div className="space-y-3">
            <h3 className="font-medium text-lg text-gray-900 text-left flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4" />
                The Story
              </div>
              <StatusBadge isComplete={getSectionStatus('story')} />
            </h3>
            <div className="text-sm text-gray-600 text-left">
              The complete narrative and story behind this ember will appear here...
            </div>
          </div>

          {/* The Why Section */}
          <div className="space-y-3">
            <h3 className="font-medium text-lg text-gray-900 text-left flex items-center justify-between">
              <div className="flex items-center gap-2">
                <HelpCircle className="w-4 h-4" />
                The Why
              </div>
              <StatusBadge isComplete={getSectionStatus('why')} />
            </h3>
            <div className="text-sm text-gray-600 text-left">
              The story behind why this moment was captured will appear here...
            </div>
          </div>

          {/* The Feelings Section */}
          <div className="space-y-3">
            <h3 className="font-medium text-lg text-gray-900 text-left flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Heart className="w-4 h-4" />
                The Feelings
              </div>
              <StatusBadge isComplete={getSectionStatus('feelings')} />
            </h3>
            <div className="text-sm text-gray-600 text-left">
              Emotions and feelings associated with this moment will appear here...
            </div>
          </div>

          {/* Image Analysis Section */}
          <div className="space-y-3">
            <h3 className="font-medium text-lg text-gray-900 text-left flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4" />
                Image Analysis
              </div>
              <StatusBadge isComplete={getSectionStatus('analysis')} />
            </h3>
            <div className="text-sm text-gray-600 text-left">
              Deep image analysis will appear here...
            </div>
          </div>

          {/* Tagged Objects Section */}
          <div className="space-y-3">
            <h3 className="font-medium text-lg text-gray-900 text-left flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4" />
                Tagged Objects
              </div>
              <StatusBadge isComplete={getSectionStatus('objects')} />
            </h3>
            <div className="text-sm text-gray-600 text-left">
              Object detection and recognition will appear here...
            </div>
          </div>

          {/* Tagged People Section */}
          <div className="space-y-3">
            <h3 className="font-medium text-lg text-gray-900 text-left flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                Tagged People
              </div>
              <StatusBadge isComplete={getSectionStatus('people')} />
            </h3>
            <div className="text-sm text-gray-600 text-left">
              People tagging will appear here...
            </div>
          </div>

          {/* Comments & Observations Section */}
          <div className="space-y-3">
            <h3 className="font-medium text-lg text-gray-900 text-left flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageCircle className="w-4 h-4" />
                Comments & Observations
              </div>
              <StatusBadge isComplete={getSectionStatus('comments-observations')} />
            </h3>
            <div className="text-sm text-gray-600 text-left">
              Comments and observations about this ember will appear here...
            </div>
          </div>

          {/* Supporting Media Section */}
          <div className="space-y-3">
            <h3 className="font-medium text-lg text-gray-900 text-left flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Image className="w-4 h-4" />
                Supporting Media
              </div>
              <StatusBadge isComplete={getSectionStatus('supporting-media')} />
            </h3>
            <div className="text-sm text-gray-600 text-left">
              Additional photos, videos, and media related to this ember will appear here...
            </div>
          </div>

          {/* Contributors Section */}
          <div className="space-y-3">
            <h3 className="font-medium text-lg text-gray-900 text-left flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4" />
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
        </div>
      </CardContent>
    </Card>
  );
} 