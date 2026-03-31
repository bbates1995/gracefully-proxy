require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;
const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';

const apiKey = process.env.ANTHROPIC_API_KEY;
if (!apiKey || !apiKey.startsWith('sk-')) {
  console.error('ANTHROPIC_API_KEY not set. Run: ANTHROPIC_API_KEY=sk-ant-... node server.js');
  process.exit(1);
}

app.use(cors());
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.post('/api/generate', async (req, res) => {
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
