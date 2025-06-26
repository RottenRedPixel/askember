import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
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
  Link as LinkIcon
} from 'lucide-react';

export default function FeaturesCard({ ember, onEmberUpdate }) {
  const [emberData, setEmberData] = useState(ember);
  const [shareEmail, setShareEmail] = useState('');
  const [sharePermission, setSharePermission] = useState('view');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [showShareForm, setShowShareForm] = useState(false);

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
    <div className="h-full space-y-6">
      {/* Header */}
      <div className="flex items-center gap-2">
        <span className="text-2xl">🚀</span>
        <h3 className="text-lg font-semibold">Features & Sharing</h3>
      </div>

      {/* Message */}
      {message && (
        <Alert className={message.type === 'error' ? 'border-red-200 bg-red-50' : 'border-green-200 bg-green-50'}>
          <AlertDescription>{message.text}</AlertDescription>
        </Alert>
      )}

      {/* Share Link */}
      <div className="space-y-3">
        <h4 className="font-medium flex items-center gap-2">
          <span className="text-lg">🔗</span>
          Share This Ember
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

      {/* Privacy Settings */}
      <div className="space-y-3">
        <h4 className="font-medium flex items-center gap-2">
          <span className="text-lg">🔒</span>
          Privacy
        </h4>
        <div className="space-y-2">
          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div className="flex items-center gap-2">
              <span className="text-sm">Currently Private</span>
              <Badge variant="outline">Owner Only</Badge>
            </div>
            <Button size="sm" variant="outline">
              Make Public
            </Button>
          </div>
        </div>
      </div>

      {/* Individual Sharing */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="font-medium flex items-center gap-2">
            <span className="text-lg">👥</span>
            Share with Others
          </h4>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowShareForm(!showShareForm)}
          >
            Add Person
          </Button>
        </div>

        {showShareForm && (
          <div className="space-y-3 p-3 border rounded-lg bg-gray-50">
            <div>
              <Label htmlFor="shareEmail">Email Address</Label>
              <Input
                id="shareEmail"
                type="email"
                value={shareEmail}
                onChange={(e) => setShareEmail(e.target.value)}
                placeholder="Enter email address"
              />
            </div>
            <div>
              <Label htmlFor="sharePermission">Permission</Label>
              <select
                id="sharePermission"
                className="w-full p-2 border border-gray-300 rounded-md"
              >
                <option value="view">View Only</option>
                <option value="edit">Can Edit</option>
              </select>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="blue">
                Share
              </Button>
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => setShowShareForm(false)}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        <div className="text-sm text-gray-500">
          No one else has access to this ember yet.
        </div>
      </div>

      {/* Coming Soon Features */}
      <div className="space-y-3 pt-4 border-t">
        <h4 className="font-medium text-gray-600 flex items-center gap-2">
          <span className="text-lg">✨</span>
          Coming Soon
        </h4>
        <div className="grid grid-cols-2 gap-2 text-sm text-gray-500">
          <div className="flex items-center gap-2">
            <span>📄</span>
            Export to PDF
          </div>
          <div className="flex items-center gap-2">
            <span>🎤</span>
            Voice Notes
          </div>
          <div className="flex items-center gap-2">
            <span>👥</span>
            Real-time Collab
          </div>
          <div className="flex items-center gap-2">
            <span>📋</span>
            Templates
          </div>
        </div>
      </div>
    </div>
  );
} 