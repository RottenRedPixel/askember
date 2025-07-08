import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client for database access
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase configuration');
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Database function: Get active prompt by key (copied from database.js)
async function getActivePrompt(promptKey) {
  try {
    console.log('🔍 [API] Getting active prompt:', promptKey);
    
    const { data, error } = await supabase
      .rpc('get_active_prompt', { prompt_key_param: promptKey });

    if (error) {
      throw new Error(error.message);
    }

    const result = data && data.length > 0 ? data[0] : null;
    console.log('✅ [API] Active prompt retrieved:', result ? 'Found' : 'Not found');
    return result;
  } catch (error) {
    console.error('❌ [API] getActivePrompt failed:', error);
    throw error;
  }
}

// Template function: Replace variables in template (copied from promptManager.js)
function replaceVariables(template, variables) {
  if (!template || !variables) return template;
  
  let result = template;
  Object.keys(variables).forEach(key => {
    const value = variables[key];
    const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
    result = result.replace(regex, value || '');
  });
  
  return result;
}

// Enhanced context builder: Build rich title generation context with wiki data
async function buildTitleGenerationContext(emberData) {
  try {
    console.log('🔍 [API] Building rich title generation context for ember:', emberData.id);
    
    // Use the rich context builder from emberContext.js if available
    let contextText = '';
    
    try {
      // Import the rich context builder
      const emberContextModule = await import('../src/lib/emberContext.js');
      const context = await emberContextModule.buildEmberContext(emberData.id);
      contextText = emberContextModule.formatEmberContextForAI(context, {
        includeSystemInfo: true,
        includeMetadata: true,
        includeNarrative: true,
        includeMediaDetails: true,
        includePeopleDetails: true,
        maxStoryLength: 3000
      });
      
      console.log('✅ [API] Rich context built successfully');
      console.log('🔍 [API] Context length:', contextText.length, 'characters');
      
    } catch (richContextError) {
      console.error('❌ [API] Rich context builder failed:', richContextError.message);
      console.log('🔍 [API] Returning fallback title instead of basic context');
      
      // Don't use basic context - return fallback title instead
      throw new Error('Rich context failed - using fallback title');
    }
    
    return contextText;
  } catch (error) {
    console.error('❌ [API] buildTitleGenerationContext failed:', error);
    throw error;
  }
}

export default async function handler(req, res) {
  // Add CORS headers for mobile compatibility
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { emberData, type = 'single' } = req.body;
    const requestType = type; // Frontend sends 'type', normalize to requestType

    if (!emberData) {
      return res.status(400).json({ error: 'Ember data is required' });
    }

    console.log('🔍 [API] Loading database prompt for title generation...');
    
    // Use different prompts for single vs multiple title generation
    const promptKey = requestType === 'single' 
      ? 'title_generation_single'    // For "Let Ember Try" 
      : 'title_generation_creative'; // For multiple suggestions
    
    console.log('🔍 [API] Using prompt key:', promptKey, 'for request type:', requestType);
    
    // Get the active prompt from database
    let prompt = await getActivePrompt(promptKey);
    
    // Fallback to creative prompt if single prompt doesn't exist yet
    if (!prompt && requestType === 'single') {
      console.log('⚠️ [API] Single title prompt not found, falling back to creative prompt');
      prompt = await getActivePrompt('title_generation_creative');
    }
    
    if (!prompt) {
      throw new Error('Title generation prompt not found in database');
    }

    console.log('✅ [API] Database prompt loaded:', prompt.name);

    // Build rich context using the specialized context builder
    const context = await buildTitleGenerationContext(emberData);

    // Determine how many titles to request
    const titlesRequested = requestType === 'multiple' ? 3 : 1;
    
    // Build context variables to match template expectations
    const contextVariables = {
      ember_context: context  // Template expects {{ember_context}}
    };

    // Replace variables in the prompt template
    const promptText = replaceVariables(prompt.user_prompt_template, contextVariables);

    console.log('🔍 [API] Final prompt being sent to OpenAI:');
    console.log(promptText);
    console.log('🔍 [API] Request type:', requestType);
    console.log('🔍 [API] Calling OpenAI with database prompt...');

    // Call OpenAI API directly
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: prompt.model || 'gpt-4o',
        messages: [
          {
            role: 'user',
            content: promptText
          }
        ],
        max_tokens: prompt.max_tokens || 1000,
        temperature: prompt.temperature || 0.3,
      }),
    });

    if (!openaiResponse.ok) {
      const errorData = await openaiResponse.json();
      throw new Error(errorData.error?.message || 'OpenAI API call failed');
    }

    const openaiData = await openaiResponse.json();
    const aiResponse = openaiData.choices[0]?.message?.content?.trim() || '';

    console.log('✅ [API] OpenAI response received');
    console.log('🔍 [API] Raw AI response:', aiResponse);
    console.log('🔍 [API] Used database prompt:', prompt.name);
    console.log('🔍 [API] Model:', prompt.model);
    console.log('🔍 [API] Tokens used:', openaiData.usage?.total_tokens);
    
    if (requestType === 'multiple') {
      // Split into array of titles and clean them up
      let titles = aiResponse.split('\n')
        .filter(title => title.trim().length > 0)
        .map(title => {
          // Remove numbers, bullets, and extra whitespace
          return title.replace(/^\d+\.?\s*/, '').replace(/^[-•*]\s*/, '').trim();
        })
        .filter(title => title.length > 0);
      
      console.log('🔍 [API] Parsed titles:', titles);
      
      // Take up to 5 titles as the prompt suggests, but at least 3
      titles = titles.slice(0, 5);
      
      return res.status(200).json({ 
        suggestions: titles,
        context: context,
        tokens_used: openaiData.usage?.total_tokens || 0
      });
    } else {
      return res.status(200).json({ 
        suggestion: aiResponse,
        context: context,
        tokens_used: openaiData.usage?.total_tokens || 0
      });
    }

  } catch (error) {
    console.error('❌ [API] Title suggestion error:', error);
    
    // If rich context failed or other errors, return obvious fallback
    if (error.message.includes('Rich context failed') || error.message.includes('buildTitleGenerationContext')) {
      console.log('🔍 [API] Returning fallback due to context failure');
      if (requestType === 'single') {
        return res.status(200).json({ 
          suggestion: 'Title 4',
          context: '',
          tokens_used: 0
        });
      } else {
        return res.status(200).json({ 
          suggestions: ['Title 1', 'Title 2', 'Title 3'],
          context: '',
          tokens_used: 0
        });
      }
    }
    
    if (error.code === 'insufficient_quota') {
      return res.status(429).json({ 
        error: 'OpenAI API quota exceeded. Please try again later.' 
      });
    }
    
    if (error.code === 'invalid_api_key') {
      return res.status(401).json({ 
        error: 'Invalid OpenAI API key.' 
      });
    }
    
    return res.status(500).json({ 
      error: 'Failed to generate title suggestion',
      details: error.message 
    });
  }
} 