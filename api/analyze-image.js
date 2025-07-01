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

  const { imageUrl, emberId } = req.body;

  if (!imageUrl || !emberId) {
    return res.status(400).json({ error: 'Missing required parameters: imageUrl and emberId' });
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
    console.log('🔍 Starting deep image analysis for ember:', emberId);

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Please perform a comprehensive analysis of this image. Provide detailed information about:

PEOPLE & DEMOGRAPHICS:
- Number of people visible
- Estimated age ranges (child, teen, adult, elderly)
- Gender identification (if clearly apparent)
- Ethnic diversity (if apparent)
- Facial expressions and emotions
- Body language and posture
- Relationships between people (family, friends, romantic, etc.)

CLOTHING & STYLE:
- Detailed clothing descriptions
- Fashion style (casual, formal, vintage, modern, etc.)
- Colors and patterns
- Accessories (jewelry, hats, bags, etc.)
- Seasonal appropriateness

ENVIRONMENT & SETTING:
- Indoor vs outdoor location
- Specific venue type (home, restaurant, park, office, etc.)
- Architecture and design elements
- Weather conditions (if outdoor)
- Lighting conditions (natural, artificial, etc.)
- Background elements and details

OBJECTS & ITEMS:
- All visible objects and items
- Technology/devices present
- Furniture and decorations
- Food and drinks
- Transportation visible
- Tools or equipment

ACTIVITIES & CONTEXT:
- What activity is taking place
- Event type (celebration, work, leisure, etc.)
- Interaction patterns
- Gestures and movements
- Social dynamics

TEXT & SIGNAGE:
- Any readable text in the image
- Signs, labels, or writing
- Brand names or logos
- Street signs or location indicators

ARTISTIC & TECHNICAL:
- Photo composition and angle
- Quality and clarity
- Color palette and mood
- Artistic style or filters applied
- Professional vs casual photography

CULTURAL & TEMPORAL:
- Time period indicators
- Cultural elements or traditions
- Historical context clues
- Regional characteristics

Please be thorough, descriptive, and observant. Format your response as a structured analysis covering all these areas systematically.`
            },
            {
              type: "image_url",
              image_url: {
                url: imageUrl,
                detail: "high"
              }
            }
          ]
        }
      ],
      max_tokens: 4000,
      temperature: 0.3, // Lower temperature for more consistent, factual analysis
    });

    const analysis = response.choices[0].message.content;
    
    console.log('✅ OpenAI image analysis completed');
    console.log('📊 Analysis length:', analysis.length, 'characters');

    return res.status(200).json({
      success: true,
      analysis,
      emberId,
      imageUrl,
      timestamp: new Date().toISOString(),
      model: "gpt-4o",
      tokensUsed: response.usage?.total_tokens || 0
    });

  } catch (error) {
    console.error('❌ OpenAI image analysis error:', error);
    
    // Handle different types of errors
    if (error.code === 'insufficient_quota') {
      return res.status(429).json({ 
        error: 'OpenAI quota exceeded',
        details: 'The OpenAI API quota has been exceeded. Please check your billing.'
      });
    }
    
    if (error.code === 'invalid_api_key') {
      return res.status(401).json({ 
        error: 'Invalid OpenAI API key',
        details: 'The OpenAI API key is invalid or missing.'
      });
    }

    return res.status(500).json({ 
      error: 'Failed to analyze image',
      details: error.message 
    });
  }
} "// Environment variables updated" 
