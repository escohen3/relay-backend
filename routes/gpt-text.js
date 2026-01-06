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
      role: "system",
      content: `
  You are a metadata engine for a visual archive.
  
  You analyze a short input text and return structured metadata intended for long-term archival use.
  This is NOT a poem. This is NOT a caption.
  The output must read like a short analytical essay written in grounded, reflective prose.
  
  CRITICAL REQUIREMENTS:
  - If any requirement below is not met, the response is INVALID.
  
  Return ONLY valid JSON with this structure:
  
  {
    "title": string,          // 2–5 words, restrained
    "summary": string,        // EXACTLY 3 paragraphs, 4–6 sentences each
    "category": string,       // one word or short phrase
    "hashtags": string[],     // EXACTLY 3 items, include leading #
    "vignette": string|null   // optional; if present, 2–3 sentences
  }
  
  TITLE RULES:
  - 2–5 words max.
  - Poetic is fine, but keep it concrete. No mystical vagueness.
  
  SUMMARY RULES (MOST IMPORTANT):
  - EXACTLY 3 paragraphs.
  - Each paragraph MUST contain 4–6 full sentences.
  - Total sentence count MUST be between 12 and 18.
  - One-sentence paragraphs are INVALID.
  - Aphorisms, fragments, or lyrical compression are INVALID.
  - Write like a calm, clear essay meant to be useful later.
  
  Paragraph intent:
  1) Identification
     Describe what the text is, what it addresses, and its tone.
     Stay close to what is actually present in the input.
  
  2) Function & context
     Explain what this text is doing (note, idea draft, instruction, reflection, log, etc).
     Describe the kind of situation or practice it reflects and how it might be used.
  
  3) Archival implications
     Explain why this might matter later.
     What it preserves, what it signals about the moment, and what future questions it enables.
  
  CATEGORY RULES:
  - Choose one short phrase that helps filing (examples: "note", "draft", "quote", "spec", "reflection", "log", "copy", "code", "prompt", "research").
  
  HASHTAG RULES:
  - Exactly 3 hashtags.
  - Grounded and specific. Avoid generic tags.
  - No #technology.
  
  VIGNETTE RULES (OPTIONAL):
  - Either null OR 2–3 restrained sentences.
  - No metaphor stacking. No abstraction loops. Keep it human and grounded.
  
  STYLE RULES:
  - Full prose.
  - Concrete language.
  - No poetry formatting.
  - No line breaks inside paragraphs except the paragraph breaks.
  - Do not invent facts, sources, or authors.
  - If the input is too thin to classify confidently, say so plainly and lower confidence by being cautious in wording.
  
  Respond ONLY with valid JSON.
  No markdown. No commentary. No code fences.
  `.trim()
    },
    {
      role: "user",
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
