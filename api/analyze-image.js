import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client for database access
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase configuration');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

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

// Template variable replacement function (copied from promptManager.js)
function replaceVariables(text, variables) {
  if (!text) return '';
  
  let result = text;
  
  // Replace standard variables like {{variable_name}}
  Object.entries(variables).forEach(([key, value]) => {
    const regex = new RegExp(`{{${key}}}`, 'g');
    result = result.replace(regex, value || '');
  });
  
  return result;
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

  const { imageUrl, emberId } = req.body;

  if (!imageUrl || !emberId) {
    return res.status(400).json({ error: 'Missing required parameters: imageUrl and emberId' });
  }

  try {
    console.log('🔍 Starting image analysis for ember:', emberId);
    console.log('📸 Image URL:', imageUrl.substring(0, 100) + '...');

    // Check for OpenAI API key
    const openaiApiKey = process.env.OPENAI_API_KEY;
    if (!openaiApiKey) {
      console.error('❌ Missing OpenAI API key');
      return res.status(500).json({ 
        error: 'Server configuration error',
        details: 'OpenAI API key not configured'
      });
    }

    // PHASE 1: Use database-driven prompt instead of hardcoded
    console.log('🔍 [PHASE 1] Loading database prompt...');
    const prompt = await getActivePrompt('image_analysis_comprehensive');
    
    if (!prompt) {
      throw new Error('No active prompt found for image_analysis_comprehensive');
    }
    
    console.log('✅ [PHASE 1] Database prompt loaded:', prompt.name);
    console.log('📝 [PHASE 1] Prompt model:', prompt.model);
    console.log('📝 [PHASE 1] Prompt max_tokens:', prompt.max_tokens);

    // Prepare template variables (basic for Phase 1)
    const variables = {
      ember_context: `Ember ID: ${emberId}`, // Basic context for Phase 1
      image_url: imageUrl
    };

    // Use the database prompt template
    const promptText = replaceVariables(prompt.user_prompt_template, variables);
    console.log('📝 [PHASE 1] Using database prompt template (length:', promptText.length, 'chars)');

    // Database-driven OpenAI API call (using prompt configuration)
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: prompt.model || 'gpt-4o',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: promptText
              },
              {
                type: 'image_url',
                image_url: {
                  url: imageUrl,
                  detail: 'high'
                }
              }
            ]
          }
        ],
        max_tokens: prompt.max_tokens || 1000,
        temperature: prompt.temperature || 0.3
      })
    });

    if (!openaiResponse.ok) {
      const errorData = await openaiResponse.json().catch(() => ({}));
      console.error('❌ OpenAI API error:', openaiResponse.status, errorData);
      
      if (openaiResponse.status === 401) {
        return res.status(401).json({ 
          error: 'Invalid OpenAI API key',
          details: 'The OpenAI API key is invalid or missing.'
        });
      } else if (openaiResponse.status === 429) {
        return res.status(429).json({ 
          error: 'OpenAI quota exceeded',
          details: 'The OpenAI API quota has been exceeded. Please check your billing.'
        });
      } else {
        return res.status(500).json({ 
          error: 'OpenAI API error',
          details: errorData.error?.message || `API returned ${openaiResponse.status}`
        });
      }
    }

    const openaiResult = await openaiResponse.json();
    const analysis = openaiResult.choices[0]?.message?.content;

    if (!analysis) {
      throw new Error('No analysis content received from OpenAI');
    }
    
    console.log('✅ Image analysis completed');
    console.log('📊 Analysis length:', analysis.length, 'characters');
    console.log('🔧 Model used:', openaiResult.model);
    console.log('📈 Tokens used:', openaiResult.usage?.total_tokens || 0);
    console.log('🎯 [PHASE 1] Used database prompt:', prompt.name);

    return res.status(200).json({
      success: true,
      analysis,
      emberId,
      imageUrl,
      timestamp: new Date().toISOString(),
      model: openaiResult.model,
      tokensUsed: openaiResult.usage?.total_tokens || 0
    });

  } catch (error) {
    console.error('❌ Image analysis error:', error);
    console.error('❌ Error stack:', error.stack);
    
    return res.status(500).json({ 
      error: 'Failed to analyze image',
      details: error.message 
    });
  }
} 
