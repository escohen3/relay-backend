import express from 'express';
import dotenv from 'dotenv';
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

dotenv.config();
const router = express.Router();
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

router.post('/', async (req, res) => {
  try {
    const imageUrl = req.body.imagePrompt;

    if (!imageUrl || typeof imageUrl !== 'string' || !imageUrl.startsWith('http')) {
      return res.status(400).json({ error: 'Invalid or missing image URL' });
    }

    const messages = [
      {
        role: "system",
        content: `
    You are a visual analysis engine for a personal archive.
    
    You examine images as evidence, artifacts, and records.
    Your task is to DESCRIBE, CLASSIFY, and CONTEXTUALIZE what is visible.
    You do NOT invent stories, characters, or emotions.
    
    CRITICAL REQUIREMENTS:
    - Respond ONLY with valid JSON.
    - No markdown, no commentary, no explanation.
    - If any requirement is violated, the response is INVALID.
    
    Return EXACTLY this structure:
    
    {
      "title": string,       
    
      "summary": string[],   
    
      "category": string,    
    
      "signals": string[],   
    
      "composition": {
        "orientation": string,
        "aspect_ratio": string,
        "dominant_elements": string[],
        "spatial_structure": string
      },
    
      "color_notes": string[],
    
      "file_observations": {
        "likely_context": string,
        "probable_use": string,
        "confidence": number
      }
    }
    
    FIELD RULES:
    
    "title"
    - 2–5 words.
    - Neutral, descriptive, archival.
    - No metaphor.
    
    "summary"
    - EXACTLY 3 paragraphs.
    - Each paragraph must be 3–5 full sentences.
    - Written as plain prose.
    - No poetic language.
    
    Paragraph intent:
    1) Surface description  
       Describe what is visible. Objects, setting, materials, light, motion, absence.
    
    2) Functional or situational context  
       Explain what kind of image this appears to be and what it might be used for.
       Reference cues without speculation.
    
    3) Archival relevance  
       Explain why this image might matter later.
       What it preserves, documents, or signals about a moment or process.
    
    "category"
    - Single short phrase (e.g. "interface", "environment", "object", "document", "portrait", "diagram")
    
    "signals"
    - 4–8 short phrases capturing notable traits or cues
    - Example: ["low light", "interior space", "human absence", "designed object"]
    
    "composition"
    - orientation: portrait / landscape / square
    - aspect_ratio: simplified ratio (e.g. 16:9, 4:3, 1:1)
    - dominant_elements: list of 3–6 visible components
    - spatial_structure: how space is organized or framed
    
    "color_notes"
    - Concrete observations only
    - No symbolism
    - Example: ["muted palette", "warm highlights", "dominant neutral tones"]
    
    "file_observations"
    - likely_context: where or how this image was probably produced
    - probable_use: documentation, reference, memory, analysis, record
    - confidence: number from 0.0 to 1.0
    
    STYLE RULES:
    - Concrete language only.
    - No metaphor.
    - No emotional projection.
    - No guessing intent beyond visual evidence.
    `
      },
      {
        role: "user",
        content: [
          { type: "text", text: "Analyze the following image." },
          { type: "image_url", image_url: { url: imageUrl } }
        ]
      }
    ];
    

    const gptResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${OPENAI_API_KEY}`,
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

    const gptData = await gptResponse.json();
    if (!gptResponse.ok) {
      console.error('❌ GPT API Error:', gptData);
      return res.status(gptResponse.status).json({ error: 'GPT API failure', gptData });
    }

    let content = gptData.choices?.[0]?.message?.content || '{}';
    if (content.startsWith('```')) {
      content = content.replace(/^```(?:json)?\n?/, '').replace(/```$/, '').trim();
    }

    let metadata;
    try {
      metadata = JSON.parse(content);
    } catch (err) {
      console.error('❌ JSON Parse Error:', content);
      return res.status(500).json({ error: 'GPT returned invalid JSON', raw: content });
    }

    res.json({
      engine: "image",
      ...metadata
    });
    
  } catch (err) {
    console.error('🔥 GPT Image Handler Failed:', err.message);
    res.status(500).json({ error: 'Internal server error', message: err.message });
  }
});

export default router;
