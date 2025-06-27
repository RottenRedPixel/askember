import React, { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Button } from './ui/button';
import { ChevronRight, Check, X } from 'lucide-react';

export default function SlideToVoteModal({ isOpen, onClose, ember, onVoteSubmit }) {
  const [slidingStates, setSlidingStates] = useState({});
  const [completedVote, setCompletedVote] = useState(null);
  const sliderRefs = useRef({});
  const containerRefs = useRef({});
  const isDragging = useRef(false);
  const currentSlider = useRef(null);
  const startX = useRef(0);
  const currentX = useRef(0);

  // Reset states when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setSlidingStates({});
      setCompletedVote(null);
      sliderRefs.current = {};
      containerRefs.current = {};
    }
  }, [isOpen]);

  const getSlideState = (name) => {
    return slidingStates[name] || { progress: 0, isSliding: false, isCompleted: false };
  };

  const updateSlideState = (name, updates) => {
    setSlidingStates(prev => ({
      ...prev,
      [name]: { ...getSlideState(name), ...updates }
    }));
  };

  const handleMouseDown = (e, name) => {
    if (completedVote) return;
    
    isDragging.current = true;
    currentSlider.current = name;
    startX.current = e.clientX;
    updateSlideState(name, { isSliding: true });
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleTouchStart = (e, name) => {
    if (completedVote) return;
    
    isDragging.current = true;
    currentSlider.current = name;
    startX.current = e.touches[0].clientX;
    updateSlideState(name, { isSliding: true });
    
    document.addEventListener('touchmove', handleTouchMove);
    document.addEventListener('touchend', handleTouchEnd);
  };

  const handleMouseMove = (e) => {
    if (!isDragging.current || !currentSlider.current || !containerRefs.current[currentSlider.current]) return;
    
    currentX.current = e.clientX;
    updateSlideProgress();
  };

  const handleTouchMove = (e) => {
    if (!isDragging.current || !currentSlider.current || !containerRefs.current[currentSlider.current]) return;
    
    currentX.current = e.touches[0].clientX;
    updateSlideProgress();
  };

  const updateSlideProgress = () => {
    const name = currentSlider.current;
    const container = containerRefs.current[name];
    if (!container) return;

    const containerWidth = container.offsetWidth;
    const sliderWidth = 48; // Width of the slider button (w-12 = 48px)
    const maxDistance = containerWidth - sliderWidth - 8; // Subtract padding (2 * 4px from top-1 left-1)
    
    const distance = Math.max(0, Math.min(maxDistance, currentX.current - startX.current));
    const progress = (distance / maxDistance) * 100;
    
    updateSlideState(name, { progress });
    
    // Check if slide is completed (98% threshold to account for precision)
    if (progress >= 98) {
      updateSlideState(name, { isCompleted: true, isSliding: false, progress: 100 });
      setCompletedVote(name);
      isDragging.current = false;
      
      // Auto-submit after a brief delay
      setTimeout(() => {
        onVoteSubmit(name);
      }, 300);
    }
  };

  const handleMouseUp = () => {
    const name = currentSlider.current;
    if (name && !getSlideState(name).isCompleted) {
      // Snap back if not completed
      updateSlideState(name, { progress: 0, isSliding: false });
    }
    isDragging.current = false;
    currentSlider.current = null;
    
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  };

  const handleTouchEnd = () => {
    const name = currentSlider.current;
    if (name && !getSlideState(name).isCompleted) {
      // Snap back if not completed
      updateSlideState(name, { progress: 0, isSliding: false });
    }
    isDragging.current = false;
    currentSlider.current = null;
    
    document.removeEventListener('touchmove', handleTouchMove);
    document.removeEventListener('touchend', handleTouchEnd);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md bg-white">
        <DialogHeader>
          <DialogTitle className="text-center text-xl font-bold text-gray-900">
            Vote for Ember Name
          </DialogTitle>
          <DialogDescription className="text-center text-gray-600">
            Choose your favorite name for this memory
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 p-2">
          {/* Current Ember Title */}
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600 mb-1">Current Title</p>
            <h3 className="text-lg font-semibold text-gray-900">{ember?.title}</h3>
          </div>

          {/* Instructions */}
          <div className="text-center">
            <p className="text-sm font-medium text-gray-700 mb-2">
              {completedVote ? 'Vote Submitted!' : 'Slide to vote for your favorite name:'}
            </p>
          </div>

          {/* Multiple Slide Interfaces */}
          <div className="space-y-4">
            {ember?.suggested_names?.map((name, index) => {
              const slideState = getSlideState(name);
              const isThisCompleted = completedVote === name;
              const isDisabled = completedVote && completedVote !== name;
              
              return (
                <div key={index} className="space-y-2">
                  <div 
                    ref={el => containerRefs.current[name] = el}
                    className={`relative w-full h-14 bg-gray-200 rounded-full overflow-hidden select-none transition-opacity duration-200 ${
                      isDisabled ? 'opacity-50' : ''
                    }`}
                  >
                    {/* Progress Background */}
                    <div 
                      className="absolute inset-0 bg-gradient-to-r from-blue-400 to-blue-600 transition-all duration-200"
                      style={{ 
                        width: `${slideState.progress}%`,
                        opacity: isThisCompleted ? 1 : 0.7
                      }}
                    />
                    
                    {/* Name Text */}
                    <div className="absolute inset-0 flex items-center justify-center px-4">
                      <span className={`text-sm font-medium transition-colors duration-200 truncate ${
                        slideState.progress > 30 ? 'text-white' : 'text-gray-700'
                      }`}>
                        {isThisCompleted ? `✓ ${name}` : name}
                      </span>
                    </div>
                    
                    {/* Slider Button */}
                    <div 
                      ref={el => sliderRefs.current[name] = el}
                      className={`absolute top-1 left-1 w-12 h-12 bg-white rounded-full shadow-lg flex items-center justify-center cursor-pointer transition-all duration-200 ${
                        slideState.isSliding ? 'shadow-xl' : 'shadow-lg'
                      } ${
                        isDisabled ? 'opacity-50 cursor-not-allowed' : ''
                      }`}
                      style={{ 
                        transform: `translateX(${(slideState.progress / 100) * (containerRefs.current[name]?.offsetWidth - 48 - 8 || 0)}px)`,
                        transition: slideState.isSliding ? 'none' : 'transform 0.3s ease-out'
                      }}
                      onMouseDown={(e) => !isDisabled && handleMouseDown(e, name)}
                      onTouchStart={(e) => !isDisabled && handleTouchStart(e, name)}
                    >
                      {isThisCompleted ? (
                        <Check className="w-6 h-6 text-green-500" />
                      ) : (
                        <ChevronRight className={`w-6 h-6 transition-colors ${
                          slideState.progress > 0 ? 'text-blue-500' : 'text-gray-400'
                        }`} />
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Instructions */}
          <div className="text-center text-xs text-gray-500">
            {completedVote ? `You voted for "${completedVote}"` : "Drag any slider to the right to cast your vote"}
          </div>

          {/* Cancel Button */}
          <div className="flex justify-center pt-4">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex items-center gap-2"
            >
              <X className="w-4 h-4" />
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
} 