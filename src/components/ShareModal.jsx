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
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Share, 
  Copy, 
  Link as LinkIcon,
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
  const [message, setMessage] = useState(null);
  const [showQRCode, setShowQRCode] = useState(false);

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

  const handleNativeShare = async () => {
    try {
      const link = `${window.location.origin}/embers/${ember.id}`;
      const title = ember.title || 'Check out this ember';
      const description = ember.message || 'Shared from ember.ai';
      
      if (navigator.share) {
        await navigator.share({
          title: title,
          text: description,
          url: link,
        });
      }
    } catch (error) {
      console.log('Error sharing:', error);
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

      {/* View-Only Notice */}
      <div className="bg-green-50 border border-green-200 rounded-xl p-4">
        <h4 className="font-medium text-green-900 mb-2">View-Only Sharing</h4>
        <p className="text-sm text-green-800">
          Anyone with this link can view the ember but cannot edit or contribute to it. 
          To invite collaborators with edit access, use the "Invite Contributors" feature.
        </p>
      </div>

      {/* Share Link */}
      <div className="space-y-3">
        <h4 className="font-medium flex items-center gap-2">
          <LinkIcon className="w-4 h-4" />
          Share Link (View-Only)
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
            QR Code (View-Only)
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
              Share Ember (View-Only)
            </DrawerTitle>
            <DrawerDescription className="text-left text-gray-600">
              Share this ember for viewing only - no editing access
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
            Share Ember (View-Only)
          </DialogTitle>
          <DialogDescription className="text-gray-600">
            Share this ember for viewing only - no editing access
          </DialogDescription>
        </DialogHeader>
        <ModalContent />
      </DialogContent>
    </Dialog>
  );
} 