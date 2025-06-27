import { useState, useCallback } from 'react';
import { useAgent } from '../AgentContext';
import { MESSAGE_TYPES } from '../AgentContext';
import { 
  processUserMessage,
  generateContextualResponse,
  formatWikiSuggestion,
  getTypingDelay,
  shouldSuggestWiki
} from '../utils/agentHelpers';

export const useAgentState = () => {
  const { state, actions } = useAgent();
  const [inputValue, setInputValue] = useState('');
  const [isRecording, setIsRecording] = useState(false);

  // Send a user message
  const sendMessage = useCallback(async (message, type = 'text') => {
    if (!message.trim()) return;

    // Add user message
    actions.addMessage({
      type: MESSAGE_TYPES.USER,
      content: message,
      messageType: type
    });

    // Clear input
    setInputValue('');

    // Simulate agent typing
    actions.setAgentTyping(true);

    try {
      // Here we'll integrate with the actual AI service later
      // For now, simulate a response
      await simulateAgentResponse(message);
    } catch (error) {
      actions.setError('Failed to get response from agent');
      console.error('Agent response error:', error);
    } finally {
      actions.setAgentTyping(false);
    }
  }, [actions]);

  // Simulate agent response (replace with real AI integration)
  const simulateAgentResponse = useCallback(async (userMessage) => {
    // Analyze the user message for better responses
    const messageAnalysis = processUserMessage(userMessage);
    const typingDelay = getTypingDelay(userMessage.length);
    
    // Simulate realistic typing time
    await new Promise(resolve => setTimeout(resolve, typingDelay));

    // Generate contextual response based on message analysis
    const response = generateContextualResponse(userMessage, messageAnalysis);

    actions.addMessage({
      type: MESSAGE_TYPES.AGENT,
      content: response
    });

    // Suggest wiki updates based on conversation context
    if (shouldSuggestWiki(messageAnalysis, state.messages)) {
      setTimeout(() => {
        let suggestionType = 'description';
        let suggestionContent = `User mentioned: "${messageAnalysis.content}"`;
        
        if (messageAnalysis.hasLocation) {
          suggestionType = 'location';
          suggestionContent = `Location context: ${messageAnalysis.content}`;
        } else if (messageAnalysis.hasTime) {
          suggestionType = 'time';
          suggestionContent = `Time context: ${messageAnalysis.content}`;
        } else if (messageAnalysis.hasPeople) {
          suggestionType = 'people';
          suggestionContent = `People mentioned: Extract from "${messageAnalysis.content}"`;
        }
        
        const suggestion = formatWikiSuggestion(suggestionType, suggestionContent, 0.8);
        actions.addWikiSuggestion(suggestion);
      }, 1000);
    }
  }, [actions, state.messages]);

  // Handle voice recording
  const startRecording = useCallback(() => {
    setIsRecording(true);
    // TODO: Implement voice recording
    console.log('Start voice recording');
  }, []);

  const stopRecording = useCallback(() => {
    setIsRecording(false);
    // TODO: Process voice recording
    console.log('Stop voice recording');
  }, []);

  // Submit current input
  const submitInput = useCallback(() => {
    if (inputValue.trim()) {
      sendMessage(inputValue);
    }
  }, [inputValue, sendMessage]);

  // Handle input changes
  const handleInputChange = useCallback((value) => {
    setInputValue(value);
    actions.clearError(); // Clear any previous errors when user types
  }, [actions]);

  return {
    // State
    messages: state.messages,
    isLoading: state.isLoading,
    isAgentTyping: state.isAgentTyping,
    isConnected: state.isConnected,
    wikiSuggestions: state.wikiSuggestions,
    error: state.error,
    inputValue,
    isRecording,
    
    // Actions
    sendMessage,
    startRecording,
    stopRecording,
    submitInput,
    handleInputChange,
    setInputValue,
    
    // Direct actions from context
    clearError: actions.clearError,
    setError: actions.setError
  };
}; 