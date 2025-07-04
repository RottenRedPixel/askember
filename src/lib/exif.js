import PIEXIF from 'piexifjs';

/**
 * Detect if user is likely on Android device
 * @returns {boolean} - True if likely Android
 */
const isLikelyAndroid = () => {
  const userAgent = navigator.userAgent.toLowerCase();
  return userAgent.includes('android') || 
         userAgent.includes('chrome') && !userAgent.includes('safari');
};

export { isLikelyAndroid };

/**
 * Extract EXIF data from an image file
 * @param {File} file - Image file to extract EXIF from
 * @returns {Promise<Object>} - Extracted EXIF data
 */
export const extractExifData = async (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const dataURL = e.target.result;
        const exifObj = PIEXIF.load(dataURL);
        
        const extractedData = {
          // File info
          originalFilename: file.name,
          fileSize: file.size,
          
          // Basic image info
          imageWidth: null,
          imageHeight: null,
          
          // Camera info
          cameraMake: null,
          cameraModel: null,
          lensModel: null,
          
          // Shooting settings
          isoSpeed: null,
          apertureValue: null,
          shutterSpeed: null,
          focalLength: null,
          flashUsed: null,
          
          // Location data
          latitude: null,
          longitude: null,
          altitude: null,
          
          // Date/time
          timestamp: null,
          
          // Orientation
          orientation: null,
          
          // Color space
          colorSpace: null
        };

        // Extract GPS data
        if (exifObj.GPS && Object.keys(exifObj.GPS).length > 0) {
          const gps = exifObj.GPS;
          
          // Latitude
          if (gps[PIEXIF.GPSIFD.GPSLatitude] && gps[PIEXIF.GPSIFD.GPSLatitudeRef]) {
            const lat = convertDMSToDD(
              gps[PIEXIF.GPSIFD.GPSLatitude],
              gps[PIEXIF.GPSIFD.GPSLatitudeRef]
            );
            extractedData.latitude = lat;
          }
          
          // Longitude
          if (gps[PIEXIF.GPSIFD.GPSLongitude] && gps[PIEXIF.GPSIFD.GPSLongitudeRef]) {
            const lon = convertDMSToDD(
              gps[PIEXIF.GPSIFD.GPSLongitude],
              gps[PIEXIF.GPSIFD.GPSLongitudeRef]
            );
            extractedData.longitude = lon;
          }
          
          // Altitude
          if (gps[PIEXIF.GPSIFD.GPSAltitude]) {
            const altitudeRational = gps[PIEXIF.GPSIFD.GPSAltitude];
            const altitude = altitudeRational[0] / altitudeRational[1];
            const altitudeRef = gps[PIEXIF.GPSIFD.GPSAltitudeRef] || 0;
            extractedData.altitude = altitudeRef === 1 ? -altitude : altitude;
          }
        }

        // Extract main EXIF data
        if (exifObj['0th']) {
          const zeroth = exifObj['0th'];
          
          // Camera info
          if (zeroth[PIEXIF.ImageIFD.Make]) {
            extractedData.cameraMake = zeroth[PIEXIF.ImageIFD.Make];
          }
          if (zeroth[PIEXIF.ImageIFD.Model]) {
            extractedData.cameraModel = zeroth[PIEXIF.ImageIFD.Model];
          }
          if (zeroth[PIEXIF.ImageIFD.Orientation]) {
            extractedData.orientation = zeroth[PIEXIF.ImageIFD.Orientation];
          }
          if (zeroth[PIEXIF.ImageIFD.ColorSpace]) {
            extractedData.colorSpace = zeroth[PIEXIF.ImageIFD.ColorSpace];
          }
          
          // Image dimensions
          if (zeroth[PIEXIF.ImageIFD.ImageWidth]) {
            extractedData.imageWidth = zeroth[PIEXIF.ImageIFD.ImageWidth];
          }
          if (zeroth[PIEXIF.ImageIFD.ImageLength]) {
            extractedData.imageHeight = zeroth[PIEXIF.ImageIFD.ImageLength];
          }
          
          // Date/time
          if (zeroth[PIEXIF.ImageIFD.DateTime]) {
            extractedData.timestamp = parseExifDateTime(zeroth[PIEXIF.ImageIFD.DateTime]);
          }
        }

        // Extract detailed shooting data
        if (exifObj.Exif) {
          const exif = exifObj.Exif;
          
          // ISO
          if (exif[PIEXIF.ExifIFD.ISOSpeedRatings]) {
            extractedData.isoSpeed = exif[PIEXIF.ExifIFD.ISOSpeedRatings];
          }
          
          // Aperture
          if (exif[PIEXIF.ExifIFD.FNumber]) {
            const fNumber = exif[PIEXIF.ExifIFD.FNumber];
            extractedData.apertureValue = fNumber[0] / fNumber[1];
          }
          
          // Shutter speed
          if (exif[PIEXIF.ExifIFD.ExposureTime]) {
            const exposureTime = exif[PIEXIF.ExifIFD.ExposureTime];
            extractedData.shutterSpeed = `${exposureTime[0]}/${exposureTime[1]}`;
          }
          
          // Focal length
          if (exif[PIEXIF.ExifIFD.FocalLength]) {
            const focalLength = exif[PIEXIF.ExifIFD.FocalLength];
            extractedData.focalLength = focalLength[0] / focalLength[1];
          }
          
          // Flash
          if (exif[PIEXIF.ExifIFD.Flash] !== undefined) {
            extractedData.flashUsed = (exif[PIEXIF.ExifIFD.Flash] & 1) === 1;
          }
          
          // Lens model
          if (exif[PIEXIF.ExifIFD.LensModel]) {
            extractedData.lensModel = exif[PIEXIF.ExifIFD.LensModel];
          }
          
          // Date/time original (more accurate than DateTime)
          if (exif[PIEXIF.ExifIFD.DateTimeOriginal]) {
            extractedData.timestamp = parseExifDateTime(exif[PIEXIF.ExifIFD.DateTimeOriginal]);
          }
          
          // Image dimensions from EXIF
          if (exif[PIEXIF.ExifIFD.PixelXDimension]) {
            extractedData.imageWidth = exif[PIEXIF.ExifIFD.PixelXDimension];
          }
          if (exif[PIEXIF.ExifIFD.PixelYDimension]) {
            extractedData.imageHeight = exif[PIEXIF.ExifIFD.PixelYDimension];
          }
        }

        resolve(extractedData);
      } catch (error) {
        const isAndroid = isLikelyAndroid();
        console.error('Error extracting EXIF data:', error);
        
        if (isAndroid) {
          console.warn('🤖 Android device detected - EXIF extraction failed, possibly due to privacy settings');
          console.info('💡 Fallback: Will attempt browser geolocation if available');
        }
        
        // Return basic file info even if EXIF extraction fails
        resolve({
          originalFilename: file.name,
          fileSize: file.size,
          timestamp: new Date().toISOString(),
          latitude: null,
          longitude: null,
          altitude: null,
          cameraMake: null,
          cameraModel: null,
          lensModel: null,
          isoSpeed: null,
          apertureValue: null,
          shutterSpeed: null,
          focalLength: null,
          flashUsed: null,
          orientation: null,
          imageWidth: null,
          imageHeight: null,
          colorSpace: null,
          locationSource: 'none',
          extractionError: isAndroid ? 'android_privacy_likely' : 'generic_error'
        });
      }
    };
    
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
};

