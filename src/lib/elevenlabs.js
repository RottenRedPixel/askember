/**
 * ElevenLabs Service
 * Handles Text-to-Speech, Speech-to-Text, and Voice Cloning
 */

const ELEVENLABS_BASE_URL = 'https://api.elevenlabs.io/v1';

// Get API key from environment variables
const getApiKey = () => {
  return import.meta.env.VITE_ELEVENLABS_API_KEY;
};

/**
 * Convert audio blob to text using ElevenLabs STT
 * @param {Blob} audioBlob - The audio blob to transcribe
 * @returns {Promise<string>} The transcribed text
 */
export const speechToText = async (audioBlob) => {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error('ElevenLabs API key not configured');
  }

  try {
    // Convert blob to FormData
    const formData = new FormData();
    formData.append('file', audioBlob, 'recording.webm');
    formData.append('model_id', 'scribe_v1'); // Using ElevenLabs Scribe model

    const response = await fetch(`${ELEVENLABS_BASE_URL}/speech-to-text`, {
      method: 'POST',
      headers: {
        'xi-api-key': apiKey,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('ElevenLabs STT Error Response:', errorText);
      throw new Error(`STT failed: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();
    return result.text || '';
  } catch (error) {
    console.error('Speech-to-text error:', error);
    throw error;
  }
};

/**
 * Convert text to speech using ElevenLabs TTS
 * @param {string} text - The text to convert to speech
 * @param {string} voiceId - The voice ID to use (optional, defaults to system voice)
 * @returns {Promise<Blob>} The audio blob
 */
export const textToSpeech = async (text, voiceId = 'pNInz6obpgDQGcFmaJgB') => {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error('ElevenLabs API key not configured');
  }

  try {
    const response = await fetch(`${ELEVENLABS_BASE_URL}/text-to-speech/${voiceId}`, {
      method: 'POST',
      headers: {
        'Accept': 'audio/mpeg',
        'Content-Type': 'application/json',
        'xi-api-key': apiKey,
      },
      body: JSON.stringify({
        text,
        model_id: 'eleven_monolingual_v1',
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.5
        }
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`TTS failed: ${errorData.detail || response.statusText}`);
    }

    return await response.blob();
  } catch (error) {
    console.error('Text-to-speech error:', error);
    throw error;
  }
};

/**
 * Get available voices
 * @returns {Promise<Array>} List of available voices
 */
export const getVoices = async () => {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error('ElevenLabs API key not configured');
  }

  try {
    const response = await fetch(`${ELEVENLABS_BASE_URL}/voices`, {
      headers: {
        'xi-api-key': apiKey,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch voices: ${response.statusText}`);
    }

    const data = await response.json();
    return data.voices || [];
  } catch (error) {
    console.error('Get voices error:', error);
    throw error;
  }
};

/**
 * Upload audio for voice cloning
 * @param {Blob} audioBlob - The audio sample for voice cloning
 * @param {string} name - Name for the voice
 * @param {string} description - Description of the voice
 * @returns {Promise<Object>} Voice creation result
 */
export const createVoice = async (audioBlob, name, description = '') => {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error('ElevenLabs API key not configured');
  }

  try {
    const formData = new FormData();
    formData.append('name', name);
    formData.append('description', description);
    formData.append('files', audioBlob, 'voice_sample.webm');

    const response = await fetch(`${ELEVENLABS_BASE_URL}/voices/add`, {
      method: 'POST',
      headers: {
        'xi-api-key': apiKey,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Voice creation failed: ${errorData.detail || response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Voice creation error:', error);
    throw error;
  }
};

/**
 * Convert WebM blob to MP3 (client-side using Web Audio API)
 * Note: This is a basic implementation. For production, consider server-side conversion
 * @param {Blob} webmBlob - The WebM audio blob
 * @returns {Promise<Blob>} MP3 blob
 */
export const convertWebMToMP3 = async (webmBlob) => {
  try {
    // Create audio context
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    
    // Convert blob to array buffer
    const arrayBuffer = await webmBlob.arrayBuffer();
    
    // Decode audio data
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    
    // This is a simplified version - in practice, you'd want to use a proper MP3 encoder
    // For now, we'll return the original blob as MP3 isn't easily generated client-side
    console.warn('MP3 conversion not fully implemented - returning original WebM');
    return webmBlob;
  } catch (error) {
    console.error('Audio conversion error:', error);
    throw error;
  }
};

/**
 * Store voice recording for training data
 * @param {Blob} audioBlob - The audio recording
 * @param {string} text - The text that was spoken
 * @param {string} userId - The user ID
 * @returns {Promise<Object>} Storage result
 */
export const storeVoiceTraining = async (audioBlob, text, userId) => {
  // This would integrate with your storage service
  // For now, just log the data
  console.log('Storing voice training data:', {
    audioSize: audioBlob.size,
    textLength: text.length,
    userId
  });
  
  // TODO: Implement actual storage to Supabase or similar
  return {
    success: true,
    id: Date.now().toString(),
    message: 'Voice training data stored'
  };
};

/**
 * Check if enough training data exists for voice cloning
 * @param {string} userId - The user ID
 * @returns {Promise<Object>} Training status
 */
export const getVoiceTrainingStatus = async (userId) => {
  // TODO: Implement check against stored training data
  return {
    samplesCount: 0,
    totalDuration: 0,
    readyForCloning: false,
    requiredSamples: 5,
    requiredDuration: 300 // 5 minutes
  };
}; 