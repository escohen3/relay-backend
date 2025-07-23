import express from 'express';
import dotenv from 'dotenv';
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

dotenv.config();
const router = express.Router();
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

router.post('/', async (req, res) => {
  const { hex, palette } = req.body;

  if (!hex && (!palette || !Array.isArray(palette))) {
    return res.status(400).json({ error: 'Missing hex or palette' });
  }

  const colorInput = palette?.length
    ? `PALETTE: ${palette.join(', ')}`
    : `COLOR: ${hex}`;

  const messages = [
    {
      role: 'system',
      content: `You are a poetic metadata engine that interprets colors and palettes.

Your job is to return symbolic, mythic, and emotional interpretations — like a color oracle. 
Respond ONLY with valid JSON — no Markdown, no explanation.

Return:
{
  "title": "2–5 word poetic title",
  "poem": "a six line poem that rhymes, a riddle in tone. Delivered in 6 distinct lines.",
  "summary": [
    "Paragraph 1: Emotional resonance or mood of the color/palette.",
    "Paragraph 2: Symbolic or mythological associations.",
    "Paragraph 3: Intuitive reflection for the viewer."
  ],
  "hashtags": ["#emotion", "#symbol", "#mood"],
  "category": "abstract / nature / surreal / minimal / sacred / personal / landscape",
  "vignette": "A short poetic vignette inspired by the color(s)."
}

Rules:
- Use metaphor, dream language, and symbolism.
- Each summary item should be one paragraph — not a heading.
- Never use 'Title:', 'Description:', or any non-JSON wrapping.
- Respond with raw JSON only. Do NOT use code blocks or Markdown formatting.
`
    },
    {
      role: 'user',
      content: colorInput
    }
  ];

  try {
    const gptResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        temperature: 0.7,
        messages,
      }),
    });

    const contentType = gptResponse.headers.get('content-type');
    if (!contentType?.includes('application/json')) {
      const raw = await gptResponse.text();
      console.error('❌ GPT Non-JSON Response:', raw.slice(0, 500));
      return res.status(500).json({ error: 'GPT returned non-JSON', raw });
    }

    const data = await gptResponse.json();
    let content = data.choices?.[0]?.message?.content || '{}';

    if (content.startsWith('```')) {
      content = content.replace(/^```(?:json)?\n?/, '').replace(/```$/, '').trim();
    }

    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch (err) {
      console.error('❌ Failed to parse GPT JSON:', content);
      return res.status(500).json({ error: 'Invalid GPT response', raw: content });
    }

    res.json(parsed);
  } catch (err) {
    console.error('🔥 GPT Color Proxy Error:', err.message);
    res.status(500).json({ error: 'GPT request failed', message: err.message });
  }
});

export default router;
