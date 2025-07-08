import { supabase } from './supabase';
import { executePrompt } from './promptManager';
import { emberContextBuilders } from './emberContext';

// Function to generate titles using the new prompt management system
export async function generateTitlesWithOpenAI(emberData, requestType = 'multiple') {
  try {
    console.log('🎯 [SUGGESTED-NAMES] Starting title generation...');
    
    // Use unified API approach instead of dynamic imports
    const response = await fetch('/api/ai-title-suggestion', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ emberData, type: requestType })
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();

    console.log('✅ [SUGGESTED-NAMES] Title generation completed');
    
    if (requestType === 'multiple') {
      // The AI service already returns the proper format
      if (result.suggestions && result.suggestions.length > 0) {
        return { 
          suggestions: result.suggestions,
          context: result.context || '',
          tokens_used: result.tokens_used || 0
        };
      } else {
        // Fallback if no suggestions returned
        return {
          suggestions: ['Creative Title', 'Memorable Moment', 'Special Memory'],
          context: '',
          tokens_used: 0
        };
      }
    } else {
      // Single title request
      if (result.suggestion) {
        return { 
          suggestion: result.suggestion,
          context: result.context || '',
          tokens_used: result.tokens_used || 0
        };
      } else {
        return {
          suggestion: 'Creative Title',
          context: '',
          tokens_used: 0
        };
      }
    }
  } catch (error) {
    console.error('❌ [SUGGESTED-NAMES] Title generation failed:', error);
    throw error;
  }
}

/**
 * Get all suggested names for an ember
 */
export async function getEmberSuggestedNames(emberId) {
  try {
    const { data, error } = await supabase
      .rpc('get_ember_suggested_names', { ember_uuid: emberId });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching suggested names:', error);
    throw error;
  }
}

/**
 * Add a new suggested name to an ember
 */
export async function addSuggestedName(emberId, suggestedName, isCustom = true) {
  try {
    const { data, error } = await supabase
      .rpc('add_ember_suggested_name', { 
        ember_uuid: emberId, 
        name_text: suggestedName,
        is_custom_name: isCustom
      });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error adding suggested name:', error);
    throw error;
  }
}

/**
 * Initialize default suggested names for a new ember using AI
 */
export async function initializeDefaultSuggestedNames(emberId, emberData = null) {
  try {
    let suggestedNames = [];
    if (emberData) {
      try {
        // Use the new prompt system to generate 3 titles
        const result = await generateTitlesWithOpenAI(emberData, 'multiple');
        if (result.suggestions && result.suggestions.length > 0) {
          suggestedNames = result.suggestions;
          console.log('AI generated clean titles for initialization:', suggestedNames);
        }
      } catch (err) {
        console.error('Error generating titles with new system:', err);
        // Continue to fallback
      }
    }
    
    // Fallback to generic names if AI fails or no ember data provided
    if (!suggestedNames || suggestedNames.length === 0) {
      console.log('Using fallback default names - AI generation failed or returned empty');
      suggestedNames = [
        'Title 1',
        'Title 2',
        'Title 3'
      ];
    }
    
    // Ensure we have exactly 3 names
    const namesToAdd = suggestedNames.slice(0, 3);
    const promises = namesToAdd.map(name => 
      addSuggestedName(emberId, name, false)
    );
    await Promise.all(promises);
    return true;
  } catch (error) {
    console.error('Error initializing default suggested names:', error);
    // Final fallback - use generic names if everything fails
    try {
      const fallbackNames = ['Title 1', 'Title 2', 'Title 3'];
      const promises = fallbackNames.map(name => 
        addSuggestedName(emberId, name, false)
      );
      await Promise.all(promises);
      return true;
    } catch (fallbackError) {
      console.error('Even fallback failed:', fallbackError);
      throw error;
    }
  }
}

/**
 * Delete a suggested name (only if user created it or owns the ember)
 */
export async function deleteSuggestedName(nameId) {
  try {
    const { error } = await supabase
      .from('ember_suggested_names')
      .delete()
      .eq('id', nameId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error deleting suggested name:', error);
    throw error;
  }
}

// Helper for Let Ember Try
export async function generateLetEmberTryTitle(emberData) {
  try {
    // Use the standard title generation for now - could be made into a separate prompt later
    const result = await generateTitlesWithOpenAI(emberData, 'single');
    return result.suggestion;
  } catch (error) {
    console.error('Error generating Let Ember Try title:', error);
    throw new Error('Failed to generate Let Ember Try title. Please try again.');
  }
} 