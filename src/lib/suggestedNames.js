import { supabase } from './supabase';
import { getActivePrompt } from './database';

// Development mode function to call OpenAI directly
export async function generateTitlesWithOpenAI(emberData, requestType = 'multiple') {
  // Check if we're in development mode
  const isDevelopment = import.meta.env.DEV;
  const openaiApiKey = import.meta.env.VITE_OPENAI_API_KEY;
  
  console.log('generateTitlesWithOpenAI called:', { isDevelopment, hasApiKey: !!openaiApiKey, emberData });
  
  if (!isDevelopment || !openaiApiKey) {
    throw new Error('OpenAI direct call only available in development with API key');
  }

  // Build context from all available wiki data
  let contextParts = [];
  console.log('Building context from ember data:', emberData);
  
  // Image information
  if (emberData.image_url) {
    contextParts.push(`This is a photo analysis for creating a title.`);
  }
  
  // Location data
  if (emberData.latitude && emberData.longitude) {
    contextParts.push(`Location: ${emberData.address || `${emberData.latitude}, ${emberData.longitude}`}`);
    if (emberData.city) {
      contextParts.push(`City: ${emberData.city}`);
    }
    if (emberData.state) {
      contextParts.push(`State: ${emberData.state}`);
    }
    if (emberData.country) {
      contextParts.push(`Country: ${emberData.country}`);
    }
  }
  
  if (emberData.manual_location) {
    contextParts.push(`Manual location: ${emberData.manual_location}`);
  }
  
  // Time and date information
  if (emberData.ember_timestamp) {
    const date = new Date(emberData.ember_timestamp);
    contextParts.push(`Date taken: ${date.toLocaleDateString()}`);
    contextParts.push(`Time taken: ${date.toLocaleTimeString()}`);
  }
  
  if (emberData.manual_datetime) {
    const date = new Date(emberData.manual_datetime);
    contextParts.push(`Manual date/time: ${date.toLocaleDateString()} ${date.toLocaleTimeString()}`);
  }
  
  // Camera information
  if (emberData.camera_make && emberData.camera_model) {
    contextParts.push(`Camera: ${emberData.camera_make} ${emberData.camera_model}`);
  }
  
  // Image analysis data
  if (emberData.image_analysis) {
    contextParts.push(`Image analysis: ${emberData.image_analysis}`);
  }
  
  // Current title (if exists)
  if (emberData.title && emberData.title !== 'Untitled Ember') {
    contextParts.push(`Current title: ${emberData.title}`);
  }

  const context = contextParts.join('\n');
  console.log('Final context built:', context);
  console.log('Context parts count:', contextParts.length);
  
  // Load prompt from database (MUST be present)
  let dbPrompt = null;
  try {
    dbPrompt = await getActivePrompt('title_suggestions');
    if (!dbPrompt || !dbPrompt.system_prompt || !dbPrompt.user_prompt_template) {
      throw new Error('Title suggestion prompt not found in database. Please configure it in the admin panel.');
    }
  } catch (e) {
    throw new Error('Title suggestion prompt not found in database. Please configure it in the admin panel.');
  }

  // Build user prompt from template
  const userPrompt = dbPrompt.user_prompt_template.replace('{{context}}', context);
  const systemPrompt = dbPrompt.system_prompt;
  
  let prompt;
  if (requestType === 'multiple') {
    prompt = `Based on the following information about a photo/memory, suggest 3 creative, meaningful, and concise titles (each under 30 characters). The titles should capture the essence of the moment, location, time, or emotions. Avoid generic titles like "Perfect Moment" or "Golden Hour" unless they're truly relevant to the specific context.\n\nContext:\n${context}\n\nReturn only 3 titles, one per line, without numbers or bullets. Make them unique and specific to this particular moment/photo.`;
  } else {
    prompt = `Based on the following information about a photo/memory, suggest 1 creative, meaningful, and concise title (under 30 characters). The title should capture the essence of the moment, location, time, or emotions. Avoid generic titles unless they're truly relevant to the specific context.\n\nContext:\n${context}\n\nReturn only the title, no additional text or formatting.`;
  }
  
  console.log('Full prompt being sent to OpenAI:', prompt);

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openaiApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: systemPrompt
        },
        {
          role: 'user',
          content: userPrompt
        }
      ],
      max_tokens: 150,
      temperature: 0.8,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(`OpenAI API error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
  }

  const data = await response.json();
  const aiResponse = data.choices[0].message.content.trim();
  console.log('Raw AI response:', aiResponse);
  
  if (requestType === 'multiple') {
    // Split into array of titles
    const titles = aiResponse.split('\n').filter(title => title.trim().length > 0).slice(0, 3);
    console.log('Parsed titles:', titles);
    return { 
      suggestions: titles,
      context: context,
      tokens_used: data.usage.total_tokens
    };
  } else {
    return { 
      suggestion: aiResponse,
      context: context,
      tokens_used: data.usage.total_tokens
    };
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
      const promptKeys = [
        'title_suggestion_1',
        'title_suggestion_2',
        'title_suggestion_3',
      ];
      for (const key of promptKeys) {
        try {
          const prompt = await getActivePrompt(key);
          if (!prompt || !prompt.system_prompt || !prompt.user_prompt_template) {
            console.error(`Prompt ${key} not found or incomplete in database.`);
            continue;
          }
          // Build context as before
          let contextParts = [];
          if (emberData.image_url) contextParts.push(`This is a photo analysis for creating a title.`);
          if (emberData.latitude && emberData.longitude) {
            contextParts.push(`Location: ${emberData.address || `${emberData.latitude}, ${emberData.longitude}`}`);
            if (emberData.city) contextParts.push(`City: ${emberData.city}`);
            if (emberData.state) contextParts.push(`State: ${emberData.state}`);
            if (emberData.country) contextParts.push(`Country: ${emberData.country}`);
          }
          if (emberData.manual_location) contextParts.push(`Manual location: ${emberData.manual_location}`);
          if (emberData.ember_timestamp) {
            const date = new Date(emberData.ember_timestamp);
            contextParts.push(`Date taken: ${date.toLocaleDateString()}`);
            contextParts.push(`Time taken: ${date.toLocaleTimeString()}`);
          }
          if (emberData.manual_datetime) {
            const date = new Date(emberData.manual_datetime);
            contextParts.push(`Manual date/time: ${date.toLocaleDateString()} ${date.toLocaleTimeString()}`);
          }
          if (emberData.camera_make && emberData.camera_model) contextParts.push(`Camera: ${emberData.camera_make} ${emberData.camera_model}`);
          if (emberData.image_analysis) contextParts.push(`Image analysis: ${emberData.image_analysis}`);
          if (emberData.title && emberData.title !== 'Untitled Ember') contextParts.push(`Current title: ${emberData.title}`);
          const context = contextParts.join('\n');
          // Build user prompt from template
          const userPrompt = prompt.user_prompt_template.replace('{{context}}', context);
          const systemPrompt = prompt.system_prompt;
          // Call OpenAI
          const openaiApiKey = import.meta.env.VITE_OPENAI_API_KEY;
          const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${openaiApiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: 'gpt-4o-mini',
              messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt }
              ],
              max_tokens: 150,
              temperature: 0.8,
            }),
          });
          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error(`OpenAI API error for ${key}:`, response.status, errorData);
            continue;
          }
          const data = await response.json();
          const aiResponse = data.choices[0].message.content.trim();
          if (aiResponse) suggestedNames.push(aiResponse);
        } catch (err) {
          console.error(`Error generating title for ${key}:`, err);
        }
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
  const prompt = await getActivePrompt('let_ember_try');
  if (!prompt || !prompt.system_prompt || !prompt.user_prompt_template) {
    throw new Error('Let Ember Try prompt not found in database. Please configure it in the admin panel.');
  }
  let contextParts = [];
  if (emberData.image_url) contextParts.push(`This is a photo analysis for creating a title.`);
  if (emberData.latitude && emberData.longitude) {
    contextParts.push(`Location: ${emberData.address || `${emberData.latitude}, ${emberData.longitude}`}`);
    if (emberData.city) contextParts.push(`City: ${emberData.city}`);
    if (emberData.state) contextParts.push(`State: ${emberData.state}`);
    if (emberData.country) contextParts.push(`Country: ${emberData.country}`);
  }
  if (emberData.manual_location) contextParts.push(`Manual location: ${emberData.manual_location}`);
  if (emberData.ember_timestamp) {
    const date = new Date(emberData.ember_timestamp);
    contextParts.push(`Date taken: ${date.toLocaleDateString()}`);
    contextParts.push(`Time taken: ${date.toLocaleTimeString()}`);
  }
  if (emberData.manual_datetime) {
    const date = new Date(emberData.manual_datetime);
    contextParts.push(`Manual date/time: ${date.toLocaleDateString()} ${date.toLocaleTimeString()}`);
  }
  if (emberData.camera_make && emberData.camera_model) contextParts.push(`Camera: ${emberData.camera_make} ${emberData.camera_model}`);
  if (emberData.image_analysis) contextParts.push(`Image analysis: ${emberData.image_analysis}`);
  if (emberData.title && emberData.title !== 'Untitled Ember') contextParts.push(`Current title: ${emberData.title}`);
  const context = contextParts.join('\n');
  const userPrompt = prompt.user_prompt_template.replace('{{context}}', context);
  const systemPrompt = prompt.system_prompt;
  const openaiApiKey = import.meta.env.VITE_OPENAI_API_KEY;
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openaiApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      max_tokens: 150,
      temperature: 0.8,
    }),
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(`OpenAI API error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
  }
  const data = await response.json();
  return data.choices[0].message.content.trim();
} 