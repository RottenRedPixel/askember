import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getEmberPhotos } from '@/lib/photos';
import { updateEmberLocation } from '@/lib/database';
import useStore from '@/store';
import { 
  MapPin, 
  Globe, 
  Camera,
  Navigation
} from 'lucide-react';

function formatCoordinates(lat, lng) {
  if (!lat || !lng) return 'Unknown';
  
  const latDir = lat >= 0 ? 'N' : 'S';
  const lngDir = lng >= 0 ? 'E' : 'W';
  
  return `${Math.abs(lat).toFixed(6)}°${latDir}, ${Math.abs(lng).toFixed(6)}°${lngDir}`;
}

async function reverseGeocode(lat, lng) {
  if (!lat || !lng) return null;
  
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
      {
        headers: {
          'User-Agent': 'AskEmber-App'
        }
      }
    );
    
    if (!response.ok) throw new Error('Geocoding failed');
    
    const data = await response.json();
    
    if (data && data.address) {
      const addr = data.address;
      
      // Build a formatted address
      const parts = [];
      
      // Building/POI name
      if (addr.amenity) parts.push(addr.amenity);
      if (addr.shop) parts.push(addr.shop);
      if (addr.building) parts.push(addr.building);
      
      // House number and street
      if (addr.house_number && addr.road) {
        parts.push(`${addr.house_number} ${addr.road}`);
      } else if (addr.road) {
        parts.push(addr.road);
      }
      
      // Neighborhood/Suburb
      if (addr.neighbourhood) parts.push(addr.neighbourhood);
      if (addr.suburb) parts.push(addr.suburb);
      
      const address = parts.slice(0, 3).join(', '); // Limit to first 3 parts
      
      const city = addr.city || addr.town || addr.village || addr.municipality;
      const state = addr.state;
      const country = addr.country;
      
      return {
        address: address || 'Address not available',
        city: city || 'Unknown city',
        state: state || '',
        country: country || 'Unknown country',
        fullAddress: data.display_name
      };
    }
    
    return null;
  } catch (error) {
    console.error('Reverse geocoding error:', error);
    return null;
  }
}

