'use client';

import { useState, useEffect } from 'react';
import { Users, Hotel, ArrowUpRight, ArrowDownRight, X, ChevronRight, BarChart3, LayoutDashboard } from 'lucide-react';
import { CustomerDetailSheet } from '@/components/drawers/CustomerDetailSheet';
import { getSyncedBookings, CaphotelBooking, getSyncedRooms } from '@/lib/firestore';
import {
  getArrivalsForDate,
  getDeparturesForDate,
  getDashboardStats,
  formatArrivalTime
} from '@/lib/dashboard-utils';
import DateNavigation from '@/components/dashboard/DateNavigation';
import DashboardStats from '@/components/dashboard/DashboardStats';
import { getHolidaySettings } from '@/lib/holiday-settings';
import { HolidaySettings, defaultHolidaySettings } from '@/lib/holidays';

// Types
interface Arrival {
  id: string;
  guestId: string;
  name: string;
  email?: string;
  phone?: string;
  room: string;
  checkIn: string;
  guests: number;
  resn: number;
}

interface Departure {
  id: string;
  guestId: string;
  name: string;
  email?: string;
  phone?: string;
  room: string;
  checkOut: string;
  resn: number;
}

// Arrivals/Departures Fullscreen Drawer
function ListDrawer({
  isOpen,
  onClose,
  type,
  items,
  onItemClick
}: {
  isOpen: boolean;
  onClose: () => void;
  type: 'arrivals' | 'departures';
  items: (Arrival | Departure)[];
  onItemClick: (item: Arrival | Departure) => void;
}) {
  const isArrivals = type === 'arrivals';

  return (
    <>
      {isOpen && <div className="fixed inset-0 bg-black/20 z-40" onClick={onClose} />}
      <div className={`fixed top-0 right-0 h-full w-full bg-white shadow-2xl z-40 transform transition-transform duration-300 ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className={`h-10 w-10 rounded-xl ${isArrivals ? 'bg-green-100' : 'bg-orange-100'} flex items-center justify-center`}>
              {isArrivals ? <ArrowDownRight className="h-5 w-5 text-green-600" /> : <ArrowUpRight className="h-5 w-5 text-orange-600" />}
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900">{isArrivals ? 'Ankünfte' : 'Abreisen'}</h2>
              <p className="text-sm text-slate-500">{items.length} Gäste</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg">
            <X className="h-5 w-5 text-slate-500" />
          </button>
        </div>

        {/* Fullscreen List - Full Width Cards */}
        <div className="p-4 overflow-auto h-[calc(100%-88px)]">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-400">
              <div className={`h-16 w-16 rounded-full ${isArrivals ? 'bg-green-50' : 'bg-orange-50'} flex items-center justify-center mb-4`}>
                {isArrivals ? <ArrowDownRight className="h-8 w-8 text-green-300" /> : <ArrowUpRight className="h-8 w-8 text-orange-300" />}
              </div>
              <p className="text-lg font-medium">Keine {isArrivals ? 'Ankünfte' : 'Abreisen'}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {items.map((item) => (
                <button
                  key={item.id}
                  onClick={() => onItemClick(item)}
                  className="w-full flex items-center gap-4 p-5 bg-slate-50 hover:bg-slate-100 rounded-2xl transition-colors text-left"
                >
                  <div className={`h-14 w-14 rounded-full ${isArrivals ? 'bg-green-100' : 'bg-orange-100'} flex items-center justify-center flex-shrink-0`}>
                    {isArrivals ? <ArrowDownRight className="h-7 w-7 text-green-600" /> : <ArrowUpRight className="h-7 w-7 text-orange-600" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-900 text-xl">{item.name}</p>
                    <p className="text-base text-slate-500">
                      Zimmer {item.room}
                      {'guests' in item && ` • ${item.guests} ${item.guests === 1 ? 'Gast' : 'Gäste'}`}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-slate-400">
                      {'checkIn' in item ? item.checkIn : item.checkOut}
                    </p>
                  </div>
                  <ChevronRight className="h-6 w-6 text-slate-300" />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// Convert CaphotelBooking to Arrival
function bookingToArrival(booking: CaphotelBooking): Arrival {
  const roomNumbers = booking.rooms?.map(r => r.roomName || r.zimm.toString()).join(', ') || '-';
  const guestCount = booking.rooms?.reduce((sum, r) => sum + (r.pers || 0) + (r.kndr || 0), 0) || 1;

  return {
    id: booking.resn.toString(),
    guestId: booking.gast.toString(),
    name: booking.guestName || 'Unbekannt',
    email: booking.guestEmail,
    phone: booking.guestPhone,
    room: roomNumbers,
    checkIn: formatArrivalTime(new Date(booking.andf)),
    guests: guestCount,
    resn: booking.resn
  };
}

// Convert CaphotelBooking to Departure
function bookingToDeparture(booking: CaphotelBooking): Departure {
  const roomNumbers = booking.rooms?.map(r => r.roomName || r.zimm.toString()).join(', ') || '-';

  return {
    id: booking.resn.toString(),
    guestId: booking.gast.toString(),
    name: booking.guestName || 'Unbekannt',
    email: booking.guestEmail,
    phone: booking.guestPhone,
    room: roomNumbers,
    checkOut: formatArrivalTime(new Date(booking.ande)),
    resn: booking.resn
  };
}

export default function Dashboard() {
  // State
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [bookings, setBookings] = useState<CaphotelBooking[]>([]);
  const [totalRooms, setTotalRooms] = useState(16); // Default, wird aus Firebase geladen
  const [isLoading, setIsLoading] = useState(true);
  const [holidaySettings, setHolidaySettings] = useState<HolidaySettings>(defaultHolidaySettings);

  // View Mode: Dashboard or Stats
  const [viewMode, setViewMode] = useState<'dashboard' | 'stats'>('dashboard');

  // Drawer states
  const [listDrawerOpen, setListDrawerOpen] = useState(false);
  const [listDrawerType, setListDrawerType] = useState<'arrivals' | 'departures'>('arrivals');
  const [cdsOpen, setCdsOpen] = useState(false);
  const [selectedGuest, setSelectedGuest] = useState<{ id: string; name: string; email?: string; phone?: string } | null>(null);

  // Load data from Firebase
  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      try {
        const [bookingsData, roomsData, settings] = await Promise.all([
          getSyncedBookings(),
          getSyncedRooms(),
          getHolidaySettings()
        ]);

        setBookings(bookingsData);
        setHolidaySettings(settings);

        // Setze Gesamtzimmer aus CapHotel-Sync oder verwende Default
        if (roomsData && roomsData.length > 0) {
          setTotalRooms(roomsData.length);
        }
      } catch (error) {
        console.error('Error loading dashboard data:', error);
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, []);

  // Calculate stats for selected date
  const stats = getDashboardStats(bookings, totalRooms, selectedDate);
  const arrivalsData = getArrivalsForDate(bookings, selectedDate);
  const departuresData = getDeparturesForDate(bookings, selectedDate);

  const upcomingArrivals: Arrival[] = arrivalsData.map(bookingToArrival);
  const upcomingDepartures: Departure[] = departuresData.map(bookingToDeparture);

  const openListDrawer = (type: 'arrivals' | 'departures') => {
    setListDrawerType(type);
    setListDrawerOpen(true);
  };

  const handleItemClick = (item: Arrival | Departure) => {
    setSelectedGuest({
      id: item.guestId,
      name: item.name,
      email: item.email,
      phone: item.phone
    });
    setListDrawerOpen(false);
    setCdsOpen(true);
  };

  const handleGuestClick = (item: Arrival | Departure) => {
    setSelectedGuest({
      id: item.guestId,
      name: item.name,
      email: item.email,
      phone: item.phone
    });
    setCdsOpen(true);
  };

  // Format date for header
  const formatDateHeader = (date: Date): string => {
    const today = new Date();
    const isToday = date.toDateString() === today.toDateString();
    if (isToday) return 'Heute';

    return date.toLocaleDateString('de-DE', {
      weekday: 'long',
      day: 'numeric',
      month: 'long'
    });
  };

  // Stats View
  if (viewMode === 'stats') {
    return (
      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Header with navigation */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 mb-2">Statistik</h1>
            <p className="text-slate-500">Auslastung und Buchungen</p>
          </div>
          <div className="flex items-center gap-4">
            <DateNavigation
              currentDate={selectedDate}
              onDateChange={setSelectedDate}
              holidaySettings={holidaySettings}
            />
            <button
              onClick={() => setViewMode('dashboard')}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              title="Dashboard-Ansicht"
            >
              <LayoutDashboard className="h-5 w-5 text-slate-600" />
            </button>
          </div>
        </div>

        {/* Stats Component */}
        <DashboardStats
          bookings={bookings}
          totalRooms={totalRooms}
          startDate={selectedDate}
        />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* Header with Date Navigation */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Dashboard</h1>
          <p className="text-slate-500">{formatDateHeader(selectedDate)}</p>
        </div>
        <div className="flex items-center gap-4 relative">
          <DateNavigation
            currentDate={selectedDate}
            onDateChange={setSelectedDate}
            holidaySettings={holidaySettings}
          />
          <button
            onClick={() => setViewMode('stats')}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
            title="Statistik-Ansicht"
          >
            <BarChart3 className="h-5 w-5 text-slate-600" />
          </button>
        </div>
      </div>

      {/* Loading State */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      ) : (
        <>
          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <div className="bg-slate-50 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="h-10 w-10 rounded-xl bg-green-100 flex items-center justify-center">
                  <ArrowDownRight className="h-5 w-5 text-green-600" />
                </div>
                <span className="text-xs font-medium text-green-600 bg-green-100 px-2 py-1 rounded-full">
                  {formatDateHeader(selectedDate) === 'Heute' ? 'Heute' : formatDateHeader(selectedDate).split(',')[0]}
                </span>
              </div>
              <p className="text-3xl font-bold text-slate-900 mb-1">{stats.arrivals}</p>
              <p className="text-sm text-slate-500">Ankünfte</p>
            </div>

            <div className="bg-slate-50 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="h-10 w-10 rounded-xl bg-orange-100 flex items-center justify-center">
                  <ArrowUpRight className="h-5 w-5 text-orange-600" />
                </div>
                <span className="text-xs font-medium text-orange-600 bg-orange-100 px-2 py-1 rounded-full">
                  {formatDateHeader(selectedDate) === 'Heute' ? 'Heute' : formatDateHeader(selectedDate).split(',')[0]}
                </span>
              </div>
              <p className="text-3xl font-bold text-slate-900 mb-1">{stats.departures}</p>
              <p className="text-sm text-slate-500">Abreisen</p>
            </div>

            <div className="bg-slate-50 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="h-10 w-10 rounded-xl bg-blue-100 flex items-center justify-center">
                  <Users className="h-5 w-5 text-blue-600" />
                </div>
              </div>
              <p className="text-3xl font-bold text-slate-900 mb-1">{stats.inHouse}</p>
              <p className="text-sm text-slate-500">Zimmer belegt</p>
            </div>

            <div className="bg-slate-50 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="h-10 w-10 rounded-xl bg-slate-200 flex items-center justify-center">
                  <Hotel className="h-5 w-5 text-slate-600" />
                </div>
              </div>
              <p className="text-3xl font-bold text-slate-900 mb-1">{stats.available}</p>
              <p className="text-sm text-slate-500">Zimmer frei</p>
            </div>
          </div>

          {/* Two Column Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Ankünfte */}
            <div>
              <button
                onClick={() => openListDrawer('arrivals')}
                className="w-full flex items-center justify-between mb-4 hover:bg-slate-50 -mx-2 px-2 py-1 rounded-lg transition-colors"
              >
                <h2 className="text-lg font-semibold text-slate-900">Ankünfte</h2>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-slate-500">{upcomingArrivals.length} Gäste</span>
                  <ChevronRight className="h-5 w-5 text-slate-400" />
                </div>
              </button>
              {upcomingArrivals.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-slate-400 bg-slate-50 rounded-xl">
                  <ArrowDownRight className="h-8 w-8 text-slate-300 mb-2" />
                  <p className="text-sm">Keine Ankünfte</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {upcomingArrivals.slice(0, 5).map((arrival) => (
                    <div
                      key={arrival.id}
                      onClick={() => handleGuestClick(arrival)}
                      className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
                    >
                      <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                        <ArrowDownRight className="h-5 w-5 text-green-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-slate-900">{arrival.name}</p>
                        <p className="text-sm text-slate-500">
                          Zimmer {arrival.room} • {arrival.guests} {arrival.guests === 1 ? 'Gast' : 'Gäste'}
                        </p>
                      </div>
                      <div className="text-sm text-slate-400">
                        {arrival.checkIn}
                      </div>
                    </div>
                  ))}
                  {upcomingArrivals.length > 5 && (
                    <button
                      onClick={() => openListDrawer('arrivals')}
                      className="w-full py-2 text-sm text-blue-600 hover:text-blue-700 font-medium"
                    >
                      +{upcomingArrivals.length - 5} weitere anzeigen
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Abreisen */}
            <div>
              <button
                onClick={() => openListDrawer('departures')}
                className="w-full flex items-center justify-between mb-4 hover:bg-slate-50 -mx-2 px-2 py-1 rounded-lg transition-colors"
              >
                <h2 className="text-lg font-semibold text-slate-900">Abreisen</h2>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-slate-500">{upcomingDepartures.length} Gäste</span>
                  <ChevronRight className="h-5 w-5 text-slate-400" />
                </div>
              </button>
              {upcomingDepartures.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-slate-400 bg-slate-50 rounded-xl">
                  <ArrowUpRight className="h-8 w-8 text-slate-300 mb-2" />
                  <p className="text-sm">Keine Abreisen</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {upcomingDepartures.slice(0, 5).map((departure) => (
                    <div
                      key={departure.id}
                      onClick={() => handleGuestClick(departure)}
                      className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
                    >
                      <div className="h-10 w-10 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0">
                        <ArrowUpRight className="h-5 w-5 text-orange-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-slate-900">{departure.name}</p>
                        <p className="text-sm text-slate-500">
                          Zimmer {departure.room}
                        </p>
                      </div>
                      <div className="text-sm text-slate-400">
                        {departure.checkOut}
                      </div>
                    </div>
                  ))}
                  {upcomingDepartures.length > 5 && (
                    <button
                      onClick={() => openListDrawer('departures')}
                      className="w-full py-2 text-sm text-blue-600 hover:text-blue-700 font-medium"
                    >
                      +{upcomingDepartures.length - 5} weitere anzeigen
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* List Drawer */}
      <ListDrawer
        isOpen={listDrawerOpen}
        onClose={() => setListDrawerOpen(false)}
        type={listDrawerType}
        items={listDrawerType === 'arrivals' ? upcomingArrivals : upcomingDepartures}
        onItemClick={handleItemClick}
      />

      {/* CDS */}
      <CustomerDetailSheet
        isOpen={cdsOpen}
        onClose={() => { setCdsOpen(false); setSelectedGuest(null); }}
        customer={selectedGuest ? {
          id: selectedGuest.id,
          name: selectedGuest.name,
          email: selectedGuest.email,
          phone: selectedGuest.phone,
        } : null}
      />
    </div>
  );
}
