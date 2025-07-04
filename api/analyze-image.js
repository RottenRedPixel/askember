import { executePrompt } from '../src/lib/promptManager.js';
import { emberContextBuilders } from '../src/lib/emberContext.js';

export default async function handler(req, res) {
  // Add comprehensive CORS headers for mobile compatibility
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, User-Agent');
  res.setHeader('Access-Control-Max-Age', '86400'); // 24 hours
  
  // Add mobile-specific headers
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { imageUrl, emberId } = req.body;
  
  // Enhanced request logging for mobile debugging
  const userAgent = req.headers['user-agent'] || '';
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
  
  console.log('🚀 [API] Image analysis request received:', {
    emberId,
    imageUrl: imageUrl?.substring(0, 50) + '...',
    isMobile,
    userAgent: userAgent.substring(0, 100) + '...'
  });

  if (!imageUrl || !emberId) {
    console.error('❌ [API] Missing required parameters');
    return res.status(400).json({ 
      error: 'Missing required parameters: imageUrl and emberId',
      details: 'Both imageUrl and emberId are required for image analysis'
    });
  }

  try {
    console.log('🔍 [API] Starting deep image analysis for ember:', emberId);

    // Build comprehensive ember context
    const emberContext = await emberContextBuilders.forImageAnalysis(emberId);
    
    if (!emberContext) {
      console.error('❌ [API] Failed to build ember context');
      return res.status(404).json({ 
        error: 'Ember not found',
        details: 'Unable to find ember data for analysis'
      });
    }
    
    console.log('✅ [API] Ember context built successfully');
    
    // Execute the image analysis prompt with context and image
    const result = await executePrompt('image_analysis_comprehensive', {
      ember_context: emberContext,
      image_url: imageUrl,
      image_detail: 'high'
    }, emberId);

    if (!result.success) {
      console.error('❌ [API] Prompt execution failed:', result.error);
      throw new Error(result.error);
    }

    const analysis = result.content;
    
    console.log('✅ [API] Image analysis completed successfully:', {
      analysisLength: analysis.length,
      model: result.model,
      tokensUsed: result.tokensUsed,
      isMobile
    });

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
    console.error('❌ [API] Image analysis error:', {
      error: error.message,
      stack: error.stack?.substring(0, 500),
      isMobile,
      emberId
    });
    
    // Handle different types of errors from the prompt system
    if (error.message.includes('quota') || error.message.includes('rate_limit')) {
      return res.status(429).json({ 
        error: 'Service temporarily unavailable',
        details: 'Too many requests. Please try again in a few minutes.'
      });
    }
    
    if (error.message.includes('API key') || error.message.includes('authentication')) {
      return res.status(401).json({ 
        error: 'Authentication error',
        details: 'Service configuration issue. Please contact support.'
      });
    }

    if (error.message.includes('No active prompt found')) {
      return res.status(503).json({ 
        error: 'Service temporarily unavailable',
        details: 'Image analysis service is being updated. Please try again shortly.'
      });
    }
    
    if (error.message.includes('timeout') || error.message.includes('ECONNRESET')) {
      return res.status(504).json({ 
        error: 'Request timeout',
        details: isMobile ? 'Mobile network timeout. Please check your connection and try again.' : 'Request timed out. Please try again.'
      });
    }

    // Generic error response
    return res.status(500).json({ 
      error: 'Analysis failed',
      details: isMobile ? 'Mobile analysis failed. Please ensure you have a stable internet connection and try again.' : 'Unable to analyze image. Please try again.'
    });
  }
} 
