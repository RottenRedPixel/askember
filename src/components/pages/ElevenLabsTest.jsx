import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Mic, MicOff, Play, Pause, Settings, Smartphone, Wifi, Volume2, AlertCircle, CheckCircle, XCircle } from 'lucide-react';
import { speechToText, textToSpeech, getVoices } from '@/lib/elevenlabs';

export default function ElevenLabsTest() {
  const [testResults, setTestResults] = useState([]);
  const [availableMicrophones, setAvailableMicrophones] = useState([]);
  const [selectedMicrophone, setSelectedMicrophone] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [hasRecording, setHasRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [recordingTimer, setRecordingTimer] = useState(null);
  const [testText, setTestText] = useState("Hello, this is a test of ElevenLabs text-to-speech functionality on mobile devices.");
  const [deviceInfo, setDeviceInfo] = useState({});

  // Helper function to detect mobile devices and get device info
  const getDeviceInfo = () => {
    const userAgent = navigator.userAgent;
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
    const isIOS = /iPad|iPhone|iPod/.test(userAgent);
    const isAndroid = /Android/.test(userAgent);
    
    return {
      isMobile,
      isIOS,
      isAndroid,
      userAgent,
      platform: navigator.platform,
      vendor: navigator.vendor,
      cookieEnabled: navigator.cookieEnabled,
      onLine: navigator.onLine,
      language: navigator.language,
      screenWidth: screen.width,
      screenHeight: screen.height,
      windowWidth: window.innerWidth,
      windowHeight: window.innerHeight,
      devicePixelRatio: window.devicePixelRatio
    };
  };

  // Add test result with timestamp
  const addTestResult = (message, type = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    const icon = type === 'success' ? '✅' : type === 'error' ? '❌' : type === 'warning' ? '⚠️' : 'ℹ️';
    setTestResults(prev => [...prev, `[${timestamp}] ${icon} ${message}`]);
  };

  // Clear test results
  const clearResults = () => {
    setTestResults([]);
  };

  // Get available microphones
  const getAvailableMicrophones = async () => {
    try {
      addTestResult('Scanning for microphones...');
      const devices = await navigator.mediaDevices.enumerateDevices();
      // Filter out microphones with empty deviceId (iOS issue)
      const microphones = devices.filter(device => 
        device.kind === 'audioinput' && 
        device.deviceId && 
        device.deviceId.trim() !== ''
      );
      
      // If no valid microphones found, add a default entry
      if (microphones.length === 0) {
        const defaultMic = {
          deviceId: 'default',
          label: 'Default Microphone',
          kind: 'audioinput'
        };
        microphones.push(defaultMic);
        addTestResult('No specific microphones found, using default', 'warning');
      }
      
      setAvailableMicrophones(microphones);
      
      if (microphones.length > 0 && !selectedMicrophone) {
        setSelectedMicrophone(microphones[0].deviceId);
        addTestResult(`Found ${microphones.length} microphones, selected: ${microphones[0].label || 'Default'}`, 'success');
      }
      
      return microphones;
    } catch (error) {
      addTestResult(`Error getting microphones: ${error.message}`, 'error');
      return [];
    }
  };

  // Start recording
  const startRecording = async () => {
    try {
      if (!selectedMicrophone) {
        addTestResult('Please select a microphone first', 'error');
        return;
      }

      addTestResult('Starting recording...');
      setRecordingDuration(0);
      
      const audioConstraints = {
        echoCancellation: true,
        noiseSuppression: true,
        sampleRate: 44100
      };

      // Only specify deviceId if it's not the default fallback
      if (selectedMicrophone && selectedMicrophone !== 'default') {
        audioConstraints.deviceId = { exact: selectedMicrophone };
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: audioConstraints });
      
      // Get optimal mime type for device
      let mimeType = 'audio/webm;codecs=opus';
      if (deviceInfo.isIOS && !MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'audio/mp4';
      }
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'audio/webm';
      }

      const recorder = new MediaRecorder(stream, { mimeType });
      const audioChunks = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunks.push(event.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(audioChunks, { type: mimeType });
        setAudioBlob(blob);
        setHasRecording(true);
        addTestResult(`Recording completed: ${blob.size} bytes (${mimeType})`, 'success');
        
        // Clean up stream
        stream.getTracks().forEach(track => track.stop());
      };

      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
      
      // Start timer
      const timer = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);
      setRecordingTimer(timer);
      
      addTestResult(`Recording started with ${mimeType}`, 'success');
    } catch (error) {
      addTestResult(`Recording error: ${error.message}`, 'error');
    }
  };

  // Stop recording
  const stopRecording = () => {
    if (mediaRecorder && isRecording) {
      mediaRecorder.stop();
      setIsRecording(false);
      if (recordingTimer) {
        clearInterval(recordingTimer);
        setRecordingTimer(null);
      }
      addTestResult('Recording stopped');
    }
  };

  // Play recording
  const playRecording = () => {
    if (audioBlob && !isPlaying) {
      const audio = new Audio(URL.createObjectURL(audioBlob));
      audio.onended = () => setIsPlaying(false);
      audio.play();
      setIsPlaying(true);
      addTestResult('Playing recorded audio');
    }
  };

  // Test ElevenLabs API connectivity
  const testApiConnectivity = async () => {
    setIsProcessing(true);
    try {
      addTestResult('Testing ElevenLabs API connectivity...');
      
      const apiKey = import.meta.env.VITE_ELEVENLABS_API_KEY;
      if (!apiKey) {
        addTestResult('VITE_ELEVENLABS_API_KEY not found in environment variables', 'error');
        addTestResult('Add VITE_ELEVENLABS_API_KEY=your_api_key to your .env file', 'warning');
        return;
      }
      
      addTestResult(`API key found: ${apiKey.substring(0, 10)}...`, 'success');
      
      const response = await fetch('https://api.elevenlabs.io/v1/voices', {
        headers: { 'xi-api-key': apiKey }
      });
      
      if (response.ok) {
        addTestResult('ElevenLabs API is accessible', 'success');
        const data = await response.json();
        addTestResult(`Found ${data.voices?.length || 0} available voices`, 'info');
      } else {
        const errorText = await response.text();
        addTestResult(`API error: ${response.status} ${response.statusText}`, 'error');
        addTestResult(`Error details: ${errorText}`, 'error');
      }
    } catch (error) {
      addTestResult(`Network error: ${error.message}`, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  // Test speech-to-text
  const testSpeechToText = async () => {
    if (!audioBlob) {
      addTestResult('Please record audio first', 'error');
      return;
    }

    setIsProcessing(true);
    try {
      addTestResult('Testing speech-to-text...');
      addTestResult(`Audio blob: ${audioBlob.size} bytes, ${audioBlob.type}`);
      
      const result = await speechToText(audioBlob);
      
      if (result && result.trim()) {
        addTestResult('Speech-to-text successful!', 'success');
        addTestResult(`Transcribed: "${result}"`, 'success');
      } else {
        addTestResult('Speech-to-text returned empty (no speech detected)', 'warning');
      }
    } catch (error) {
      addTestResult(`Speech-to-text error: ${error.message}`, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  // Test text-to-speech
  const testTextToSpeech = async () => {
    if (!testText.trim()) {
      addTestResult('Please enter text to synthesize', 'error');
      return;
    }

    setIsProcessing(true);
    try {
      addTestResult('Testing text-to-speech...');
      addTestResult(`Synthesizing: "${testText}"`);
      
      const audioBlob = await textToSpeech(testText);
      
      addTestResult(`TTS completed: ${audioBlob.size} bytes`, 'success');
      
      // Play the synthesized audio
      const audio = new Audio(URL.createObjectURL(audioBlob));
      audio.play();
      addTestResult('Playing synthesized speech', 'success');
    } catch (error) {
      addTestResult(`Text-to-speech error: ${error.message}`, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  // Initialize device info and microphones on component mount
  useEffect(() => {
    const info = getDeviceInfo();
    setDeviceInfo(info);
    addTestResult(`Device detected: ${info.isMobile ? 'Mobile' : 'Desktop'} (${info.platform})`);
    if (info.isMobile) {
      addTestResult(`Mobile type: ${info.isIOS ? 'iOS' : info.isAndroid ? 'Android' : 'Other'}`);
    }
    
    getAvailableMicrophones();
  }, []);

  return (
    <div className="max-w-md mx-auto p-4 space-y-4">
      {/* Header */}
      <div className="text-center mb-6">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Smartphone className="h-6 w-6 text-blue-600" />
          <h1 className="text-xl font-bold text-gray-900">ElevenLabs Mobile Test</h1>
        </div>
        <p className="text-sm text-gray-600">Debug ElevenLabs functionality on mobile devices</p>
      </div>

      {/* Device Info */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Device Information
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0 space-y-2">
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <Badge variant={deviceInfo.isMobile ? "default" : "secondary"} className="text-xs">
                {deviceInfo.isMobile ? 'Mobile' : 'Desktop'}
              </Badge>
            </div>
            <div>
              <Badge variant={deviceInfo.onLine ? "default" : "destructive"} className="text-xs">
                {deviceInfo.onLine ? 'Online' : 'Offline'}
              </Badge>
            </div>
            <div className="col-span-2">
              <span className="text-gray-600">Platform:</span> {deviceInfo.platform}
            </div>
            <div className="col-span-2">
              <span className="text-gray-600">Screen:</span> {deviceInfo.screenWidth}×{deviceInfo.screenHeight}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Microphone Selection */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Mic className="h-4 w-4" />
            Microphone Setup
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0 space-y-3">
          <Select value={selectedMicrophone || ''} onValueChange={setSelectedMicrophone}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select microphone..." />
            </SelectTrigger>
            <SelectContent>
              {availableMicrophones.map((mic) => (
                <SelectItem key={mic.deviceId} value={mic.deviceId}>
                  {mic.label || `Microphone ${mic.deviceId.slice(0, 8)}...`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            onClick={getAvailableMicrophones}
            variant="outline"
            size="sm"
            className="w-full"
          >
            Refresh Microphones
          </Button>
        </CardContent>
      </Card>

      {/* Recording Controls */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            {isRecording ? <MicOff className="h-4 w-4 text-red-500" /> : <Mic className="h-4 w-4" />}
            Audio Recording
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0 space-y-3">
          <div className="flex gap-2">
            <Button
              onClick={isRecording ? stopRecording : startRecording}
              variant={isRecording ? "destructive" : "default"}
              className="flex-1"
              disabled={!selectedMicrophone || isProcessing}
            >
              {isRecording ? (
                <>
                  <MicOff className="h-4 w-4 mr-2" />
                  Stop ({recordingDuration}s)
                </>
              ) : (
                <>
                  <Mic className="h-4 w-4 mr-2" />
                  Record
                </>
              )}
            </Button>
            {hasRecording && (
              <Button
                onClick={playRecording}
                variant="outline"
                disabled={isPlaying || isProcessing}
              >
                {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              </Button>
            )}
          </div>
          {hasRecording && (
            <div className="text-xs text-gray-600 text-center">
              Recording ready ({Math.round(audioBlob?.size / 1024)}KB)
            </div>
          )}
        </CardContent>
      </Card>

      {/* Test Controls */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Volume2 className="h-4 w-4" />
            ElevenLabs Tests
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0 space-y-3">
          <Button
            onClick={testApiConnectivity}
            variant="outline"
            className="w-full"
            disabled={isProcessing}
          >
            <Wifi className="h-4 w-4 mr-2" />
            Test API Connection
          </Button>
          
          <Button
            onClick={testSpeechToText}
            variant="outline"
            className="w-full"
            disabled={!hasRecording || isProcessing}
          >
            Test Speech-to-Text
          </Button>

          <div className="space-y-2">
            <textarea
              value={testText}
              onChange={(e) => setTestText(e.target.value)}
              placeholder="Enter text to synthesize..."
              className="w-full p-2 text-sm border rounded-md resize-none"
              rows="3"
            />
            <Button
              onClick={testTextToSpeech}
              variant="outline"
              className="w-full"
              disabled={!testText.trim() || isProcessing}
            >
              Test Text-to-Speech
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Test Results */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              Test Results
            </CardTitle>
            <Button
              onClick={clearResults}
              variant="ghost"
              size="sm"
              className="text-xs"
            >
              Clear
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="max-h-64 overflow-y-auto space-y-1">
            {testResults.length === 0 ? (
              <p className="text-xs text-gray-500 text-center py-4">
                No test results yet. Run some tests to see output here.
              </p>
            ) : (
              testResults.map((result, index) => (
                <div key={index} className="text-xs font-mono bg-gray-50 p-2 rounded">
                  {result}
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Processing Indicator */}
      {isProcessing && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-sm">
            Processing... Please wait.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
} 