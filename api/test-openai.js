import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default async function handler(req, res) {
  // Add CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // Test 1: Check if API key exists
    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({ 
        error: 'OPENAI_API_KEY not found in environment variables',
        test: 'api_key_check',
        success: false
      });
    }

    // Test 2: Try a simple OpenAI call
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: "Say 'OpenAI connection test successful'" }],
      max_tokens: 50,
      timeout: 10000
    });

    return res.status(200).json({
      success: true,
      test: 'openai_connection',
      response: response.choices[0].message.content,
      model: response.model,
      tokens: response.usage.total_tokens
    });

  } catch (error) {
    console.error('OpenAI test error:', error);
    
    return res.status(500).json({
      success: false,
      test: 'openai_connection',
      error: error.message,
      code: error.code,
      type: error.type,
      statusCode: error.status
    });
  }
} 