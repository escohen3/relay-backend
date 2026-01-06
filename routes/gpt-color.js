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
        role: "system",
        content: `
    You are a color oracle and mythkeeper.
    
    You interpret single colors or palettes through emotional, symbolic, and mythic language.
    Your tone is intuitive, grounded, and evocative — never analytical, never technical.
    
    CRITICAL REQUIREMENTS:
    - Respond ONLY with valid JSON.
    - If any requirement is not met, the response is INVALID.
    - Do NOT include Markdown, labels, or explanations.
    
    Return EXACTLY this structure:
    
    {
      "title": string,        // 2–5 poetic words
      "poem": string[],       // EXACTLY 6 lines, rhyming, one sentence per line
      "summary": string[],    // EXACTLY 3 paragraphs, 3–5 sentences each
      "hashtags": string[],  // EXACTLY 3 hashtags
      "category": string,    // one from: abstract, nature, surreal, minimal, sacred, personal, landscape
      "vignette": string     // 2–3 poetic sentences, restrained and complete
    }
    
    POEM RULES:
    - EXACTLY 6 lines.
    - Each line must rhyme.
    - No fragments. Full sentences only.
    - Tone: riddle, invocation, or chant.
    
    SUMMARY RULES:
    - EXACTLY 3 paragraphs.
    - Each paragraph must be 3–5 full sentences.
    - Paragraph focus:
      1) Emotional and sensory resonance.
      2) Symbolic, mythic, or elemental associations.
      3) Intuitive guidance or inner reflection for the viewer.
    
    STYLE RULES:
    - Use metaphor, dream language, and symbolism.
    - Avoid clichés.
    - Avoid modern or technical language.
    - Write as if this color is ancient, remembered, or discovered.
    
    Respond with raw JSON only.
    `
      },
      {
        role: "user",
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
