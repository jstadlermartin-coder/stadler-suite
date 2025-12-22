const { onRequest } = require('firebase-functions/v2/https');
const { defineSecret } = require('firebase-functions/params');
const admin = require('firebase-admin');
const fetch = require('node-fetch');

// Initialize Firebase Admin
admin.initializeApp();
const db = admin.firestore();

// WhatsApp API Configuration
const WHATSAPP_API_URL = 'http://146.148.3.123:3001';
// API Key als Secret definieren - wird sicher in Google Secret Manager gespeichert
const whatsappApiKey = defineSecret('WHATSAPP_API_KEY');
const WHATSAPP_APP_ID = 'stadler-suite';
const WHATSAPP_SESSION_DOC = 'whatsapp_session';

/**
 * Prüft ob eine WhatsApp Session gültig ist
 */
async function checkWhatsAppSessionStatus(sessionId, apiKey) {
  try {
    const response = await fetch(
      `${WHATSAPP_API_URL}/sessions/${sessionId}`,
      {
        headers: { 'X-API-Key': apiKey },
        timeout: 10000
      }
    );
    if (response.ok) {
      const data = await response.json();
      return {
        valid: true,
        connected: data?.status === 'connected',
        hasQr: data?.hasQr === true
      };
    }
    return { valid: false, connected: false, hasQr: false };
  } catch {
    return { valid: false, connected: false, hasQr: false };
  }
}

/**
 * Erstellt eine neue WhatsApp Session
 */
async function createWhatsAppSession(apiKey) {
  try {
    console.log('📱 Erstelle neue WhatsApp-Session...');
    const response = await fetch(
      `${WHATSAPP_API_URL}/sessions`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': apiKey
        },
        body: JSON.stringify({ appId: WHATSAPP_APP_ID })
      }
    );
    if (response.ok) {
      const data = await response.json();
      console.log('✓ Neue Session erstellt:', data?.sessionId);
      return data?.sessionId || null;
    }
    console.error('Session-Erstellung fehlgeschlagen:', response.status);
    return null;
  } catch (error) {
    console.error('Session-Erstellung Fehler:', error.message);
    return null;
  }
}

/**
 * Holt eine gültige WhatsApp Session oder erstellt eine neue
 */
async function getOrCreateWhatsAppSession(apiKey) {
  try {
    // 1. Hole gespeicherte Session-ID aus Firestore
    const configDoc = await db.collection('config').doc(WHATSAPP_SESSION_DOC).get();
    let sessionId = configDoc.exists ? configDoc.data()?.sessionId : null;

    if (sessionId) {
      // 2. Prüfe ob Session noch gültig ist
      const status = await checkWhatsAppSessionStatus(sessionId, apiKey);

      if (status.connected) {
        console.log('✓ Session ist verbunden:', sessionId);
        return sessionId;
      }

      if (status.hasQr) {
        console.log('✓ Session hat QR-Code:', sessionId);
        return sessionId;
      }

      console.log('⚠️ Session abgelaufen, erstelle neue...');
    }

    // 3. Keine gültige Session - erstelle neue
    const newSessionId = await createWhatsAppSession(apiKey);

    if (newSessionId) {
      // 4. Speichere neue Session-ID in Firestore
      await db.collection('config').doc(WHATSAPP_SESSION_DOC).set({
        sessionId: newSessionId,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        appId: WHATSAPP_APP_ID
      });
      console.log('✓ Neue Session gespeichert:', newSessionId);
      return newSessionId;
    }

    return null;
  } catch (error) {
    console.error('Session-Management Fehler:', error);
    return null;
  }
}

// WhatsApp Proxy Function - allow unauthenticated access
exports.whatsappProxy = onRequest(
  {
    region: 'europe-west1',
    invoker: 'public',
    secrets: [whatsappApiKey]  // Secret für diese Funktion verfügbar machen
  },
  async (req, res) => {
    // API Key aus Secret lesen
    const apiKey = whatsappApiKey.value();

    // Set CORS headers manually
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    // Handle preflight OPTIONS request
    if (req.method === 'OPTIONS') {
      res.status(204).send('');
      return;
    }

    let path = req.query.path || '/status';

    try {
      // Automatisches Session-Management für Session-Endpunkte
      if (path === '/status' || path === '/qr' || path.startsWith('/send') || path.startsWith('/disconnect')) {
        const sessionId = await getOrCreateWhatsAppSession(apiKey);
        if (!sessionId) {
          res.status(500).json({ error: 'Keine WhatsApp-Session verfügbar' });
          return;
        }

        // Pfad auf Session-basierte API umschreiben
        if (path === '/status') {
          path = `/sessions/${sessionId}`;
        } else if (path === '/qr') {
          path = `/sessions/${sessionId}/qr`;
        } else if (path === '/send') {
          path = `/sessions/${sessionId}/send`;
        } else if (path === '/disconnect') {
          path = `/sessions/${sessionId}/disconnect`;
        } else if (path.startsWith('/send-media')) {
          path = `/sessions/${sessionId}/send-media`;
        }
      }

      const url = `${WHATSAPP_API_URL}${path}`;

      const options = {
        method: req.method,
        headers: {
          'X-API-Key': apiKey,
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

      // Normalisiere Status-Antwort
      if (path.includes('/sessions/') && !path.includes('/qr') && !path.includes('/send')) {
        const normalizedResponse = {
          ...data,
          connected: data.status === 'connected',
          status: data.status === 'connected' ? 'connected' : 'disconnected'
        };
        res.status(response.status).json(normalizedResponse);
      } else {
        res.status(response.status).json(data);
      }
    } catch (error) {
      console.error('WhatsApp proxy error:', error);
      res.status(500).json({
        error: 'Failed to connect to WhatsApp API',
        details: error.message,
      });
    }
  }
);

// WhatsApp Webhook - eingehende Nachrichten empfangen
exports.whatsappWebhook = onRequest(
  {
    region: 'europe-west1',
    invoker: 'public'
  },
  async (req, res) => {
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
      res.status(204).send('');
      return;
    }

    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Method not allowed' });
      return;
    }

    try {
      const { sessionId, phone, message, timestamp, messageId, contactName, hasMedia, mediaType } = req.body;

      // Nur stadler-suite Nachrichten verarbeiten
      if (sessionId && !sessionId.startsWith('stadler-suite')) {
        console.log('Ignoring message from other app:', sessionId);
        res.status(200).json({ success: true, ignored: true });
        return;
      }

      if (!phone || !message) {
        res.status(400).json({ error: 'Phone and message required' });
        return;
      }

      console.log(`📨 WhatsApp Webhook: ${phone}: ${message.substring(0, 50)}...`);

      // Nachricht in Firestore speichern
      await db.collection('whatsapp_messages').add({
        phone: phone.replace(/[^\d]/g, ''),
        message,
        messageId: messageId || null,
        direction: 'incoming',
        createdAt: timestamp || new Date().toISOString(),
        read: false,
        contactName: contactName || null,
        hasMedia: hasMedia || false,
        mediaType: mediaType || 'chat',
        sessionId: sessionId || null
      });

      res.json({ success: true, phone });
    } catch (error) {
      console.error('WhatsApp Webhook error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);
