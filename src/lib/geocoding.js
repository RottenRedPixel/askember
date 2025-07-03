/**
 * Reverse geocode coordinates to get address information
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 * @returns {Promise<Object|null>} - Address information or null if failed
 */
export const reverseGeocode = async (lat, lng) => {
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
};

/**
 * Auto-update ember with location and timestamp data from EXIF
 * @param {Object} ember - Ember record
 * @param {Object} photoResult - Result from uploadImageWithExif
 * @param {string} userId - User ID
 */
export const autoUpdateEmberFromExif = async (ember, photoResult, userId) => {
  if (!ember || !photoResult || !userId) return;
  
  try {
    // Import database functions
    const { updateEmberLocation, updateEmberDateTime } = await import('./database');
    
    const { photo, exifData, hasGPS, hasTimestamp } = photoResult;
    
    // Auto-update location if GPS data is available
    if (hasGPS && photo.latitude && photo.longitude) {
      console.log('📍 Auto-updating ember location from GPS data...');
      
      try {
        // Get address information via reverse geocoding
        const locationInfo = await reverseGeocode(photo.latitude, photo.longitude);
        
        const locationData = {
          latitude: photo.latitude,
          longitude: photo.longitude,
          altitude: photo.altitude || null,
          address: locationInfo?.address || null,
          city: locationInfo?.city || null,
          state: locationInfo?.state || null,
          country: locationInfo?.country || null,
          location_source: 'photo'
        };
        
        await updateEmberLocation(ember.id, locationData, userId);
        console.log('✅ Location auto-updated successfully');
      } catch (error) {
        console.warn('⚠️ Failed to auto-update location:', error);
      }
    }
    
    // Auto-update timestamp if available
    if (hasTimestamp && photo.timestamp) {
      console.log('🕐 Auto-updating ember timestamp from photo data...');
      
      try {
        // Prepare camera settings
        const cameraSettings = {
          iso: photo.iso_speed,
          aperture: photo.aperture_value,
          shutter_speed: photo.shutter_speed,
          focal_length: photo.focal_length,
          flash_used: photo.flash_used
        };
        
        const dateTimeData = {
          ember_timestamp: photo.timestamp,
          camera_make: photo.camera_make || null,
          camera_model: photo.camera_model || null,
          camera_settings: cameraSettings,
          datetime_source: 'photo'
        };
        
        await updateEmberDateTime(ember.id, dateTimeData, userId);
        console.log('✅ Timestamp auto-updated successfully');
      } catch (error) {
        console.warn('⚠️ Failed to auto-update timestamp:', error);
      }
    }
    
    if (hasGPS || hasTimestamp) {
      console.log('🎯 Ember auto-updated with EXIF data');
    }
    
  } catch (error) {
    console.error('Failed to auto-update ember from EXIF:', error);
    // Don't throw - this is a background enhancement
  }
}; 