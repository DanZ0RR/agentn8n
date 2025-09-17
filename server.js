const express = require('express');
const axios = require('axios');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;
// Base URL for n8n (protocol + host + optional port)
// Default to your n8n cloud host; can be overridden with N8N_URL env var
const N8N_URL = process.env.N8N_URL || 'https://zhijianchencr.app.n8n.cloud';
// Path for your webhook (can be overridden with env N8N_WEBHOOK_PATH)
const N8N_WEBHOOK_PATH = process.env.N8N_WEBHOOK_PATH || '/webhook/e5616171-e3b5-4c39-81d4-67409f9fa60a/chat';

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// Serve static files from repository root so you can open index.html at http://localhost:3000
app.use(express.static(path.join(__dirname)));

app.post('/api/send', async (req, res) => {
  try {
    const payload = req.body || {};
    const url = `${N8N_URL}${N8N_WEBHOOK_PATH}`;
    // Forward the request to n8n
    const response = await axios.post(url, payload, { timeout: 10000 });
    // Proxy back the n8n response
    res.status(response.status).send(response.data);
  } catch (err) {
    console.error('Proxy error:', err && err.message);
    if (err.response) {
      res.status(err.response.status).send(err.response.data);
    } else {
      res.status(502).json({ error: 'Bad Gateway', message: err.message });
    }
  }
});

app.listen(PORT, () => {
  console.log(`Proxy server listening on http://localhost:${PORT}`);
  console.log(`Forwarding /api/send -> ${N8N_URL}${N8N_WEBHOOK_PATH}`);
});
