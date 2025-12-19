const { onRequest } = require('firebase-functions/v2/https');
const fetch = require('node-fetch');

// WhatsApp API Configuration
const WHATSAPP_API_URL = 'http://146.148.3.123:3001';
const WHATSAPP_API_KEY = 'tt_live_a8f3k2m9x7p4q1w6';

// WhatsApp Proxy Function - allow unauthenticated access
exports.whatsappProxy = onRequest(
  {
    region: 'europe-west1',
    invoker: 'public'
  },
  async (req, res) => {
    // Set CORS headers manually
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    // Handle preflight OPTIONS request
    if (req.method === 'OPTIONS') {
      res.status(204).send('');
      return;
    }

    const path = req.query.path || '/status';
    const url = `${WHATSAPP_API_URL}${path}`;

    try {
      const options = {
        method: req.method,
        headers: {
          'X-API-Key': WHATSAPP_API_KEY,
          'Content-Type': 'application/json',
        },
      };

      // Add body for POST requests
      if (req.method === 'POST' && req.body) {
        options.body = JSON.stringify(req.body);
      }

      console.log(`Proxying ${req.method} request to: ${url}`);

      const response = await fetch(url, options);
      const data = await response.json();

      res.status(response.status).json(data);
    } catch (error) {
      console.error('WhatsApp proxy error:', error);
      res.status(500).json({
        error: 'Failed to connect to WhatsApp API',
        details: error.message,
      });
    }
  }
);
