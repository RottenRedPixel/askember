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

    // Simple direct OpenAI API call
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Analyze this image in detail. Describe what you see, including people, objects, setting, mood, activities, and any notable details. Be comprehensive and thoughtful.'
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
        max_tokens: 1000
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
