'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import {
  getSyncStatus,
  saveSyncStatus,
  getBridgeMappings,
  saveSyncedBookings,
  saveSyncedGuests,
  saveSyncedArticles,
  saveSyncedRooms,
  saveSyncedChannels,
  SyncStatus,
  BridgeConfig,
  CaphotelBooking,
  CaphotelGuest,
  CaphotelArticle,
  CaphotelRoom,
  CaphotelChannel
} from './firestore';
import { processGuestsWithMatching } from './guest-matching-service';

// Context Types
export type BridgeConnectionStatus = 'connected' | 'disconnected' | 'checking' | 'syncing';

interface BridgeSyncContextType {
  // Status
  bridgeStatus: BridgeConnectionStatus;
  lastSync: string | null;
  autoSyncEnabled: boolean;
  syncInterval: number; // in minutes
  syncInProgress: boolean;
  syncError: string | null;
  bookingsCount: number;
  guestsCount: number;

  // Actions
  performSync: () => Promise<void>;
  toggleAutoSync: () => Promise<void>;
  updateSyncInterval: (minutes: number) => Promise<void>;
  checkConnection: () => Promise<boolean>;
}

const BridgeSyncContext = createContext<BridgeSyncContextType | null>(null);

// Hook to use the context
export function useBridgeSync() {
  const context = useContext(BridgeSyncContext);
  if (!context) {
    throw new Error('useBridgeSync must be used within a BridgeSyncProvider');
  }
  return context;
}

