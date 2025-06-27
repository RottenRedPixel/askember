import { createContext, useContext, useReducer, useEffect } from 'react';

// Action types
export const AGENT_ACTIONS = {
  SET_LOADING: 'SET_LOADING',
  ADD_MESSAGE: 'ADD_MESSAGE',
  SET_TYPING: 'SET_TYPING',
  SET_CONNECTED: 'SET_CONNECTED',
  WIKI_SUGGESTION: 'WIKI_SUGGESTION',
  SET_PLAYBACK: 'SET_PLAYBACK',
  USER_ACTION: 'USER_ACTION',
  SET_ERROR: 'SET_ERROR',
  CLEAR_ERROR: 'CLEAR_ERROR'
};

// Message types
export const MESSAGE_TYPES = {
  USER: 'user',
  AGENT: 'agent',
  SYSTEM: 'system'
};

// Initial state
const initialState = {
  messages: [],
  isLoading: false,
  isAgentTyping: false,
  isConnected: false,
  wikiSuggestions: [],
  playbackState: null,
  error: null,
  emberId: null,
  userId: null
};

// Reducer
const agentReducer = (state, action) => {
  switch (action.type) {
    case AGENT_ACTIONS.SET_LOADING:
      return { ...state, isLoading: action.payload };
      
    case AGENT_ACTIONS.ADD_MESSAGE:
      return {
        ...state,
        messages: [...state.messages, {
          id: Date.now(),
          timestamp: new Date(),
          ...action.payload
        }]
      };
      
    case AGENT_ACTIONS.SET_TYPING:
      return { ...state, isAgentTyping: action.payload };
      
    case AGENT_ACTIONS.SET_CONNECTED:
      return { ...state, isConnected: action.payload };
      
    case AGENT_ACTIONS.WIKI_SUGGESTION:
      return {
        ...state,
        wikiSuggestions: [...state.wikiSuggestions, action.payload]
      };
      
    case AGENT_ACTIONS.SET_PLAYBACK:
      return { ...state, playbackState: action.payload };
      
    case AGENT_ACTIONS.SET_ERROR:
      return { ...state, error: action.payload };
      
    case AGENT_ACTIONS.CLEAR_ERROR:
      return { ...state, error: null };
      
    default:
      return state;
  }
};

// Context
const AgentContext = createContext();

// Provider component
export const AgentProvider = ({ children, emberId, userId }) => {
  const [state, dispatch] = useReducer(agentReducer, {
    ...initialState,
    emberId,
    userId
  });

  // Initialize with welcome message
  useEffect(() => {
    if (emberId) {
      dispatch({
        type: AGENT_ACTIONS.ADD_MESSAGE,
        payload: {
          type: MESSAGE_TYPES.AGENT,
          content: "Hello there, I will be asking you questions here...",
          isWelcome: true
        }
      });
    }
  }, [emberId]);

  // Actions
  const actions = {
    addMessage: (message) => {
      dispatch({ type: AGENT_ACTIONS.ADD_MESSAGE, payload: message });
    },
    
    setLoading: (loading) => {
      dispatch({ type: AGENT_ACTIONS.SET_LOADING, payload: loading });
    },
    
    setAgentTyping: (typing) => {
      dispatch({ type: AGENT_ACTIONS.SET_TYPING, payload: typing });
    },
    
    setConnected: (connected) => {
      dispatch({ type: AGENT_ACTIONS.SET_CONNECTED, payload: connected });
    },
    
    addWikiSuggestion: (suggestion) => {
      dispatch({ type: AGENT_ACTIONS.WIKI_SUGGESTION, payload: suggestion });
    },
    
    setPlayback: (playbackState) => {
      dispatch({ type: AGENT_ACTIONS.SET_PLAYBACK, payload: playbackState });
    },
    
    setError: (error) => {
      dispatch({ type: AGENT_ACTIONS.SET_ERROR, payload: error });
    },
    
    clearError: () => {
      dispatch({ type: AGENT_ACTIONS.CLEAR_ERROR });
    }
  };

  const value = {
    state,
    actions,
    dispatch
  };

  return (
    <AgentContext.Provider value={value}>
      {children}
    </AgentContext.Provider>
  );
};

// Custom hook to use the context
export const useAgent = () => {
  const context = useContext(AgentContext);
  if (!context) {
    throw new Error('useAgent must be used within an AgentProvider');
  }
  return context;
};

export default AgentContext; 