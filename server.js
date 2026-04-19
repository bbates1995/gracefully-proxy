require('dotenv').config({ override: false });
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

const app = express();
const PORT = process.env.PORT || 3000;

const generateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 25,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { message: 'Too many requests. Please try again later.' } },
});
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

app.get('/privacy', (_req, res) => {
  res.send(`<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Gracefully – Privacy Policy</title>
<style>body{font-family:-apple-system,sans-serif;max-width:680px;margin:40px auto;padding:0 20px;color:#1c1c1e;line-height:1.6}h1{font-size:24px}h2{font-size:18px;margin-top:32px}p,li{font-size:15px;color:#3a3a3c}</style>
</head>
<body>
<h1>Privacy Policy</h1>
<p><strong>Effective date:</strong> April 1, 2026</p>
<p>Gracefully ("we", "our", or "us") built the Gracefully app. This page informs you of our policies regarding the collection, use, and disclosure of personal data.</p>
<h2>Information We Collect</h2>
<p>We do not collect personally identifiable information. The app sends the text you type (your situation description) to our proxy server solely to generate a message via the Anthropic API. This text is not stored or logged.</p>
<h2>Subscription Data</h2>
<p>Subscription purchases are handled entirely by Apple via StoreKit. We do not receive or store your payment information.</p>
<h2>Usage Data</h2>
<p>We do not use third-party analytics. The app tracks your free message count locally on your device only.</p>
<h2>Third-Party Services</h2>
<p>We use the Anthropic API to generate messages. Text you submit is sent to Anthropic's servers to fulfill your request. See Anthropic's privacy policy at <a href="https://www.anthropic.com/privacy">anthropic.com/privacy</a>.</p>
<h2>Children's Privacy</h2>
<p>Gracefully is not directed to anyone under 13. We do not knowingly collect data from children.</p>
<h2>Changes</h2>
<p>We may update this policy from time to time. Changes will be posted at this URL.</p>
<h2>Contact</h2>
<p>Questions? Email us at <a href="mailto:hello@gracefully.app">hello@gracefully.app</a>.</p>
</body></html>`);
});

app.get('/terms', (_req, res) => {
  res.send(`<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Gracefully – Terms of Use</title>
<style>body{font-family:-apple-system,sans-serif;max-width:680px;margin:40px auto;padding:0 20px;color:#1c1c1e;line-height:1.6}h1{font-size:24px}h2{font-size:18px;margin-top:32px}p,li{font-size:15px;color:#3a3a3c}</style>
</head>
<body>
<h1>Terms of Use</h1>
<p><strong>Effective date:</strong> April 1, 2026</p>
<p>By downloading or using Gracefully, you agree to these terms.</p>
<h2>Use of the App</h2>
<p>Gracefully helps you draft messages for social situations using AI. You are responsible for how you use the generated content. Do not use the app to generate harmful, deceptive, or harassing messages.</p>
<h2>Subscriptions</h2>
<p>Gracefully Pro is an auto-renewable subscription billed monthly at $2.99 USD (or local equivalent) via your Apple ID. Your subscription renews automatically unless cancelled at least 24 hours before the end of the current period. You can manage or cancel your subscription in your Apple ID account settings.</p>
<h2>Free Tier</h2>
<p>Free users receive 5 lifetime message generations. No additional free generations are provided after the limit is reached.</p>
<h2>Intellectual Property</h2>
<p>The Gracefully app and its content are owned by us. You may not copy, modify, or distribute the app or its content without permission.</p>
<h2>Disclaimer</h2>
<p>Gracefully is provided "as is" without warranties of any kind. We are not responsible for the accuracy or appropriateness of AI-generated messages.</p>
<h2>Changes</h2>
<p>We may update these terms. Continued use of the app after changes constitutes acceptance.</p>
<h2>Contact</h2>
<p>Questions? Email us at <a href="mailto:hello@gracefully.app">hello@gracefully.app</a>.</p>
</body></html>`);
});

const PROXY_SECRET = process.env.PROXY_SECRET;
const ALLOWED_MODEL = 'claude-haiku-4-5-20251001';
const MAX_TOKENS_LIMIT = 600;

app.post('/api/generate', generateLimiter, async (req, res) => {
  if (!apiKey) {
    return res.status(500).json({ error: { message: 'API key not configured on server' } });
  }

  // Shared-secret check
  if (PROXY_SECRET && req.headers['x-proxy-secret'] !== PROXY_SECRET) {
    return res.status(401).json({ error: { message: 'Unauthorized' } });
  }

  // Lock model and cap tokens
  const { model, max_tokens, ...rest } = req.body;
  if (model && model !== ALLOWED_MODEL) {
    return res.status(400).json({ error: { message: 'Model not permitted' } });
  }
  const safeBody = {
    ...rest,
    model: ALLOWED_MODEL,
    max_tokens: Math.min(max_tokens || MAX_TOKENS_LIMIT, MAX_TOKENS_LIMIT),
  };

  try {
    const response = await fetch(ANTHROPIC_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(safeBody),
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
