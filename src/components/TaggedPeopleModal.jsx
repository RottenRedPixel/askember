import React, { useState, useRef, useEffect, useCallback } from 'react';
import * as faceapi from 'face-api.js';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from '@/components/ui/drawer';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Users, X, Plus, Edit2, Trash2, UserCheck, Eye, Brain } from 'lucide-react';
import { 
  getEmberTaggedPeople, 
  addTaggedPerson, 
  updateTaggedPerson, 
  deleteTaggedPerson,
  getPotentialContributorMatches 
} from '@/lib/database';

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

// Extract ModalContent to prevent re-mounting on every render (FIXES CURSOR JUMPING)
const ModalContent = ({
  ember,
  message,
  imageRef,
  canvasRef,
  handleImageLoad,
  handleCanvasClick,
  showTagForm,
  tagName,
  handleTagNameChange,
  potentialMatches,
  handleAddTag,
  setShowTagForm,
  setSelectedFace,
  setTagName,
  setPotentialMatches,
  taggedPeople,
  handleDeleteTag,
  isLoading,
  isModelLoaded,
  taggingMode,
  setTaggingMode
}) => {
  const mainImageUrl = ember.image_url;

  return (
    <div className="space-y-6">
      {/* Loading State */}
      {isLoading && !isModelLoaded && (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-sm text-gray-500 mt-2">Loading face detection models...</p>
          <p className="text-xs text-gray-400 mt-1">This may take a few seconds</p>
        </div>
      )}

      {/* Message */}
      {message && (
        <Alert className={`${message.type === 'error' ? 'border-red-200 bg-red-50' : 
                              message.type === 'success' ? 'border-green-200 bg-green-50' : 
                              'border-blue-200 bg-blue-50'}`}>
          <AlertDescription className={`${message.type === 'error' ? 'text-red-800' : 
                                            message.type === 'success' ? 'text-green-800' : 
                                            'text-blue-800'}`}>
            {message.text}
          </AlertDescription>
        </Alert>
      )}

      {/* Tagging Mode Toggle */}
      {(!isLoading || isModelLoaded) && (
        <div className="space-y-3">
          <Label className="text-sm font-medium text-gray-900">Tagging Mode</Label>
          <div className="flex gap-2">
            <Button
              variant={taggingMode === 'auto' ? 'blue' : 'outline'}
              size="sm"
              onClick={() => setTaggingMode('auto')}
              className="flex items-center gap-2"
            >
              <Brain className="w-4 h-4" />
              Auto-Detect Faces
            </Button>
            <Button
              variant={taggingMode === 'manual' ? 'blue' : 'outline'}
              size="sm"
              onClick={() => setTaggingMode('manual')}
              className="flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Manual Tagging
            </Button>
          </div>
          <div className="text-xs text-gray-500">
            {taggingMode === 'auto' ? (
              <>
                <span className="inline-flex items-center gap-1">
                  <span className="w-2 h-2 bg-blue-600 rounded-full"></span>
                  Blue circles: Click to tag detected faces
                </span>
                {' • '}
                <span className="inline-flex items-center gap-1">
                  <span className="w-2 h-2 bg-green-600 rounded-full"></span>
                  Green circles: Already tagged
                </span>
              </>
            ) : (
              <>
                <span className="inline-flex items-center gap-1">
                  <span className="w-2 h-2 bg-orange-600 rounded-full"></span>
                  Orange circles: Manual tags (click anywhere to place)
                </span>
                {' • '}
                <span className="inline-flex items-center gap-1">
                  <span className="w-2 h-2 bg-green-600 rounded-full"></span>
                  Green circles: Auto-detected and tagged
                </span>
              </>
            )}
          </div>
        </div>
      )}

      {/* Main Image with Face Detection */}
      {!isLoading || isModelLoaded ? (
        <Card className="border-gray-200">
          <CardContent className="p-6">
            {mainImageUrl ? (
              <div className="relative inline-block w-full">
                              <img
                ref={imageRef}
                src={mainImageUrl}
                alt="Ember"
                onLoad={handleImageLoad}
                crossOrigin="anonymous"
                className="max-w-full h-auto rounded-lg mx-auto block"
              />
                <canvas
                  ref={canvasRef}
                  onClick={handleCanvasClick}
                  className="absolute top-0 left-0 cursor-pointer"
                  style={{ pointerEvents: 'auto' }}
                />
              </div>
            ) : (
              <div className="p-8 text-center text-gray-500">
                <Brain size={32} className="text-gray-400 mx-auto mb-3" />
                <p>No image available for face detection</p>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="p-6 text-center">
            <Eye size={32} className="text-blue-600 mx-auto mb-3" />
            <h4 className="font-medium text-blue-900 mb-2">Getting Ready for Face Detection</h4>
            <p className="text-sm text-blue-700">
              AI models are loading. Once ready, faces will be automatically detected and you can click to tag people.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Tag Form */}
      {showTagForm && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="p-6">
            <h4 className="font-medium mb-4 text-blue-900">Tag this person</h4>
            <div className="space-y-4">
              <div className="space-y-3">
                <Label htmlFor="tagName">Name</Label>
                <Input
                  id="tagName"
                  value={tagName}
                  onChange={(e) => handleTagNameChange(e.target.value)}
                  placeholder="Enter person's name"
                  className="h-10"
                />
              </div>

              {potentialMatches.length > 0 && (
                <div className="space-y-3">
                  <Label>Potential contributor matches:</Label>
                  <div className="flex flex-wrap gap-2">
                    {potentialMatches.map((match, index) => (
                      <Button
                        key={index}
                        variant="outline"
                        size="sm"
                        onClick={() => setTagName(match.shared_user?.first_name || match.shared_with_email)}
                      >
                        <UserCheck className="w-3 h-3 mr-1" />
                        {match.shared_user?.first_name || match.shared_with_email}
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                <Button onClick={handleAddTag} disabled={!tagName.trim() || isLoading} variant="blue">
                  <Plus className="w-4 h-4 mr-1" />
                  Add Tag
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setShowTagForm(false);
                    setSelectedFace(null);
                    setTagName('');
                    setPotentialMatches([]);
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tagged People List */}
      {taggedPeople.length > 0 && (
        <div className="space-y-4">
          <Separator />
          <div className="space-y-3">
            <h4 className="font-medium flex items-center gap-2">
              <Users className="w-4 h-4" />
              Tagged People ({taggedPeople.length})
            </h4>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {taggedPeople.map((person) => (
                <div key={person.id} className="flex items-center justify-between p-3 border rounded-xl">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Users className="w-4 h-4 text-gray-400" />
                      <div className={`w-2 h-2 rounded-full ${
                        person.face_coordinates?.type === 'manual' ? 'bg-orange-600' : 'bg-blue-600'
                      }`} title={person.face_coordinates?.type === 'manual' ? 'Manual tag' : 'Auto-detected'} />
                    </div>
                    <span className="font-medium truncate">{person.person_name}</span>
                    {person.contributor_email && (
                      <Badge variant="outline" className="text-xs">
                        {person.contributor_email}
                      </Badge>
                    )}
                    {person.contributor_info && (
                      <Badge className="text-xs bg-green-100 text-green-800">
                        Contributor
                      </Badge>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteTag(person.id)}
                    disabled={isLoading}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Instructions */}
      <Card className="border-gray-200 bg-gray-50">
        <CardContent className="p-4">
          <div className="text-sm text-gray-600 space-y-1">
            <p>• Blue circles: Auto-detected faces - click to add names</p>
            <p>• Orange circles: Manual tags - always orange whether named or not</p>
            <p>• Green circles: Auto-detected faces that are already tagged</p>
            <p>• Names will be suggested based on ember contributors</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

const TaggedPeopleModal = ({ ember, isOpen, onClose, onUpdate }) => {
  const imageRef = useRef(null);
  const canvasRef = useRef(null);
  const isDetectingRef = useRef(false); // Prevent simultaneous detection calls
  const [isLoading, setIsLoading] = useState(false);
  const [isModelLoaded, setIsModelLoaded] = useState(false);
  const [detectedFaces, setDetectedFaces] = useState([]);
  const [taggedPeople, setTaggedPeople] = useState([]);
  const [message, setMessage] = useState(null);
  const [showTagForm, setShowTagForm] = useState(false);
  const [selectedFace, setSelectedFace] = useState(null);
  const [tagName, setTagName] = useState('');
  const [potentialMatches, setPotentialMatches] = useState([]);
  const [taggingMode, setTaggingMode] = useState('auto'); // 'auto' or 'manual'
  const [manualTags, setManualTags] = useState([]); // Store manually placed tags
  
  const isMobile = useMediaQuery("(max-width: 768px)");

  // Load face detection models
  const loadModels = useCallback(async () => {
    if (isModelLoaded) return;
    
    try {
      setIsLoading(true);
      setMessage({ type: 'info', text: 'Loading face detection models...' });
      
      const MODEL_URL = '/models';
      await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
      
      setIsModelLoaded(true);
      setMessage({ type: 'success', text: 'Face detection ready!' });
    } catch (error) {
      console.error('Error loading face detection models:', error);
      setMessage({ type: 'error', text: 'Failed to load face detection models' });
    } finally {
      setIsLoading(false);
    }
  }, [isModelLoaded]);

  // Load tagged people from database
  const loadTaggedPeople = useCallback(async () => {
    if (!ember?.id) return;
    
    try {
      const people = await getEmberTaggedPeople(ember.id);
      setTaggedPeople(people);
    } catch (error) {
      console.error('Error loading tagged people:', error);
      setMessage({ type: 'error', text: 'Failed to load tagged people' });
    }
  }, [ember?.id]);

  // Detect faces in the image
  const detectFaces = useCallback(async () => {
    if (!imageRef.current || !canvasRef.current || !isModelLoaded || isDetectingRef.current) return;

    try {
      isDetectingRef.current = true;
      setIsLoading(true);
      setMessage({ type: 'info', text: 'Detecting faces...' });

      // Try to detect faces with the current image
      let detections;
      try {
        detections = await faceapi.detectAllFaces(
          imageRef.current,
          new faceapi.TinyFaceDetectorOptions()
        );
      } catch (corsError) {
        // If CORS error, try fetching as blob first
        if (corsError.message && corsError.message.includes('tainted')) {
          setMessage({ type: 'info', text: 'Retrying with alternative method...' });
          
          const response = await fetch(imageRef.current.src);
          const blob = await response.blob();
          const blobUrl = URL.createObjectURL(blob);
          
          // Create a new image element with the blob URL
          const newImg = new Image();
          newImg.crossOrigin = 'anonymous';
          await new Promise((resolve, reject) => {
            newImg.onload = resolve;
            newImg.onerror = reject;
            newImg.src = blobUrl;
          });
          
          detections = await faceapi.detectAllFaces(
            newImg,
            new faceapi.TinyFaceDetectorOptions()
          );
          
          // Clean up blob URL
          URL.revokeObjectURL(blobUrl);
        } else {
          throw corsError;
        }
      }

      const canvas = canvasRef.current;
      const imageRect = imageRef.current.getBoundingClientRect();
      const displaySize = {
        width: imageRect.width,
        height: imageRect.height,
      };

      faceapi.matchDimensions(canvas, displaySize);
      const resizedDetections = faceapi.resizeResults(detections, displaySize);
      
      // Clear previous drawings
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Calculate scaling factor for stored coordinates (move this to top)
      const scaleX = displaySize.width / imageRef.current.naturalWidth;
      const scaleY = displaySize.height / imageRef.current.naturalHeight;

      // Draw auto-detected face circles
      resizedDetections.forEach((detection, index) => {
        const { x, y, width, height } = detection.box;
        
        // Check if this face is already tagged (convert stored natural coords to display coords)
        const isTagged = taggedPeople.some(person => {
          const coords = person.face_coordinates;
          if (coords.type !== 'auto') return false;
          const storedDisplayX = coords.x / scaleX;
          const storedDisplayY = coords.y / scaleY;
          return Math.abs(storedDisplayX - x) < 20 && Math.abs(storedDisplayY - y) < 20;
        });

        // Draw circle around face
        ctx.beginPath();
        ctx.ellipse(
          x + width / 2, 
          y + height / 2, 
          width / 2 + 10, 
          height / 2 + 10, 
          0, 0, 2 * Math.PI
        );
        ctx.strokeStyle = isTagged ? '#10b981' : '#3b82f6'; // green if tagged, blue if not
        ctx.lineWidth = 3;
        ctx.stroke();

        // Add click indicator for auto-detected faces
        if (!isTagged) {
          ctx.fillStyle = '#3b82f6';
          ctx.font = '12px Arial';
          ctx.fillText('+', x + width / 2 - 4, y - 5);
        }
      });

      // Draw manual tags (both placed and already saved)
      const allManualTags = [
        ...manualTags,
        ...taggedPeople.filter(person => person.face_coordinates.type === 'manual')
      ];

      allManualTags.forEach((tag) => {
        const coords = tag.face_coordinates || tag;
        // Scale stored coordinates to current display size
        const x = coords.x * scaleX;
        const y = coords.y * scaleY;
        
        // Check if this manual tag is already in database (both coords are in display scale now)
        const isTagged = taggedPeople.some(person => {
          if (person.face_coordinates.type !== 'manual') return false;
          const storedDisplayX = person.face_coordinates.x / scaleX;
          const storedDisplayY = person.face_coordinates.y / scaleY;
          return Math.abs(storedDisplayX - x) < 20 && Math.abs(storedDisplayY - y) < 20;
        });

        // Draw circular marker for manual tags (always orange to distinguish from auto-detected)
        ctx.beginPath();
        ctx.arc(x, y, 25, 0, 2 * Math.PI);
        ctx.strokeStyle = '#f97316'; // always orange for manual tags
        ctx.lineWidth = 3;
        ctx.stroke();

        // Add inner circle
        ctx.beginPath();
        ctx.arc(x, y, 15, 0, 2 * Math.PI);
        ctx.fillStyle = '#f9731620'; // semi-transparent orange fill
        ctx.fill();

        // Add content based on whether manual tag is named or not
        if (isTagged) {
          // Show person name for tagged manual markers
          const person = taggedPeople.find(p => {
            if (p.face_coordinates.type !== 'manual') return false;
            const storedDisplayX = p.face_coordinates.x / scaleX;
            const storedDisplayY = p.face_coordinates.y / scaleY;
            return Math.abs(storedDisplayX - x) < 20 && Math.abs(storedDisplayY - y) < 20;
          });
          if (person) {
            ctx.fillStyle = '#f97316'; // keep orange theme for manual tags
            ctx.font = 'bold 12px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(person.person_name, x, y - 35);
          }
        } else {
          // Show + indicator for untagged manual markers
          ctx.fillStyle = '#f97316';
          ctx.font = '14px Arial';
          ctx.textAlign = 'center';
          ctx.fillText('+', x, y + 5);
        }
      });

      setDetectedFaces(resizedDetections);
      setMessage({ 
        type: 'success', 
        text: `${resizedDetections.length} face(s) detected. ${taggingMode === 'auto' ? 'Click on blue circles to tag people.' : 'Switch to Manual mode to place tags anywhere.'}` 
      });

    } catch (error) {
      console.error('Error detecting faces:', error);
      
      // Handle CORS/tainted canvas errors specifically
      if (error.message && error.message.includes('tainted') || error.name === 'SecurityError') {
        setMessage({ 
          type: 'error', 
          text: 'Image access blocked by browser security. Please try refreshing the page or contact support.' 
        });
      } else {
        setMessage({ type: 'error', text: 'Failed to detect faces. Please try again.' });
      }
    } finally {
      setIsLoading(false);
      isDetectingRef.current = false;
    }
  }, [isModelLoaded, taggedPeople, manualTags, taggingMode]);

  // Handle canvas click to tag faces or place manual tags
  const handleCanvasClick = (event) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const clickY = event.clientY - rect.top;

    // Calculate scaling factor to convert display coordinates to natural coordinates
    const scaleX = imageRef.current.naturalWidth / rect.width;
    const scaleY = imageRef.current.naturalHeight / rect.height;

    if (taggingMode === 'auto') {
      // Auto mode: only allow clicking on detected faces
      const clickedFace = detectedFaces.find(detection => {
        const { x, y, width, height } = detection.box;
        return clickX >= x && clickX <= x + width && clickY >= y && clickY <= y + height;
      });

      if (clickedFace) {
        // Check if this face is already tagged (convert stored natural coords to display coords)
        const existingTag = taggedPeople.find(person => {
          const coords = person.face_coordinates;
          if (coords.type !== 'auto') return false;
          const storedDisplayX = coords.x / scaleX;
          const storedDisplayY = coords.y / scaleY;
          return Math.abs(storedDisplayX - clickedFace.box.x) < 20 && 
                 Math.abs(storedDisplayY - clickedFace.box.y) < 20;
        });

        if (existingTag) {
          setMessage({ type: 'info', text: `This face is already tagged as "${existingTag.person_name}"` });
          return;
        }

        setSelectedFace(clickedFace);
        setShowTagForm(true);
        setTagName('');
        setPotentialMatches([]);
      }
    } else {
      // Manual mode: allow clicking anywhere to place a tag
      
      // First check if we clicked on an existing manual tag
      const allManualTags = [
        ...manualTags,
        ...taggedPeople.filter(person => person.face_coordinates.type === 'manual')
      ];

      const clickedManualTag = allManualTags.find(tag => {
        const coords = tag.face_coordinates || tag;
        // Convert stored natural coordinates to display coordinates for comparison
        const displayX = coords.x / scaleX;
        const displayY = coords.y / scaleY;
        const distance = Math.sqrt(Math.pow(displayX - clickX, 2) + Math.pow(displayY - clickY, 2));
        return distance <= 25; // Within the circle radius
      });

      if (clickedManualTag) {
        // Check if this manual tag is already in the database
        const existingTag = taggedPeople.find(person => {
          const coords = person.face_coordinates;
          return coords.type === 'manual' && 
                 Math.abs(coords.x - clickX) < 20 && 
                 Math.abs(coords.y - clickY) < 20;
        });

        if (existingTag) {
          setMessage({ type: 'info', text: `This person is already tagged as "${existingTag.person_name}"` });
          return;
        }

        // Tag an existing manual marker (use natural coordinates)
        const coords = clickedManualTag.face_coordinates || clickedManualTag;
        setSelectedFace({
          box: { x: clickX - 25, y: clickY - 25, width: 50, height: 50 },
          isManual: true,
          coordinates: { x: coords.x, y: coords.y }
        });
        setShowTagForm(true);
        setTagName('');
        setPotentialMatches([]);
      } else {
        // Place a new manual tag (store in natural coordinates)
        const naturalX = clickX * scaleX;
        const naturalY = clickY * scaleY;
        
        const newManualTag = {
          x: naturalX,
          y: naturalY,
          type: 'manual'
        };

        setManualTags(prev => [...prev, newManualTag]);
        
        // Immediately draw the new manual tag circle
        const ctx = canvas.getContext('2d');
        ctx.beginPath();
        ctx.arc(clickX, clickY, 25, 0, 2 * Math.PI);
        ctx.strokeStyle = '#f97316'; // orange for new manual tag
        ctx.lineWidth = 3;
        ctx.stroke();

        // Add inner circle
        ctx.beginPath();
        ctx.arc(clickX, clickY, 15, 0, 2 * Math.PI);
        ctx.fillStyle = '#f9731620'; // semi-transparent orange fill
        ctx.fill();

        // Add click indicator
        ctx.fillStyle = '#f97316';
        ctx.font = '14px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('+', clickX, clickY + 5);
        
        // Also set it as selected face for tagging (keep display coordinates for UI)
        setSelectedFace({
          box: { x: clickX - 25, y: clickY - 25, width: 50, height: 50 },
          isManual: true,
          coordinates: { x: naturalX, y: naturalY }
        });
        setShowTagForm(true);
        setTagName('');
        setPotentialMatches([]);

        // Redraw canvas to show all tags after a short delay (to maintain other visual elements)
        setTimeout(() => {
          if (!isDetectingRef.current) {
            detectFaces();
          }
        }, 100);

        setMessage({ type: 'info', text: 'Manual tag placed! Enter a name to tag this person.' });
      }
    }
  };

  // Handle adding a new tag
  const handleAddTag = async () => {
    if (!tagName.trim() || !selectedFace || !ember?.id) return;

    try {
      // Calculate scaling factor to convert display coordinates to natural coordinates
      const imageRect = imageRef.current.getBoundingClientRect();
      const scaleX = imageRef.current.naturalWidth / imageRect.width;
      const scaleY = imageRef.current.naturalHeight / imageRect.height;

      // Prepare face coordinates based on whether it's auto-detected or manual
      let faceCoordinates;
      
      if (selectedFace.isManual) {
        // Manual tag coordinates (already in natural dimensions)
        faceCoordinates = {
          x: selectedFace.coordinates.x,
          y: selectedFace.coordinates.y,
          width: 50 * scaleX,
          height: 50 * scaleY,
          type: 'manual'
        };
      } else {
        // Auto-detected face coordinates (convert display to natural dimensions)
        faceCoordinates = {
          x: selectedFace.box.x * scaleX,
          y: selectedFace.box.y * scaleY,
          width: selectedFace.box.width * scaleX,
          height: selectedFace.box.height * scaleY,
          type: 'auto'
        };
      }
      
      setIsLoading(true);

      // If this is a manual tag, remove it from the temporary manual tags array
      if (selectedFace.isManual) {
        setManualTags(prev => prev.filter(tag => 
          Math.abs(tag.x - selectedFace.coordinates.x) > 5 || 
          Math.abs(tag.y - selectedFace.coordinates.y) > 5
        ));
      }

      await addTaggedPerson(ember.id, tagName.trim(), faceCoordinates);
      
      setMessage({ type: 'success', text: `Tagged "${tagName}" successfully!` });
      setShowTagForm(false);
      setSelectedFace(null);
      setTagName('');
      
      // Reload tagged people and re-detect faces
      await loadTaggedPeople();
      setTimeout(() => {
        if (!isDetectingRef.current) {
          detectFaces();
        }
      }, 100);
      
      // Notify parent component
      if (onUpdate) onUpdate();

    } catch (error) {
      console.error('Error adding tag:', error);
      setMessage({ type: 'error', text: 'Failed to add tag' });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle deleting a tag
  const handleDeleteTag = async (tagId) => {
    try {
      setIsLoading(true);
      await deleteTaggedPerson(tagId);
      
      setMessage({ type: 'success', text: 'Tag deleted successfully!' });
      
      // Reload tagged people and re-detect faces
      await loadTaggedPeople();
      setTimeout(() => {
        if (!isDetectingRef.current) {
          detectFaces();
        }
      }, 100);
      
      // Notify parent component
      if (onUpdate) onUpdate();

    } catch (error) {
      console.error('Error deleting tag:', error);
      setMessage({ type: 'error', text: 'Failed to delete tag' });
    } finally {
      setIsLoading(false);
    }
  };

  // Check for potential contributor matches when name changes
  const checkPotentialMatches = async (name) => {
    if (name.length > 2 && ember?.id) {
      try {
        const matches = await getPotentialContributorMatches(ember.id, name);
        setPotentialMatches(matches);
      } catch (error) {
        console.error('Error checking matches:', error);
      }
    } else {
      setPotentialMatches([]);
    }
  };

  // Initialize when modal opens
  useEffect(() => {
    if (isOpen && ember) {
      loadModels();
      loadTaggedPeople();
    }
  }, [isOpen, ember, loadModels, loadTaggedPeople]);

  // Detect faces when image loads and models are ready
  useEffect(() => {
    if (isModelLoaded && imageRef.current?.complete && !isDetectingRef.current) {
      const timer = setTimeout(() => {
        if (!isDetectingRef.current) {
          detectFaces();
        }
      }, 500);
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isModelLoaded]);

  // Handle image load
  const handleImageLoad = () => {
    if (isModelLoaded && !isDetectingRef.current) {
      setTimeout(() => {
        if (!isDetectingRef.current) {
          detectFaces();
        }
      }, 500);
    }
  };

  // Handle tag name change
  const handleTagNameChange = (value) => {
    setTagName(value);
    checkPotentialMatches(value);
  };

  // Clear manual tags and redraw when switching to auto mode
  useEffect(() => {
    if (taggingMode === 'auto') {
      setManualTags([]);
    }
  }, [taggingMode]);

  // Redraw canvas when mode changes or when models are loaded  
  useEffect(() => {
    if (isModelLoaded && imageRef.current?.complete && !isDetectingRef.current) {
      const timer = setTimeout(() => {
        if (!isDetectingRef.current) {
          detectFaces();
        }
      }, 100);
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taggingMode, isModelLoaded]);

  if (!ember) return null;

  // Mobile: Use Drawer, Desktop: Use Dialog
  if (isMobile) {
    return (
      <Drawer open={isOpen} onOpenChange={onClose}>
        <DrawerContent className="bg-white focus:outline-none">
          <DrawerHeader className="bg-white">
            <DrawerTitle className="flex items-center gap-2 text-xl font-bold text-gray-900">
              <Users className="w-5 h-5 text-blue-600" />
              Tagged People
            </DrawerTitle>
            <DrawerDescription className="text-left text-gray-600">
              Detect faces and tag people in your image using AI
            </DrawerDescription>
          </DrawerHeader>
          <div className="px-4 pb-4 bg-white max-h-[70vh] overflow-y-auto">
            <ModalContent
              ember={ember}
              message={message}
              imageRef={imageRef}
              canvasRef={canvasRef}
              handleImageLoad={handleImageLoad}
              handleCanvasClick={handleCanvasClick}
              showTagForm={showTagForm}
              tagName={tagName}
              handleTagNameChange={handleTagNameChange}
              potentialMatches={potentialMatches}
              handleAddTag={handleAddTag}
              setShowTagForm={setShowTagForm}
              setSelectedFace={setSelectedFace}
              setTagName={setTagName}
              setPotentialMatches={setPotentialMatches}
              taggedPeople={taggedPeople}
              handleDeleteTag={handleDeleteTag}
              isLoading={isLoading}
              isModelLoaded={isModelLoaded}
              taggingMode={taggingMode}
              setTaggingMode={setTaggingMode}
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
            <Users className="w-5 h-5 text-blue-600" />
            Tagged People
          </DialogTitle>
          <DialogDescription className="text-gray-600">
            Detect faces and tag people in your image using AI
          </DialogDescription>
        </DialogHeader>
        <ModalContent
          ember={ember}
          message={message}
          imageRef={imageRef}
          canvasRef={canvasRef}
          handleImageLoad={handleImageLoad}
          handleCanvasClick={handleCanvasClick}
          showTagForm={showTagForm}
          tagName={tagName}
          handleTagNameChange={handleTagNameChange}
          potentialMatches={potentialMatches}
          handleAddTag={handleAddTag}
          setShowTagForm={setShowTagForm}
          setSelectedFace={setSelectedFace}
          setTagName={setTagName}
          setPotentialMatches={setPotentialMatches}
          taggedPeople={taggedPeople}
          handleDeleteTag={handleDeleteTag}
          isLoading={isLoading}
          isModelLoaded={isModelLoaded}
          taggingMode={taggingMode}
          setTaggingMode={setTaggingMode}
        />
      </DialogContent>
    </Dialog>
  );
};

export default TaggedPeopleModal; 