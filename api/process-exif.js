import { ExifTool } from 'exiftool-vendored';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { photoId, imageUrl } = req.body;

  if (!photoId || !imageUrl) {
    return res.status(400).json({ error: 'Missing required parameters' });
  }

  let exiftool;

  try {
    // Initialize Supabase client with service role key
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Initialize ExifTool
    exiftool = new ExifTool();

    // Download image from URL and extract EXIF data
    console.log('Processing EXIF data for photo:', photoId);
    const tags = await exiftool.read(imageUrl);

    // Map enhanced EXIF data
    const enhancedData = {
      // Camera and lens information
      camera_make: tags.Make || null,
      camera_model: tags.Model || null,
      lens_model: tags.LensModel || tags.LensInfo || null,
      
      // Shooting parameters
      iso_speed: tags.ISO || null,
      aperture_value: tags.FNumber ? parseFloat(tags.FNumber) : null,
      shutter_speed: tags.ExposureTime || tags.ShutterSpeedValue || null,
      focal_length: tags.FocalLength ? parseFloat(tags.FocalLength) : null,
      flash_used: tags.Flash ? (tags.Flash !== 'No Flash') : null,
      
      // Image dimensions and technical data
      image_width: tags.ImageWidth || tags.ExifImageWidth || null,
      image_height: tags.ImageHeight || tags.ExifImageHeight || null,
      orientation: tags.Orientation || null,
      color_space: tags.ColorSpace || null,
      
      // GPS data with higher precision
      latitude: tags.GPSLatitude || null,
      longitude: tags.GPSLongitude || null,
      altitude: tags.GPSAltitude || null,
      
      // Enhanced timestamp data
      timestamp: tags.DateTimeOriginal || tags.CreateDate || tags.DateTime || null,
      
      // Additional metadata
      file_size: tags.FileSize || null,
      original_filename: tags.FileName || null
    };

    // Convert shutter speed to readable format if it's a number
    if (enhancedData.shutter_speed && typeof enhancedData.shutter_speed === 'number') {
      if (enhancedData.shutter_speed < 1) {
        enhancedData.shutter_speed = `1/${Math.round(1 / enhancedData.shutter_speed)}`;
      } else {
        enhancedData.shutter_speed = enhancedData.shutter_speed.toString();
      }
    }

    // Convert timestamps to ISO format
    if (enhancedData.timestamp && typeof enhancedData.timestamp === 'string') {
      try {
        // Handle EXIF timestamp format: "YYYY:MM:DD HH:MM:SS"
        const isoTimestamp = enhancedData.timestamp
          .replace(/^(\d{4}):(\d{2}):(\d{2})/, '$1-$2-$3')
          .replace(' ', 'T') + 'Z';
        enhancedData.timestamp = new Date(isoTimestamp).toISOString();
      } catch (error) {
        console.warn('Failed to parse timestamp:', enhancedData.timestamp);
        enhancedData.timestamp = null;
      }
    }

    // Remove null values for cleaner update
    const updateData = Object.fromEntries(
      Object.entries(enhancedData).filter(([_, v]) => v !== null)
    );

    // Update photo record in database
    const { data, error } = await supabase
      .from('ember_photos')
      .update(updateData)
      .eq('id', photoId)
      .select()
      .single();

    if (error) {
      console.error('Database update error:', error);
      return res.status(500).json({ error: 'Failed to update photo metadata' });
    }

    console.log('Successfully updated photo metadata:', photoId);

    return res.status(200).json({
      success: true,
      photo: data,
      extractedFields: Object.keys(updateData).length,
      enhancedData: updateData
    });

  } catch (error) {
    console.error('EXIF processing error:', error);
    return res.status(500).json({ 
      error: 'Failed to process EXIF data',
      details: error.message 
    });
  } finally {
    // Always close ExifTool to prevent memory leaks
    if (exiftool) {
      try {
        await exiftool.end();
      } catch (error) {
        console.error('Error closing ExifTool:', error);
      }
    }
  }
} 