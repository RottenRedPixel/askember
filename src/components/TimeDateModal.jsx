import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getEmberPhotos } from '@/lib/photos';
import { updateEmberDateTime } from '@/lib/database';
import useStore from '@/store';
import { 
  Calendar, 
  Clock, 
  Camera, 
  Sun 
} from 'lucide-react';

function formatExposureTime(value) {
  if (!value) return 'Unknown';
  
  if (value < 1) {
    return `1/${Math.round(1/value)}s`;
  }
  return `${value}s`;
}

function formatDateTime(timestamp) {
  if (!timestamp) return 'Unknown';
  
  try {
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  } catch (error) {
    return 'Invalid date';
  }
}

function getRelativeTime(timestamp) {
  if (!timestamp) return 'Unknown time';
  
  try {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);
    
    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
    if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)} days ago`;
    if (diffInSeconds < 31536000) return `${Math.floor(diffInSeconds / 2592000)} months ago`;
    return `${Math.floor(diffInSeconds / 31536000)} years ago`;
  } catch (error) {
    return 'Unknown time';
  }
}

// Extract ModalContent to prevent re-mounting on every render (FIXES CURSOR JUMPING)
const ModalContent = ({
  loading,
  selectedPhoto,
  photosWithTimestamp,
  setSelectedPhoto,
  manualDateTime,
  handleManualDateTimeChange,
  manualDateTimeRef,
  handleSave,
  saving,
  formatDateTime,
  getRelativeTime,
  formatExposureTime
}) => (
  <div className="space-y-6">
    {/* Header Info */}
    <div className="text-center">
      <h3 className="text-lg font-semibold text-gray-900 mb-2">Time & Date Information</h3>
      <p className="text-sm text-gray-600">
        Timestamp and camera data extracted from image EXIF metadata
      </p>
    </div>

    {loading ? (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        <p className="text-sm text-gray-500 mt-2">Loading timestamp data...</p>
      </div>
    ) : (
      <div className="space-y-6">
        {/* Current Timestamp Display */}
        {selectedPhoto?.timestamp ? (
          <Card className="border-orange-200 bg-orange-50">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <Calendar size={20} className="text-orange-600 mt-0.5" />
                <div className="flex-1">
                  <h4 className="font-medium text-orange-900 mb-1">Photo Timestamp</h4>
                  <p className="text-sm text-orange-800 mb-1">
                    {formatDateTime(selectedPhoto.timestamp)}
                  </p>
                  <p className="text-xs text-orange-700">
                    {getRelativeTime(selectedPhoto.timestamp)}
                  </p>
                  
                  {/* Camera Info */}
                  {(selectedPhoto.camera_make || selectedPhoto.camera_model) && (
                    <div className="mt-3 pt-3 border-t border-orange-200">
                      <div className="flex items-center gap-2 mb-2">
                        <Camera size={16} className="text-orange-600" />
                        <span className="text-sm font-medium text-orange-900">Camera Info</span>
                      </div>
                      <div className="space-y-1 text-xs text-orange-800">
                        {selectedPhoto.camera_make && selectedPhoto.camera_model && (
                          <p>{selectedPhoto.camera_make} {selectedPhoto.camera_model}</p>
                        )}
                        <div className="flex flex-wrap gap-2 mt-2">
                          {selectedPhoto.iso && (
                            <Badge variant="outline" className="text-xs bg-orange-100 text-orange-800 border-orange-300">
                              ISO {selectedPhoto.iso}
                            </Badge>
                          )}
                          {selectedPhoto.aperture && (
                            <Badge variant="outline" className="text-xs bg-orange-100 text-orange-800 border-orange-300">
                              f/{selectedPhoto.aperture}
                            </Badge>
                          )}
                          {selectedPhoto.shutter_speed && (
                            <Badge variant="outline" className="text-xs bg-orange-100 text-orange-800 border-orange-300">
                              {formatExposureTime(selectedPhoto.shutter_speed)}
                            </Badge>
                          )}
                          {selectedPhoto.focal_length && (
                            <Badge variant="outline" className="text-xs bg-orange-100 text-orange-800 border-orange-300">
                              {selectedPhoto.focal_length}mm
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-gray-200">
            <CardContent className="p-4 text-center">
              <Clock size={24} className="text-gray-400 mx-auto mb-2" />
              <p className="text-sm text-gray-500">No timestamp data found in uploaded images</p>
            </CardContent>
          </Card>
        )}

        {/* Photos with Timestamps */}
        {photosWithTimestamp.length > 0 && (
          <div className="space-y-3">
            <Label className="text-sm font-medium text-gray-900 flex items-center gap-2">
              <Clock size={16} />
              Photos with Timestamp Data ({photosWithTimestamp.length})
            </Label>
            
            <div className="grid grid-cols-1 gap-2 max-h-40 overflow-y-auto">
              {photosWithTimestamp.map((photo) => (
                <div
                  key={photo.id}
                  className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                    selectedPhoto?.id === photo.id
                      ? 'border-orange-500 bg-orange-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => setSelectedPhoto(photo)}
                >
                  <div className="flex items-center gap-3">
                    <img
                      src={photo.storage_url}
                      alt="Photo"
                      className="w-12 h-12 object-cover rounded"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {photo.original_filename}
                      </p>
                      <p className="text-xs text-gray-500">
                        {formatDateTime(photo.timestamp)}
                      </p>
                      <p className="text-xs text-gray-400">
                        {getRelativeTime(photo.timestamp)}
                      </p>
                    </div>
                    {selectedPhoto?.id === photo.id && (
                      <Sun size={16} className="text-orange-600" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Manual Date/Time Input */}
        <div className="space-y-3">
          <Label htmlFor="manualDateTime" className="text-sm font-medium text-gray-900 flex items-center gap-2">
            <Calendar size={16} />
            Manual Date & Time (Optional)
          </Label>
          <Input
            id="manualDateTime"
            ref={manualDateTimeRef}
            type="datetime-local"
            value={manualDateTime}
            onChange={handleManualDateTimeChange}
            className="h-10"
            autoComplete="off"
          />
          <p className="text-xs text-gray-500">
            You can manually specify when this ember was created
          </p>
        </div>

        {/* Statistics */}
        {photosWithTimestamp.length > 1 && (
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="text-sm font-medium text-gray-900 mb-2">Photo Timeline</h4>
            <div className="text-xs text-gray-600 space-y-1">
              <p>• Total photos with timestamps: {photosWithTimestamp.length}</p>
              <p>• Earliest: {formatDateTime(Math.min(...photosWithTimestamp.map(p => new Date(p.timestamp))))}</p>
              <p>• Latest: {formatDateTime(Math.max(...photosWithTimestamp.map(p => new Date(p.timestamp))))}</p>
            </div>
          </div>
        )}
      </div>
    )}

    {/* Save Button */}
    <div className="pt-4">
      <Button 
        className="w-full"
        disabled={(!selectedPhoto?.timestamp && !manualDateTime.trim()) || saving}
        onClick={handleSave}
      >
        {saving ? 'Saving...' : 'Save Date & Time'}
      </Button>
    </div>
  </div>
);

export default function TimeDateModal({ isOpen, onClose, ember, isMobile, onRefresh }) {
  const [photos, setPhotos] = useState([]);
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [manualDateTime, setManualDateTime] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  
  const { user } = useStore();
  
  // Use ref to maintain focus and prevent cursor jumping
  const manualDateTimeRef = useRef(null);

  useEffect(() => {
    if (isOpen && ember?.id) {
      fetchEmberPhotos();
    }
  }, [isOpen, ember?.id]);

  // Load existing manual date/time when modal opens
  useEffect(() => {
    if (isOpen) {
      if (ember?.manual_datetime) {
        setManualDateTime(ember.manual_datetime);
      } else if (ember?.ember_timestamp) {
        // Convert timestamp to datetime-local format
        const date = new Date(ember.ember_timestamp);
        const localDateTime = date.toISOString().slice(0, 16);
        setManualDateTime(localDateTime);
      } else {
        setManualDateTime('');
      }
    }
  }, [isOpen, ember?.manual_datetime, ember?.ember_timestamp]);

  const fetchEmberPhotos = async () => {
    setLoading(true);
    try {
      const emberPhotos = await getEmberPhotos(ember.id);
      setPhotos(emberPhotos);
      
      // Auto-select first photo with timestamp
      const photoWithTimestamp = emberPhotos.find(photo => photo.timestamp);
      if (photoWithTimestamp) {
        setSelectedPhoto(photoWithTimestamp);
      }
    } catch (error) {
      console.error('Error fetching ember photos:', error);
    } finally {
      setLoading(false);
    }
  };

  const photosWithTimestamp = photos.filter(photo => photo.timestamp);

  // Handle manual date/time input change with proper focus preservation
  const handleManualDateTimeChange = (e) => {
    setManualDateTime(e.target.value);
  };

  const handleSave = async () => {
    if (!user?.id || !ember?.id) {
      console.error('Missing user or ember ID');
      return;
    }

    // Check if we have date/time data to save
    const hasPhotoTimestamp = selectedPhoto?.timestamp;
    const hasManualDateTime = manualDateTime.trim();
    
    if (!hasPhotoTimestamp && !hasManualDateTime) {
      console.error('No date/time data to save');
      return;
    }

    setSaving(true);
    try {
      let dateTimeData = {};

      if (hasPhotoTimestamp) {
        // Save photo timestamp and camera info, plus manual datetime if provided
        const cameraSettings = {
          iso: selectedPhoto.iso_speed,
          aperture: selectedPhoto.aperture_value,
          shutter_speed: selectedPhoto.shutter_speed,
          focal_length: selectedPhoto.focal_length,
          flash_used: selectedPhoto.flash_used
        };

        dateTimeData = {
          ember_timestamp: selectedPhoto.timestamp,
          camera_make: selectedPhoto.camera_make || null,
          camera_model: selectedPhoto.camera_model || null,
          camera_settings: cameraSettings,
          manual_datetime: hasManualDateTime ? manualDateTime.trim() : null,
          datetime_source: 'photo'
        };
      } else if (hasManualDateTime) {
        // Save only manual datetime
        dateTimeData = {
          ember_timestamp: new Date(manualDateTime).toISOString(),
          camera_make: null,
          camera_model: null,
          camera_settings: null,
          manual_datetime: manualDateTime.trim(),
          datetime_source: 'manual'
        };
      }

      console.log('Saving date/time data:', dateTimeData);

      // Save to database
      await updateEmberDateTime(ember.id, dateTimeData, user.id);
      
      // Refresh parent component to update completion status
      if (onRefresh) {
        await onRefresh();
      }

      console.log('Date & time saved successfully');
      onClose();
    } catch (error) {
      console.error('Error saving date/time:', error);
      // TODO: Show error message to user
    } finally {
      setSaving(false);
    }
  };



  if (isMobile) {
    return (
      <Drawer open={isOpen} onOpenChange={onClose}>
        <DrawerContent className="bg-white focus:outline-none">
          <DrawerHeader className="bg-white">
            <DrawerTitle className="flex items-center gap-2 text-xl font-bold text-gray-900">
              <Calendar className="w-5 h-5 text-orange-600" />
              Time & Date Information
            </DrawerTitle>
            <DrawerDescription className="text-left text-gray-600">
              Timestamp data extracted from your photos
            </DrawerDescription>
          </DrawerHeader>
          <div className="px-4 pb-4 bg-white max-h-[70vh] overflow-y-auto">
            <ModalContent 
              loading={loading}
              selectedPhoto={selectedPhoto}
              photosWithTimestamp={photosWithTimestamp}
              setSelectedPhoto={setSelectedPhoto}
              manualDateTime={manualDateTime}
              handleManualDateTimeChange={handleManualDateTimeChange}
              manualDateTimeRef={manualDateTimeRef}
              handleSave={handleSave}
              saving={saving}
              formatDateTime={formatDateTime}
              getRelativeTime={getRelativeTime}
              formatExposureTime={formatExposureTime}
            />
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[calc(100%-2rem)] max-w-md max-h-[90vh] overflow-y-auto bg-white sm:w-full sm:max-w-md rounded-2xl focus:outline-none">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-bold text-gray-900">
            <Calendar className="w-5 h-5 text-orange-600" />
            Time & Date Information
          </DialogTitle>
          <DialogDescription className="text-gray-600">
            Timestamp data extracted from your photos
          </DialogDescription>
        </DialogHeader>
        <ModalContent 
          loading={loading}
          selectedPhoto={selectedPhoto}
          photosWithTimestamp={photosWithTimestamp}
          setSelectedPhoto={setSelectedPhoto}
          manualDateTime={manualDateTime}
          handleManualDateTimeChange={handleManualDateTimeChange}
          manualDateTimeRef={manualDateTimeRef}
          handleSave={handleSave}
          saving={saving}
          formatDateTime={formatDateTime}
          getRelativeTime={getRelativeTime}
          formatExposureTime={formatExposureTime}
        />
      </DialogContent>
    </Dialog>
  );
} 