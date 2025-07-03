import { supabase } from './supabase';
import { extractExifData, hasGPSData, hasTimestampData } from './exif';

/**
 * Upload image to Supabase storage and save EXIF metadata to database
 * @param {File} file - Image file to upload
 * @param {string} userId - User ID
 * @param {string} emberId - Optional ember ID to associate with
 * @returns {Promise<Object>} - Upload result with photo record
 */
export const uploadImageWithExif = async (file, userId, emberId = null) => {
  try {
    // Extract EXIF data first
    console.log('Extracting EXIF data...');
    const exifData = await extractExifData(file);
    console.log('Extracted EXIF data:', exifData);

    // Generate unique filename
    const timestamp = Date.now();
    const extension = file.name.split('.').pop();
    const filename = `${userId}/${timestamp}_${file.name}`;

    // Upload file to Supabase storage
    console.log('Uploading file to storage...');
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('photos')
      .upload(filename, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      throw uploadError;
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('photos')
      .getPublicUrl(filename);

    const storageUrl = urlData.publicUrl;
    console.log('File uploaded, URL:', storageUrl);

    // Prepare photo record for database
    const photoRecord = {
      user_id: userId,
      ember_id: emberId,
      storage_url: storageUrl,
      timestamp: exifData.timestamp,
      latitude: exifData.latitude,
      longitude: exifData.longitude,
      altitude: exifData.altitude,
      camera_make: exifData.cameraMake,
      camera_model: exifData.cameraModel,
      lens_model: exifData.lensModel,
      iso_speed: exifData.isoSpeed,
      aperture_value: exifData.apertureValue,
      shutter_speed: exifData.shutterSpeed,
      focal_length: exifData.focalLength,
      flash_used: exifData.flashUsed,
      orientation: exifData.orientation,
      original_filename: exifData.originalFilename,
      file_size: exifData.fileSize,
      image_width: exifData.imageWidth,
      image_height: exifData.imageHeight,
      color_space: exifData.colorSpace
    };

    // Save photo metadata to database
    console.log('Saving photo metadata to database...');
    const { data: photoData, error: dbError } = await supabase
      .from('photos')
      .insert([photoRecord])
      .select()
      .single();

    if (dbError) {
      console.error('Database error:', dbError);
      // Try to clean up uploaded file
      await supabase.storage.from('photos').remove([filename]);
      throw dbError;
    }

    console.log('Photo record saved:', photoData);

    // Optionally trigger enhanced EXIF processing via serverless function
    try {
      console.log('Triggering enhanced EXIF processing...');
      const response = await fetch('/api/process-exif', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          photoId: photoData.id,
          imageUrl: storageUrl
        })
      });

      if (response.ok) {
        const enhancedResult = await response.json();
        console.log('Enhanced EXIF processing completed:', enhancedResult.extractedFields, 'fields updated');
        
        // Return the enhanced photo data if available
        return {
          success: true,
          photo: enhancedResult.photo || photoData,
          exifData,
          storageUrl,
          hasGPS: hasGPSData(exifData),
          hasTimestamp: hasTimestampData(exifData),
          enhanced: true,
          enhancedFields: enhancedResult.extractedFields
        };
      } else if (response.status === 404) {
        console.info('Enhanced EXIF processing endpoint not available (development mode) - using client-side data only');
      } else {
        console.warn('Enhanced EXIF processing failed with status:', response.status, '- using client-side data');
      }
    } catch (error) {
      if (error.message.includes('Failed to fetch') || error.message.includes('ERR_ABORTED')) {
        console.info('Enhanced EXIF processing endpoint not available (development mode) - using client-side data only');
      } else {
        console.warn('Enhanced EXIF processing error:', error.message);
      }
    }

    return {
      success: true,
      photo: photoData,
      exifData,
      storageUrl,
      hasGPS: hasGPSData(exifData),
      hasTimestamp: hasTimestampData(exifData),
      enhanced: false
    };

  } catch (error) {
    console.error('Error uploading image with EXIF:', error);
    throw error;
  }
};

/**
 * Get photos for a user
 * @param {string} userId - User ID
 * @param {number} limit - Number of photos to fetch
 * @param {number} offset - Offset for pagination
 * @returns {Promise<Array>} - Array of photo records
 */
