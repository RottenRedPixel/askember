import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { deleteEmber } from '@/lib/database';
import useStore from '@/store';
import { 
  getEmberWithSharing, 
  shareEmber, 
  removeShare, 
  updateEmberPublicSettings, 
  updateSharePermission,
  getEmberSharingLink 
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
  AlertTriangle
} from 'lucide-react';

export default function FeaturesCard({ ember, onEmberUpdate }) {
  const navigate = useNavigate();
  const { user } = useStore();
  const [emberData, setEmberData] = useState(ember);
  const [shareEmail, setShareEmail] = useState('');
  const [sharePermission, setSharePermission] = useState('view');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [showShareForm, setShowShareForm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);


  useEffect(() => {
    loadEmberWithSharing();
  }, [ember.id]);

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
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to share ember' });
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
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to remove share' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdatePublicSettings = async (isPublic, allowEdit = false) => {
    setIsLoading(true);
    try {
      const updated = await updateEmberPublicSettings(ember.id, isPublic, allowEdit);
      setMessage({ 
        type: 'success', 
        text: isPublic ? 'Made public' : 'Made private' 
      });
      await loadEmberWithSharing();
      if (onEmberUpdate) onEmberUpdate(updated);
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to update privacy settings' });
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
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to update permission' });
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

  const handleDeleteEmber = async () => {
    setIsDeleting(true);
    try {
      await deleteEmber(ember.id, user.id);
      setMessage({ type: 'success', text: 'Ember deleted successfully. Redirecting...' });
      
      // Close the dialog and redirect after a short delay
      setTimeout(() => {
        setShowDeleteConfirm(false);
        navigate('/embers');
      }, 2000);
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to delete ember' });
      setTimeout(() => setMessage(null), 3000);
    } finally {
      setIsDeleting(false);
    }
  };

  const resetDeleteConfirm = () => {
    setShowDeleteConfirm(false);
    setIsDeleting(false);
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
  const canEdit = ['owner', 'edit'].includes(emberData?.userPermission);

  return (
    <Card className="h-full">
      <CardContent className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900 text-left">Sharing & Features</h2>
            <p className="text-sm text-gray-600 mt-1">
              Manage privacy, share with others, and access advanced features.
            </p>
          </div>
          {emberData?.userPermission && (
            <Badge className={getPermissionColor(emberData.userPermission)}>
              <div className="flex items-center gap-1">
                {getPermissionIcon(emberData.userPermission)}
                {emberData.userPermission}
              </div>
            </Badge>
          )}
        </div>

        {/* Message */}
        {message && (
          <Alert className={message.type === 'error' ? 'border-red-200 bg-red-50' : 'border-green-200 bg-green-50'}>
            <AlertDescription>{message.text}</AlertDescription>
          </Alert>
        )}

        {/* Privacy Settings - Only for owners */}
        {isOwner && (
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
              Copy
            </Button>
          </div>
        </div>

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
                <Mail className="w-4 h-4 mr-1" />
                Share
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
                  <Button type="submit" size="sm" disabled={isLoading}>
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
              <div className="space-y-2">
                {emberData.shares.map((share) => (
                  <div key={share.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-gray-400" />
                      <span className="text-sm">{share.shared_with_email}</span>
                      <Badge className={getPermissionColor(share.permission_level)}>
                        <div className="flex items-center gap-1">
                          {getPermissionIcon(share.permission_level)}
                          {share.permission_level}
                        </div>
                      </Badge>
                    </div>
                    <div className="flex items-center gap-1">
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
          </div>
        )}

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

        {/* Features Coming Soon */}
        <div className="space-y-3 pt-4 border-t">
          <h4 className="font-medium text-gray-600">Coming Soon</h4>
          <div className="grid grid-cols-2 gap-2 text-sm text-gray-500">
            <div>• Export to PDF</div>
            <div>• Voice Notes</div>
            <div>• Collaboration</div>
            <div>• Templates</div>
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
      </CardContent>
    </Card>
  );
} 