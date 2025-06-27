import React, { useEffect, useRef } from 'react';
import { useAgentState } from '../hooks/useAgentState';
import { MESSAGE_TYPES } from '../AgentContext';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { CheckCircle, AlertCircle } from 'lucide-react';
import { Sparkle, Robot } from 'phosphor-react';

const AgentMessages = ({ onWikiUpdate, onStoryUpdate, participants, permissions }) => {
  const { 
    messages, 
    isAgentTyping, 
    wikiSuggestions, 
    error,
    clearError 
  } = useAgentState();
  
  const messagesEndRef = useRef(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isAgentTyping]);

  const handleWikiSuggestionAccept = (suggestion) => {
    if (onWikiUpdate) {
      onWikiUpdate(suggestion);
    }
    // Remove suggestion from list (in a real app, you'd dispatch an action)
    console.log('Accepted wiki suggestion:', suggestion);
  };

  const renderMessage = (message) => {
    const isAgent = message.type === MESSAGE_TYPES.AGENT;
    const isUser = message.type === MESSAGE_TYPES.USER;

    return (
      <div
        key={message.id}
        className={`flex gap-3 p-4 ${
          isUser ? 'flex-row-reverse' : 'flex-row'
        }`}
      >
        {/* Avatar */}
        <div className="flex-shrink-0">
          {isAgent ? (
            <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
              <Robot size={16} className="text-blue-600" />
            </div>
          ) : (
            <Avatar className="h-8 w-8">
              <AvatarImage src="/default-avatar.png" />
              <AvatarFallback className="text-xs bg-gray-200 text-gray-700">
                U
              </AvatarFallback>
            </Avatar>
          )}
        </div>

        {/* Message Content */}
        <div className={`flex-1 max-w-[80%] ${isUser ? 'text-right' : 'text-left'}`}>
          <div
            className={`inline-block p-3 rounded-lg ${
              isUser
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-900'
            }`}
          >
            <p className="text-sm whitespace-pre-wrap">{message.content}</p>
          </div>
          
          {/* Timestamp */}
          <div className={`text-xs text-gray-500 mt-1 ${isUser ? 'text-right' : 'text-left'}`}>
            {message.timestamp?.toLocaleTimeString([], { 
              hour: '2-digit', 
              minute: '2-digit' 
            })}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full">
      {/* Error Display */}
      {error && (
        <div className="p-4 border-b">
          <Alert className="border-red-200 bg-red-50">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-700">
              {error}
              <Button 
                size="sm" 
                variant="ghost" 
                onClick={clearError}
                className="ml-2 h-auto p-1 text-red-700 hover:text-red-800"
              >
                Dismiss
              </Button>
            </AlertDescription>
          </Alert>
        </div>
      )}

      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto">
        {/* Welcome State */}
        {messages.length === 0 && (
          <div className="flex items-center justify-center h-full p-6 text-center">
            <div className="space-y-3">
              <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center mx-auto">
                <Sparkle size={24} className="text-blue-600" />
              </div>
              <h3 className="text-lg font-medium text-gray-900">
                Welcome to Ember Agent
              </h3>
              <p className="text-gray-600 max-w-sm">
                I'm here to help you discover and document the story behind your ember. 
                Ask me anything about this moment!
              </p>
            </div>
          </div>
        )}

        {/* Messages */}
        <div className="space-y-1">
          {messages.map(renderMessage)}
          
          {/* Typing Indicator */}
          {isAgentTyping && (
            <div className="flex gap-3 p-4">
              <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                <Robot size={16} className="text-blue-600" />
              </div>
              <div className="flex-1">
                <div className="inline-block p-3 rounded-lg bg-gray-100">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-75"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-150"></div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
        
        {/* Scroll target */}
        <div ref={messagesEndRef} />
      </div>

      {/* Wiki Suggestions */}
      {wikiSuggestions.length > 0 && (
        <div className="border-t bg-amber-50 p-4 space-y-2">
          <h4 className="text-sm font-medium text-amber-800 flex items-center gap-2">
            <Sparkle size={16} />
            Wiki Suggestions
          </h4>
          {wikiSuggestions.map((suggestion, index) => (
            <div key={index} className="flex items-center justify-between p-2 bg-white rounded border">
              <div className="flex-1">
                <p className="text-sm text-gray-900">{suggestion.value}</p>
                <p className="text-xs text-gray-500">
                  For {suggestion.section} • {Math.round(suggestion.confidence * 100)}% confidence
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleWikiSuggestionAccept(suggestion)}
                >
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Accept
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AgentMessages; 