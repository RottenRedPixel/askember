import React, { useState, useRef, useEffect, useCallback } from 'react';
import * as faceapi from 'face-api.js';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Users, X, Plus, Edit2, Trash2, UserCheck } from 'lucide-react';
import { 
  getEmberTaggedPeople, 
  addTaggedPerson, 
  updateTaggedPerson, 
  deleteTaggedPerson,
  getPotentialContributorMatches 
} from '@/lib/database';

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

  const mainImageUrl = ember.image_urls?.[0];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Tagged People
          </DialogTitle>
        </DialogHeader>

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
        <div className="relative">
          {mainImageUrl ? (
            <div className="relative inline-block">
              <img
                ref={imageRef}
                src={mainImageUrl}
                alt="Ember"
                onLoad={handleImageLoad}
                className="max-w-full h-auto rounded-lg"
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
              No image available for face detection
            </div>
          )}
        </div>

        {/* Tag Form */}
        {showTagForm && (
          <div className="border rounded-lg p-4 bg-blue-50">
            <h4 className="font-medium mb-3">Tag this person</h4>
            <div className="space-y-3">
              <div>
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
                <div>
                  <Label>Potential contributor matches:</Label>
                  <div className="flex flex-wrap gap-2 mt-1">
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
                <Button onClick={handleAddTag} disabled={!tagName.trim() || isLoading}>
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
          </div>
        )}

        {/* Tagged People List */}
        {taggedPeople.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-medium">Tagged People</h4>
            <div className="space-y-2">
              {taggedPeople.map((person) => (
                <div key={person.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-gray-400" />
                    <span className="font-medium">{person.person_name}</span>
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
                    variant="outline"
                    size="sm"
                    onClick={() => handleDeleteTag(person.id)}
                    disabled={isLoading}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="text-sm text-gray-600">
          <p>• Blue circles indicate untagged faces - click to add names</p>
          <p>• Green circles show already tagged faces</p>
          <p>• Names will be suggested based on ember contributors</p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TaggedPeopleModal; 