// Provider Component
export function BridgeSyncProvider({ children }: { children: React.ReactNode }) {
  // State
  const [bridgeStatus, setBridgeStatus] = useState<BridgeConnectionStatus>('checking');
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    lastSync: null,
    lastSyncSuccess: false,
    syncInProgress: false,
    bookingsCount: 0,
    guestsCount: 0,
    autoSyncEnabled: false,
    autoSyncInterval: 15
  });
  const [syncError, setSyncError] = useState<string | null>(null);
  const [bridgeUrl, setBridgeUrl] = useState<string>('http://localhost:5000');

  // Refs to track latest values in intervals
  const syncStatusRef = useRef(syncStatus);
  const bridgeUrlRef = useRef(bridgeUrl);

  useEffect(() => {
    syncStatusRef.current = syncStatus;
  }, [syncStatus]);

  useEffect(() => {
    bridgeUrlRef.current = bridgeUrl;
  }, [bridgeUrl]);

  // Check connection to Bridge
  const checkConnection = useCallback(async (): Promise<boolean> => {
    try {
      const response = await fetch(`${bridgeUrlRef.current}/`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
      });
      return response.ok;
    } catch {
      return false;
    }
  }, []);

  // Perform full sync from CapHotel to Firebase
  const performSync = useCallback(async () => {
    if (syncStatusRef.current.syncInProgress) return;

    setSyncError(null);
    setBridgeStatus('syncing');
    setSyncStatus(prev => ({ ...prev, syncInProgress: true }));

    try {
      const url = bridgeUrlRef.current;

      // Fetch all data from Bridge API
      const [bookingsRes, guestsRes, articlesRes, roomsRes, channelsRes] = await Promise.all([
        fetch(`${url}/bookings`).catch(() => null),
        fetch(`${url}/guests`).catch(() => null),
        fetch(`${url}/articles`).catch(() => null),
        fetch(`${url}/rooms`).catch(() => null),
        fetch(`${url}/channels`).catch(() => null)
      ]);

      const now = new Date().toISOString();
      let bookingsCount = 0;
      let guestsCount = 0;

      // Save bookings
      if (bookingsRes?.ok) {
        const data = await bookingsRes.json();
        const bookings: CaphotelBooking[] = (data.bookings || []).map((b: Record<string, unknown>) => ({
          ...b,
          syncedAt: now
        }));
        await saveSyncedBookings(bookings);
        bookingsCount = bookings.length;
      }

      // Save guests and run deduplication
      if (guestsRes?.ok) {
        const data = await guestsRes.json();
        const guests: CaphotelGuest[] = (data.guests || []).map((g: Record<string, unknown>) => ({
          ...g,
          syncedAt: now
        }));

        // Roh-Daten speichern (caphotelSync/guests)
        await saveSyncedGuests(guests);
        guestsCount = guests.length;

        // Deduplizierung durchführen
        const matchResult = await processGuestsWithMatching(guests);
        console.log(
          `[Bridge Sync] ${guests.length} CapHotel-Gäste → ${matchResult.uniqueGuestsCount} deduplizierte Kunden ` +
          `(${matchResult.newGuestsCreated} neu, ${matchResult.existingGuestsMatched} gematched)`
        );
      }

      // Save articles
      if (articlesRes?.ok) {
        const data = await articlesRes.json();
        const articles: CaphotelArticle[] = (data.articles || []).map((a: Record<string, unknown>) => ({
          ...a,
          syncedAt: now
        }));
        await saveSyncedArticles(articles);
      }

      // Save rooms
      if (roomsRes?.ok) {
        const data = await roomsRes.json();
        const rooms: CaphotelRoom[] = (data.rooms || []).map((r: Record<string, unknown>) => ({
          ...r,
          syncedAt: now
        }));
        await saveSyncedRooms(rooms);
      }

      // Save channels
      if (channelsRes?.ok) {
        const data = await channelsRes.json();
        const channels: CaphotelChannel[] = (data.channels || []).map((c: Record<string, unknown>) => ({
          ...c,
          syncedAt: now
        }));
        await saveSyncedChannels(channels);
      }

      // Update sync status
      const newStatus: SyncStatus = {
        lastSync: now,
        lastSyncSuccess: true,
        syncInProgress: false,
        bookingsCount,
        guestsCount,
        autoSyncEnabled: syncStatusRef.current.autoSyncEnabled,
        autoSyncInterval: syncStatusRef.current.autoSyncInterval
      };
      setSyncStatus(newStatus);
      await saveSyncStatus(newStatus);
      setBridgeStatus('connected');

    } catch (error) {
      console.error('Sync error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Verbindung fehlgeschlagen';
      setSyncError(errorMessage);
      const newStatus: SyncStatus = {
        ...syncStatusRef.current,
        lastSyncSuccess: false,
        syncInProgress: false,
        error: errorMessage
      };
      setSyncStatus(newStatus);
      await saveSyncStatus(newStatus);
      setBridgeStatus('disconnected');
    }
  }, []);

  // Toggle auto-sync on/off
  const toggleAutoSync = useCallback(async () => {
    const newStatus: SyncStatus = {
      ...syncStatusRef.current,
      autoSyncEnabled: !syncStatusRef.current.autoSyncEnabled
    };
    setSyncStatus(newStatus);
    await saveSyncStatus(newStatus);
  }, []);

  // Update sync interval
  const updateSyncInterval = useCallback(async (minutes: number) => {
    const newStatus: SyncStatus = {
      ...syncStatusRef.current,
      autoSyncInterval: minutes
    };
    setSyncStatus(newStatus);
    await saveSyncStatus(newStatus);
  }, []);

  // Load initial data from Firestore
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        // Load sync status
        const savedSyncStatus = await getSyncStatus();
        if (savedSyncStatus) {
          setSyncStatus(savedSyncStatus);
        }

        // Load bridge config
        const bridgeMappings = await getBridgeMappings();
        if (bridgeMappings?.config?.bridgeUrl) {
          setBridgeUrl(bridgeMappings.config.bridgeUrl);
        }

        // Check initial connection
        const isConnected = await checkConnection();
        setBridgeStatus(isConnected ? 'connected' : 'disconnected');
      } catch (error) {
        console.error('Error loading bridge sync data:', error);
        setBridgeStatus('disconnected');
      }
    };

    loadInitialData();
  }, [checkConnection]);

  // Auto-sync effect - runs on every page
  useEffect(() => {
    if (!syncStatus.autoSyncEnabled) {
      return;
    }

    const checkAndSync = async () => {
      const isConnected = await checkConnection();
      if (isConnected) {
        await performSync();
      } else {
        setBridgeStatus('disconnected');
      }
    };

    // Initial sync when auto-sync is enabled
    checkAndSync();

    // Set up interval
    const intervalMs = (syncStatus.autoSyncInterval || 15) * 60 * 1000;
    const interval = setInterval(checkAndSync, intervalMs);

    return () => clearInterval(interval);
  }, [syncStatus.autoSyncEnabled, syncStatus.autoSyncInterval, checkConnection, performSync]);

  // Context value
  const value: BridgeSyncContextType = {
    bridgeStatus,
    lastSync: syncStatus.lastSync || null,
    autoSyncEnabled: syncStatus.autoSyncEnabled || false,
    syncInterval: syncStatus.autoSyncInterval || 15,
    syncInProgress: syncStatus.syncInProgress || false,
    syncError,
    bookingsCount: syncStatus.bookingsCount || 0,
    guestsCount: syncStatus.guestsCount || 0,
    performSync,
    toggleAutoSync,
    updateSyncInterval,
    checkConnection
  };

  return (
    <BridgeSyncContext.Provider value={value}>
      {children}
    </BridgeSyncContext.Provider>
  );
}
