import React, { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { BookOpen, Mic, MicOff, Play, Pause, Settings, Send } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { uploadToBlob } from '../lib/storage';
import useStore from '../store';
import { 
  getOrCreateStoryConversation, 
  addStoryMessage, 
  getStoryConversationWithMessages,
  completeStoryConversation
} from '../lib/database';

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
  isLoading
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
        <div className="space-y-3 max-h-60 overflow-y-auto">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex w-full ${
                message.sender === 'ember' ? 'justify-start' : 'justify-end'
              }`}
            >
              <div
                className={`max-w-[80%] p-3 rounded-lg ${
                  message.sender === 'ember'
                    ? 'bg-blue-100 text-blue-900'
                    : 'bg-white border text-gray-900'
                }`}
              >
                <p className="text-sm">{message.content}</p>
                <p className="text-xs opacity-70 mt-1">{message.timestamp}</p>
                {message.hasVoiceRecording && (
                  <div className="flex items-center gap-2 mt-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-xs">Voice recording</span>
                  </div>
                )}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Current Question */}
        {currentQuestion && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-sm text-blue-900 font-medium">
              {currentQuestion}
            </p>
          </div>
        )}

        {/* Response Input */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">Your Response</span>
            
            {/* Microphone Selection */}
            {availableMicrophones.length > 1 && (
              <div className="flex items-center gap-2">
                <Settings size={16} className="text-gray-500" />
                <Select value={selectedMicrophone} onValueChange={setSelectedMicrophone}>
                  <SelectTrigger className="w-40 h-8 text-xs">
                    <SelectValue placeholder="Select microphone" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableMicrophones.map((mic) => (
                      <SelectItem key={mic.deviceId} value={mic.deviceId}>
                        {mic.label || `Microphone ${mic.deviceId.slice(0, 8)}...`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <Textarea
            value={currentAnswer}
            onChange={(e) => setCurrentAnswer(e.target.value)}
            placeholder="Type your response or record your voice..."
            className="min-h-20 resize-none"
            disabled={isProcessing}
          />

          {/* Recording Controls */}
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

            {hasRecording && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={playRecording}
                disabled={isProcessing}
                className="flex items-center gap-2"
              >
                {isPlaying ? <Pause size={16} /> : <Play size={16} />}
                {isPlaying ? 'Pause' : 'Play'}
              </Button>
            )}

            <div className="flex-1" />

            <Button
              onClick={handleSubmit}
              disabled={(!currentAnswer.trim() && !hasRecording) || isProcessing}
              className="flex items-center gap-2"
            >
              <Send size={16} />
              {isProcessing ? 'Sending...' : 'Send Response'}
            </Button>
          </div>
        </div>
      </>
    )}
  </div>
);

export default function StoryModal({ isOpen, onClose, ember, question, onSubmit }) {
  const { user } = useStore();
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
      const audioInputs = devices.filter(device => device.kind === 'audioinput');
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

      // Get or create conversation
      const conv = await getOrCreateStoryConversation(ember.id, user.id, 'story');
      console.log('loadConversation: Conversation result:', conv);
      setConversation(conv);

      // Load existing messages
      const convWithMessages = await getStoryConversationWithMessages(conv.id);
      
      if (convWithMessages.messages && convWithMessages.messages.length > 0) {
        // Convert database messages to UI format
        const uiMessages = convWithMessages.messages.map(msg => ({
          sender: msg.sender,
          content: msg.content,
          timestamp: new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          type: msg.message_type,
          hasVoiceRecording: msg.has_audio,
          audioUrl: msg.audio_url,
          messageId: msg.id
        }));

        setMessages(uiMessages);

        // Set next question based on conversation progress
        const answerCount = uiMessages.filter(msg => msg.type === 'answer').length;
        if (answerCount < 10) { // Still have questions to ask
          const nextQuestion = generateFollowUpQuestion(uiMessages);
          setCurrentQuestion(nextQuestion);
        } else {
          setCurrentQuestion(''); // No more questions
        }
      } else {
        // New conversation - start with first question
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

  const startRecording = async () => {
    try {
      // Use selected microphone or default audio constraints
      const audioConstraints = selectedMicrophone 
        ? { deviceId: { exact: selectedMicrophone } }
        : true;
        
      const stream = await navigator.mediaDevices.getUserMedia({ audio: audioConstraints });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      const audioChunks = [];
      
      mediaRecorder.ondataavailable = (event) => {
        audioChunks.push(event.data);
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
        setAudioBlob(audioBlob);
        setHasRecording(true);
        
        // Stop all tracks to release microphone
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingDuration(0);

      // Start duration counter
      recordingIntervalRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);

    } catch (error) {
      console.error('Error starting recording:', error);
      alert('Could not start recording. Please check microphone permissions.');
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

  const playRecording = () => {
    if (audioBlob && audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        audioRef.current.src = URL.createObjectURL(audioBlob);
        audioRef.current.play();
        setIsPlaying(true);
        
        audioRef.current.onended = () => {
          setIsPlaying(false);
        };
      }
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

      // Handle audio upload if available
      if (hasRecording && audioBlob) {
        try {
          // Convert WebM to WebM for now (in production, convert to MP3)
          const audioFile = new File([audioBlob], `story-${Date.now()}.webm`, { 
            type: 'audio/webm' 
          });

          // Upload to blob storage
          const uploadResult = await uploadToBlob(audioFile, 'audio', user.id);
          audioUrl = uploadResult.url;
          audioFilename = uploadResult.filename;
          audioSizeBytes = audioFile.size;
          audioDurationSeconds = recordingDuration;

          // Use transcription if no text was provided
          if (!transcriptionText) {
            transcriptionText = '[Voice Response]';
          }
        } catch (error) {
          console.error('Error uploading audio:', error);
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
        transcriptionStatus: hasRecording ? 'completed' : 'none'
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

  // Responsive render: Drawer on mobile, Dialog on desktop
  if (isMobile) {
    return (
      <Drawer open={isOpen} onOpenChange={onClose}>
        <DrawerContent className="bg-white">
          <DrawerHeader className="bg-white">
            <DrawerTitle className="flex items-center gap-2 text-xl font-bold text-gray-900">
              <BookOpen size={20} className="text-blue-600" />
              The Story
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
            />
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  // Desktop Dialog
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[calc(100%-2rem)] max-w-lg max-h-[90vh] overflow-y-auto bg-white sm:w-full sm:max-w-lg rounded-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-bold text-gray-900">
            <BookOpen size={20} className="text-blue-600" />
            The Story
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
        />
        <audio ref={audioRef} style={{ display: 'none' }} />
      </DialogContent>
    </Dialog>
  );
} 