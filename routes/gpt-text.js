// KEEP THIS IN gpt-text.js
import express from 'express';
import dotenv from 'dotenv';
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

dotenv.config();
const router = express.Router();
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// POST route for GPT metadata
router.post('/', async (req, res) => {
  const inputText = req.body.text;
  if (!inputText) return res.status(400).json({ error: 'Missing input text' });

  const messages = [
    {
      role: 'system',
      content: `You are a metadata engine for a visual archive.

You analyze a short input text and return structured metadata to help humans reflect more deeply.

Return:

- A poetic title (2–5 words max)
- A three-line abstract poem (array of 3 strings)
- A list of three symbolic summary insights (each should be 1 sentence, **written as a single string**)
- A category (one word or short phrase)
- Three hashtags (emotional or symbolic, no #technology)
- A "vignette" — a single, timeless paragraph written in the Ridgehouse voice.

Guidelines:
- Use rich language, metaphor, and rhythm.
- Each summary item should read symbolic, insightful, clever, or philosophical.
- Stay grounded in the content but let tone and abstraction elevate the language.

FORMAT:
Respond ONLY with valid JSON. Do NOT explain, wrap in Markdown, or use code blocks. Return ONLY raw JSON like this:

{
  "title": "2–5 word poetic title",
  "poem": ["line 1", "line 2", "line 3"],
  "summary": [
    "Paragraph 1 insight here. Two short sentences, not a heading.",
    "Paragraph 2 insight. Another dimension of the same theme.",
    "Paragraph 3 insight. End with a broader truth, tension, or question."
  ],
  "hashtags": ["#symbol", "#feeling", "#concept"],
  "category": "story / design / science / media / memory / poetry",
  "vignette": "Short poetic reflection in Ridgehouse tone. One paragraph, graceful and elegant."
}`
    },
    {
      role: 'user',
      content: `INPUT:\n"""${inputText}"""`
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
    console.error('🔥 GPT Text Proxy Error:', err.message);
    res.status(500).json({ error: 'GPT request failed', message: err.message });
  }
});

export default router;
