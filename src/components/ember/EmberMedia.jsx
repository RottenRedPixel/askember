import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { ArrowClockwise, Image as ImageIcon, Star, MusicNote, File } from 'phosphor-react';
import { ExternalLink, Trash2, Upload, Plus } from 'lucide-react';
import { getEmberSupportingMedia, deleteEmberSupportingMedia } from '@/lib/database';
import useStore from '@/store';

export default function EmberMedia({ 
  ember, 
  onRefresh, 
  isRefreshing,
  onOpenSupportingMedia
}) {
  const [supportingMedia, setSupportingMedia] = useState([]);
  const [loadingMedia, setLoadingMedia] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState({ open: false, media: null });
  const [message, setMessage] = useState({ type: '', text: '' });
  
  const { user } = useStore();

  useEffect(() => {
    if (ember?.id) {
      fetchSupportingMedia();
    }
  }, [ember?.id]);

  const fetchSupportingMedia = async () => {
    setLoadingMedia(true);
    try {
      const media = await getEmberSupportingMedia(ember.id);
      console.log('Media tab supporting media:', media);
      setSupportingMedia(media || []);
    } catch (error) {
      console.error('Error fetching supporting media:', error);
      setSupportingMedia([]);
    } finally {
      setLoadingMedia(false);
    }
  };

  const handleDeleteClick = (media) => {
    setDeleteConfirm({ open: true, media });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteConfirm.media || !user?.id) {
      setMessage({ type: 'error', text: 'Unable to delete media' });
      return;
    }

    setDeletingId(deleteConfirm.media.id);
    try {
      await deleteEmberSupportingMedia(deleteConfirm.media.id, user.id);
      
      // Remove from local state
      setSupportingMedia(prev => prev.filter(media => media.id !== deleteConfirm.media.id));
      
      setMessage({ type: 'success', text: `${deleteConfirm.media.file_name} deleted successfully` });
      
      // Refresh parent component if callback provided
      if (onRefresh) {
        onRefresh();
      }
      
    } catch (error) {
      console.error('Error deleting media:', error);
      setMessage({ 
        type: 'error', 
        text: `Failed to delete ${deleteConfirm.media.file_name}: ${error.message}` 
      });
    } finally {
      setDeletingId(null);
      setDeleteConfirm({ open: false, media: null });
      
      // Clear message after 5 seconds
      setTimeout(() => setMessage({ type: '', text: '' }), 5000);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteConfirm({ open: false, media: null });
  };

  return (
    <Card className="h-full rounded-none">
      <CardContent className="px-6 pb-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-gray-900 text-left flex items-center gap-2">
              Ember Media
              {onRefresh && (
                <button
                  onClick={() => {
                    onRefresh();
                    fetchSupportingMedia();
                  }}
                  disabled={isRefreshing || loadingMedia}
                  className="p-1 hover:bg-gray-100 rounded transition-colors disabled:opacity-50"
                  title="Refresh media data"
                >
                  <ArrowClockwise 
                    size={16} 
                    className={`text-gray-400 ${(isRefreshing || loadingMedia) ? 'animate-spin' : ''}`} 
                  />
                </button>
              )}
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Photos, videos, and media associated with this ember
            </p>
          </div>
        </div>

        {/* Message */}
        {message.text && (
          <Alert className={`mb-6 ${message.type === 'error' ? 'border-red-200 bg-red-50' : 'border-green-200 bg-green-50'}`}>
            <AlertDescription className={`${message.type === 'error' ? 'text-red-800' : 'text-green-800'}`}>
              {message.text}
            </AlertDescription>
          </Alert>
        )}

        {/* Media Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {/* Cover Photo - Original Ember Image */}
          {ember?.image_url && (
            <div className="relative group cursor-pointer">
              <div className="aspect-square rounded-lg overflow-hidden bg-gray-100 border-2 border-blue-200">
                <img 
                  src={ember.image_url} 
                  alt={ember.title || "Ember cover photo"}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                />
              </div>
              {/* Cover Photo Badge */}
              <div className="absolute top-2 left-2 bg-blue-600 text-white px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1">
                <Star size={12} weight="fill" />
                Cover
              </div>
            </div>
          )}

          {/* Supporting Media Files */}
          {supportingMedia.map((media, index) => {
            const getMediaIcon = (category) => {
              if (category === 'image') return ImageIcon;
              if (category === 'audio') return MusicNote;
              return File;
            };
            
            const IconComponent = getMediaIcon(media.file_category);
            const isImage = media.file_category === 'image';
            
            return (
              <div key={media.id || index} className="relative group cursor-pointer">
                <div className="aspect-square rounded-lg overflow-hidden bg-gray-100 border-2 border-teal-200">
                  {isImage ? (
                    <img 
                      src={media.file_url} 
                      alt={media.file_name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-teal-50 group-hover:bg-teal-100 transition-colors">
                      <div className="text-center">
                        <IconComponent size={32} className="mx-auto mb-2 text-teal-600" />
                        <p className="text-xs font-medium text-teal-800 px-2 text-center line-clamp-2">
                          {media.file_name}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
                
                {/* File Type Badge */}
                <div className="absolute top-2 left-2 bg-teal-600 text-white px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 capitalize">
                  <IconComponent size={12} />
                  {media.file_category}
                </div>
                
                {/* Action Overlay */}
                <div className="absolute inset-0 z-10 opacity-0 group-hover:opacity-100 bg-black bg-opacity-60 rounded-lg flex items-center justify-center transition-all duration-200">
                  <div className="flex items-center gap-3">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        window.open(media.file_url, '_blank');
                      }}
                      className="h-9 w-9 p-0 bg-white hover:bg-gray-100 shadow-lg"
                      title="Open file"
                    >
                      <ExternalLink size={18} className="text-gray-700" />
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteClick(media);
                      }}
                      disabled={deletingId === media.id}
                      className="h-9 w-9 p-0 shadow-lg"
                      title="Delete file"
                    >
                      {deletingId === media.id ? (
                        <ArrowClockwise size={18} className="animate-spin text-white" />
                      ) : (
                        <Trash2 size={18} className="text-white" />
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Loading State */}
          {loadingMedia && (
            <div className="aspect-square rounded-lg border-2 border-dashed border-gray-200 flex items-center justify-center text-gray-400">
              <div className="text-center">
                <ArrowClockwise size={24} className="mx-auto mb-1 animate-spin" />
                <p className="text-xs font-medium">Loading...</p>
              </div>
            </div>
          )}


                  </div>

        {/* Add Supporting Media Button */}
        {onOpenSupportingMedia && (
          <div className="mt-6 flex justify-center">
            <Button
              onClick={onOpenSupportingMedia}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 h-auto"
              size="lg"
            >
              <Upload className="w-5 h-5 mr-2" />
              Add Supporting Media
            </Button>
          </div>
        )}

        {/* Info Text */}
        {!onOpenSupportingMedia && (
          <div className="mt-6 text-center text-sm text-gray-500">
            <p>Upload additional photos and videos through the <strong>Supporting Media</strong> section in the carousel cards below.</p>
          </div>
        )}
      </CardContent>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirm.open} onOpenChange={handleDeleteCancel}>
        <DialogContent className="max-w-md bg-white focus:outline-none">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <Trash2 size={20} />
              Delete Media File
            </DialogTitle>
            <DialogDescription className="text-gray-600">
              Are you sure you want to delete this file? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          {deleteConfirm.media && (
            <div className="py-4">
              <div className="p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-white rounded-lg border flex items-center justify-center flex-shrink-0">
                    {deleteConfirm.media.file_category === 'image' ? (
                      <ImageIcon size={20} className="text-gray-600" />
                    ) : deleteConfirm.media.file_category === 'audio' ? (
                      <MusicNote size={20} className="text-gray-600" />
                    ) : (
                      <File size={20} className="text-gray-600" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-gray-900 truncate">
                      {deleteConfirm.media.file_name}
                    </p>
                    <p className="text-sm text-gray-500 capitalize">
                      {deleteConfirm.media.file_category} file
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="flex gap-2 justify-end">
            <Button
              variant="outline"
              onClick={handleDeleteCancel}
              disabled={deletingId}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteConfirm}
              disabled={deletingId}
            >
              {deletingId ? (
                <>
                  <ArrowClockwise size={16} className="animate-spin mr-2" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 size={16} className="mr-2" />
                  Delete File
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
} 