// Extract ModalContent to prevent re-mounting on every render
const ModalContent = ({ 
  loading,
  selectedPhoto,
  photosWithLocation,
  setSelectedPhoto,
  manualLocation,
  manualLocationRef,
  handleManualLocationChange,
  onSave,
  locationInfo,
  loadingGeocode,
  saving
}) => (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="text-center">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Location Information</h3>
        <p className="text-sm text-gray-600">
          Location data extracted from image GPS metadata
        </p>
      </div>

      {loading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-sm text-gray-500 mt-2">Loading location data...</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Current Location Display */}
          {selectedPhoto?.latitude && selectedPhoto?.longitude ? (
            <Card className="border-blue-200 bg-blue-50">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <MapPin size={20} className="text-blue-600 mt-0.5" />
                  <div className="flex-1">
                    <h4 className="font-medium text-blue-900 mb-1">Photo Location</h4>
                    <p className="text-sm text-blue-800 mb-1">
                      {formatCoordinates(selectedPhoto.latitude, selectedPhoto.longitude)}
                    </p>
                    
                    {loadingGeocode ? (
                      <div className="flex items-center gap-2 text-xs text-blue-600">
                        <div className="w-3 h-3 border border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                        Loading address...
                      </div>
                    ) : locationInfo ? (
                      <div className="space-y-1">
                        <p className="text-xs text-blue-700 font-medium">
                          {locationInfo.address}
                        </p>
                        <p className="text-xs text-blue-600">
                          {locationInfo.city}{locationInfo.state ? `, ${locationInfo.state}` : ''} • {locationInfo.country}
                        </p>
                      </div>
                    ) : (
                      <p className="text-xs text-blue-700">
                        Address information not available
                      </p>
                    )}
                    
                    {/* Camera Info */}
                    {(selectedPhoto.camera_make || selectedPhoto.camera_model) && (
                      <div className="mt-3 pt-3 border-t border-blue-200">
                        <div className="flex items-center gap-2 mb-2">
                          <Camera size={16} className="text-blue-600" />
                          <span className="text-sm font-medium text-blue-900">Photo Details</span>
                        </div>
                        <div className="space-y-1 text-xs text-blue-800">
                          {selectedPhoto.camera_make && selectedPhoto.camera_model && (
                            <p><strong>Camera:</strong> {selectedPhoto.camera_make} {selectedPhoto.camera_model}</p>
                          )}
                          {selectedPhoto.original_filename && (
                            <p className="text-blue-700 truncate"><strong>File:</strong> {selectedPhoto.original_filename}</p>
                          )}
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
                <Navigation size={24} className="text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-500">No GPS location data found in uploaded images</p>
              </CardContent>
            </Card>
          )}

          {/* Photos with Location Data */}
          {photosWithLocation.length > 0 && (
            <div className="space-y-3">
              <Label className="text-sm font-medium text-gray-900 flex items-center gap-2">
                <MapPin size={16} />
                Photos with Location Data ({photosWithLocation.length})
              </Label>
              
              <div className="grid grid-cols-1 gap-2 max-h-40 overflow-y-auto">
                {photosWithLocation.map((photo) => (
                  <div
                    key={photo.id}
                    className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                      selectedPhoto?.id === photo.id
                        ? 'border-blue-500 bg-blue-50'
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
                          {formatCoordinates(photo.latitude, photo.longitude)}
                        </p>
                      </div>
                      {selectedPhoto?.id === photo.id && (
                        <Globe size={16} className="text-blue-600" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Manual Location Input - Fixed focus handling */}
          <div className="space-y-3">
            <Label htmlFor="manualLocation" className="text-sm font-medium text-gray-900 flex items-center gap-2">
              <MapPin size={16} />
              Manual Location (Optional)
            </Label>
            <Input
              id="manualLocation"
              ref={manualLocationRef}
              type="text"
              value={manualLocation}
              onChange={handleManualLocationChange}
              placeholder="Enter location name..."
              className="h-10"
              autoComplete="off"
            />
            <p className="text-xs text-gray-500">
              You can manually specify where this ember was created
            </p>
          </div>

          {/* Statistics */}
          {photosWithLocation.length > 1 && (
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="text-sm font-medium text-gray-900 mb-2">Location Overview</h4>
              <div className="text-xs text-gray-600 space-y-1">
                <p>• Total photos with GPS data: {photosWithLocation.length}</p>
                <p>• Different locations detected: {new Set(photosWithLocation.map(p => `${p.latitude},${p.longitude}`)).size}</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Save Button */}
      <div className="pt-4">
        <Button 
          className="w-full"
          disabled={(!(selectedPhoto?.latitude && selectedPhoto?.longitude) && !manualLocation.trim()) || saving}
          onClick={onSave}
        >
          {saving ? 'Saving...' : 'Save Location'}
        </Button>
      </div>
    </div>
  );

export default function LocationModal({ isOpen, onClose, ember, isMobile, onRefresh }) {
  const [photos, setPhotos] = useState([]);
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [manualLocation, setManualLocation] = useState('');
  const [loading, setLoading] = useState(false);
  const [locationInfo, setLocationInfo] = useState(null);
  const [loadingGeocode, setLoadingGeocode] = useState(false);
  const [saving, setSaving] = useState(false);
  
  const { user } = useStore();
  
  // Use ref to maintain focus and prevent cursor jumping
  const manualLocationRef = useRef(null);

  useEffect(() => {
    if (isOpen && ember?.id) {
      fetchEmberPhotos();
    }
  }, [isOpen, ember?.id]);

  // Load existing manual location when modal opens
  useEffect(() => {
    if (isOpen) {
      setManualLocation(ember?.manual_location || '');
      setLocationInfo(null);
    }
  }, [isOpen, ember?.manual_location]);

  // Reverse geocode when selected photo changes
  useEffect(() => {
    if (selectedPhoto?.latitude && selectedPhoto?.longitude) {
      const geocodeLocation = async () => {
        setLoadingGeocode(true);
        try {
          const info = await reverseGeocode(selectedPhoto.latitude, selectedPhoto.longitude);
          setLocationInfo(info);
        } catch (error) {
          console.error('Failed to geocode location:', error);
          setLocationInfo(null);
        } finally {
          setLoadingGeocode(false);
        }
      };
      
      geocodeLocation();
    } else {
      setLocationInfo(null);
    }
  }, [selectedPhoto]);

  const fetchEmberPhotos = async () => {
    setLoading(true);
    try {
      const emberPhotos = await getEmberPhotos(ember.id);
      setPhotos(emberPhotos);
      
      // Auto-select first photo with GPS coordinates
      const photoWithLocation = emberPhotos.find(photo => photo.latitude && photo.longitude);
      if (photoWithLocation) {
        setSelectedPhoto(photoWithLocation);
      }
    } catch (error) {
      console.error('Error fetching ember photos:', error);
    } finally {
      setLoading(false);
    }
  };

  const photosWithLocation = photos.filter(photo => photo.latitude && photo.longitude);

  // Handle manual location input change with proper focus preservation
  const handleManualLocationChange = (e) => {
    setManualLocation(e.target.value);
  };

  // Handle photo selection (will trigger geocoding via useEffect)
  const handlePhotoSelection = (photo) => {
    setSelectedPhoto(photo);
  };

  const handleSave = async () => {
    if (!user?.id || !ember?.id) {
      console.error('Missing user or ember ID');
      return;
    }

    // Check if we have location data to save
    const hasPhotoLocation = selectedPhoto?.latitude && selectedPhoto?.longitude;
    const hasManualLocation = manualLocation.trim();
    
    if (!hasPhotoLocation && !hasManualLocation) {
      console.error('No location data to save');
      return;
    }

    setSaving(true);
    try {
      let locationData = {};

      if (hasPhotoLocation) {
        // Save GPS coordinates, address info, and manual location if provided
        locationData = {
          latitude: selectedPhoto.latitude,
          longitude: selectedPhoto.longitude,
          altitude: selectedPhoto.altitude || null,
          address: locationInfo?.address || null,
          city: locationInfo?.city || null,
          state: locationInfo?.state || null,
          country: locationInfo?.country || null,
          manual_location: hasManualLocation ? manualLocation.trim() : null,
          location_source: 'photo'
        };
      } else if (hasManualLocation) {
        // Save only manual location
        locationData = {
          latitude: null,
          longitude: null,
          altitude: null,
          address: null,
          city: null,
          state: null,
          country: null,
          manual_location: manualLocation.trim(),
          location_source: 'manual'
        };
      }

      console.log('Saving location data:', locationData);

      // Save to database
      await updateEmberLocation(ember.id, locationData, user.id);
      
      // Refresh parent component to update completion status
      if (onRefresh) {
        await onRefresh();
      }

      console.log('Location saved successfully');
      onClose();
    } catch (error) {
      console.error('Error saving location:', error);
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
              <MapPin className="w-5 h-5 text-blue-600" />
              Location Information
            </DrawerTitle>
            <DrawerDescription className="text-left text-gray-600">
              GPS location data extracted from your photos
            </DrawerDescription>
          </DrawerHeader>
          <div className="px-4 pb-4 bg-white max-h-[70vh] overflow-y-auto">
            <ModalContent 
              loading={loading}
              selectedPhoto={selectedPhoto}
              photosWithLocation={photosWithLocation}
              setSelectedPhoto={handlePhotoSelection}
              manualLocation={manualLocation}
              manualLocationRef={manualLocationRef}
              handleManualLocationChange={handleManualLocationChange}
              onSave={handleSave}
              locationInfo={locationInfo}
              loadingGeocode={loadingGeocode}
              saving={saving}
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
            <MapPin className="w-5 h-5 text-blue-600" />
            Location Information
          </DialogTitle>
          <DialogDescription className="text-gray-600">
            GPS location data extracted from your photos
          </DialogDescription>
        </DialogHeader>
        <ModalContent 
          loading={loading}
          selectedPhoto={selectedPhoto}
          photosWithLocation={photosWithLocation}
          setSelectedPhoto={handlePhotoSelection}
          manualLocation={manualLocation}
          manualLocationRef={manualLocationRef}
          handleManualLocationChange={handleManualLocationChange}
          onSave={handleSave}
          locationInfo={locationInfo}
          loadingGeocode={loadingGeocode}
          saving={saving}
        />
      </DialogContent>
    </Dialog>
  );
} 