import React from 'react';
import { getStyleDisplayName } from '@/lib/styleUtils';
// extractColorFromAction no longer needed - using JSON blocks directly
import MessageAudioControls from '@/components/OwnerMessageAudioControls';

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
    availableStoryStyles,
    formatRelativeTime,
    storyMessages,
    ember,
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
                    {getStyleDisplayName(selectedStoryCut.style, availableStoryStyles)}
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
                        <div className="flex items-center gap-3">
                            <a
                                href={`/embers/${ember?.id}/studio/${selectedStoryCut.id}`}
                                className="text-sm bg-purple-600 hover:bg-purple-700 text-white px-3 py-1 rounded-lg font-medium flex items-center gap-1"
                            >
                                🎬 Studio
                            </a>
                            <button
                                onClick={() => {
                                    console.log('⚠️ Script editing deprecated - use StoryCutStudio for JSON block editing');
                                    alert('Script editing is deprecated. Please use StoryCutStudio for visual editing.');
                                }}
                                className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                            >
                                Edit
                            </button>
                        </div>
                    )}
                </div>

                {isEditingScript ? (
                    <div className="space-y-3">
                        {/* NEW: Sacred format helper */}
                        {editedScript.includes(' | ') && editedScript.includes('<') && editedScript.includes('>') && (
                            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                                <div className="text-sm text-blue-800">
                                    <strong>Sacred Format Detected:</strong>
                                    <span className="ml-2">
                                        Only edit content inside <code className="bg-blue-100 px-1 rounded">&lt; &gt;</code> and
                                        <code className="bg-blue-100 px-1 rounded ml-1">( )</code> sections.
                                    </span>
                                </div>
                                <div className="text-xs text-blue-600 mt-1">
                                    <span className="font-medium">Protected:</span> [NAME | preference | ID] sections preserve audio matching
                                </div>
                            </div>
                        )}

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
                        {/* NEW: Display format indicator */}
                        {formattedScript.includes(' | ') && formattedScript.includes('<') && formattedScript.includes('>') && (
                            <div className="mb-3 text-xs text-green-600 bg-green-50 px-2 py-1 rounded border border-green-200">
                                <span className="font-medium">✅ Sacred Format:</span> Reliable audio matching enabled
                            </div>
                        )}

                        <div className="text-gray-700 leading-relaxed font-mono text-sm">
                            {formattedScript.split('\n\n').map((line, index) => {
                                // NEW: Handle sacred format display
                                const sacredMatch = line.match(/^(\[[^|]+\|[^|]+\|[^\]]*\])\s*<(.+)>$/);
                                if (sacredMatch) {
                                    const [, sacredTag, content] = sacredMatch;
                                    return (
                                        <div key={index} className="mb-2">
                                            <span className="text-gray-500 text-xs bg-gray-100 px-1 rounded mr-2">
                                                {sacredTag}
                                            </span>
                                            <span className="text-gray-800">{content}</span>
                                        </div>
                                    );
                                }

                                // Parse voice tag, content, and duration - handle both [[MEDIA]] and [VOICE] formats (legacy)
                                const voiceMatch = line.match(/^(\[\[?[^\]]+\]\]?)\s*(.*?)\s*\((\d+\.\d+)\)$/);
                                if (!voiceMatch) return <div key={index}>{line}</div>;

                                const [, voiceTagWithBrackets, content, duration] = voiceMatch;
                                const isMedia = voiceTagWithBrackets.startsWith('[[');
                                const voiceTag = voiceTagWithBrackets.replace(/^\[\[?|\]\]?$/g, '');

                                // Clean content by removing visual actions (color indicators, etc.)
                                const cleanContent = content.replace(/<([^>]+)>/g, '').trim();

                                // Create a single text part with clean content
                                const parts = [{
                                    type: 'text',
                                    content: cleanContent
                                }];

                                return (
                                    <div key={index} className="leading-relaxed mb-4">
                                        <span className={`font-semibold ${isMedia ? 'text-blue-600' : ''}`}>
                                            {isMedia ? '[[' : '['}
                                            {voiceTag}
                                            {isMedia ? ']]' : ']'}
                                        </span>{' '}
                                        {parts.map((part, partIndex) => (
                                            <span key={partIndex}>
                                                {part.content}
                                            </span>
                                        ))}
                                        <span className="text-gray-500 text-xs ml-2">({duration}s)</span>
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
                                            <div className="flex items-center justify-between mt-2">
                                                <div className="flex items-center gap-2">
                                                    <div className={`w-2 h-2 rounded-full ${messageType === 'audio' ? 'bg-blue-500 animate-pulse' : 'bg-blue-400'}`}></div>
                                                    <span className="text-xs opacity-70">
                                                        {messageType === 'audio' ? 'Audio message' : 'Text response'}
                                                    </span>
                                                </div>
                                                <MessageAudioControls
                                                    line={line}
                                                    messageIndex={index}
                                                    messageType={messageType}
                                                    storyMessages={storyMessages}
                                                    ember={ember}
                                                    storyCutId={selectedStoryCut.id}
                                                    userId={(() => {
                                                        // Try to find the contributor's user ID from story messages
                                                        const contributorMessages = storyMessages?.filter(msg => msg.user_id !== ember?.user_id) || [];
                                                        if (contributorMessages[index]) {
                                                            return contributorMessages[index].user_id;
                                                        }
                                                        return null;
                                                    })()}
                                                />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            )}
    </div>
);

export default StoryCutDetailContent; 