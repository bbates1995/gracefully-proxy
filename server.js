require('dotenv').config({ override: false });
const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;
const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';

// Debug: log available env vars on startup
console.log('PORT:', PORT);
console.log('ANTHROPIC_API_KEY set:', !!process.env.ANTHROPIC_API_KEY);
console.log('ANTHROPIC_API_KEY prefix:', process.env.ANTHROPIC_API_KEY?.slice(0, 10));

const apiKey = process.env.ANTHROPIC_API_KEY;

app.use(cors());
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', keySet: !!apiKey });
});

app.post('/api/generate', async (req, res) => {
  if (!apiKey) {
    return res.status(500).json({ error: { message: 'API key not configured on server' } });
  }

  try {
    const response = await fetch(ANTHROPIC_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(req.body),
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json(data);
    }

    res.json(data);
  } catch (err) {
    console.error('[Proxy Error]', err.message);
    res.status(500).json({ error: { message: 'Proxy server error' } });
  }
});

app.listen(PORT, () => {
  console.log(`Gracefully proxy running on port ${PORT}`);
});
