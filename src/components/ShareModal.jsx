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
  DrawerClose,
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
  Plus,
  Facebook,
  Twitter,
  Linkedin,
  MessageCircle,
  Send,
  QrCode
} from 'lucide-react';
import QRCodeGenerator from '@/components/QRCodeGenerator';

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

export default function ShareModal({ ember, isOpen, onClose }) {
  const isMobile = useMediaQuery("(max-width: 768px)");
  const [emberData, setEmberData] = useState(ember);
  const [shareEmail, setShareEmail] = useState('');
  const [sharePermission, setSharePermission] = useState('view');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [showShareForm, setShowShareForm] = useState(false);
  const [showQRCode, setShowQRCode] = useState(false);
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
      setMessage({ type: 'error', text: 'Failed to load sharing information' });
    } finally {
      setIsInitialLoading(false);
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

  const shareToSocialMedia = (platform) => {
    const link = `${window.location.origin}/embers/${ember.id}`;
    const title = ember.title || 'Check out this ember';
    const description = ember.message || 'Shared from ember.ai';
    
    let shareUrl = '';
    
    switch (platform) {
      case 'facebook':
        shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(link)}`;
        break;
      case 'twitter':
        shareUrl = `https://twitter.com/intent/tweet?url=${encodeURIComponent(link)}&text=${encodeURIComponent(title)}`;
        break;
      case 'linkedin':
        shareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(link)}`;
        break;
      case 'whatsapp':
        shareUrl = `https://wa.me/?text=${encodeURIComponent(`${title} ${link}`)}`;
        break;
      case 'telegram':
        shareUrl = `https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(title)}`;
        break;
      case 'email':
        shareUrl = `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(`${description}\n\n${link}`)}`;
        break;
      default:
        return;
    }
    
    // Open in new window for social media, or use default for email
    if (platform === 'email') {
      window.location.href = shareUrl;
    } else {
      window.open(shareUrl, '_blank', 'width=600,height=400');
    }
    
    setMessage({ type: 'success', text: `Shared to ${platform}` });
    setTimeout(() => setMessage(null), 3000);
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: ember.title || 'Check out this ember',
          text: ember.message || 'Shared from ember.ai',
          url: `${window.location.origin}/embers/${ember.id}`,
        });
        setMessage({ type: 'success', text: 'Shared successfully' });
        setTimeout(() => setMessage(null), 3000);
      } catch (error) {
        if (error.name !== 'AbortError') {
          setMessage({ type: 'error', text: 'Failed to share' });
          setTimeout(() => setMessage(null), 3000);
        }
      }
    }
  };

  const getPermissionIcon = (permission) => {
    switch (permission) {
      case 'owner': return <Crown className="w-4 h-4 text-yellow-500" />;
      case 'contributor': return <Edit3 className="w-4 h-4 text-blue-500" />;
      case 'view': return <Eye className="w-4 h-4 text-gray-500" />;
      default: return null;
    }
  };

  const getPermissionColor = (permission) => {
    switch (permission) {
      case 'owner': return 'bg-yellow-100 text-yellow-800';
      case 'contributor': return 'bg-blue-100 text-blue-800';
      case 'view': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const isOwner = emberData?.userPermission === 'owner';

  // Shared content component for both Dialog and Drawer
  const ModalContent = () => (
    <div className="space-y-6 overflow-x-hidden">
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
          Share with a Link
        </h4>
        <div className="flex gap-2">
          <Input
            value={`${window.location.origin}/embers/${ember.id}`}
            readOnly
            className="text-xs min-w-0 flex-1 h-10"
          />
                          <Button size="lg" onClick={copyShareLink} variant="blue" className="flex-shrink-0">
            <Copy className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* QR Code Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="font-medium flex items-center gap-2">
            <QrCode className="w-4 h-4" />
            Share with QR Code
          </h4>
          <Button
            variant="outline"
            size="lg"
            onClick={() => setShowQRCode(!showQRCode)}
            className="flex items-center gap-2"
          >
            {showQRCode ? 'Hide' : 'Generate'}
          </Button>
        </div>
        
        {/* Fixed height container to prevent jumping */}
        <div className={`transition-all duration-200 overflow-hidden ${showQRCode ? 'h-[240px]' : 'h-0'}`}>
          {showQRCode && (
            <div className="mt-4">
              <QRCodeGenerator 
                url={`${window.location.origin}/embers/${ember.id}`}
                title="Ember QR Code"
                size={180}
              />
            </div>
          )}
        </div>
      </div>

      {/* Privacy Settings - Only for owners */}
      {isInitialLoading ? (
        // Skeleton for privacy settings
        <div className="space-y-3">
          <div className="h-4 bg-gray-200 rounded w-32 animate-pulse"></div>
          <div className="space-y-2">
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="h-4 bg-gray-200 rounded w-16 animate-pulse"></div>
              <div className="h-8 bg-gray-200 rounded w-20 animate-pulse"></div>
            </div>
          </div>
        </div>
      ) : isOwner ? (
        <>
          <div className="space-y-3">
            <h4 className="font-medium flex items-center gap-2">
              <Settings className="w-4 h-4" />
              Privacy Settings
            </h4>
            <div className="space-y-2">
              <div className="flex items-center justify-between p-3 border rounded-xl">
                <div className="flex items-center gap-2">
                  {emberData?.is_public ? <Globe className="w-4 h-4 text-green-500" /> : <Lock className="w-4 h-4 text-gray-500" />}
                  <span className="text-sm">
                    {emberData?.is_public ? 'Public' : 'Private'}
                  </span>
                </div>
                <Button
                  size="lg"
                  variant={emberData?.is_public ? "outline" : "blue"}
                  onClick={() => handleUpdatePublicSettings(!emberData?.is_public)}
                  disabled={isLoading}
                >
                  {emberData?.is_public ? 'Make Private' : 'Make Public'}
                </Button>
              </div>
              
              {emberData?.is_public && (
                <div className="flex items-center justify-between p-3 border rounded-xl bg-blue-50">
                  <span className="text-sm">Allow public editing</span>
                  <Button
                    size="lg"
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
      ) : null}

      {/* Individual Sharing - Only for owners */}
      {isInitialLoading ? (
        // Skeleton for sharing section
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="h-4 bg-gray-200 rounded w-32 animate-pulse"></div>
            <div className="h-8 bg-gray-200 rounded w-20 animate-pulse"></div>
          </div>
          <div className="h-12 bg-gray-200 rounded animate-pulse"></div>
        </div>
      ) : isOwner ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-medium flex items-center gap-2">
              <Users className="w-4 h-4" />
              Shared With ({emberData?.shares?.length || 0})
            </h4>
            <Button
              size="lg"
              variant="outline"
              onClick={() => setShowShareForm(!showShareForm)}
            >
              <Plus className="w-4 h-4 mr-1" />
              Add Person
            </Button>
          </div>

          {/* Share Form - Fixed height container */}
          <div className={`transition-all duration-200 overflow-hidden ${showShareForm ? 'h-[200px]' : 'h-0'}`}>
            {showShareForm && (
              <form onSubmit={handleShareEmber} className="space-y-3 p-3 border rounded-xl bg-gray-50">
                <div>
                  <Label htmlFor="shareEmail">Email Address</Label>
                  <Input
                    id="shareEmail"
                    type="email"
                    value={shareEmail}
                    onChange={(e) => setShareEmail(e.target.value)}
                    placeholder="Enter email address"
                    className="h-10"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="sharePermission">Permission</Label>
                  <select
                    id="sharePermission"
                    value={sharePermission}
                    onChange={(e) => setSharePermission(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-md h-10"
                  >
                    <option value="view">View Only</option>
                    <option value="edit">Can Edit</option>
                  </select>
                </div>
                <div className="flex gap-2">
                  <Button type="submit" size="lg" disabled={isLoading} variant="blue">
                    Share
                  </Button>
                  <Button 
                    type="button" 
                    size="lg" 
                    variant="outline"
                    onClick={() => setShowShareForm(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            )}
          </div>

          {/* Existing Shares */}
          {emberData?.shares?.length > 0 && (
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {emberData.shares.map((share) => (
                <div key={share.id} className="flex items-center justify-between p-3 border rounded-xl">
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
      ) : null}

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

      {/* Native Share Button - Bottom */}
      {typeof navigator !== 'undefined' && navigator.share && (
        <div className="mt-6 pt-4 border-t">
          <Button 
            onClick={handleNativeShare} 
            variant="blue" 
            size="lg"
            className="w-full flex items-center gap-2"
          >
            <Share className="w-4 h-4" />
            Share Ember
          </Button>
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
              <Share className="w-5 h-5 text-blue-600" />
              Share Ember
            </DrawerTitle>
            <DrawerDescription className="text-left text-gray-600">
              Share this ember with others or make it public
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
            <Share className="w-5 h-5 text-blue-600" />
            Share Ember
          </DialogTitle>
          <DialogDescription className="text-gray-600">
            Share this ember with others or make it public
          </DialogDescription>
        </DialogHeader>
        <ModalContent />
      </DialogContent>
    </Dialog>
  );
} 