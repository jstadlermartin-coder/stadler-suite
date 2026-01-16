'use client';

import { useState, useEffect } from 'react';
import {
  Users,
  LogIn,
  LogOut,
  CreditCard,
  RefreshCw,
  Loader2,
  AlertCircle,
  CheckCircle,
  Clock,
  Euro,
  Bed,
  Calendar,
  ChevronRight,
  Wifi,
  WifiOff
} from 'lucide-react';

interface BridgeBooking {
  resn: number;
  gast: number;
  gast_name?: string;
  vorn?: string;
  nacn?: string;
  zimm: number;
  zimm_name?: string;
  vndt: string;
  bsdt: string;
  pers: number;
  stat: number;
  channel_name?: string;
  checked_in?: boolean;
}

interface AccountItem {
  aknr: number;
  artn: number;
  bez1: string;
  prei: number;
  edat: string;
}

interface GuestAccount {
  resn: number;
  gast: number;
  guest_name: string;
  zimm: number;
  vndt: string;
  bsdt: string;
  items: AccountItem[];
  total: number;
  checked_in: boolean;
}

interface DashboardStats {
  checkedIn: number;
  arrivalsToday: number;
  departuresToday: number;
  openBalance: number;
  occupiedRooms: number;
  totalRooms: number;
}

