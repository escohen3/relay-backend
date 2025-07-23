// server-side/server.js
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import Replicate from 'replicate';

import { FILESTACK_API_KEY, KEY_LIST_URL, MASTER_KEY } from './relay-config.js';


import attachProxyRoutes from './proxy-server.js';
import boostRoute from './routes/boostRoute.js';
import gptColorRoute from './routes/gpt-color.js';
import gptImageRoute from './routes/gpt-image.js';
import gptTextRoute from './routes/gpt-text.js';

// 🔑 Load environment variables
dotenv.config();
console.log('🔑 OPENAI:', process.env.OPENAI_API_KEY?.slice(0, 5));

const app = express();
const PORT = 5001;
const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN });

// 🔧 Middleware
app.use(cors());
app.use(express.json());

// 🔗 Routes
attachProxyRoutes(app);
app.use('/gpt-metadata', gptImageRoute);
app.use('/gpt-text', gptTextRoute);
app.use('/gpt-color', gptColorRoute);
app.use('/gpt-image', imageRoute);
app.use('/boost', boostRoute);

// 🖼 Replicate direct test endpoint
app.post('/replicate', async (req, res) => {
  try {
    const input = {
      image: req.body.image,
      desired_increase: 4,
    };

    const prediction = await replicate.predictions.create({
      model: 'bria/increase-resolution',
      input,
    });

    let completed;
    for (let i = 0; i < 10; i++) {
      const latest = await replicate.predictions.get(prediction.id);
      if (latest.status !== 'starting' && latest.status !== 'processing') {
        completed = latest;
        break;
      }
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    if (!completed?.output) throw new Error('No output from Replicate');

    res.json({ output: completed.output });
  } catch (e) {
    console.error('❌ Replicate failed:', e);
    res.status(500).json({ error: 'Replicate failed', details: e.message });
  }
});

app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

app.listen(PORT, () => {
  console.log(`⚡ Relay Proxy Server running at http://localhost:${PORT}`);
});
