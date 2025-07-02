import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { uploadToBlob, validateFile, getFileCategory } from '@/lib/storage';
import { saveEmberSupportingMedia, getEmberSupportingMedia, deleteEmberSupportingMedia } from '@/lib/database';
import useStore from '@/store';
import { 
  Upload, 
  Image, 
  Music, 
  File,
  X, 
  CheckCircle2,
  AlertCircle,
  Plus,
  Trash2,
  ExternalLink,
  Copy
} from 'lucide-react';

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

const ModalContent = ({ 
  ember,
  dragActive,
  handleDrag,
  handleDrop,
  handleFileSelect,
  uploading,
  message,
  uploadedFiles,
  handleRemoveFile,
  formatFileSize,
  getFileIcon,
  handleSaveToWiki,
  saving,
  existingMedia,
  loadingExisting,
  handleDeleteExistingMedia
}) => (
  <div className="space-y-6">
    {/* Header Info */}
    <div className="text-center">
      <h3 className="text-lg font-semibold text-gray-900 mb-2">Supporting Media</h3>
      <p className="text-sm text-gray-600">
        Add images and audio clips that support the story of this ember
      </p>
    </div>

    {/* Existing Media */}
    {(existingMedia.length > 0 || loadingExisting) && (
      <Card className="border-gray-200">
        <CardContent className="p-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-gray-900">Current Media</h4>
              {existingMedia.length > 0 && (
                <Badge variant="outline" className="text-xs">
                  {existingMedia.length} file{existingMedia.length !== 1 ? 's' : ''}
                </Badge>
              )}
            </div>
            
            {loadingExisting ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-600"></div>
                <span className="ml-2 text-sm text-gray-600">Loading existing media...</span>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {existingMedia.map((media, index) => {
                  const IconComponent = getFileIcon(media.file_type);
                  const isImage = media.file_category === 'image';
                  
                  return (
                    <div key={media.id || index} className="relative group">
                      <div className="aspect-square rounded-lg overflow-hidden bg-gray-100 border border-gray-200">
                        {isImage ? (
                          <img 
                            src={media.file_url} 
                            alt={media.file_name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gray-50">
                            <div className="text-center">
                              <IconComponent className="w-8 h-8 mx-auto mb-2 text-gray-600" />
                              <p className="text-xs font-medium text-gray-700 px-2 text-center line-clamp-2">
                                {media.file_name}
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                      
                      {/* Overlay on hover */}
                      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all duration-200 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100">
                        <div className="flex items-center gap-2">
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => window.open(media.file_url, '_blank')}
                            className="h-8 w-8 p-0 bg-white hover:bg-gray-100"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDeleteExistingMedia(media.id)}
                            className="h-8 w-8 p-0"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                      
                      {/* File info */}
                      <div className="mt-2">
                        <p className="text-xs font-medium text-gray-900 truncate" title={media.file_name}>
                          {media.file_name}
                        </p>
                        <div className="flex items-center gap-1 text-xs text-gray-500">
                          <span className="capitalize">{media.file_category}</span>
                          <span>•</span>
                          <span>{formatFileSize(media.file_size)}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    )}

    {/* Message */}
    {message.text && (
      <Alert className={`${message.type === 'error' ? 'border-red-200 bg-red-50' : 'border-green-200 bg-green-50'}`}>
        <AlertDescription className={`${message.type === 'error' ? 'text-red-800' : 'text-green-800'}`}>
          {message.text}
        </AlertDescription>
      </Alert>
    )}

    {/* Upload Area */}
    <Card className="border-gray-200">
      <CardContent className="p-6">
        <div
          className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200 ${
            dragActive 
              ? 'border-blue-500 bg-blue-50' 
              : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <input
            type="file"
            accept="image/*,audio/*"
            onChange={handleFileSelect}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            multiple
            disabled={uploading}
          />
          <div className="space-y-4">
            <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
              <Upload className="w-8 h-8 text-gray-400" />
            </div>
            <div className="space-y-2">
              <p className="text-lg font-medium text-gray-900">
                Drop your files here, or <span className="text-blue-600">browse</span>
              </p>
              <p className="text-sm text-gray-500">
                Supports images (JPG, PNG, GIF, WebP) and audio (MP3, WAV, M4A) up to 50MB each
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>

    {/* Uploaded Files */}
    {uploadedFiles.length > 0 && (
      <Card className="border-gray-200">
        <CardContent className="p-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-gray-900">Uploaded Media</h4>
              <Badge variant="secondary" className="text-xs">
                {uploadedFiles.length} file{uploadedFiles.length !== 1 ? 's' : ''}
              </Badge>
            </div>
            
            <div className="space-y-3 max-h-60 overflow-y-auto">
              {uploadedFiles.map((file, index) => {
                const IconComponent = getFileIcon(file.type);
                return (
                  <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <div className="flex-shrink-0">
                      <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center border">
                        <IconComponent className="w-5 h-5 text-gray-600" />
                      </div>
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {file.originalName}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <span>{formatFileSize(file.size)}</span>
                        <span>•</span>
                        <span className="capitalize">{file.category}</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => window.open(file.url, '_blank')}
                        className="h-8 w-8 p-0"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigator.clipboard.writeText(file.url)}
                        className="h-8 w-8 p-0"
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveFile(index)}
                        className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>
    )}

    {/* Save to Wiki Media Button */}
    {uploadedFiles.length > 0 && (
      <div className="pt-4 border-t border-gray-200">
        <Button 
          className="w-full bg-blue-600 hover:bg-blue-700 text-white"
          disabled={saving || uploading}
          onClick={handleSaveToWiki}
        >
          {saving ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
              Saving to Wiki Media...
            </>
          ) : (
            <>
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Save {uploadedFiles.length} file{uploadedFiles.length !== 1 ? 's' : ''} to Wiki Media
            </>
          )}
        </Button>
      </div>
    )}

    {/* Upload Status */}
    {uploading && (
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
            <div>
              <p className="font-medium text-blue-900">Uploading files...</p>
              <p className="text-sm text-blue-700">Please wait while we process your media</p>
            </div>
          </div>
        </CardContent>
      </Card>
    )}
  </div>
);

export default function SupportingMediaModal({ isOpen, onClose, ember, onUpdate }) {
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [existingMedia, setExistingMedia] = useState([]);
  const [loadingExisting, setLoadingExisting] = useState(false);
  
  const { user } = useStore();
  const isMobile = useMediaQuery("(max-width: 768px)");

  // Fetch existing media when modal opens, clear state when modal closes
  useEffect(() => {
    if (isOpen && ember?.id) {
      fetchExistingMedia();
    } else if (!isOpen) {
      setMessage({ type: '', text: '' });
      setDragActive(false);
      setExistingMedia([]);
    }
  }, [isOpen, ember?.id]);

  const fetchExistingMedia = async () => {
    if (!ember?.id) return;
    
    setLoadingExisting(true);
    try {
      const media = await getEmberSupportingMedia(ember.id);
      console.log('Existing supporting media:', media);
      setExistingMedia(media || []);
    } catch (error) {
      console.error('Error fetching existing media:', error);
      setExistingMedia([]);
    } finally {
      setLoadingExisting(false);
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(Array.from(e.dataTransfer.files));
    }
  };

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    handleFiles(files);
    // Reset input value so same file can be selected again
    e.target.value = '';
  };

  const handleFiles = async (files) => {
    if (files.length === 0) return;

    setUploading(true);
    setMessage({ type: '', text: '' });

    try {
      const results = [];
      const errors = [];

      for (const file of files) {
        try {
          // Validate file
          validateFile(file, {
            maxSize: 50 * 1024 * 1024, // 50MB
            allowedTypes: ['image/*', 'audio/*']
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
        } catch (fileError) {
          errors.push(`${file.name}: ${fileError.message}`);
        }
      }

      if (results.length > 0) {
        setUploadedFiles(prev => [...prev, ...results]);
        
        if (errors.length === 0) {
          setMessage({ 
            type: 'success', 
            text: `Successfully uploaded ${results.length} file${results.length !== 1 ? 's' : ''}!` 
          });
        } else {
          setMessage({ 
            type: 'success', 
            text: `Uploaded ${results.length} file${results.length !== 1 ? 's' : ''}. ${errors.length} failed: ${errors.join(', ')}` 
          });
        }

        // Call onUpdate if provided to refresh parent component
        if (onUpdate) {
          onUpdate();
        }
      } else {
        setMessage({ 
          type: 'error', 
          text: `Upload failed: ${errors.join(', ')}` 
        });
      }
    } catch (error) {
      console.error('Upload error:', error);
      setMessage({ 
        type: 'error', 
        text: `Upload failed: ${error.message}` 
      });
    } finally {
      setUploading(false);
      setTimeout(() => setMessage({ type: '', text: '' }), 5000);
    }
  };

  const handleRemoveFile = (index) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
    setMessage({ 
      type: 'success', 
      text: 'File removed from list' 
    });
    setTimeout(() => setMessage({ type: '', text: '' }), 3000);
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (mimeType) => {
    if (mimeType.startsWith('image/')) return Image;
    if (mimeType.startsWith('audio/')) return Music;
    return File;
  };

  const handleDeleteExistingMedia = async (mediaId) => {
    if (!user?.id) {
      setMessage({ 
        type: 'error', 
        text: 'User not authenticated' 
      });
      return;
    }

    try {
      await deleteEmberSupportingMedia(mediaId, user.id);
      
      // Refresh existing media list
      await fetchExistingMedia();
      
      // Call onUpdate to refresh parent components
      if (onUpdate) {
        onUpdate();
      }
      
      setMessage({ 
        type: 'success', 
        text: 'Media deleted successfully!' 
      });
      
    } catch (error) {
      console.error('Error deleting media:', error);
      setMessage({ 
        type: 'error', 
        text: `Failed to delete media: ${error.message}` 
      });
    } finally {
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    }
  };

  const handleSaveToWiki = async () => {
    if (uploadedFiles.length === 0 || !ember?.id || !user?.id) {
      setMessage({ 
        type: 'error', 
        text: 'No files to save or missing required data' 
      });
      return;
    }

    setSaving(true);
    setMessage({ type: '', text: '' });

    try {
      await saveEmberSupportingMedia(ember.id, user.id, uploadedFiles);
      
      setMessage({ 
        type: 'success', 
        text: `Successfully saved ${uploadedFiles.length} file${uploadedFiles.length !== 1 ? 's' : ''} to Wiki Media!` 
      });

      // Clear uploaded files after saving
      setUploadedFiles([]);

      // Refresh existing media to show newly saved files
      await fetchExistingMedia();

      // Call onUpdate to refresh parent components
      if (onUpdate) {
        onUpdate();
      }

      // Close modal after successful save
      setTimeout(() => {
        onClose();
      }, 1500);

    } catch (error) {
      console.error('Error saving to wiki media:', error);
      setMessage({ 
        type: 'error', 
        text: `Failed to save to wiki media: ${error.message}` 
      });
    } finally {
      setSaving(false);
      setTimeout(() => setMessage({ type: '', text: '' }), 5000);
    }
  };

  const modalContent = (
    <ModalContent 
      ember={ember}
      dragActive={dragActive}
      handleDrag={handleDrag}
      handleDrop={handleDrop}
      handleFileSelect={handleFileSelect}
      uploading={uploading}
      message={message}
      uploadedFiles={uploadedFiles}
      handleRemoveFile={handleRemoveFile}
      formatFileSize={formatFileSize}
      getFileIcon={getFileIcon}
      handleSaveToWiki={handleSaveToWiki}
      saving={saving}
      existingMedia={existingMedia}
      loadingExisting={loadingExisting}
      handleDeleteExistingMedia={handleDeleteExistingMedia}
    />
  );

  if (isMobile) {
    return (
      <Drawer open={isOpen} onOpenChange={onClose}>
        <DrawerContent className="bg-white focus:outline-none">
          <DrawerHeader className="bg-white">
            <DrawerTitle className="flex items-center gap-2 text-xl font-bold text-gray-900">
              <Upload className="w-5 h-5 text-blue-600" />
              Supporting Media
            </DrawerTitle>
            <DrawerDescription className="text-left text-gray-600">
              Add images and audio to support your ember's story
            </DrawerDescription>
          </DrawerHeader>
          <div className="px-4 pb-4 bg-white max-h-[70vh] overflow-y-auto">
            {modalContent}
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[calc(100%-2rem)] max-w-2xl max-h-[90vh] overflow-y-auto bg-white sm:w-full sm:max-w-2xl rounded-2xl focus:outline-none">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-bold text-gray-900">
            <Upload className="w-5 h-5 text-blue-600" />
            Supporting Media
          </DialogTitle>
          <DialogDescription className="text-gray-600">
            Add images and audio to support your ember's story
          </DialogDescription>
        </DialogHeader>
        {modalContent}
      </DialogContent>
    </Dialog>
  );
} 