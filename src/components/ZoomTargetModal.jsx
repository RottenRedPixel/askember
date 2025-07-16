import React, { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from '@/components/ui/drawer';
import { Card, CardContent } from '@/components/ui/card';
import { Target, X } from 'lucide-react';

// Custom hook to detect mobile devices
function useMediaQuery(query) {
    const [matches, setMatches] = useState(false);

    React.useEffect(() => {
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

// Extract ModalContent to prevent re-mounting on every render
const ModalContent = ({
    mediaUrl,
    selectedPoint,
    handleImageClick,
    onSave,
    onCancel,
    isLoading
}) => (
    <div className="space-y-6">
        {/* Instructions */}
        <Card className="border-blue-200 bg-blue-50">
            <CardContent className="p-4">
                        <div className="text-sm text-blue-700 space-y-1">
          <p className="font-medium">Select Zoom Target</p>
          <p>Click anywhere on the image to set where the zoom effect will center.</p>
          <p>A crosshair will appear at your selected point. Coordinates are stored in pixels.</p>
        </div>
            </CardContent>
        </Card>

        {/* Image Container */}
        <div className="relative">
            <div className="relative bg-gray-100 rounded-lg overflow-hidden">
                <img
                    src={mediaUrl}
                    alt="Select zoom target"
                    className="w-full h-auto max-h-96 object-contain cursor-crosshair"
                    onClick={handleImageClick}
                    onError={(e) => {
                        console.error('Error loading image for zoom target selection:', e);
                    }}
                />

                        {/* Crosshair indicator at selected point */}
        {selectedPoint && (
          <div 
            className="absolute pointer-events-none"
            style={{
              left: `${(selectedPoint.x / (mediaUrl ? 1 : 1)) * 100}%`, // Will be updated with actual conversion
              top: `${(selectedPoint.y / (mediaUrl ? 1 : 1)) * 100}%`, // Will be updated with actual conversion  
              transform: 'translate(-50%, -50%)'
            }}
            ref={(el) => {
              // Convert natural coordinates back to display percentage for positioning
              if (el && selectedPoint) {
                const img = el.closest('.relative').querySelector('img');
                if (img && img.naturalWidth && img.naturalHeight) {
                  const rect = img.getBoundingClientRect();
                  const scaleX = rect.width / img.naturalWidth;
                  const scaleY = rect.height / img.naturalHeight;
                  
                  const displayX = selectedPoint.x * scaleX;
                  const displayY = selectedPoint.y * scaleY;
                  
                  el.style.left = `${(displayX / rect.width) * 100}%`;
                  el.style.top = `${(displayY / rect.height) * 100}%`;
                }
              }
            }}
          >
            {/* Crosshair lines */}
            <div className="absolute w-8 h-0.5 bg-red-500 -translate-x-1/2 -translate-y-1/2" />
            <div className="absolute w-0.5 h-8 bg-red-500 -translate-x-1/2 -translate-y-1/2" />
            {/* Center dot */}
            <div className="absolute w-2 h-2 bg-red-500 rounded-full -translate-x-1/2 -translate-y-1/2" />
            {/* Outer circle */}
            <div className="absolute w-6 h-6 border-2 border-red-500 rounded-full -translate-x-1/2 -translate-y-1/2" />
          </div>
        )}
            </div>

                  {/* Coordinates display */}
      {selectedPoint && (
        <div className="mt-2 text-sm text-gray-600 text-center">
          Target: ({Math.round(selectedPoint.x)}, {Math.round(selectedPoint.y)}) pixels
        </div>
      )}
        </div>

        {/* Action buttons */}
        <div className="flex gap-2 pt-4">
            <Button
                onClick={onSave}
                disabled={!selectedPoint || isLoading}
                className="flex-1"
                variant="blue"
            >
                <Target className="w-4 h-4 mr-2" />
                Set Zoom Target
            </Button>
            <Button
                variant="outline"
                onClick={onCancel}
                disabled={isLoading}
            >
                <X className="w-4 h-4 mr-2" />
                Cancel
            </Button>
        </div>
    </div>
);

const ZoomTargetModal = ({ isOpen, onClose, mediaUrl, onSave, currentTarget = null }) => {
    const [selectedPoint, setSelectedPoint] = useState(currentTarget);
    const [isLoading, setIsLoading] = useState(false);
    const isMobile = useMediaQuery("(max-width: 768px)");

    // Reset selected point when modal opens/closes
    React.useEffect(() => {
        if (isOpen) {
            setSelectedPoint(currentTarget);
        }
    }, [isOpen, currentTarget]);

      // Handle image click to set target point
  const handleImageClick = useCallback((e) => {
    const rect = e.target.getBoundingClientRect();
    const img = e.target;
    
    // Get click position relative to displayed image
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;
    
    // Convert to natural image coordinates (same as TaggedPeopleModal)
    const scaleX = img.naturalWidth / rect.width;
    const scaleY = img.naturalHeight / rect.height;
    
    const naturalX = clickX * scaleX;
    const naturalY = clickY * scaleY;
    
    // Ensure coordinates are within natural image bounds
    const clampedX = Math.max(0, Math.min(img.naturalWidth, naturalX));
    const clampedY = Math.max(0, Math.min(img.naturalHeight, naturalY));
    
    setSelectedPoint({ x: clampedX, y: clampedY });
  }, []);

    // Handle save
    const handleSave = useCallback(async () => {
        if (!selectedPoint) return;

        try {
            setIsLoading(true);
            await onSave(selectedPoint);
            onClose();
        } catch (error) {
            console.error('Error saving zoom target:', error);
        } finally {
            setIsLoading(false);
        }
    }, [selectedPoint, onSave, onClose]);

    // Handle cancel
    const handleCancel = useCallback(() => {
        setSelectedPoint(currentTarget);
        onClose();
    }, [currentTarget, onClose]);

    if (!mediaUrl) return null;

    // Mobile: Use Drawer, Desktop: Use Dialog
    if (isMobile) {
        return (
            <Drawer open={isOpen} onOpenChange={onClose}>
                <DrawerContent className="bg-white focus:outline-none">
                    <DrawerHeader className="bg-white">
                        <DrawerTitle className="flex items-center gap-2 text-xl font-bold text-gray-900">
                            <Target size={22} className="text-blue-600" />
                            Select Zoom Target
                        </DrawerTitle>
                        <DrawerDescription className="text-left text-gray-600">
                            Click on the image to choose where the zoom effect will center
                        </DrawerDescription>
                    </DrawerHeader>
                    <div className="px-4 pb-4 bg-white max-h-[70vh] overflow-y-auto">
                        <ModalContent
                            mediaUrl={mediaUrl}
                            selectedPoint={selectedPoint}
                            handleImageClick={handleImageClick}
                            onSave={handleSave}
                            onCancel={handleCancel}
                            isLoading={isLoading}
                        />
                    </div>
                </DrawerContent>
            </Drawer>
        );
    }

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="w-[calc(100%-2rem)] max-w-2xl max-h-[90vh] overflow-y-auto bg-white sm:w-full sm:max-w-2xl rounded-2xl focus:outline-none">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-xl font-bold text-gray-900">
                        <Target size={22} className="text-blue-600" />
                        Select Zoom Target
                    </DialogTitle>
                    <DialogDescription className="text-gray-600">
                        Click on the image to choose where the zoom effect will center
                    </DialogDescription>
                </DialogHeader>
                <ModalContent
                    mediaUrl={mediaUrl}
                    selectedPoint={selectedPoint}
                    handleImageClick={handleImageClick}
                    onSave={handleSave}
                    onCancel={handleCancel}
                    isLoading={isLoading}
                />
            </DialogContent>
        </Dialog>
    );
};

export default ZoomTargetModal; 