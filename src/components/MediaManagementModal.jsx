import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { X, PencilSimple, Check } from 'phosphor-react';
import { getEmberPhotos, updatePhotoDisplayName } from '@/lib/photos';
import { getEmberSupportingMedia, updateSupportingMediaDisplayName } from '@/lib/database';

export default function MediaManagementModal({ isOpen, onClose, emberId }) {
  const [photos, setPhotos] = useState([]);
  const [supportingMedia, setSupportingMedia] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [editingName, setEditingName] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && emberId) {
      fetchMedia();
    }
  }, [isOpen, emberId]);

  const fetchMedia = async () => {
    if (!emberId) return;
    
    setLoading(true);
    try {
      const [emberPhotos, emberSupportingMedia] = await Promise.all([
        getEmberPhotos(emberId),
        getEmberSupportingMedia(emberId)
      ]);
      
      setPhotos(emberPhotos || []);
      setSupportingMedia(emberSupportingMedia || []);
    } catch (error) {
      console.error('Failed to fetch media:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStartEdit = (item, type) => {
    setEditingId(`${type}_${item.id}`);
    setEditingName(item.display_name || item.original_filename || item.file_name || '');
  };

  const handleSaveEdit = async (item, type) => {
    if (!editingName.trim()) return;
    
    try {
      if (type === 'photo') {
        await updatePhotoDisplayName(item.id, editingName.trim());
        setPhotos(prev => prev.map(p => 
          p.id === item.id ? { ...p, display_name: editingName.trim() } : p
        ));
      } else {
        await updateSupportingMediaDisplayName(item.id, editingName.trim());
        setSupportingMedia(prev => prev.map(m => 
          m.id === item.id ? { ...m, display_name: editingName.trim() } : m
        ));
      }
      
      setEditingId(null);
      setEditingName('');
    } catch (error) {
      console.error('Failed to update display name:', error);
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditingName('');
  };

  const MediaItem = ({ item, type }) => {
    const isEditing = editingId === `${type}_${item.id}`;
    const displayName = item.display_name || item.original_filename || item.file_name || 'Untitled';
    const subtitle = type === 'photo' ? 
      (item.camera_make && item.camera_model ? `${item.camera_make} ${item.camera_model}` : 'Photo') :
      (item.file_category || 'Media');

    return (
      <Card className="mb-3">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              {isEditing ? (
                <div className="flex items-center gap-2">
                  <Input
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    placeholder="Enter display name"
                    className="flex-1"
                    autoFocus
                  />
                  <Button
                    onClick={() => handleSaveEdit(item, type)}
                    size="sm"
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <Check size={16} />
                  </Button>
                  <Button
                    onClick={handleCancelEdit}
                    size="sm"
                    variant="outline"
                  >
                    <X size={16} />
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900">{displayName}</h3>
                    <p className="text-sm text-gray-500">{subtitle}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      Script reference: name="{displayName}"
                    </p>
                  </div>
                  <Button
                    onClick={() => handleStartEdit(item, type)}
                    size="sm"
                    variant="outline"
                    className="flex items-center gap-1"
                  >
                    <PencilSimple size={16} />
                    Edit
                  </Button>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Manage Media Names</DialogTitle>
          <p className="text-sm text-gray-600">
            Edit display names for your photos and supporting media. These names can be used in scripts with the format: name="Display Name"
          </p>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto pr-2">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-gray-500">Loading media...</div>
            </div>
          ) : (
            <div className="space-y-6">
              {photos.length > 0 && (
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3">Photos ({photos.length})</h3>
                  {photos.map(photo => (
                    <MediaItem key={photo.id} item={photo} type="photo" />
                  ))}
                </div>
              )}
              
              {supportingMedia.length > 0 && (
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3">Supporting Media ({supportingMedia.length})</h3>
                  {supportingMedia.map(media => (
                    <MediaItem key={media.id} item={media} type="media" />
                  ))}
                </div>
              )}
              
              {photos.length === 0 && supportingMedia.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  No media files found for this ember.
                </div>
              )}
            </div>
          )}
        </div>
        
        <div className="flex justify-end pt-4 border-t">
          <Button onClick={onClose} variant="outline">
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
} 