import React, { useRef, useEffect } from 'react';
import { useAgentState } from '../hooks/useAgentState';
import { Button } from '@/components/ui/button';
import { Send, Mic, Square } from 'lucide-react';
import { cn } from '@/lib/utils';

const AgentInput = () => {
  const {
    inputValue,
    isRecording,
    isAgentTyping,
    handleInputChange,
    submitInput,
    startRecording,
    stopRecording
  } = useAgentState();
  
  const textareaRef = useRef(null);

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
    }
  }, [inputValue]);

  // Focus on textarea when component mounts
  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!isAgentTyping && inputValue.trim()) {
        submitInput();
      }
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!isAgentTyping && inputValue.trim()) {
      submitInput();
    }
  };

  const canSend = inputValue.trim() && !isAgentTyping;

  return (
    <div className="p-4 bg-white">
      <form onSubmit={handleSubmit} className="flex items-end gap-3">
        {/* Text Input */}
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={inputValue}
            onChange={(e) => handleInputChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              isAgentTyping 
                ? "Agent is thinking..." 
                : "Share more about this ember..."
            }
            disabled={isAgentTyping}
            className={cn(
              "w-full px-4 py-3 pr-12 border border-gray-200 rounded-lg resize-none",
              "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent",
              "placeholder-gray-400 text-sm leading-5 min-h-[48px] max-h-[120px]",
              isAgentTyping && "bg-gray-50 cursor-not-allowed"
            )}
            rows={1}
          />
          
          {/* Character count hint (optional) */}
          {inputValue.length > 500 && (
            <div className="absolute -top-6 right-0 text-xs text-gray-400">
              {inputValue.length}/1000
            </div>
          )}
        </div>

        {/* Voice Recording Button */}
        <Button
          type="button"
          size="lg"
          variant={isRecording ? "destructive" : "outline"}
          onClick={isRecording ? stopRecording : startRecording}
          disabled={isAgentTyping}
          className={cn(
            "h-12 w-12 p-0 flex-shrink-0",
            isRecording && "animate-pulse"
          )}
          title={isRecording ? "Stop recording" : "Start voice message"}
        >
          {isRecording ? (
            <Square className="h-4 w-4" />
          ) : (
            <Mic className="h-4 w-4" />
          )}
        </Button>

        {/* Send Button */}
        <Button
          type="submit"
          size="lg"
          disabled={!canSend}
          className={cn(
            "h-12 w-12 p-0 flex-shrink-0",
            canSend
              ? "bg-blue-600 hover:bg-blue-700"
              : "bg-gray-200 cursor-not-allowed"
          )}
          title="Send message"
        >
          <Send className="h-4 w-4" />
        </Button>
      </form>

      {/* Recording Indicator */}
      {isRecording && (
        <div className="mt-2 flex items-center gap-2 text-red-600 text-sm">
          <div className="w-2 h-2 bg-red-600 rounded-full animate-pulse" />
          Recording... Tap stop when finished
        </div>
      )}

      {/* Hints */}
      {!inputValue && !isAgentTyping && (
        <div className="mt-2 text-xs text-gray-400">
          💡 Try asking about when, where, or who in your photo
        </div>
      )}
    </div>
  );
};

export default AgentInput; 