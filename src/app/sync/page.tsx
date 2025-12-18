'use client';

import { useState } from 'react';
import { RefreshCw, Check, X, Clock, AlertTriangle, Database, Server, Wifi, WifiOff } from 'lucide-react';

interface SyncStatus {
  rooms: { status: 'synced' | 'error' | 'pending'; lastSync: string; count: number };
  guests: { status: 'synced' | 'error' | 'pending'; lastSync: string; count: number };
  bookings: { status: 'synced' | 'error' | 'pending'; lastSync: string; count: number };
  availability: { status: 'synced' | 'error' | 'pending'; lastSync: string; count: number };
}

const initialSyncStatus: SyncStatus = {
  rooms: { status: 'synced', lastSync: '2024-12-17T10:30:00', count: 66 },
  guests: { status: 'synced', lastSync: '2024-12-17T10:30:00', count: 26615 },
  bookings: { status: 'synced', lastSync: '2024-12-17T10:30:00', count: 23566 },
  availability: { status: 'synced', lastSync: '2024-12-17T10:35:00', count: 2640 },
};

export default function SyncPage() {
  const [bridgeStatus, setBridgeStatus] = useState<'connected' | 'disconnected' | 'checking'>('checking');
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(initialSyncStatus);
  const [isSyncing, setIsSyncing] = useState(false);

  const formatDateTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const checkBridgeConnection = async () => {
    setBridgeStatus('checking');
    // Simulate API check
    setTimeout(() => {
      setBridgeStatus('connected');
    }, 1500);
  };

  const startSync = async (type: keyof SyncStatus | 'all') => {
    setIsSyncing(true);

    if (type === 'all') {
      // Sync all
      for (const key of Object.keys(syncStatus) as (keyof SyncStatus)[]) {
        setSyncStatus(prev => ({
          ...prev,
          [key]: { ...prev[key], status: 'pending' }
        }));
      }
    } else {
      setSyncStatus(prev => ({
        ...prev,
        [type]: { ...prev[type], status: 'pending' }
      }));
    }

    // Simulate sync
    setTimeout(() => {
      const now = new Date().toISOString();
      if (type === 'all') {
        setSyncStatus({
          rooms: { ...syncStatus.rooms, status: 'synced', lastSync: now },
          guests: { ...syncStatus.guests, status: 'synced', lastSync: now },
          bookings: { ...syncStatus.bookings, status: 'synced', lastSync: now },
          availability: { ...syncStatus.availability, status: 'synced', lastSync: now },
        });
      } else {
        setSyncStatus(prev => ({
          ...prev,
          [type]: { ...prev[type], status: 'synced', lastSync: now }
        }));
      }
      setIsSyncing(false);
    }, 2000);
  };

  const statusIcons = {
    synced: <Check className="h-5 w-5 text-green-500" />,
    error: <X className="h-5 w-5 text-red-500" />,
    pending: <RefreshCw className="h-5 w-5 text-amber-500 animate-spin" />,
  };

  const statusLabels = {
    synced: 'Synchronisiert',
    error: 'Fehler',
    pending: 'Synchronisiert...',
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">CapCorn Sync</h1>
          <p className="mt-1 text-slate-600">Daten mit CapCorn Bridge synchronisieren</p>
        </div>
        <button
          onClick={() => startSync('all')}
          disabled={isSyncing || bridgeStatus !== 'connected'}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <RefreshCw className={`h-5 w-5 ${isSyncing ? 'animate-spin' : ''}`} />
          <span>Alles synchronisieren</span>
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
                 bridgeStatus === 'disconnected' ? 'Keine Verbindung' : 'Verbindung wird geprüft...'}
              </p>
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
      <div className="grid grid-cols-2 gap-4 mb-8">
        {(Object.entries(syncStatus) as [keyof SyncStatus, SyncStatus[keyof SyncStatus]][]).map(([key, data]) => (
          <div key={key} className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-slate-100 flex items-center justify-center">
                  <Database className="h-5 w-5 text-slate-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900 capitalize">
                    {key === 'rooms' ? 'Zimmer' :
                     key === 'guests' ? 'Gäste' :
                     key === 'bookings' ? 'Buchungen' : 'Verfügbarkeit'}
                  </h3>
                  <p className="text-sm text-slate-500">{data.count.toLocaleString('de-DE')} Einträge</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {statusIcons[data.status]}
                <span className={`text-sm ${
                  data.status === 'synced' ? 'text-green-700' :
                  data.status === 'error' ? 'text-red-700' : 'text-amber-700'
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
                onClick={() => startSync(key)}
                disabled={isSyncing || bridgeStatus !== 'connected'}
                className="px-3 py-1.5 text-sm bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Sync
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Info Box */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-6">
        <div className="flex items-start gap-4">
          <AlertTriangle className="h-6 w-6 text-amber-600 flex-shrink-0" />
          <div>
            <h3 className="font-semibold text-amber-900 mb-2">Hinweis zur Synchronisation</h3>
            <ul className="list-disc list-inside space-y-1 text-amber-800 text-sm">
              <li>Die CapCorn Bridge muss auf dem Hotel-PC laufen (localhost:5000)</li>
              <li>Bei der ersten Synchronisation werden alle Gäste importiert und nach Email/Telefon dedupliziert</li>
              <li>Danach werden nur noch Verfügbarkeiten aus CapCorn geladen</li>
              <li>Alle neuen Buchungen und Preise werden in Stadler Suite verwaltet</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
