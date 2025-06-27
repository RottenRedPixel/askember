// Message processing utilities
export const processUserMessage = (message) => {
  // Clean and validate user messages
  return {
    content: message.trim(),
    wordCount: message.trim().split(/\s+/).length,
    hasQuestions: /\?/.test(message),
    hasLocation: /\b(where|location|place|here|there)\b/i.test(message),
    hasTime: /\b(when|time|date|today|yesterday|ago|hour|minute)\b/i.test(message),
    hasPeople: /\b(who|person|people|someone|friend|family)\b/i.test(message)
  };
};

// Wiki suggestion utilities
export const formatWikiSuggestion = (type, content, confidence = 0.8) => {
  const suggestions = {
    location: {
      section: 'location',
      field: 'description',
      icon: 'MapPin'
    },
    time: {
      section: 'basic_info', 
      field: 'date_info',
      icon: 'Clock'
    },
    people: {
      section: 'people',
      field: 'tags',
      icon: 'Users'
    },
    description: {
      section: 'basic_info',
      field: 'description', 
      icon: 'FileText'
    }
  };

  const template = suggestions[type] || suggestions.description;
  
  return {
    ...template,
    value: content,
    confidence,
    timestamp: new Date(),
    id: `suggestion_${Date.now()}`
  };
};

// Agent response generation helpers
export const generateContextualResponse = (userMessage, messageAnalysis) => {
  const responses = {
    location: [
      "Can you tell me more about where this photo was taken? I'd love to add location details to the wiki.",
      "That sounds like an interesting place! What made this location special for this moment?",
      "I'd like to document this location. Could you share more details about where you were?"
    ],
    time: [
      "When was this photo taken? Understanding the timing helps me build the story.",
      "That timing is important! Can you tell me more about what was happening around that time?",
      "I'd love to capture the temporal context of this moment. When did this happen?"
    ],
    people: [
      "Who are the people in this photo? I can help tag them in the People section.",
      "Tell me about the people involved in this moment. Their stories matter too!",
      "I'd like to document who was part of this experience. Can you share more about them?"
    ],
    general: [
      "That's interesting! Can you tell me more about the story behind this moment?",
      "I'm learning about this ember. What else can you share about this experience?",
      "Help me understand the context better. What made this moment special?"
    ]
  };

  let responseType = 'general';
  if (messageAnalysis.hasLocation) responseType = 'location';
  else if (messageAnalysis.hasTime) responseType = 'time';
  else if (messageAnalysis.hasPeople) responseType = 'people';

  const responseOptions = responses[responseType];
  return responseOptions[Math.floor(Math.random() * responseOptions.length)];
};

// Voice processing utilities (placeholder for future implementation)
export const processVoiceInput = async (audioBlob) => {
  // TODO: Integrate with speech-to-text service
  console.log('Processing voice input:', audioBlob);
  return {
    text: "Voice processing not yet implemented",
    confidence: 0.0
  };
};

// Animation and UI helpers
export const getTypingDelay = (messageLength) => {
  // Simulate realistic typing speed (40-60 WPM)
  const wordsPerMinute = 50;
  const words = messageLength / 5; // Average 5 characters per word
  const typingTime = (words / wordsPerMinute) * 60 * 1000; // Convert to milliseconds
  return Math.min(Math.max(typingTime, 1000), 4000); // Between 1-4 seconds
};

export const shouldSuggestWiki = (messageAnalysis, conversationHistory) => {
  // Logic to determine if we should suggest wiki updates
  if (conversationHistory.length < 2) return false; // Wait for some conversation
  if (messageAnalysis.wordCount < 3) return false; // Too short to be meaningful
  
  // Higher chance for messages with specific content types
  if (messageAnalysis.hasLocation || messageAnalysis.hasTime || messageAnalysis.hasPeople) {
    return Math.random() > 0.4; // 60% chance
  }
  
  return Math.random() > 0.7; // 30% chance for general messages
}; 