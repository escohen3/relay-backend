// proxy-server.js
import fetch from 'node-fetch';

export default function attachProxyRoutes(app) {
  // 🌐 Proxy image endpoint (CORS bypass)
  app.get('/proxy-image', async (req, res) => {
    const { url } = req.query;
    if (!url) return res.status(400).send('Missing image URL');

    try {
      const imageRes = await fetch(url);
      const buffer = await imageRes.arrayBuffer();
      res.set('Content-Type', imageRes.headers.get('content-type'));
      res.send(Buffer.from(buffer));
    } catch (err) {
      console.error('🔥 Image proxy failed:', err);
      res.status(500).send('Image fetch error');
    }
  });
}
