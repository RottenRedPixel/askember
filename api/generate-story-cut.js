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
    const messages = [
      { role: 'system', content: styleConfig?.system_prompt || 'You are a helpful assistant.' },
      { role: 'user', content: emberContext || 'Generate a story cut.' }
    ];
    // Add user prompt template if provided
    if (styleConfig?.user_prompt_template) {
      messages.push({ role: 'user', content: styleConfig.user_prompt_template });
    }
    // Add any additional context from formData or voiceCasting if needed

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages,
      max_tokens: 2048,
      temperature: 0.7
    });

    const storyCut = completion.choices[0]?.message?.content || '';
    const tokensUsed = completion.usage?.total_tokens || 0;

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