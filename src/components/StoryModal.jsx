import React, { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { BookOpen, Mic, MicOff, Play, Pause, Settings, Send, User, Sparkles, Check, ChevronsUpDown } from 'lucide-react';
import { ArrowClockwise } from 'phosphor-react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { cn } from '@/lib/utils';
import { uploadToBlob } from '../lib/storage';
import useStore from '../store';
import { 
  getOrCreateStoryConversation, 
  addStoryMessage, 
  getStoryConversationWithMessages,
  completeStoryConversation,
  getAllStoryMessagesForEmber
} from '../lib/database';
import { speechToText, storeVoiceTraining } from '../lib/elevenlabs';

// Media query hook
function useMediaQuery(query) {
  const [matches, setMatches] = useState(false);
  
  useEffect(() => {
    const media = window.matchMedia(query);
    if (media.matches !== matches) {
      setMatches(media.matches);
    }
    const listener = () => setMatches(media.matches);
    media.addListener(listener);
    return () => media.removeListener(listener);
  }, [matches, query]);
  
  return matches;
}

// Microphone Combobox Component
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
            selectedMicrophone && "border-blue-500 bg-blue-50"
          )}
          title="Select microphone"
        >
          <Settings 
            size={16} 
            className={cn(
              "transition-colors",
              selectedMicrophone ? "text-blue-600" : "text-gray-500"
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

const ModalContent = ({ 
  messages,
  currentAnswer,
  setCurrentAnswer,
  isRecording,
  startRecording,
  stopRecording,
  isProcessing,
  handleSubmit,
  recordingDuration,
  hasRecording,
  playRecording,
  isPlaying,
  availableMicrophones,
  selectedMicrophone,
  setSelectedMicrophone,
  currentQuestion,
  messagesEndRef,
  onClose,
  isLoading,
  ember,
  user,
  userProfile
}) => (
  <div className="space-y-4">
    {isLoading ? (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Loading conversation...</span>
      </div>
    ) : (
      <>
        {/* Chat Messages */}
        <div className="space-y-4 max-h-60 overflow-y-auto">
          {messages.map((message, index) => {
            // Determine display name for user messages
            const getUserDisplayName = (msg) => {
              if (msg.sender === 'ember') return 'Ember AI';
              if (msg.isCurrentUser) return 'You';
              if (msg.userFirstName) return msg.userFirstName;
              return 'Anonymous User';
            };

            const getUserAvatar = (msg) => {
              if (msg.isCurrentUser) return userProfile?.avatar_url;
              return msg.userAvatarUrl;
            };

            return (
              <div
                key={index}
                className={`flex w-full gap-3 ${
                  message.sender === 'ember' ? 'justify-start' : 'justify-end'
                }`}
              >
                {/* Avatar - only show on left side for ember messages */}
                {message.sender === 'ember' && (
                  <Avatar className="h-8 w-8 flex-shrink-0">
                    <AvatarImage src="/ember-ai-avatar.png" alt="Ember AI" />
                    <AvatarFallback className="bg-blue-500 text-white">
                      <Sparkles size={16} />
                    </AvatarFallback>
                  </Avatar>
                )}

                <div
                  className={`max-w-[75%] ${
                    message.sender === 'ember' ? 'order-2' : 'order-1'
                  }`}
                >
                  {/* Sender name */}
                  <div className={`flex items-center gap-2 mb-1 ${
                    message.sender === 'ember' ? 'justify-start' : 'justify-end'
                  }`}>
                    <span className={`text-xs font-medium ${
                      message.sender === 'ember' 
                        ? 'text-blue-700' 
                        : message.isCurrentUser 
                          ? 'text-green-700' 
                          : 'text-purple-700'
                    }`}>
                      {getUserDisplayName(message)}
                    </span>
                    <span className="text-xs text-gray-400">
                      {message.timestamp}
                    </span>
                  </div>

                  {/* Message bubble */}
                  <div
                    className={`p-3 rounded-lg ${
                      message.sender === 'ember'
                        ? 'bg-blue-100 text-blue-900 rounded-tl-none'
                        : message.isCurrentUser
                          ? 'bg-green-100 text-green-900 rounded-tr-none'
                          : 'bg-purple-100 text-purple-900 rounded-tr-none'
                    }`}
                  >
                    <p className="text-sm">{message.content}</p>
                    {message.hasVoiceRecording && (
                      <div className="flex items-center gap-2 mt-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                        <span className="text-xs opacity-70">Audio message</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Avatar - only show on right side for user messages */}
                {message.sender === 'user' && (
                  <Avatar className="h-8 w-8 flex-shrink-0">
                    <AvatarImage 
                      src={getUserAvatar(message)} 
                      alt={getUserDisplayName(message)} 
                    />
                    <AvatarFallback className={`text-white ${
                      message.isCurrentUser ? 'bg-green-500' : 'bg-purple-500'
                    }`}>
                      <User size={16} />
                    </AvatarFallback>
                  </Avatar>
                )}
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        {/* Current Question */}
        {currentQuestion && (
          <div className="flex w-full gap-3 justify-start">
            <Avatar className="h-8 w-8 flex-shrink-0">
              <AvatarImage src="/ember-ai-avatar.png" alt="Ember AI" />
              <AvatarFallback className="bg-blue-500 text-white">
                <Sparkles size={16} />
              </AvatarFallback>
            </Avatar>
            
            <div className="max-w-[75%]">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-medium text-blue-700">
                  Ember AI
                </span>
                <span className="text-xs text-gray-400">
                  now
                </span>
              </div>
              
              <div className="bg-blue-50 border border-blue-200 rounded-lg rounded-tl-none p-3">
                <p className="text-sm text-blue-900 font-medium">
                  {currentQuestion}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Response Input */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Avatar className="h-6 w-6">
                <AvatarImage src={userProfile?.avatar_url} alt={userProfile?.first_name || user?.email || 'User'} />
                <AvatarFallback className="bg-gray-500 text-white text-xs">
                  <User size={12} />
                </AvatarFallback>
              </Avatar>
              <span className="text-sm font-medium text-gray-700">
                {userProfile?.first_name || user?.email?.split('@')[0] || 'Your'} Response
              </span>
            </div>
          </div>

          <Textarea
            value={currentAnswer}
            onChange={(e) => setCurrentAnswer(e.target.value)}
            placeholder="Type your response or record your voice..."
            className="min-h-20 resize-none"
            disabled={isProcessing}
          />

          {/* Recording Controls */}
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant={isRecording ? "destructive" : "outline"}
                size="sm"
                onClick={isRecording ? stopRecording : startRecording}
                disabled={isProcessing}
                className="flex items-center gap-2"
              >
                {isRecording ? (
                  <>
                    <MicOff size={16} />
                    Stop ({recordingDuration}s)
                  </>
                ) : (
                  <>
                    <Mic size={16} />
                    Record
                  </>
                )}
              </Button>

              {/* Microphone Selection Combobox */}
              {availableMicrophones.length > 1 && (
                <MicrophoneCombobox 
                  microphones={availableMicrophones}
                  selectedMicrophone={selectedMicrophone}
                  onSelectMicrophone={setSelectedMicrophone}
                  disabled={isProcessing}
                />
              )}

              {hasRecording && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={playRecording}
                  disabled={isProcessing || isPlaying}
                  className="flex items-center gap-2"
                >
                  {isPlaying ? <Pause size={16} /> : <Play size={16} />}
                  {isPlaying ? 'Pause' : 'Play'}
                </Button>
              )}
            </div>
            
            {/* Submit Response Button - Full Width */}
            <Button
              onClick={handleSubmit}
              disabled={(!currentAnswer.trim() && !hasRecording) || isProcessing}
              className="w-full flex items-center justify-center gap-2"
            >
              <Send size={16} />
              {isProcessing ? (hasRecording ? 'Processing Audio...' : 'Sending...') : 'Submit Response'}
            </Button>
          </div>
        </div>
      </>
    )}
  </div>
);

export default function StoryModal({ isOpen, onClose, ember, question, onSubmit, onRefresh, isRefreshing }) {
  const { user, userProfile } = useStore();
  const isMobile = useMediaQuery('(max-width: 768px)');
  
  // State
  const [messages, setMessages] = useState([]);
  const [currentAnswer, setCurrentAnswer] = useState('');
  const [currentQuestion, setCurrentQuestion] = useState('');
  const [conversation, setConversation] = useState(null);
  
  // Recording state
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [hasRecording, setHasRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioBlob, setAudioBlob] = useState(null);
  const [availableMicrophones, setAvailableMicrophones] = useState([]);
  const [selectedMicrophone, setSelectedMicrophone] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const mediaRecorderRef = useRef(null);
  const audioRef = useRef(null);
  const recordingIntervalRef = useRef(null);
  const messagesEndRef = useRef(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  // Get available microphones
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

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Load conversation when modal opens
  useEffect(() => {
    if (isOpen && ember?.id && user?.id) {
      loadConversation();
    }
  }, [isOpen, ember?.id, user?.id]);

  // Reset state when modal opens and get microphones
  useEffect(() => {
    if (isOpen) {
      // Reset UI state
      setCurrentAnswer('');
      setIsRecording(false);
      setIsProcessing(false);
      setRecordingDuration(0);
      setHasRecording(false);
      setIsPlaying(false);
      setAudioBlob(null);
      
      // Get available microphones
      getAvailableMicrophones();
    }
  }, [isOpen]);

  // Load existing conversation or create new one
  const loadConversation = async () => {
    if (!ember?.id || !user?.id) {
      console.log('loadConversation: Missing ember.id or user.id');
      return;
    }

    try {
      setIsLoading(true);
      console.log('loadConversation: Creating/getting conversation for ember:', ember.id, 'user:', user.id);

      // Get or create conversation for current user (for submitting new answers)
      const conv = await getOrCreateStoryConversation(ember.id, user.id, 'story');
      console.log('loadConversation: Conversation result:', conv);
      setConversation(conv);

      // Load ALL story messages for this ember (from all users)
      console.log('loadConversation: Loading all story messages for ember');
      const allMessages = await getAllStoryMessagesForEmber(ember.id);
      
      if (allMessages.messages && allMessages.messages.length > 0) {
        // Convert database messages to UI format, including user info
        const uiMessages = allMessages.messages.map(msg => ({
          sender: msg.sender,
          content: msg.content,
          timestamp: new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          type: msg.message_type,
          hasVoiceRecording: msg.has_audio,
          audioUrl: msg.audio_url,
          messageId: msg.id,
          userId: msg.user_id,
          userFirstName: msg.user_first_name,
          userLastName: msg.user_last_name,
          userAvatarUrl: msg.user_avatar_url,
          isCurrentUser: msg.user_id === user.id
        }));

        setMessages(uiMessages);

        // Set next question based on current user's conversation progress
        // Get current user's answers only
        const currentUserAnswers = uiMessages.filter(msg => 
          msg.type === 'answer' && msg.userId === user.id
        ).length;
        
        if (currentUserAnswers < 10) { // Still have questions to ask
          const nextQuestion = generateFollowUpQuestion(uiMessages.filter(msg => msg.userId === user.id));
          setCurrentQuestion(nextQuestion);
        } else {
          setCurrentQuestion(''); // No more questions for current user
        }
      } else {
        // No messages yet - start with first question
        setMessages([]);
        setCurrentQuestion(question || "Tell us about this moment. What was happening when this photo was taken?");
      }
    } catch (error) {
      console.error('Error loading conversation:', error);
      console.error('Error details:', error.message, error.stack);
      
      // Check if it's a database table error
      if (error.message.includes('relation') && error.message.includes('does not exist')) {
        alert('Database tables not found. Please run the database migration first.');
      }
      
      // Fallback to new conversation
      setMessages([]);
      setCurrentQuestion(question || "Tell us about this moment. What was happening when this photo was taken?");
    } finally {
      setIsLoading(false);
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
      console.log('🎤 Starting recording...');
      console.log('📱 Mobile device:', isMobileDevice());
      console.log('🎛️ Selected microphone:', selectedMicrophone);
      
      // Mobile-optimized audio constraints
      const baseConstraints = {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      };

      // Add mobile-specific optimizations
      if (isMobileDevice()) {
        // Use lower sample rate for mobile to reduce file size and improve compatibility
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
      
      console.log('📋 Audio constraints:', audioConstraints);
        
      const stream = await navigator.mediaDevices.getUserMedia({ audio: audioConstraints });
      console.log('✅ Microphone stream obtained');
      console.log('📊 Stream settings:', stream.getAudioTracks()[0]?.getSettings());
      
      // Get the best supported MIME type for this device
      const mimeType = getSupportedMimeType();
      
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: mimeType
      });
      console.log('🎬 MediaRecorder created');
      console.log('📝 MIME type:', mediaRecorder.mimeType);
      console.log('📈 State:', mediaRecorder.state);
      
      mediaRecorderRef.current = mediaRecorder;

      const audioChunks = [];
      
      mediaRecorder.ondataavailable = (event) => {
        console.log('📦 Data available:', event.data.size, 'bytes');
        if (event.data.size > 0) {
          audioChunks.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        console.log('⏹️ Recording stopped');
        console.log('📊 Total chunks:', audioChunks.length);
        
        // Use the same MIME type that was used for recording
        const audioBlob = new Blob(audioChunks, { type: mimeType });
        console.log('🎵 Audio blob created:', {
          size: audioBlob.size,
          type: audioBlob.type,
          sizeMB: (audioBlob.size / 1024 / 1024).toFixed(2)
        });
        
        // Check file size for mobile optimization
        if (isMobileDevice() && audioBlob.size > 5 * 1024 * 1024) { // 5MB limit for mobile
          console.warn('⚠️ Large audio file detected on mobile:', audioBlob.size, 'bytes');
        }
        
        setAudioBlob(audioBlob);
        setHasRecording(true);
        
        console.log('📋 Setting audio blob state:', {
          blobSet: true,
          hasRecordingSet: true,
          blobSize: audioBlob.size
        });
        
        // Stop all tracks to release microphone
        stream.getTracks().forEach(track => track.stop());
        console.log('✅ Recording processing complete');
      };

      mediaRecorder.onerror = (error) => {
        console.error('❌ MediaRecorder error:', error);
      };

      mediaRecorder.start();
      console.log('🔴 Recording started');
      
      setIsRecording(true);
      setRecordingDuration(0);

      // Start duration counter
      recordingIntervalRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);

    } catch (error) {
      console.error('❌ Error starting recording:', error);
      console.error('❌ Error details:', error.message);
      
      // Mobile-specific error handling
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
      } else if (error.name === 'NotSupportedError') {
        alert('Audio recording is not supported on this device or browser. Please try using a different browser.');
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
    console.log('🎵 playRecording called', {
      hasAudioBlob: !!audioBlob,
      audioBlobSize: audioBlob?.size,
      hasAudioRef: !!audioRef.current,
      isPlaying,
      hasRecording
    });
    
    if (audioBlob && audioRef.current) {
      try {
        if (isPlaying) {
          console.log('⏸️ Pausing audio');
          audioRef.current.pause();
          setIsPlaying(false);
        } else {
          console.log('▶️ Starting audio playback');
          
          // Clean up any existing object URL
          if (audioRef.current.src && audioRef.current.src.startsWith('blob:')) {
            URL.revokeObjectURL(audioRef.current.src);
          }
          
          // Set up new audio source
          audioRef.current.src = URL.createObjectURL(audioBlob);
          console.log('🎵 Audio source set:', audioRef.current.src);
          
          // Set up event handlers before playing
          audioRef.current.onended = () => {
            console.log('🏁 Audio playback ended');
            setIsPlaying(false);
          };
          
          audioRef.current.onerror = (e) => {
            console.error('Audio playback error:', e);
            setIsPlaying(false);
            alert('Could not play audio recording. Please try recording again.');
          };
          
          // Play audio (returns a Promise)
          await audioRef.current.play();
          setIsPlaying(true);
          
          console.log('🔊 Playing recorded audio successfully');
        }
      } catch (error) {
        console.error('❌ Error playing audio:', error);
        setIsPlaying(false);
        
        // Handle specific play() errors
        if (error.name === 'NotSupportedError') {
          alert('Audio format not supported for playback on this device.');
        } else if (error.name === 'NotAllowedError') {
          alert('Audio playback not allowed. Please check your browser settings.');
        } else {
          alert('Could not play audio. Please try again.');
        }
      }
    } else {
      console.warn('⚠️ No audio blob or audio element available', {
        hasAudioBlob: !!audioBlob,
        audioBlobSize: audioBlob?.size,
        hasAudioRef: !!audioRef.current,
        audioRefCurrent: audioRef.current
      });
      alert('No recording available to play.');
    }
  };

  const handleSubmit = async () => {
    if (!currentAnswer.trim() && !hasRecording) return;
    
    // Debug logging
    console.log('StoryModal handleSubmit called');
    console.log('currentAnswer:', currentAnswer);
    console.log('conversation:', conversation);
    console.log('user:', user);
    console.log('ember:', ember);
    
    if (!conversation?.id) {
      console.error('No conversation ID found - conversation may not have been created');
      alert('Could not save response: conversation not initialized. Please try again.');
      return;
    }
    
    try {
      setIsProcessing(true);
      
      // Add current question to database and messages if it's not already there
      const updatedMessages = [...messages];
      let currentQuestionMessage = null;
      
      // Add the current question if it exists and hasn't been added yet
      if (currentQuestion && !messages.some(msg => msg.content === currentQuestion && msg.sender === 'ember')) {
        // Save question to database
        currentQuestionMessage = await addStoryMessage({
          conversationId: conversation.id,
          sender: 'ember',
          messageType: 'question',
          content: currentQuestion,
          hasAudio: false
        });

        const uiQuestionMessage = {
          sender: 'ember',
          content: currentQuestion,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          type: 'question',
          hasVoiceRecording: false,
          messageId: currentQuestionMessage.id
        };
        
        updatedMessages.push(uiQuestionMessage);
      }

      let audioUrl = null;
      let audioFilename = null;
      let audioDurationSeconds = null;
      let audioSizeBytes = null;
      let transcriptionText = currentAnswer.trim();
      let sttTranscription = '';
      let sttConfidence = 0;

      // Handle audio upload and speech-to-text if available
      if (hasRecording && audioBlob) {
        try {
          // First, run speech-to-text on the recording
          try {
            // Check if API key is available
            const apiKey = import.meta.env.VITE_ELEVENLABS_API_KEY;
            if (!apiKey) {
              console.error('❌ VITE_ELEVENLABS_API_KEY not found in environment variables');
              console.error('💡 Add VITE_ELEVENLABS_API_KEY=your_api_key to your .env file');
              throw new Error('ElevenLabs API key not configured');
            }
            
            console.log('🎤 Running speech-to-text via ElevenLabs...');
            console.log('📄 Audio blob details:', {
              size: audioBlob.size,
              type: audioBlob.type,
              mobile: isMobileDevice()
            });
            
            // Note about mobile format compatibility with ElevenLabs
            if (isMobileDevice() && !audioBlob.type.includes('webm')) {
              console.warn('⚠️ Mobile audio format detected:', audioBlob.type, '- ElevenLabs prefers WebM but should handle this format');
            }
            
            sttTranscription = await speechToText(audioBlob);
            sttConfidence = 1.0; // ElevenLabs doesn't return confidence, assume high
            
            console.log('✅ Speech-to-text completed successfully!');
            console.log(`📝 Transcribed text: "${sttTranscription}"`);
            console.log(`📊 Text length: ${sttTranscription.length} characters`);
            
            // Store for voice training data
            if (sttTranscription && user?.id) {
              console.log('💾 Storing voice training data...');
              await storeVoiceTraining(audioBlob, sttTranscription, user.id);
            }
          } catch (sttError) {
            console.error('❌ Speech-to-text error:', sttError);
            console.error('❌ Error details:', sttError.message);
            console.error('💡 Possible issues:');
            console.error('   - API key not set or invalid');
            console.error('   - Network connection issue');
            console.error('   - Audio format not supported');
            console.error('   - ElevenLabs service temporarily unavailable');
            // Continue without STT if it fails
          }

          // Create audio file with proper extension based on recorded format
          const getFileExtension = (mimeType) => {
            if (mimeType.includes('webm')) return 'webm';
            if (mimeType.includes('mp4')) return 'm4a';
            if (mimeType.includes('ogg')) return 'ogg';
            if (mimeType.includes('wav')) return 'wav';
            return 'webm'; // fallback
          };

          const extension = getFileExtension(audioBlob.type);
          const audioFile = new File([audioBlob], `story-${Date.now()}.${extension}`, { 
            type: audioBlob.type 
          });
          
          console.log('📁 Audio file created:', {
            name: audioFile.name,
            type: audioFile.type,
            size: audioFile.size,
            mobile: isMobileDevice()
          });

          // Upload to blob storage
          const uploadResult = await uploadToBlob(audioFile, 'audio', user.id);
          audioUrl = uploadResult.url;
          audioFilename = uploadResult.filename;
          audioSizeBytes = audioFile.size;
          audioDurationSeconds = recordingDuration;

          // Use STT transcription if available, otherwise use manual text or fallback
          if (sttTranscription && sttTranscription.trim()) {
            // If user typed text AND we have STT, combine them
            if (transcriptionText && transcriptionText.trim()) {
              transcriptionText = `${transcriptionText}\n\n[Voice transcription: ${sttTranscription}]`;
            } else {
              // Use STT as the primary text
              transcriptionText = sttTranscription;
            }
          } else if (!transcriptionText || !transcriptionText.trim()) {
            // Fallback if no text and no STT
            transcriptionText = '[Voice Response]';
          }
        } catch (error) {
          console.error('Error processing audio:', error);
          // Continue without audio if upload fails
        }
      }

      // Save user's answer to database
      const userMessage = await addStoryMessage({
        conversationId: conversation.id,
        sender: 'user',
        messageType: 'answer',
        content: transcriptionText,
        hasAudio: hasRecording,
        audioUrl,
        audioFilename,
        audioDurationSeconds,
        audioSizeBytes,
        transcriptionStatus: hasRecording ? (sttTranscription ? 'completed' : 'failed') : 'none',
        transcriptionConfidence: hasRecording ? sttConfidence : null
      });

      // Add user's response to UI
      const uiUserResponse = {
        sender: 'user',
        content: transcriptionText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        type: 'answer',
        hasVoiceRecording: hasRecording,
        audioUrl,
        messageId: userMessage.id
      };
      
      updatedMessages.push(uiUserResponse);
      setMessages(updatedMessages);
      
      // Reset current answer and recording
      setCurrentAnswer('');
      setHasRecording(false);
      setAudioBlob(null);
      setRecordingDuration(0);
      
      // Generate next question based on the conversation
      const answerCount = updatedMessages.filter(msg => msg.type === 'answer').length;
      if (answerCount < 10) { // Limit to 10 questions
        const nextQuestion = generateFollowUpQuestion(updatedMessages);
        setCurrentQuestion(nextQuestion);
      } else {
        setCurrentQuestion(''); // No more questions - conversation complete
        
        // Mark conversation as completed
        await completeStoryConversation(conversation.id, user.id);
      }
      
      // Prepare submission data for parent component
      const submissionData = {
        conversationId: conversation.id,
        messages: updatedMessages,
        currentResponse: uiUserResponse
      };
      
      // Call parent submit handler (optional - could be used for additional processing)
      if (onSubmit) {
        await onSubmit(submissionData);
      }
      
    } catch (error) {
      console.error('Error submitting response:', error);
      alert('Could not submit response. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Generate follow-up questions based on conversation history
  const generateFollowUpQuestion = (conversationHistory) => {
    const followUpQuestions = [
      "What emotions were you feeling in that moment?",
      "Who else was involved in this experience?",
      "What led up to this moment?",
      "How did this experience change you?",
      "What details from that day do you remember most vividly?",
      "What was the most surprising thing about this experience?",
      "If you could go back, what would you do differently?",
      "What would you want others to learn from this story?",
      "How does this moment fit into your larger life story?",
      "What sounds, smells, or textures do you remember from that time?"
    ];
    
    // Simple logic to pick a question based on conversation length
    const questionIndex = Math.min(conversationHistory.filter(msg => msg.type === 'answer').length, followUpQuestions.length - 1);
    return followUpQuestions[questionIndex];
  };

  // Handle refresh functionality
  const handleRefresh = async () => {
    console.log('🔄 Refreshing story conversation...');
    if (onRefresh) {
      await onRefresh();
    }
    // Also reload the conversation data
    if (ember?.id && user?.id) {
      loadConversation();
    }
  };

  // Responsive render: Drawer on mobile, Dialog on desktop
  if (isMobile) {
    return (
      <Drawer open={isOpen} onOpenChange={onClose}>
        <DrawerContent className="bg-white focus:outline-none">
          <DrawerHeader className="bg-white">
            <DrawerTitle className="flex items-center gap-2 text-xl font-bold text-gray-900">
              <BookOpen size={20} className="text-blue-600" />
              The Story
              {onRefresh && (
                <button
                  onClick={handleRefresh}
                  disabled={isRefreshing}
                  className="p-1 hover:bg-gray-100 rounded transition-colors disabled:opacity-50"
                  title="Refresh story data"
                >
                  <ArrowClockwise 
                    size={16} 
                    className={`text-gray-400 ${isRefreshing ? 'animate-spin' : ''}`} 
                  />
                </button>
              )}
            </DrawerTitle>
            <DrawerDescription className="text-left text-gray-600">
              Share the story behind this moment
            </DrawerDescription>
          </DrawerHeader>
          <div className="px-4 pb-4 bg-white max-h-[70vh] overflow-y-auto">
            <ModalContent 
              messages={messages}
              currentAnswer={currentAnswer}
              setCurrentAnswer={setCurrentAnswer}
              currentQuestion={currentQuestion}
              isRecording={isRecording}
              startRecording={startRecording}
              stopRecording={stopRecording}
              isProcessing={isProcessing}
              handleSubmit={handleSubmit}
              recordingDuration={recordingDuration}
              hasRecording={hasRecording}
              playRecording={playRecording}
              isPlaying={isPlaying}
              availableMicrophones={availableMicrophones}
              selectedMicrophone={selectedMicrophone}
              setSelectedMicrophone={setSelectedMicrophone}
              messagesEndRef={messagesEndRef}
              onClose={onClose}
              isLoading={isLoading}
              ember={ember}
              user={user}
              userProfile={userProfile}
            />
            <audio ref={audioRef} style={{ display: 'none' }} />
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  // Desktop Dialog
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[calc(100%-2rem)] max-w-lg max-h-[90vh] overflow-y-auto bg-white sm:w-full sm:max-w-lg rounded-2xl focus:outline-none">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-bold text-gray-900">
            <BookOpen size={20} className="text-blue-600" />
            The Story
            {onRefresh && (
              <button
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="p-1 hover:bg-gray-100 rounded transition-colors disabled:opacity-50"
                title="Refresh story data"
              >
                <ArrowClockwise 
                  size={16} 
                  className={`text-gray-400 ${isRefreshing ? 'animate-spin' : ''}`} 
                />
              </button>
            )}
          </DialogTitle>
          <DialogDescription className="text-gray-600">
            Share the story behind this moment
          </DialogDescription>
        </DialogHeader>
        <ModalContent 
          messages={messages}
          currentAnswer={currentAnswer}
          setCurrentAnswer={setCurrentAnswer}
          currentQuestion={currentQuestion}
          isRecording={isRecording}
          startRecording={startRecording}
          stopRecording={stopRecording}
          isProcessing={isProcessing}
          handleSubmit={handleSubmit}
          recordingDuration={recordingDuration}
          hasRecording={hasRecording}
          playRecording={playRecording}
          isPlaying={isPlaying}
          availableMicrophones={availableMicrophones}
          selectedMicrophone={selectedMicrophone}
          setSelectedMicrophone={setSelectedMicrophone}
          messagesEndRef={messagesEndRef}
          onClose={onClose}
          isLoading={isLoading}
          ember={ember}
          user={user}
          userProfile={userProfile}
        />
        <audio ref={audioRef} style={{ display: 'none' }} />
      </DialogContent>
    </Dialog>
  );
} 