import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Camera, X, MessageCircle, Mic, User } from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { getEmberPhotos } from '@/lib/photos';
import { getEmberSupportingMedia } from '@/lib/database';

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

// Helper function to get user initials
const getUserInitials = (email, firstName = '', lastName = '') => {
    if (firstName && lastName) {
        return (firstName[0] + lastName[0]).toUpperCase();
    }
    if (firstName) {
        return firstName.substring(0, 2).toUpperCase();
    }
    if (!email) return 'U';
    const parts = email.split('@')[0].split('.');
    if (parts.length >= 2) {
        return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return email.substring(0, 2).toUpperCase();
};

// Helper function to get display name (consistent with StoryCutStudio)
const getContributorDisplayName = (firstName, lastName, email) => {
    if (firstName && lastName) {
        return `${firstName} ${lastName}`;
    }
    if (firstName) {
        return firstName;
    }
    if (email) {
        return email.split('@')[0];
    }
    return 'Unknown User';
};

const ModalContent = ({
    availableMedia,
    selectedMedia,
    setSelectedMedia,
    storyMessages,
    selectedContributions,
    setSelectedContributions,
    loading,
    onAddBlock,
    onClose
}) => {
    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Camera size={16} className="text-blue-600" />
                    <span className="text-sm font-medium text-gray-900">Select Media to Add</span>
                </div>
                <Badge variant="outline" className="text-xs">
                    {availableMedia.length} available
                </Badge>
            </div>

            <p className="text-sm text-gray-600">
                Choose an image or media file from your ember wiki to add as a new block.
            </p>

            {loading ? (
                <div className="flex items-center justify-center py-8">
                    <div className="text-sm text-gray-500">Loading available media...</div>
                </div>
            ) : availableMedia.length === 0 ? (
                <div className="flex items-center justify-center py-8">
                    <div className="text-sm text-gray-500">No media files available</div>
                </div>
            ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                    {availableMedia.map((media) => (
                        <div
                            key={media.id}
                            onClick={() => setSelectedMedia(media)}
                            className="relative cursor-pointer group"
                        >
                            <div
                                className={`relative rounded-lg overflow-hidden transition-all ${selectedMedia?.id === media.id
                                    ? 'border-2 border-blue-500'
                                    : 'border border-gray-200 hover:border-gray-300'
                                    }`}
                            >
                                <img
                                    src={media.thumbnail}
                                    alt={media.name}
                                    className="w-full aspect-square object-cover"
                                />

                                {/* Selection overlay */}
                                {selectedMedia?.id === media.id && (
                                    <div className="absolute inset-0 bg-blue-500 bg-opacity-20 flex items-center justify-center">
                                        <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center">
                                            <span className="text-white text-xs">✓</span>
                                        </div>
                                    </div>
                                )}

                                {/* Media type badge */}
                                <div className="absolute top-1 left-1">
                                    <Badge
                                        variant="secondary"
                                        className={`text-xs px-2 py-0.5 ${media.category === 'ember'
                                            ? 'bg-amber-100 text-amber-800'
                                            : 'bg-blue-100 text-blue-800'
                                            }`}
                                    >
                                        {media.category === 'ember' ? 'Ember' : 'Media'}
                                    </Badge>
                                </div>
                            </div>

                            {/* Media name */}
                            <div className="mt-1 text-xs text-gray-600 truncate" title={media.name}>
                                {media.name}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Contributions Section */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <MessageCircle size={16} className="text-green-600" />
                        <span className="text-sm font-medium text-gray-900">Select Contributions to Add</span>
                    </div>
                    <Badge variant="outline" className="text-xs">
                        {storyMessages?.filter(msg => msg.sender === 'user').length || 0} available
                    </Badge>
                </div>

                <p className="text-sm text-gray-600">
                    Choose voice contributions from Story Circle to add as new voice blocks.
                </p>

                {loading ? (
                    <div className="flex items-center justify-center py-4">
                        <div className="text-sm text-gray-500">Loading contributions...</div>
                    </div>
                ) : !storyMessages || storyMessages.filter(msg => msg.sender === 'user').length === 0 ? (
                    <div className="flex items-center justify-center py-4">
                        <div className="text-sm text-gray-500">No contributions available</div>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {storyMessages
                            .filter(msg => msg.sender === 'user')
                            .map((message) => (
                                <div
                                    key={message.id}
                                    onClick={() => {
                                        const isSelected = selectedContributions.some(c => c.id === message.id);
                                        if (isSelected) {
                                            setSelectedContributions(selectedContributions.filter(c => c.id !== message.id));
                                        } else {
                                            setSelectedContributions([...selectedContributions, message]);
                                        }
                                    }}
                                    className={`p-3 rounded-lg cursor-pointer transition-all ${selectedContributions.some(c => c.id === message.id)
                                        ? 'border-2 border-green-500 bg-green-100'
                                        : 'border border-green-200 bg-green-50 hover:border-green-300 hover:bg-green-100'
                                        }`}
                                >
                                    <div className="flex items-start gap-3">
                                        <Avatar className="h-8 w-8 flex-shrink-0">
                                            <AvatarImage
                                                src={message.avatar_url || message.user_avatar_url}
                                                alt={getContributorDisplayName(message.user_first_name, message.user_last_name, message.user_email)}
                                            />
                                            <AvatarFallback className="bg-green-100 text-green-700 text-xs font-medium">
                                                {getUserInitials(message.user_email, message.user_first_name, message.user_last_name)}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="text-sm font-medium text-green-800">
                                                    {getContributorDisplayName(message.user_first_name, message.user_last_name, message.user_email)}
                                                </span>
                                                <Badge variant="secondary" className="text-xs bg-green-100 text-green-800 flex items-center gap-1">
                                                    {message.has_audio && <Mic size={12} />}
                                                    {message.has_audio ? 'Audio Message' : 'Text Response'}
                                                </Badge>
                                            </div>
                                            <p className="text-sm text-gray-700 line-clamp-2">
                                                {message.content}
                                            </p>
                                            <p className="text-xs text-green-600 mt-1">
                                                {new Date(message.created_at).toLocaleDateString()}
                                            </p>
                                        </div>
                                        {selectedContributions.some(c => c.id === message.id) && (
                                            <div className="flex-shrink-0 w-5 h-5 bg-green-600 rounded-full flex items-center justify-center">
                                                <span className="text-white text-xs">✓</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                    </div>
                )}
            </div>

            {/* Selected media preview */}
            {selectedMedia && (
                <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                        <img
                            src={selectedMedia.thumbnail}
                            alt={selectedMedia.name}
                            className="w-12 h-12 object-cover rounded"
                        />
                        <div className="flex-1">
                            <div className="font-medium text-sm text-gray-900">{selectedMedia.name}</div>
                            <div className="text-xs text-gray-500">
                                {selectedMedia.category === 'ember' ? 'Ember Photo' : 'Supporting Media'}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Action buttons */}
            <div className="flex items-center gap-3 pt-4">
                <Button
                    onClick={onClose}
                    variant="outline"
                    className="flex-1"
                >
                    Cancel
                </Button>
                <Button
                    onClick={onAddBlock}
                    disabled={!selectedMedia && selectedContributions.length === 0}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                >
                    <Plus size={16} className="mr-2" />
                    Add {selectedMedia && selectedContributions.length > 0 ? 'Blocks' :
                        selectedMedia ? 'Media Block' :
                            selectedContributions.length > 0 ? `${selectedContributions.length} Voice Block${selectedContributions.length > 1 ? 's' : ''}` : 'Block'}
                </Button>
            </div>
        </div>
    );
};

export default function AddBlockModal({ isOpen, onClose, emberId, onAddBlock, storyMessages = [] }) {
    const [availableMedia, setAvailableMedia] = useState([]);
    const [selectedMedia, setSelectedMedia] = useState(null);
    const [selectedContributions, setSelectedContributions] = useState([]);
    const [loading, setLoading] = useState(false);

    const isMobile = useMediaQuery("(max-width: 768px)");

    useEffect(() => {
        if (isOpen && emberId) {
            fetchAvailableMedia();
        } else if (!isOpen) {
            // Reset state when modal closes
            setSelectedMedia(null);
            setSelectedContributions([]);
            setAvailableMedia([]);
        }
    }, [isOpen, emberId]);

    const fetchAvailableMedia = async () => {
        if (!emberId) return;

        setLoading(true);
        try {
            const [emberPhotos, supportingMedia] = await Promise.all([
                getEmberPhotos(emberId),
                getEmberSupportingMedia(emberId)
            ]);

            // Combine and format all available media
            const allMedia = [
                // Ember photos
                ...emberPhotos.map(photo => ({
                    id: photo.id,
                    name: photo.display_name || photo.original_filename,
                    filename: photo.original_filename,
                    url: photo.storage_url,
                    thumbnail: photo.storage_url,
                    category: 'ember',
                    type: 'photo'
                })),
                // Supporting media
                ...supportingMedia.map(media => ({
                    id: media.id,
                    name: media.display_name || media.file_name,
                    filename: media.file_name,
                    url: media.file_url,
                    thumbnail: media.file_url,
                    category: 'supporting',
                    type: media.file_category || 'photo'
                }))
            ];

            console.log(`📸 Found ${allMedia.length} available media files for block selection`);
            setAvailableMedia(allMedia);

        } catch (error) {
            console.error('❌ Error fetching available media:', error);
            setAvailableMedia([]);
        } finally {
            setLoading(false);
        }
    };

    const handleAddBlock = () => {
        if (!selectedMedia && selectedContributions.length === 0) return;

        onAddBlock({
            media: selectedMedia,
            contributions: selectedContributions
        });
        onClose();
    };

    const modalContent = (
        <ModalContent
            availableMedia={availableMedia}
            selectedMedia={selectedMedia}
            setSelectedMedia={setSelectedMedia}
            storyMessages={storyMessages}
            selectedContributions={selectedContributions}
            setSelectedContributions={setSelectedContributions}
            loading={loading}
            onAddBlock={handleAddBlock}
            onClose={onClose}
        />
    );

    if (isMobile) {
        return (
            <Drawer open={isOpen} onOpenChange={onClose}>
                <DrawerContent className="bg-white focus:outline-none">
                    <DrawerHeader className="bg-white">
                        <DrawerTitle className="flex items-center gap-2 text-xl font-bold text-gray-900">
                            <Plus size={20} className="text-blue-600" />
                            Add Media Block
                        </DrawerTitle>
                        <DrawerDescription className="text-left text-gray-600">
                            Select media from your ember wiki to add as a new block
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
                        <Plus size={20} className="text-blue-600" />
                        Add Media Block
                    </DialogTitle>
                    <DialogDescription className="text-gray-600">
                        Select media from your ember wiki to add as a new block
                    </DialogDescription>
                </DialogHeader>
                {modalContent}
            </DialogContent>
        </Dialog>
    );
} 