/**
 * Convert GPS coordinates from degrees/minutes/seconds to decimal degrees
 * @param {Array} dmsArray - [degrees, minutes, seconds] as rational numbers
 * @param {string} ref - Reference direction (N, S, E, W)
 * @returns {number} - Decimal degrees
 */
const convertDMSToDD = (dmsArray, ref) => {
  if (!dmsArray || dmsArray.length !== 3) return null;
  
  const degrees = dmsArray[0][0] / dmsArray[0][1];
  const minutes = dmsArray[1][0] / dmsArray[1][1];
  const seconds = dmsArray[2][0] / dmsArray[2][1];
  
  let dd = degrees + minutes / 60 + seconds / 3600;
  
  // Make negative for South latitude or West longitude
  if (ref === 'S' || ref === 'W') {
    dd = -dd;
  }
  
  return dd;
};

/**
 * Parse EXIF date/time string to ISO 8601 format
 * @param {string} exifDateTime - EXIF date/time string (YYYY:MM:DD HH:MM:SS)
 * @returns {string} - ISO 8601 formatted date string
 */
const parseExifDateTime = (exifDateTime) => {
  if (!exifDateTime) return null;
  
  try {
    // EXIF format: "YYYY:MM:DD HH:MM:SS"
    const parts = exifDateTime.split(' ');
    if (parts.length !== 2) return null;
    
    const datePart = parts[0].replace(/:/g, '-');
    const timePart = parts[1];
    
    const isoString = `${datePart}T${timePart}`;
    const date = new Date(isoString);
    
    return date.toISOString();
  } catch (error) {
    console.error('Error parsing EXIF date:', error);
    return null;
  }
};

