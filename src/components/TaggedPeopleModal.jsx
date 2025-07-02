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
  isModelLoaded
}) => {
  const mainImageUrl = ember.image_urls?.[0];

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="text-center">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">AI Face Detection & Tagging</h3>
        <p className="text-sm text-gray-600">
          Automatically detect faces and tag people in your image
        </p>
      </div>

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
                    <Users className="w-4 h-4 text-gray-400 flex-shrink-0" />
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
            <p>• Blue circles indicate untagged faces - click to add names</p>
            <p>• Green circles show already tagged faces</p>
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
  const [isLoading, setIsLoading] = useState(false);
  const [isModelLoaded, setIsModelLoaded] = useState(false);
  const [detectedFaces, setDetectedFaces] = useState([]);
  const [taggedPeople, setTaggedPeople] = useState([]);
  const [message, setMessage] = useState(null);
  const [showTagForm, setShowTagForm] = useState(false);
  const [selectedFace, setSelectedFace] = useState(null);
  const [tagName, setTagName] = useState('');
  const [potentialMatches, setPotentialMatches] = useState([]);
  
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
    if (!imageRef.current || !canvasRef.current || !isModelLoaded) return;

    try {
      setIsLoading(true);
      setMessage({ type: 'info', text: 'Detecting faces...' });

      const detections = await faceapi.detectAllFaces(
        imageRef.current,
        new faceapi.TinyFaceDetectorOptions()
      );

      const canvas = canvasRef.current;
      const displaySize = {
        width: imageRef.current.width,
        height: imageRef.current.height,
      };

      faceapi.matchDimensions(canvas, displaySize);
      const resizedDetections = faceapi.resizeResults(detections, displaySize);
      
      // Clear previous drawings
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw face detection circles
      resizedDetections.forEach((detection, index) => {
        const { x, y, width, height } = detection.box;
        
        // Check if this face is already tagged
        const isTagged = taggedPeople.some(person => {
          const coords = person.face_coordinates;
          return Math.abs(coords.x - x) < 20 && Math.abs(coords.y - y) < 20;
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

        // Add click indicator
        if (!isTagged) {
          ctx.fillStyle = '#3b82f6';
          ctx.font = '12px Arial';
          ctx.fillText('+', x + width / 2 - 4, y - 5);
        }
      });

      setDetectedFaces(resizedDetections);
      setMessage({ 
        type: 'success', 
        text: `${resizedDetections.length} face(s) detected. Click on blue circles to tag people.` 
      });

    } catch (error) {
      console.error('Error detecting faces:', error);
      setMessage({ type: 'error', text: 'Failed to detect faces' });
    } finally {
      setIsLoading(false);
    }
  }, [isModelLoaded, taggedPeople]);

  // Handle canvas click to tag faces
  const handleCanvasClick = (event) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const clickY = event.clientY - rect.top;

    // Find the face that was clicked
    const clickedFace = detectedFaces.find(detection => {
      const { x, y, width, height } = detection.box;
      return clickX >= x && clickX <= x + width && clickY >= y && clickY <= y + height;
    });

    if (clickedFace) {
      // Check if this face is already tagged
      const existingTag = taggedPeople.find(person => {
        const coords = person.face_coordinates;
        return Math.abs(coords.x - clickedFace.box.x) < 20 && 
               Math.abs(coords.y - clickedFace.box.y) < 20;
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
  };

  // Handle adding a new tag
  const handleAddTag = async () => {
    if (!tagName.trim() || !selectedFace || !ember?.id) return;

    try {
      setIsLoading(true);
      const faceCoordinates = {
        x: selectedFace.box.x,
        y: selectedFace.box.y,
        width: selectedFace.box.width,
        height: selectedFace.box.height
      };

      await addTaggedPerson(ember.id, tagName.trim(), faceCoordinates);
      
      setMessage({ type: 'success', text: `Tagged "${tagName}" successfully!` });
      setShowTagForm(false);
      setSelectedFace(null);
      setTagName('');
      
      // Reload tagged people and re-detect faces
      await loadTaggedPeople();
      setTimeout(() => detectFaces(), 100);
      
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
      setTimeout(() => detectFaces(), 100);
      
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
    if (isModelLoaded && imageRef.current?.complete) {
      setTimeout(() => detectFaces(), 500);
    }
  }, [isModelLoaded, detectFaces]);

  // Handle image load
  const handleImageLoad = () => {
    if (isModelLoaded) {
      setTimeout(() => detectFaces(), 500);
    }
  };

  // Handle tag name change
  const handleTagNameChange = (value) => {
    setTagName(value);
    checkPotentialMatches(value);
  };

  if (!ember) return null;

  // Mobile: Use Drawer, Desktop: Use Dialog
  if (isMobile) {
    return (
      <Drawer open={isOpen} onOpenChange={onClose}>
        <DrawerContent className="max-h-[90vh]">
          <DrawerHeader>
            <DrawerTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Tagged People
            </DrawerTitle>
            <DrawerDescription>
              Detect faces and tag people in your image using AI
            </DrawerDescription>
          </DrawerHeader>
          <div className="flex-1 overflow-y-auto p-4">
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
            />
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Tagged People
          </DialogTitle>
          <DialogDescription>
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
        />
      </DialogContent>
    </Dialog>
  );
};

export default TaggedPeopleModal; 