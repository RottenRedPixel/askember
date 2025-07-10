import { useState, useEffect, startTransition, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from '@/components/ui/carousel';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from '@/components/ui/drawer';
import { Label } from '@/components/ui/label';
import { getEmber, updateEmberTitle, saveStoryCut, getStoryCutsForEmber, getAllStoryMessagesForEmber, deleteStoryCut, setPrimaryStoryCut, getPrimaryStoryCut, getEmberSupportingMedia, getUserVoiceModel, getStoryCutAudioPreferences, updateMessageAudioPreference } from '@/lib/database';
import { getEmberWithSharing } from '@/lib/sharing';
import { getEmberPhotos } from '@/lib/photos';
import EmberChat from '@/components/EmberChat';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Flower, Microphone, Keyboard, CornersOut, ArrowCircleUp, Aperture, Chats, Smiley, ShareNetwork, PencilSimple, Info, Camera, MapPin, MagnifyingGlass, Campfire, Gear, PenNib, CheckCircle, BookOpen, Users, Lightbulb, Eye, Clock, Package, UsersThree, PlayCircle, Sliders, CirclesFour, FilmSlate, ImageSquare, House, UserCirclePlus, Trash, Link, Copy, QrCode, ArrowsClockwise, Heart, HeartStraight, Calendar, Play, Pause, X, Circle, Share, Export, Star } from 'phosphor-react';
import { Sparkles } from 'lucide-react';

import FeaturesCard from '@/components/FeaturesCard';

import InviteModal from '@/components/InviteModal';
import StoryModal from '@/components/StoryModal';
import LocationModal from '@/components/LocationModal';
import TimeDateModal from '@/components/TimeDateModal';
import ImageAnalysisModal from '@/components/ImageAnalysisModal';
import TaggedPeopleModal from '@/components/TaggedPeopleModal';
import SupportingMediaModal from '@/components/SupportingMediaModal';
import MediaManagementModal from '@/components/MediaManagementModal';

import EmberNamesModal from '@/components/EmberNamesModal';
import EmberSettingsPanel from '@/components/EmberSettingsPanel';
import QRCodeGenerator from '@/components/QRCodeGenerator';
import { textToSpeech, getVoices } from '@/lib/elevenlabs';
// Prompts functionality has been removed
import { cn } from '@/lib/utils';
import useStore from '@/store';

// ✅ Per-Message Audio Controls Component
const OwnerMessageAudioControls = ({ line, messageIndex, messageType, storyMessages, ember, storyCutId }) => {
  const [messagePreferences, setMessagePreferences] = useState({});
  
  // Expose data globally for debugging
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.storyMessages = storyMessages;
    }
  }, [storyMessages]);
  
  // Load preferences from database when component mounts
  useEffect(() => {
    const loadPreferences = async () => {
      if (!storyCutId) return;
      
      try {
        const savedPreferences = await getStoryCutAudioPreferences(storyCutId);
        if (savedPreferences) {
          setMessagePreferences(savedPreferences);
        }
      } catch (error) {
        console.error('Error loading audio preferences:', error);
      }
    };
    
    loadPreferences();
  }, [storyCutId]);
  
  // Analyze this specific message
  useEffect(() => {
    const analyzeMessage = async () => {
      if (!line || !storyMessages?.length || !ember?.user_id) return;
      
      const messageKey = `${messageIndex}-${line.substring(0, 50)}`;
      
      try {
        // Check if owner has a personal voice model
        const userVoiceModel = await getUserVoiceModel(ember.user_id);
        const hasPersonalVoice = userVoiceModel && userVoiceModel.elevenlabs_voice_id;
        
                 // Check if this message has recorded audio
         const hasRecordedAudio = messageType === 'audio';
         
         console.log(`🎤 Message ${messageIndex}: Recorded=${hasRecordedAudio}, Personal Voice=${hasPersonalVoice}, Type=${messageType}`);
         
         // Set smart defaults based on message type and available options
         let defaultPreference = 'text'; // fallback default
         
         if (messageType === 'audio') {
           // Audio messages: prefer recorded → personal voice → text response
           if (hasRecordedAudio) {
             defaultPreference = 'recorded';
           } else if (hasPersonalVoice) {
             defaultPreference = 'personal';
           } else {
             defaultPreference = 'text';
           }
                   } else {
            // Text messages: prefer text response → personal voice (no recorded option)
            defaultPreference = 'text'; // Text messages naturally default to text response
          }
         
         setMessagePreferences(prev => ({
           ...prev,
           [messageKey]: prev[messageKey] || defaultPreference
         }));
               } catch (error) {
         console.log(`⚠️ Error analyzing message ${messageIndex}:`, error.message);
         // Still show controls even if there's an error - text response is always available
         setMessagePreferences(prev => ({
           ...prev,
           [messageKey]: prev[messageKey] || 'text'
         }));
       }
    };
    
    analyzeMessage();
  }, [line, messageIndex, messageType, storyMessages, ember]);
  
  // Store preferences globally for audio generation
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.messageAudioPreferences = messagePreferences;
    }
  }, [messagePreferences]);
  
  const handlePreferenceChange = async (messageKey, preference) => {
    // Update local state immediately
    setMessagePreferences(prev => ({
      ...prev,
      [messageKey]: preference
    }));
    
    // Save to database
    if (storyCutId) {
      try {
        await updateMessageAudioPreference(storyCutId, messageKey, preference);
        console.log(`✅ Saved preference for message ${messageIndex}: ${preference}`);
      } catch (error) {
        console.error('Error saving audio preference:', error);
      }
    }
  };
  
     // Show contextual controls based on original message type
     const messageKey = `${messageIndex}-${line.substring(0, 50)}`;
     const showRecordedOption = messageType === 'audio'; // Only show "Recorded" if original was audio
   
   return (
     <div className="flex items-center space-x-2 text-xs">
       {/* 🎙️ Recorded - Only show for original audio messages */}
       {showRecordedOption && (
         <label className="flex items-center space-x-1 cursor-pointer">
           <input
             type="radio"
             name={`message-${messageKey}`}
             value="recorded"
             checked={messagePreferences[messageKey] === 'recorded'}
             onChange={(e) => handlePreferenceChange(messageKey, e.target.value)}
             className="text-green-600 focus:ring-green-500 w-3 h-3"
           />
           <span className="text-xs text-gray-700">🎙️ Recorded</span>
         </label>
       )}
       
       {/* 🎤 Synth Voice - Always available */}
       <label className="flex items-center space-x-1 cursor-pointer">
         <input
           type="radio"
           name={`message-${messageKey}`}
           value="personal"
           checked={messagePreferences[messageKey] === 'personal'}
           onChange={(e) => handlePreferenceChange(messageKey, e.target.value)}
           className="text-green-600 focus:ring-green-500 w-3 h-3"
         />
         <span className="text-xs text-gray-700">🎤 Synth Voice</span>
       </label>
       
       {/* 📝 Text Response - Always available */}
       <label className="flex items-center space-x-1 cursor-pointer">
         <input
           type="radio"
           name={`message-${messageKey}`}
           value="text"
           checked={messagePreferences[messageKey] === 'text'}
           onChange={(e) => handlePreferenceChange(messageKey, e.target.value)}
           className="text-green-600 focus:ring-green-500 w-3 h-3"
         />
         <span className="text-xs text-gray-700">📝 Text Response</span>
       </label>
     </div>
   );
};

