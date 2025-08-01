import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Camera, X, MessageCircle, Mic, User, Sparkles, Settings, Play, Pause, MicOff, Check } from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { cn } from '@/lib/utils';
import { getEmberPhotos } from '@/lib/photos';
import { getEmberSupportingMedia, createDemoContribution, getDemoContributionsForEmber, updateDemoContribution, deleteDemoContribution } from '@/lib/database';
import { speechToText } from '@/lib/elevenlabs';
import { uploadToBlob } from '@/lib/storage';
import useStore from '@/store';

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

// Microphone Combobox Component for Demo Circle
const MicrophoneCombobox = ({ microphones, selectedMicrophone, onSelectMicrophone, disabled }) => {
    const [open, setOpen] = useState(false);

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    size="sm"
                    disabled={disabled}
                    className={cn(
                        "h-9 w-9 p-0",
                        selectedMicrophone && "border-red-500 bg-red-50"
                    )}
                    title="Select microphone"
                >
                    <Settings
                        size={16}
                        className={cn(
                            "transition-colors",
                            selectedMicrophone ? "text-red-600" : "text-gray-500"
                        )}
                    />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0 bg-white border border-gray-200 shadow-lg rounded-md focus:outline-none" align="start">
                <Command>
                    <CommandInput placeholder="Search microphones..." className="h-9" />
                    <CommandList>
                        <CommandEmpty>No microphone found.</CommandEmpty>
                        <CommandGroup heading="Available Microphones">
                            {microphones.map((mic) => (
                                <CommandItem
                                    key={mic.deviceId}
                                    value={mic.deviceId}
                                    onSelect={() => {
                                        onSelectMicrophone(mic.deviceId);
                                        setOpen(false);
                                    }}
                                >
                                    {mic.label || `Microphone ${mic.deviceId.slice(0, 8)}...`}
                                    <Check
                                        className={cn(
                                            "ml-auto h-4 w-4",
                                            selectedMicrophone === mic.deviceId ? "opacity-100" : "opacity-0"
                                        )}
                                    />
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
};

// Block type configuration
const blockTypes = [
    {
        id: 'media',
        label: 'Media',
        icon: Camera,
        color: 'blue',
        description: 'Add photos from your ember wiki'
    },
    {
        id: 'ember',
        label: 'Ember AI',
        icon: Sparkles,
        color: 'purple',
        description: 'Create new Ember AI narration'
    },
    {
        id: 'narrator',
        label: 'Narrator',
        icon: Mic,
        color: 'yellow',
        description: 'Create new narrator voice content'
    },
    {
        id: 'contributions',
        label: 'Story Circle',
        icon: MessageCircle,
        color: 'green',
        description: 'Add existing story circle messages'
    },
    {
        id: 'demo',
        label: 'Demo Circle',
        icon: User,
        color: 'red',
        description: 'Create and manage demo contributions'
    }
];

const ModalContent = ({
    selectedBlockType,
    setSelectedBlockType,
    availableMedia,
    selectedMedia,
    setSelectedMedia,
    storyMessages,
    selectedContributions,
    setSelectedContributions,
    emberContent,
    setEmberContent,
    narratorContent,
    setNarratorContent,
    loading,
    setLoading,
    onAddBlock,
    onClose,
    currentEmberVoiceId,
    currentNarratorVoiceId,
    // Demo Circle props
    demoContributions,
    selectedDemoContributions,
    setSelectedDemoContributions,
    newDemoFirstName,
    setNewDemoFirstName,
    newDemoLastName,
    setNewDemoLastName,
    newDemoContent,
    setNewDemoContent,
    editingDemoId,
    setEditingDemoId,
    onCreateDemo,
    emberId,
    user,
    fetchDemoContributions,
    // Demo Circle recording props
    isRecording,
    recordingDuration,
    hasRecording,
    isPlaying,
    audioBlob,
    availableMicrophones,
    selectedMicrophone,
    setSelectedMicrophone,
    isTranscribing,
    startRecording,
    stopRecording,
    playRecording,
    resetRecording,
    audioRef
}) => {
    return (
        <div className="space-y-4">
            {/* Block Type Selection */}
            <div className="border-b border-gray-200 pb-4">
                <div className="flex items-center gap-2 mb-3">
                    <Plus size={16} className="text-gray-600" />
                    <span className="text-sm font-medium text-gray-900">Choose Block Type</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {blockTypes.map((type) => {
                        const IconComponent = type.icon;
                        const isSelected = selectedBlockType === type.id;
                        return (
                            <button
                                key={type.id}
                                onClick={() => setSelectedBlockType(type.id)}
                                className={`p-3 rounded-lg border transition-all text-left ${isSelected
                                    ? `border-${type.color}-500 bg-${type.color}-50`
                                    : 'border-gray-200 hover:border-gray-300'
                                    }`}
                            >
                                <div className="flex items-center gap-2 mb-1">
                                    <IconComponent
                                        size={16}
                                        className={isSelected ? `text-${type.color}-600` : 'text-gray-400'}
                                    />
                                    <span className={`text-sm font-medium ${isSelected ? `text-${type.color}-900` : 'text-gray-900'
                                        }`}>
                                        {type.label}
                                    </span>
                                </div>
                                <p className="text-xs text-gray-600">{type.description}</p>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Content based on selected block type */}
            {selectedBlockType === 'media' && (
                <>
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
                </>
            )}

            {selectedBlockType === 'ember' && (
                <>
                    <div className="flex items-center gap-2">
                        <Sparkles size={16} className="text-purple-600" />
                        <span className="text-sm font-medium text-gray-900">Create Ember AI Content</span>
                    </div>

                    <p className="text-sm text-gray-600">
                        Enter content for Ember AI to narrate. Voice: <span className="font-medium">{currentEmberVoiceId || 'Default'}</span>
                    </p>

                    <Textarea
                        placeholder="Enter what you want Ember AI to say..."
                        value={emberContent}
                        onChange={(e) => setEmberContent(e.target.value)}
                        className="min-h-24"
                    />

                    {emberContent && (
                        <div className="p-3 bg-purple-50 rounded-lg">
                            <div className="flex items-center gap-2 mb-2">
                                <Sparkles size={14} className="text-purple-600" />
                                <span className="text-sm font-medium text-purple-900">Preview</span>
                            </div>
                            <p className="text-sm text-purple-800">{emberContent}</p>
                        </div>
                    )}
                </>
            )}

            {selectedBlockType === 'narrator' && (
                <>
                    <div className="flex items-center gap-2">
                        <Mic size={16} className="text-yellow-600" />
                        <span className="text-sm font-medium text-gray-900">Create Narrator Content</span>
                    </div>

                    <p className="text-sm text-gray-600">
                        Enter content for the narrator to speak. Voice: <span className="font-medium">{currentNarratorVoiceId || 'Default'}</span>
                    </p>

                    <Textarea
                        placeholder="Enter what you want the narrator to say..."
                        value={narratorContent}
                        onChange={(e) => setNarratorContent(e.target.value)}
                        className="min-h-24"
                    />

                    {narratorContent && (
                        <div className="p-3 bg-yellow-50 rounded-lg">
                            <div className="flex items-center gap-2 mb-2">
                                <Mic size={14} className="text-yellow-600" />
                                <span className="text-sm font-medium text-yellow-900">Preview</span>
                            </div>
                            <p className="text-sm text-yellow-800">{narratorContent}</p>
                        </div>
                    )}
                </>
            )}

            {selectedBlockType === 'contributions' && (
                <>


                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <MessageCircle size={16} className="text-green-600" />
                            <span className="text-sm font-medium text-gray-900">Select Contributions to Add</span>
                        </div>
                        <Badge variant="outline" className="text-xs">
                            {storyMessages?.filter(msg => msg.sender === 'user' || msg.message_type === 'answer').length || 0} available
                        </Badge>
                    </div>

                    <p className="text-sm text-gray-600">
                        Choose voice contributions from Story Circle to add as new voice blocks.
                    </p>

                    {loading ? (
                        <div className="flex items-center justify-center py-4">
                            <div className="text-sm text-gray-500">Loading contributions...</div>
                        </div>
                    ) : !storyMessages || storyMessages.filter(msg => msg.sender === 'user' || msg.message_type === 'answer').length === 0 ? (
                        <div className="flex items-center justify-center py-4">
                            <div className="text-sm text-gray-500">No contributions available</div>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {storyMessages
                                .filter(msg => msg.sender === 'user' || msg.message_type === 'answer')
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
                                            <Avatar className="w-8 h-8 flex-shrink-0">
                                                <AvatarImage src={message.user_avatar_url || message.avatar_url} />
                                                <AvatarFallback className="bg-green-200 text-green-800 text-xs">
                                                    {getUserInitials(message.user_email, message.user_first_name, message.user_last_name)}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="font-medium text-sm text-green-900">
                                                        {getContributorDisplayName(message.user_first_name, message.user_last_name, message.user_email)}
                                                    </span>
                                                    {(message.hasVoiceRecording || message.has_audio) ? (
                                                        <Badge variant="secondary" className="text-xs bg-green-200 text-green-800">
                                                            Audio
                                                        </Badge>
                                                    ) : (
                                                        <Badge variant="secondary" className="text-xs bg-blue-200 text-blue-800">
                                                            Text
                                                        </Badge>
                                                    )}
                                                </div>
                                                <p className="text-sm text-green-800">{message.content}</p>
                                                <div className="flex items-center gap-2 mt-2">
                                                    <span className="text-xs text-green-600">
                                                        {message.timestamp || (message.created_at && new Date(message.created_at).toLocaleDateString())}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                        </div>
                    )}
                </>
            )}

            {selectedBlockType === 'demo' && (
                <>
                    {/* Create New Demo Contribution */}
                    <div className="space-y-4 border-b border-gray-200 pb-4">
                        <div className="flex items-center gap-2">
                            <User size={16} className="text-red-600" />
                            <span className="text-sm font-medium text-gray-900">Create New Demo Contribution</span>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">
                                    First Name *
                                </label>
                                <input
                                    type="text"
                                    value={newDemoFirstName}
                                    onChange={(e) => setNewDemoFirstName(e.target.value)}
                                    placeholder="John"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">
                                    Last Name
                                </label>
                                <input
                                    type="text"
                                    value={newDemoLastName}
                                    onChange={(e) => setNewDemoLastName(e.target.value)}
                                    placeholder="Smith"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                                Message Content *
                            </label>
                            <Textarea
                                value={newDemoContent}
                                onChange={(e) => setNewDemoContent(e.target.value)}
                                placeholder="Enter what this demo contributor would say..."
                                className="min-h-20 focus:ring-red-500 focus:border-red-500"
                                required
                            />
                        </div>

                        {/* Recording Controls */}
                        <div className="space-y-3 p-4 bg-red-50 border border-red-200 rounded-lg">
                            <div className="flex items-center gap-2 mb-2">
                                <Mic size={16} className="text-red-600" />
                                <span className="text-sm font-medium text-red-800">Audio Recording (Optional)</span>
                            </div>

                            {/* Recording Controls Row */}
                            <div className="flex items-center gap-2">
                                {/* Microphone Selection */}
                                <MicrophoneCombobox
                                    microphones={availableMicrophones}
                                    selectedMicrophone={selectedMicrophone}
                                    onSelectMicrophone={setSelectedMicrophone}
                                    disabled={isRecording}
                                />

                                {/* Record/Stop Button */}
                                <Button
                                    onClick={isRecording ? stopRecording : startRecording}
                                    variant={isRecording ? "destructive" : "outline"}
                                    size="sm"
                                    className={cn(
                                        "min-w-24",
                                        !isRecording && "border-red-500 text-red-600 hover:bg-red-50"
                                    )}
                                    disabled={isTranscribing}
                                >
                                    {isRecording ? (
                                        <>
                                            <MicOff size={16} className="mr-2" />
                                            Stop
                                        </>
                                    ) : (
                                        <>
                                            <Mic size={16} className="mr-2" />
                                            Record
                                        </>
                                    )}
                                </Button>

                                {/* Recording Duration */}
                                {isRecording && (
                                    <div className="flex items-center gap-2 px-3 py-1 bg-red-100 text-red-800 rounded-md text-sm font-mono">
                                        <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                                        {Math.floor(recordingDuration / 60)}:{(recordingDuration % 60).toString().padStart(2, '0')}
                                    </div>
                                )}

                                {/* Play/Pause Button */}
                                {hasRecording && !isRecording && (
                                    <Button
                                        onClick={playRecording}
                                        variant="outline"
                                        size="sm"
                                        className="border-red-500 text-red-600 hover:bg-red-50"
                                        disabled={isTranscribing}
                                    >
                                        {isPlaying ? (
                                            <>
                                                <Pause size={16} className="mr-2" />
                                                Pause
                                            </>
                                        ) : (
                                            <>
                                                <Play size={16} className="mr-2" />
                                                Play
                                            </>
                                        )}
                                    </Button>
                                )}

                                {/* Clear Recording Button */}
                                {hasRecording && !isRecording && (
                                    <Button
                                        onClick={resetRecording}
                                        variant="outline"
                                        size="sm"
                                        className="border-gray-300 text-gray-600 hover:bg-gray-50"
                                        disabled={isTranscribing}
                                    >
                                        <X size={16} />
                                    </Button>
                                )}
                            </div>

                            {/* Recording Status */}
                            {hasRecording && (
                                <div className="text-xs text-red-600">
                                    ✓ Audio recorded ({Math.floor(recordingDuration / 60)}:{(recordingDuration % 60).toString().padStart(2, '0')})
                                    {isTranscribing && (
                                        <span className="ml-2 inline-flex items-center gap-1">
                                            <div className="w-3 h-3 border-2 border-red-600 border-t-transparent rounded-full animate-spin"></div>
                                            Transcribing...
                                        </span>
                                    )}
                                </div>
                            )}

                            {/* Instructions */}
                            <div className="text-xs text-red-600 opacity-80">
                                Record a voice message and it will be automatically transcribed to text when you stop recording.
                            </div>
                        </div>

                        {/* Hidden audio element for playback */}
                        <audio ref={audioRef} style={{ display: 'none' }} />

                        <Button
                            onClick={async () => {
                                if (!newDemoFirstName.trim() || !newDemoContent.trim()) return;

                                try {
                                    setLoading(true);

                                    let audioUrl = null;
                                    let audioDuration = null;

                                    // Handle audio upload if recording exists
                                    if (hasRecording && audioBlob) {
                                        try {
                                            console.log('📤 Uploading demo audio...');

                                            // Create audio file with proper extension
                                            const getFileExtension = (mimeType) => {
                                                if (mimeType.includes('webm')) return 'webm';
                                                if (mimeType.includes('mp4')) return 'm4a';
                                                if (mimeType.includes('ogg')) return 'ogg';
                                                if (mimeType.includes('wav')) return 'wav';
                                                return 'webm'; // fallback
                                            };

                                            const extension = getFileExtension(audioBlob.type);
                                            const audioFile = new File([audioBlob], `demo-${Date.now()}.${extension}`, {
                                                type: audioBlob.type
                                            });

                                            console.log('📁 Demo audio file created:', {
                                                name: audioFile.name,
                                                type: audioFile.type,
                                                size: audioFile.size
                                            });

                                            // Upload to blob storage
                                            const uploadResult = await uploadToBlob(audioFile, 'audio', user?.id);
                                            audioUrl = uploadResult.url;
                                            audioDuration = recordingDuration;

                                            console.log('✅ Demo audio uploaded:', audioUrl);
                                        } catch (uploadError) {
                                            console.error('❌ Error uploading demo audio:', uploadError);
                                            alert('Failed to upload audio. The demo contribution will be created without audio.');
                                        }
                                    }

                                    // Create demo contribution
                                    await createDemoContribution({
                                        emberId,
                                        userId: user?.id,
                                        firstName: newDemoFirstName.trim(),
                                        lastName: newDemoLastName.trim() || null,
                                        content: newDemoContent.trim(),
                                        hasAudio: !!audioUrl,
                                        audioUrl,
                                        audioDuration,
                                        elevenlabsVoiceId: null,
                                        elevenlabsVoiceName: null
                                    });

                                    console.log('✅ Demo contribution created successfully');

                                    // Reset form and recording
                                    setNewDemoFirstName('');
                                    setNewDemoLastName('');
                                    setNewDemoContent('');
                                    resetRecording();

                                    // Refresh list
                                    fetchDemoContributions();
                                } catch (error) {
                                    console.error('Error creating demo contribution:', error);
                                    alert('Failed to create demo contribution. Please try again.');
                                } finally {
                                    setLoading(false);
                                }
                            }}
                            disabled={!newDemoFirstName.trim() || !newDemoContent.trim() || loading || isRecording || isTranscribing}
                            className="w-full bg-red-600 hover:bg-red-700"
                        >
                            {loading ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                                    Creating...
                                </>
                            ) : (
                                <>
                                    <Plus size={16} className="mr-2" />
                                    Create Demo Contribution
                                </>
                            )}
                        </Button>
                    </div>

                    {/* Select Existing Demo Contributions */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <User size={16} className="text-red-600" />
                                <span className="text-sm font-medium text-gray-900">Select Demo Contributions</span>
                            </div>
                            <Badge variant="outline" className="text-xs">
                                {demoContributions?.length || 0} available
                            </Badge>
                        </div>

                        <p className="text-sm text-gray-600">
                            Choose demo contributions to add as voice blocks.
                        </p>

                        {demoContributions?.length === 0 ? (
                            <div className="flex items-center justify-center py-4">
                                <div className="text-sm text-gray-500">No demo contributions created yet</div>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {demoContributions.map((demo) => (
                                    <div
                                        key={demo.id}
                                        onClick={() => {
                                            const isSelected = selectedDemoContributions.some(d => d.id === demo.id);
                                            if (isSelected) {
                                                setSelectedDemoContributions(selectedDemoContributions.filter(d => d.id !== demo.id));
                                            } else {
                                                setSelectedDemoContributions([...selectedDemoContributions, demo]);
                                            }
                                        }}
                                        className={`p-3 rounded-lg cursor-pointer transition-all ${selectedDemoContributions.some(d => d.id === demo.id)
                                            ? 'border-2 border-red-500 bg-red-100'
                                            : 'border border-red-200 bg-red-50 hover:border-red-300 hover:bg-red-100'
                                            }`}
                                    >
                                        <div className="flex items-start gap-3">
                                            <Avatar className="w-8 h-8 flex-shrink-0">
                                                <AvatarFallback className="bg-red-200 text-red-800 text-xs">
                                                    {getUserInitials('', demo.first_name, demo.last_name)}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="font-medium text-sm text-red-900">
                                                        {getContributorDisplayName(demo.first_name, demo.last_name, '')}
                                                    </span>
                                                    {demo.has_audio ? (
                                                        <Badge variant="secondary" className="text-xs bg-red-200 text-red-800">
                                                            Audio
                                                        </Badge>
                                                    ) : (
                                                        <Badge variant="secondary" className="text-xs bg-blue-200 text-blue-800">
                                                            Text
                                                        </Badge>
                                                    )}
                                                </div>
                                                <p className="text-sm text-red-800">{demo.content}</p>
                                                <div className="flex items-center gap-2 mt-2">
                                                    <span className="text-xs text-red-600">
                                                        {new Date(demo.created_at).toLocaleDateString()}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </>
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
                    disabled={
                        (selectedBlockType === 'media' && !selectedMedia) ||
                        (selectedBlockType === 'ember' && !emberContent?.trim()) ||
                        (selectedBlockType === 'narrator' && !narratorContent?.trim()) ||
                        (selectedBlockType === 'contributions' && selectedContributions.length === 0) ||
                        (selectedBlockType === 'demo' && selectedDemoContributions.length === 0)
                    }
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                >
                    <Plus size={16} className="mr-2" />
                    Add {selectedBlockType === 'media' ? 'Media Block' :
                        selectedBlockType === 'ember' ? 'Ember AI Block' :
                            selectedBlockType === 'narrator' ? 'Narrator Block' :
                                selectedBlockType === 'contributions' ? `${selectedContributions.length} Voice Block${selectedContributions.length > 1 ? 's' : ''}` :
                                    selectedBlockType === 'demo' ? `${selectedDemoContributions.length} Demo Block${selectedDemoContributions.length > 1 ? 's' : ''}` : 'Block'}
                </Button>
            </div>
        </div>
    );
};

export default function AddBlockModal({
    isOpen,
    onClose,
    emberId,
    onAddBlock,
    storyMessages = [],
    currentEmberVoiceId = null,
    currentNarratorVoiceId = null
}) {
    const [selectedBlockType, setSelectedBlockType] = useState('media');
    const [availableMedia, setAvailableMedia] = useState([]);
    const [selectedMedia, setSelectedMedia] = useState(null);
    const [selectedContributions, setSelectedContributions] = useState([]);
    const [emberContent, setEmberContent] = useState('');
    const [narratorContent, setNarratorContent] = useState('');
    const [loading, setLoading] = useState(false);

    // Demo Circle state
    const [demoContributions, setDemoContributions] = useState([]);
    const [selectedDemoContributions, setSelectedDemoContributions] = useState([]);
    const [newDemoFirstName, setNewDemoFirstName] = useState('');
    const [newDemoLastName, setNewDemoLastName] = useState('');
    const [newDemoContent, setNewDemoContent] = useState('');
    const [editingDemoId, setEditingDemoId] = useState(null);

    // Demo Circle recording state
    const [isRecording, setIsRecording] = useState(false);
    const [recordingDuration, setRecordingDuration] = useState(0);
    const [hasRecording, setHasRecording] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);
    const [audioBlob, setAudioBlob] = useState(null);
    const [availableMicrophones, setAvailableMicrophones] = useState([]);
    const [selectedMicrophone, setSelectedMicrophone] = useState('');
    const [isTranscribing, setIsTranscribing] = useState(false);

    // Demo Circle refs
    const mediaRecorderRef = useRef(null);
    const audioRef = useRef(null);
    const recordingIntervalRef = useRef(null);

    const isMobile = useMediaQuery("(max-width: 768px)");
    const { user } = useStore();

    useEffect(() => {
        if (isOpen && emberId) {
            fetchAvailableMedia();
            fetchDemoContributions();
            // Initialize microphones for demo recording
            getAvailableMicrophones();
        } else if (!isOpen) {
            // Reset state when modal closes
            setSelectedBlockType('media');
            setSelectedMedia(null);
            setSelectedContributions([]);
            setEmberContent('');
            setNarratorContent('');
            setAvailableMedia([]);
            // Reset demo state
            setDemoContributions([]);
            setSelectedDemoContributions([]);
            setNewDemoFirstName('');
            setNewDemoLastName('');
            setNewDemoContent('');
            setEditingDemoId(null);
            // Reset recording state
            resetRecording();
        }
    }, [isOpen, emberId]);

    // Cleanup recording resources on unmount
    useEffect(() => {
        return () => {
            resetRecording();
        };
    }, []);

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

    const fetchDemoContributions = async () => {
        if (!emberId) return;

        try {
            console.log('📋 Fetching demo contributions for ember:', emberId);
            const demos = await getDemoContributionsForEmber(emberId);
            setDemoContributions(demos);
            console.log(`📋 Found ${demos.length} demo contributions`);
        } catch (error) {
            console.error('❌ Error fetching demo contributions:', error);
            setDemoContributions([]);
        }
    };

    // Demo Circle recording functions
    const getAvailableMicrophones = async () => {
        try {
            const devices = await navigator.mediaDevices.enumerateDevices();
            // Filter out microphones with empty deviceId (iOS issue)
            const audioInputs = devices.filter(device =>
                device.kind === 'audioinput' &&
                device.deviceId &&
                device.deviceId.trim() !== ''
            );

            // If no valid microphones found, add a default entry
            if (audioInputs.length === 0) {
                const defaultMic = {
                    deviceId: 'default',
                    label: 'Default Microphone',
                    kind: 'audioinput'
                };
                audioInputs.push(defaultMic);
                console.log('No specific microphones found, using default');
            }

            setAvailableMicrophones(audioInputs);

            // Set default microphone if none selected
            if (audioInputs.length > 0 && !selectedMicrophone) {
                setSelectedMicrophone(audioInputs[0].deviceId);
            }
        } catch (error) {
            console.error('Error getting microphones:', error);
        }
    };

    // Helper function to detect mobile devices
    const isMobileDevice = () => {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    };

    // Helper function to get supported audio MIME type
    const getSupportedMimeType = () => {
        const types = [
            'audio/webm;codecs=opus',
            'audio/webm',
            'audio/mp4',
            'audio/wav',
            'audio/ogg;codecs=opus',
            'audio/ogg'
        ];

        for (const type of types) {
            if (MediaRecorder.isTypeSupported(type)) {
                console.log('📝 Using supported MIME type:', type);
                return type;
            }
        }

        console.warn('⚠️ No supported audio MIME types found, using default');
        return 'audio/webm'; // Fallback
    };

    const startRecording = async () => {
        try {
            console.log('🎤 Starting demo recording...');

            // Mobile-optimized audio constraints
            const baseConstraints = {
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: true,
            };

            // Add mobile-specific optimizations
            if (isMobileDevice()) {
                baseConstraints.sampleRate = 16000; // Lower for mobile networks
                baseConstraints.channelCount = 1; // Mono for smaller files
            } else {
                baseConstraints.sampleRate = 44100;
            }

            const audioConstraints = { ...baseConstraints };

            // Only specify deviceId if it's not the default fallback
            if (selectedMicrophone && selectedMicrophone !== 'default') {
                audioConstraints.deviceId = { exact: selectedMicrophone };
            }

            const stream = await navigator.mediaDevices.getUserMedia({ audio: audioConstraints });
            console.log('✅ Microphone stream obtained');

            // Get the best supported MIME type for this device
            const mimeType = getSupportedMimeType();

            const mediaRecorder = new MediaRecorder(stream, { mimeType });
            console.log('🎬 MediaRecorder created');

            mediaRecorderRef.current = mediaRecorder;

            const audioChunks = [];

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunks.push(event.data);
                }
            };

            mediaRecorder.onstop = () => {
                console.log('⏹️ Demo recording stopped');

                const audioBlob = new Blob(audioChunks, { type: mimeType });
                console.log('🎵 Demo audio blob created:', {
                    size: audioBlob.size,
                    type: audioBlob.type,
                    sizeMB: (audioBlob.size / 1024 / 1024).toFixed(2)
                });

                setAudioBlob(audioBlob);
                setHasRecording(true);

                // Stop all tracks to release microphone
                stream.getTracks().forEach(track => track.stop());
                console.log('✅ Demo recording processing complete');

                // Auto-transcribe the audio
                setTimeout(async () => {
                    setIsTranscribing(true);
                    try {
                        console.log('🎤 Auto-transcribing demo recording...');
                        const transcription = await speechToText(audioBlob);
                        console.log('✅ Auto-transcription completed:', transcription);

                        // Set the transcribed text as the content
                        setNewDemoContent(transcription);
                    } catch (error) {
                        console.error('❌ Auto-transcription error:', error);
                        // Don't show alert for auto-transcription failure, just log it
                        console.warn('Auto-transcription failed, user can type manually or try recording again');
                    } finally {
                        setIsTranscribing(false);
                    }
                }, 100); // Small delay to ensure state updates are processed
            };

            mediaRecorder.onerror = (error) => {
                console.error('❌ MediaRecorder error:', error);
            };

            mediaRecorder.start();
            console.log('🔴 Demo recording started');

            setIsRecording(true);
            setRecordingDuration(0);

            // Start duration counter
            recordingIntervalRef.current = setInterval(() => {
                setRecordingDuration(prev => prev + 1);
            }, 1000);

        } catch (error) {
            console.error('❌ Error starting demo recording:', error);

            if (error.name === 'NotAllowedError') {
                const message = isMobileDevice()
                    ? 'Microphone access denied. On mobile, please:\n1. Refresh the page\n2. Allow microphone when prompted\n3. Check your browser settings'
                    : 'Microphone access denied. Please allow microphone permissions and try again.';
                alert(message);
            } else if (error.name === 'NotFoundError') {
                const message = isMobileDevice()
                    ? 'No microphone found. Please check that your device has a microphone and try again.'
                    : 'No microphone found. Please connect a microphone and try again.';
                alert(message);
            } else {
                const message = isMobileDevice()
                    ? 'Could not start recording. Please ensure you\'re using HTTPS and a supported mobile browser (Chrome, Safari, Firefox).'
                    : 'Could not start recording. Please check microphone permissions.';
                alert(message);
            }
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
            mediaRecorderRef.current.stop();
            setIsRecording(false);

            if (recordingIntervalRef.current) {
                clearInterval(recordingIntervalRef.current);
                recordingIntervalRef.current = null;
            }
        }
    };

    const playRecording = async () => {
        if (audioBlob && audioRef.current) {
            try {
                if (isPlaying) {
                    audioRef.current.pause();
                    setIsPlaying(false);
                } else {
                    // Clean up any existing object URL
                    if (audioRef.current.src && audioRef.current.src.startsWith('blob:')) {
                        URL.revokeObjectURL(audioRef.current.src);
                    }

                    // Set up new audio source
                    audioRef.current.src = URL.createObjectURL(audioBlob);

                    // Set up event handlers before playing
                    audioRef.current.onended = () => {
                        setIsPlaying(false);
                    };

                    audioRef.current.onerror = (e) => {
                        console.error('Audio playback error:', e);
                        setIsPlaying(false);
                        alert('Could not play audio recording. Please try recording again.');
                    };

                    // Play audio
                    await audioRef.current.play();
                    setIsPlaying(true);
                }
            } catch (error) {
                console.error('Error playing recording:', error);
                setIsPlaying(false);
            }
        }
    };

    const resetRecording = () => {
        setIsRecording(false);
        setRecordingDuration(0);
        setHasRecording(false);
        setIsPlaying(false);
        setAudioBlob(null);
        setIsTranscribing(false);

        if (recordingIntervalRef.current) {
            clearInterval(recordingIntervalRef.current);
            recordingIntervalRef.current = null;
        }

        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
            mediaRecorderRef.current.stop();
        }
    };

    const handleAddBlock = () => {
        let blockData = { blockType: selectedBlockType };

        if (selectedBlockType === 'media') {
            if (!selectedMedia) return;
            blockData.media = selectedMedia;
        } else if (selectedBlockType === 'ember') {
            if (!emberContent?.trim()) return;
            blockData.emberContent = emberContent.trim();
        } else if (selectedBlockType === 'narrator') {
            if (!narratorContent?.trim()) return;
            blockData.narratorContent = narratorContent.trim();
        } else if (selectedBlockType === 'contributions') {
            if (selectedContributions.length === 0) return;
            blockData.contributions = selectedContributions;
        } else if (selectedBlockType === 'demo') {
            if (selectedDemoContributions.length === 0) return;
            blockData.demoContributions = selectedDemoContributions;
        }

        onAddBlock(blockData);
        onClose();
    };

    const modalContent = (
        <ModalContent
            selectedBlockType={selectedBlockType}
            setSelectedBlockType={setSelectedBlockType}
            availableMedia={availableMedia}
            selectedMedia={selectedMedia}
            setSelectedMedia={setSelectedMedia}
            storyMessages={storyMessages}
            selectedContributions={selectedContributions}
            setSelectedContributions={setSelectedContributions}
            emberContent={emberContent}
            setEmberContent={setEmberContent}
            narratorContent={narratorContent}
            setNarratorContent={setNarratorContent}
            loading={loading}
            setLoading={setLoading}
            onAddBlock={handleAddBlock}
            onClose={onClose}
            currentEmberVoiceId={currentEmberVoiceId}
            currentNarratorVoiceId={currentNarratorVoiceId}
            // Demo Circle props
            demoContributions={demoContributions}
            selectedDemoContributions={selectedDemoContributions}
            setSelectedDemoContributions={setSelectedDemoContributions}
            newDemoFirstName={newDemoFirstName}
            setNewDemoFirstName={setNewDemoFirstName}
            newDemoLastName={newDemoLastName}
            setNewDemoLastName={setNewDemoLastName}
            newDemoContent={newDemoContent}
            setNewDemoContent={setNewDemoContent}
            editingDemoId={editingDemoId}
            setEditingDemoId={setEditingDemoId}
            onCreateDemo={fetchDemoContributions}
            emberId={emberId}
            user={user}
            fetchDemoContributions={fetchDemoContributions}
            // Demo Circle recording props
            isRecording={isRecording}
            recordingDuration={recordingDuration}
            hasRecording={hasRecording}
            isPlaying={isPlaying}
            audioBlob={audioBlob}
            availableMicrophones={availableMicrophones}
            selectedMicrophone={selectedMicrophone}
            setSelectedMicrophone={setSelectedMicrophone}
            isTranscribing={isTranscribing}
            startRecording={startRecording}
            stopRecording={stopRecording}
            playRecording={playRecording}
            resetRecording={resetRecording}
            audioRef={audioRef}
        />
    );

    return (
        <>
            {isMobile ? (
                <Drawer open={isOpen} onOpenChange={onClose}>
                    <DrawerContent className="bg-white focus:outline-none">
                        <DrawerHeader className="bg-white">
                            <DrawerTitle className="flex items-center gap-2 text-xl font-bold text-gray-900">
                                <Plus size={20} className="text-blue-600" />
                                Add Block
                            </DrawerTitle>
                            <DrawerDescription className="text-left text-gray-600">
                                Add media, AI content, or story contributions
                            </DrawerDescription>
                        </DrawerHeader>
                        <div className="px-4 pb-4 bg-white max-h-[70vh] overflow-y-auto">
                            {modalContent}
                        </div>
                    </DrawerContent>
                </Drawer>
            ) : (
                <Dialog open={isOpen} onOpenChange={onClose}>
                    <DialogContent className="w-[calc(100%-2rem)] max-w-2xl max-h-[90vh] overflow-y-auto bg-white sm:w-full sm:max-w-2xl rounded-2xl focus:outline-none">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2 text-xl font-bold text-gray-900">
                                <Plus size={20} className="text-blue-600" />
                                Add Block
                            </DialogTitle>
                            <DialogDescription className="text-gray-600">
                                Add media, AI content, or story contributions
                            </DialogDescription>
                        </DialogHeader>
                        {modalContent}
                    </DialogContent>
                </Dialog>
            )}

        </>
    );
} 