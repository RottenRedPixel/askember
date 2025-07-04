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

  const { imageUrl, emberId } = req.body;

  if (!imageUrl || !emberId) {
    return res.status(400).json({ error: 'Missing required parameters: imageUrl and emberId' });
  }

  // OpenAI configuration is now handled by the prompt management system

  try {
    console.log('🔍 Starting deep image analysis for ember:', emberId);

    // Build comprehensive ember context
    const emberContext = await emberContextBuilders.forImageAnalysis(emberId);
    
    // Execute the image analysis prompt with context and image
    const result = await executePrompt('image_analysis_comprehensive', {
      ember_context: emberContext,
      image_url: imageUrl,
      image_detail: 'high'
    }, emberId);

    if (!result.success) {
      throw new Error(result.error);
    }

    const analysis = result.content;
    
    console.log('✅ Image analysis completed using prompt system');
    console.log('📊 Analysis length:', analysis.length, 'characters');
    console.log('🔧 Model used:', result.model);
    console.log('📈 Tokens used:', result.tokensUsed);

    return res.status(200).json({
      success: true,
      analysis,
      emberId,
      imageUrl,
      timestamp: new Date().toISOString(),
      model: result.model,
      tokensUsed: result.tokensUsed,
      promptKey: result.promptKey
    });

  } catch (error) {
    console.error('❌ Image analysis error:', error);
    
    // Handle different types of errors from the prompt system
    if (error.message.includes('quota')) {
      return res.status(429).json({ 
        error: 'OpenAI quota exceeded',
        details: 'The OpenAI API quota has been exceeded. Please check your billing.'
      });
    }
    
    if (error.message.includes('API key')) {
      return res.status(401).json({ 
        error: 'Invalid OpenAI API key',
        details: 'The OpenAI API key is invalid or missing.'
      });
    }

    if (error.message.includes('No active prompt found')) {
      return res.status(503).json({ 
        error: 'Image analysis service unavailable',
        details: 'No active image analysis prompt configured. Please contact administrator.'
      });
    }

    return res.status(500).json({ 
      error: 'Failed to analyze image',
      details: error.message 
    });
  }
} "// Environment variables updated" 