/**
 * Check if file has GPS coordinates
 * @param {Object} exifData - Extracted EXIF data
 * @returns {boolean} - True if GPS coordinates are available
 */
export const hasGPSData = (exifData) => {
  return exifData && 
         exifData.latitude !== null && 
         exifData.longitude !== null &&
         !isNaN(exifData.latitude) && 
         !isNaN(exifData.longitude);
};

/**
 * Check if file has timestamp data
 * @param {Object} exifData - Extracted EXIF data
 * @returns {boolean} - True if timestamp is available
 */
export const hasTimestampData = (exifData) => {
  return exifData && exifData.timestamp !== null;
};

/**
 * Format coordinates for display
 * @param {number} lat - Latitude
 * @param {number} lon - Longitude
 * @returns {string} - Formatted coordinate string
 */
export const formatCoordinates = (lat, lon) => {
  if (lat === null || lon === null) return 'No location data';
  
  const latDirection = lat >= 0 ? 'N' : 'S';
  const lonDirection = lon >= 0 ? 'E' : 'W';
  
  return `${Math.abs(lat).toFixed(6)}°${latDirection}, ${Math.abs(lon).toFixed(6)}°${lonDirection}`;
}; 

/**
 * Get current location using browser geolocation API
 * Fallback for when EXIF GPS data is missing (common on Android)
 * @returns {Promise<Object>} - Location data or null
 */
export const getCurrentLocation = async () => {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      console.warn('Geolocation not supported by browser');
      resolve(null);
      return;
    }

    const options = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 300000 // 5 minutes
    };

    navigator.geolocation.getCurrentPosition(
      (position) => {
        console.log('✅ Browser geolocation successful');
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          altitude: position.coords.altitude,
          accuracy: position.coords.accuracy,
          source: 'browser_geolocation'
        });
      },
      (error) => {
        console.warn('❌ Browser geolocation failed:', error.message);
        resolve(null);
      },
      options
    );
  });
};

/**
 * Enhanced EXIF extraction with browser geolocation fallback
 * @param {File} file - Image file to extract EXIF from
 * @param {boolean} useLocationFallback - Whether to use browser geolocation if EXIF GPS is missing
 * @returns {Promise<Object>} - Extracted EXIF data with potential location fallback
 */
export const extractExifDataWithLocationFallback = async (file, useLocationFallback = true) => {
  // First, try normal EXIF extraction
  const exifData = await extractExifData(file);
  
  // If GPS data is missing and fallback is enabled, try browser geolocation
  if (useLocationFallback && (!exifData.latitude || !exifData.longitude)) {
    console.log('📍 EXIF GPS data missing, attempting browser geolocation fallback...');
    
    const browserLocation = await getCurrentLocation();
    if (browserLocation) {
      console.log('✅ Using browser geolocation as fallback');
      return {
        ...exifData,
        latitude: browserLocation.latitude,
        longitude: browserLocation.longitude,
        altitude: browserLocation.altitude || exifData.altitude,
        locationSource: browserLocation.source,
        locationAccuracy: browserLocation.accuracy
      };
    }
  }
  
  return {
    ...exifData,
    locationSource: exifData.latitude ? 'exif_gps' : 'none'
  };
}; 



/**
 * Get user-friendly location source explanation
 * @param {string} locationSource - Source of location data
 * @param {boolean} isAndroid - Whether user is on Android
 * @returns {Object} - User-friendly explanation
 */
export const getLocationSourceInfo = (locationSource, isAndroid = false) => {
  switch (locationSource) {
    case 'exif_gps':
      return {
        icon: '📷',
        title: 'Photo GPS Data',
        description: 'Location extracted from photo metadata',
        accuracy: 'High'
      };
    case 'browser_geolocation':
      return {
        icon: '🌐',
        title: 'Browser Location',
        description: isAndroid 
          ? 'Used current location (Android privacy may strip photo GPS)' 
          : 'Used current location as fallback',
        accuracy: 'Medium'
      };
    case 'none':
    default:
      return {
        icon: '❌',
        title: 'No Location Data',
        description: isAndroid 
          ? 'Android privacy settings may have removed GPS data. Try using camera directly.' 
          : 'No GPS data available in photo',
        accuracy: 'None'
      };
  }
}; 