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
        role: 'user',
        content: [
          {
            type: 'text',
            text: `Analyze this image and return poetic JSON metadata in this format:
{
  "title": "2–3 word poetic title",
  "poem": ["Width x Height in pixels"],
"summary": [
  "Write a short story in three paragraphs. Use <p>...</p> tags only to separate each paragraph. Do not include <br> tags, newlines, or any extra formatting.",
  "The story should follow a clear narrative arc with a beginning, middle, and end.",
  "<p> Paragraph 1: Introduce the setting or moment. Let the image suggest a sense of calm, beauty, or ordinary life unfolding. </p>",
  "<p> Paragraph 2: Introduce disruption — a challenge, conflict, or loss that shifts the tone. </p>",
  "<p> Paragraph 3: Resolve the story. Show how the character or world adapts or grows. End with a quiet but clear sense of change. </p>"
],
  "hashtags": ["#emotion", "#culture", "#style"],
  "category": "Theme or visual genre (e.g. portrait, abstraction, landscape)",
  "enhanced": "Expressive, 1-sentence description of the image’s essence",
  "vignette": "Short story fragment or character moment evoked by the image",
  "size": "Aspect Ratio (e.g. 16:9)"
}
Respond with valid JSON only.`
          },
          {
            type: 'image_url',
            image_url: { url: imageUrl }
          }
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

    res.json(metadata);
  } catch (err) {
    console.error('🔥 GPT Image Handler Failed:', err.message);
    res.status(500).json({ error: 'Internal server error', message: err.message });
  }
});

export default router;