export const getUserPhotos = async (userId, limit = 20, offset = 0) => {
  try {
    const { data, error } = await supabase
      .from('photos')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching user photos:', error);
    throw error;
  }
};

/**
 * Get photos for an ember
 * @param {string} emberId - Ember ID
 * @returns {Promise<Array>} - Array of photo records
 */
export const getEmberPhotos = async (emberId) => {
  try {
    const { data, error } = await supabase
      .from('photos')
      .select('*')
      .eq('ember_id', emberId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching ember photos:', error);
    throw error;
  }
};

/**
 * Get photos with GPS data
 * @param {string} userId - User ID
 * @param {number} limit - Number of photos to fetch
 * @returns {Promise<Array>} - Array of photos with GPS coordinates
 */
export const getPhotosWithLocation = async (userId, limit = 50) => {
  try {
    const { data, error } = await supabase
      .from('photos')
      .select('*')
      .eq('user_id', userId)
      .not('latitude', 'is', null)
      .not('longitude', 'is', null)
      .order('timestamp', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching photos with location:', error);
    throw error;
  }
};

/**
 * Get photo by ID
 * @param {string} photoId - Photo ID
 * @returns {Promise<Object>} - Photo record
 */
export const getPhotoById = async (photoId) => {
  try {
    const { data, error } = await supabase
      .from('photos')
      .select('*')
      .eq('id', photoId)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching photo by ID:', error);
    throw error;
  }
};

/**
 * Update photo metadata
 * @param {string} photoId - Photo ID
 * @param {Object} updates - Fields to update
 * @returns {Promise<Object>} - Updated photo record
 */
export const updatePhoto = async (photoId, updates) => {
  try {
    const { data, error } = await supabase
      .from('photos')
      .update(updates)
      .eq('id', photoId)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error updating photo:', error);
    throw error;
  }
};

/**
 * Delete photo and associated file
 * @param {string} photoId - Photo ID
 * @param {string} userId - User ID (for authorization)
 * @returns {Promise<boolean>} - Success status
 */
export const deletePhoto = async (photoId, userId) => {
  try {
    // First get the photo record to get the storage URL
    const photo = await getPhotoById(photoId);
    
    if (!photo || photo.user_id !== userId) {
      throw new Error('Photo not found or unauthorized');
    }

    // Extract filename from storage URL
    const urlParts = photo.storage_url.split('/');
    const filename = urlParts.slice(-2).join('/'); // user_id/filename

    // Delete from storage
    const { error: storageError } = await supabase.storage
      .from('photos')
      .remove([filename]);

    if (storageError) {
      console.error('Storage deletion error:', storageError);
      // Continue with database deletion even if storage fails
    }

    // Delete from database
    const { error: dbError } = await supabase
      .from('photos')
      .delete()
      .eq('id', photoId)
      .eq('user_id', userId);

    if (dbError) throw dbError;

    return true;
  } catch (error) {
    console.error('Error deleting photo:', error);
    throw error;
  }
};

/**
 * Get photos by date range
 * @param {string} userId - User ID
 * @param {string} startDate - Start date (ISO string)
 * @param {string} endDate - End date (ISO string)
 * @returns {Promise<Array>} - Array of photos in date range
 */
export const getPhotosByDateRange = async (userId, startDate, endDate) => {
  try {
    const { data, error } = await supabase
      .from('photos')
      .select('*')
      .eq('user_id', userId)
      .gte('timestamp', startDate)
      .lte('timestamp', endDate)
      .order('timestamp', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching photos by date range:', error);
    throw error;
  }
};

/**
 * Get photos within geographic bounds
 * @param {string} userId - User ID
 * @param {Object} bounds - Geographic bounds {north, south, east, west}
 * @returns {Promise<Array>} - Array of photos within bounds
 */
export const getPhotosInBounds = async (userId, bounds) => {
  try {
    const { north, south, east, west } = bounds;
    
    const { data, error } = await supabase
      .from('photos')
      .select('*')
      .eq('user_id', userId)
      .not('latitude', 'is', null)
      .not('longitude', 'is', null)
      .gte('latitude', south)
      .lte('latitude', north)
      .gte('longitude', west)
      .lte('longitude', east)
      .order('timestamp', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching photos in bounds:', error);
    throw error;
  }
}; 