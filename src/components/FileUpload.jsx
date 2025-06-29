import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { uploadToBlob, validateFile, getFileCategory } from '@/lib/storage';
import useStore from '@/store';

export default function FileUpload({ 
  title = "File Upload",
  acceptedTypes = ['image/*', 'audio/*'],
  maxSize = 50 * 1024 * 1024, // 50MB
  onUploadSuccess,
  onUploadError 
}) {
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const { user } = useStore();

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    setUploading(true);
    setMessage({ type: '', text: '' });

    try {
      const results = [];

      for (const file of files) {
        // Validate file
        validateFile(file, {
          maxSize,
          allowedTypes: acceptedTypes
        });

        // Get file category for folder organization
        const folder = getFileCategory(file.type);

        // Upload to Vercel Blob
        const result = await uploadToBlob(file, folder, user.id);
        
        results.push({
          ...result,
          originalName: file.name,
          size: file.size,
          type: file.type,
          category: folder
        });
      }

      setUploadedFiles(prev => [...prev, ...results]);
      setMessage({ 
        type: 'success', 
        text: `Successfully uploaded ${results.length} file(s)` 
      });

      // Call success callback if provided
      if (onUploadSuccess) {
        onUploadSuccess(results);
      }

    } catch (error) {
      const errorMessage = error.message || 'Upload failed';
      setMessage({ type: 'error', text: errorMessage });
      
      // Call error callback if provided
      if (onUploadError) {
        onUploadError(error);
      }
    } finally {
      setUploading(false);
      // Reset file input
      e.target.value = '';
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getAcceptString = () => {
    return acceptedTypes.join(',');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        
        {/* File Input */}
        <div>
          <input
            type="file"
            accept={getAcceptString()}
            onChange={handleFileUpload}
            disabled={uploading}
            multiple
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          />
          <p className="text-xs text-gray-500 mt-1">
            Max size: {Math.round(maxSize / 1024 / 1024)}MB | 
            Types: {acceptedTypes.join(', ')}
          </p>
        </div>

        {/* Upload Button */}
        <Button 
          onClick={() => document.querySelector('input[type="file"]').click()}
          disabled={uploading}
          className="w-full"
          size="lg"
          variant="blue"
        >
          {uploading ? 'Uploading...' : 'Choose Files'}
        </Button>

        {/* Message */}
        {message.text && (
          <Alert className={message.type === 'error' ? 'border-red-200 bg-red-50' : 'border-green-200 bg-green-50'}>
            <AlertDescription className={message.type === 'error' ? 'text-red-800' : 'text-green-800'}>
              {message.text}
            </AlertDescription>
          </Alert>
        )}

        {/* Uploaded Files List */}
        {uploadedFiles.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-medium">Uploaded Files:</h4>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {uploadedFiles.map((file, index) => (
                <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {file.originalName}
                    </p>
                    <p className="text-xs text-gray-500">
                      {formatFileSize(file.size)} • {file.category}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <a
                      href={file.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 text-xs"
                    >
                      View
                    </a>
                    <button
                      onClick={() => navigator.clipboard.writeText(file.url)}
                      className="text-gray-600 hover:text-gray-800 text-xs"
                    >
                      Copy URL
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
} 