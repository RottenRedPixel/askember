import { supabase } from './supabase';
import { executePrompt } from './promptManager';
import { emberContextBuilders } from './emberContext';

// Function to generate titles using the new prompt management system
export async function generateTitlesWithOpenAI(emberData, requestType = 'multiple') {
  console.log('generateTitlesWithOpenAI called:', { emberData, requestType });
  
  try {
    // Build rich context using the specialized context builder
    const context = await emberContextBuilders.buildTitleGenerationContext(emberData);
    console.log('Final context built:', context);

    // Determine how many titles to request
    const titlesRequested = requestType === 'multiple' ? 3 : 1;
    
    // Add the number of titles to context variables
    const contextVariables = {
      context,
      titles_requested: titlesRequested,
      format_instruction: requestType === 'multiple' 
        ? 'Return 3 titles, one per line, without numbers or bullets.'
        : 'Return only the title, no additional text or formatting.'
    };

    // Execute the prompt using the new system
    const result = await executePrompt('title_generation', contextVariables);

    if (!result.success) {
      throw new Error(`Failed to generate title suggestion: ${result.error}`);
    }

    const aiResponse = result.content?.trim() || '';
    console.log('Raw AI response:', aiResponse);
    
    if (requestType === 'multiple') {
      // Parse titles more intelligently
      let titles = aiResponse.split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0)
        // Remove explanatory text lines
        .filter(line => !line.toLowerCase().includes('here are') && 
                       !line.toLowerCase().includes('suggestions') && 
                       !line.toLowerCase().includes('provide more') &&
                       !line.toLowerCase().includes('feel free') &&
                       !line.toLowerCase().includes('if you can'))
        // Clean up numbered/bulleted titles
        .map(line => {
          // Remove numbers (1., 2., etc.), bullets (•, -, *), and quotes
          return line.replace(/^\d+\.\s*/, '')           // Remove "1. "
                    .replace(/^[•\-*]\s*/, '')           // Remove "• ", "- ", "* "
                    .replace(/^["'`]/g, '')              // Remove starting quotes
                    .replace(/["'`]$/g, '')              // Remove ending quotes
                    .trim();
        })
        .filter(line => line.length > 0 && line.length < 50) // Reasonable title length
        .slice(0, 3); // Take first 3 valid titles

      console.log('Parsed titles:', titles);
      
      // Fallback if parsing failed
      if (titles.length === 0) {
        titles = ['Creative Title', 'Memorable Moment', 'Special Memory'];
      }
      
      return { 
        suggestions: titles,
        context: context,
        tokens_used: result.tokensUsed || 0
      };
    } else {
      // For single titles, also clean up
      let cleanTitle = aiResponse
        .replace(/^\d+\.\s*/, '')           // Remove "1. "
        .replace(/^[•\-*]\s*/, '')           // Remove bullets
        .replace(/^["'`]/g, '')              // Remove starting quotes
        .replace(/["'`]$/g, '')              // Remove ending quotes
        .split('\n')[0]                      // Take first line only
        .trim();
      
      if (!cleanTitle || cleanTitle.length === 0) {
        cleanTitle = 'Creative Title';
      }
      
      return { 
        suggestion: cleanTitle,
        context: context,
        tokens_used: result.tokensUsed || 0
      };
    }
  } catch (error) {
    console.error('Error in generateTitlesWithOpenAI:', error);
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