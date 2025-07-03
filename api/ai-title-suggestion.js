import { executePrompt } from '../src/lib/promptManager.js';
import { emberContextBuilders } from '../src/lib/emberContext.js';

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
    const { emberData, requestType = 'single' } = req.body;

    if (!emberData) {
      return res.status(400).json({ error: 'Ember data is required' });
    }

    // Build rich context using the specialized context builder
    const context = await emberContextBuilders.buildTitleGenerationContext(emberData);

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
      return res.status(500).json({ 
        error: 'Failed to generate title suggestion',
        details: result.error 
      });
    }

    const aiResponse = result.content?.trim() || '';
    
    if (requestType === 'multiple') {
      // Split into array of titles
      const titles = aiResponse.split('\n').filter(title => title.trim().length > 0).slice(0, 3);
      return res.status(200).json({ 
        suggestions: titles,
        context: context,
        tokens_used: result.tokensUsed || 0
      });
    } else {
      return res.status(200).json({ 
        suggestion: aiResponse,
        context: context,
        tokens_used: result.tokensUsed || 0
      });
    }

  } catch (error) {
    console.error('AI title suggestion error:', error);
    
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