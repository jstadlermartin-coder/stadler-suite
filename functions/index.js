const { onRequest } = require('firebase-functions/v2/https');
const admin = require('firebase-admin');
const fetch = require('node-fetch');

// Initialize Firebase Admin
admin.initializeApp();
const db = admin.firestore();

// WhatsApp API Configuration
const WHATSAPP_API_URL = 'http://146.148.3.123:3001';
const WHATSAPP_API_KEY = 'tt_live_a8f3k2m9x7p4q1w6';
const WHATSAPP_APP_ID = 'stadler-suite';
const WHATSAPP_SESSION_DOC = 'whatsapp_session';

/**
 * Prüft ob eine WhatsApp Session gültig ist
 */
async function checkWhatsAppSessionStatus(sessionId) {
  try {
    const response = await fetch(
      `${WHATSAPP_API_URL}/sessions/${sessionId}`,
      {
        headers: { 'X-API-Key': WHATSAPP_API_KEY },
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
async function createWhatsAppSession() {
  try {
    console.log('📱 Erstelle neue WhatsApp-Session...');
    const response = await fetch(
      `${WHATSAPP_API_URL}/sessions`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': WHATSAPP_API_KEY
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
async function getOrCreateWhatsAppSession() {
  try {
    // 1. Hole gespeicherte Session-ID aus Firestore
    const configDoc = await db.collection('config').doc(WHATSAPP_SESSION_DOC).get();
    let sessionId = configDoc.exists ? configDoc.data()?.sessionId : null;

    if (sessionId) {
      // 2. Prüfe ob Session noch gültig ist
      const status = await checkWhatsAppSessionStatus(sessionId);

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
    const newSessionId = await createWhatsAppSession();

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

    let path = req.query.path || '/status';

    try {
      // Automatisches Session-Management für Session-Endpunkte
      if (path === '/status' || path === '/qr' || path.startsWith('/send') || path.startsWith('/disconnect')) {
        const sessionId = await getOrCreateWhatsAppSession();
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
