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
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { 
  getEmberWithSharing, 
  shareEmber, 
  removeShare, 
  updateEmberPublicSettings, 
  updateSharePermission 
} from '@/lib/sharing';
import { 
  Share, 
  Globe, 
  Lock, 
  Mail, 
  Copy, 
  Trash2, 
  Settings,
  Eye,
  Edit3,
  Crown,
  Users,
  Link as LinkIcon,
  Plus
} from 'lucide-react';

export default function ShareModal({ ember, isOpen, onClose }) {
  const [emberData, setEmberData] = useState(ember);
  const [shareEmail, setShareEmail] = useState('');
  const [sharePermission, setSharePermission] = useState('view');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [showShareForm, setShowShareForm] = useState(false);

  useEffect(() => {
    if (isOpen && ember) {
      loadEmberWithSharing();
    }
  }, [isOpen, ember?.id]);

  const loadEmberWithSharing = async () => {
    try {
      const data = await getEmberWithSharing(ember.id);
      setEmberData(data);
    } catch (error) {
      console.error('Error loading ember sharing data:', error);
      setMessage({ type: 'error', text: 'Failed to load sharing information' });
    }
  };

  const handleShareEmber = async (e) => {
    e.preventDefault();
    if (!shareEmail.trim()) return;

    setIsLoading(true);
    try {
      await shareEmber(ember.id, shareEmail, sharePermission);
      setShareEmail('');
      setMessage({ type: 'success', text: `Shared with ${shareEmail}` });
      await loadEmberWithSharing();
      setShowShareForm(false);
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to share ember' });
      setTimeout(() => setMessage(null), 3000);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveShare = async (shareId) => {
    setIsLoading(true);
    try {
      await removeShare(shareId);
      setMessage({ type: 'success', text: 'Share removed' });
      await loadEmberWithSharing();
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to remove share' });
      setTimeout(() => setMessage(null), 3000);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdatePublicSettings = async (isPublic, allowEdit = false) => {
    setIsLoading(true);
    try {
      await updateEmberPublicSettings(ember.id, isPublic, allowEdit);
      setMessage({ 
        type: 'success', 
        text: isPublic ? 'Made public' : 'Made private' 
      });
      await loadEmberWithSharing();
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to update privacy settings' });
      setTimeout(() => setMessage(null), 3000);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateSharePermission = async (shareId, newPermission) => {
    setIsLoading(true);
    try {
      await updateSharePermission(shareId, newPermission);
      setMessage({ type: 'success', text: 'Permission updated' });
      await loadEmberWithSharing();
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to update permission' });
      setTimeout(() => setMessage(null), 3000);
    } finally {
      setIsLoading(false);
    }
  };

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

  const getPermissionIcon = (permission) => {
    switch (permission) {
      case 'owner': return <Crown className="w-4 h-4 text-yellow-500" />;
      case 'edit': return <Edit3 className="w-4 h-4 text-blue-500" />;
      case 'view': return <Eye className="w-4 h-4 text-gray-500" />;
      default: return null;
    }
  };

  const getPermissionColor = (permission) => {
    switch (permission) {
      case 'owner': return 'bg-yellow-100 text-yellow-800';
      case 'edit': return 'bg-blue-100 text-blue-800';
      case 'view': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const isOwner = emberData?.userPermission === 'owner';

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto bg-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-gray-900">
            <Share className="w-5 h-5 text-blue-600" />
            Share Ember
          </DialogTitle>
          <DialogDescription className="text-gray-600">
            Share this ember with others or make it public
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Message */}
          {message && (
            <Alert className={message.type === 'error' ? 'border-red-200 bg-red-50' : 'border-green-200 bg-green-50'}>
              <AlertDescription>{message.text}</AlertDescription>
            </Alert>
          )}

          {/* Share Link */}
          <div className="space-y-3">
            <h4 className="font-medium flex items-center gap-2">
              <LinkIcon className="w-4 h-4" />
              Share Link
            </h4>
            <div className="flex gap-2">
              <Input
                value={`${window.location.origin}/embers/${ember.id}`}
                readOnly
                className="text-xs"
              />
              <Button size="sm" onClick={copyShareLink} variant="blue">
                <Copy className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <Separator />

          {/* Privacy Settings - Only for owners */}
          {isOwner && (
            <>
              <div className="space-y-3">
                <h4 className="font-medium flex items-center gap-2">
                  <Settings className="w-4 h-4" />
                  Privacy Settings
                </h4>
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-2">
                      {emberData?.is_public ? <Globe className="w-4 h-4 text-green-500" /> : <Lock className="w-4 h-4 text-gray-500" />}
                      <span className="text-sm">
                        {emberData?.is_public ? 'Public' : 'Private'}
                      </span>
                    </div>
                    <Button
                      size="sm"
                      variant={emberData?.is_public ? "outline" : "blue"}
                      onClick={() => handleUpdatePublicSettings(!emberData?.is_public)}
                      disabled={isLoading}
                    >
                      {emberData?.is_public ? 'Make Private' : 'Make Public'}
                    </Button>
                  </div>
                  
                  {emberData?.is_public && (
                    <div className="flex items-center justify-between p-3 border rounded-lg bg-blue-50">
                      <span className="text-sm">Allow public editing</span>
                      <Button
                        size="sm"
                        variant={emberData?.allow_public_edit ? "outline" : "blue"}
                        onClick={() => handleUpdatePublicSettings(true, !emberData?.allow_public_edit)}
                        disabled={isLoading}
                      >
                        {emberData?.allow_public_edit ? 'View Only' : 'Allow Edit'}
                      </Button>
                    </div>
                  )}
                </div>
              </div>

              <Separator />
            </>
          )}

          {/* Individual Sharing - Only for owners */}
          {isOwner && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-medium flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Shared With ({emberData?.shares?.length || 0})
                </h4>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowShareForm(!showShareForm)}
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Add Person
                </Button>
              </div>

              {/* Share Form */}
              {showShareForm && (
                <form onSubmit={handleShareEmber} className="space-y-3 p-3 border rounded-lg bg-gray-50">
                  <div>
                    <Label htmlFor="shareEmail">Email Address</Label>
                    <Input
                      id="shareEmail"
                      type="email"
                      value={shareEmail}
                      onChange={(e) => setShareEmail(e.target.value)}
                      placeholder="Enter email address"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="sharePermission">Permission</Label>
                    <select
                      id="sharePermission"
                      value={sharePermission}
                      onChange={(e) => setSharePermission(e.target.value)}
                      className="w-full p-2 border border-gray-300 rounded-md"
                    >
                      <option value="view">View Only</option>
                      <option value="edit">Can Edit</option>
                    </select>
                  </div>
                  <div className="flex gap-2">
                    <Button type="submit" size="sm" disabled={isLoading} variant="blue">
                      Share
                    </Button>
                    <Button 
                      type="button" 
                      size="sm" 
                      variant="outline"
                      onClick={() => setShowShareForm(false)}
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              )}

              {/* Existing Shares */}
              {emberData?.shares?.length > 0 && (
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {emberData.shares.map((share) => (
                    <div key={share.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <Mail className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        <span className="text-sm truncate">{share.shared_with_email}</span>
                        <Badge className={getPermissionColor(share.permission_level)}>
                          <div className="flex items-center gap-1">
                            {getPermissionIcon(share.permission_level)}
                            {share.permission_level}
                          </div>
                        </Badge>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <select
                          value={share.permission_level}
                          onChange={(e) => handleUpdateSharePermission(share.id, e.target.value)}
                          className="text-xs p-1 border rounded"
                          disabled={isLoading}
                        >
                          <option value="view">View</option>
                          <option value="edit">Edit</option>
                        </select>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleRemoveShare(share.id)}
                          disabled={isLoading}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {emberData?.shares?.length === 0 && (
                <div className="text-sm text-gray-500 text-center py-4">
                  No one else has access to this ember yet.
                </div>
              )}
            </div>
          )}

          {/* For non-owners, show current permission */}
          {!isOwner && emberData?.userPermission && (
            <div className="text-center py-4">
              <Badge className={getPermissionColor(emberData.userPermission)}>
                <div className="flex items-center gap-1">
                  {getPermissionIcon(emberData.userPermission)}
                  You have {emberData.userPermission} access
                </div>
              </Badge>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
} 