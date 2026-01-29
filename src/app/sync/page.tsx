'use client';

import { useState, useEffect } from 'react';
import { RefreshCw, Check, X, Clock, AlertTriangle, Database, Wifi, WifiOff, Download, Package, Tag } from 'lucide-react';
import { bridgeAPI, BridgeStats, BridgeArticle, BridgeChannel } from '@/lib/bridge';
import {
  saveSyncedBookings,
  saveSyncedGuests,
  saveSyncedArticles,
  saveSyncedRooms,
  saveSyncedChannels,
  saveSyncedCategories,
  saveSyncStatus,
  getSyncStatus,
  CaphotelBooking,
  CaphotelGuest,
  CaphotelArticle,
  CaphotelRoom,
  CaphotelChannel,
  CaphotelCategory
} from '@/lib/firestore';

interface SyncStatus {
  rooms: { status: 'idle' | 'syncing' | 'synced' | 'error'; lastSync: string | null; count: number };
  categories: { status: 'idle' | 'syncing' | 'synced' | 'error'; lastSync: string | null; count: number };
  guests: { status: 'idle' | 'syncing' | 'synced' | 'error'; lastSync: string | null; count: number };
  bookings: { status: 'idle' | 'syncing' | 'synced' | 'error'; lastSync: string | null; count: number };
  availability: { status: 'idle' | 'syncing' | 'synced' | 'error'; lastSync: string | null; count: number };
  articles: { status: 'idle' | 'syncing' | 'synced' | 'error'; lastSync: string | null; count: number };
  channels: { status: 'idle' | 'syncing' | 'synced' | 'error'; lastSync: string | null; count: number };
}

