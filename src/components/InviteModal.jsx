import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
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
  updateSharePermission 
} from '@/lib/sharing';
import { 
  Users, 
  Mail, 
  Trash2, 
  Plus,
  Eye,
  Edit3,
  Crown
} from 'lucide-react';

// Custom hook to detect mobile devices
function useMediaQuery(query) {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(query);
    if (media.matches !== matches) {
      setMatches(media.matches);
    }
    const listener = () => setMatches(media.matches);
    window.addEventListener("resize", listener);
    return () => window.removeEventListener("resize", listener);
  }, [matches, query]);

  return matches;
}

export default function InviteModal({ ember, isOpen, onClose, onUpdate }) {
  const isMobile = useMediaQuery("(max-width: 768px)");
  const [emberData, setEmberData] = useState(ember);
  const [inviteEmail, setInviteEmail] = useState('');
  const [invitePermission, setInvitePermission] = useState('edit');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);

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
      setMessage({ type: 'error', text: 'Failed to load contributor information' });
    } finally {
      setIsInitialLoading(false);
    }
  };

  const handleInviteContributor = async (e) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;

    setIsLoading(true);
    try {
      await shareEmber(ember.id, inviteEmail, invitePermission);
      setInviteEmail('');
      setMessage({ type: 'success', text: `${inviteEmail} invited as ${invitePermission === 'edit' ? 'contributor' : 'viewer'}` });
      await loadEmberWithSharing();
      setShowInviteForm(false);
      if (onUpdate) onUpdate(); // Notify parent to refresh
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to invite contributor' });
      setTimeout(() => setMessage(null), 3000);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveContributor = async (shareId) => {
    setIsLoading(true);
    try {
      await removeShare(shareId);
      setMessage({ type: 'success', text: 'Contributor removed' });
      await loadEmberWithSharing();
      if (onUpdate) onUpdate(); // Notify parent to refresh
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to remove contributor' });
      setTimeout(() => setMessage(null), 3000);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdatePermission = async (shareId, newPermission) => {
    setIsLoading(true);
    try {
      await updateSharePermission(shareId, newPermission);
      setMessage({ type: 'success', text: 'Permission updated' });
      await loadEmberWithSharing();
      if (onUpdate) onUpdate(); // Notify parent to refresh
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to update permission' });
      setTimeout(() => setMessage(null), 3000);
    } finally {
      setIsLoading(false);
    }
  };

  const getPermissionIcon = (permission) => {
    switch (permission) {
      case 'owner': return <Crown className="w-4 h-4 text-yellow-500" />;
      case 'edit': 
      case 'contributor': return <Edit3 className="w-4 h-4 text-blue-500" />;
      case 'view': return <Eye className="w-4 h-4 text-gray-500" />;
      default: return null;
    }
  };

  const getPermissionColor = (permission) => {
    switch (permission) {
      case 'owner': return 'bg-yellow-100 text-yellow-800';
      case 'edit':
      case 'contributor': return 'bg-blue-100 text-blue-800';
      case 'view': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPermissionLabel = (permission) => {
    switch (permission) {
      case 'edit':
      case 'contributor': return 'Contributor';
      case 'view': return 'Viewer';
      default: return permission;
    }
  };

  const ModalContent = () => (
    <div className="space-y-6 overflow-x-hidden">
      {/* Message */}
      {message && (
        <Alert className={message.type === 'error' ? 'border-red-200 bg-red-50' : 'border-green-200 bg-green-50'}>
          <AlertDescription>{message.text}</AlertDescription>
        </Alert>
      )}

      {/* Explanation */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <h4 className="font-medium text-blue-900 mb-2">About Contributors</h4>
        <p className="text-sm text-blue-800">
          Contributors can edit this ember, add content, and help build the story. They'll receive an email invitation to join.
        </p>
      </div>

      {/* Invite Form */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="font-medium flex items-center gap-2">
            <Users className="w-4 h-4" />
            Invite Contributors
          </h4>
          <Button
            size="lg"
            variant="blue"
            onClick={() => setShowInviteForm(!showInviteForm)}
          >
            <Plus className="w-4 h-4 mr-1" />
            Invite Someone
          </Button>
        </div>

        {/* Invite Form - Fixed height container */}
        <div className={`transition-all duration-200 overflow-hidden ${showInviteForm ? 'h-[220px]' : 'h-0'}`}>
          {showInviteForm && (
            <form onSubmit={handleInviteContributor} className="space-y-3 p-3 border rounded-xl bg-gray-50">
              <div>
                <Label htmlFor="inviteEmail">Email Address</Label>
                <Input
                  id="inviteEmail"
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="Enter email address"
                  className="h-10"
                  required
                />
              </div>
              <div>
                <Label htmlFor="invitePermission">Permission Level</Label>
                <select
                  id="invitePermission"
                  value={invitePermission}
                  onChange={(e) => setInvitePermission(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md h-10"
                >
                  <option value="edit">Contributor (Can Edit)</option>
                  <option value="view">Viewer (View Only)</option>
                </select>
              </div>
              <div className="flex gap-2">
                <Button type="submit" size="lg" disabled={isLoading} variant="blue">
                  Send Invitation
                </Button>
                <Button 
                  type="button" 
                  size="lg" 
                  variant="outline"
                  onClick={() => setShowInviteForm(false)}
                >
                  Cancel
                </Button>
              </div>
            </form>
          )}
        </div>
      </div>

      <Separator />

      {/* Current Contributors */}
      {isInitialLoading ? (
        // Skeleton loading
        <div className="space-y-3">
          <div className="h-4 bg-gray-200 rounded w-32 animate-pulse"></div>
          <div className="h-12 bg-gray-200 rounded animate-pulse"></div>
        </div>
      ) : (
        <div className="space-y-3">
          <h4 className="font-medium flex items-center gap-2">
            <Users className="w-4 h-4" />
            Current Contributors ({(emberData?.shares?.length || 0) + 1})
          </h4>

          <div className="space-y-2 max-h-60 overflow-y-auto">
            {/* Owner */}
            {emberData?.owner && (
              <div className="flex items-center justify-between p-3 border rounded-xl bg-yellow-50">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <Mail className="w-4 h-4 text-yellow-500 flex-shrink-0" />
                  <span className="text-sm truncate">
                    {emberData.owner.email || `${emberData.owner.first_name || ''} ${emberData.owner.last_name || ''}`.trim() || 'Owner'}
                  </span>
                  <Badge className="bg-yellow-100 text-yellow-800">
                    <div className="flex items-center gap-1">
                      <Crown className="w-3 h-3" />
                      Owner
                    </div>
                  </Badge>
                </div>
              </div>
            )}

            {/* Invited Contributors */}
            {emberData?.shares?.map((share) => (
              <div key={share.id} className="flex items-center justify-between p-3 border rounded-xl">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <Mail className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  <span className="text-sm truncate">{share.shared_with_email}</span>
                  <Badge className={getPermissionColor(share.permission_level)}>
                    <div className="flex items-center gap-1">
                      {getPermissionIcon(share.permission_level)}
                      {getPermissionLabel(share.permission_level)}
                    </div>
                  </Badge>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <select
                    value={share.permission_level}
                    onChange={(e) => handleUpdatePermission(share.id, e.target.value)}
                    className="text-xs p-1 border rounded"
                    disabled={isLoading}
                  >
                    <option value="edit">Contributor</option>
                    <option value="view">Viewer</option>
                  </select>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleRemoveContributor(share.id)}
                    disabled={isLoading}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            ))}

            {(!emberData?.shares || emberData.shares.length === 0) && (
              <div className="text-sm text-gray-500 text-center py-4 border rounded-xl bg-gray-50">
                No contributors invited yet. Invite someone to start collaborating!
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );

  // Responsive render: Drawer on mobile, Dialog on desktop
  if (isMobile) {
    return (
      <Drawer open={isOpen} onOpenChange={onClose}>
        <DrawerContent className="bg-white focus:outline-none">
          <DrawerHeader className="bg-white">
            <DrawerTitle className="flex items-center gap-2 text-xl font-bold text-gray-900">
              <Users className="w-5 h-5 text-blue-600" />
              Invite Contributors
            </DrawerTitle>
            <DrawerDescription className="text-left text-gray-600">
              Invite people to edit and contribute to this ember
            </DrawerDescription>
          </DrawerHeader>
          <div className="px-4 pb-4 bg-white max-h-[70vh] overflow-y-auto">
            <ModalContent />
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  // Desktop Dialog
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[calc(100%-2rem)] max-w-md max-h-[90vh] overflow-y-auto bg-white sm:w-full sm:max-w-md rounded-2xl focus:outline-none">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-bold text-gray-900">
            <Users className="w-5 h-5 text-blue-600" />
            Invite Contributors
          </DialogTitle>
          <DialogDescription className="text-gray-600">
            Invite people to edit and contribute to this ember
          </DialogDescription>
        </DialogHeader>
        <ModalContent />
      </DialogContent>
    </Dialog>
  );
} 