export default function DashboardPage() {
  const [loading, setLoading] = useState(false);
  const [bridgeConnected, setBridgeConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const [stats, setStats] = useState<DashboardStats>({
    checkedIn: 0,
    arrivalsToday: 0,
    departuresToday: 0,
    openBalance: 0,
    occupiedRooms: 0,
    totalRooms: 0
  });

  const [checkedInGuests, setCheckedInGuests] = useState<GuestAccount[]>([]);
  const [arrivalsToday, setArrivalsToday] = useState<BridgeBooking[]>([]);
  const [departuresToday, setDeparturesToday] = useState<BridgeBooking[]>([]);

  const BRIDGE_URL = 'http://localhost:5000';

  const checkBridgeConnection = async () => {
    try {
      const response = await fetch(`${BRIDGE_URL}/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(3000)
      });
      if (response.ok) {
        setBridgeConnected(true);
        return true;
      }
    } catch {
      setBridgeConnected(false);
    }
    return false;
  };

  const loadDashboardData = async () => {
    setLoading(true);
    setError(null);

    const connected = await checkBridgeConnection();
    if (!connected) {
      setError('Bridge nicht erreichbar. Bitte CapCornBridge.exe starten.');
      setLoading(false);
      return;
    }

    try {
      const today = new Date().toISOString().split('T')[0];

      // Load calendar data for today and surrounding days
      const calendarResponse = await fetch(
        `${BRIDGE_URL}/calendar?start_date=${today}&end_date=${today}`
      );

      if (!calendarResponse.ok) {
        throw new Error('Fehler beim Laden der Kalenderdaten');
      }

      const calendarData = await calendarResponse.json();
      const bookings: BridgeBooking[] = calendarData.bookings || [];

      // Filter arrivals and departures for today
      const arrivals = bookings.filter(b => b.vndt === today && b.stat === 2);
      const departures = bookings.filter(b => b.bsdt === today && b.stat === 2);

      setArrivalsToday(arrivals);
      setDeparturesToday(departures);

      // Get all rooms for occupancy
      const roomsResponse = await fetch(`${BRIDGE_URL}/rooms`);
      const roomsData = await roomsResponse.json();
      const totalRooms = roomsData.rooms?.length || 0;

      // Get currently checked-in guests with their accounts
      const checkedInData: GuestAccount[] = [];
      let totalOpenBalance = 0;

      // Get all active bookings that might be checked in
      const activeBookings = bookings.filter(b => {
        const checkIn = new Date(b.vndt);
        const checkOut = new Date(b.bsdt);
        const now = new Date();
        return checkIn <= now && checkOut >= now && b.stat === 2;
      });

      // For each potentially checked-in booking, get account and check-in status
      for (const booking of activeBookings.slice(0, 20)) { // Limit to 20 for performance
        try {
          // Check if actually checked in
          const statusResponse = await fetch(`${BRIDGE_URL}/checkin-status/${booking.resn}`);
          const statusData = await statusResponse.json();

          if (statusData.checked_in) {
            // Get account balance
            const accountResponse = await fetch(`${BRIDGE_URL}/account/${booking.resn}`);
            const accountData = await accountResponse.json();

            const items = accountData.items || [];
            const total = items.reduce((sum: number, item: AccountItem) => sum + (item.prei || 0), 0);

            checkedInData.push({
              resn: booking.resn,
              gast: booking.gast,
              guest_name: booking.gast_name || `${booking.vorn || ''} ${booking.nacn || ''}`.trim() || `Gast ${booking.gast}`,
              zimm: booking.zimm,
              vndt: booking.vndt,
              bsdt: booking.bsdt,
              items,
              total,
              checked_in: true
            });

            totalOpenBalance += total;
          }
        } catch (err) {
          console.error(`Error loading account for ${booking.resn}:`, err);
        }
      }

      setCheckedInGuests(checkedInData);

      setStats({
        checkedIn: checkedInData.length,
        arrivalsToday: arrivals.length,
        departuresToday: departures.length,
        openBalance: totalOpenBalance,
        occupiedRooms: checkedInData.length,
        totalRooms
      });

      setLastUpdate(new Date());

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unbekannter Fehler');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();

    // Auto-refresh every 5 minutes
    const interval = setInterval(loadDashboardData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(amount);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Dashboard</h1>
            <p className="text-slate-600 mt-1">
              Live-Übersicht aus CapCorn
              {lastUpdate && (
                <span className="text-slate-400 ml-2">
                  (Aktualisiert: {lastUpdate.toLocaleTimeString('de-DE')})
                </span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-4">
            {/* Connection Status */}
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm ${
              bridgeConnected
                ? 'bg-green-100 text-green-700'
                : 'bg-red-100 text-red-700'
            }`}>
              {bridgeConnected ? (
                <>
                  <Wifi className="h-4 w-4" />
                  Bridge verbunden
                </>
              ) : (
                <>
                  <WifiOff className="h-4 w-4" />
                  Bridge offline
                </>
              )}
            </div>

            <button
              onClick={loadDashboardData}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              Aktualisieren
            </button>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Users className="h-5 w-5 text-blue-600" />
              </div>
              <span className="text-slate-600 text-sm">Eingecheckt</span>
            </div>
            <div className="text-3xl font-bold text-slate-900">{stats.checkedIn}</div>
            <p className="text-sm text-slate-500 mt-1">
              {stats.occupiedRooms} von {stats.totalRooms} Zimmern
            </p>
          </div>

          <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <LogIn className="h-5 w-5 text-green-600" />
              </div>
              <span className="text-slate-600 text-sm">Anreisen heute</span>
            </div>
            <div className="text-3xl font-bold text-slate-900">{stats.arrivalsToday}</div>
            <p className="text-sm text-slate-500 mt-1">Check-in ab 15:00</p>
          </div>

          <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-amber-100 rounded-lg">
                <LogOut className="h-5 w-5 text-amber-600" />
              </div>
              <span className="text-slate-600 text-sm">Abreisen heute</span>
            </div>
            <div className="text-3xl font-bold text-slate-900">{stats.departuresToday}</div>
            <p className="text-sm text-slate-500 mt-1">Check-out bis 10:00</p>
          </div>

          <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Euro className="h-5 w-5 text-purple-600" />
              </div>
              <span className="text-slate-600 text-sm">Offene Konten</span>
            </div>
            <div className="text-3xl font-bold text-slate-900">{formatCurrency(stats.openBalance)}</div>
            <p className="text-sm text-slate-500 mt-1">Summe aller Gästekonten</p>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Checked-in Guests with Open Accounts */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-200 bg-slate-50">
              <h2 className="font-semibold text-slate-900 flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-blue-600" />
                Eingecheckte Gäste - Offene Konten
              </h2>
            </div>
            <div className="divide-y divide-slate-100 max-h-[400px] overflow-y-auto">
              {checkedInGuests.length === 0 ? (
                <div className="p-8 text-center text-slate-500">
                  <Users className="h-10 w-10 mx-auto mb-3 text-slate-300" />
                  <p>Keine eingecheckten Gäste</p>
                </div>
              ) : (
                checkedInGuests.map(guest => (
                  <div key={guest.resn} className="p-4 hover:bg-slate-50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                          <span className="text-blue-700 font-semibold text-sm">
                            {guest.zimm}
                          </span>
                        </div>
                        <div>
                          <div className="font-medium text-slate-900">{guest.guest_name}</div>
                          <div className="text-sm text-slate-500">
                            {formatDate(guest.vndt)} - {formatDate(guest.bsdt)}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`font-semibold ${guest.total > 0 ? 'text-slate-900' : 'text-green-600'}`}>
                          {formatCurrency(guest.total)}
                        </div>
                        <div className="text-xs text-slate-500">
                          {guest.items.length} Positionen
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Today's Movements */}
          <div className="space-y-6">
            {/* Arrivals Today */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="p-4 border-b border-slate-200 bg-green-50">
                <h2 className="font-semibold text-slate-900 flex items-center gap-2">
                  <LogIn className="h-5 w-5 text-green-600" />
                  Anreisen heute ({arrivalsToday.length})
                </h2>
              </div>
              <div className="divide-y divide-slate-100 max-h-[180px] overflow-y-auto">
                {arrivalsToday.length === 0 ? (
                  <div className="p-6 text-center text-slate-500">
                    <p>Keine Anreisen heute</p>
                  </div>
                ) : (
                  arrivalsToday.map(booking => (
                    <div key={booking.resn} className="p-3 flex items-center justify-between hover:bg-slate-50">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                          <Bed className="h-4 w-4 text-green-600" />
                        </div>
                        <div>
                          <div className="font-medium text-slate-900 text-sm">
                            {booking.gast_name || `${booking.vorn || ''} ${booking.nacn || ''}`.trim() || `Gast ${booking.gast}`}
                          </div>
                          <div className="text-xs text-slate-500">
                            Zimmer {booking.zimm} • {booking.pers} Pers.
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-slate-500">bis {formatDate(booking.bsdt)}</div>
                        {booking.channel_name && (
                          <div className="text-xs text-blue-600">{booking.channel_name}</div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Departures Today */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="p-4 border-b border-slate-200 bg-amber-50">
                <h2 className="font-semibold text-slate-900 flex items-center gap-2">
                  <LogOut className="h-5 w-5 text-amber-600" />
                  Abreisen heute ({departuresToday.length})
                </h2>
              </div>
              <div className="divide-y divide-slate-100 max-h-[180px] overflow-y-auto">
                {departuresToday.length === 0 ? (
                  <div className="p-6 text-center text-slate-500">
                    <p>Keine Abreisen heute</p>
                  </div>
                ) : (
                  departuresToday.map(booking => (
                    <div key={booking.resn} className="p-3 flex items-center justify-between hover:bg-slate-50">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center">
                          <Bed className="h-4 w-4 text-amber-600" />
                        </div>
                        <div>
                          <div className="font-medium text-slate-900 text-sm">
                            {booking.gast_name || `${booking.vorn || ''} ${booking.nacn || ''}`.trim() || `Gast ${booking.gast}`}
                          </div>
                          <div className="text-xs text-slate-500">
                            Zimmer {booking.zimm}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-slate-500">seit {formatDate(booking.vndt)}</div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Quick Links */}
        <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4">
          <a href="/sync" className="bg-white rounded-xl p-4 shadow-sm border border-slate-200 hover:border-blue-300 hover:shadow-md transition-all flex items-center justify-between">
            <div className="flex items-center gap-3">
              <RefreshCw className="h-5 w-5 text-blue-600" />
              <span className="font-medium text-slate-900">Sync</span>
            </div>
            <ChevronRight className="h-4 w-4 text-slate-400" />
          </a>

          <a href="/calendar" className="bg-white rounded-xl p-4 shadow-sm border border-slate-200 hover:border-blue-300 hover:shadow-md transition-all flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Calendar className="h-5 w-5 text-green-600" />
              <span className="font-medium text-slate-900">Kalender</span>
            </div>
            <ChevronRight className="h-4 w-4 text-slate-400" />
          </a>

          <a href="/guests" className="bg-white rounded-xl p-4 shadow-sm border border-slate-200 hover:border-blue-300 hover:shadow-md transition-all flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Users className="h-5 w-5 text-purple-600" />
              <span className="font-medium text-slate-900">Gäste</span>
            </div>
            <ChevronRight className="h-4 w-4 text-slate-400" />
          </a>

          <a href="/settings" className="bg-white rounded-xl p-4 shadow-sm border border-slate-200 hover:border-blue-300 hover:shadow-md transition-all flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Bed className="h-5 w-5 text-amber-600" />
              <span className="font-medium text-slate-900">Einstellungen</span>
            </div>
            <ChevronRight className="h-4 w-4 text-slate-400" />
          </a>
        </div>
      </div>
    </div>
  );
}
