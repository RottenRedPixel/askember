import { OpenAI } from 'openai';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.OPENAI_API_KEY || process.env.VITE_OPENAI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'OpenAI API key not configured' });
  }

  const { formData, styleConfig, emberContext, voiceCasting } = req.body;

  try {
    const openai = new OpenAI({ apiKey });
    
    // Calculate approximate word count (3 words per second)
    const approximateWords = Math.round(formData.duration * 3);
    
    // Build comprehensive system prompt similar to development version
    const baseSystemPrompt = `You are an expert storyteller and scriptwriter who creates engaging audio narratives from photos, memories, and personal stories.

CRITICAL ACCURACY REQUIREMENTS:
- Use ONLY the information provided in the ember context
- DO NOT invent, fabricate, or make up any names, places, dates, events, or details
- DO NOT create fictional characters or relationships not mentioned in the context
- If information is missing, acknowledge it rather than inventing it
- Stick strictly to the facts and details actually provided
- When the context is limited, focus on the general atmosphere and emotions rather than specific fabricated details

Your task is to create a compelling audio story script with two distinct voices:
1. An Ember Voice - represents the memory/moment itself or a character within it
2. A Narrator Voice - provides context, transitions, and storytelling structure

The story should feel authentic, emotionally resonant, and true to the provided information. Focus on creating an engaging narrative that brings the memory to life without adding fictional elements.`;

    const systemPrompt = `${baseSystemPrompt}

STYLE: ${styleConfig.name}
STYLE INSTRUCTIONS: ${styleConfig.systemPrompt}

VOICE CASTING:
- Ember Voice (${styleConfig.emberVoiceRole}): ${voiceCasting.ember?.name || 'Selected Voice'} (${voiceCasting.ember?.labels?.gender || 'Unknown'})
- Narrator Voice (${styleConfig.narratorVoiceRole}): ${voiceCasting.narrator?.name || 'Selected Voice'} (${voiceCasting.narrator?.labels?.gender || 'Unknown'})

SELECTED CONTRIBUTORS: ${voiceCasting.contributors?.map(u => `${u.name} (${u.role})`).join(', ') || 'None selected'}

VOICE INSTRUCTIONS: ${styleConfig.voiceInstructions}

You must create content that makes use of the voice casting and involves the selected contributors in the storytelling when appropriate. Return ONLY valid JSON with the exact structure specified.`;

    // Build comprehensive user prompt
    const userPrompt = `Create a ${formData.duration}-second ${styleConfig.name.toLowerCase()} style story cut for this photo/memory:

STORY INFORMATION:
Title: "${formData.title}"
Style: ${styleConfig.name} - ${styleConfig.description}
Duration: ${formData.duration} seconds (approximately ${approximateWords} words)
Story Focus: ${formData.focus || 'General storytelling approach'}

EMBER CONTEXT:
${emberContext}

VOICE INSTRUCTIONS:
${styleConfig.voiceInstructions}

REQUIREMENTS:
- Target exactly ${formData.duration} seconds of content (approximately ${approximateWords} words)
- Follow ${styleConfig.name.toLowerCase()} style: ${styleConfig.description}
- Use ONLY the specific details provided in the ember context above
- DO NOT invent any names, places, events, or details not explicitly mentioned
- ${formData.focus ? `Focus specifically on: ${formData.focus}` : 'Create engaging narrative flow'}
- Assign appropriate lines to ember voice vs narrator voice
- Make use of selected contributors: ${voiceCasting.contributors?.map(u => u.name).join(', ') || 'Focus on the image content and provided context only'}
- If the context is limited, create atmosphere and emotion rather than fictional specifics

OUTPUT FORMAT:
Return a JSON object with this exact structure:
{
  "title": "Engaging title for this story cut",
  "duration": ${formData.duration},
  "style": "${formData.style}",
  "wordCount": ${approximateWords},
  "script": {
    "fullScript": "Complete narration script as one continuous piece of text",
    "emberVoiceLines": ["First line spoken by the ember voice", "Second line spoken by the ember voice"],
    "narratorVoiceLines": ["First line spoken by the narrator", "Second line spoken by the narrator"]
  },
  "voiceCasting": {
    "emberVoice": "${voiceCasting.ember?.name || 'Selected Voice'}",
    "narratorVoice": "${voiceCasting.narrator?.name || 'Selected Voice'}",
    "contributors": ${JSON.stringify(voiceCasting.contributors || [])}
  },
  "metadata": {
    "focus": "${formData.focus || ''}",
    "emberTitle": "${formData.title}",
    "generatedAt": "${new Date().toISOString()}"
  }
}`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      max_tokens: 2000,
      temperature: 0.8,
      response_format: { type: "json_object" }
    });

    const storyCut = completion.choices[0]?.message?.content || '';
    const tokensUsed = completion.usage?.total_tokens || 0;

    // Validate that we got valid JSON before returning
    try {
      JSON.parse(storyCut);
    } catch (parseError) {
      console.error('OpenAI returned invalid JSON:', storyCut);
      throw new Error('OpenAI returned invalid JSON response');
    }

    return res.status(200).json({
      success: true,
      data: storyCut,
      tokensUsed
    });
  } catch (error) {
    console.error('Error generating story cut:', error);
    return res.status(500).json({ error: error.message || 'Failed to generate story cut' });
  }
} 