export default function SyncPage() {
  const [bridgeStatus, setBridgeStatus] = useState<'connected' | 'disconnected' | 'checking'>('checking');
  const [bridgeStats, setBridgeStats] = useState<BridgeStats | null>(null);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    rooms: { status: 'idle', lastSync: null, count: 0 },
    categories: { status: 'idle', lastSync: null, count: 0 },
    guests: { status: 'idle', lastSync: null, count: 0 },
    bookings: { status: 'idle', lastSync: null, count: 0 },
    availability: { status: 'idle', lastSync: null, count: 0 },
    articles: { status: 'idle', lastSync: null, count: 0 },
    channels: { status: 'idle', lastSync: null, count: 0 },
  });
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncLog, setSyncLog] = useState<string[]>([]);

  const addLog = (message: string) => {
    setSyncLog(prev => [...prev, `${new Date().toLocaleTimeString('de-DE')}: ${message}`]);
  };

  const checkBridgeConnection = async () => {
    setBridgeStatus('checking');
    addLog('Prüfe Verbindung zur Bridge...');

    try {
      const isConnected = await bridgeAPI.checkConnection();
      if (isConnected) {
        setBridgeStatus('connected');
        addLog('Bridge verbunden!');

        // Lade Stats
        const stats = await bridgeAPI.getStats();
        setBridgeStats(stats);
        addLog(`Gefunden: ${stats.total_guests} Gäste, ${stats.total_bookings} Buchungen, ${stats.total_rooms} Zimmer`);
      } else {
        setBridgeStatus('disconnected');
        addLog('Bridge nicht erreichbar');
      }
    } catch (error) {
      setBridgeStatus('disconnected');
      addLog(`Fehler: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`);
    }
  };

  useEffect(() => {
    checkBridgeConnection();
  }, []);

  const syncRooms = async () => {
    setSyncStatus(prev => ({ ...prev, rooms: { ...prev.rooms, status: 'syncing' } }));
    addLog('Synchronisiere Zimmer...');

    try {
      const rooms = await bridgeAPI.getRooms();
      const now = new Date().toISOString();

      // In Firestore speichern
      const firestoreRooms: CaphotelRoom[] = rooms.map(r => ({
        zimm: r.zimn,
        beze: r.name,
        bett: 2, // Default
        catg: r.caid,
        stat: r.status === 'active' ? 1 : 0,
        syncedAt: now
      }));
      await saveSyncedRooms(firestoreRooms);
      addLog(`${rooms.length} Zimmer in Firestore gespeichert`);

      setSyncStatus(prev => ({
        ...prev,
        rooms: { status: 'synced', lastSync: now, count: rooms.length }
      }));

    } catch (error) {
      setSyncStatus(prev => ({ ...prev, rooms: { ...prev.rooms, status: 'error' } }));
      addLog(`Fehler beim Laden der Zimmer: ${error instanceof Error ? error.message : 'Unbekannt'}`);
    }
  };

  const syncCategories = async () => {
    setSyncStatus(prev => ({ ...prev, categories: { ...prev.categories, status: 'syncing' } }));
    addLog('Synchronisiere Zimmerkategorien...');

    try {
      const categories = await bridgeAPI.getCategories();
      const now = new Date().toISOString();

      // In Firestore speichern
      const firestoreCategories: CaphotelCategory[] = categories.map(c => ({
        catg: c.catg,
        beze: c.beze,
        syncedAt: now
      }));
      await saveSyncedCategories(firestoreCategories);
      addLog(`${categories.length} Kategorien in Firestore gespeichert`);

      setSyncStatus(prev => ({
        ...prev,
        categories: { status: 'synced', lastSync: now, count: categories.length }
      }));

    } catch (error) {
      setSyncStatus(prev => ({ ...prev, categories: { ...prev.categories, status: 'error' } }));
      addLog(`Fehler beim Laden der Kategorien: ${error instanceof Error ? error.message : 'Unbekannt'}`);
    }
  };

  const syncGuests = async () => {
    setSyncStatus(prev => ({ ...prev, guests: { ...prev.guests, status: 'syncing' } }));
    addLog('Synchronisiere Gäste...');

    try {
      let allGuests: any[] = [];
      let offset = 0;
      const limit = 500;
      let total = 0;

      do {
        const data = await bridgeAPI.getGuests(limit, offset);
        allGuests = [...allGuests, ...data.guests];
        total = data.total;
        offset += limit;
        addLog(`${allGuests.length} von ${total} Gästen geladen...`);
      } while (allGuests.length < total);

      const now = new Date().toISOString();

      // In Firestore speichern - ALLE Gast-Daten inkl. Anrede und Geburtsdatum
      const firestoreGuests: CaphotelGuest[] = allGuests.map(g => ({
        gast: g.gast,
        anre: g.anre || '',        // Anrede
        vorn: g.vorn || '',
        nacn: g.nacn || '',
        mail: g.mail || '',
        teln: g.teln || '',
        stra: g.stra || '',
        polz: g.polz || '',
        ortb: g.ortb || '',
        land: g.land || '',
        gebd: g.gebd || '',        // Geburtsdatum
        syncedAt: now
      }));
      await saveSyncedGuests(firestoreGuests);
      addLog(`${allGuests.length} Gäste mit allen Kontaktdaten in Firestore gespeichert`);

      setSyncStatus(prev => ({
        ...prev,
        guests: { status: 'synced', lastSync: now, count: allGuests.length }
      }));

    } catch (error) {
      setSyncStatus(prev => ({ ...prev, guests: { ...prev.guests, status: 'error' } }));
      addLog(`Fehler beim Laden der Gäste: ${error instanceof Error ? error.message : 'Unbekannt'}`);
    }
  };

  const syncArticles = async () => {
    setSyncStatus(prev => ({ ...prev, articles: { ...prev.articles, status: 'syncing' } }));
    addLog('Synchronisiere Artikel...');

    try {
      const articles = await bridgeAPI.getArticles();
      const now = new Date().toISOString();

      // In Firestore speichern
      const firestoreArticles: CaphotelArticle[] = articles.map(a => ({
        artn: a.artn,
        beze: a.beze,
        prei: a.prei,
        knto: a.knto,
        syncedAt: now
      }));
      await saveSyncedArticles(firestoreArticles);
      addLog(`${articles.length} Artikel in Firestore gespeichert`);

      setSyncStatus(prev => ({
        ...prev,
        articles: { status: 'synced', lastSync: now, count: articles.length }
      }));

    } catch (error) {
      setSyncStatus(prev => ({ ...prev, articles: { ...prev.articles, status: 'error' } }));
      addLog(`Fehler beim Laden der Artikel: ${error instanceof Error ? error.message : 'Unbekannt'}`);
    }
  };

  const syncChannels = async () => {
    setSyncStatus(prev => ({ ...prev, channels: { ...prev.channels, status: 'syncing' } }));
    addLog('Synchronisiere Buchungskanäle...');

    try {
      const channels = await bridgeAPI.getChannels();
      const now = new Date().toISOString();

      // In Firestore speichern
      const firestoreChannels: CaphotelChannel[] = channels.map(c => ({
        chid: c.chid,
        name: c.beze,
        syncedAt: now
      }));
      await saveSyncedChannels(firestoreChannels);
      addLog(`${channels.length} Kanäle in Firestore gespeichert`);

      setSyncStatus(prev => ({
        ...prev,
        channels: { status: 'synced', lastSync: now, count: channels.length }
      }));

    } catch (error) {
      setSyncStatus(prev => ({ ...prev, channels: { ...prev.channels, status: 'error' } }));
      addLog(`Fehler beim Laden der Kanäle: ${error instanceof Error ? error.message : 'Unbekannt'}`);
    }
  };

  const syncAvailability = async () => {
    setSyncStatus(prev => ({ ...prev, availability: { ...prev.availability, status: 'syncing' } }));
    addLog('Synchronisiere Verfügbarkeit (2 Jahre voraus)...');

    try {
      const today = new Date();
      const endDate = new Date();
      endDate.setFullYear(endDate.getFullYear() + 2); // 2 Jahre voraus

      const startStr = today.toISOString().split('T')[0];
      const endStr = endDate.toISOString().split('T')[0];

      const availability = await bridgeAPI.getAvailability(startStr, endStr);
      const now = new Date().toISOString();
      setSyncStatus(prev => ({
        ...prev,
        availability: { status: 'synced', lastSync: now, count: availability.length }
      }));
      addLog(`${availability.length} Verfügbarkeits-Einträge geladen`);

    } catch (error) {
      setSyncStatus(prev => ({ ...prev, availability: { ...prev.availability, status: 'error' } }));
      addLog(`Fehler: ${error instanceof Error ? error.message : 'Unbekannt'}`);
    }
  };

  const syncCalendar = async () => {
    setSyncStatus(prev => ({ ...prev, bookings: { ...prev.bookings, status: 'syncing' } }));
    addLog('Synchronisiere ALLE Buchungen (komplette Historie + Zukunft)...');

    try {
      // ALLE Buchungen laden - von 2000 bis 2050
      const startStr = '2000-01-01';
      const endStr = '2050-12-31';

      addLog('Lade Buchungen von 2000 bis 2050...');
      const bookings = await bridgeAPI.getCalendar(startStr, endStr);
      addLog(`${bookings.length} Buchungen von Bridge erhalten`);
      const now = new Date().toISOString();

      // In Firestore speichern - ALLE verfügbaren Buchungsdaten
      const firestoreBookings: CaphotelBooking[] = bookings.map(b => ({
        resn: b.resn,
        gast: b.gast,
        stat: 1, // aktiv
        andf: b.rooms?.[0]?.datea || '',
        ande: b.rooms?.[0]?.datee || '',
        chid: 0,
        guestName: `${b.vorn || ''} ${b.nacn || ''}`.trim(),
        guestEmail: b.mail || '',
        guestPhone: b.teln || '',           // NEU: Telefonnummer
        guestSalutation: b.anre || '',      // NEU: Anrede
        channelName: b.channel_name || '',
        pession: b.rooms?.[0]?.pession,     // NEU: Verpflegung (0=UE, 1=F, 2=HP)
        nights: b.rooms?.[0]?.nights,       // NEU: Anzahl Nächte
        totalPrice: b.rooms?.reduce((sum, r) => sum + (r.preis || 0), 0), // NEU: Gesamtpreis
        rooms: b.rooms?.map(r => ({
          zimm: r.zimn,
          vndt: r.datea,
          bsdt: r.datee,
          pers: 2,                          // Default Personen
          kndr: 0,
          pession: r.pession,               // Verpflegung pro Zimmer
          nights: r.nights,                 // Nächte pro Zimmer
          preis: r.preis,                   // Preis pro Zimmer
          roomName: r.room_name             // Zimmername
        })),
        syncedAt: now
      }));
      await saveSyncedBookings(firestoreBookings);
      addLog(`${bookings.length} Buchungen mit allen Details in Firestore gespeichert`);

      setSyncStatus(prev => ({
        ...prev,
        bookings: { status: 'synced', lastSync: now, count: bookings.length }
      }));

    } catch (error) {
      setSyncStatus(prev => ({ ...prev, bookings: { ...prev.bookings, status: 'error' } }));
      addLog(`Fehler: ${error instanceof Error ? error.message : 'Unbekannt'}`);
    }
  };

  const syncAll = async () => {
    setIsSyncing(true);
    addLog('=== Starte VOLLSTÄNDIGE Synchronisation aller Daten ===');

    await syncRooms();
    await syncCategories();
    await syncGuests();
    await syncCalendar();
    await syncAvailability();
    await syncArticles();
    await syncChannels();

    // Sync-Status in Firestore speichern
    try {
      await saveSyncStatus({
        lastFullSync: new Date().toISOString(),
        rooms: syncStatus.rooms.count,
        guests: syncStatus.guests.count,
        bookings: syncStatus.bookings.count,
        articles: syncStatus.articles.count,
        channels: syncStatus.channels.count,
      });
      addLog('Sync-Status in Firestore gespeichert');
    } catch (e) {
      addLog('Warnung: Sync-Status konnte nicht gespeichert werden');
    }

    addLog('=== VOLLSTÄNDIGE Synchronisation abgeschlossen ===');
    setIsSyncing(false);
  };

  const formatDateTime = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const statusIcons = {
    idle: <Clock className="h-5 w-5 text-slate-400" />,
    syncing: <RefreshCw className="h-5 w-5 text-amber-500 animate-spin" />,
    synced: <Check className="h-5 w-5 text-green-500" />,
    error: <X className="h-5 w-5 text-red-500" />,
  };

  const statusLabels = {
    idle: 'Nicht synchronisiert',
    syncing: 'Synchronisiert...',
    synced: 'Synchronisiert',
    error: 'Fehler',
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">CapCorn Sync</h1>
          <p className="mt-1 text-slate-600">Daten aus CapCorn importieren</p>
        </div>
        <button
          onClick={syncAll}
          disabled={isSyncing || bridgeStatus !== 'connected'}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Download className={`h-5 w-5 ${isSyncing ? 'animate-bounce' : ''}`} />
          <span>Alles importieren</span>
        </button>
      </div>

      {/* Bridge Connection Status */}
      <div className={`rounded-xl p-6 mb-6 ${
        bridgeStatus === 'connected' ? 'bg-green-50 border border-green-200' :
        bridgeStatus === 'disconnected' ? 'bg-red-50 border border-red-200' :
        'bg-amber-50 border border-amber-200'
      }`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={`h-12 w-12 rounded-full flex items-center justify-center ${
              bridgeStatus === 'connected' ? 'bg-green-100' :
              bridgeStatus === 'disconnected' ? 'bg-red-100' : 'bg-amber-100'
            }`}>
              {bridgeStatus === 'connected' ? (
                <Wifi className="h-6 w-6 text-green-600" />
              ) : bridgeStatus === 'disconnected' ? (
                <WifiOff className="h-6 w-6 text-red-600" />
              ) : (
                <RefreshCw className="h-6 w-6 text-amber-600 animate-spin" />
              )}
            </div>
            <div>
              <h3 className={`font-semibold ${
                bridgeStatus === 'connected' ? 'text-green-900' :
                bridgeStatus === 'disconnected' ? 'text-red-900' : 'text-amber-900'
              }`}>
                CapCorn Bridge
              </h3>
              <p className={`text-sm ${
                bridgeStatus === 'connected' ? 'text-green-700' :
                bridgeStatus === 'disconnected' ? 'text-red-700' : 'text-amber-700'
              }`}>
                {bridgeStatus === 'connected' ? 'Verbunden mit localhost:5000' :
                 bridgeStatus === 'disconnected' ? 'Keine Verbindung - Starte die Bridge!' : 'Verbindung wird geprüft...'}
              </p>
              {bridgeStats && (
                <p className="text-sm text-green-600 mt-1">
                  {bridgeStats.total_guests.toLocaleString('de-DE')} Gäste • {bridgeStats.total_bookings.toLocaleString('de-DE')} Buchungen • {bridgeStats.total_rooms} Zimmer
                </p>
              )}
            </div>
          </div>
          <button
            onClick={checkBridgeConnection}
            className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-50 transition-colors"
          >
            Verbindung prüfen
          </button>
        </div>
      </div>

      {/* Sync Status Cards */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        {(['rooms', 'categories', 'guests', 'bookings', 'availability', 'articles', 'channels'] as const).map((key) => {
          const data = syncStatus[key];
          const labels = {
            rooms: 'Zimmer',
            categories: 'Kategorien',
            guests: 'Gäste (alle Kontaktdaten)',
            bookings: 'Buchungen (ALLE)',
            availability: 'Verfügbarkeit (2 Jahre)',
            articles: 'Artikel',
            channels: 'Buchungskanäle',
          };
          const syncFunctions = {
            rooms: syncRooms,
            categories: syncCategories,
            guests: syncGuests,
            bookings: syncCalendar,
            availability: syncAvailability,
            articles: syncArticles,
            channels: syncChannels,
          };
          const icons = {
            rooms: Database,
            categories: Database,
            guests: Database,
            bookings: Database,
            availability: Database,
            articles: Package,
            channels: Tag,
          };
          const IconComponent = icons[key];

          return (
            <div key={key} className="bg-white rounded-xl border border-slate-200 p-5">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-slate-100 flex items-center justify-center">
                    <IconComponent className="h-5 w-5 text-slate-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900">{labels[key]}</h3>
                    <p className="text-sm text-slate-500">
                      {data.count > 0 ? `${data.count.toLocaleString('de-DE')} Einträge` : 'Noch nicht geladen'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {statusIcons[data.status]}
                  <span className={`text-sm ${
                    data.status === 'synced' ? 'text-green-700' :
                    data.status === 'error' ? 'text-red-700' :
                    data.status === 'syncing' ? 'text-amber-700' : 'text-slate-500'
                  }`}>
                    {statusLabels[data.status]}
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <Clock className="h-4 w-4" />
                  {formatDateTime(data.lastSync)}
                </div>
                <button
                  onClick={syncFunctions[key]}
                  disabled={isSyncing || bridgeStatus !== 'connected'}
                  className="px-3 py-1.5 text-sm bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Sync
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Sync Log */}
      <div className="bg-slate-900 rounded-xl p-4">
        <h3 className="text-sm font-medium text-slate-400 mb-3">Sync Log</h3>
        <div className="h-48 overflow-y-auto font-mono text-sm">
          {syncLog.length === 0 ? (
            <p className="text-slate-500">Warte auf Sync-Aktionen...</p>
          ) : (
            syncLog.map((log, idx) => (
              <p key={idx} className="text-green-400">{log}</p>
            ))
          )}
        </div>
      </div>

      {/* Info Box */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 mt-6">
        <div className="flex items-start gap-4">
          <AlertTriangle className="h-6 w-6 text-amber-600 flex-shrink-0" />
          <div>
            <h3 className="font-semibold text-amber-900 mb-2">So startest du die Bridge</h3>
            <ol className="list-decimal list-inside space-y-1 text-amber-800 text-sm">
              <li>Öffne den Ordner <code className="bg-amber-100 px-1 rounded">C:\Users\Info\CapCorn-Bridge</code></li>
              <li>Doppelklick auf <code className="bg-amber-100 px-1 rounded">start.bat</code></li>
              <li>Warte bis "Running on http://0.0.0.0:5000" erscheint</li>
              <li>Klicke hier auf "Verbindung prüfen"</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}
