import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { PenNib, Package, Eye, Sliders, Users, Camera, Microphone } from 'phosphor-react';
import { Sparkles } from 'lucide-react';

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
  toggleNarratorVoice,
  // Media selection props
  availableMediaForStory,
  selectedMediaForStory,
  mediaLoadingForStory,
  toggleMediaSelection,
  selectAllMedia,
  clearMediaSelection
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
                <span className={`ml-1 px-2 py-0.5 rounded-full ${storyMessages.some(msg => msg.user_id === ember.user_id)
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
              <div className={`text-xs px-2 py-1 rounded-full inline-block mt-1 ${user.permission_level === 'contributor'
                ? 'text-blue-600 bg-blue-100'
                : 'text-gray-600 bg-gray-100'
                }`}>
                {user.permission_level === 'contributor' ? 'Contributor' : 'Viewer'}
              </div>
              <div className="text-xs text-gray-600 mt-1">
                Contributed?
                <span className={`ml-1 px-2 py-0.5 rounded-full ${storyMessages.some(msg => msg.user_id === user.user_id)
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

    {/* Media Selection */}
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium text-gray-900 flex items-center gap-2">
          <Camera size={16} className="text-blue-600" />
          Media Selection
        </Label>
      </div>

      <p className="text-sm text-gray-600">
        Choose which photos and media files to include in your story.
      </p>

      {mediaLoadingForStory ? (
        <div className="flex items-center justify-center py-8">
          <div className="text-sm text-gray-500">Loading available media...</div>
        </div>
      ) : availableMediaForStory.length === 0 ? (
        <div className="flex items-center justify-center py-8">
          <div className="text-sm text-gray-500">No media files available</div>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 max-h-64 overflow-y-auto">
          {availableMediaForStory.map((media) => (
            <div
              key={media.id}
              onClick={() => toggleMediaSelection(media.id)}
              className="relative cursor-pointer group"
            >
              <div
                className={`relative rounded-lg overflow-hidden border-2 transition-all ${selectedMediaForStory.includes(media.id)
                  ? 'border-blue-500 ring-2 ring-blue-500 ring-opacity-50'
                  : 'border-gray-200 hover:border-gray-300'
                  }`}
              >
                <img
                  src={media.thumbnail}
                  alt={media.name}
                  className="w-full aspect-square object-cover"
                />

                {/* Selection overlay */}
                {selectedMediaForStory.includes(media.id) && (
                  <div className="absolute inset-0 bg-blue-500 bg-opacity-20 flex items-center justify-center">
                    <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center">
                      <span className="text-white text-xs">✓</span>
                    </div>
                  </div>
                )}

                {/* Media type badge */}
                <div className="absolute top-1 left-1">
                  <span className={`text-xs px-2 py-0.5 rounded-full text-white font-medium ${media.category === 'ember' ? 'bg-amber-500' : 'bg-blue-500'
                    }`}>
                    {media.category === 'ember' ? 'Ember' : 'Media'}
                  </span>
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

      {selectedMediaForStory.length > 0 && (
        <div className="mt-3 p-2 bg-blue-50 rounded-lg border border-blue-200">
          <div className="text-sm text-blue-800 font-medium">
            {selectedMediaForStory.length} media file{selectedMediaForStory.length !== 1 ? 's' : ''} selected
          </div>
          <div className="text-xs text-blue-600 mt-1">
            Selected media will appear in your story with fade in/out effects for rich visual storytelling.
          </div>
        </div>
      )}
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

export default StoryModalContent; 