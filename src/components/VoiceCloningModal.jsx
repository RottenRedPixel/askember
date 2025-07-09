import { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Microphone, Square, Play, Trash, Upload, Sparkle, CheckCircle, Warning } from 'phosphor-react';
import { createVoice } from '@/lib/elevenlabs';

const VOICE_TRAINING_SCRIPTS = [
  "Hello, my name is [Name] and I'm creating my personal voice model for digital storytelling.",
  "I love sharing memories with family and friends through technology that brings us closer together.",
  "Every story has a beginning, a middle, and an end. The memories we create today become tomorrow's treasures.",
  "Technology should enhance human connection, not replace it. That's why I'm training my voice to tell authentic stories.",
  "Whether it's a birthday celebration, a family vacation, or a quiet moment at home, every memory deserves to be preserved.",
];

const VoiceCloningModal = ({ isOpen, onClose, onVoiceCreated, userProfile }) => {
  // Recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordings, setRecordings] = useState([]);
  const [currentScriptIndex, setCurrentScriptIndex] = useState(0);
  const [recordingProgress, setRecordingProgress] = useState(0);
  
  // Voice creation state
  const [voiceName, setVoiceName] = useState('');
  const [voiceDescription, setVoiceDescription] = useState('');
  const [isCreatingVoice, setIsCreatingVoice] = useState(false);
  const [creationStatus, setCreationStatus] = useState(''); // 'success', 'error', ''
  const [creationMessage, setCreationMessage] = useState('');
  
  // Modal state
  const [currentStep, setCurrentStep] = useState('instructions'); // 'instructions', 'recording', 'creation'
  
  // Audio recording refs
  const mediaRecorderRef = useRef(null);
  const audioStreamRef = useRef(null);
  const recordingTimerRef = useRef(null);

  // Initialize voice name with user's name
  useEffect(() => {
    if (userProfile && !voiceName) {
      const name = `${userProfile.first_name || ''} ${userProfile.last_name || ''}`.trim();
      setVoiceName(name ? `${name}'s Voice` : 'My Personal Voice');
      setVoiceDescription(`Personal voice model for ${name || 'storytelling'}`);
    }
  }, [userProfile, voiceName]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopRecording();
      if (audioStreamRef.current) {
        audioStreamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioStreamRef.current = stream;
      
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      
      const chunks = [];
      mediaRecorder.ondataavailable = (event) => {
        chunks.push(event.data);
      };
      
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        const audioUrl = URL.createObjectURL(blob);
        
        setRecordings(prev => [...prev, {
          id: Date.now(),
          blob,
          url: audioUrl,
          script: VOICE_TRAINING_SCRIPTS[currentScriptIndex],
          duration: recordingProgress
        }]);
        
        // Move to next script
        if (currentScriptIndex < VOICE_TRAINING_SCRIPTS.length - 1) {
          setCurrentScriptIndex(prev => prev + 1);
        }
      };
      
      mediaRecorder.start();
      setIsRecording(true);
      setRecordingProgress(0);
      
      // Progress timer
      recordingTimerRef.current = setInterval(() => {
        setRecordingProgress(prev => {
          if (prev >= 30) { // Auto-stop after 30 seconds
            stopRecording();
            return 30;
          }
          return prev + 0.1;
        });
      }, 100);
      
    } catch (error) {
      console.error('Error starting recording:', error);
      alert('Could not access microphone. Please check permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
    }
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
    }
    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach(track => track.stop());
    }
    setIsRecording(false);
    setRecordingProgress(0);
  };

  const deleteRecording = (id) => {
    setRecordings(prev => {
      const recording = prev.find(r => r.id === id);
      if (recording) {
        URL.revokeObjectURL(recording.url);
      }
      return prev.filter(r => r.id !== id);
    });
  };

  const playRecording = (url) => {
    const audio = new Audio(url);
    audio.play();
  };

  const createVoiceModel = async () => {
    if (recordings.length < 2) {
      alert('Please record at least 2 voice samples');
      return;
    }
    
    if (!voiceName.trim()) {
      alert('Please enter a name for your voice');
      return;
    }

    setIsCreatingVoice(true);
    setCreationStatus('');
    setCreationMessage('');
    
    try {
      // Combine all recordings into a single blob (ElevenLabs can accept multiple files)
      // For simplicity, we'll use the longest/best recording
      const bestRecording = recordings.reduce((best, current) => 
        current.duration > best.duration ? current : best
      );
      
      console.log('🎤 Creating voice with:', {
        name: voiceName,
        description: voiceDescription,
        samplesCount: recordings.length,
        bestDuration: bestRecording.duration
      });
      
      const result = await createVoice(bestRecording.blob, voiceName, voiceDescription);
      
      console.log('✅ Voice creation result:', result);
      
      setCreationStatus('success');
      setCreationMessage(`Voice "${voiceName}" created successfully!`);
      
      // Call parent callback with the new voice info
      if (onVoiceCreated) {
        onVoiceCreated({
          voice_id: result.voice_id,
          name: voiceName,
          description: voiceDescription
        });
      }
      
      // Auto-advance to success step
      setTimeout(() => {
        onClose();
        // Reset modal state
        resetModal();
      }, 2000);
      
    } catch (error) {
      console.error('❌ Voice creation failed:', error);
      setCreationStatus('error');
      setCreationMessage(error.message || 'Failed to create voice model');
    } finally {
      setIsCreatingVoice(false);
    }
  };

  const resetModal = () => {
    setCurrentStep('instructions');
    setRecordings([]);
    setCurrentScriptIndex(0);
    setIsRecording(false);
    setRecordingProgress(0);
    setIsCreatingVoice(false);
    setCreationStatus('');
    setCreationMessage('');
    stopRecording();
  };

  const handleClose = () => {
    resetModal();
    onClose();
  };

  const getStepProgress = () => {
    switch (currentStep) {
      case 'instructions': return 0;
      case 'recording': return 50;
      case 'creation': return 100;
      default: return 0;
    }
  };

  const canProceedToCreation = recordings.length >= 2;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
                     <DialogTitle className="flex items-center gap-2">
             <Sparkle className="h-5 w-5 text-blue-600" />
             Train Your Voice Model
           </DialogTitle>
          <DialogDescription>
            Create a personalized ElevenLabs voice model using your voice samples
          </DialogDescription>
        </DialogHeader>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm text-gray-600">
            <span>Progress</span>
            <span>{getStepProgress()}% Complete</span>
          </div>
          <Progress value={getStepProgress()} className="w-full" />
        </div>

        {/* Instructions Step */}
        {currentStep === 'instructions' && (
          <div className="space-y-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-semibold text-blue-800 mb-2">What You'll Need:</h3>
              <ul className="text-sm text-blue-700 space-y-1 list-disc list-inside">
                <li>A quiet environment with minimal background noise</li>
                <li>5-10 minutes to record voice samples</li>
                <li>Clear, natural speech (speak as you normally would)</li>
                <li>A working microphone</li>
              </ul>
            </div>

            <div className="space-y-3">
              <Label htmlFor="voiceName">Voice Model Name</Label>
              <Input
                id="voiceName"
                value={voiceName}
                onChange={(e) => setVoiceName(e.target.value)}
                placeholder="e.g., Sarah's Voice"
              />
            </div>

            <div className="space-y-3">
              <Label htmlFor="voiceDescription">Description (Optional)</Label>
              <Input
                id="voiceDescription"
                value={voiceDescription}
                onChange={(e) => setVoiceDescription(e.target.value)}
                placeholder="e.g., Personal voice for storytelling"
              />
            </div>

                         <Alert>
               <Warning className="h-4 w-4" />
               <AlertDescription>
                 You'll need to record <strong>at least 2 voice samples</strong> using the provided scripts. 
                 Each recording should be 10-30 seconds long.
               </AlertDescription>
             </Alert>

            <div className="flex gap-2 pt-4">
              <Button onClick={() => setCurrentStep('recording')} className="flex-1">
                Start Recording
                <Microphone className="ml-2 h-4 w-4" />
              </Button>
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Recording Step */}
        {currentStep === 'recording' && (
          <div className="space-y-6">
            <div className="text-center">
              <h3 className="text-lg font-semibold mb-2">
                Recording Sample {currentScriptIndex + 1} of {VOICE_TRAINING_SCRIPTS.length}
              </h3>
              <Badge variant={recordings.length >= 2 ? 'default' : 'secondary'}>
                {recordings.length} of {Math.min(2, VOICE_TRAINING_SCRIPTS.length)} required samples recorded
              </Badge>
            </div>

            {/* Current Script */}
            <div className="bg-gray-50 border rounded-lg p-4">
              <Label className="text-sm font-medium text-gray-600">Read this script:</Label>
              <p className="mt-2 text-lg leading-relaxed">
                {VOICE_TRAINING_SCRIPTS[currentScriptIndex]?.replace('[Name]', userProfile?.first_name || 'Your Name')}
              </p>
            </div>

            {/* Recording Controls */}
            <div className="text-center space-y-4">
              {isRecording ? (
                <div className="space-y-3">
                  <div className="text-red-600 font-medium">Recording... {recordingProgress.toFixed(1)}s</div>
                  <Progress value={(recordingProgress / 30) * 100} className="w-full" />
                  <Button 
                    onClick={stopRecording}
                    variant="destructive"
                    size="lg"
                  >
                    <Square className="mr-2 h-4 w-4" />
                    Stop Recording
                  </Button>
                </div>
              ) : (
                <Button 
                  onClick={startRecording}
                  size="lg"
                  disabled={currentScriptIndex >= VOICE_TRAINING_SCRIPTS.length}
                >
                  <Microphone className="mr-2 h-4 w-4" />
                  Start Recording
                </Button>
              )}
            </div>

            {/* Recorded Samples */}
            {recordings.length > 0 && (
              <div className="space-y-3">
                <Separator />
                <h4 className="font-medium">Recorded Samples:</h4>
                <div className="space-y-2">
                  {recordings.map((recording, index) => (
                    <div key={recording.id} className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                      <div className="flex-1">
                        <p className="text-sm font-medium">Sample {index + 1}</p>
                        <p className="text-xs text-gray-600">{recording.duration.toFixed(1)}s</p>
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => playRecording(recording.url)}
                        >
                          <Play className="h-4 w-4" />
                        </Button>
                                                 <Button 
                           size="sm" 
                           variant="outline"
                           onClick={() => deleteRecording(recording.id)}
                         >
                           <Trash className="h-4 w-4" />
                         </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Navigation */}
            <div className="flex gap-2 pt-4">
              <Button 
                variant="outline" 
                onClick={() => setCurrentStep('instructions')}
              >
                Back
              </Button>
              <Button 
                onClick={() => setCurrentStep('creation')}
                disabled={!canProceedToCreation}
                className="flex-1"
              >
                Create Voice Model
                <Upload className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Creation Step */}
        {currentStep === 'creation' && (
          <div className="space-y-6">
            <div className="text-center">
              <h3 className="text-lg font-semibold mb-2">Create Your Voice Model</h3>
              <p className="text-gray-600">
                Ready to create your personalized voice model with {recordings.length} voice samples
              </p>
            </div>

            {/* Voice Model Info */}
            <div className="bg-gray-50 border rounded-lg p-4 space-y-3">
              <div>
                <Label className="text-sm font-medium text-gray-600">Voice Name:</Label>
                <p className="font-medium">{voiceName}</p>
              </div>
              {voiceDescription && (
                <div>
                  <Label className="text-sm font-medium text-gray-600">Description:</Label>
                  <p className="text-sm">{voiceDescription}</p>
                </div>
              )}
              <div>
                <Label className="text-sm font-medium text-gray-600">Samples:</Label>
                <p className="text-sm">{recordings.length} voice recordings</p>
              </div>
            </div>

            {/* Status Messages */}
            {creationStatus === 'success' && (
              <Alert className="border-green-200 bg-green-50">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  {creationMessage}
                </AlertDescription>
              </Alert>
            )}
            
                         {creationStatus === 'error' && (
               <Alert className="border-red-200 bg-red-50">
                 <Warning className="h-4 w-4 text-red-600" />
                 <AlertDescription className="text-red-800">
                   {creationMessage}
                 </AlertDescription>
               </Alert>
             )}

            {/* Creation Controls */}
            <div className="flex gap-2 pt-4">
              <Button 
                variant="outline" 
                onClick={() => setCurrentStep('recording')}
                disabled={isCreatingVoice}
              >
                Back to Recording
              </Button>
              <Button 
                onClick={createVoiceModel}
                disabled={isCreatingVoice || creationStatus === 'success'}
                className="flex-1"
              >
                {isCreatingVoice ? (
                  <>Creating Voice Model...</>
                ) : creationStatus === 'success' ? (
                  <>Voice Created!</>
                ) : (
                  <>Create Voice Model</>
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default VoiceCloningModal; 