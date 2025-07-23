import express from 'express';
import Replicate from 'replicate';
import fetch from 'node-fetch';

const router = express.Router();
const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN });



/*🔧 Upload base64 image to Imgur and return public URL */
async function uploadToImgur(dataUri) {
  const IMGUR_CLIENT_ID = process.env.IMGUR_CLIENT_ID;
  const base64 = dataUri.replace(/^data:image\/\w+;base64,/, '');

  const resp = await fetch('https://api.imgur.com/3/image', {
    method: 'POST',
    headers: { Authorization: `Client-ID ${IMGUR_CLIENT_ID}` },
    body: new URLSearchParams({ image: base64, type: 'base64' })
  }).then(r => r.json());

  if (!resp?.data?.link) throw new Error('Imgur upload failed');
  return resp.data.link;
}






/* 🚀 POST /boost-image → returns boostedImageUrl */
router.post('/', async (req, res) => {
  try {
    const { image } = req.body;
    if (!image) return res.status(400).json({ error: 'Missing image data' });

    // 1️⃣ Upload image to Imgur
    const publicUrl = await uploadToImgur(image);
    console.log("🌐 Imgur URL:", publicUrl);

    // 2️⃣ Run through Replicate model
    let rawOutput;
    try {
      rawOutput = await replicate.run(
        'xinntao/realesrgan:1b976a4d456ed9e4d1a846597b7614e79eadad3032e9124fa63859db0fd59b56',
        {
          input: {
            img: publicUrl,
            scale: 2,
            face_enhance: false
          }
        }
      );
      console.log("🧪 Raw output from Replicate:", rawOutput);
    } catch (replicateErr) {
      console.error("🔥 Replicate threw an internal error:", replicateErr);
      return res.status(500).json({ error: 'Replicate boosting failed (internal)' });
    }

    // 3️⃣ Extract valid URL
    let boostedUrl;
    if (Array.isArray(rawOutput)) boostedUrl = rawOutput[0];
    else if (typeof rawOutput === 'string') boostedUrl = rawOutput;
    else if (rawOutput?.output) boostedUrl = rawOutput.output;

    if (!boostedUrl) {
      console.error("🔥 No boosted URL returned from Replicate");
      return res.status(500).json({ error: 'Replicate boosting failed' });
    }

    // 4️⃣ Send final result
    res.json({ boostedImageUrl: boostedUrl });

  } catch (err) {
    console.error('🔥 Replicate boost failed (outer):', err.message);
    res.status(500).json({ error: 'Replicate boosting failed' });
  }
});

export default router;