// ✅ Extract StoryModalContent OUTSIDE the main component (prevents cursor jumping)
const StoryCutDetailContent = ({ 
  selectedStoryCut,
  isEditingScript,
  setIsEditingScript,
  editedScript,
  setEditedScript,
  handleSaveScript,
  handleCancelScriptEdit,
  isSavingScript,
  formatDuration,
  getStyleDisplayName,
  formatRelativeTime,
  storyMessages,
  ember,
  hasBeenEnhanced,
  getEditableScript,
  formattedScript
}) => (
  <div className="space-y-6">
    {/* Story Cut Info */}
    <div className="flex flex-col sm:flex-row gap-4 p-4 bg-blue-50 rounded-xl border border-blue-200">
      <div className="flex items-center gap-3">
        <div className="text-sm text-gray-600">
          <div className="font-medium">{formatDuration(selectedStoryCut.duration)}</div>
          <div>{selectedStoryCut.word_count || 'Unknown'} words</div>
        </div>
      </div>
      
      {/* Style Badge */}
      <div className="flex items-center justify-start">
        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
          {getStyleDisplayName(selectedStoryCut.style)}
        </span>
      </div>
    </div>

    {/* Story Focus */}
    {selectedStoryCut.story_focus && (
      <div className="space-y-3">
        <h3 className="text-lg font-semibold text-gray-900">Story Focus</h3>
        <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
          <p className="text-gray-700">{selectedStoryCut.story_focus}</p>
        </div>
      </div>
    )}

    {/* Full Script */}
    {selectedStoryCut.full_script && (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Complete Script</h3>
        {!isEditingScript && (
          <button
            onClick={() => {
              try {
                console.log('✏️ Starting script edit...');
                console.log('📝 Current stored script:', selectedStoryCut.full_script);
                // Compute the current enhancement status instead of using potentially stale state
                const scriptHasEnhancedContent = selectedStoryCut.full_script.includes('[[MEDIA]]') || selectedStoryCut.full_script.includes('[[HOLD]]');
                const editableScript = getEditableScript(selectedStoryCut.full_script, ember, selectedStoryCut, scriptHasEnhancedContent);
                console.log('📝 Loaded editable script:', editableScript);
                setIsEditingScript(true);
                setEditedScript(editableScript);
              } catch (error) {
                console.error('❌ Error loading script for editing:', error);
                console.error('❌ Error details:', error.message);
                console.error('❌ Stack trace:', error.stack);
                // Fallback - use raw script
                console.log('🔄 Falling back to raw script');
                setIsEditingScript(true);
                setEditedScript(selectedStoryCut.full_script || '');
              }
            }}
            className="text-sm text-blue-600 hover:text-blue-800 font-medium"
          >
            Edit
          </button>
        )}
      </div>
      
      {isEditingScript ? (
        <div className="space-y-3">
          <textarea
            value={editedScript}
            onChange={(e) => setEditedScript(e.target.value)}
            className="w-full p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm leading-relaxed resize-none"
            rows={Math.max(10, (editedScript.match(/\n/g) || []).length + 3)}
            placeholder="Enter your script here..."
          />
          <div className="flex gap-2">
            <button
              onClick={handleSaveScript}
              disabled={isSavingScript}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-300 font-medium text-sm"
            >
              {isSavingScript ? 'Saving...' : 'Save'}
            </button>
            <button
              onClick={handleCancelScriptEdit}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
          <div className="text-gray-700 leading-relaxed font-mono text-sm">
            {formattedScript.split('\n\n').map((line, index) => {
              // Parse voice tag, content, and duration - handle both [[MEDIA]] and [VOICE] formats
              const voiceMatch = line.match(/^(\[\[?[^\]]+\]\]?)\s*(.*?)\s*\((\d+\.\d+)\)$/);
              if (!voiceMatch) return <div key={index}>{line}</div>;
              
              const [, voiceTagWithBrackets, content, duration] = voiceMatch;
              const isMedia = voiceTagWithBrackets.startsWith('[[');
              const voiceTag = voiceTagWithBrackets.replace(/^\[\[?|\]\]?$/g, '');
              
              // Split content into text and visual actions
              const parts = [];
              let currentIndex = 0;
              const visualActionRegex = /<([^>]+)>/g;
              let match;
              
              while ((match = visualActionRegex.exec(content)) !== null) {
                // Add text before the visual action
                if (match.index > currentIndex) {
                  parts.push({
                    type: 'text',
                    content: content.slice(currentIndex, match.index)
                  });
                }
                
                // Add the visual action
                parts.push({
                  type: 'visual',
                  content: `<${match[1]}>`,
                  rawAction: match[1]
                });
                
                currentIndex = match.index + match[0].length;
              }
              
              // Add remaining text
              if (currentIndex < content.length) {
                parts.push({
                  type: 'text',
                  content: content.slice(currentIndex)
                });
              }
              
              return (
                <div key={index} className="leading-relaxed mb-4">
                  <span className={`font-semibold ${isMedia ? 'text-blue-600' : ''}`}>
                    {isMedia ? '[[' : '['}
                    {voiceTag}
                    {isMedia ? ']]' : ']'}
                  </span>{' '}
                  {parts.map((part, partIndex) => (
                    <span 
                      key={partIndex}
                      className={part.type === 'visual' ? 'text-gray-400 font-medium' : ''}
                    >
                      {part.type === 'visual' && part.rawAction?.startsWith('COLOR:') ? (
                        <span className="inline-flex items-center gap-1">
                          {part.content.replace(/color=/g, '').replace(/opacity=/g, 'TRAN:')}
                          {(() => {
                            const hexColor = extractColorFromAction(part.rawAction);
                            return hexColor ? (
                              <span 
                                className="inline-block w-3 h-3 rounded-full border border-gray-300 flex-shrink-0"
                                style={{ backgroundColor: hexColor }}
                                title={hexColor}
                              ></span>
                            ) : null;
                          })()}
                        </span>
                      ) : (
                        part.content
                      )}
                    </span>
                  ))}
                  {' '}<span className="text-gray-400">({duration})</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
    )}

    {/* Voice Casting */}
    <div className="space-y-3">
      <h3 className="text-lg font-semibold text-gray-900">Voice Casting</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
          <div className="text-sm font-medium text-gray-800">Ember Voice</div>
          <div className="text-gray-700">{selectedStoryCut.ember_voice_name}</div>
        </div>
        <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
          <div className="text-sm font-medium text-gray-800">Narrator Voice</div>
          <div className="text-gray-700">{selectedStoryCut.narrator_voice_name}</div>
        </div>
      </div>

    </div>

    {/* Voice Lines Breakdown */}
    {((selectedStoryCut.ember_voice_lines && selectedStoryCut.ember_voice_lines.length > 0) || 
      (selectedStoryCut.narrator_voice_lines && selectedStoryCut.narrator_voice_lines.length > 0) ||
      (selectedStoryCut.metadata?.owner_lines && selectedStoryCut.metadata.owner_lines.length > 0) ||
      (selectedStoryCut.metadata?.contributor_lines && selectedStoryCut.metadata.contributor_lines.length > 0)) && (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900">Voice Lines Breakdown</h3>
      
      {/* Ember Voice Lines */}
      {selectedStoryCut.ember_voice_lines && selectedStoryCut.ember_voice_lines.length > 0 && (
        <div className="space-y-2">
          <h4 className="font-medium text-purple-800 flex items-center gap-2">
            <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
            Ember Voice Lines ({selectedStoryCut.ember_voice_name})
          </h4>
          <div className="space-y-2">
            {selectedStoryCut.ember_voice_lines.map((line, index) => (
              <div key={index} className="p-3 bg-purple-50 rounded-lg border border-purple-200">
                <p className="text-purple-700">{line}</p>
                <div className="flex items-center gap-2 mt-2">
                  <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                  <span className="text-xs opacity-70">AI Generated</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Narrator Voice Lines */}
      {selectedStoryCut.narrator_voice_lines && selectedStoryCut.narrator_voice_lines.length > 0 && (
        <div className="space-y-2">
          <h4 className="font-medium text-purple-800 flex items-center gap-2">
            <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
            Narrator Voice Lines ({selectedStoryCut.narrator_voice_name})
          </h4>
          <div className="space-y-2">
            {selectedStoryCut.narrator_voice_lines.map((line, index) => (
              <div key={index} className="p-3 bg-purple-50 rounded-lg border border-purple-200">
                <p className="text-purple-700">{line}</p>
                <div className="flex items-center gap-2 mt-2">
                  <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                  <span className="text-xs opacity-70">AI Generated</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Owner Lines */}
      {selectedStoryCut.metadata?.owner_lines && selectedStoryCut.metadata.owner_lines.length > 0 && (
        <div className="space-y-2">
          <h4 className="font-medium text-green-800 flex items-center gap-2">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            {(() => {
              // Try to get owner name from metadata first, then from selected_contributors
              const ownerName = selectedStoryCut.metadata?.owner_first_name;
              if (ownerName) return `${ownerName} (Owner)`;
              
              // Fallback: look for owner in selected_contributors
              const contributors = selectedStoryCut.selected_contributors || [];
              const owner = contributors.find(c => c?.role === 'owner');
              if (owner?.name) return `${owner.name} (Owner)`;
              
              return 'Owner';
            })()}
          </h4>
          <div className="space-y-2">
            {selectedStoryCut.metadata.owner_lines.map((line, index) => {
              // Try to match this line to original story messages to determine type
              const getOriginalMessageType = (line, lineIndex) => {
                if (!storyMessages || storyMessages.length === 0) return 'unknown';
                
                // Look for owner messages (filter by user_id matching ember owner)
                const ownerMessages = storyMessages.filter(msg => msg.user_id === ember?.user_id)
                  .sort((a, b) => new Date(a.created_at) - new Date(b.created_at)); // Sort by creation time
                
                // Try to match by index first (most reliable)
                if (ownerMessages[lineIndex]) {
                  return ownerMessages[lineIndex].has_audio ? 'audio' : 'text';
                }
                
                // Try to find a message that could correspond to this line by content
                for (const msg of ownerMessages) {
                  if (msg.content && msg.content.trim()) {
                    // Check if the line contains significant parts of the message content
                    const msgWords = msg.content.toLowerCase().split(/\s+/).filter(word => word.length > 3);
                    const lineWords = line.toLowerCase().split(/\s+/);
                    
                    // If at least 2 significant words match, consider it a match
                    const matchingWords = msgWords.filter(word => lineWords.some(lineWord => lineWord.includes(word)));
                    if (matchingWords.length >= 2) {
                      return msg.has_audio ? 'audio' : 'text';
                    }
                  }
                }
                
                // If we can't match by content, try by position
                const audioMessages = ownerMessages.filter(msg => msg.has_audio);
                const textMessages = ownerMessages.filter(msg => !msg.has_audio);
                
                // Default to 'text' if we can't determine
                return 'text';
                              };

                const messageType = getOriginalMessageType(line, index);
                
                return (
                  <div key={index} className="p-3 bg-green-50 rounded-lg border border-green-200">
                    <p className="text-green-700">{line}</p>
                    <div className="flex items-center justify-between mt-2">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${messageType === 'audio' ? 'bg-green-500 animate-pulse' : 'bg-green-400'}`}></div>
                        <span className="text-xs opacity-70">
                          {messageType === 'audio' ? 'Audio message' : 'Text response'}
                        </span>
                      </div>
                      <OwnerMessageAudioControls
                        line={line}
                        messageIndex={index}
                        messageType={messageType}
                        storyMessages={storyMessages}
                        ember={ember}
                        storyCutId={selectedStoryCut.id}
                      />
                    </div>
                  </div>
                );
            })}
          </div>
        </div>
      )}

      {/* Contributor Lines */}
      {selectedStoryCut.metadata?.contributor_lines && selectedStoryCut.metadata.contributor_lines.length > 0 && (
        <div className="space-y-2">
          <h4 className="font-medium text-blue-800 flex items-center gap-2">
            <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
            {(() => {
              // Get contributor names from various possible sources, excluding the owner
              const contributors = selectedStoryCut.selected_contributors || [];
              const contributorNames = contributors
                .filter(c => c?.role !== 'owner') // Exclude the owner from contributors
                .map(c => {
                  if (typeof c === 'string') return c;
                  if (c?.name) return c.name;
                  if (c?.first_name) return c.first_name;
                  return 'Contributor';
                })
                .filter(name => name !== 'Contributor');
              
              if (contributorNames.length > 0) {
                return `${contributorNames.join(', ')} (Contributor${contributorNames.length > 1 ? 's' : ''} invited)`;
              }
              return 'Contributors';
            })()}
          </h4>
          <div className="space-y-2">
            {selectedStoryCut.metadata.contributor_lines.map((line, index) => {
              // Try to match this line to original story messages to determine type
              const getOriginalMessageType = (line, lineIndex) => {
                if (!storyMessages || storyMessages.length === 0) return 'unknown';
                
                // Look for contributor messages (filter by user_id not matching ember owner)
                const contributorMessages = storyMessages.filter(msg => msg.user_id !== ember?.user_id)
                  .sort((a, b) => new Date(a.created_at) - new Date(b.created_at)); // Sort by creation time
                
                // Try to match by index first (most reliable)
                if (contributorMessages[lineIndex]) {
                  return contributorMessages[lineIndex].has_audio ? 'audio' : 'text';
                }
                
                // Try to find a message that could correspond to this line by content
                for (const msg of contributorMessages) {
                  if (msg.content && msg.content.trim()) {
                    // Check if the line contains significant parts of the message content
                    const msgWords = msg.content.toLowerCase().split(/\s+/).filter(word => word.length > 3);
                    const lineWords = line.toLowerCase().split(/\s+/);
                    
                    // If at least 2 significant words match, consider it a match
                    const matchingWords = msgWords.filter(word => lineWords.some(lineWord => lineWord.includes(word)));
                    if (matchingWords.length >= 2) {
                      return msg.has_audio ? 'audio' : 'text';
                    }
                  }
                }
                
                // Default to 'text' if we can't determine
                return 'text';
                              };

                const messageType = getOriginalMessageType(line, index);
                
                return (
                  <div key={index} className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-blue-700">{line}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <div className={`w-2 h-2 rounded-full ${messageType === 'audio' ? 'bg-blue-500 animate-pulse' : 'bg-blue-400'}`}></div>
                    <span className="text-xs opacity-70">
                      {messageType === 'audio' ? 'Audio message' : 'Text response'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
    )}

    {/* Contributors */}
    {selectedStoryCut.selected_contributors && selectedStoryCut.selected_contributors.length > 0 && (
      <div className="space-y-3">
        <h3 className="text-lg font-semibold text-gray-900">Selected Contributors</h3>
        <div className="flex flex-wrap gap-2">
          {selectedStoryCut.selected_contributors.map((contributor, index) => (
            <span 
              key={index}
              className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-gray-100 text-gray-700"
            >
              {contributor.name} ({contributor.role})
            </span>
          ))}
        </div>
      </div>
    )}

    {/* Metadata */}
    <div className="pt-4 border-t border-gray-200">
      <div className="text-sm text-gray-500 space-y-1">
        <div>Created: {formatRelativeTime(selectedStoryCut.created_at)}</div>
        {selectedStoryCut.metadata?.generatedAt && (
          <div>Generated: {new Date(selectedStoryCut.metadata.generatedAt).toLocaleString()}</div>
        )}
      </div>
    </div>
  </div>
);

const StoryModalContent = ({ 
  userProfile,
  storyTitle, 
  setStoryTitle, 
  emberLength, 
  setEmberLength,
  ember,
  sharedUsers,
  selectedVoices,
  toggleVoiceSelection,
  selectedStoryStyle,
  setSelectedStoryStyle,
  stylesLoading,
  availableStoryStyles,
  storyFocus,
  setStoryFocus,
  selectedEmberVoice,
  setSelectedEmberVoice,
  selectedNarratorVoice,
  setSelectedNarratorVoice,
  voicesLoading,
  availableVoices,
  handleGenerateStoryCut,
  isGeneratingStoryCut,
  storyMessages,
  useEmberVoice,
  toggleEmberVoice,
  useNarratorVoice,
  toggleNarratorVoice
}) => (
  <div className="space-y-6">
    {/* User Editor Info */}
    <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-xl border border-blue-200">
      <Avatar className="h-8 w-8">
        <AvatarImage 
          src={userProfile?.avatar_url} 
          alt={`${userProfile?.first_name || ''} ${userProfile?.last_name || ''}`.trim() || 'User'} 
        />
        <AvatarFallback className="text-sm bg-gray-200 text-gray-700">
          {userProfile?.first_name?.[0] || userProfile?.last_name?.[0] || 'U'}
        </AvatarFallback>
      </Avatar>
      <div>
        <p className="text-sm font-medium text-gray-900">
          {`${userProfile?.first_name || ''} ${userProfile?.last_name || ''}`.trim() || 'User'}
        </p>
        <p className="text-xs text-gray-500">
          Editing this ember
        </p>
      </div>
    </div>

    {/* Story Title */}
    <div className="space-y-3">
      <Label className="text-sm font-medium text-gray-900 flex items-center gap-2">
        <PenNib size={16} className="text-blue-600" />
        Story Title
      </Label>
      <Input
        type="text"
        value={storyTitle}
        onChange={(e) => setStoryTitle(e.target.value)}
        placeholder="Enter story title..."
        className="w-full h-10"
      />
    </div>

    {/* Dropdown Sections */}
    <div className="space-y-4">
      <div>
        <Label className="text-sm font-medium text-gray-900 mb-2 flex items-center gap-2">
          <Package size={16} className="text-blue-600" />
          Story Style
        </Label>
        <select 
          value={selectedStoryStyle}
          onChange={(e) => setSelectedStoryStyle(e.target.value)}
          disabled={stylesLoading}
          className="w-full p-2 border border-gray-300 rounded-md text-sm h-10"
        >
          {stylesLoading ? (
            <option>Loading story styles...</option>
          ) : availableStoryStyles.length === 0 ? (
            <option>Ember prompts missing</option>
          ) : (
            <>
              <option value="">Select story style...</option>
              {availableStoryStyles.map((style) => (
                <option key={style.id} value={style.id}>
                  {style.name}
                </option>
              ))}
            </>
          )}
        </select>
      </div>
    </div>

    {/* Story Focus */}
    <div className="space-y-3">
      <Label className="text-sm font-medium text-gray-900 flex items-center gap-2">
        <Eye size={16} className="text-blue-600" />
        Story Focus
      </Label>
      <Input
        type="text"
        value={storyFocus}
        onChange={(e) => setStoryFocus(e.target.value)}
        placeholder="What should this story focus on? (e.g., emotions, setting, characters, action...)"
        className="w-full h-10"
      />
    </div>

    {/* Story Length Slider */}
    <div className="space-y-4">
      <Label className="text-sm font-medium text-gray-900 flex items-center gap-2">
        <Sliders size={16} className="text-blue-600" />
        Story Length
      </Label>
      
      <div className="space-y-3">
        <div>
          <div className="flex justify-between items-center mb-2">
            <p className="text-sm text-gray-600">Duration</p>
            <span className="text-sm text-blue-600 font-medium">{emberLength} seconds</span>
          </div>
          <input 
            type="range" 
            min="5" 
            max="60" 
            step="5" 
            value={emberLength}
            onChange={(e) => setEmberLength(Number(e.target.value))}
            className="w-full mt-1" 
          />
          <div className="flex justify-between text-xs text-gray-400 mt-1">
            <span>5s</span>
            <span>20s</span>
            <span>35s</span>
            <span>50s</span>
            <span>60s</span>
          </div>
        </div>
      </div>
    </div>

    {/* Voices Section */}
    <div className="space-y-4">
      <Label className="text-sm font-medium text-gray-900 flex items-center gap-2">
        <Users size={16} className="text-blue-600" />
        Voices
      </Label>
      <p className="text-sm text-gray-600">Select which voices you want used in this story.</p>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {/* Owner */}
        {ember?.owner && (
          <div 
            onClick={() => toggleVoiceSelection(ember.user_id)}
            className="flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors hover:bg-gray-50"
            style={{
              borderColor: selectedVoices.includes(ember.user_id) ? '#2563eb' : '#e5e7eb',
              backgroundColor: selectedVoices.includes(ember.user_id) ? '#eff6ff' : 'white'
            }}
          >
            <div className="relative">
              <Avatar className="h-10 w-10">
                <AvatarImage 
                  src={ember.owner.avatar_url} 
                  alt={ember.owner.first_name || 'Owner'} 
                />
                <AvatarFallback className="text-sm bg-gray-200 text-gray-700">
                  {ember.owner.first_name?.[0] || ember.owner.last_name?.[0] || 'O'}
                </AvatarFallback>
              </Avatar>
              {selectedVoices.includes(ember.user_id) && (
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-blue-600 rounded-full flex items-center justify-center">
                  <span className="text-white text-xs">✓</span>
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-gray-900 truncate">
                {ember.owner.first_name || 'Owner'}
              </div>
              <div className="text-xs text-amber-600 bg-amber-100 px-2 py-1 rounded-full inline-block mt-1">
                Owner
              </div>
              <div className="text-xs text-gray-600 mt-1">
                Contributed? 
                <span className={`ml-1 px-2 py-0.5 rounded-full ${
                  storyMessages.some(msg => msg.user_id === ember.user_id)
                    ? 'bg-green-100 text-green-700'
                    : 'bg-gray-100 text-gray-600'
                }`}>
                  {storyMessages.some(msg => msg.user_id === ember.user_id) ? 'Yes' : 'No'}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Shared Users */}
        {sharedUsers.map((user) => (
          <div 
            key={user.user_id}
            onClick={() => toggleVoiceSelection(user.user_id)}
            className="flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors hover:bg-gray-50"
            style={{
              borderColor: selectedVoices.includes(user.user_id) ? '#2563eb' : '#e5e7eb',
              backgroundColor: selectedVoices.includes(user.user_id) ? '#eff6ff' : 'white'
            }}
          >
            <div className="relative">
              <Avatar className="h-10 w-10">
                <AvatarImage 
                  src={user.avatar_url} 
                  alt={user.first_name || 'User'} 
                />
                <AvatarFallback className="text-sm bg-gray-200 text-gray-700">
                  {user.first_name?.[0] || user.last_name?.[0] || 'U'}
                </AvatarFallback>
              </Avatar>
              {selectedVoices.includes(user.user_id) && (
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-blue-600 rounded-full flex items-center justify-center">
                  <span className="text-white text-xs">✓</span>
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-gray-900 truncate">
                {user.first_name || 'User'}
              </div>
              <div className={`text-xs px-2 py-1 rounded-full inline-block mt-1 ${
                user.permission_level === 'contributor' 
                  ? 'text-blue-600 bg-blue-100' 
                  : 'text-gray-600 bg-gray-100'
              }`}>
                {user.permission_level === 'contributor' ? 'Contributor' : 'Viewer'}
              </div>
                             <div className="text-xs text-gray-600 mt-1">
                 Contributed? 
                 <span className={`ml-1 px-2 py-0.5 rounded-full ${
                   storyMessages.some(msg => msg.user_id === user.user_id)
                     ? 'bg-green-100 text-green-700'
                     : 'bg-gray-100 text-gray-600'
                 }`}>
                   {storyMessages.some(msg => msg.user_id === user.user_id) ? 'Yes' : 'No'}
                 </span>
               </div>
            </div>
          </div>
        ))}

        {/* No users message */}
        {!ember?.owner && sharedUsers.length === 0 && (
          <div className="col-span-full text-center text-gray-500 text-sm py-4">
            No users invited to this ember yet
          </div>
        )}
      </div>
    </div>

    {/* Ember Agents */}
    <div className="space-y-4">
      <Label className="text-sm font-medium text-gray-900 flex items-center gap-2">
        <Sparkles size={16} className="text-blue-600" />
        Ember Agents
      </Label>
      <p className="text-sm text-gray-600">Select which voice agents you want included in this story.</p>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Ember AI */}
        <div className="space-y-3">
          <div 
            onClick={toggleEmberVoice}
            className="flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors hover:bg-gray-50"
            style={{
              borderColor: useEmberVoice ? '#2563eb' : '#e5e7eb',
              backgroundColor: useEmberVoice ? '#eff6ff' : 'white'
            }}
          >
            <div className="relative">
              <div className="h-10 w-10 rounded-full bg-gradient-to-r from-purple-500 to-blue-500 flex items-center justify-center">
                <Sparkles size={20} className="text-white" />
              </div>
              {useEmberVoice && (
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-blue-600 rounded-full flex items-center justify-center">
                  <span className="text-white text-xs">✓</span>
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-gray-900 truncate">
                Ember AI
              </div>
              <div className="text-xs text-purple-600 bg-purple-100 px-2 py-1 rounded-full inline-block mt-1">
                AI Storyteller
              </div>
            </div>
          </div>
          
          {/* Ember Voice Dropdown */}
          {useEmberVoice && (
            <div className="space-y-2">
              <Label className="text-xs font-medium text-gray-700">Voice Selection</Label>
              <select 
                value={selectedEmberVoice}
                onChange={(e) => setSelectedEmberVoice(e.target.value)}
                disabled={voicesLoading}
                className="w-full p-2 border border-gray-300 rounded-md text-sm h-10 bg-white"
              >
                {voicesLoading ? (
                  <option>Loading voices...</option>
                ) : (
                  <>
                    <option value="">Select ember voice...</option>
                    {availableVoices.map((voice) => (
                      <option key={voice.voice_id} value={voice.voice_id}>
                        {voice.name} {voice.labels?.gender ? `(${voice.labels.gender})` : ''}
                      </option>
                    ))}
                  </>
                )}
              </select>
            </div>
          )}
        </div>

        {/* Narrator */}
        <div className="space-y-3">
          <div 
            onClick={toggleNarratorVoice}
            className="flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors hover:bg-gray-50"
            style={{
              borderColor: useNarratorVoice ? '#2563eb' : '#e5e7eb',
              backgroundColor: useNarratorVoice ? '#eff6ff' : 'white'
            }}
          >
            <div className="relative">
              <div className="h-10 w-10 rounded-full bg-gradient-to-r from-orange-500 to-red-500 flex items-center justify-center">
                <Microphone size={20} className="text-white" />
              </div>
              {useNarratorVoice && (
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-blue-600 rounded-full flex items-center justify-center">
                  <span className="text-white text-xs">✓</span>
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-gray-900 truncate">
                Narrator
              </div>
              <div className="text-xs text-orange-600 bg-orange-100 px-2 py-1 rounded-full inline-block mt-1">
                Story Guide
              </div>
            </div>
          </div>
          
          {/* Narrator Voice Dropdown */}
          {useNarratorVoice && (
            <div className="space-y-2">
              <Label className="text-xs font-medium text-gray-700">Voice Selection</Label>
              <select 
                value={selectedNarratorVoice}
                onChange={(e) => setSelectedNarratorVoice(e.target.value)}
                disabled={voicesLoading}
                className="w-full p-2 border border-gray-300 rounded-md text-sm h-10 bg-white"
              >
                {voicesLoading ? (
                  <option>Loading voices...</option>
                ) : (
                  <>
                    <option value="">Select narrator voice...</option>
                    {availableVoices.map((voice) => (
                      <option key={voice.voice_id} value={voice.voice_id}>
                        {voice.name} {voice.labels?.gender ? `(${voice.labels.gender})` : ''}
                      </option>
                    ))}
                  </>
                )}
              </select>
            </div>
          )}
        </div>
      </div>
    </div>



    {/* Action Buttons */}
    <div className="mt-6 pt-4">
      <Button 
        size="lg" 
        className="w-full" 
        onClick={handleGenerateStoryCut}
        disabled={isGeneratingStoryCut || !selectedStoryStyle || !storyTitle.trim() || 
                  (!useEmberVoice && !useNarratorVoice) ||
                  (useEmberVoice && !selectedEmberVoice) ||
                  (useNarratorVoice && !selectedNarratorVoice)}
      >
        {isGeneratingStoryCut ? 'Generating Story Cut...' : 'Generate New Story Cut'}
      </Button>
      
      {(!selectedStoryStyle || !storyTitle.trim() || 
        (!useEmberVoice && !useNarratorVoice) ||
        (useEmberVoice && !selectedEmberVoice) ||
        (useNarratorVoice && !selectedNarratorVoice)) && (
        <p className="text-xs text-gray-500 mt-2 text-center">
          {!selectedStoryStyle ? 'Please select a story style' :
           !storyTitle.trim() ? 'Please enter a story title' :
           (!useEmberVoice && !useNarratorVoice) ? 'Please select at least one voice agent' :
           (useEmberVoice && !selectedEmberVoice) ? 'Please select an Ember voice' :
           (useNarratorVoice && !selectedNarratorVoice) ? 'Please select a Narrator voice' :
           'Please complete all required fields'}
        </p>
      )}
    </div>
  </div>
);

export default function EmberDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [ember, setEmber] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showFullImage, setShowFullImage] = useState(false);
  const [showEmberSharing, setShowEmberSharing] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showNamesModal, setShowNamesModal] = useState(false);
  const [showEmberWiki, setShowEmberWiki] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [message, setMessage] = useState(null);
  const { user, userProfile } = useStore();
  const [hasVoted, setHasVoted] = useState(false);
  const [votingResults, setVotingResults] = useState([]);
  const [totalVotes, setTotalVotes] = useState(0);
  const [userVote, setUserVote] = useState(null);
  const [sharedUsers, setSharedUsers] = useState([]);
  const [showStoryCutCreator, setShowStoryCutCreator] = useState(false);
  const [showEmberStoryCuts, setShowEmberStoryCuts] = useState(false);
  const [showStoryModal, setShowStoryModal] = useState(false);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [showTimeDateModal, setShowTimeDateModal] = useState(false);
  const [showImageAnalysisModal, setShowImageAnalysisModal] = useState(false);
  const [showTaggedPeopleModal, setShowTaggedPeopleModal] = useState(false);
  const [showSupportingMediaModal, setShowSupportingMediaModal] = useState(false);
  const [showMediaManagementModal, setShowMediaManagementModal] = useState(false);
  const [taggedPeopleCount, setTaggedPeopleCount] = useState(0);
  const [taggedPeopleData, setTaggedPeopleData] = useState([]);
  const [emberLength, setEmberLength] = useState(10);
  const [selectedVoices, setSelectedVoices] = useState([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [userPermission, setUserPermission] = useState('none');
  const [isPlaying, setIsPlaying] = useState(false);
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
  const [showFullscreenPlay, setShowFullscreenPlay] = useState(false);
  const [currentAudio, setCurrentAudio] = useState(null);
  const [activeAudioSegments, setActiveAudioSegments] = useState([]);
  const playbackStoppedRef = useRef(false);
  const [showEndHold, setShowEndHold] = useState(false);
  const [currentVoiceType, setCurrentVoiceType] = useState(null);
  const [currentVoiceTransparency, setCurrentVoiceTransparency] = useState(0.2);
  const [currentMediaColor, setCurrentMediaColor] = useState(null);
  const [currentZoomScale, setCurrentZoomScale] = useState({ start: 1.0, end: 1.0 });
  const [availableVoices, setAvailableVoices] = useState([]);
  const [selectedEmberVoice, setSelectedEmberVoice] = useState('');
  const [selectedNarratorVoice, setSelectedNarratorVoice] = useState('');
  const [voicesLoading, setVoicesLoading] = useState(false);
  const [useEmberVoice, setUseEmberVoice] = useState(true);
  const [useNarratorVoice, setUseNarratorVoice] = useState(true);
  const [selectedStoryStyle, setSelectedStoryStyle] = useState('');
  const [isGeneratingStoryCut, setIsGeneratingStoryCut] = useState(false);
  const [storyTitle, setStoryTitle] = useState('');
  const [storyFocus, setStoryFocus] = useState('');
  const [storyCuts, setStoryCuts] = useState([]);
  const [storyCutsLoading, setStoryCutsLoading] = useState(false);
  const [availableStoryStyles, setAvailableStoryStyles] = useState([]);
  const [stylesLoading, setStylesLoading] = useState(false);
  const [selectedStoryCut, setSelectedStoryCut] = useState(null);
  const [showStoryCutDetail, setShowStoryCutDetail] = useState(false);
  const [currentlyPlayingStoryCut, setCurrentlyPlayingStoryCut] = useState(null);
  const [primaryStoryCut, setPrimaryStoryCutState] = useState(null);
  
  // Delete story cut state
  const [storyCutToDelete, setStoryCutToDelete] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Image analysis data state
  const [imageAnalysisData, setImageAnalysisData] = useState(null);

  // Story messages state
  const [storyMessages, setStoryMessages] = useState([]);
  const [storyContributorCount, setStoryContributorCount] = useState(0);

  // Supporting media state
  const [supportingMedia, setSupportingMedia] = useState([]);

  // Script editing state
  const [isEditingScript, setIsEditingScript] = useState(false);
  const [editedScript, setEditedScript] = useState('');
  const [isSavingScript, setIsSavingScript] = useState(false);
  const [hasBeenEnhanced, setHasBeenEnhanced] = useState(false);
  const [formattedScript, setFormattedScript] = useState('');

  // Synchronized text display state (Option 1B: Sentence-by-Sentence)
  const [currentDisplayText, setCurrentDisplayText] = useState('');
  const [currentVoiceTag, setCurrentVoiceTag] = useState('');
  const [currentSentenceIndex, setCurrentSentenceIndex] = useState(0);
  const [currentSegmentSentences, setCurrentSegmentSentences] = useState([]);
  const [sentenceTimeouts, setSentenceTimeouts] = useState([]);
  const [mediaTimeouts, setMediaTimeouts] = useState([]);
  
  // 🎯 State for auto-analysis loading indicator
  const [isAutoAnalyzing, setIsAutoAnalyzing] = useState(false);
  
  // 🎯 State for auto-location processing loading indicator
  const [isAutoLocationProcessing, setIsAutoLocationProcessing] = useState(false);
  
  // 🎯 State for EXIF processing loading indicator
  const [isExifProcessing, setIsExifProcessing] = useState(false);

  // Media query hook for responsive design
  const useMediaQuery = (query) => {
    const [matches, setMatches] = useState(false);
    
    useEffect(() => {
      const media = window.matchMedia(query);
      if (media.matches !== matches) {
        setMatches(media.matches);
      }
      const listener = () => setMatches(media.matches);
      media.addListener(listener);
      return () => media.removeListener(listener);
    }, [query]);
    
    return matches;
  };

  const isMobile = useMediaQuery('(max-width: 768px)');

  // Fetch available ElevenLabs voices
  const fetchVoices = async () => {
    try {
      setVoicesLoading(true);
      const voices = await getVoices();
      setAvailableVoices(voices);
      
      // Set default voices if none selected
      if (!selectedEmberVoice && voices.length > 0) {
        // Try to find "Lily" for Ember voice
        const lilyVoice = voices.find(voice => voice.name && voice.name.toLowerCase() === 'lily');
        if (lilyVoice) {
          setSelectedEmberVoice(lilyVoice.voice_id);
        } else {
          // Fall back to first voice if Lily not found
        setSelectedEmberVoice(voices[0].voice_id);
      }
      }
      if (!selectedNarratorVoice && voices.length > 0) {
        // Try to find "George" for Narrator voice
        const georgeVoice = voices.find(voice => voice.name && voice.name.toLowerCase() === 'george');
        if (georgeVoice) {
          setSelectedNarratorVoice(georgeVoice.voice_id);
        } else if (voices.length > 1) {
          // Fall back to second voice if George not found
        setSelectedNarratorVoice(voices[1].voice_id);
        } else {
          // Fall back to first voice if only one voice available
        setSelectedNarratorVoice(voices[0].voice_id);
        }
      }
    } catch (error) {
      console.error('Failed to fetch voices:', error);
    } finally {
      setVoicesLoading(false);
    }
  };

  // Fetch available story styles from database
  const fetchStoryStyles = async () => {
    try {
      setStylesLoading(true);
      
      // Load story style prompts from our prompt management system
      const { getPromptsByCategory } = await import('@/lib/promptManager');
      const storyStylePrompts = await getPromptsByCategory('story_styles');
      
      // Transform prompts into the format expected by the UI
      const styles = storyStylePrompts
        .filter(prompt => prompt.is_active)
        .map(prompt => ({
          id: prompt.prompt_key,
          name: prompt.title,
          description: prompt.description,
          subcategory: prompt.subcategory,
          prompt_key: prompt.prompt_key
        }));
      
      console.log('📚 Loaded story styles:', styles.map(s => s.name));
      setAvailableStoryStyles(styles);
      
      // Force a re-render by updating the story cuts state
      if (storyCuts.length > 0) {
        setStoryCuts(prev => [...prev]);
      }
    } catch (error) {
      console.error('Failed to fetch story styles:', error);
      setAvailableStoryStyles([]);
    } finally {
      setStylesLoading(false);
    }
  };

  // Fetch voices and story styles on component mount
  useEffect(() => {
    fetchVoices();
    fetchStoryStyles();
  }, []);

  // Format script for display when selectedStoryCut changes
  useEffect(() => {
    const formatScript = async () => {
      if (selectedStoryCut && selectedStoryCut.full_script && ember) {
        try {
          const formatted = await formatScriptForDisplay(selectedStoryCut.full_script, ember, selectedStoryCut);
          setFormattedScript(formatted);
        } catch (error) {
          console.error('Error formatting script:', error);
          setFormattedScript('Error formatting script for display');
        }
      } else {
        setFormattedScript('');
      }
    };

    formatScript();
  }, [selectedStoryCut, ember]);

  // Cleanup all audio when component unmounts
  useEffect(() => {
    return () => {
      console.log('🧹 Component unmounting, cleaning up audio...');
      // Stop any playing audio
      if (currentAudio) {
        currentAudio.pause();
        currentAudio.currentTime = 0;
      }
      
      playbackStoppedRef.current = true;
    };
  }, [currentAudio]);

  // Create a ref to store media timeouts for cleanup
  const mediaTimeoutsRef = useRef([]);

  // Cleanup media timeouts when component unmounts
  useEffect(() => {
    return () => {
      // Clean up any media timeouts on unmount
      mediaTimeoutsRef.current.forEach(timeoutId => clearTimeout(timeoutId));
    };
  }, []); // Empty dependency array - only runs on unmount

  // Fetch tagged people data for the current ember
  const fetchTaggedPeopleData = async () => {
    if (!ember?.id) return;
    
    try {
      const { getEmberTaggedPeople } = await import('@/lib/database');
      const taggedPeople = await getEmberTaggedPeople(ember.id);
      setTaggedPeopleData(taggedPeople);
      setTaggedPeopleCount(taggedPeople.length);
    } catch (error) {
      console.error('Error fetching tagged people:', error);
      setTaggedPeopleData([]);
      setTaggedPeopleCount(0);
    }
  };

  // Fetch story cuts for the current ember
  const fetchStoryCuts = async () => {
    if (!ember?.id) return;
    
    try {
      setStoryCutsLoading(true);
      const cuts = await getStoryCutsForEmber(ember.id);
      setStoryCuts(cuts);
      
      // Also fetch the primary story cut
      const primary = await getPrimaryStoryCut(ember.id);
      setPrimaryStoryCutState(primary);
      
      // Auto-set single story cut as "The One" if no primary exists
      if (cuts.length === 1 && !primary && userProfile?.user_id) {
        try {
          console.log('🎬 Auto-setting single story cut as "The One":', cuts[0].title);
          await setPrimaryStoryCut(cuts[0].id, ember.id, userProfile.user_id);
          
          // Refresh to get the updated primary status
          const updatedPrimary = await getPrimaryStoryCut(ember.id);
          setPrimaryStoryCutState(updatedPrimary);
        } catch (error) {
          console.error('Error auto-setting primary story cut:', error);
        }
      }
    } catch (error) {
      console.error('Error fetching story cuts:', error);
      setStoryCuts([]);
    } finally {
      setStoryCutsLoading(false);
    }
  };

  // Fetch story messages for the current ember
  const fetchStoryMessages = async () => {
    if (!ember?.id) return;
    
    try {
      const result = await getAllStoryMessagesForEmber(ember.id);
      const allMessages = result.messages || [];
      
      // Filter to only include user responses (not AI questions)
      const userResponses = allMessages.filter(message => 
        message.sender === 'user' || message.message_type === 'response'
      );
      
      setStoryMessages(userResponses);
      
      // Count unique contributors from user responses only
      const uniqueContributors = new Set();
      userResponses.forEach(message => {
        if (message.user_id) {
          uniqueContributors.add(message.user_id);
        }
      });
      setStoryContributorCount(uniqueContributors.size);
      
      console.log(`📊 Story data updated: ${userResponses.length} user responses from ${uniqueContributors.size} contributors (${allMessages.length} total messages)`);
    } catch (error) {
      console.error('Error fetching story messages:', error);
      setStoryMessages([]);
      setStoryContributorCount(0);
    }
  };

  // Set a story cut as the primary one
  const handleSetPrimary = async (storyCutId) => {
    if (!ember?.id || !userProfile?.user_id) return;
    
    try {
      await setPrimaryStoryCut(storyCutId, ember.id, userProfile.user_id);
      
      // Refresh the story cuts and primary status
      await fetchStoryCuts();
      
      setMessage({
        type: 'success',
        text: 'Story cut set as "The One" successfully!'
      });
    } catch (error) {
      console.error('Error setting primary story cut:', error);
      setMessage({
        type: 'error',
        text: 'Failed to set as primary. Only the ember owner can do this.'
      });
    } finally {
      setTimeout(() => setMessage(null), 3000);
    }
  };

  // Fetch story cuts and tagged people when ember changes
  useEffect(() => {
    if (ember?.id) {
      fetchStoryCuts();
      fetchTaggedPeopleData();
    }
  }, [ember?.id]);

  // Force re-render of story cuts when styles are loaded
  useEffect(() => {
    if (availableStoryStyles.length > 0 && storyCuts.length > 0) {
      // Trigger a re-render by updating the story cuts state
      setStoryCuts(prev => [...prev]);
    }
  }, [availableStoryStyles.length]);

  // Set up global actions for EmberSettingsPanel to access
  useEffect(() => {
    window.EmberDetailActions = {
      openStoryCutCreator: () => {
        setShowStoryCutCreator(true);
      },
      refreshStoryCuts: fetchStoryCuts,
      // 🐛 DEBUG: Expose debug helper globally
      debugRecordedAudio: (recordedAudio, scriptSegments) => {
        debugRecordedAudio(recordedAudio, scriptSegments);
      }
    };

    // Cleanup
    return () => {
      delete window.EmberDetailActions;
    };
  }, []);

  // Auto-select owner's voice when story cut creator opens
  useEffect(() => {
    if (showStoryCutCreator && ember?.user_id && !selectedVoices.includes(ember.user_id)) {
      console.log('🎤 Auto-selecting owner\'s voice for story cut creator');
      setSelectedVoices(prev => [...prev, ember.user_id]);
    }
  }, [showStoryCutCreator, ember?.user_id]);

  // 🎯 Auto-trigger image analysis if not yet completed (mobile fix)
  const autoTriggerImageAnalysis = async (ember) => {
    if (!ember?.id || !ember?.image_url || !user?.id) {
      console.log('🔍 [AUTO-ANALYSIS] Missing required data for auto-analysis');
      return;
    }

    // Check if analysis already exists or is in progress
    if (ember.image_analysis_completed || imageAnalysisData || isAutoAnalyzing) {
      console.log('🔍 [AUTO-ANALYSIS] Analysis already exists/in progress, skipping auto-trigger');
      return;
    }

    try {
      console.log('🔍 [AUTO-ANALYSIS] Starting automatic image analysis for ember:', ember.id);
      console.log('📸 [AUTO-ANALYSIS] Image URL:', ember.image_url.substring(0, 50) + '...');

      // Set loading state
      setIsAutoAnalyzing(true);

      // Import the analysis functions dynamically
      const { triggerImageAnalysis, saveImageAnalysis } = await import('@/lib/database');

      // Trigger the analysis
      const analysisResult = await triggerImageAnalysis(ember.id, ember.image_url);
      
      if (analysisResult && analysisResult.success) {
        console.log('💾 [AUTO-ANALYSIS] Saving analysis result...');
        
        // Save the analysis result
        await saveImageAnalysis(
          ember.id,
          user.id,
          analysisResult.analysis,
          ember.image_url,
          analysisResult.model,
          analysisResult.tokensUsed
        );
        
        console.log('✅ [AUTO-ANALYSIS] Image analysis completed and saved automatically');
        
        // Refresh ember data to show the analysis
        await fetchEmber();
        
      } else {
        console.warn('⚠️ [AUTO-ANALYSIS] Analysis result was not successful:', analysisResult);
      }
      
    } catch (error) {
      console.error('❌ [AUTO-ANALYSIS] Automatic image analysis failed:', error);
      // Don't show user error for background auto-analysis - they can always trigger manually
    } finally {
      // Clear loading state
      setIsAutoAnalyzing(false);
    }
  };

  // 🎯 Auto-trigger EXIF processing if not yet completed (ultra-fast creation)
  const autoTriggerExifProcessing = async (ember) => {
    if (!ember?.id || !ember?.image_url || !user?.id) {
      console.log('📸 [AUTO-EXIF] Missing required data for auto-EXIF processing');
      return;
    }

    // Check if EXIF processing already done or in progress
    if (isExifProcessing) {
      console.log('📸 [AUTO-EXIF] EXIF processing already in progress, skipping');
      return;
    }

    // Check if we already have photos with EXIF data for this ember
    try {
      const { getEmberPhotos } = await import('@/lib/photos');
      const photos = await getEmberPhotos(ember.id);
      
      if (photos && photos.length > 0) {
        console.log('📸 [AUTO-EXIF] EXIF processing already completed, skipping');
        return;
      }
    } catch (error) {
      console.log('📸 [AUTO-EXIF] Could not check existing photos, proceeding with EXIF processing');
    }

    try {
      console.log('📸 [AUTO-EXIF] Starting automatic EXIF processing for ember:', ember.id);
      console.log('📸 [AUTO-EXIF] Image URL:', ember.image_url.substring(0, 50) + '...');

      // Set loading state
      setIsExifProcessing(true);

      // Fetch the image from the blob URL
      console.log('📸 [AUTO-EXIF] Fetching image from blob URL...');
      const response = await fetch(ember.image_url);
      const blob = await response.blob();
      
      // Convert blob to File object
      const file = new File([blob], 'ember-image.jpg', { type: blob.type });
      
      // Import the photo functions dynamically
      const { uploadImageWithExif } = await import('@/lib/photos');
      const { autoUpdateEmberTimestamp } = await import('@/lib/geocoding');

      // Process EXIF data
      console.log('📸 [AUTO-EXIF] Processing EXIF data...');
      const photoResult = await uploadImageWithExif(file, user.id, ember.id);
      
      if (photoResult.success) {
        console.log('📸 [AUTO-EXIF] EXIF processing completed successfully');
        
        // Process timestamp data
        try {
          console.log('🕐 [AUTO-EXIF] Processing timestamp data...');
          await autoUpdateEmberTimestamp(ember, photoResult, user.id);
          console.log('✅ [AUTO-EXIF] Timestamp data processed successfully');
        } catch (timestampError) {
          console.warn('⚠️ [AUTO-EXIF] Failed to process timestamp data:', timestampError);
        }
        
        // Refresh ember data to show the updates
        await fetchEmber();
        
      } else {
        console.warn('⚠️ [AUTO-EXIF] EXIF processing was not successful:', photoResult);
      }
      
    } catch (error) {
      console.error('❌ [AUTO-EXIF] Automatic EXIF processing failed:', error);
      // Don't show user error for background auto-EXIF - not critical for user experience
    } finally {
      // Clear loading state
      setIsExifProcessing(false);
    }
  };

  // 🎯 Auto-trigger location processing if not yet completed (Android mobile fix)
  const autoTriggerLocationProcessing = async (ember) => {
    if (!ember?.id || !user?.id) {
      console.log('📍 [AUTO-LOCATION] Missing required data for auto-location processing');
      return;
    }

    // Check if location already exists or is in progress
    if (ember.latitude && ember.longitude || isAutoLocationProcessing) {
      console.log('📍 [AUTO-LOCATION] Location already exists/in progress, skipping auto-trigger');
      return;
    }

    try {
      console.log('📍 [AUTO-LOCATION] Starting automatic location processing for ember:', ember.id);

      // Set loading state
      setIsAutoLocationProcessing(true);

      // Import the photo functions dynamically
      const { getEmberPhotos } = await import('@/lib/photos');
      const { autoUpdateEmberLocation } = await import('@/lib/geocoding');

      // Get photos for this ember
      const photos = await getEmberPhotos(ember.id);
      
      if (photos && photos.length > 0) {
        // Find the first photo with GPS data
        const photoWithGPS = photos.find(photo => photo.latitude && photo.longitude);
        
        if (photoWithGPS) {
          console.log('📍 [AUTO-LOCATION] Found photo with GPS data, processing location...');
          
          // Create photoResult-like object for the location processing function
          const photoResult = {
            success: true,
            photo: photoWithGPS,
            hasGPS: true,
            hasTimestamp: !!photoWithGPS.timestamp
          };
          
          // Trigger the location processing
          const locationResult = await autoUpdateEmberLocation(ember, photoResult, user.id);
          
          if (locationResult) {
            console.log('✅ [AUTO-LOCATION] Location processing completed successfully');
            
            // Refresh ember data to show the location
            await fetchEmber();
          } else {
            console.log('📍 [AUTO-LOCATION] Location processing completed but no update needed');
          }
        } else {
          console.log('📍 [AUTO-LOCATION] No photos with GPS data found for this ember');
        }
      } else {
        console.log('📍 [AUTO-LOCATION] No photos found for this ember');
      }
      
    } catch (error) {
      console.error('❌ [AUTO-LOCATION] Automatic location processing failed:', error);
      // Don't show user error for background auto-location - location isn't critical
    } finally {
      // Clear loading state
      setIsAutoLocationProcessing(false);
    }
  };

  // Helper function to format relative time
  const formatRelativeTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now - date) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes} minute${diffInMinutes === 1 ? '' : 's'} ago`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours} hour${diffInHours === 1 ? '' : 's'} ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays} day${diffInDays === 1 ? '' : 's'} ago`;
    
    return date.toLocaleDateString();
  };

  // Helper function to format duration seconds to mm:ss
  const formatDuration = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // Helper function to get style display name from database styles
  const getStyleDisplayName = (style) => {
    // If styles aren't loaded yet, try to provide a readable name
    if (availableStoryStyles.length === 0) {
      // Convert common prompt keys to readable names
      const styleMap = {
        'documentary_style': 'Documentary Style',
        'movie_trailer_style': 'Movie Trailer Style',
        'public_radio_style': 'Public Radio Style',
        'podcast_style': 'Podcast Style',
        'sports_commentary_style': 'Sports Commentary Style',
        'dramatic_monologue_style': 'Dramatic Monologue Style',
        'fairy_tale_style': 'Fairy Tale Style',
        'news_report_style': 'News Report Style'
      };
      
      return styleMap[style] || style;
    }
    
    const dbStyle = availableStoryStyles.find(s => s.id === style || s.prompt_key === style);
    return dbStyle ? dbStyle.name : style;
  };

  // Format date for display in carousel cards
  const formatDisplayDate = (timestamp) => {
    if (!timestamp) return null;
    
    try {
      const date = new Date(timestamp);
      if (isNaN(date.getTime())) return null;
      
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch (error) {
      console.error('Error formatting date:', error);
      return null;
    }
  };

  // Format location for display in carousel cards
  const formatDisplayLocation = (ember) => {
    if (!ember) return null;
    
    // Use structured location data (City, State, Country)
    if (ember.city || ember.state || ember.country) {
      const locationParts = [];
      
      if (ember.city && ember.city.trim()) {
        locationParts.push(ember.city.trim());
      }
      if (ember.state && ember.state.trim()) {
        locationParts.push(ember.state.trim());
      }
      if (ember.country && ember.country.trim()) {
        locationParts.push(ember.country.trim());
      }
      
      if (locationParts.length > 0) {
        return locationParts.join(', ');
      }
    }
    
    // Fall back to manual location (free text entry)
    if (ember.manual_location && ember.manual_location.trim()) {
      return ember.manual_location.trim();
    }
    
    // Fall back to GPS coordinates as last resort
    if (ember.latitude && ember.longitude) {
      const lat = parseFloat(ember.latitude).toFixed(4);
      const lng = parseFloat(ember.longitude).toFixed(4);
      return `${lat}, ${lng}`;
    }
    
    return null;
  };

  // Handle story cut deletion
  const handleDeleteStoryCut = async () => {
    if (!storyCutToDelete || !userProfile?.user_id) return;
    
    try {
      setIsDeleting(true);
      await deleteStoryCut(storyCutToDelete.id, userProfile.user_id);
      
      // Refresh the story cuts list
      await fetchStoryCuts();
      
      // Close modals and reset state
      setShowDeleteConfirm(false);
      setStoryCutToDelete(null);
      
      // If the deleted story cut was selected, close the detail view
      if (selectedStoryCut?.id === storyCutToDelete.id) {
        setSelectedStoryCut(null);
        setShowStoryCutDetail(false);
      }
      
      setMessage({
        type: 'success',
        text: `Story cut "${storyCutToDelete.title}" deleted successfully!`
      });
      
    } catch (error) {
      console.error('Error deleting story cut:', error);
      setMessage({
        type: 'error',
        text: 'Failed to delete story cut. Please try again.'
      });
    } finally {
      setIsDeleting(false);
      setTimeout(() => setMessage(null), 3000);
    }
  };

  // Check if current user can delete a story cut (must be creator)
  const canDeleteStoryCut = (storyCut) => {
    return userProfile?.user_id === storyCut.creator_user_id;
  };

  // Share slide out content component
  const ShareSlideOutContent = () => {
    const [message, setMessage] = useState(null);
    const [showQRCode, setShowQRCode] = useState(false);

    const copyShareLink = async () => {
      try {
        const link = `${window.location.origin}/embers/${ember.id}`;
        await navigator.clipboard.writeText(link);
        setMessage({ type: 'success', text: 'Link copied to clipboard' });
        setTimeout(() => setMessage(null), 3000);
      } catch (error) {
        setMessage({ type: 'error', text: 'Failed to copy link' });
        setTimeout(() => setMessage(null), 3000);
      }
    };

    const handleNativeShare = async () => {
      try {
        const link = `${window.location.origin}/embers/${ember.id}`;
        const title = ember.title || 'Check out this ember';
        const description = ember.message || 'Shared from ember.ai';
        
        if (navigator.share) {
          await navigator.share({
            title: title,
            text: description,
            url: link,
          });
        }
      } catch (error) {
        console.log('Error sharing:', error);
      }
    };

    return (
      <div className="space-y-6">
        {/* Message */}
        {message && (
          <div className={`p-4 rounded-xl ${message.type === 'error' ? 'border border-red-200 bg-red-50 text-red-800' : 'border border-green-200 bg-green-50 text-green-800'}`}>
            <p className="text-sm">{message.text}</p>
          </div>
        )}

        {/* View-Only Notice */}
        <div className="bg-green-50 border border-green-200 rounded-xl p-4">
          <h4 className="font-medium text-green-900 mb-2">View-Only Sharing</h4>
          <p className="text-sm text-green-800">
            Anyone with this link can view the ember but cannot edit or contribute to it. 
            To invite collaborators with edit access, use the "Invite Contributors" feature.
          </p>
        </div>

        {/* Share Link */}
        <div className="space-y-3">
          <h4 className="font-medium flex items-center gap-2">
            <Link className="w-4 h-4" />
            Share Link (View-Only)
          </h4>
          <div className="flex gap-2">
            <Input
              value={`${window.location.origin}/embers/${ember.id}`}
              readOnly
              className="text-xs min-w-0 flex-1 h-10"
            />
            <Button size="lg" onClick={copyShareLink} variant="blue" className="flex-shrink-0">
              <Copy className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* QR Code Section */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-medium flex items-center gap-2">
              <QrCode className="w-4 h-4" />
              QR Code (View-Only)
            </h4>
            <Button
              variant="outline"
              size="lg"
              onClick={() => setShowQRCode(!showQRCode)}
              className="flex items-center gap-2"
            >
              {showQRCode ? 'Hide' : 'Generate'}
            </Button>
          </div>
          
          {/* Fixed height container to prevent jumping */}
          <div className={`transition-all duration-200 overflow-hidden ${showQRCode ? 'h-[240px]' : 'h-0'}`}>
            {showQRCode && (
              <div className="mt-4">
                <QRCodeGenerator 
                  url={`${window.location.origin}/embers/${ember.id}`}
                  title="Ember QR Code"
                  size={180}
                />
              </div>
            )}
          </div>
        </div>

        {/* Native Share Button - Bottom */}
        {typeof navigator !== 'undefined' && navigator.share && (
          <div className="mt-6 pt-4 border-t">
            <Button 
              onClick={handleNativeShare} 
              variant="blue" 
              size="lg"
              className="w-full flex items-center gap-2"
            >
              <ShareNetwork className="w-4 h-4" />
              Share Ember
            </Button>
          </div>
        )}
      </div>
    );
  };

  // Generate story cut with OpenAI
  const handleGenerateStoryCut = async () => {
    try {
      setIsGeneratingStoryCut(true);
      setMessage(null);

      // Form validation
      if (!selectedStoryStyle) {
        throw new Error('Please select a story style');
      }

      if (!emberLength || emberLength < 10 || emberLength > 300) {
        throw new Error('Duration must be between 10 and 300 seconds');
      }

      if (!useEmberVoice && !useNarratorVoice) {
        throw new Error('Please select at least one voice agent');
      }

      if (useEmberVoice && !selectedEmberVoice) {
        throw new Error('Please select an Ember voice');
      }

      if (useNarratorVoice && !selectedNarratorVoice) {
        throw new Error('Please select a Narrator voice');
      }

      if (!storyTitle.trim()) {
        throw new Error('Please enter a story title');
      }

      console.log('🎬 STARTING STORY CUT GENERATION');
      console.log('='.repeat(80));

      // Build form data
      const formData = {
        title: storyTitle.trim(),
        duration: emberLength,
        focus: storyFocus?.trim() || null
      };

      // Get story messages for richer context
      console.log('📖 Loading story circle conversations...');
      const allStoryMessages = await getAllStoryMessagesForEmber(ember.id);
      
      // Filter story messages to only include selected contributors' responses for direct quotes
      const selectedContributorQuotes = [];
      if (allStoryMessages?.messages) {
        allStoryMessages.messages.forEach(message => {
          // Only include user responses (not AI questions) from selected contributors
          if (message.sender === 'user' && message.message_type === 'answer' && selectedVoices.includes(message.user_id)) {
            selectedContributorQuotes.push({
              contributor_name: message.user_first_name || 'Anonymous',
              user_id: message.user_id,
              content: message.content,
              timestamp: message.created_at
            });
          }
        });
      }

      // Note: Direct OpenAI function builds its own context internally
      
      // Get selected voice details
      const emberVoiceInfo = useEmberVoice ? availableVoices.find(v => v.voice_id === selectedEmberVoice) : null;
      const narratorVoiceInfo = useNarratorVoice ? availableVoices.find(v => v.voice_id === selectedNarratorVoice) : null;
      
      // Get selected users for voice casting
      const selectedUserDetails = [];
      if (ember?.owner && selectedVoices.includes(ember.user_id)) {
        selectedUserDetails.push({
          id: ember.user_id,
          name: ember.owner.first_name || 'Owner',
          role: 'owner'
        });
      }
      sharedUsers.forEach(user => {
        if (selectedVoices.includes(user.user_id)) {
          selectedUserDetails.push({
            id: user.user_id,
            name: user.first_name || 'User',
            role: user.permission_level
          });
        }
      });

      // Build voice casting object
      const voiceCasting = {
        useEmberVoice: useEmberVoice,
        useNarratorVoice: useNarratorVoice,
        ember: useEmberVoice ? {
          voice_id: selectedEmberVoice,
          name: emberVoiceInfo?.name || 'Selected Voice',
          labels: emberVoiceInfo?.labels || {}
        } : null,
        narrator: useNarratorVoice ? {
          voice_id: selectedNarratorVoice,
          name: narratorVoiceInfo?.name || 'Selected Voice',
          labels: narratorVoiceInfo?.labels || {}
        } : null,
        contributors: selectedUserDetails
      };

      console.log('📊 GENERATION DETAILS:');
      console.log('🎭 Style:', selectedStoryStyle);
      console.log('📚 Story Messages:', allStoryMessages?.messages?.length || 0);
      console.log('💬 Direct Quotes:', selectedContributorQuotes.length);
      console.log('⏱️ Duration:', emberLength, 'seconds');
      console.log('🎤 Voice Casting:', {
        ember: emberVoiceInfo?.name,
        narrator: narratorVoiceInfo?.name,
        contributors: selectedUserDetails.length
      });
      console.log('🎯 Focus:', formData.focus || 'General storytelling');
      console.log('='.repeat(80));
      
      // Generate story cut using unified API route (both localhost and deployed)
      console.log('🤖 Generating story cut...');
      
      // Build context for API call
      console.log('🌍 Building context for API call...');
      const { emberContextBuilders } = await import('@/lib/emberContext');
      const emberContext = await emberContextBuilders.forStoryCut(ember.id);
      
      const storyConversations = allStoryMessages?.messages ? 
        allStoryMessages.messages
          .map(msg => `[${msg.sender === 'user' ? msg.user_first_name || 'User' : 'Ember AI'}]: ${msg.content}`)
          .join('\n\n') :
        'No story circle conversations available yet.';
      
      console.log('🔍 FRONTEND DEBUG - Voice casting being sent to API:', voiceCasting);
      console.log('🔍 FRONTEND DEBUG - Contributors array:', JSON.stringify(voiceCasting.contributors?.map(c => ({id: c.id, name: c.name})), null, 2));
      
      // Use unified API approach instead of dynamic imports
      const response = await fetch('/api/generate-story-cut', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          formData,
          selectedStyle: selectedStoryStyle,
          emberContext,
          storyConversations,
          voiceCasting,
          emberId: ember.id,
          contributorQuotes: selectedContributorQuotes
        })
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to generate story cut');
      }

      // Parse the generated story cut
      const generatedStoryCut = typeof result.data === 'string' ? JSON.parse(result.data) : result.data;
      
      console.log('✅ Story cut generated successfully:', generatedStoryCut.title);
      console.log('📄 Script length:', generatedStoryCut.full_script?.length || 0, 'characters');

      // Save the story cut to database
      console.log('💾 Saving story cut to database...');
      const storyCutData = {
        emberId: ember.id,
        creatorUserId: userProfile.user_id,
        title: generatedStoryCut.title,
        style: selectedStoryStyle,
        duration: generatedStoryCut.duration,
        wordCount: generatedStoryCut.wordCount,
        storyFocus: formData.focus,
        full_script: generatedStoryCut.full_script,
        ember_voice_lines: generatedStoryCut.ember_voice_lines,
        narrator_voice_lines: generatedStoryCut.narrator_voice_lines,
        ember_voice_name: generatedStoryCut.ember_voice_name,
        narrator_voice_name: generatedStoryCut.narrator_voice_name,
        recordedAudio: generatedStoryCut.recordedAudio || {},
        voiceCasting: {
          emberVoice: voiceCasting.ember,
          narratorVoice: voiceCasting.narrator,
          contributors: voiceCasting.contributors
        },
        metadata: {
          ...generatedStoryCut.metadata,
          tokensUsed: result.tokensUsed,
          promptUsed: result.promptUsed,
          styleUsed: result.styleUsed,
          model: result.model,
          owner_lines: generatedStoryCut.owner_lines,
          contributor_lines: generatedStoryCut.contributor_lines,
          owner_first_name: generatedStoryCut.owner_first_name
        }
      };

      const savedStoryCut = await saveStoryCut(storyCutData);
      
      console.log('✅ Story cut saved with ID:', savedStoryCut.id);



      // Refresh the story cuts list to show the new one
      await fetchStoryCuts();
      
      // Close the creation modal
      setShowStoryCutCreator(false);
      
      // Show success message
      setMessage({
        type: 'success',
        text: `Story cut "${generatedStoryCut.title}" created successfully!`
      });

      // Reset form
      setStoryTitle('');
      setStoryFocus('');
      setSelectedVoices([]);
      
    } catch (error) {
      console.error('❌ Error generating story cut:', error);
      
      // Provide more specific error messages for different failure types
      let errorMessage = 'Failed to generate story cut. Please try again.';
      
      if (error.message.includes('OpenAI API key')) {
        errorMessage = 'OpenAI API key not configured. Please check your environment variables.';
      } else if (error.message.includes('quota exceeded')) {
        errorMessage = 'OpenAI API quota exceeded. Please check your billing or try again later.';
      } else if (error.message.includes('not found')) {
        errorMessage = 'Story generation prompts not properly configured. Please contact support.';
      } else if (error.message.includes('JSON')) {
        errorMessage = 'Failed to parse AI response. Please try again with a different configuration.';
      } else if (error.message.includes('HTTP')) {
        errorMessage = `API Error: ${error.message}`;
      } else {
        errorMessage = error.message;
      }
      
      setMessage({ 
        type: 'error', 
        text: errorMessage
      });
    } finally {
      setIsGeneratingStoryCut(false);
      setTimeout(() => setMessage(null), 5000);
    }
  };

  // Handle voice selection
  const toggleVoiceSelection = (userId) => {
    setSelectedVoices(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  // Handle ember agent voice selection
  const toggleEmberVoice = () => {
    setUseEmberVoice(prev => !prev);
  };

  const toggleNarratorVoice = () => {
    setUseNarratorVoice(prev => !prev);
  };





  const fetchEmber = async () => {
    try {
      setLoading(true);
      setIsRefreshing(true);
      const data = await getEmber(id);
      console.log('Fetched ember data:', data);
      console.log('Image URL:', data?.image_url);
      
      // Check if image analysis exists for this ember
      try {
        const { getImageAnalysis } = await import('@/lib/database');
        const analysisData = await getImageAnalysis(id);
        data.image_analysis_completed = !!analysisData;
        setImageAnalysisData(analysisData); // Store the full analysis data
      } catch (analysisError) {
        console.warn('Failed to check image analysis status:', analysisError);
        data.image_analysis_completed = false;
        setImageAnalysisData(null);
      }
      
      setEmber(data);

      // Also fetch sharing information to get invited users and permission level
      try {
        const sharingData = await getEmberWithSharing(id);
        console.log('Sharing data:', sharingData);
        
        // Set user's permission level
        setUserPermission(sharingData.userPermission || 'none');
        console.log('User permission:', sharingData.userPermission);
        
        if (sharingData.shares && sharingData.shares.length > 0) {
          // Extract shared users with their profile information
          // Only include users who have actually created accounts (have user_id)
          const invitedUsers = sharingData.shares
            .filter(share => share.shared_user && share.shared_user.user_id) // Must have actual user account
            .map(share => ({
              id: share.shared_user.id,
              user_id: share.shared_user.user_id,
              first_name: share.shared_user.first_name,
              last_name: share.shared_user.last_name,
              avatar_url: share.shared_user.avatar_url,
              email: share.shared_with_email,
              permission_level: share.permission_level
            }));
          setSharedUsers(invitedUsers);
          console.log('Invited users:', invitedUsers);
        } else {
          setSharedUsers([]);
        }
      } catch (sharingError) {
        console.error('Error fetching sharing data:', sharingError);
        // Don't fail the whole component if sharing data fails
        setSharedUsers([]);
        setUserPermission('none');
      }
    } catch (err) {
      console.error('Error fetching ember:', err);
      setError('Ember not found');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchEmber();
  }, [id]);

  // Set initial story title when ember loads
  useEffect(() => {
    if (ember?.title) {
      setStoryTitle(ember.title);
    } else {
      setStoryTitle('Untitled Ember');
    }
  }, [ember?.title]);

  // Fetch dependent data when ember loads
  useEffect(() => {
    if (ember?.id) {
      fetchStoryMessages();
      fetchTaggedPeopleData();
      fetchStoryCuts();
      fetchSupportingMedia();
      
      // 🎯 Auto-trigger EXIF processing if needed (ultra-fast creation)
      autoTriggerExifProcessing(ember);
      
      // 🎯 Auto-trigger image analysis if needed (mobile fix)
      autoTriggerImageAnalysis(ember);
      
      // 🎯 Auto-trigger location processing if needed (Android mobile fix)
      autoTriggerLocationProcessing(ember);
    }
  }, [ember?.id]);

  const handleTitleEdit = () => {
    setNewTitle(ember.title || '');
    setIsEditingTitle(true);
  };

  const handleTitleCancel = () => {
    setIsEditingTitle(false);
    setNewTitle('');
  };

  const handleTitleSave = async () => {
    if (newTitle.trim() === '' || newTitle.trim() === ember.title) {
      setIsEditingTitle(false);
      return;
    }

    try {
      await updateEmberTitle(ember.id, newTitle, user.id);
      // Refetch complete ember data to preserve owner information
      await fetchEmber();
      setIsEditingTitle(false);
      setMessage({ type: 'success', text: 'Title updated successfully!' });
    } catch (error) {
      console.error('Failed to update title', error);
      setMessage({ type: 'error', text: 'Failed to update title.' });
    } finally {
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const handleEmberUpdate = async () => {
    // Refetch ember data when title is updated via modal
    await fetchEmber();
  };

  const handleTaggedPeopleUpdate = async () => {
    await fetchTaggedPeopleData();
  };

  const handleImageAnalysisUpdate = async () => {
    // Refresh the image analysis data when it's updated
    if (!ember?.id) return;
    
    try {
      const { getImageAnalysis } = await import('@/lib/database');
      const analysisData = await getImageAnalysis(ember.id);
      setImageAnalysisData(analysisData);
      
      // Update the ember state to reflect completion status
      setEmber(prev => ({
        ...prev,
        image_analysis_completed: !!analysisData
      }));
    } catch (error) {
      console.error('Error refreshing image analysis:', error);
    }
  };

  const handleStoryUpdate = async () => {
    // Refresh story data when updated via modal
    await fetchStoryMessages();
  };

  // Fetch supporting media for the current ember
  const fetchSupportingMedia = async () => {
    if (!ember?.id) return;
    
    try {
      const media = await getEmberSupportingMedia(ember.id);
      setSupportingMedia(media);
      console.log(`📁 Supporting media updated: ${media.length} files`);
    } catch (error) {
      console.error('Error fetching supporting media:', error);
      setSupportingMedia([]);
    }
  };

  const handleSupportingMediaUpdate = async () => {
    // Refresh supporting media data when updated
    await fetchSupportingMedia();
  };

  // Script editing handlers
  const handleSaveScript = async () => {
    if (!selectedStoryCut || !editedScript.trim()) return;
    
    try {
      setIsSavingScript(true);
      
      console.log('💾 Saving script...');
      console.log('🔍 Edited script content (first 500 chars):', editedScript.trim().substring(0, 500));
      console.log('📝 Script has MEDIA lines:', editedScript.includes('[[MEDIA]]'));
      console.log('📝 Script has HOLD lines:', editedScript.includes('[[HOLD]]'));
      console.log('📝 Original selectedStoryCut script before save (first 500 chars):', selectedStoryCut.full_script.substring(0, 500));
      
      // Count MEDIA and HOLD lines in edited script
      const mediaLines = (editedScript.match(/\[\[MEDIA\]\]/g) || []).length;
      const holdLines = (editedScript.match(/\[\[HOLD\]\]/g) || []).length;
      console.log('📊 Number of MEDIA lines in edited script:', mediaLines);
      console.log('📊 Number of HOLD lines in edited script:', holdLines);
      
      // 🚨 CRITICAL DEBUG: Find all HOLD lines in the edited script
      const holdMatches = editedScript.match(/\[\[HOLD\]\].*$/gm) || [];
      console.log('🚨 HOLD LINES FOUND IN EDITED SCRIPT:');
      holdMatches.forEach((holdLine, index) => {
        console.log(`  🚨 HOLD ${index + 1}: "${holdLine}"`);
      });
      
      // Import the update function
      const { updateStoryCut } = await import('@/lib/database');
      
      // Update the story cut with the new script
      const updatedStoryCut = await updateStoryCut(
        selectedStoryCut.id,
        { full_script: editedScript.trim() },
        user.id
      );
      
      console.log('📝 Database returned script (first 500 chars):', updatedStoryCut.full_script?.substring(0, 500));
      console.log('📝 Database script has MEDIA lines:', updatedStoryCut.full_script?.includes('[[MEDIA]]'));
      console.log('📝 Database script has HOLD lines:', updatedStoryCut.full_script?.includes('[[HOLD]]'));
      
      // Count MEDIA and HOLD lines in database response
      const dbMediaLines = (updatedStoryCut.full_script?.match(/\[\[MEDIA\]\]/g) || []).length;
      const dbHoldLines = (updatedStoryCut.full_script?.match(/\[\[HOLD\]\]/g) || []).length;
      console.log('📊 Number of MEDIA lines in database response:', dbMediaLines);
      console.log('📊 Number of HOLD lines in database response:', dbHoldLines);
      
      console.log('✅ Script saved successfully');
      
      // Update the local state with the actual saved script
      const updatedStoryCutWithScript = {
        ...updatedStoryCut,
        full_script: editedScript.trim() // Ensure we use the edited script
      };
      
      console.log('🔄 Updating selectedStoryCut with (first 500 chars):', updatedStoryCutWithScript.full_script.substring(0, 500));
      console.log('🔄 Updated script has MEDIA lines:', updatedStoryCutWithScript.full_script.includes('[[MEDIA]]'));
      console.log('🔄 Updated script has HOLD lines:', updatedStoryCutWithScript.full_script.includes('[[HOLD]]'));
      
      // Count MEDIA and HOLD lines in final state
      const finalMediaLines = (updatedStoryCutWithScript.full_script.match(/\[\[MEDIA\]\]/g) || []).length;
      const finalHoldLines = (updatedStoryCutWithScript.full_script.match(/\[\[HOLD\]\]/g) || []).length;
      console.log('📊 Number of MEDIA lines in final state:', finalMediaLines);
      console.log('📊 Number of HOLD lines in final state:', finalHoldLines);
      
      setSelectedStoryCut(updatedStoryCutWithScript);
      setStoryCuts(prev => 
        prev.map(cut => 
          cut.id === selectedStoryCut.id 
            ? { ...cut, full_script: editedScript.trim() }
            : cut
        )
      );
      
      // Exit editing mode
      setIsEditingScript(false);
      setMessage({ type: 'success', text: 'Script updated successfully!' });
      
      // Mark as enhanced since we just saved a script with MEDIA or HOLD lines
      const hasEnhancedContent = editedScript.includes('[[MEDIA]]') || editedScript.includes('[[HOLD]]');
      setHasBeenEnhanced(hasEnhancedContent);
      
      // Refresh story cuts to ensure we have the latest data
      console.log('🔄 Refreshing story cuts to get latest data...');
      await fetchStoryCuts();
      console.log('🔄 Story cuts refreshed');
      
      // 🚨 FINAL DEBUG: Check what's actually in the selectedStoryCut after save
      console.log('🚨 FINAL SCRIPT AFTER SAVE:', selectedStoryCut.full_script);
      const finalHoldMatches = selectedStoryCut.full_script?.match(/\[\[HOLD\]\].*$/gm) || [];
      console.log('🚨 FINAL HOLD LINES IN STORED SCRIPT:');
      finalHoldMatches.forEach((holdLine, index) => {
        console.log(`  🚨 FINAL HOLD ${index + 1}: "${holdLine}"`);
      });
      
    } catch (error) {
      console.error('Failed to update script:', error);
      setMessage({ type: 'error', text: 'Failed to update script. Please try again.' });
    } finally {
      setIsSavingScript(false);
    }
  };

  const handleCancelScriptEdit = () => {
    console.log('🔄 Canceling script edit...');
    console.log('📝 Current stored script:', selectedStoryCut.full_script);
    // Compute the current enhancement status instead of using potentially stale state
    const scriptHasEnhancedContent = selectedStoryCut.full_script.includes('[[MEDIA]]') || selectedStoryCut.full_script.includes('[[HOLD]]');
    const editableScript = getEditableScript(selectedStoryCut.full_script, ember, selectedStoryCut, scriptHasEnhancedContent);
    console.log('📝 Loaded editable script:', editableScript);
    setEditedScript(editableScript);
    setIsEditingScript(false);
  };

  // Set edited script when selectedStoryCut changes
  useEffect(() => {
    if (selectedStoryCut && selectedStoryCut.full_script && !isSavingScript) {
      console.log('🔄 useEffect: selectedStoryCut changed, updating edited script');
      console.log('📝 New selectedStoryCut script:', selectedStoryCut.full_script);
      
      // 🚨 CRITICAL DEBUG: Check for HOLD segments in the stored script
      const storedHoldMatches = selectedStoryCut.full_script.match(/\[\[HOLD\]\].*$/gm) || [];
      console.log('🚨 HOLD SEGMENTS IN STORED SCRIPT (useEffect):');
      storedHoldMatches.forEach((holdLine, index) => {
        console.log(`  🚨 STORED HOLD ${index + 1}: "${holdLine}"`);
      });
      
      // Reset enhancement flag for new story cut
      const scriptHasEnhancedContent = selectedStoryCut.full_script.includes('[[MEDIA]]') || selectedStoryCut.full_script.includes('[[HOLD]]');
      setHasBeenEnhanced(scriptHasEnhancedContent);
      
      // Use the computed value directly instead of the stale hasBeenEnhanced state
      const editableScript = getEditableScript(selectedStoryCut.full_script, ember, selectedStoryCut, scriptHasEnhancedContent);
      console.log('📝 Setting editedScript to:', editableScript);
      
      // 🚨 CRITICAL DEBUG: Check for HOLD segments in the editable script
      const editableHoldMatches = editableScript.match(/\[\[HOLD\]\].*$/gm) || [];
      console.log('🚨 HOLD SEGMENTS IN EDITABLE SCRIPT (useEffect):');
      editableHoldMatches.forEach((holdLine, index) => {
        console.log(`  🚨 EDITABLE HOLD ${index + 1}: "${holdLine}"`);
      });
      
      setEditedScript(editableScript);
    } else if (isSavingScript) {
      console.log('🔄 useEffect: Skipping script update because save is in progress');
    }
  }, [selectedStoryCut, ember, isSavingScript]);

  // Extract all wiki content as text for narration
  const extractWikiContent = (ember) => {
    return `${ember.title}. ${ember.description}`;
  };



  // Handle completion of playback
  const handlePlaybackComplete = () => {
    console.log('🎬 Playback complete, showing end hold...');
    
    // Stop multi-voice playback chain
    playbackStoppedRef.current = true;
    
    // Stop all active audio segments
    activeAudioSegments.forEach((segment, index) => {
      if (segment.audio) {
        console.log(`🛑 Stopping segment ${index + 1}: [${segment.voiceTag}]`);
        segment.audio.pause();
        segment.audio.currentTime = 0;
        
        // Clean up blob URLs
        if (segment.url && segment.url.startsWith('blob:')) {
          URL.revokeObjectURL(segment.url);
        }
      }
    });
    
    // Clear states immediately
    setIsPlaying(false);
    setCurrentVoiceType(null);
    setCurrentVoiceTransparency(0.2); // Reset to default
    setCurrentMediaColor(null);
    setCurrentZoomScale({ start: 1.0, end: 1.0 }); // Reset to default
    setActiveAudioSegments([]);
    
    // Clean up any remaining media timeouts
    console.log('🧹 Cleaning up media timeouts on playback complete:', mediaTimeouts.length);
    mediaTimeouts.forEach(timeoutId => clearTimeout(timeoutId));
    mediaTimeoutsRef.current.forEach(timeoutId => clearTimeout(timeoutId));
    setMediaTimeouts([]);
    mediaTimeoutsRef.current = [];
    
    // Show black hold then exit
    setShowEndHold(true);
    
    // After black hold, exit to normal view
    setTimeout(() => {
      handleExitPlay();
    }, 1000);
  };

  const handleExitPlay = () => {
    // Stop multi-voice playback chain
    playbackStoppedRef.current = true;
    
    // Stop current single audio if it exists
    if (currentAudio) {
      currentAudio.pause();
      currentAudio.currentTime = 0;
    }
    
    // Stop all active audio segments from multi-voice playbook
    activeAudioSegments.forEach((segment, index) => {
      if (segment.audio) {
        console.log(`🛑 Stopping segment ${index + 1}: [${segment.voiceTag}]`);
        segment.audio.pause();
        segment.audio.currentTime = 0;
        
        // Clean up blob URLs
        if (segment.url && segment.url.startsWith('blob:')) {
          URL.revokeObjectURL(segment.url);
        }
      }
    });
    
    // 🎯 Clean up sentence-by-sentence display
    sentenceTimeouts.forEach(timeout => clearTimeout(timeout));
    setSentenceTimeouts([]);
    setCurrentDisplayText('');
    setCurrentVoiceTag('');
    setCurrentSentenceIndex(0);
    setCurrentSegmentSentences([]);
    
    // 🎯 Clean up media timeouts
    console.log('🧹 Cleaning up media timeouts on exit:', mediaTimeouts.length);
    mediaTimeouts.forEach(timeoutId => clearTimeout(timeoutId));
    mediaTimeoutsRef.current.forEach(timeoutId => clearTimeout(timeoutId));
    setMediaTimeouts([]);
    mediaTimeoutsRef.current = [];

    // Batch all state updates together
    setIsPlaying(false);
    setIsGeneratingAudio(false);
    setShowFullscreenPlay(false);
    setShowEndHold(false);
    setCurrentlyPlayingStoryCut(null);
    setCurrentAudio(null);
    setActiveAudioSegments([]);
    setCurrentVoiceType(null);
    setCurrentVoiceTransparency(0.2); // Reset to default
    setCurrentMediaColor(null);
    setCurrentZoomScale({ start: 1.0, end: 1.0 }); // Reset to default
    console.log('🎬 Voice type reset on exit');
    
    // Reset playback flag for next play
    playbackStoppedRef.current = false;
  };

  // Handle play button click - now uses story cuts if available
  // Detect frame type based on image orientation
  const determineFrameType = (imageUrl) => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const aspectRatio = img.naturalWidth / img.naturalHeight;
        
        if (aspectRatio > 1) {
          // Landscape
          resolve('landscape');
        } else {
          // Portrait
          resolve('portrait');
        }
      };
      img.src = imageUrl;
    });
  };

  const handlePlay = async () => {
    if (isPlaying) {
      // Stop current audio with smooth exit
      handleExitPlay();
      return;
    }

    try {
      setShowFullscreenPlay(true);
      setIsGeneratingAudio(true); // Show loading state

      console.log('🎬 Visual effects will be driven by audio segments');

      // Check if we have story cuts available
      if (storyCuts && storyCuts.length > 0) {
        // Prioritize "The One" primary story cut, fallback to most recent
        let selectedStoryCut;
        if (primaryStoryCut) {
          selectedStoryCut = primaryStoryCut;
          console.log('🎬 Playing "The One" primary story cut:', selectedStoryCut.title, '(' + selectedStoryCut.style + ')');
        } else {
          selectedStoryCut = storyCuts[0]; // They're ordered by created_at DESC
          console.log('🎬 Playing most recent story cut:', selectedStoryCut.title, '(' + selectedStoryCut.style + ')');
        }
        
        setCurrentlyPlayingStoryCut(selectedStoryCut);
        

        
        console.log('📖 Story cut script:', selectedStoryCut.full_script);
        
        // Check if we have recorded audio URLs in the story cut
        const recordedAudio = selectedStoryCut.metadata?.recordedAudio || {};
        console.log('🎙️ Recorded audio available:', Object.keys(recordedAudio));
        
        // Always use multi-voice playback system (recorded audio is optional)
        console.log('🎵 Using multi-voice playback system');
        console.log('🎙️ Available recorded audio:', recordedAudio);
        console.log('🔍 Story cut voice IDs:', {
          ember: selectedStoryCut.ember_voice_id,
          narrator: selectedStoryCut.narrator_voice_id,
          ember_name: selectedStoryCut.ember_voice_name,
          narrator_name: selectedStoryCut.narrator_voice_name
        });
        
        // Parse the script into segments
        const segments = parseScriptSegments(selectedStoryCut.full_script);
        
        if (segments.length > 0) {
          // Use multi-voice playback system (works with or without recorded audio)
          await playMultiVoiceAudio(segments, selectedStoryCut, recordedAudio, { 
            setIsGeneratingAudio, 
            setIsPlaying, 
            handleExitPlay, 
            handlePlaybackComplete,
            setActiveAudioSegments,
            playbackStoppedRef,
            setCurrentVoiceType,
            setCurrentVoiceTransparency,
            setCurrentMediaColor,
            setCurrentZoomScale,
            // 🎯 Add sentence-by-sentence display state setters
            setCurrentDisplayText,
            setCurrentVoiceTag,
            setCurrentSentenceIndex,
            setCurrentSegmentSentences,
            setSentenceTimeouts,
            sentenceTimeouts,
            // 🎯 Add media timeout management
            setMediaTimeouts,
            mediaTimeouts,
            mediaTimeoutsRef
          });
        } else {
          // Fallback if no segments could be parsed
          console.log('⚠️ No segments could be parsed, falling back to single voice');
          setIsGeneratingAudio(false);
          setIsPlaying(true);
          
          const content = selectedStoryCut.full_script;
          const voiceId = selectedStoryCut.ember_voice_id;
          
          const audioBlob = await textToSpeech(content, voiceId);
          const audioUrl = URL.createObjectURL(audioBlob);
          const audio = new Audio(audioUrl);
          
          setCurrentAudio(audio);
          
          audio.onended = () => {
            handlePlaybackComplete();
            URL.revokeObjectURL(audioUrl);
          };
          
          audio.onerror = () => {
            console.error('Audio playback failed');
            handleExitPlay();
            URL.revokeObjectURL(audioUrl);
          };
          
          await audio.play();
        }
        
      } else {
        // Fallback to basic wiki content if no story cuts exist
        console.log('📖 No story cuts found, using basic wiki content');
        console.log('💡 Tip: Create a story cut for richer, AI-generated narration!');
        

        
        setIsGeneratingAudio(false);
        setIsPlaying(true);
        
        // Simple fallback content
        const content = "Let's build this story together by pressing Story Cuts on the bottom left.";
        console.log('📖 Content to narrate:', content);

        // Generate speech using ElevenLabs with Ember voice (Lily)
        const audioBlob = await textToSpeech(content, selectedEmberVoice);
        
        // Create audio URL and play
        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);
        
        setCurrentAudio(audio);
        
        // Handle audio end
        audio.onended = () => {
          handlePlaybackComplete();
          URL.revokeObjectURL(audioUrl);
          
          // Show helpful message about creating story cuts for richer narration
          setTimeout(() => {
            setMessage({
              type: 'info',
              text: 'Want richer narration? Create a Story Cut with AI-generated scripts in different styles!'
            });
            setTimeout(() => setMessage(null), 6000);
          }, 1000);
        };
        
        // Handle audio error
        audio.onerror = () => {
          console.error('Audio playback failed');
          handleExitPlay();
          URL.revokeObjectURL(audioUrl);
        };

        await audio.play();
      }
      
    } catch (error) {
      console.error('🔊 Play error:', error);
      setIsPlaying(false);
      setIsGeneratingAudio(false);
      setShowFullscreenPlay(false);
      alert('Failed to generate audio. Please check your ElevenLabs API key configuration.');
    }
  };

  const handleTitleDelete = async () => {
    try {
      await updateEmberTitle(ember.id, '', user.id);
      // Refetch complete ember data to preserve owner information
      await fetchEmber();
      setMessage({ type: 'success', text: 'Title deleted successfully!' });
    } catch (error) {
      console.error('Failed to delete title', error);
      setMessage({ type: 'error', text: 'Failed to delete title.' });
    } finally {
      setTimeout(() => setMessage(null), 3000);
    }
  };

  // Check if current user is the owner of this ember
  const isOwner = user && ember?.user_id === user.id;

  // Check if user can edit (owner or contributor)
  const canEdit = isOwner || userPermission === 'edit' || userPermission === 'contributor';

  // Helper function to determine section completion status
    const getSectionStatus = (sectionType) => {
      switch (sectionType) {
        case 'title':
          return ember?.title && ember.title.trim() !== '' && ember.title !== 'Untitled Ember';
        case 'contributors':
          return sharedUsers.length > 0;
        case 'location':
          return !!(ember?.latitude && ember?.longitude) || !!ember?.manual_location;
        case 'time-date':
          return !!ember?.ember_timestamp || !!ember?.manual_datetime;
        case 'analysis':
          return !!ember?.image_analysis_completed;
        case 'people':
          return taggedPeopleCount > 0;
        case 'story':
          return storyMessages.length >= 6;
        case 'supporting-media':
          return supportingMedia.length > 0;
        case 'media-management':
          return true; // Always available - represents having media names set up
        default:
          return false;
      }
    };

  // Calculate wiki progress (8 sections total)
  const calculateWikiProgress = (ember, sharedUsers = []) => {
    const sections = [
      'title',
      'location', 
      'time-date',
      'story',
      'people',
      'contributors',
      'supporting-media',
      'analysis'
    ];

    const completedSections = sections.filter(section => getSectionStatus(section));
    return {
      completed: completedSections.length,
      total: sections.length,
      percentage: Math.round((completedSections.length / sections.length) * 100)
    };
  };

  const wikiProgress = calculateWikiProgress(ember, sharedUsers);

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-lg text-gray-500">Loading ember...</div>
      </div>
    );
  }

  if (error || !ember) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Ember Not Found</h1>
          <p className="text-gray-600">This ember doesn't exist or may have been deleted.</p>
        </div>
      </div>
    );
  }

  // Define all cards (keep full definitions for potential future use)
  const allCardsDefinitions = [
    {
      id: 'photo',
      title: 'Photo',
      content: (
        <div className="h-full flex flex-col bg-gray-100 md:rounded-xl overflow-hidden">
          {/* Photo area (with toggle, blurred bg, main image, icon bar) */}
          <div className="relative w-screen left-1/2 right-1/2 -translate-x-1/2 flex-shrink-0 h-[65vh] md:w-full md:left-0 md:right-0 md:translate-x-0 md:h-auto overflow-hidden">
            {/* Top right vertical capsule: Owner Avatar and Invited Users */}
            <div className="absolute top-4 right-4 z-30 flex flex-col items-center gap-2 bg-white/50 backdrop-blur-sm px-2 py-3 rounded-full shadow-lg">
              {/* Home Icon - clickable to go to My Embers */}
              <button
                className="rounded-full p-1 hover:bg-white/70 transition-colors"
                onClick={() => navigate('/embers')}
                aria-label="Go to My Embers"
                type="button"
              >
                <House size={24} className="text-gray-700" />
              </button>
              
              {/* Horizontal divider below home icon */}
              <div className="h-px w-6 bg-gray-300 my-1"></div>
              
              {/* Settings button - Only show for ember owner */}
              {isOwner && (
                <button
                  className="rounded-full p-1 hover:bg-white/70 transition-colors"
                  onClick={() => setShowEmberWiki(true)}
                  aria-label="Settings"
                  type="button"
                >
                  <Info size={24} className="text-gray-700" />
                </button>
              )}
              
              {/* Story Cuts button - Show for all users */}
              <button
                className="rounded-full p-1 hover:bg-white/70 transition-colors relative"
                onClick={() => setShowEmberStoryCuts(true)}
                aria-label="Story Cuts"
                type="button"
              >
                <FilmSlate size={24} className="text-gray-700" />
                {/* Indicator dot when story cuts exist */}
                {storyCuts.length > 0 && (
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full shadow-sm"></div>
                )}
              </button>
              
              {/* Share button - View-only sharing for everyone */}
              {(!ember?.is_public || user) && (
                <button
                  className="rounded-full p-1 hover:bg-white/70 transition-colors"
                  onClick={() => setShowEmberSharing(true)}
                  aria-label="Share ember (view-only)"
                  type="button"
                >
                  <ShareNetwork size={24} className="text-gray-700" />
                </button>
              )}
            </div>
            {/* Blurred background with fade */}
            <img
              src={ember.image_url}
              alt="Ember blurred background"
              className={`absolute inset-0 w-full h-full object-cover blur-lg scale-110 brightness-75 transition-opacity duration-300 ${showFullImage ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
              aria-hidden="true"
              style={{ zIndex: 1 }}
              onError={(e) => {
                console.error('Background image failed to load:', ember.image_url);
                e.target.style.display = 'none';
              }}
            />
            {/* Main image with object-fit transition */}
            <img
              src={ember.image_url}
              alt="Ember"
              className={`relative w-full h-full z-10 transition-all duration-300 ${showFullImage ? 'object-contain' : 'object-cover'}`}
              onError={(e) => {
                console.error('Image failed to load:', ember.image_url);
                // Create a simple colored rectangle as fallback
                e.target.style.backgroundColor = '#f3f4f6';
                e.target.style.display = 'flex';
                e.target.style.alignItems = 'center';
                e.target.style.justifyContent = 'center';
                e.target.alt = 'Image unavailable';
                e.target.src = 'data:image/svg+xml;base64,' + btoa(`
                  <svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200">
                    <rect width="200" height="200" fill="#f3f4f6"/>
                    <text x="100" y="100" text-anchor="middle" dy="0.3em" font-family="Arial, sans-serif" font-size="14" fill="#6b7280">
                      Image unavailable
                    </text>
                  </svg>
                `);
              }}
            />
            {/* Title Overlay */}
            <div className="absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black/60 to-transparent pointer-events-none z-20">
              <div className="container mx-auto max-w-4xl">
                <h1 className="text-white text-2xl font-bold truncate drop-shadow-md text-left pl-2">
                  {ember.title || 'Untitled Ember'}
                </h1>
              </div>
            </div>

            {/* Bottom right capsule: Action icons above horizontal divider above feature icons */}
            <div className="absolute right-4 bottom-4 z-20">
              <div className="flex flex-col items-center gap-2 bg-white/50 backdrop-blur-sm px-2 py-3 rounded-full shadow-lg">
                {/* Action Icons */}
                <button
                  className="rounded-full p-1 hover:bg-white/50 transition-colors"
                  onClick={() => setShowFullImage((prev) => !prev)}
                  aria-label={showFullImage ? 'Show cropped view' : 'Show full image with blur'}
                  type="button"
                >
                  <CornersOut size={24} className="text-gray-700" />
                </button>
                
                {/* Owner Avatar - Always at the top of the stack */}
                {ember?.owner && (
                  <div 
                    className="p-1 hover:bg-white/70 rounded-full transition-colors"
                    style={{ 
                      marginTop: '0px',
                      zIndex: 35 // Highest z-index to appear on top
                    }}
                    title={`${ember.owner.first_name || ''} ${ember.owner.last_name || ''}`.trim() || 'Owner'}
                  >
                    <Avatar className="h-6 w-6 ring-2 ring-amber-400">
                      <AvatarImage 
                        src={ember.owner.avatar_url} 
                        alt={`${ember.owner.first_name || ''} ${ember.owner.last_name || ''}`.trim() || 'Owner'} 
                      />
                      <AvatarFallback className="text-xs bg-amber-100 text-amber-700">
                        {ember.owner.first_name?.[0] || ember.owner.last_name?.[0] || 'O'}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                )}
                
                {/* Invited Users Avatars - Stacked with 16px overlap */}
                {sharedUsers.map((sharedUser, index) => (
                  <div 
                    key={sharedUser.id || index}
                    className="p-1 hover:bg-white/70 rounded-full transition-colors"
                    style={{ 
                      marginTop: ember?.owner ? '-24px' : (index === 0 ? '-8px' : '-24px'),
                      zIndex: ember?.owner ? (34 - index) : (30 - index) // Adjust z-index if owner is present
                    }}
                    title={`${sharedUser.first_name || ''} ${sharedUser.last_name || ''}`.trim() || sharedUser.email}
                  >
                    <Avatar className="h-6 w-6 ring-1 ring-white">
                      <AvatarImage 
                        src={sharedUser.avatar_url} 
                        alt={`${sharedUser.first_name || ''} ${sharedUser.last_name || ''}`.trim() || sharedUser.email} 
                      />
                      <AvatarFallback className="text-xs bg-gray-200 text-gray-700">
                        {sharedUser.first_name?.[0] || sharedUser.last_name?.[0] || sharedUser.email?.[0]?.toUpperCase() || '?'}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                ))}
                
                {/* Horizontal divider */}
                <div className="h-px w-6 bg-gray-300 my-1"></div>
                
                {/* Feature Icons */}
                <button
                  className="p-1 hover:bg-white/50 rounded-full transition-colors"
                  onClick={handlePlay}
                  aria-label={isGeneratingAudio ? "Preparing Story..." : (isPlaying ? "Stop playing" : "Play ember story")}
                  type="button"
                  disabled={isGeneratingAudio}
                >
                  {isGeneratingAudio ? (
                    <div className="w-6 h-6 flex items-center justify-center">
                      <div className="w-4 h-4 border-2 border-gray-700 border-t-transparent rounded-full animate-spin" />
                    </div>
                  ) : (
                    <PlayCircle size={24} className={`text-gray-700 ${isPlaying ? 'text-blue-600' : ''}`} />
                  )}
                </button>
              </div>
            </div>
          </div>
          
          {/* Wiki Progress Bar - Full Width Capsule */}
          <div className="w-full px-4 pt-3 pb-1.5 md:px-6">
            <div className="w-full bg-gray-200 rounded-full h-4">
              <div 
                className="bg-blue-500 h-4 rounded-full transition-all duration-300 ease-out"
                style={{ width: `${wikiProgress.percentage}%` }}
              />
            </div>
          </div>
          
          {/* Progress Message */}
          <div className="w-full px-4 pt-2 pb-2 md:px-6">
            <p className="text-lg font-bold text-gray-800 text-center">
              {wikiProgress.percentage === 100 
                ? `Congrats ${userProfile?.first_name || 'User'}! We did it! Now let's try Story Cuts!`
                : `${userProfile?.first_name || 'User'}, we have to complete all these cards...`
              }
            </p>
          </div>
          
          {/* Content area - Card Carousel */}
          <div className="flex-1 flex flex-col justify-start pb-1 md:pb-8">
            <Carousel 
              className="w-full"
              opts={{
                align: "center",
                loop: false,
                skipSnaps: false,
                dragFree: true
              }}
            >
                             <CarouselContent className="pl-4 md:pl-6 -ml-2 md:-ml-4">
                {/* Story Cuts Square Card - New 1:1 Aspect Ratio Style */}
                <CarouselItem className="pl-2 md:pl-4 basis-auto flex-shrink-0">
                  <Card 
                    className="w-32 h-32 bg-blue-600 border-blue-700 cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => setShowStoryCutCreator(true)}
                  >
                    <CardContent className="p-2 h-full flex flex-col justify-center items-center">
                      <div className="flex justify-center items-center mb-1">
                        <FilmSlate size={18} className="text-white" />
                      </div>
                      <h4 className="text-sm font-medium text-white text-center leading-tight">
                        Story Cuts
                      </h4>
                      <p className="text-xs text-blue-100 text-center leading-tight mt-0.5">
                        Creator
                      </p>
                    </CardContent>
                  </Card>
                </CarouselItem>
                
                   {(() => {
                  // Define all carousel cards with their configuration
                  const carouselCards = [
                    {
                      id: 'title',
                      sectionType: 'title',
                      icon: PenNib,
                      title: () => 'Title',
                      description: (isComplete) => (!isComplete ? 'pick the perfect title' : ember.title),
                      onClick: () => () => setShowNamesModal(true)
                    },
                    {
                      id: 'location',
                      sectionType: 'location',
                      icon: MapPin,
                      title: () => 'Location',
                      description: (isComplete) => {
                        if (isAutoLocationProcessing) {
                          return 'Processing location...';
                        }
                        if (isComplete) {
                          const formattedLocation = formatDisplayLocation(ember);
                          return formattedLocation || 'Location information available';
                        }
                        return 'Where this moment happened';
                      },
                      onClick: () => () => setShowLocationModal(true)
                    },
                    {
                      id: 'time-date',
                      sectionType: 'time-date',
                      icon: Clock,
                      title: () => 'Time & Date',
                      description: (isComplete) => {
                        if (isExifProcessing) {
                          return 'Processing image data...';
                        }
                        if (isComplete) {
                          const dateToShow = ember?.ember_timestamp || ember?.manual_datetime;
                          const formattedDate = formatDisplayDate(dateToShow);
                          return formattedDate || 'Date information available';
                        }
                        return 'When this moment occurred';
                      },
                      onClick: () => () => setShowTimeDateModal(true)
                    },
                    {
                      id: 'story',
                      sectionType: 'story',
                      icon: BookOpen,
                      title: () => 'Story Circle',
                      description: (isComplete) => {
                        if (isComplete) {
                          return `${storyMessages.length} comments from ${storyContributorCount} contributor${storyContributorCount !== 1 ? 's' : ''}`;
                        }
                        return 'The narrative behind this ember';
                      },
                      onClick: () => () => setShowStoryModal(true)
                    },
                    {
                      id: 'people',
                      sectionType: 'people',
                      icon: UsersThree,
                      title: () => 'Tagged People',
                      description: (isComplete) => (!isComplete ? 'Identify and tag people in this image' : `${taggedPeopleCount} ${taggedPeopleCount !== 1 ? 'people' : 'person'} tagged`),
                      onClick: () => () => setShowTaggedPeopleModal(true)
                    },
                    {
                      id: 'supporting-media',
                      sectionType: 'supporting-media',
                      icon: ImageSquare,
                      title: () => 'Supporting Media',
                      description: (isComplete) => {
                        if (isComplete) {
                          return `${supportingMedia.length} media file${supportingMedia.length !== 1 ? 's' : ''} added`;
                        }
                        return 'Additional photos and videos';
                      },
                      onClick: () => () => setShowSupportingMediaModal(true)
                    },
                    {
                      id: 'media-management',
                      sectionType: 'media-management',
                      icon: PenNib,
                      title: () => 'Media Names',
                      description: () => 'Edit display names for script references',
                      onClick: () => () => setShowMediaManagementModal(true)
                    },
                    {
                      id: 'analysis',
                      sectionType: 'analysis',
                      icon: Sparkles,
                      title: () => 'Image Analysis',
                      description: (isComplete) => {
                        if (isAutoAnalyzing) {
                          return 'Auto-analyzing image...';
                        }
                        if (isComplete && imageAnalysisData?.tokens_used) {
                          return `${imageAnalysisData.tokens_used} tokens used to complete`;
                        }
                        return 'Deep analysis of this image';
                      },
                      onClick: () => () => setShowImageAnalysisModal(true)
                    },
                    {
                      id: 'contributors',
                      sectionType: 'contributors',
                      icon: UserCirclePlus,
                      title: () => 'Contributors',
                      description: (isComplete) => (!isComplete ? 'Invite people to edit and contribute' : `${sharedUsers.length} contributor${sharedUsers.length !== 1 ? 's' : ''} invited`),
                      onClick: () => () => setShowInviteModal(true)
                    }
                  ];

                  // Sort cards: Story Circle always first, then Not Done, then Done
                  const sortedCards = carouselCards.sort((a, b) => {
                    // Story Circle always comes first
                    if (a.sectionType === 'story') return -1;
                    if (b.sectionType === 'story') return 1;
                    
                    const aComplete = getSectionStatus(a.sectionType);
                    const bComplete = getSectionStatus(b.sectionType);
                    
                    // If completion status is the same, maintain original order
                    if (aComplete === bComplete) return 0;
                    
                    // Not Done (false) comes first, Done (true) comes last
                    return aComplete - bComplete;
                  });

                  return sortedCards.map((card) => {
                    const isComplete = getSectionStatus(card.sectionType);
                    const IconComponent = card.icon;
                    
                    return (
                      <CarouselItem key={card.id} className="pl-2 md:pl-4 basis-3/5 md:basis-1/3 lg:basis-2/5">
                   <Card 
                          className="h-32 bg-white border-gray-200 cursor-pointer hover:shadow-md transition-all duration-200"
                          onClick={card.onClick()}
                   >
                     <CardContent className="px-4 pt-1 pb-2 h-full flex flex-col justify-between">
                       <div>
                              {/* Header with icon and status badge */}
                              <div className="flex justify-center items-center relative mb-2">
                                <IconComponent size={22} className="text-blue-600" />
                                <div className={`absolute right-0 px-2 py-1 text-xs rounded-full font-medium ${
                                  isComplete 
                                    ? 'bg-green-100 text-green-800' 
                                    : 'bg-gray-100 text-gray-600'
                                }`}>
                                  {isComplete ? 'Done' : 'Not Done'}
                         </div>
                       </div>

                              {/* Wiki Title */}
                              <h3 className="font-semibold text-gray-900 text-center mb-1">
                                {card.title(isComplete)}
                              </h3>

                              {/* Dynamic Content */}
                              <p className="text-sm text-gray-600 text-center">
                                {card.description(isComplete)}
                              </p>
                       </div>
                     </CardContent>
                   </Card>
                 </CarouselItem>
                    );
                  });
                })()}
              </CarouselContent>
            </Carousel>
          </div>
        </div>
      )
    },
    {
      id: 'story-circle',
      title: 'Story Circle',
      content: (
        <div className="h-full w-full bg-white rounded-xl">
          <Card className="h-full">
            <CardContent className="p-6">
              {/* Header */}
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-gray-900 text-left">Story Circle</h2>
                  <p className="text-sm text-gray-600 mt-1">
                    Discuss and explore the story behind this ember
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )
    },
    {
      id: 'wiki',
      title: 'Ember Wiki',
      content: (
        <div className="h-full w-full bg-white rounded-xl">
          <Card className="h-full">
            <CardContent className="p-6 space-y-6">
              {/* Header */}
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-gray-900 text-left">Ember Wiki</h2>
                  <p className="text-sm text-gray-600 mt-1">
                    Knowledge and information about this ember
                  </p>
                </div>
              </div>
              
              {/* Content Sections */}
              <div className="space-y-4 text-left">
                {/* Basic Info Section */}
                <div className="space-y-3">
                  <h3 className="font-medium text-gray-900 text-left">Basic Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-4 text-sm">
                    <div className="space-y-2 text-left">
                      <span className="text-gray-500 font-medium">Title</span>
                      {isEditingTitle ? (
                        <div className="flex items-center gap-2">
                          <Input
                            type="text"
                            value={newTitle}
                            onChange={(e) => setNewTitle(e.target.value)}
                            maxLength="30"
                            className="h-10"
                          />
                          <Button size="lg" variant="blue" onClick={handleTitleSave}>Save</Button>
                          <Button size="sm" variant="outline" onClick={handleTitleCancel}>Cancel</Button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className="text-gray-900">{ember.title || 'N/A'}</span>
                          {canEdit && (
                          <button onClick={handleTitleEdit} className="text-gray-400 hover:text-blue-600">
                            <PencilSimple size={16} />
                          </button>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="space-y-2 text-left">
                      <span className="text-gray-500 font-medium">Owner</span>
                      <span className="block text-gray-900">Coming soon...</span>
                    </div>
                  </div>
                </div>

                {/* Location Section */}
                <div className="space-y-3">
                  <h3 className="font-medium text-gray-900 text-left">Location</h3>
                  <div className="text-sm text-gray-600 text-left">
                    Geolocation data will appear here...
                  </div>
                </div>



                {/* Tagged People Section */}
                <div className="space-y-3">
                  <h3 className="font-medium text-gray-900 text-left">Tagged People</h3>
                  <div className="space-y-3">
                    {taggedPeopleData.length > 0 ? (
                      taggedPeopleData.map((person, index) => (
                        <div key={person.id || index} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50">
                          <div className="flex-shrink-0">
                            <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                              <Users className="h-5 w-5 text-blue-600" />
                            </div>
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-gray-900">
                                {person.person_name}
                              </span>
                              {person.contributor_info && (
                                <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full">
                                  Contributor
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-gray-600">
                              {person.contributor_info 
                                ? `Tagged and connected to contributor ${person.contributor_email}` 
                                : 'Tagged person identified in this image'}
                            </p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-sm text-gray-500 text-left p-3 rounded-xl bg-gray-50">
                        No people have been tagged in this image yet. Use the "Tagged People" feature to identify faces.
                      </div>
                    )}
                  </div>
                </div>

                {/* Contributors Section */}
                <div className="space-y-3">
                  <h3 className="font-medium text-gray-900 text-left">Contributors</h3>
                  <div className="space-y-3">
                    {/* Owner */}
                    {ember?.owner && (
                      <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50">
                        <Avatar className="h-10 w-10">
                          <AvatarImage 
                            src={ember.owner.avatar_url} 
                            alt={`${ember.owner.first_name || ''} ${ember.owner.last_name || ''}`.trim() || 'Owner'} 
                          />
                          <AvatarFallback className="text-sm bg-gray-200 text-gray-700">
                            {ember.owner.first_name?.[0] || ember.owner.last_name?.[0] || '?'}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-gray-900">
                              {`${ember.owner.first_name || ''} ${ember.owner.last_name || ''}`.trim() || 'Owner'}
                            </span>
                            <span className="px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded-full">Owner</span>
                          </div>
                          <p className="text-sm text-gray-600">Created this ember</p>
                        </div>
                      </div>
                    )}
                    
                    {/* Invited Contributors */}
                    {sharedUsers.length > 0 ? (
                      sharedUsers.map((contributor, index) => (
                        <div key={contributor.id || index} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50">
                          <Avatar className="h-10 w-10">
                            <AvatarImage 
                              src={contributor.avatar_url} 
                              alt={`${contributor.first_name || ''} ${contributor.last_name || ''}`.trim() || contributor.email} 
                            />
                            <AvatarFallback className="text-sm bg-gray-200 text-gray-700">
                              {contributor.first_name?.[0] || contributor.last_name?.[0] || contributor.email?.[0]?.toUpperCase() || '?'}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-gray-900">
                                {`${contributor.first_name || ''} ${contributor.last_name || ''}`.trim() || contributor.email}
                              </span>
                              <span className={`px-2 py-1 text-xs rounded-full ${
                                contributor.permission_level === 'contributor' 
                                  ? 'bg-blue-100 text-blue-800' 
                                  : 'bg-gray-100 text-gray-800'
                              }`}>
                                {contributor.permission_level === 'contributor' ? 'Contributor' : 'Viewer'}
                              </span>
                            </div>
                            <p className="text-sm text-gray-600">
                              {contributor.permission_level === 'contributor' 
                                ? 'Can edit and contribute to this ember' 
                                : 'Can view this ember'}
                            </p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-sm text-gray-500 text-left p-3 rounded-xl bg-gray-50">
                        No other contributors have been invited to this ember yet.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )
    },
    {
      id: 'features',
      title: 'Features',
      content: (
        <div className="h-full w-full bg-white rounded-xl">
          <FeaturesCard ember={ember} />
        </div>
      )
    }
  ];



  return (
    <div className="md:min-h-screen bg-white">
      {/* Mobile Layout */}
      <div className="md:hidden -m-[0.67rem] -mt-[0.67rem] h-screen overflow-hidden">
        <Card className="py-0 w-full h-full bg-gray-100 rounded-none">
          <CardContent className="p-0 h-full">
            {allCardsDefinitions[0].content}
          </CardContent>
        </Card>
      </div>

      {/* Desktop Layout */}
      <div className="hidden md:block">
        <div className="container mx-auto px-1.5 py-8">
          <div className="max-w-4xl mx-auto">
            <div className="rounded-xl bg-white shadow-sm">
              <Card className="py-0 w-full bg-gray-100">
                <CardContent className="p-0 h-full">
                  {allCardsDefinitions[0].content}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>

      {/* Share Slide Out */}
      {ember && (
        <>
          {/* Overlay */}
          {showEmberSharing && (
            <div 
              className="fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity"
              onClick={() => setShowEmberSharing(false)}
            />
          )}
          
          {/* Side Panel */}
          <div className={cn(
            "fixed top-0 right-0 h-full w-[calc(100%-2rem)] max-w-2xl bg-white shadow-xl z-50 transform transition-transform duration-300 ease-in-out",
            showEmberSharing ? "translate-x-0" : "translate-x-full"
          )}>
            <div className="p-6 border-b">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShareNetwork size={24} className="text-blue-600" />
                  <h2 className="text-xl font-bold text-gray-900">Share Ember</h2>
                </div>
                <button
                  onClick={() => setShowEmberSharing(false)}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <span className="sr-only">Close</span>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              <ShareSlideOutContent />
            </div>
          </div>
        </>
      )}

      {/* Invite Contributors Modal */}
      {ember && (
        <InviteModal 
          ember={ember} 
          isOpen={showInviteModal} 
          onClose={() => setShowInviteModal(false)}
          onUpdate={handleEmberUpdate}
        />
      )}

      {/* Ember Names Modal */}
      {ember && (
        <EmberNamesModal 
          ember={ember} 
          isOpen={showNamesModal} 
          onClose={() => setShowNamesModal(false)}
          onEmberUpdate={handleEmberUpdate}
        />
      )}

      {/* Story Modal */}
      {ember && (
        <StoryModal 
          ember={ember} 
          isOpen={showStoryModal} 
          onClose={() => setShowStoryModal(false)}
          question="Tell us about this moment. What was happening when this photo was taken?"
          onSubmit={async (submissionData) => {
            console.log('Story submission:', submissionData);
            // TODO: Handle story submission (save to database, process audio, etc.)
          }}
          onRefresh={handleStoryUpdate}
          isRefreshing={isRefreshing}
        />
      )}

      {/* Settings Panel */}
      {ember && (
        <EmberSettingsPanel
          ember={ember}
          isOpen={showEmberWiki}
          onClose={() => setShowEmberWiki(false)}
          isEditingTitle={isEditingTitle}
          setIsEditingTitle={setIsEditingTitle}
          newTitle={newTitle}
          setNewTitle={setNewTitle}
          handleTitleSave={handleTitleSave}
          handleTitleCancel={handleTitleCancel}
          handleTitleEdit={handleTitleEdit}
          handleTitleDelete={handleTitleDelete}
          message={message}
          onRefresh={fetchEmber}
          onOpenSupportingMedia={() => setShowSupportingMediaModal(true)}
        />
      )}

      {/* Location Modal */}
      {ember && (
        <LocationModal 
          ember={ember} 
          isOpen={showLocationModal} 
          onClose={() => setShowLocationModal(false)}
          isMobile={isMobile}
          onRefresh={fetchEmber}
        />
      )}

      {/* Time & Date Modal */}
      {ember && (
        <TimeDateModal 
          ember={ember} 
          isOpen={showTimeDateModal} 
          onClose={() => setShowTimeDateModal(false)}
          isMobile={isMobile}
          onRefresh={fetchEmber}
        />
      )}

      {/* Image Analysis Modal */}
      {ember && (
        <ImageAnalysisModal 
          ember={ember} 
          isOpen={showImageAnalysisModal} 
          onClose={() => setShowImageAnalysisModal(false)}
          onRefresh={handleImageAnalysisUpdate}
        />
      )}

      {/* Tagged People Modal */}
      {ember && (
        <TaggedPeopleModal 
          ember={ember} 
          isOpen={showTaggedPeopleModal} 
          onClose={() => setShowTaggedPeopleModal(false)}
          onUpdate={handleTaggedPeopleUpdate}
        />
      )}

      {/* Supporting Media Modal */}
      {ember && (
        <SupportingMediaModal 
          ember={ember} 
          isOpen={showSupportingMediaModal} 
          onClose={() => setShowSupportingMediaModal(false)}
          onUpdate={handleSupportingMediaUpdate}
        />
      )}

      {/* Media Management Modal */}
      {ember && (
        <MediaManagementModal 
          isOpen={showMediaManagementModal} 
          onClose={() => setShowMediaManagementModal(false)}
          emberId={ember.id}
        />
      )}

      {/* Story Cuts Panel */}
      {ember && (
        <>
          {/* Overlay */}
          {showEmberStoryCuts && (
            <div 
              className="fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity"
              onClick={() => setShowEmberStoryCuts(false)}
            />
          )}
          
          {/* Side Panel */}
          <div className={cn(
            "fixed top-0 right-0 h-full w-[calc(100%-2rem)] max-w-2xl bg-white shadow-xl z-50 transform transition-transform duration-300 ease-in-out",
            showEmberStoryCuts ? "translate-x-0" : "translate-x-full"
          )}>
            <div className="p-6 border-b">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FilmSlate size={24} className="text-blue-600" />
                  <h2 className="text-xl font-bold text-gray-900">Story Cuts</h2>
                </div>
                <button
                  onClick={() => setShowEmberStoryCuts(false)}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <span className="sr-only">Close</span>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {/* Loading State */}
              {storyCutsLoading && (
                <div className="flex items-center justify-center py-8">
                  <div className="text-gray-500">Loading story cuts...</div>
                </div>
              )}

              {/* Real Story Cuts */}
              {!storyCutsLoading && storyCuts.map((cut) => {
                const isPrimary = primaryStoryCut?.id === cut.id;
                return (
                <div 
                  key={cut.id} 
                  className="bg-gray-50 rounded-xl p-4 hover:bg-gray-100 transition-colors border border-gray-200 relative group"
                >
                  {/* Primary Badge - Matches media section "Cover" badge style */}
                  {isPrimary && (
                    <div className="absolute top-2 left-2 bg-blue-600 text-white px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 z-10">
                      <Star size={12} weight="fill" />
                      The One
                    </div>
                  )}



                  {/* Clickable content area */}
                  <div 
                    className="cursor-pointer"
                    onClick={() => {
                      setSelectedStoryCut(cut);
                      setShowStoryCutDetail(true);
                    }}
                  >
                    <div className="flex gap-4">
                                         {/* Thumbnail - Using ember image for now */}
                     <div className="flex-shrink-0">
                       <img 
                         src={ember.image_url} 
                         alt={cut.title}
                         className="w-24 h-24 rounded-lg object-cover"
                       />
                     </div>
                    
                    {/* Content */}
                    <div className="flex-1 min-w-0" style={{ textAlign: 'left' }}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0 text-left" style={{ textAlign: 'left' }}>
                          <h3 className="font-medium text-gray-900 truncate text-left" style={{ textAlign: 'left' }}>{cut.title}</h3>
                          <p className="text-sm text-gray-600 mt-1 line-clamp-2 text-left" style={{ textAlign: 'left' }}>
                              {cut.story_focus || (cut.full_script ? (() => {
                                // Remove voice tags like [EMBER VOICE], [NARRATOR], [NAME] from script snippet
                                const cleanScript = cut.full_script.replace(/\[[^\]]+\]/g, '').trim();
                                return cleanScript.substring(0, 100) + (cleanScript.length > 100 ? '...' : '');
                              })() : '') || 'No description available'}
                          </p>
                        </div>
                      </div>
                      
                      {/* Metadata */}
                      <div className="mt-3 text-xs text-gray-500" style={{ textAlign: 'left' }}>
                        <div className="flex items-center gap-1 mb-1">
                          <Avatar className="h-3 w-3">
                            <AvatarImage src={cut.creator?.avatar_url} alt={`${cut.creator?.first_name || ''} ${cut.creator?.last_name || ''}`.trim()} />
                            <AvatarFallback className="bg-blue-100 text-blue-800 text-xs">
                              {cut.creator?.first_name?.[0] || cut.creator?.last_name?.[0] || 'U'}
                            </AvatarFallback>
                          </Avatar>
                          {`${cut.creator?.first_name || ''} ${cut.creator?.last_name || ''}`.trim() || 'Unknown Creator'}
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="flex items-center gap-1">
                            <Clock size={12} />
                            {formatDuration(cut.duration)}
                          </span>
                          <span>{formatRelativeTime(cut.created_at)}</span>
                        </div>
                      </div>
                      
                      {/* Style Badge with Actions */}
                      <div className="mt-2 text-left flex items-center justify-between" style={{ textAlign: 'left' }}>
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {getStyleDisplayName(cut.style)}
                        </span>
                        
                        {/* Action buttons */}
                        <div className="flex items-center gap-1">
                          {/* Make Primary Button - Only show for owner and non-primary cuts */}
                          {!isPrimary && userPermission === 'owner' && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSetPrimary(cut.id);
                              }}
                              className="p-1 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-full transition-colors duration-200"
                              title="Make This The One"
                            >
                              <Star size={12} weight="fill" />
                            </button>
                          )}
                          
                          {/* Delete Button - Only show for creators */}
                          {canDeleteStoryCut(cut) && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setStoryCutToDelete(cut);
                                setShowDeleteConfirm(true);
                              }}
                              className="p-1 bg-red-100 hover:bg-red-200 text-red-600 rounded-full transition-colors duration-200"
                              title="Delete story cut"
                            >
                              <Trash size={12} />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                    </div>
                  </div>
                </div>
              );
            })}
              
              {/* Empty State - Show when no cuts exist */}
              {!storyCutsLoading && storyCuts.length === 0 && (
                <div className="flex flex-col items-center justify-center py-12">
                  <FilmSlate size={48} className="text-gray-300 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2 text-center">No Story Cuts Yet</h3>
                  <p className="text-gray-600 mb-4 text-center">Create your first story cut to get started</p>
                  <Button 
                    variant="blue" 
                    onClick={() => {
                      setShowEmberStoryCuts(false);
                      setShowStoryCutCreator(true);
                    }}
                    className="flex items-center gap-2 mx-auto"
                  >
                    <FilmSlate size={16} />
                    Create Story Cut
                  </Button>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Story Cut Creator - Responsive Modal/Drawer */}
      {ember && (
        <>
          {isMobile ? (
            <Drawer open={showStoryCutCreator} onOpenChange={setShowStoryCutCreator}>
              <DrawerContent className="bg-white focus:outline-none">
                <DrawerHeader className="bg-white">
                  <DrawerTitle className="flex items-center gap-2 text-xl font-bold text-gray-900">
                    <FilmSlate size={20} className="text-blue-600" />
                    Story Cuts Creator
                  </DrawerTitle>
                  <DrawerDescription className="text-left text-gray-600">
                    Compose your own version of this ember
                  </DrawerDescription>
                </DrawerHeader>
                <div className="px-4 pb-4 bg-white max-h-[70vh] overflow-y-auto">
                  <StoryModalContent 
                    userProfile={userProfile}
                    storyTitle={storyTitle}
                    setStoryTitle={setStoryTitle}
                    emberLength={emberLength}
                    setEmberLength={setEmberLength}
                    ember={ember}
                    sharedUsers={sharedUsers}
                    selectedVoices={selectedVoices}
                    toggleVoiceSelection={toggleVoiceSelection}
                    selectedStoryStyle={selectedStoryStyle}
                    setSelectedStoryStyle={setSelectedStoryStyle}
                    stylesLoading={stylesLoading}
                    availableStoryStyles={availableStoryStyles}
                    storyFocus={storyFocus}
                    setStoryFocus={setStoryFocus}
                    selectedEmberVoice={selectedEmberVoice}
                    setSelectedEmberVoice={setSelectedEmberVoice}
                    selectedNarratorVoice={selectedNarratorVoice}
                    setSelectedNarratorVoice={setSelectedNarratorVoice}
                    voicesLoading={voicesLoading}
                    availableVoices={availableVoices}
                    handleGenerateStoryCut={handleGenerateStoryCut}
                    isGeneratingStoryCut={isGeneratingStoryCut}
                    storyMessages={storyMessages}
                    useEmberVoice={useEmberVoice}
                    toggleEmberVoice={toggleEmberVoice}
                    useNarratorVoice={useNarratorVoice}
                    toggleNarratorVoice={toggleNarratorVoice}
                  />
                </div>
              </DrawerContent>
            </Drawer>
          ) : (
            <Dialog open={showStoryCutCreator} onOpenChange={setShowStoryCutCreator}>
              <DialogContent className="w-[calc(100%-2rem)] max-w-2xl max-h-[90vh] overflow-y-auto bg-white sm:w-full sm:max-w-2xl rounded-2xl focus:outline-none">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2 text-xl font-bold text-gray-900">
                    <FilmSlate size={20} className="text-blue-600" />
                    Story Cuts Creator
                  </DialogTitle>
                  <DialogDescription className="text-gray-600">
                    Compose your own version of this ember
                  </DialogDescription>
                </DialogHeader>
                <StoryModalContent 
                  userProfile={userProfile}
                  storyTitle={storyTitle}
                  setStoryTitle={setStoryTitle}
                  emberLength={emberLength}
                  setEmberLength={setEmberLength}
                  ember={ember}
                  sharedUsers={sharedUsers}
                  selectedVoices={selectedVoices}
                  toggleVoiceSelection={toggleVoiceSelection}
                  selectedStoryStyle={selectedStoryStyle}
                  setSelectedStoryStyle={setSelectedStoryStyle}
                  stylesLoading={stylesLoading}
                  availableStoryStyles={availableStoryStyles}
                  storyFocus={storyFocus}
                  setStoryFocus={setStoryFocus}
                  selectedEmberVoice={selectedEmberVoice}
                  setSelectedEmberVoice={setSelectedEmberVoice}
                  selectedNarratorVoice={selectedNarratorVoice}
                  setSelectedNarratorVoice={setSelectedNarratorVoice}
                  voicesLoading={voicesLoading}
                  availableVoices={availableVoices}
                  handleGenerateStoryCut={handleGenerateStoryCut}
                  isGeneratingStoryCut={isGeneratingStoryCut}
                  storyMessages={storyMessages}
                  useEmberVoice={useEmberVoice}
                  toggleEmberVoice={toggleEmberVoice}
                  useNarratorVoice={useNarratorVoice}
                  toggleNarratorVoice={toggleNarratorVoice}
                />
              </DialogContent>
            </Dialog>
          )}
        </>
      )}

      {/* Story Cut Detail Viewer - Responsive Modal/Drawer */}
      {selectedStoryCut && (
        <>
          {isMobile ? (
            <Drawer open={showStoryCutDetail} onOpenChange={setShowStoryCutDetail}>
              <DrawerContent className="bg-white focus:outline-none">
                <DrawerHeader className="bg-white text-left">
                  <DrawerTitle className="flex items-center gap-2 text-xl font-bold text-gray-900 text-left">
                    <FilmSlate size={20} className="text-blue-600" />
                    {selectedStoryCut.title}
                  </DrawerTitle>
                  <DrawerDescription className="text-left text-gray-600">
                    {getStyleDisplayName(selectedStoryCut.style)} • {formatDuration(selectedStoryCut.duration)} • Created by {`${selectedStoryCut.creator?.first_name || ''} ${selectedStoryCut.creator?.last_name || ''}`.trim() || 'Unknown Creator'}
                  </DrawerDescription>
                </DrawerHeader>
                <div className="px-4 pb-4 bg-white max-h-[70vh] overflow-y-auto">
                  <StoryCutDetailContent 
                    selectedStoryCut={selectedStoryCut}
                    isEditingScript={isEditingScript}
                    setIsEditingScript={setIsEditingScript}
                    editedScript={editedScript}
                    setEditedScript={setEditedScript}
                    handleSaveScript={handleSaveScript}
                    handleCancelScriptEdit={handleCancelScriptEdit}
                    isSavingScript={isSavingScript}
                    formatDuration={formatDuration}
                    getStyleDisplayName={getStyleDisplayName}
                    formatRelativeTime={formatRelativeTime}
                    storyMessages={storyMessages}
                    ember={ember}
                    hasBeenEnhanced={hasBeenEnhanced}
                    getEditableScript={getEditableScript}
                    formattedScript={formattedScript}
                  />
                </div>
              </DrawerContent>
            </Drawer>
          ) : (
            <Dialog open={showStoryCutDetail} onOpenChange={setShowStoryCutDetail}>
              <DialogContent className="w-[calc(100%-2rem)] max-w-2xl max-h-[90vh] overflow-y-auto bg-white sm:w-full sm:max-w-2xl rounded-2xl focus:outline-none">
                <DialogHeader className="text-left">
                  <DialogTitle className="flex items-center gap-2 text-xl font-bold text-gray-900 text-left">
                    <FilmSlate size={20} className="text-blue-600" />
                    {selectedStoryCut.title}
                  </DialogTitle>
                  <DialogDescription className="text-left text-gray-600">
                    {getStyleDisplayName(selectedStoryCut.style)} • {formatDuration(selectedStoryCut.duration)} • Created by {`${selectedStoryCut.creator?.first_name || ''} ${selectedStoryCut.creator?.last_name || ''}`.trim() || 'Unknown Creator'}
                  </DialogDescription>
                </DialogHeader>
                <StoryCutDetailContent 
                  selectedStoryCut={selectedStoryCut}
                  isEditingScript={isEditingScript}
                  setIsEditingScript={setIsEditingScript}
                  editedScript={editedScript}
                  setEditedScript={setEditedScript}
                  handleSaveScript={handleSaveScript}
                  handleCancelScriptEdit={handleCancelScriptEdit}
                  isSavingScript={isSavingScript}
                  formatDuration={formatDuration}
                  getStyleDisplayName={getStyleDisplayName}
                  formatRelativeTime={formatRelativeTime}
                  storyMessages={storyMessages}
                  ember={ember}
                  hasBeenEnhanced={hasBeenEnhanced}
                  getEditableScript={getEditableScript}
                  formattedScript={formattedScript}
                />
              </DialogContent>
            </Dialog>
          )}
        </>
      )}

      {/* Fullscreen Play Mode */}
      {showFullscreenPlay && (
        <>
          <div className="fixed inset-0 bg-black z-50">
                    {/* Background Image - only show when not loading, not in end hold, and no media color effect */}
          {!isGeneratingAudio && !showEndHold && !currentMediaColor && (
            <img 
              src={ember.image_url} 
              alt={ember.title || 'Ember'}
              className="absolute inset-0 w-full h-full object-cover"
            />
          )}
          
          {/* Voice Type Overlay - only show when playing, not in end hold, and no media color effect */}
          {!isGeneratingAudio && !showEndHold && !currentMediaColor && currentVoiceType && (
            <div 
              className="absolute inset-0"
              style={{
                backgroundColor: currentVoiceType === 'ember' ? `rgba(255, 0, 0, ${currentVoiceTransparency})` : 
                                currentVoiceType === 'narrator' ? `rgba(0, 0, 255, ${currentVoiceTransparency})` : 
                                currentVoiceType === 'contributor' ? `rgba(0, 255, 0, ${currentVoiceTransparency})` : 
                                'transparent'
              }}
            />
          )}
          
          {/* Media Color Screen - solid color background when color effect is active */}
          {!isGeneratingAudio && !showEndHold && currentMediaColor && (
            <div 
              className="absolute inset-0"
              style={{
                backgroundColor: currentMediaColor
              }}
            />
          )}
          

          
          {/* Title Overlay - only show when playing, not in end hold, and no media color effect */}
          {!isGeneratingAudio && !showEndHold && !currentMediaColor && (
            <div className="absolute top-0 left-0 right-0 p-4 pointer-events-none z-20">
              <div className="container mx-auto max-w-4xl">
                <h1 className="text-white text-2xl font-bold truncate text-left pl-2">
                  {ember.title || 'Untitled Ember'}
                </h1>
                  </div>
              </div>
          )}

          {/* 🎯 Synchronized Text Display (Option 1B: Sentence-by-Sentence) */}
          {!isGeneratingAudio && !showEndHold && !currentMediaColor && currentDisplayText && (
            <div className="absolute bottom-20 left-0 right-0 p-4 pointer-events-none z-20">
              <div className="container mx-auto max-w-4xl">
                <div className="bg-black p-6">
                  {/* Current sentence text */}
                  <p className="text-white text-xl leading-relaxed font-medium">
                    {currentDisplayText}
                  </p>
                  
                  {/* Progress indicator for sentences */}
                  {currentSegmentSentences.length > 1 && (
                    <div className="flex justify-center mt-4">
                      <div className="flex gap-1">
                        {currentSegmentSentences.map((_, index) => (
                          <div
                            key={index}
                            className={`w-2 h-2 rounded-full ${
                              index === currentSentenceIndex ? 'bg-white' : 'bg-white/30'
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}



          {/* Bottom right capsule: Play controls and exit - hide during end hold */}
          {!showEndHold && (
            <div className="absolute right-4 bottom-4 z-20">
            <div className="flex flex-col items-center gap-2 bg-white px-2 py-3 rounded-full">
            
            {/* Play/Pause Button */}
            <button
              onClick={handlePlay}
              className="rounded-full p-1"
              aria-label={isGeneratingAudio ? "Preparing Story..." : (isPlaying ? "Pause playing" : "Resume playing")}
              type="button"
              disabled={isGeneratingAudio}
            >
              {isGeneratingAudio ? (
                <div className="w-6 h-6 flex items-center justify-center">
                  <div className="w-4 h-4 border-2 border-gray-700 border-t-transparent rounded-full" />
                </div>
              ) : isPlaying ? (
                <div className="w-6 h-6 flex items-center justify-center">
                  <div className="w-1.5 h-4 bg-gray-700 mx-0.5 rounded-sm"></div>
                  <div className="w-1.5 h-4 bg-gray-700 mx-0.5 rounded-sm"></div>
                </div>
              ) : (
                <PlayCircle size={24} className="text-gray-700" />
              )}
            </button>
              
              {/* Horizontal divider */}
              <div className="h-px w-6 bg-gray-300 my-1"></div>
            
            {/* Close button */}
            <button
              onClick={handleExitPlay}
              className="rounded-full p-1"
              aria-label="Close fullscreen"
              type="button"
            >
              <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            </div>
          </div>
          )}
          
          {/* Loading screen - pure black with loading indicator */}
          {isGeneratingAudio && (
            <div className="absolute inset-0 bg-black z-30 flex items-center justify-center">
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full" />
                <span className="text-white text-lg font-medium">Preparing Story...</span>
              </div>
            </div>
          )}
          
          {/* End hold screen - pure black */}
          {showEndHold && (
            <div className="absolute inset-0 bg-black z-30">
              {/* Completely black screen */}
            </div>
          )}
          </div>
        </>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
                      <DialogContent className="w-[calc(100%-2rem)] max-w-2xl bg-white sm:w-full sm:max-w-2xl rounded-2xl focus:outline-none">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl font-bold text-red-700">
              <Trash size={20} className="text-red-600" />
              Delete Story Cut
            </DialogTitle>
            <DialogDescription className="text-gray-600">
              Are you sure you want to delete "{storyCutToDelete?.title}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex gap-3 mt-6">
            <Button
              variant="outline"
              onClick={() => {
                setShowDeleteConfirm(false);
                setStoryCutToDelete(null);
              }}
              className="flex-1"
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleDeleteStoryCut}
              disabled={isDeleting}
              className="flex-1 bg-red-600 hover:bg-red-700 text-white border-red-600 hover:border-red-700"
            >
              {isDeleting ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Deleting...
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Trash size={16} />
                  Delete
                </div>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
}

  // Parse script into voice segments for multi-voice playback
  const parseScriptSegments = (script) => {
    if (!script) return [];
    
    const segments = [];
    const lines = script.split('\n');
    
    console.log('🔍 parseScriptSegments: Processing', lines.length, 'lines');
    console.log('🔍 FULL SCRIPT CONTENT:', script);
    lines.forEach((line, index) => {
      console.log(`🔍 Line ${index + 1}: "${line}"`);
    });
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      if (!trimmedLine) continue;
      
      console.log(`🔍 Processing line: "${trimmedLine.substring(0, 100)}..."`);
      
      // Skip malformed lines (common parsing artifacts)
      if ((trimmedLine.includes('[[MEDIA]') && !trimmedLine.includes('[[MEDIA]]')) ||
          (trimmedLine.includes('[[HOLD]') && !trimmedLine.includes('[[HOLD]]'))) {
        console.log('⚠️ Skipping malformed MEDIA/HOLD line:', trimmedLine);
        continue;
      }
      
      // Match media tags like [[MEDIA]] or [[HOLD]] with content
      const mediaMatch = trimmedLine.match(/^\[\[(MEDIA|HOLD)\]\]\s*(.*)$/);
      
      if (mediaMatch) {
        const mediaType = mediaMatch[1]; // MEDIA or HOLD
        const content = mediaMatch[2].trim();
        
        console.log(`🔍 ${mediaType} match found:`, {
          fullMatch: mediaMatch[0],
          type: mediaType,
          content: content
        });
        
        // Skip if content is empty or just whitespace
        if (!content) {
          console.log(`⚠️ Skipping empty ${mediaType} segment`);
          continue;
        }
        
        // Extract existing visual actions if any and clean the content
        const existingVisualActions = [];
        let cleanContent = content.replace(/\<([^>]+)\>/g, (match, action) => {
          existingVisualActions.push(action);
          return '';
        }).trim();
        
        // For media lines, the content after removing actions should be the media reference
        const mediaReference = cleanContent;
        
        // Parse media reference to extract ID or name
        let mediaId = null;
        let mediaName = null;
        let resolvedMediaReference = mediaReference;
        
        if (mediaReference) {
          // Check for id=abc123 format
          const idMatch = mediaReference.match(/id=([a-zA-Z0-9\-_]+)/);
          if (idMatch) {
            mediaId = idMatch[1];
            resolvedMediaReference = mediaReference; // Keep original for display
          } else {
            // Check for name="Display Name" format
            const nameMatch = mediaReference.match(/name="([^"]+)"/);
            if (nameMatch) {
              mediaName = nameMatch[1];
              resolvedMediaReference = mediaReference; // Keep original for display
            } else {
              // If no id= or name= format, treat as legacy media reference
              mediaId = mediaReference;
            }
          }
        }
        
        // Reconstruct content with visual actions FOR DISPLAY
        const allVisualActions = existingVisualActions.map(action => `<${action}>`).join('');
        const finalContent = mediaReference ? `${mediaReference} ${allVisualActions}`.trim() : allVisualActions;
        
        // Only add if we have actual content or visual actions
        if (finalContent || existingVisualActions.length > 0) {
          const segmentType = mediaType.toLowerCase(); // 'media' or 'hold'
          segments.push({
            voiceTag: mediaType,
            content: finalContent,
            originalContent: mediaReference,
            type: segmentType,
            visualActions: existingVisualActions,
            hasAutoColorize: false,
            // Add media reference resolution data
            mediaId: mediaId,
            mediaName: mediaName,
            resolvedMediaReference: resolvedMediaReference
          });
          console.log(`🎬 Parsed ${mediaType} segment:`, { 
            line: trimmedLine, 
            finalContent, 
            mediaReference, 
            visualActions: existingVisualActions.length,
            type: segmentType
          });
          
          // 🐛 HOLD SPECIFIC DEBUG
          if (segmentType === 'hold') {
            console.log(`🔍 HOLD SEGMENT DEBUG:`, {
              originalInput: trimmedLine,
              extractedContent: content,
              cleanContent: cleanContent,
              mediaReference: mediaReference,
              visualActions: existingVisualActions,
              allVisualActions: allVisualActions,
              finalContent: finalContent,
              passedCondition: (finalContent || existingVisualActions.length > 0)
            });
          }
        } else {
          console.log(`❌ SKIPPED ${mediaType} segment - no content or visual actions:`, {
            finalContent,
            existingVisualActionsLength: existingVisualActions.length
          });
        }
      } else {
        // Match voice tags like [EMBER VOICE], [NARRATOR], [Amado], etc.
        const voiceMatch = trimmedLine.match(/^\[([^\]]+)\]\s*(.+)$/);
        
        if (voiceMatch) {
        console.log(`🔍 Voice match found:`, {
          fullMatch: voiceMatch[0],
          voiceTag: voiceMatch[1],
          content: voiceMatch[2]
        });
        const voiceTag = voiceMatch[1].trim();
        let content = voiceMatch[2].trim();
        const voiceType = getVoiceType(voiceTag);
        
        // Extract existing visual actions if any and clean the content for audio
        const existingVisualActions = [];
        let cleanContent = content.replace(/\<([^>]+)\>/g, (match, action) => {
          existingVisualActions.push(action);
          return '';
        }).trim();
        
        // Add default colorization based on voice type (if no COLOR action exists)
        let colorizeAction = '';
        const hasColorizeAction = existingVisualActions.some(action => action.startsWith('COLOR:'));
        
        if (!hasColorizeAction) {
          switch (voiceType) {
            case 'ember':
              colorizeAction = '<COLOR:#FF0000,TRAN:0.2>';
              break;
            case 'narrator':
              colorizeAction = '<COLOR:#0000FF,TRAN:0.2>';
              break;
            case 'contributor':
              colorizeAction = '<COLOR:#00FF00,TRAN:0.2>';
              break;
          }
        }
        
        // Reconstruct content with visual actions FOR DISPLAY
        const allVisualActions = existingVisualActions.map(action => `<${action}>`).join('');
        const finalContent = `${colorizeAction}${allVisualActions} ${cleanContent}`.trim();
        
        if (cleanContent) {
          segments.push({
            voiceTag,
            content: finalContent, // For display (includes visual actions)
            originalContent: cleanContent, // For audio synthesis (clean text only)
            type: voiceType,
            visualActions: existingVisualActions,
            hasAutoColorize: !hasColorizeAction
          });
        }
      }
    }
  }
    
    console.log('📝 Parsed script segments:', segments.length, 'segments');
    console.log('🎨 Applied auto-colorization based on voice types:');
    segments.forEach((segment, index) => {
      if (segment.type === 'media' || segment.type === 'hold') {
        console.log(`  ${index + 1}. [[${segment.voiceTag}]] → ${segment.type.toUpperCase()} SEGMENT (${segment.content})`);
      } else if (segment.hasAutoColorize) {
        const colorMap = {
          ember: 'RED (255,0,0,0.2)',
          narrator: 'BLUE (0,0,255,0.2)', 
          contributor: 'GREEN (0,255,0,0.2)'
        };
        console.log(`  ${index + 1}. [${segment.voiceTag}] → ${colorMap[segment.type]}`);
      }
    });
    
    // Remove exact duplicates
    const uniqueSegments = [];
    const seenSegments = new Set();
    
    console.log('🔄 Removing duplicates from', segments.length, 'segments...');
    
    segments.forEach((segment, index) => {
      const key = `${segment.type}-${segment.voiceTag}-${segment.content}`;
      console.log(`🔍 Checking segment ${index + 1}: Key="${key.substring(0, 50)}..."`);
      
      if (seenSegments.has(key)) {
        console.warn('⚠️ Removing duplicate segment:', { 
          index: index + 1,
          key: key.substring(0, 100),
          segment: `${(segment.type === 'media' || segment.type === 'hold') ? '[[' + segment.voiceTag + ']]' : '[' + segment.voiceTag + ']'} ${segment.content.substring(0, 50)}...`
        });
      } else {
        seenSegments.add(key);
        uniqueSegments.push(segment);
        console.log(`  ✅ Kept segment ${index + 1}: ${(segment.type === 'media' || segment.type === 'hold') ? '[[' + segment.voiceTag + ']]' : '[' + segment.voiceTag + ']'} "${segment.content.substring(0, 50)}..."`);
      }
    });
    
    console.log(`📝 Removed ${segments.length - uniqueSegments.length} duplicate segments`);
    console.log('📝 Final unique segments order:');
    uniqueSegments.forEach((segment, index) => {
      console.log(`  ${index + 1}. ${(segment.type === 'media' || segment.type === 'hold') ? '[[' + segment.voiceTag + ']]' : '[' + segment.voiceTag + ']'} "${segment.content.substring(0, 30)}..."`);
    });
    
    // 🚨 CRITICAL DEBUG: Count HOLD segments specifically
    const holdSegments = uniqueSegments.filter(seg => seg.type === 'hold');
    console.log(`🚨 HOLD SEGMENTS COUNT: ${holdSegments.length}`);
    holdSegments.forEach((holdSeg, index) => {
      console.log(`  🚨 HOLD ${index + 1}: "${holdSeg.content}" (type: ${holdSeg.type}, voiceTag: ${holdSeg.voiceTag})`);
    });
    
    return uniqueSegments;
  };

  // Parse text into sentences for synchronized display (Option 1B)
  const parseSentences = (text) => {
    if (!text) return [];
    
    // Split by sentence-ending punctuation, keeping the punctuation
    const sentences = text.split(/([.!?]+)/).filter(s => s.trim()).reduce((acc, part, index, array) => {
      if (index % 2 === 0) {
        // This is the text part
        const nextPart = array[index + 1];
        const sentence = nextPart ? part + nextPart : part;
        if (sentence.trim()) {
          acc.push(sentence.trim());
        }
      }
      return acc;
    }, []);
    
    // If no sentences found, return the whole text as one sentence
    if (sentences.length === 0) {
      return [text.trim()];
    }
    
    return sentences;
  };

  // Estimate timing for sentence display within an audio segment
  const estimateSentenceTimings = (sentences, totalDuration) => {
    if (!sentences || sentences.length === 0) return [];
    
    // Simple estimation: divide time proportionally by sentence length
    const totalCharacters = sentences.reduce((sum, sentence) => sum + sentence.length, 0);
    let accumulatedTime = 0;
    
    return sentences.map((sentence, index) => {
      const sentenceWeight = sentence.length / totalCharacters;
      const sentenceStartTime = accumulatedTime;
      const sentenceDuration = totalDuration * sentenceWeight;
      
      accumulatedTime += sentenceDuration;
      
      return {
        sentence,
        startTime: sentenceStartTime,
        duration: sentenceDuration,
        index
      };
    });
  };
  
  // Determine voice type for segment
  const getVoiceType = (voiceTag) => {
    if (voiceTag === 'EMBER VOICE') return 'ember';
    if (voiceTag === 'NARRATOR') return 'narrator';
    return 'contributor'; // Everything else is a contributor (user name)
  };

  // Helper function to extract HEX color from COLOR action
  const extractColorFromAction = (action) => {
    // Support both old format (color=#FF0000) and new format (:FF0000)
    const colorMatch = action.match(/(?:color=|:)#([A-Fa-f0-9]{3,6})/);
    if (colorMatch) {
      const hex = colorMatch[1];
      // Convert 3-digit to 6-digit hex if needed
      if (hex.length === 3) {
        return `#${hex.split('').map(char => char + char).join('')}`;
      }
      return `#${hex}`;
    }
    return null;
  };

  // Helper function to extract transparency value from TRAN action
  const extractTransparencyFromAction = (action) => {
    const transparencyMatch = action.match(/TRAN:([0-9.]+)/);
    if (transparencyMatch) {
      const value = parseFloat(transparencyMatch[1]);
      // Clamp between 0 and 1
      return Math.max(0, Math.min(1, value));
    }
    return 0.2; // Default transparency
  };

  // Helper function to extract scale values from Z-OUT action
  const extractZoomScaleFromAction = (action) => {
    const scaleMatch = action.match(/scale=([0-9.]+)/);
    if (scaleMatch) {
      const endScale = parseFloat(scaleMatch[1]);
      // Start scale is typically larger for zoom-in effect (reverse of zoom-out)
      // If script specifies scale=0.7, we zoom FROM larger TO 0.7
      const startScale = Math.max(1.2, endScale * 2.0); // More dramatic zoom effect
      return { start: startScale, end: endScale };
    }
    // Default zoom: subtle zoom-in effect (no zoom out)
    return { start: 1.1, end: 1.0 };
  };

  /**
   * Resolve media reference to actual file URL
   * @param {Object} segment - Media segment with mediaId or mediaName
   * @param {string} emberId - Current ember ID for scoping
   * @returns {Promise<string|null>} - Resolved media URL or null if not found
   */
  const resolveMediaReference = async (segment, emberId) => {
    if (!segment || (!segment.mediaId && !segment.mediaName)) {
      console.log('⚠️ No media reference to resolve');
      return null;
    }

    try {
      // Get all available media for this ember
      const [emberPhotos, supportingMedia] = await Promise.all([
        getEmberPhotos(emberId),
        getEmberSupportingMedia(emberId)
      ]);

      console.log(`🔍 Resolving media reference: ${segment.mediaId || segment.mediaName}`);
      console.log(`📸 Available photos: ${emberPhotos.length}`);
      console.log(`📁 Available supporting media: ${supportingMedia.length}`);

      // Search by ID first (more specific)
      if (segment.mediaId) {
        // Check ember photos
        const photoMatch = emberPhotos.find(photo => photo.id === segment.mediaId);
        if (photoMatch) {
          console.log(`✅ Found photo by ID: ${photoMatch.display_name || photoMatch.original_filename}`);
          return photoMatch.storage_url;
        }

        // Check supporting media
        const mediaMatch = supportingMedia.find(media => media.id === segment.mediaId);
        if (mediaMatch) {
          console.log(`✅ Found supporting media by ID: ${mediaMatch.display_name || mediaMatch.file_name}`);
          return mediaMatch.file_url;
        }

        // Legacy: treat mediaId as direct URL if no match found
        console.log(`ℹ️ No ID match found, treating as legacy reference: ${segment.mediaId}`);
        return segment.mediaId;
      }

      // Search by display name
      if (segment.mediaName) {
        // Check ember photos
        const photoMatch = emberPhotos.find(photo => 
          photo.display_name === segment.mediaName || 
          photo.original_filename === segment.mediaName
        );
        if (photoMatch) {
          console.log(`✅ Found photo by name: ${photoMatch.display_name || photoMatch.original_filename}`);
          return photoMatch.storage_url;
        }

        // Check supporting media
        const mediaMatch = supportingMedia.find(media => 
          media.display_name === segment.mediaName || 
          media.file_name === segment.mediaName
        );
        if (mediaMatch) {
          console.log(`✅ Found supporting media by name: ${mediaMatch.display_name || mediaMatch.file_name}`);
          return mediaMatch.file_url;
        }

        console.log(`⚠️ No media found with name: ${segment.mediaName}`);
        return null;
      }

      return null;
    } catch (error) {
      console.error('❌ Error resolving media reference:', error);
      return null;
    }
  };

  // Helper function to estimate segment duration
  const estimateSegmentDuration = (content, segmentType) => {
    // For media and hold segments, prioritize explicit duration from visual actions
    if (segmentType === 'media' || segmentType === 'hold') {
      // Extract duration from any visual action that has it
      const durationMatch = content.match(/duration=([0-9.]+)/);
      if (durationMatch) {
        return parseFloat(durationMatch[1]).toFixed(2);
      }
      
      // Different defaults for media vs hold
      if (segmentType === 'hold') {
        return "3.00"; // Hold segments default to 3 seconds
      } else {
        return "2.00"; // Media segments default to 2 seconds
      }
    }
    
    // For voice segments, estimate by text length (remove visual actions first)
    const cleanContent = content.replace(/<[^>]+>/g, '').trim();
    const estimatedDuration = Math.max(1, cleanContent.length * 0.08);
    return estimatedDuration.toFixed(2);
  };

  // Parse original script format where voice segments are in one continuous string
  const parseOriginalScriptFormat = (script) => {
    if (!script) return [];
    
    const segments = [];
    
    // Split by voice tags - handle both bracketed formats
    const voiceTagRegex = /\[([^\]]+)\]/g;
    let lastIndex = 0;
    let match;
    let currentVoiceTag = null;
    
    while ((match = voiceTagRegex.exec(script)) !== null) {
      // If we have a previous voice tag, process the content before this match
      if (currentVoiceTag) {
        const content = script.slice(lastIndex, match.index).trim();
        if (content) {
          const voiceType = getVoiceType(currentVoiceTag);
          
          // Add default colorization based on voice type
          let colorizeAction = '';
          switch (voiceType) {
            case 'ember':
              colorizeAction = '<COLOR:#FF0000,TRAN:0.2>';
              break;
            case 'narrator':
              colorizeAction = '<COLOR:#0000FF,TRAN:0.2>';
              break;
            case 'contributor':
              colorizeAction = '<COLOR:#00FF00,TRAN:0.2>';
              break;
          }
          
          segments.push({
            voiceTag: currentVoiceTag,
            content: `${colorizeAction} ${content}`.trim(),
            originalContent: content,
            type: voiceType,
            visualActions: [],
            hasAutoColorize: true
          });
        }
      }
      
      // Update for next iteration
      currentVoiceTag = match[1];
      lastIndex = match.index + match[0].length;
    }
    
    // Process the last segment after the final voice tag
    if (currentVoiceTag) {
      const content = script.slice(lastIndex).trim();
      if (content) {
        const voiceType = getVoiceType(currentVoiceTag);
        
        // Add default colorization based on voice type
        let colorizeAction = '';
        switch (voiceType) {
          case 'ember':
            colorizeAction = '<COLOR:#FF0000,TRAN:0.2>';
            break;
          case 'narrator':
            colorizeAction = '<COLOR:#0000FF,TRAN:0.2>';
            break;
          case 'contributor':
            colorizeAction = '<COLOR:#00FF00,TRAN:0.2>';
            break;
        }
        
        segments.push({
          voiceTag: currentVoiceTag,
          content: `${colorizeAction} ${content}`.trim(),
          originalContent: content,
          type: voiceType,
          visualActions: [],
          hasAutoColorize: true
        });
      }
    }
    
    console.log('📝 Parsed original script format:', segments.length, 'segments');
    segments.forEach((segment, index) => {
      console.log(`  ${index + 1}. [${segment.voiceTag}] → "${segment.originalContent.substring(0, 50)}..."`);
    });
    
    return segments;
  };

  // Generate enhanced script with current playback behavior as explicit MEDIA lines
  const generateEnhancedScript = (originalScript, ember, storyCut) => {
    if (!originalScript) return '';
    
    // For original scripts that don't have proper line breaks, we need to parse them differently
    let segments;
    if (originalScript.includes('[[MEDIA]]')) {
      // Script already has MEDIA lines, use normal parsing
      console.log('📝 Using standard parsing for script with MEDIA lines');
      segments = parseScriptSegments(originalScript);
    } else {
      // Original format script - needs special parsing to separate voice segments
      console.log('📝 Using original format parsing for script without MEDIA lines');
      console.log('📝 Original script preview:', originalScript.substring(0, 200) + '...');
      segments = parseOriginalScriptFormat(originalScript);
    }
    
    const enhancedSegments = [];
    
    // Calculate total story duration from voice segments
    let totalVoiceDuration = 0;
    segments.forEach(segment => {
      if (segment.type !== 'media' && segment.type !== 'hold') {
        totalVoiceDuration += parseFloat(estimateSegmentDuration(segment.content, segment.type));
      }
    });
    
    // 1. Add opening black screen (current loading behavior)
    enhancedSegments.push({
      voiceTag: 'HOLD',
      content: '<COLOR:#000000,duration=2.0>',
      type: 'hold',
      duration: '2.00'
    });
    
    // 2. Add ember image with zoom out (current main playback behavior)
    const emberId = ember?.id || 'current';
    enhancedSegments.push({
      voiceTag: 'MEDIA', 
      content: `id=${emberId} <Z-OUT:scale=0.7,duration=${totalVoiceDuration.toFixed(2)}>`,
      type: 'media',
      duration: totalVoiceDuration.toFixed(2)
    });
    
    // 3. Add all voice segments
    segments.forEach(segment => {
      if (segment.type !== 'media' && segment.type !== 'hold') {
        enhancedSegments.push(segment);
      }
    });
    
    // 4. Add ending black screen (current fade-out + hold behavior)
    enhancedSegments.push({
      voiceTag: 'HOLD',
      content: '<COLOR:#000000,duration=4.0>',
      type: 'hold', 
      duration: '4.00' // 3 seconds fade + 1 second hold
    });
    
    console.log('🔄 generateEnhancedScript: Final enhanced segments order:');
    enhancedSegments.forEach((segment, index) => {
      console.log(`  ${index + 1}. ${(segment.type === 'media' || segment.type === 'hold') ? '[[' + segment.voiceTag + ']]' : '[' + segment.voiceTag + ']'} "${segment.content.substring(0, 30)}..."`);
    });
    
    return enhancedSegments;
  };

  // Convert enhanced segments to editable script text
  const segmentsToScriptText = (segments) => {
    console.log('🔄 segmentsToScriptText: Converting', segments.length, 'segments to script text');
    segments.forEach((segment, index) => {
      console.log(`  ${index + 1}. ${(segment.type === 'media' || segment.type === 'hold') ? '[[' + segment.voiceTag + ']]' : '[' + segment.voiceTag + ']'} "${segment.content.substring(0, 50)}..."`);
    });
    
    const scriptText = segments.map(segment => {
      const { voiceTag, content, type } = segment;
      
      // Format media/hold lines with [[TYPE]] and voice lines with [VOICE]  
      const prefix = (type === 'media' || type === 'hold') ? `[[${voiceTag}]]` : `[${voiceTag}]`;
      
      return `${prefix} ${content}`;
    }).join('\n\n');
    
    console.log('📝 Generated script text preview:', scriptText.substring(0, 200) + '...');
    return scriptText;
  };

  // Get the script for editing (enhanced if original doesn't have MEDIA lines)
  const getEditableScript = (script, ember, storyCut, hasBeenEnhancedFlag = false) => {
    if (!script) return '';
    
    try {
      // Check if script already has MEDIA or HOLD lines
      const hasMediaLines = script.includes('[[MEDIA]]') || script.includes('[[HOLD]]');
      
      console.log('🔍 getEditableScript analysis:');
      console.log('  - Script length:', script.length);
      console.log('  - Has MEDIA lines:', script.includes('[[MEDIA]]'));
      console.log('  - Has HOLD lines:', script.includes('[[HOLD]]'));
      console.log('  - Has enhanced content:', hasMediaLines);
      console.log('  - Script preview:', script.substring(0, 100) + '...');
      console.log('  - Has been enhanced flag:', hasBeenEnhancedFlag);
      
      if (hasMediaLines) {
        // Use script as-is if it already has MEDIA or HOLD lines
        console.log('  - Decision: Using script as-is (already has enhanced content)');
        return script;
      } else {
        // Generate enhanced script with current behavior as explicit MEDIA lines
        console.log('  - Decision: Generating enhanced script (no enhanced content found)');
        const segments = generateEnhancedScript(script, ember, storyCut);
        const enhancedScript = segmentsToScriptText(segments);
        console.log('  - Enhanced script preview:', enhancedScript.substring(0, 100) + '...');
        
        return enhancedScript;
      }
    } catch (error) {
      console.error('❌ Error in getEditableScript:', error);
      console.log('🔄 Returning original script as fallback');
      return script;
    }
  };

  // Format script for display with visual actions and spacing
  const formatScriptForDisplay = async (script, ember, storyCut) => {
    if (!script) return '';
    
    console.log('🎨 formatScriptForDisplay called');
    console.log('🎨 Script preview (first 200 chars):', script.substring(0, 200));
    
    // Check if script already has MEDIA or HOLD lines
    const hasEnhancedContent = script.includes('[[MEDIA]]') || script.includes('[[HOLD]]');
    console.log('🎨 Script has MEDIA lines:', script.includes('[[MEDIA]]'));
    console.log('🎨 Script has HOLD lines:', script.includes('[[HOLD]]'));
    console.log('🎨 Script has enhanced content:', hasEnhancedContent);
    
    // Count MEDIA and HOLD lines
    const mediaLinesCount = (script.match(/\[\[MEDIA\]\]/g) || []).length;
    const holdLinesCount = (script.match(/\[\[HOLD\]\]/g) || []).length;
    console.log('🎨 Number of MEDIA lines in script:', mediaLinesCount);
    console.log('🎨 Number of HOLD lines in script:', holdLinesCount);
    
    let segments;
    if (hasEnhancedContent) {
      // Use script as-is if it already has MEDIA or HOLD lines - parse directly without enhancement
      console.log('📝 Using existing script with enhanced content, parsing directly...');
      segments = parseScriptSegments(script);
      console.log('📝 Parsed segments from existing script:', segments.length);
    } else {
      // Generate enhanced script with current behavior as explicit MEDIA lines
      console.log('📝 Script has no enhanced content, enhancing...');
      segments = generateEnhancedScript(script, ember, storyCut);
      console.log('📝 Generated enhanced segments:', segments.length);
    }
    
    // 🚨 CRITICAL DEBUG: Check HOLD segments before display formatting
    const holdSegmentsForDisplay = segments.filter(seg => seg.type === 'hold');
    console.log('🚨 HOLD SEGMENTS FOR DISPLAY:', holdSegmentsForDisplay.length);
    holdSegmentsForDisplay.forEach((holdSeg, index) => {
      console.log(`  🚨 DISPLAY HOLD ${index + 1}: "${holdSeg.content}" (type: ${holdSeg.type})`);
    });

    // Get all media for this ember to resolve display names
    const [emberPhotos, supportingMedia] = await Promise.all([
      getEmberPhotos(ember.id),
      getEmberSupportingMedia(ember.id)
    ]);

    const resolveMediaDisplayName = (segment) => {
      if (segment.type !== 'media') return segment.content;
      
      console.log('🔍 Resolving display name for segment:', {
        mediaId: segment.mediaId,
        mediaName: segment.mediaName,
        content: segment.content,
        availablePhotos: emberPhotos.length,
        availableSupportingMedia: supportingMedia.length
      });
      
      // Look up display name for media segments
      if (segment.mediaId) {
        console.log(`🔍 Searching for media ID: ${segment.mediaId}`);
        
        // Search by ID first
        const photoMatch = emberPhotos.find(photo => photo.id === segment.mediaId);
        if (photoMatch) {
          const displayName = photoMatch.display_name || photoMatch.original_filename;
          console.log(`✅ Found photo match: ${displayName}`);
          return segment.content.replace(/id=[a-zA-Z0-9\-_]+/, `name="${displayName}"`);
        }
        
        const mediaMatch = supportingMedia.find(media => media.id === segment.mediaId);
        if (mediaMatch) {
          const displayName = mediaMatch.display_name || mediaMatch.file_name;
          console.log(`✅ Found supporting media match: ${displayName}`);
          return segment.content.replace(/id=[a-zA-Z0-9\-_]+/, `name="${displayName}"`);
        }
        
        console.log(`❌ No match found for media ID: ${segment.mediaId}`);
        console.log('Available photo IDs:', emberPhotos.map(p => p.id));
        console.log('Available media IDs:', supportingMedia.map(m => m.id));
      }
      
      // If no match found or already has name format, return as-is
      return segment.content;
    };

    const displaySegments = segments.map((segment, index) => {
      const { voiceTag, content, type, duration } = segment;
      const calculatedDuration = duration || estimateSegmentDuration(content, type);
      
      // For media segments, replace ID with display name
      const displayContent = resolveMediaDisplayName(segment);
      
      // Format media/hold lines with [[TYPE]] and voice lines with [VOICE]
      const prefix = (type === 'media' || type === 'hold') ? `[[${voiceTag}]]` : `[${voiceTag}]`;
      
      const displayLine = `${prefix} ${displayContent} (${calculatedDuration})`;
      console.log(`📝 Display segment ${index + 1}: "${displayLine}"`);
      
      // 🚨 CRITICAL DEBUG: Special logging for HOLD segments
      if (type === 'hold') {
        console.log(`🚨 FORMATTING HOLD SEGMENT: "${displayLine}"`);
      }
      
      // Add double line breaks between segments for spacing
      return displayLine;
    });

    return displaySegments.join('\n\n');
  };

  // 🐛 DEBUG HELPER: Inspect recorded audio data
  const debugRecordedAudio = (recordedAudio, scriptSegments) => {
    console.log('🐛 ===== RECORDED AUDIO DEBUG REPORT =====');
    console.log('🎙️ Available recorded audio:');
    Object.entries(recordedAudio).forEach(([userId, audioData]) => {
      console.log(`  📤 User ${userId}:`);
      console.log(`    - Name: "${audioData.user_first_name}"`);
      console.log(`    - Message: "${audioData.message_content}"`);
      console.log(`    - Audio URL: ${audioData.audio_url ? '✅ EXISTS' : '❌ MISSING'}`);
      console.log(`    - Duration: ${audioData.audio_duration_seconds}s`);
    });
    
    console.log('\n📝 Script segments requiring recorded audio:');
    scriptSegments.filter(seg => seg.type === 'contributor').forEach((segment, index) => {
      console.log(`  📋 Segment ${index + 1}:`);
      console.log(`    - Voice Tag: "${segment.voiceTag}"`);
      console.log(`    - Content: "${segment.content}"`);
      console.log(`    - Type: ${segment.type}`);
      
      // Check for matches
      const matches = Object.entries(recordedAudio).filter(([userId, audioData]) => {
        const nameMatches = audioData.user_first_name === segment.voiceTag;
        const recordedContent = audioData.message_content?.toLowerCase() || '';
        const segmentContent = segment.content.toLowerCase();
        const contentMatches = recordedContent === segmentContent || 
                             recordedContent.includes(segmentContent) ||
                             segmentContent.includes(recordedContent);
        return nameMatches && contentMatches;
      });
      
      if (matches.length > 0) {
        console.log(`    - 🎙️ MATCH FOUND: User ${matches[0][0]} (${matches[0][1].user_first_name})`);
      } else {
        console.log(`    - ❌ NO MATCH`);
        console.log(`    - Available names: ${Object.values(recordedAudio).map(a => a.user_first_name).join(', ')}`);
        
        // Check for personal voice model as fallback
        const nameMatches = Object.entries(recordedAudio).filter(([userId, audioData]) => {
          return audioData.user_first_name === segment.voiceTag;
        });
        
        if (nameMatches.length > 0) {
          const [userId] = nameMatches[0];
          getUserVoiceModel(userId).then(voiceModel => {
            if (voiceModel && voiceModel.elevenlabs_voice_id) {
              console.log(`    - 🎤 Personal Voice Model Available: ${voiceModel.elevenlabs_voice_name}`);
            } else {
              console.log(`    - 🎤 No personal voice model available`);
            }
          }).catch(err => {
            console.log(`    - ⚠️ Error checking voice model: ${err.message}`);
          });
        }
      }
    });
    console.log('🐛 ===== END DEBUG REPORT =====');
  };

  // Generate audio for a single voice segment
  const generateSegmentAudio = async (segment, storyCut, recordedAudio) => {
    const { voiceTag, content, originalContent, type } = segment;
    
    // Use originalContent for audio synthesis, content for display/matching
    const rawAudioContent = originalContent || content;
    
    // Clean content for TTS: remove visual actions and voice tags
    const audioContent = rawAudioContent
      .replace(/<[^>]+>/g, '') // Remove visual actions like <COLOR:#FF0000,TRAN:0.2>
      .replace(/^\[.*?\]\s*/, '') // Remove voice tags like [NARRATOR] or [EMBER VOICE]
      .trim();
    
    console.log(`🎵 Generating audio for [${voiceTag}]: "${audioContent.substring(0, 50)}..."`);
    console.log(`🔍 Segment type: ${type}`);
    console.log(`🎨 Full content with visual actions: "${content}"`);
    console.log(`🎙️ Audio content (no visual actions): "${audioContent}"`);
    
    // 🐛 ENHANCED DEBUG: Log all available recorded audio
    console.log('🐛 DEBUG - All recorded audio available:');
    Object.entries(recordedAudio).forEach(([userId, audioData]) => {
      console.log(`  - User ${userId} (${audioData.user_first_name}): "${audioData.message_content?.substring(0, 50)}..."`);
      console.log(`    Audio URL: ${audioData.audio_url ? 'EXISTS' : 'MISSING'}`);
    });
    
    try {
      if (type === 'contributor') {
        console.log(`🐛 DEBUG - Looking for recorded audio for contributor: ${voiceTag}`);
        console.log(`🐛 DEBUG - Script content: "${audioContent}"`);
        
        // Check per-message preference for this content
        let userPreference = 'recorded'; // default
        
        // Look for matching message preference - try multiple matching strategies
        if (window.messageAudioPreferences) {
          // Strategy 1: Try to find exact content match
          const matchingKey = Object.keys(window.messageAudioPreferences).find(key => {
            const keyContent = key.split('-').slice(1).join('-'); // Remove messageIndex prefix
            return keyContent === audioContent.substring(0, 50) || audioContent.includes(keyContent);
          });
          
          if (matchingKey) {
            userPreference = window.messageAudioPreferences[matchingKey];
            console.log(`🎯 Found preference match: "${matchingKey}" → ${userPreference}`);
          } else {
            // Strategy 2: Try partial content matching
            const partialMatch = Object.keys(window.messageAudioPreferences).find(key => {
              const keyContent = key.split('-').slice(1).join('-');
              return keyContent.length > 10 && audioContent.includes(keyContent);
            });
            
            if (partialMatch) {
              userPreference = window.messageAudioPreferences[partialMatch];
              console.log(`🎯 Found partial preference match: "${partialMatch}" → ${userPreference}`);
            } else {
              console.log(`⚠️ No preference match found for content: "${audioContent.substring(0, 50)}..."`);
              console.log(`⚠️ Available preferences:`, Object.keys(window.messageAudioPreferences));
            }
          }
        }
        
        console.log(`🎤 User preference for "${audioContent.substring(0, 30)}...": ${userPreference}`);
        console.log(`🔍 All available preferences:`, window.messageAudioPreferences);
        
        // Find the user ID by matching the voice tag (first name) with recorded audio data
        const matchingUserId = Object.entries(recordedAudio).find(([userId, audioData]) => {
          return audioData.user_first_name === voiceTag;
        });
        
        if (!matchingUserId) {
          console.log(`🔍 Could not find user ID for voice tag: ${voiceTag}`);
          // Jump to final fallback
        } else {
          const [userId, audioData] = matchingUserId;
          console.log(`🔍 Found user ID for ${voiceTag}: ${userId}`);
          
          // Check for recorded audio match
          const hasRecordedAudio = (() => {
            const recordedContent = audioData.message_content?.toLowerCase() || '';
            const segmentContent = audioContent.toLowerCase();
            
            console.log(`  - Recorded content: "${recordedContent}"`);
            console.log(`  - Segment content: "${segmentContent}"`);
            
            const exactMatch = recordedContent === segmentContent;
            const recordedContainsSegment = recordedContent.includes(segmentContent);
            const segmentContainsRecorded = segmentContent.includes(recordedContent);
            
            console.log(`  - Exact match: ${exactMatch}`);
            console.log(`  - Recorded contains segment: ${recordedContainsSegment}`);
            console.log(`  - Segment contains recorded: ${segmentContainsRecorded}`);
            
            const contentMatches = exactMatch || recordedContainsSegment || segmentContainsRecorded;
            console.log(`  - Content match result: ${contentMatches}`);
            
            return contentMatches && audioData.audio_url;
          })();
          
          // Check for personal voice model
          let userVoiceModel = null;
          try {
            console.log(`🔍 Fetching voice model for ${voiceTag} (userId: ${userId})...`);
            userVoiceModel = await getUserVoiceModel(userId);
            console.log(`✅ Voice model result for ${voiceTag}:`, userVoiceModel);
          } catch (error) {
            console.log(`⚠️ Error fetching voice model for ${voiceTag}:`, error.message);
          }
          
          const hasPersonalVoice = userVoiceModel && userVoiceModel.elevenlabs_voice_id;
          
          console.log(`🎤 ${voiceTag} audio options:`);
          console.log(`  - Recorded audio: ${hasRecordedAudio ? '✅' : '❌'}`);
          console.log(`  - Personal voice: ${hasPersonalVoice ? '✅' : '❌'} ${hasPersonalVoice ? `(${userVoiceModel.elevenlabs_voice_name})` : ''}`);
          console.log(`  - User preference: ${userPreference}`);
          console.log(`  - User ID: ${userId}`);
          console.log(`  - Voice model data:`, userVoiceModel);
          
          // Decide which audio to use based on availability and preference
          if (userPreference === 'text') {
            // User wants basic text response - use narrator or ember voice for basic TTS
            console.log(`📝 ✅ Using basic text response for ${voiceTag}`);
            
            let fallbackVoiceId = null;
            let fallbackVoiceName = null;
            
            if (storyCut.narrator_voice_id) {
              fallbackVoiceId = storyCut.narrator_voice_id;
              fallbackVoiceName = 'narrator';
              console.log(`🎤 Using narrator voice for text response`);
            } else if (storyCut.ember_voice_id) {
              fallbackVoiceId = storyCut.ember_voice_id;
              fallbackVoiceName = 'ember';
              console.log(`🎤 Using ember voice for text response`);
            } else {
              throw new Error(`No voice available for text response from ${voiceTag}`);
            }
            
            // Use attribution style with fallback voice
            const narratedContent = `${voiceTag} said, "${audioContent}"`;
            const audioBlob = await textToSpeech(narratedContent, fallbackVoiceId);
            const audioUrl = URL.createObjectURL(audioBlob);
            const audio = new Audio(audioUrl);
            
            return {
              type: 'text_response',
              audio,
              url: audioUrl,
              blob: audioBlob,
              voiceTag,
              content: narratedContent,
              fallbackVoice: fallbackVoiceName
            };
          } else if (userPreference === 'personal' && hasPersonalVoice) {
            // User wants personal voice model and it's available
            console.log(`🎙️ ✅ Using personal voice model for ${voiceTag} (user preference)`);
            console.log(`🎤 Personal voice ID: ${userVoiceModel.elevenlabs_voice_id}`);
            
            // Use the original transcribed text if this is a recorded message, otherwise use script content
            const textToSynthesize = hasRecordedAudio && audioData.message_content 
              ? audioData.message_content 
              : audioContent;
              
            console.log(`📝 Synthesizing text: "${textToSynthesize.substring(0, 50)}..." (${hasRecordedAudio ? 'from recording' : 'from script'})`);
            
            const audioBlob = await textToSpeech(textToSynthesize, userVoiceModel.elevenlabs_voice_id);
            const audioUrl = URL.createObjectURL(audioBlob);
            const audio = new Audio(audioUrl);
            
            return {
              type: 'personal_voice_model',
              audio,
              url: audioUrl,
              blob: audioBlob,
              voiceTag,
              content: textToSynthesize,
              originalContent: audioContent,
              personalVoice: userVoiceModel.elevenlabs_voice_name,
              sourceType: hasRecordedAudio ? 'transcription' : 'script'
            };
          } else if (userPreference === 'recorded' && hasRecordedAudio) {
            // User wants recorded audio and it's available
            console.log(`🎙️ ✅ Using recorded audio for ${voiceTag} (user preference)`);
            console.log(`🔗 Matched with recorded: "${audioData.message_content}"`);
            console.log(`🔗 Audio URL:`, audioData.audio_url);
            
            const audio = new Audio(audioData.audio_url);
            return {
              type: 'recorded',
              audio,
              url: audioData.audio_url,
              voiceTag,
              content
            };
          } else if (userPreference === 'recorded' && hasRecordedAudio) {
            // User wants recorded audio and it's available
            console.log(`🎙️ ✅ Using recorded audio for ${voiceTag} (user preference)`);
            console.log(`🔗 Matched with recorded: "${audioData.message_content}"`);
            console.log(`🔗 Audio URL:`, audioData.audio_url);
            
            const audio = new Audio(audioData.audio_url);
            return {
              type: 'recorded',
              audio,
              url: audioData.audio_url,
              voiceTag,
              content
            };
          } else if (userPreference === 'recorded' && !hasRecordedAudio) {
            // User wants "recorded" but no recorded audio exists - fallback to text response
            console.log(`⚠️ User wanted recorded audio but none available for ${voiceTag} - falling back to text response`);
            
            let fallbackVoiceId = null;
            let fallbackVoiceName = null;
            
            // For TEXT RESPONSE fallback, ALWAYS use narrator/ember voice, never contributor's personal voice
            if (storyCut.narrator_voice_id) {
              fallbackVoiceId = storyCut.narrator_voice_id;
              fallbackVoiceName = 'narrator';
              console.log(`🎤 Using narrator voice for attribution fallback`);
            } else if (storyCut.ember_voice_id) {
              fallbackVoiceId = storyCut.ember_voice_id;
              fallbackVoiceName = 'ember';
              console.log(`🎤 Using ember voice for attribution fallback`);
            } else {
              throw new Error(`No voice available for fallback attribution from ${voiceTag}`);
            }
            
            const narratedContent = `${voiceTag} said, "${content}"`;
            const audioBlob = await textToSpeech(narratedContent, fallbackVoiceId);
            const audioUrl = URL.createObjectURL(audioBlob);
            const audio = new Audio(audioUrl);
            
            return {
              type: 'attribution_fallback',
              audio,
              url: audioUrl,
              blob: audioBlob,
              voiceTag,
              content: narratedContent,
              fallbackVoice: fallbackVoiceName
            };
          } else if (userPreference === 'personal' && !hasPersonalVoice) {
            // User wants personal voice but none available - fallback to text response
            console.log(`⚠️ User wanted personal voice but none available for ${voiceTag} - falling back to text response`);
            console.log(`⚠️ Voice model check failed:`, {
              userId,
              userVoiceModel,
              hasPersonalVoice,
              elevenlabs_voice_id: userVoiceModel?.elevenlabs_voice_id
            });
            
            let fallbackVoiceId = null;
            let fallbackVoiceName = null;
            
            if (storyCut.narrator_voice_id) {
              fallbackVoiceId = storyCut.narrator_voice_id;
              fallbackVoiceName = 'narrator';
              console.log(`🎤 Using narrator voice for text response fallback`);
            } else if (storyCut.ember_voice_id) {
              fallbackVoiceId = storyCut.ember_voice_id;
              fallbackVoiceName = 'ember';
              console.log(`🎤 Using ember voice for text response fallback`);
            } else {
              throw new Error(`No voice available for text response fallback from ${voiceTag}`);
            }
            
            const narratedContent = `${voiceTag} said, "${content}"`;
            const audioBlob = await textToSpeech(narratedContent, fallbackVoiceId);
            const audioUrl = URL.createObjectURL(audioBlob);
            const audio = new Audio(audioUrl);
            
            return {
              type: 'text_response_fallback',
              audio,
              url: audioUrl,
              blob: audioBlob,
              voiceTag,
              content: narratedContent,
              fallbackVoice: fallbackVoiceName
            };
          } else {
            // Final fallback - respect user preference even when falling back
            console.log(`🔄 Using final fallback logic for ${voiceTag}, preference: ${userPreference}`);
            
            if (userPreference === 'text') {
              // User wants text response - ALWAYS use narrator/ember voice with attribution
              console.log(`📝 ✅ Using text response (final fallback, user preference)`);
              
              let fallbackVoiceId = null;
              let fallbackVoiceName = null;
              
              if (storyCut.narrator_voice_id) {
                fallbackVoiceId = storyCut.narrator_voice_id;
                fallbackVoiceName = 'narrator';
              } else if (storyCut.ember_voice_id) {
                fallbackVoiceId = storyCut.ember_voice_id;
                fallbackVoiceName = 'ember';
              } else {
                throw new Error(`No voice available for text response fallback from ${voiceTag}`);
              }
              
              const narratedContent = `${voiceTag} said, "${content}"`;
              const audioBlob = await textToSpeech(narratedContent, fallbackVoiceId);
              const audioUrl = URL.createObjectURL(audioBlob);
              const audio = new Audio(audioUrl);
              
              return {
                type: 'text_response',
                audio,
                url: audioUrl,
                blob: audioBlob,
                voiceTag,
                content: narratedContent,
                fallbackVoice: fallbackVoiceName
              };
            } else if (userPreference === 'recorded' && hasRecordedAudio) {
              console.log(`🎙️ ✅ Using recorded audio (final fallback)`);
              const audio = new Audio(audioData.audio_url);
              return {
                type: 'recorded',
                audio,
                url: audioData.audio_url,
                voiceTag,
                content
              };
            } else if (userPreference === 'personal' && hasPersonalVoice) {
              console.log(`🎤 ✅ Using personal voice model (final fallback)`);
              
              // Use the original transcribed text if this is a recorded message, otherwise use script content
              const textToSynthesize = hasRecordedAudio && audioData.message_content 
                ? audioData.message_content 
                : content;
                
              console.log(`📝 Synthesizing text (final fallback): "${textToSynthesize.substring(0, 50)}..." (${hasRecordedAudio ? 'from recording' : 'from script'})`);
              
              const audioBlob = await textToSpeech(textToSynthesize, userVoiceModel.elevenlabs_voice_id);
              const audioUrl = URL.createObjectURL(audioBlob);
              const audio = new Audio(audioUrl);
              
              return {
                type: 'personal_voice_model',
                audio,
                url: audioUrl,
                blob: audioBlob,
                voiceTag,
                content: textToSynthesize,
                originalContent: content,
                personalVoice: userVoiceModel.elevenlabs_voice_name,
                sourceType: hasRecordedAudio ? 'transcription' : 'script'
              };
            } else {
              // Ultimate fallback when preference can't be satisfied - use narrator/ember voice
              console.log(`📝 ✅ Using text response (ultimate fallback - preference not available)`);
              
              let fallbackVoiceId = null;
              let fallbackVoiceName = null;
              
              if (storyCut.narrator_voice_id) {
                fallbackVoiceId = storyCut.narrator_voice_id;
                fallbackVoiceName = 'narrator';
              } else if (storyCut.ember_voice_id) {
                fallbackVoiceId = storyCut.ember_voice_id;
                fallbackVoiceName = 'ember';
              } else {
                throw new Error(`No voice available for ultimate fallback from ${voiceTag}`);
              }
              
              const narratedContent = `${voiceTag} said, "${audioContent}"`;
              const audioBlob = await textToSpeech(narratedContent, fallbackVoiceId);
              const audioUrl = URL.createObjectURL(audioBlob);
              const audio = new Audio(audioUrl);
              
              return {
                type: 'text_response',
                audio,
                url: audioUrl,
                blob: audioBlob,
                voiceTag,
                content: narratedContent,
                fallbackVoice: fallbackVoiceName
              };
            }
          }
        }
        
        // Final fallback - use narrator/ember voice with attribution
        console.log(`🐛 DEBUG - Falling back to attribution for ${voiceTag}`);
        console.log(`🐛 DEBUG - Reasons for no match:`);
        console.log(`  - Available users: ${Object.keys(recordedAudio).map(userId => recordedAudio[userId].user_first_name).join(', ')}`);
        console.log(`  - Looking for: ${voiceTag}`);
        console.log(`  - Script content: "${audioContent}"`);
        
        // Try narrator first, then ember as fallback
        let fallbackVoiceId = null;
        let fallbackVoiceName = null;
        
        if (storyCut.narrator_voice_id) {
          fallbackVoiceId = storyCut.narrator_voice_id;
          fallbackVoiceName = 'narrator';
          console.log(`🎤 Using narrator voice to say "${voiceTag} said..."`);
        } else if (storyCut.ember_voice_id) {
          fallbackVoiceId = storyCut.ember_voice_id;
          fallbackVoiceName = 'ember';
          console.log(`🎤 Using ember voice to say "${voiceTag} said..." (narrator not available)`);
        } else {
          throw new Error(`No voice available to synthesize contributor quote from ${voiceTag}`);
        }
        
        // Format content with attribution using fallback voice
        const narratedContent = `${voiceTag} said, "${audioContent}"`;
        
        const audioBlob = await textToSpeech(narratedContent, fallbackVoiceId);
        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);
        
        return {
          type: 'synthesized',
          audio,
          url: audioUrl,
          blob: audioBlob,
          voiceTag,
          content: narratedContent,
          fallbackVoice: fallbackVoiceName
        };
      } else if (type === 'ember') {
        // Use ember voice
        console.log(`🌟 Using ember voice for: ${audioContent.substring(0, 30)}...`);
        console.log(`🎤 Ember voice ID:`, storyCut.ember_voice_id);
        
        if (!storyCut.ember_voice_id) {
          throw new Error(`Ember voice ID is missing: ${storyCut.ember_voice_id}`);
        }
        
        const audioBlob = await textToSpeech(audioContent, storyCut.ember_voice_id);
        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);
        
        return {
          type: 'synthesized',
          audio,
          url: audioUrl,
          blob: audioBlob,
          voiceTag,
          content: audioContent
        };
      } else if (type === 'narrator') {
        // Use narrator voice
        console.log(`📢 Using narrator voice for: ${audioContent.substring(0, 30)}...`);
        console.log(`🎤 Narrator voice ID:`, storyCut.narrator_voice_id);
        
        if (!storyCut.narrator_voice_id) {
          throw new Error(`Narrator voice ID is missing: ${storyCut.narrator_voice_id}`);
        }
        
        const audioBlob = await textToSpeech(audioContent, storyCut.narrator_voice_id);
        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);
        
        return {
          type: 'synthesized',
          audio,
          url: audioUrl,
          blob: audioBlob,
          voiceTag,
          content: audioContent
        };
      }
    } catch (error) {
      console.error(`❌ Error generating audio for ${voiceTag}:`, error);
      console.error(`❌ Error details:`, error.message);
      console.error(`❌ Story cut voice IDs:`, {
        ember: storyCut.ember_voice_id,
        narrator: storyCut.narrator_voice_id
      });
      throw error;
    }
  };

  // Play multiple audio segments sequentially
  const playMultiVoiceAudio = async (segments, storyCut, recordedAudio, stateSetters) => {
    const { 
      setIsGeneratingAudio, 
      setIsPlaying, 
      handleExitPlay, 
      handlePlaybackComplete, 
      setActiveAudioSegments, 
      playbackStoppedRef, 
      setCurrentVoiceType,
      setCurrentVoiceTransparency,
      setCurrentMediaColor,
      setCurrentZoomScale,
      // 🎯 Sentence-by-sentence display state setters
      setCurrentDisplayText,
      setCurrentVoiceTag,
      setCurrentSentenceIndex,
      setCurrentSegmentSentences,
      setSentenceTimeouts,
      sentenceTimeouts,
      // 🎯 Media timeout management
      setMediaTimeouts,
      mediaTimeouts,
      mediaTimeoutsRef
    } = stateSetters;
    
    console.log('🎭 Starting multi-voice playback with', segments.length, 'segments');
    
    // 🐛 DEBUG: Run debug helper to analyze recorded audio matching
    debugRecordedAudio(recordedAudio, segments);
    
    // Reset playback flag
    playbackStoppedRef.current = false;
    
    try {
      // Separate media/hold and voice segments for different processing
      const mediaSegments = segments.filter(segment => segment.type === 'media' || segment.type === 'hold');
      const voiceSegments = segments.filter(segment => segment.type !== 'media' && segment.type !== 'hold');
      console.log(`🎭 Segment breakdown: ${segments.length} total → ${mediaSegments.length} media/hold + ${voiceSegments.length} voice`);
      
      // Generate audio for voice segments only
      console.log('⏳ Generating audio for voice segments...');
      const audioSegments = [];
      for (let i = 0; i < voiceSegments.length; i++) {
        const segment = voiceSegments[i];
        console.log(`🔧 Generating segment ${i + 1}/${voiceSegments.length}: [${segment.voiceTag}] "${segment.originalContent || segment.content}"`);
        
        try {
          const audioSegment = await generateSegmentAudio(segment, storyCut, recordedAudio);
          audioSegments.push(audioSegment);
          console.log(`✅ Generated segment ${i + 1}: [${segment.voiceTag}]`);
        } catch (segmentError) {
          console.error(`❌ Failed to generate segment ${i + 1} [${segment.voiceTag}]:`, segmentError);
          console.error(`❌ Segment content: "${segment.originalContent || segment.content}"`);
          console.error(`❌ Segment type: ${segment.type}`);
          throw new Error(`Failed to generate audio for segment "${segment.voiceTag}": ${segmentError.message}`);
        }
      }
      
      // Create unified timeline with media effects and voice audio
      const timeline = [];
      let audioIndex = 0;
      
      console.log('🎬 Building unified timeline...');
      segments.forEach((segment, index) => {
        if (segment.type === 'hold') {
          // Hold segment - blocks timeline for set duration
          const duration = parseFloat(estimateSegmentDuration(segment.content, segment.type));
          timeline.push({
            type: 'hold',
            segment,
            duration,
            index
          });
          console.log(`⏸️ Timeline ${index + 1}: HOLD effect for ${duration}s - ${segment.content.substring(0, 50)}...`);
        } else if (segment.type === 'media') {
          // Media segment - background effect (non-blocking)
          console.log(`📺 Background ${index + 1}: MEDIA effect - ${segment.content.substring(0, 50)}...`);
          // Apply media effect immediately when building timeline
          // This will be handled separately in the background
        } else {
          // Voice segment - use generated audio
          if (audioIndex < audioSegments.length) {
            timeline.push({
              type: 'voice',
              segment,
              audio: audioSegments[audioIndex],
              index
            });
            console.log(`🎤 Timeline ${index + 1}: VOICE audio - [${segment.voiceTag}]`);
            audioIndex++;
          }
        }
      });
      
      console.log('✅ Generated', audioSegments.length, 'audio segments');
      console.log('🎬 Starting unified timeline playback...');
      console.log(`🎭 Timeline has ${timeline.length} steps (${mediaSegments.length} media + ${voiceSegments.length} voice)`);
      
      // Store audio segments in state for cleanup
      setActiveAudioSegments(audioSegments);
      
      // Switch from generating to playing state
      setIsGeneratingAudio(false);
      setIsPlaying(true);
      
      // Apply background media effects before starting timeline
      const mediaEffects = segments.filter(segment => segment.type === 'media');
      console.log(`🎭 Applying ${mediaEffects.length} background media effects...`);
      mediaEffects.forEach((segment, index) => {
        console.log(`📺 Background effect ${index + 1}: ${segment.content.substring(0, 50)}...`);
        
        // Apply media background effects based on content
        if (segment.content.includes('Z-OUT:')) {
          // Extract zoom scale values from Z-OUT command
          const zoomScale = extractZoomScaleFromAction(segment.content);
          console.log(`🎬 Background effect: Image zoom out - from ${zoomScale.start} to ${zoomScale.end}`);
          setCurrentZoomScale(zoomScale); // Apply dynamic zoom scale
        }
      });
      
      let currentTimelineIndex = 0;
      // Clear any existing media timeouts before starting new playback
      mediaTimeouts.forEach(timeoutId => clearTimeout(timeoutId));
      mediaTimeoutsRef.current.forEach(timeoutId => clearTimeout(timeoutId));
      setMediaTimeouts([]);
      mediaTimeoutsRef.current = [];
      
      const playNextTimelineStep = () => {
        if (playbackStoppedRef.current || currentTimelineIndex >= timeline.length) {
          // Clean up any remaining media timeouts
          console.log('🧹 Cleaning up', mediaTimeouts.length, 'media timeouts');
          mediaTimeouts.forEach(timeoutId => clearTimeout(timeoutId));
          mediaTimeoutsRef.current.forEach(timeoutId => clearTimeout(timeoutId));
          setMediaTimeouts([]);
          mediaTimeoutsRef.current = [];
          
          // All timeline steps finished or playback was stopped
          if (!playbackStoppedRef.current) {
            console.log('🎬 Timeline playback complete');
            // Clear any remaining visual effects
            setCurrentVoiceType(null);
            setCurrentVoiceTransparency(0.2); // Reset to default
            setCurrentMediaColor(null);
            setCurrentZoomScale({ start: 1.0, end: 1.0 }); // Reset to default
            handlePlaybackComplete();
          } else {
            console.log('🛑 Timeline playback stopped');
          }
          return;
        }
        
        const currentStep = timeline[currentTimelineIndex];
        console.log(`🎬 Timeline step ${currentTimelineIndex + 1}/${timeline.length}: ${currentStep.type} - ${currentStep.type === 'hold' ? `${currentStep.duration}s` : `[${currentStep.segment.voiceTag}]`}`);
        
        if (currentStep.type === 'hold') {
          // Hold step - apply visual effect and wait for duration
          const segment = currentStep.segment;
          const duration = currentStep.duration;
          
          console.log(`⏸️ Applying hold effect for ${duration}s: ${segment.content}`);
          
          // Apply visual effects based on content
          if (segment.content.includes('COLOR:#000000')) {
            console.log('🎬 Visual effect: Black screen');
            setCurrentVoiceType(null); // Clear any voice overlay
            setCurrentMediaColor('#000000'); // Set black color
          } else if (segment.content.includes('Z-OUT:')) {
            // Extract zoom scale values from Z-OUT command
            const zoomScale = extractZoomScaleFromAction(segment.content);
            console.log(`🎬 Visual effect: Image zoom out - from ${zoomScale.start} to ${zoomScale.end}`);
            setCurrentVoiceType(null); // Image display, no voice overlay
            setCurrentMediaColor(null); // Clear any color overlay
            setCurrentZoomScale(zoomScale); // Apply dynamic zoom scale
          } else if (segment.content.includes('COLOR:#')) {
            // Extract color from COLOR:#RRGGBB format
            const colorMatch = segment.content.match(/COLOR:#([0-9A-Fa-f]{6})/);
            if (colorMatch) {
              const colorValue = '#' + colorMatch[1];
              console.log(`🎬 Visual effect: Color overlay - ${colorValue}`);
              setCurrentVoiceType(null); // Clear any voice overlay
              setCurrentMediaColor(colorValue); // Set the extracted color
            }
          }
          
          // Wait for the specified duration, then continue to next step
          const timeoutId = setTimeout(() => {
            if (!playbackStoppedRef.current) {
              currentTimelineIndex++;
              playNextTimelineStep();
            }
          }, duration * 1000);
          
          // Track timeout for cleanup
          setMediaTimeouts(prev => [...prev, timeoutId]);
          mediaTimeoutsRef.current.push(timeoutId);
          
                 } else if (currentStep.type === 'voice') {
           // Voice step - play audio
           const audio = currentStep.audio.audio;
           const segment = currentStep.segment;
         
           console.log(`▶️ Playing voice segment: [${segment.voiceTag}]`);
          
          // Trigger visual effect based on voice type
          const segmentType = segment.type;
          
          // Extract transparency from segment content
          const transparency = extractTransparencyFromAction(segment.content);
          console.log(`🎬 Voice transparency: ${transparency}`);
          
          if (segmentType === 'ember') {
            console.log('🎬 Visual effect: Ember voice - applying red overlay');
            setCurrentVoiceType('ember');
            setCurrentVoiceTransparency(transparency);
            setCurrentMediaColor(null); // Clear any color overlay
          } else if (segmentType === 'narrator') {
            console.log('🎬 Visual effect: Narrator voice - applying blue overlay');
            setCurrentVoiceType('narrator');
            setCurrentVoiceTransparency(transparency);
            setCurrentMediaColor(null); // Clear any color overlay
          } else {
            console.log('🎬 Visual effect: Contributor voice - applying green overlay');
            setCurrentVoiceType('contributor');
            setCurrentVoiceTransparency(transparency);
            setCurrentMediaColor(null); // Clear any color overlay
          }

          // 🎯 Option 1B: Sentence-by-Sentence Text Display
          const currentSegmentData = segment;
        const sentences = parseSentences(currentSegmentData.originalContent || currentSegmentData.content);
        const voiceTag = currentSegmentData.voiceTag;
        
        console.log(`📝 Segment ${currentTimelineIndex + 1} sentences (clean):`, sentences);
        
        // Set up sentence display
        setCurrentVoiceTag(voiceTag);
        setCurrentSegmentSentences(sentences);
        setCurrentSentenceIndex(0);
        
        // Clear any existing sentence timeouts
        sentenceTimeouts.forEach(timeout => clearTimeout(timeout));
        setSentenceTimeouts([]);
        
        if (sentences.length > 0) {
          // Show first sentence immediately
          setCurrentDisplayText(sentences[0]);
          console.log(`📖 Showing sentence 1/${sentences.length}: "${sentences[0]}"`);
          
          // Set up timers for remaining sentences if there are multiple
          if (sentences.length > 1) {
            // Estimate audio duration (rough estimate based on text length)
            const cleanContent = currentSegmentData.originalContent || currentSegmentData.content;
            const estimatedDuration = Math.max(3, cleanContent.length * 0.08); // ~80ms per character
            const timings = estimateSentenceTimings(sentences, estimatedDuration);
            
            console.log(`⏱️ Estimated segment duration: ${estimatedDuration}s`);
            console.log(`⏱️ Sentence timings:`, timings);
            
            const newTimeouts = [];
            
            // Schedule remaining sentences
            for (let i = 1; i < sentences.length; i++) {
              const timing = timings[i];
              const timeout = setTimeout(() => {
                if (!playbackStoppedRef.current) {
                  console.log(`📖 Showing sentence ${i + 1}/${sentences.length}: "${sentences[i]}"`);
                  setCurrentDisplayText(sentences[i]);
                  setCurrentSentenceIndex(i);
                }
              }, timing.startTime * 1000);
              
              newTimeouts.push(timeout);
            }
            
            setSentenceTimeouts(newTimeouts);
          }
        }
        
          // Handle audio completion
          audio.onended = () => {
            if (playbackStoppedRef.current) return; // Don't continue if playback was stopped
            
            console.log(`✅ Completed voice segment: [${segment.voiceTag}]`);
            currentTimelineIndex++;
            playNextTimelineStep();
          };
          
          // Handle errors
          audio.onerror = (error) => {
            if (playbackStoppedRef.current) return; // Don't continue if playback was stopped
            
            console.error(`❌ Error playing voice segment [${segment.voiceTag}]:`, error);
            currentTimelineIndex++;
            playNextTimelineStep(); // Continue to next timeline step
          };
          
          // Play the audio
          audio.play().catch(error => {
            if (playbackStoppedRef.current) return; // Don't continue if playback was stopped
            
            console.error(`❌ Failed to play voice segment [${segment.voiceTag}]:`, error);
            currentTimelineIndex++;
            playNextTimelineStep(); // Continue to next timeline step
          });
        }
      };
      
      // Start playing the timeline
      playNextTimelineStep();
      
    } catch (error) {
      console.error('❌ Error in multi-voice playback:', error);
      console.error('❌ Full error details:', error.message, error.stack);
      
      // Clean up media timeouts on error
      console.log('🧹 Cleaning up media timeouts on error:', mediaTimeouts.length);
      mediaTimeouts.forEach(timeoutId => clearTimeout(timeoutId));
      mediaTimeoutsRef.current.forEach(timeoutId => clearTimeout(timeoutId));
      setMediaTimeouts([]);
      mediaTimeoutsRef.current = [];
      
      // Reset states on error
      setIsGeneratingAudio(false);
      setIsPlaying(false);
      setActiveAudioSegments([]);
      
      throw error;
    }
  };

 