import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

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

  // Verify OpenAI API key is available
  if (!process.env.OPENAI_API_KEY) {
    console.error('❌ OPENAI_API_KEY environment variable not set');
    return res.status(500).json({ 
      error: 'OpenAI configuration error',
      details: 'API key not configured on server' 
    });
  }

  try {
    const { emberData, requestType = 'single' } = req.body;

    if (!emberData) {
      return res.status(400).json({ error: 'Ember data is required' });
    }

    // Build context from all available wiki data
    let contextParts = [];
    
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
    
    let prompt;
    if (requestType === 'multiple') {
      prompt = `Based on the following information about a photo/memory, suggest 3 creative, meaningful, and concise titles (each under 30 characters). The titles should capture the essence of the moment, location, time, or emotions. Avoid generic titles like "Perfect Moment" or "Golden Hour" unless they're truly relevant to the specific context.

Context:
${context}

Return only 3 titles, one per line, without numbers or bullets. Make them unique and specific to this particular moment/photo.`;
    } else {
      prompt = `Based on the following information about a photo/memory, suggest 1 creative, meaningful, and concise title (under 30 characters). The title should capture the essence of the moment, location, time, or emotions. Avoid generic titles unless they're truly relevant to the specific context.

Context:
${context}

Return only the title, no additional text or formatting.`;
    }

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are an expert at creating meaningful, creative titles for photos and memories. You analyze context and create titles that capture the essence of the moment.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: 150,
      temperature: 0.8,
    });

    const aiResponse = completion.choices[0].message.content.trim();
    
    if (requestType === 'multiple') {
      // Split into array of titles
      const titles = aiResponse.split('\n').filter(title => title.trim().length > 0).slice(0, 3);
      return res.status(200).json({ 
        suggestions: titles,
        context: context,
        tokens_used: completion.usage.total_tokens
      });
    } else {
      return res.status(200).json({ 
        suggestion: aiResponse,
        context: context,
        tokens_used: completion.usage.total_tokens
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