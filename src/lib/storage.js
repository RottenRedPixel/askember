import { put, del, list } from '@vercel/blob';

/**
 * Upload a file to Vercel Blob storage
 * @param {File} file - The file to upload
 * @param {string} folder - The folder to upload to (e.g., 'audio', 'images')
 * @param {string} userId - The user ID for organizing files
 * @returns {Promise<{url: string, pathname: string}>}
 */
export const uploadToBlob = async (file, folder, userId) => {
  try {
    // Generate a unique filename
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2, 15);
    const fileExtension = file.name.split('.').pop();
    const filename = `${folder}/${userId}/${timestamp}-${randomId}.${fileExtension}`;

    // Upload directly to Vercel Blob
    const blob = await put(filename, file, {
      access: 'public',
      token: import.meta.env.VITE_BLOB_READ_WRITE_TOKEN, // We'll set this in .env
    });

    return {
      url: blob.url,
      pathname: blob.pathname,
      filename: filename
    };
  } catch (error) {
    console.error('Blob upload error:', error);
    throw new Error(`Upload failed: ${error.message}`);
  }
};

/**
 * Delete a file from Vercel Blob storage
 * @param {string} url - The blob URL to delete
 * @returns {Promise<void>}
 */
export const deleteFromBlob = async (url) => {
  try {
    await del(url);
  } catch (error) {
    console.error('Blob delete error:', error);
    throw new Error(`Delete failed: ${error.message}`);
  }
};

/**
 * List files in a folder
 * @param {string} prefix - The folder prefix to list
 * @returns {Promise<Array>}
 */
export const listBlobFiles = async (prefix) => {
  try {
    const { blobs } = await list({ prefix });
    return blobs;
  } catch (error) {
    console.error('Blob list error:', error);
    throw new Error(`List failed: ${error.message}`);
  }
};

/**
 * Validate file for upload
 * @param {File} file - The file to validate
 * @param {Object} options - Validation options
 * @returns {boolean}
 */
export const validateFile = (file, options = {}) => {
  const {
    maxSize = 50 * 1024 * 1024, // 50MB default
    allowedTypes = ['image/*', 'audio/*', 'video/*'],
    allowedExtensions = []
  } = options;

  // Check file size
  if (file.size > maxSize) {
    throw new Error(`File size must be less than ${Math.round(maxSize / 1024 / 1024)}MB`);
  }

  // Check file type
  const isTypeAllowed = allowedTypes.some(type => {
    if (type.endsWith('/*')) {
      return file.type.startsWith(type.slice(0, -1));
    }
    return file.type === type;
  });

  if (!isTypeAllowed && allowedExtensions.length > 0) {
    const fileExtension = file.name.split('.').pop().toLowerCase();
    const isExtensionAllowed = allowedExtensions.includes(fileExtension);
    if (!isExtensionAllowed) {
      throw new Error(`File type not allowed. Allowed types: ${allowedTypes.join(', ')}`);
    }
  } else if (!isTypeAllowed) {
    throw new Error(`File type not allowed. Allowed types: ${allowedTypes.join(', ')}`);
  }

  return true;
};

/**
 * Get file type category
 * @param {string} mimeType - The MIME type
 * @returns {string} - 'image', 'audio', 'video', or 'other'
 */
export const getFileCategory = (mimeType) => {
  if (mimeType.startsWith('image/')) return 'images';
  if (mimeType.startsWith('audio/')) return 'audio';
  if (mimeType.startsWith('video/')) return 'video';
  return 'other';
};

/**
 * Get Vercel Blob storage usage statistics
 * Note: This function has CORS limitations in development
 * @returns {Promise<Object>} Storage usage data
 */
export const getStorageUsage = async () => {
  try {
    // Check if we're in development
    const isDev = import.meta.env.MODE === 'development' || window.location.hostname === 'localhost';
    
    if (isDev) {
      // In development, we can't call the Vercel Blob API directly due to CORS
      // Return mock data with instructions
      return {
        isDevelopment: true,
        message: "Storage usage can't be checked in development due to CORS restrictions",
        instructions: [
          "To check storage usage:",
          "1. Go to https://vercel.com/dashboard",
          "2. Navigate to your project",
          "3. Go to Storage → Blob",
          "4. View usage statistics there"
        ],
        alternativeInfo: {
          note: "This feature works in production where CORS restrictions don't apply",
          deployedUrl: "Check storage usage on your deployed app"
        }
      };
    }

    // Check if token is available
    const token = import.meta.env.VITE_BLOB_READ_WRITE_TOKEN;
    if (!token) {
      return {
        error: "Missing Token",
        message: "VITE_BLOB_READ_WRITE_TOKEN environment variable is not set",
        instructions: [
          "1. Get your token from https://vercel.com/dashboard/stores/blob",
          "2. Add VITE_BLOB_READ_WRITE_TOKEN to your .env.local file",
          "3. Restart your development server"
        ]
      };
    }

    // List all blobs to calculate usage (production only)
    const { blobs } = await list({
      token: token,
    });

    // Calculate statistics
    const stats = {
      totalFiles: blobs.length,
      totalSize: 0,
      filesByType: {
        images: { count: 0, size: 0 },
        audio: { count: 0, size: 0 },
        video: { count: 0, size: 0 },
        other: { count: 0, size: 0 }
      },
      filesByUser: {},
      recentFiles: []
    };

    // Process each blob
    blobs.forEach(blob => {
      stats.totalSize += blob.size;
      
      // Categorize by type
      const category = getFileCategory(blob.contentType || '');
      stats.filesByType[category].count++;
      stats.filesByType[category].size += blob.size;
      
      // Extract user ID from pathname (format: category/userId/filename)
      const pathParts = blob.pathname.split('/');
      if (pathParts.length >= 2) {
        const userId = pathParts[1];
        if (!stats.filesByUser[userId]) {
          stats.filesByUser[userId] = { count: 0, size: 0 };
        }
        stats.filesByUser[userId].count++;
        stats.filesByUser[userId].size += blob.size;
      }
      
      // Add to recent files (last 10)
      stats.recentFiles.push({
        pathname: blob.pathname,
        size: blob.size,
        contentType: blob.contentType,
        uploadedAt: blob.uploadedAt,
        url: blob.url
      });
    });

    // Sort recent files by upload date
    stats.recentFiles.sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt));
    stats.recentFiles = stats.recentFiles.slice(0, 10);

    return stats;
  } catch (error) {
    console.error('Storage usage error:', error);
    
    // Check if it's a CORS error
    if (error.message.includes('CORS') || error.message.includes('fetch')) {
      return {
        isDevelopment: true,
        error: "CORS Error in Development",
        message: "Storage usage can't be checked in development due to browser security restrictions",
        instructions: [
          "To check storage usage:",
          "1. Deploy your app to production",
          "2. Use the Storage Usage feature on the deployed app",
          "3. Or check directly in Vercel Dashboard → Storage → Blob"
        ]
      };
    }
    
    throw new Error(`Failed to get storage usage: ${error.message}`);
  }
};

/**
 * Format bytes to human readable format
 * @param {number} bytes - Number of bytes
 * @returns {string} Formatted string
 */
export const formatBytes = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}; 