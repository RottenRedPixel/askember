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
import { getEmber, updateEmberTitle, saveStoryCut, getStoryCutsForEmber, getAllStoryMessagesForEmber, deleteStoryCut, setPrimaryStoryCut, getPrimaryStoryCut, getEmberSupportingMedia } from '@/lib/database';
import { getEmberWithSharing } from '@/lib/sharing';
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

import EmberNamesModal from '@/components/EmberNamesModal';
import EmberSettingsPanel from '@/components/EmberSettingsPanel';
import QRCodeGenerator from '@/components/QRCodeGenerator';
import { textToSpeech, getVoices } from '@/lib/elevenlabs';
// Prompts functionality has been removed
import { cn } from '@/lib/utils';
import useStore from '@/store';

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
  ember
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
            onClick={() => setIsEditingScript(true)}
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
          <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
            {selectedStoryCut.full_script}
          </p>
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
                  <div className="flex items-center gap-2 mt-2">
                    <div className={`w-2 h-2 rounded-full ${messageType === 'audio' ? 'bg-green-500 animate-pulse' : 'bg-green-400'}`}></div>
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
                return `${contributorNames.join(', ')} (Contributor${contributorNames.length > 1 ? 's' : ''})`;
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
  storyMessages
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
      
      <div className="grid grid-cols-3 gap-3 md:space-y-3 md:grid-cols-1">
        {/* Owner */}
        {ember?.owner && (
          <div 
            onClick={() => toggleVoiceSelection(ember.user_id)}
            className="flex items-center gap-2 md:gap-3 p-2 md:p-3 rounded-xl border cursor-pointer transition-colors hover:bg-gray-50"
            style={{
              borderColor: selectedVoices.includes(ember.user_id) ? '#2563eb' : '#e5e7eb',
              backgroundColor: selectedVoices.includes(ember.user_id) ? '#eff6ff' : 'white'
            }}
          >
            <div className="relative">
              <Avatar className="h-8 w-8 md:h-10 md:w-10">
                <AvatarImage 
                  src={ember.owner.avatar_url} 
                  alt={ember.owner.first_name || 'Owner'} 
                />
                <AvatarFallback className="text-xs md:text-sm bg-gray-200 text-gray-700">
                  {ember.owner.first_name?.[0] || ember.owner.last_name?.[0] || 'O'}
                </AvatarFallback>
              </Avatar>
              {selectedVoices.includes(ember.user_id) && (
                <div className="absolute -top-1 -right-1 w-3 h-3 md:w-4 md:h-4 bg-blue-600 rounded-full flex items-center justify-center">
                  <span className="text-white text-xs">✓</span>
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs md:text-sm font-medium text-gray-900 truncate">
                {ember.owner.first_name || 'Owner'}
              </div>
              <div className="text-xs text-amber-600 bg-amber-100 px-1 md:px-2 py-0.5 md:py-1 rounded-full inline-block mt-0.5 md:mt-1">
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
            className="flex items-center gap-2 md:gap-3 p-2 md:p-3 rounded-xl border cursor-pointer transition-colors hover:bg-gray-50"
            style={{
              borderColor: selectedVoices.includes(user.user_id) ? '#2563eb' : '#e5e7eb',
              backgroundColor: selectedVoices.includes(user.user_id) ? '#eff6ff' : 'white'
            }}
          >
            <div className="relative">
              <Avatar className="h-8 w-8 md:h-10 md:w-10">
                <AvatarImage 
                  src={user.avatar_url} 
                  alt={user.first_name || 'User'} 
                />
                <AvatarFallback className="text-xs md:text-sm bg-gray-200 text-gray-700">
                  {user.first_name?.[0] || user.last_name?.[0] || 'U'}
                </AvatarFallback>
              </Avatar>
              {selectedVoices.includes(user.user_id) && (
                <div className="absolute -top-1 -right-1 w-3 h-3 md:w-4 md:h-4 bg-blue-600 rounded-full flex items-center justify-center">
                  <span className="text-white text-xs">✓</span>
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs md:text-sm font-medium text-gray-900 truncate">
                {user.first_name || 'User'}
              </div>
              <div className={`text-xs px-1 md:px-2 py-0.5 md:py-1 rounded-full inline-block mt-0.5 md:mt-1 ${
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
          <div className="col-span-3 md:col-span-1 text-center text-gray-500 text-sm py-4">
            No users invited to this ember yet
          </div>
        )}
      </div>
    </div>

    {/* Voice Selection */}
    <div className="space-y-4">
      <Label className="text-sm font-medium text-gray-900 flex items-center gap-2">
        <Microphone size={16} className="text-purple-600" />
        Voice Selection
      </Label>
      
      <div className="grid grid-cols-1 gap-4">
        {/* Ember Voice */}
        <div className="space-y-2">
          <Label className="text-xs font-medium text-gray-700">Ember Voice</Label>
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

        {/* Story Narrator Voice */}
        <div className="space-y-2">
          <Label className="text-xs font-medium text-gray-700">Story Narrator Voice</Label>
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
      </div>
    </div>

    {/* Action Buttons */}
    <div className="mt-6 pt-4">
      <Button 
        size="lg" 
        className="w-full" 
        onClick={handleGenerateStoryCut}
        disabled={isGeneratingStoryCut || !selectedStoryStyle || !selectedEmberVoice || !selectedNarratorVoice || !storyTitle.trim()}
      >
        {isGeneratingStoryCut ? 'Generating Story Cut...' : 'Generate New Story Cut'}
      </Button>
      
      {(!selectedStoryStyle || !selectedEmberVoice || !selectedNarratorVoice || !storyTitle.trim()) && (
        <p className="text-xs text-gray-500 mt-2 text-center">
          Please enter title, select story style and both voices to generate
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
  const [isExitingPlay, setIsExitingPlay] = useState(false);
  const [showEndHold, setShowEndHold] = useState(false);
  const [isFadingOut, setIsFadingOut] = useState(false);
  const [currentVoiceType, setCurrentVoiceType] = useState(null);
  const [availableVoices, setAvailableVoices] = useState([]);
  const [selectedEmberVoice, setSelectedEmberVoice] = useState('');
  const [selectedNarratorVoice, setSelectedNarratorVoice] = useState('');
  const [voicesLoading, setVoicesLoading] = useState(false);
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
  }, []);

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
      refreshStoryCuts: fetchStoryCuts
    };

    // Cleanup
    return () => {
      delete window.EmberDetailActions;
    };
  }, []);

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

      if (!selectedEmberVoice || !selectedNarratorVoice) {
        throw new Error('Please select voices for both Ember and Narrator');
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
      const emberVoiceInfo = availableVoices.find(v => v.voice_id === selectedEmberVoice);
      const narratorVoiceInfo = availableVoices.find(v => v.voice_id === selectedNarratorVoice);
      
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
        ember: {
          voice_id: selectedEmberVoice,
          name: emberVoiceInfo?.name || 'Selected Voice',
          labels: emberVoiceInfo?.labels || {}
        },
        narrator: {
          voice_id: selectedNarratorVoice,
          name: narratorVoiceInfo?.name || 'Selected Voice',
          labels: narratorVoiceInfo?.labels || {}
        },
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
      
      // Generate story cut using direct OpenAI (development) or API (production)
      console.log('🤖 Generating story cut...');
      
      const isDevelopment = import.meta.env.DEV || window.location.hostname === 'localhost';
      let result;
      
      if (isDevelopment) {
        console.log('🔧 Development mode detected, calling OpenAI directly...');
        const { generateStoryCutWithOpenAI } = await import('@/lib/emberContext');
        
        result = await generateStoryCutWithOpenAI({
          emberId: ember.id,
          formData,
          selectedStyle: selectedStoryStyle,
          voiceCasting,
          contributorQuotes: selectedContributorQuotes
        });
      } else {
        // Production: use API route - build context for API
        console.log('🌍 Building context for API call...');
        const { emberContextBuilders } = await import('@/lib/emberContext');
        const emberContext = await emberContextBuilders.forStoryCut(ember.id);
        
        const storyConversations = allStoryMessages?.messages ? 
          allStoryMessages.messages
            .map(msg => `[${msg.sender === 'user' ? msg.user_first_name || 'User' : 'Ember AI'}]: ${msg.content}`)
            .join('\n\n') :
          'No story circle conversations available yet.';
        
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
          const errorData = await response.json();
          throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
        }

        result = await response.json();
      }
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to generate story cut');
      }

      // Parse the generated story cut (handle both direct result and API response formats)
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
      
      // Import the update function
      const { updateStoryCut } = await import('@/lib/database');
      
      // Update the story cut with the new script
      const updatedStoryCut = await updateStoryCut(
        selectedStoryCut.id,
        { full_script: editedScript.trim() },
        user.id
      );
      
      // Update the local state
      setSelectedStoryCut(updatedStoryCut);
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
      
    } catch (error) {
      console.error('Failed to update script:', error);
      setMessage({ type: 'error', text: 'Failed to update script. Please try again.' });
    } finally {
      setIsSavingScript(false);
    }
  };

  const handleCancelScriptEdit = () => {
    setEditedScript(selectedStoryCut.full_script || '');
    setIsEditingScript(false);
  };

  // Set edited script when selectedStoryCut changes
  useEffect(() => {
    if (selectedStoryCut && selectedStoryCut.full_script) {
      setEditedScript(selectedStoryCut.full_script);
    }
  }, [selectedStoryCut]);

  // Extract all wiki content as text for narration
  const extractWikiContent = (ember) => {
    return `${ember.title}. ${ember.description}`;
  };



  // Handle completion of playback with 3-second fade-out sequence
  const handlePlaybackComplete = () => {
    console.log('🎬 Playback complete, starting 3-second fade-out...');
    
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
    setActiveAudioSegments([]);
    
    // Start fade-out animation
    setIsFadingOut(true);
    
    // After 3 seconds of fade-out, show black hold then exit
    setTimeout(() => {
      setIsFadingOut(false);
      setShowEndHold(true);
      
      // After black hold, exit to normal view
      setTimeout(() => {
        handleExitPlay();
      }, 1000); // Brief black hold after fade-out
    }, 3000);
  };

  const handleExitPlay = () => {
    setIsExitingPlay(true);
    
    // Stop multi-voice playback chain
    playbackStoppedRef.current = true;
    
    // Stop current single audio if it exists
    if (currentAudio) {
      currentAudio.pause();
      currentAudio.currentTime = 0;
    }
    
    // Stop all active audio segments from multi-voice playback
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
    
    // Use React 18's automatic batching - no need for setTimeout
    // The exit animation is handled by CSS transitions
    setTimeout(() => {
      // Batch all state updates together
      setIsPlaying(false);
      setIsGeneratingAudio(false);
      setShowFullscreenPlay(false);
      setIsExitingPlay(false);
      setShowEndHold(false);
      setIsFadingOut(false);
      setCurrentlyPlayingStoryCut(null);
      setCurrentAudio(null);
      setActiveAudioSegments([]);
      setCurrentVoiceType(null);
      console.log('🎬 Voice type reset on exit');
      
      // Reset playback flag for next play
      playbackStoppedRef.current = false;
    }, 300);
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
      setIsExitingPlay(false);

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
        
        if (Object.keys(recordedAudio).length > 0) {
          // Use multi-voice playback with recorded audio
          console.log('🎵 Using multi-voice playback with recorded audio');
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
            // Use new multi-voice playback system
            await playMultiVoiceAudio(segments, selectedStoryCut, recordedAudio, { 
              setIsGeneratingAudio, 
              setIsPlaying, 
              handleExitPlay, 
              handlePlaybackComplete,
              setActiveAudioSegments,
              playbackStoppedRef,
              setCurrentVoiceType
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
          // No recorded audio, use current synthesized approach
          console.log('🔊 No recorded audio found, using synthesized speech');
          setIsGeneratingAudio(false);
          setIsPlaying(true);
          
          // Use the story cut's script and voice
          const content = selectedStoryCut.full_script;
          const voiceId = selectedStoryCut.ember_voice_id; // Use the ember voice from the story cut
          
          // Generate speech using ElevenLabs with the specific voice
          const audioBlob = await textToSpeech(content, voiceId);
          
          // Create audio URL and play
          const audioUrl = URL.createObjectURL(audioBlob);
          const audio = new Audio(audioUrl);
          
          setCurrentAudio(audio);
          
          // Handle audio end
          audio.onended = () => {
            handlePlaybackComplete();
            URL.revokeObjectURL(audioUrl);
          };
          
          // Handle audio error
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
                className="rounded-full p-1 hover:bg-white/70 transition-colors"
                onClick={() => setShowEmberStoryCuts(true)}
                aria-label="Story Cuts"
                type="button"
              >
                <FilmSlate size={24} className="text-gray-700" />
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
                  aria-label={isGeneratingAudio ? "Generating audio..." : (isPlaying ? "Stop playing" : "Play ember story")}
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
                        Edit & Create
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
                      id: 'analysis',
                      sectionType: 'analysis',
                      icon: Sparkles,
                      title: () => 'Image Analysis',
                      description: (isComplete) => {
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
                />
              </DialogContent>
            </Dialog>
          )}
        </>
      )}

      {/* Fullscreen Play Mode */}
      {showFullscreenPlay && (
        <div 
          className={`fixed inset-0 bg-black z-50 transition-all duration-500 ease-out ${
            isExitingPlay ? 'opacity-0' : 'opacity-100'
          }`}
          style={{
            animation: isExitingPlay ? 'fadeOut 0.5s ease-out' : 'fadeIn 0.7s ease-out'
          }}
        >
                    {/* Background Image - only show when not loading and not in end hold */}
          {!isGeneratingAudio && !showEndHold && (
            <img 
              src={ember.image_url} 
              alt={ember.title || 'Ember'}
              className="absolute inset-0 w-full h-full object-cover transition-all duration-1000 ease-out"
              style={{
                animation: isFadingOut ? 'fadeOutToBlack 3s ease-out' : 'scaleIn 3s ease-out'
              }}
            />
          )}
          
          {/* Voice Type Overlay - only show when playing and not fading out */}
          {!isGeneratingAudio && !showEndHold && !isFadingOut && (
            <div 
              className={`absolute inset-0 transition-all duration-500 ease-out ${
                currentVoiceType === 'ember' ? 'voice-overlay-ember' : 
                currentVoiceType === 'narrator' ? 'voice-overlay-narrator' : 
                currentVoiceType === 'contributor' ? 'voice-overlay-contributor' : ''
              }`}
            />
          )}
          
          {/* Dark overlay - only show when playing and not fading out */}
          {!isGeneratingAudio && !showEndHold && !isFadingOut && (
            <div 
              className="absolute inset-0 bg-black bg-opacity-40 transition-opacity duration-1000 ease-out"
              style={{
                animation: 'fadeInOverlay 1.2s ease-out'
              }}
            />
          )}
          
          {/* Title Overlay - only show when playing and not fading out */}
          {!isGeneratingAudio && !showEndHold && !isFadingOut && (
            <div className="absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black/60 to-transparent pointer-events-none z-20">
              <div className="container mx-auto max-w-4xl">
                <h1 className="text-white text-2xl font-bold truncate drop-shadow-md text-left pl-2">
                  {ember.title || 'Untitled Ember'}
                </h1>
                  </div>
              </div>
          )}



          {/* Bottom right capsule: Play controls and exit - hide during fade-out and end hold */}
          {!showEndHold && !isFadingOut && (
            <div className="absolute right-4 bottom-4 z-20">
            <div className="flex flex-col items-center gap-2 bg-white/50 backdrop-blur-sm px-2 py-3 rounded-full shadow-lg">
            
            {/* Play/Pause Button */}
            <button
              onClick={handlePlay}
              className="rounded-full p-1 hover:bg-white/70 transition-colors"
              aria-label={isGeneratingAudio ? "Generating audio..." : (isPlaying ? "Pause playing" : "Resume playing")}
              type="button"
              disabled={isGeneratingAudio}
            >
              {isGeneratingAudio ? (
                <div className="w-6 h-6 flex items-center justify-center">
                  <div className="w-4 h-4 border-2 border-gray-700 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : isPlaying ? (
                <div className="w-6 h-6 flex items-center justify-center">
                  <div className="w-1.5 h-4 bg-gray-700 mx-0.5 rounded-sm transition-all duration-300"></div>
                  <div className="w-1.5 h-4 bg-gray-700 mx-0.5 rounded-sm transition-all duration-300"></div>
                </div>
              ) : (
                <PlayCircle size={24} className="text-gray-700 transition-all duration-300" />
              )}
            </button>
              
              {/* Horizontal divider */}
              <div className="h-px w-6 bg-gray-300 my-1"></div>
            
            {/* Close button */}
            <button
              onClick={handleExitPlay}
              className="rounded-full p-1 hover:bg-white/70 transition-colors"
              aria-label="Close fullscreen"
              type="button"
            >
              <svg className="w-6 h-6 text-gray-700 transition-all duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            </div>
          </div>
          )}
          
          {/* Loading screen - pure black with subtle loading indicator */}
          {isGeneratingAudio && (
            <div className="absolute inset-0 bg-black z-30 flex items-center justify-center">
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin opacity-50" />
                <span className="text-white text-lg font-medium opacity-50">Generating voices...</span>
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
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      if (!trimmedLine) continue;
      
      // Match voice tags like [EMBER VOICE], [NARRATOR], [Amado], etc.
      const voiceMatch = trimmedLine.match(/^\[([^\]]+)\]\s*(.+)$/);
      
      if (voiceMatch) {
        const voiceTag = voiceMatch[1].trim();
        const content = voiceMatch[2].trim();
        
        if (content) {
          segments.push({
            voiceTag,
            content,
            type: getVoiceType(voiceTag)
          });
        }
      }
    }
    
    console.log('📝 Parsed script segments:', segments);
    return segments;
  };
  
  // Determine voice type for segment
  const getVoiceType = (voiceTag) => {
    if (voiceTag === 'EMBER VOICE') return 'ember';
    if (voiceTag === 'NARRATOR') return 'narrator';
    return 'contributor'; // Everything else is a contributor (user name)
  };

  // Generate audio for a single voice segment
  const generateSegmentAudio = async (segment, storyCut, recordedAudio) => {
    const { voiceTag, content, type } = segment;
    
    console.log(`🎵 Generating audio for [${voiceTag}]: "${content.substring(0, 50)}..."`);
    console.log(`🔍 Segment type: ${type}`);
    
    try {
      if (type === 'contributor') {
        // Look for recorded audio by matching voice tag (user first name) AND content similarity
        const userWithRecordedAudio = Object.entries(recordedAudio).find(([userId, audioData]) => {
          // First check if the user name matches
          if (audioData.user_first_name !== voiceTag) {
            return false;
          }
          
          // Then check if the content is similar (for now, exact match or contains check)
          const recordedContent = audioData.message_content?.toLowerCase() || '';
          const segmentContent = content.toLowerCase();
          
          // Check for exact match or if the recorded content contains the segment content
          return recordedContent === segmentContent || 
                 recordedContent.includes(segmentContent) ||
                 segmentContent.includes(recordedContent);
        });
        
        if (userWithRecordedAudio) {
          const [userId, audioData] = userWithRecordedAudio;
          console.log(`🎙️ Using recorded audio for ${voiceTag}: "${content}"`);
          console.log(`🔗 Matched with recorded: "${audioData.message_content}"`);
          console.log(`🔗 Audio URL:`, audioData.audio_url);
          
          // Create a direct audio element from the recorded URL
          const audio = new Audio(audioData.audio_url);
          return {
            type: 'recorded',
            audio,
            url: audioData.audio_url,
            voiceTag,
            content
          };
        } else {
          // No matching recorded audio - use narrator voice to attribute the quote
          console.log(`🔊 No matching recorded audio for ${voiceTag}: "${content}"`);
          console.log(`🎤 Using narrator voice to say "${voiceTag} said..."`);
          
          // Format content with attribution using narrator voice
          const narratedContent = `${voiceTag} said, "${content}"`;
          
          if (!storyCut.narrator_voice_id) {
            throw new Error(`Narrator voice ID is missing: ${storyCut.narrator_voice_id}`);
          }
          
          const audioBlob = await textToSpeech(narratedContent, storyCut.narrator_voice_id);
          const audioUrl = URL.createObjectURL(audioBlob);
          const audio = new Audio(audioUrl);
          
          return {
            type: 'synthesized',
            audio,
            url: audioUrl,
            blob: audioBlob,
            voiceTag,
            content: narratedContent
          };
        }
      } else if (type === 'ember') {
        // Use ember voice
        console.log(`🌟 Using ember voice for: ${content.substring(0, 30)}...`);
        console.log(`🎤 Ember voice ID:`, storyCut.ember_voice_id);
        
        if (!storyCut.ember_voice_id) {
          throw new Error(`Ember voice ID is missing: ${storyCut.ember_voice_id}`);
        }
        
        const audioBlob = await textToSpeech(content, storyCut.ember_voice_id);
        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);
        
        return {
          type: 'synthesized',
          audio,
          url: audioUrl,
          blob: audioBlob,
          voiceTag,
          content
        };
      } else if (type === 'narrator') {
        // Use narrator voice
        console.log(`📢 Using narrator voice for: ${content.substring(0, 30)}...`);
        console.log(`🎤 Narrator voice ID:`, storyCut.narrator_voice_id);
        
        if (!storyCut.narrator_voice_id) {
          throw new Error(`Narrator voice ID is missing: ${storyCut.narrator_voice_id}`);
        }
        
        const audioBlob = await textToSpeech(content, storyCut.narrator_voice_id);
        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);
        
        return {
          type: 'synthesized',
          audio,
          url: audioUrl,
          blob: audioBlob,
          voiceTag,
          content
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
    const { setIsGeneratingAudio, setIsPlaying, handleExitPlay, handlePlaybackComplete, setActiveAudioSegments, playbackStoppedRef, setCurrentVoiceType } = stateSetters;
    
    console.log('🎭 Starting multi-voice playback with', segments.length, 'segments');
    
    // Reset playback flag
    playbackStoppedRef.current = false;
    
    try {
      // Generate all audio segments
      console.log('⏳ Generating audio for all segments...');
      const audioSegments = [];
      for (let i = 0; i < segments.length; i++) {
        const segment = segments[i];
        console.log(`🔧 Generating segment ${i + 1}/${segments.length}: [${segment.voiceTag}] "${segment.content}"`);
        
        try {
          const audioSegment = await generateSegmentAudio(segment, storyCut, recordedAudio);
          audioSegments.push(audioSegment);
          console.log(`✅ Generated segment ${i + 1}: [${segment.voiceTag}]`);
        } catch (segmentError) {
          console.error(`❌ Failed to generate segment ${i + 1} [${segment.voiceTag}]:`, segmentError);
          console.error(`❌ Segment content: "${segment.content}"`);
          console.error(`❌ Segment type: ${segment.type}`);
          throw new Error(`Failed to generate audio for segment "${segment.voiceTag}": ${segmentError.message}`);
        }
      }
      
      console.log('✅ Generated', audioSegments.length, 'audio segments');
      console.log('🎬 Starting playback...');
      
      // Store segments in state for cleanup
      setActiveAudioSegments(audioSegments);
      
      // Switch from generating to playing state
      setIsGeneratingAudio(false);
      setIsPlaying(true);
      
      let currentSegmentIndex = 0;
      
      const playNextSegment = () => {
        if (playbackStoppedRef.current || currentSegmentIndex >= audioSegments.length) {
          // All segments finished or playback was stopped
          if (!playbackStoppedRef.current) {
            console.log('🎬 Multi-voice playback complete');
            handlePlaybackComplete();
          } else {
            console.log('🛑 Multi-voice playback stopped');
          }
          return;
        }
        
        const currentSegment = audioSegments[currentSegmentIndex];
        const audio = currentSegment.audio;
        
        console.log(`▶️ Playing segment ${currentSegmentIndex + 1}/${audioSegments.length}: [${currentSegment.voiceTag}]`);
        
        // Trigger visual effect based on voice type
        const segmentType = segments[currentSegmentIndex].type;
        if (segmentType === 'ember') {
          console.log('🎬 Visual effect: Ember voice - applying red overlay');
          setCurrentVoiceType('ember');
        } else if (segmentType === 'narrator') {
          console.log('🎬 Visual effect: Narrator voice - applying blue overlay');
          setCurrentVoiceType('narrator');
        } else {
          console.log('🎬 Visual effect: Contributor voice - applying green overlay');
          setCurrentVoiceType('contributor');
        }
        
        // Handle segment completion
        audio.onended = () => {
          if (playbackStoppedRef.current) return; // Don't continue if playback was stopped
          
          console.log(`✅ Completed segment: [${currentSegment.voiceTag}]`);
          currentSegmentIndex++;
          playNextSegment();
        };
        
        // Handle errors
        audio.onerror = (error) => {
          if (playbackStoppedRef.current) return; // Don't continue if playback was stopped
          
          console.error(`❌ Error playing segment [${currentSegment.voiceTag}]:`, error);
          currentSegmentIndex++;
          playNextSegment(); // Continue to next segment
        };
        
        // Play the segment
        audio.play().catch(error => {
          if (playbackStoppedRef.current) return; // Don't continue if playback was stopped
          
          console.error(`❌ Failed to play segment [${currentSegment.voiceTag}]:`, error);
          currentSegmentIndex++;
          playNextSegment(); // Continue to next segment
        });
      };
      
      // Start playing the first segment
      playNextSegment();
      
    } catch (error) {
      console.error('❌ Error in multi-voice playback:', error);
      console.error('❌ Full error details:', error.message, error.stack);
      
      // Reset states on error
      setIsGeneratingAudio(false);
      setIsPlaying(false);
      setActiveAudioSegments([]);
      
      throw error;
    }
  };

 