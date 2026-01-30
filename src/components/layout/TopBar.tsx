'use client';

import { HamburgerButton } from './NewSidebar';
import { SearchButton } from './SearchOverlay';
import { NewBookingButton } from '../booking/NewBookingWizard';
import { useBridgeSync } from '@/lib/bridge-sync-context';
import { RefreshCw, Cloud, CloudOff } from 'lucide-react';

interface TopBarProps {
  title?: string;
}

// Sync Status Indicator Component
function SyncStatusIndicator() {
  const { bridgeStatus, autoSyncEnabled, lastSync } = useBridgeSync();

  // Don't show if auto-sync is disabled
  if (!autoSyncEnabled) return null;

  // Format last sync time
  const formatLastSync = (isoString: string | null) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'gerade eben';
    if (diffMins < 60) return `vor ${diffMins} Min`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `vor ${diffHours} Std`;
    return date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
  };

  return (
    <div className="flex items-center gap-1.5" title={lastSync ? `Letzter Sync: ${formatLastSync(lastSync)}` : 'Sync aktiv'}>
      {bridgeStatus === 'syncing' ? (
        <>
          <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />
          <span className="text-xs text-blue-600 hidden sm:inline">Sync...</span>
        </>
      ) : bridgeStatus === 'connected' ? (
        <>
          <Cloud className="h-4 w-4 text-green-500" />
          <span className="text-xs text-green-600 hidden sm:inline">Sync</span>
        </>
      ) : (
        <>
          <CloudOff className="h-4 w-4 text-slate-400" />
          <span className="text-xs text-slate-500 hidden sm:inline">Offline</span>
        </>
      )}
    </div>
  );
}

export default function TopBar({ title }: TopBarProps) {
  return (
    <header className="sticky top-0 z-30 bg-white border-b border-slate-200">
      <div className="flex items-center px-4 py-3">
        {/* Links: Hamburger Menü - feste Breite für Zentrierung */}
        <div className="flex items-center gap-3 w-24">
          <HamburgerButton />
          {title && (
            <h1 className="text-lg font-semibold text-slate-900 truncate">
              {title}
            </h1>
          )}
        </div>

        {/* Mitte: Plus Button - flexibel zentriert */}
        <div className="flex-1 flex justify-center">
          <NewBookingButton />
        </div>

        {/* Rechts: Sync-Status und Suche - feste Breite für Zentrierung */}
        <div className="flex items-center gap-3 w-24 justify-end">
          <SyncStatusIndicator />
          <SearchButton />
        </div>
      </div>
    </header>
  );
}
