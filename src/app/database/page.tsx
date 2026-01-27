'use client';

import { useState, useEffect, useMemo } from 'react';
import { Search, ChevronRight, ChevronDown, Plus, User, Calendar, Hash, Euro, Utensils, Building2, ExternalLink } from 'lucide-react';
import { CustomerDetailSheet } from '@/components/drawers/CustomerDetailSheet';
import { getSyncedBookings, getSyncedGuests, CaphotelBooking, CaphotelGuest } from '@/lib/firestore';

// Types
type BookingStatus = 'lead' | 'offer' | 'booked' | 'cancelled';
type GuestStage = 'lead' | 'booked' | 'past_booking';
type TabType = 'guests' | 'bookings';

interface Guest {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  street?: string;
  city?: string;
  country?: string;
  postalCode?: string;
}

interface Booking {
  id: string;
  bookingNumber: string;
  guestId: string;
  guestName: string;
  guestEmail?: string;
  roomNumber: string;
  roomName?: string;
  checkIn: string;
  checkOut: string;
  status: BookingStatus;
  adults: number;
  children: number;
}

// Helper: Parse date string (DD.MM.YYYY) to Date
function parseDate(dateStr: string): Date {
  if (!dateStr) return new Date();
  // Handle ISO format
  if (dateStr.includes('-')) {
    return new Date(dateStr);
  }
  const [day, month, year] = dateStr.split('.').map(Number);
  return new Date(year, month - 1, day);
}

// Helper: Format date to DD.MM.YYYY
function formatDate(dateStr: string): string {
  if (!dateStr) return '-';
  const date = parseDate(dateStr);
  return date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

// Helper: Get guest stage based on bookings
function getGuestStage(guestId: string, bookings: Booking[]): GuestStage {
  const guestBookings = bookings.filter(b => b.guestId === guestId);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const hasActiveBooking = guestBookings.some(b => {
    if (b.status !== 'booked') return false;
    const checkIn = parseDate(b.checkIn);
    const checkOut = parseDate(b.checkOut);
    return checkIn <= today && today <= checkOut;
  });
  if (hasActiveBooking) return 'booked';

  const hasFutureBooking = guestBookings.some(b => {
    if (b.status !== 'booked') return false;
    const checkIn = parseDate(b.checkIn);
    return checkIn > today;
  });
  if (hasFutureBooking) return 'booked';

  const hasPastBooking = guestBookings.some(b => {
    if (b.status !== 'booked') return false;
    const checkOut = parseDate(b.checkOut);
    return checkOut < today;
  });
  if (hasPastBooking) return 'past_booking';

  return 'lead';
}

// Status colors and labels
const stageColors: Record<GuestStage, string> = {
  'lead': 'bg-yellow-100 text-yellow-700',
  'booked': 'bg-green-100 text-green-700',
  'past_booking': 'bg-slate-100 text-slate-600'
};

const stageLabels: Record<GuestStage, string> = {
  'lead': 'Lead',
  'booked': 'Gebucht',
  'past_booking': 'Vergangen'
};

// Booking status based on CapCorn stat field
const bookingStatusColors: Record<number, string> = {
  1: 'bg-yellow-100 text-yellow-700 border-yellow-200',   // Option/Angebot
  2: 'bg-green-100 text-green-700 border-green-200',      // Gebucht
  3: 'bg-red-100 text-red-700 border-red-200',            // Storniert
  4: 'bg-slate-100 text-slate-600 border-slate-200',      // Ausgecheckt
};

const bookingStatusLabels: Record<number, string> = {
  1: 'Option',
  2: 'Gebucht',
  3: 'Storniert',
  4: 'Ausgecheckt',
};

// Jahre fuer Filter
const years = [2023, 2024, 2025, 2026];

export default function DatabasePage() {
  const [activeTab, setActiveTab] = useState<TabType>('bookings');
  const [searchQuery, setSearchQuery] = useState('');
  const [stageFilter, setStageFilter] = useState<GuestStage | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<number | 'all'>('all');
  const [yearFilter, setYearFilter] = useState<number | 'all'>('all');
  const [guests, setGuests] = useState<Guest[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [caphotelBookings, setCaphotelBookings] = useState<CaphotelBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedGuest, setSelectedGuest] = useState<Guest | null>(null);
  const [selectedBooking, setSelectedBooking] = useState<CaphotelBooking | null>(null);
  const [cdsOpen, setCdsOpen] = useState(false);

  // Daten aus Firestore laden
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        // Load synced bookings from Firestore
        const syncedBookings = await getSyncedBookings();
        setCaphotelBookings(syncedBookings);

        // Load synced guests
        const syncedGuests = await getSyncedGuests();
        const mappedGuests: Guest[] = syncedGuests.map((g: CaphotelGuest) => ({
          id: g.gast.toString(),
          firstName: g.vorn || '',
          lastName: g.nacn || '',
          email: g.mail,
          phone: g.teln,
          street: g.stra,
          city: g.ortb,
          country: g.land,
          postalCode: g.polz
        }));
        setGuests(mappedGuests);

        // Map bookings for guest stage calculation
        const mappedBookings: Booking[] = syncedBookings.map((b: CaphotelBooking) => ({
          id: b.resn.toString(),
          bookingNumber: b.resn.toString().padStart(5, '0'),
          guestId: b.gast.toString(),
          guestName: b.guestName || 'Unbekannt',
          guestEmail: b.guestEmail,
          roomNumber: b.rooms?.[0]?.zimm?.toString() || '-',
          roomName: '',
          checkIn: b.andf,
          checkOut: b.ande,
          status: b.stat === 2 ? 'booked' : b.stat === 3 ? 'cancelled' : 'offer',
          adults: b.rooms?.[0]?.pers || 2,
          children: b.rooms?.[0]?.kndr || 0
        }));
        setBookings(mappedBookings);
      } catch (error) {
        console.error('Error loading data:', error);
      }
      setLoading(false);
    };

    loadData();
  }, []);

  // Compute guest stages
  const guestStages = useMemo(() => {
    const stages: Record<string, GuestStage> = {};
    guests.forEach(guest => {
      stages[guest.id] = getGuestStage(guest.id, bookings);
    });
    return stages;
  }, [guests, bookings]);

  // Gefilterte Gäste
  const filteredGuests = useMemo(() => {
    return guests.filter(guest => {
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesSearch =
          guest.firstName.toLowerCase().includes(query) ||
          guest.lastName.toLowerCase().includes(query) ||
          guest.email?.toLowerCase().includes(query) ||
          guest.phone?.includes(query);
        if (!matchesSearch) return false;
      }

      if (stageFilter !== 'all') {
        if (guestStages[guest.id] !== stageFilter) return false;
      }

      return true;
    });
  }, [guests, searchQuery, stageFilter, guestStages]);

  // Gefilterte Buchungen
  const filteredBookings = useMemo(() => {
    return caphotelBookings.filter(booking => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesSearch =
          booking.resn.toString().includes(query) ||
          booking.extn?.toLowerCase().includes(query) ||
          booking.guestName?.toLowerCase().includes(query) ||
          booking.guestEmail?.toLowerCase().includes(query);
        if (!matchesSearch) return false;
      }

      // Status filter
      if (statusFilter !== 'all') {
        if (booking.stat !== statusFilter) return false;
      }

      // Year filter
      if (yearFilter !== 'all') {
        const arrivalYear = new Date(booking.andf).getFullYear();
        if (arrivalYear !== yearFilter) return false;
      }

      return true;
    });
  }, [caphotelBookings, searchQuery, statusFilter, yearFilter]);

  const handleGuestClick = (guest: Guest) => {
    setSelectedGuest(guest);
    setSelectedBooking(null);
    setCdsOpen(true);
  };

  const handleBookingClick = (booking: CaphotelBooking) => {
    // Find the guest for this booking
    const guest = guests.find(g => g.id === booking.gast.toString());
    if (guest) {
      setSelectedGuest(guest);
    } else {
      // Create a temporary guest from booking data
      setSelectedGuest({
        id: booking.gast.toString(),
        firstName: booking.guestName?.split(' ')[0] || '',
        lastName: booking.guestName?.split(' ').slice(1).join(' ') || '',
        email: booking.guestEmail
      });
    }
    setSelectedBooking(booking);
    setCdsOpen(true);
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Tabs */}
      <div className="border-b border-slate-200">
        <div className="flex">
          <button
            onClick={() => setActiveTab('bookings')}
            className={`flex-1 px-6 py-4 text-sm font-medium transition-colors border-b-2 ${
              activeTab === 'bookings'
                ? 'text-blue-600 border-blue-600'
                : 'text-slate-500 border-transparent hover:text-slate-700'
            }`}
          >
            <Hash className="h-4 w-4 inline mr-2" />
            Buchungen ({caphotelBookings.length})
          </button>
          <button
            onClick={() => setActiveTab('guests')}
            className={`flex-1 px-6 py-4 text-sm font-medium transition-colors border-b-2 ${
              activeTab === 'guests'
                ? 'text-blue-600 border-blue-600'
                : 'text-slate-500 border-transparent hover:text-slate-700'
            }`}
          >
            <User className="h-4 w-4 inline mr-2" />
            Gäste ({guests.length})
          </button>
        </div>
      </div>

      {/* Full-Width Search */}
      <div className="border-b border-slate-200">
        <div className="relative">
          <Search className="absolute left-6 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={activeTab === 'bookings' ? 'Buchungsnummer, Name oder E-Mail suchen...' : 'Name, E-Mail oder Telefon suchen...'}
            className="w-full pl-14 pr-6 py-5 text-lg text-slate-900 placeholder-slate-400 focus:outline-none"
            autoFocus
          />
        </div>
      </div>

      {/* Filters */}
      <div className="border-b border-slate-200 px-6 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {/* Jahr Filter */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-500">Jahr:</span>
              <div className="relative">
                <select
                  value={yearFilter}
                  onChange={(e) => setYearFilter(e.target.value === 'all' ? 'all' : parseInt(e.target.value))}
                  className="appearance-none pl-3 pr-8 py-1.5 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                >
                  <option value="all">Alle</option>
                  {years.map((year) => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
              </div>
            </div>

            {/* Status Filter - different for each tab */}
            {activeTab === 'bookings' ? (
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-500">Status:</span>
                {(['all', 1, 2, 3, 4] as const).map((status) => (
                  <button
                    key={status}
                    onClick={() => setStatusFilter(status)}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                      statusFilter === status
                        ? status === 'all'
                          ? 'bg-slate-900 text-white'
                          : bookingStatusColors[status]
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {status === 'all' ? 'Alle' : bookingStatusLabels[status]}
                  </button>
                ))}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-500">Status:</span>
                {(['all', 'lead', 'booked', 'past_booking'] as const).map((stage) => (
                  <button
                    key={stage}
                    onClick={() => setStageFilter(stage)}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                      stageFilter === stage
                        ? stage === 'all'
                          ? 'bg-slate-900 text-white'
                          : stageColors[stage]
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {stage === 'all' ? 'Alle' : stageLabels[stage]}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Neuer Eintrag Button */}
          <button className="flex items-center justify-center w-9 h-9 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Neu">
            <Plus className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="px-6 py-4">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-10 w-10 border-2 border-slate-200 border-t-slate-900"></div>
          </div>
        ) : activeTab === 'bookings' ? (
          /* Bookings Tab */
          filteredBookings.length === 0 ? (
            <div className="text-center py-20">
              <Hash className="h-12 w-12 text-slate-200 mx-auto mb-4" />
              <p className="text-slate-500">{searchQuery ? 'Keine Buchungen gefunden' : 'Keine Buchungen vorhanden'}</p>
              <p className="text-sm text-slate-400 mt-2">Synchronisiere Daten über die Bridge</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredBookings.map((booking) => (
                <button
                  key={booking.resn}
                  onClick={() => handleBookingClick(booking)}
                  className="w-full flex items-center gap-4 p-4 hover:bg-slate-50 rounded-xl transition-colors text-left border border-slate-100"
                >
                  {/* Buchungsnummer - prominent links */}
                  <div className="w-20 flex-shrink-0">
                    <div className="text-2xl font-bold text-slate-900 font-mono">
                      {booking.resn.toString().padStart(5, '0')}
                    </div>
                  </div>

                  {/* Externe Nummer */}
                  <div className="w-32 flex-shrink-0">
                    {booking.extn ? (
                      <div className="flex items-center gap-1">
                        <ExternalLink className="h-3 w-3 text-slate-400" />
                        <span className="text-sm text-slate-600 truncate">{booking.extn}</span>
                      </div>
                    ) : (
                      <span className="text-sm text-slate-300">-</span>
                    )}
                  </div>

                  {/* Name & Channel */}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-900 truncate">{booking.guestName || 'Unbekannt'}</p>
                    <p className="text-sm text-slate-500 truncate">
                      {booking.channelName || 'Direkt'}
                    </p>
                  </div>

                  {/* Anreise/Abreise */}
                  <div className="w-40 flex-shrink-0 text-center">
                    <div className="flex items-center justify-center gap-2 text-sm">
                      <Calendar className="h-4 w-4 text-slate-400" />
                      <span className="text-slate-700">{formatDate(booking.andf)}</span>
                      <span className="text-slate-300">→</span>
                      <span className="text-slate-700">{formatDate(booking.ande)}</span>
                    </div>
                  </div>

                  {/* Zimmer */}
                  <div className="w-20 flex-shrink-0 text-center">
                    {booking.rooms && booking.rooms.length > 0 && (
                      <div className="flex items-center justify-center gap-1">
                        <Building2 className="h-4 w-4 text-slate-400" />
                        <span className="text-sm text-slate-700">
                          {booking.rooms.map(r => r.zimm).join(', ')}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Summe */}
                  <div className="w-24 flex-shrink-0 text-right">
                    {booking.accountTotal !== undefined && booking.accountTotal > 0 ? (
                      <div className="flex items-center justify-end gap-1">
                        <Euro className="h-4 w-4 text-green-600" />
                        <span className="font-semibold text-green-700">
                          {booking.accountTotal.toFixed(2)}
                        </span>
                      </div>
                    ) : (
                      <span className="text-sm text-slate-300">-</span>
                    )}
                  </div>

                  {/* Status Badge */}
                  <div className="w-24 flex-shrink-0">
                    <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium border ${bookingStatusColors[booking.stat] || 'bg-slate-100 text-slate-600'}`}>
                      {bookingStatusLabels[booking.stat] || 'Unbekannt'}
                    </span>
                  </div>

                  <ChevronRight className="h-5 w-5 text-slate-300 flex-shrink-0" />
                </button>
              ))}
            </div>
          )
        ) : (
          /* Guests Tab */
          filteredGuests.length === 0 ? (
            <div className="text-center py-20">
              <User className="h-12 w-12 text-slate-200 mx-auto mb-4" />
              <p className="text-slate-500">{searchQuery ? 'Keine Gäste gefunden' : 'Keine Gäste vorhanden'}</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredGuests.map((guest) => {
                const stage = guestStages[guest.id];
                return (
                  <button
                    key={guest.id}
                    onClick={() => handleGuestClick(guest)}
                    className="w-full flex items-center gap-4 p-4 hover:bg-slate-50 rounded-xl transition-colors text-left"
                  >
                    <div className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0">
                      <span className="text-lg font-medium text-slate-600">{guest.firstName.charAt(0)}{guest.lastName.charAt(0)}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-slate-900">{guest.firstName} {guest.lastName}</p>
                      <p className="text-sm text-slate-500 truncate">{guest.email || guest.phone || 'Keine Kontaktdaten'}</p>
                    </div>
                    <span className={`text-xs px-3 py-1 rounded-full ${stageColors[stage]}`}>
                      {stageLabels[stage]}
                    </span>
                    <ChevronRight className="h-5 w-5 text-slate-300 flex-shrink-0" />
                  </button>
                );
              })}
            </div>
          )
        )}
      </div>

      {/* Stats Footer */}
      <div className="px-6 py-4 text-center text-sm text-slate-400 border-t border-slate-100">
        {activeTab === 'bookings'
          ? `${filteredBookings.length} von ${caphotelBookings.length} Buchungen`
          : `${filteredGuests.length} von ${guests.length} Gästen`
        }
      </div>

      {/* Customer Detail Sheet */}
      <CustomerDetailSheet
        isOpen={cdsOpen}
        onClose={() => { setCdsOpen(false); setSelectedGuest(null); setSelectedBooking(null); }}
        customer={selectedGuest ? {
          id: selectedGuest.id,
          name: `${selectedGuest.firstName} ${selectedGuest.lastName}`,
          email: selectedGuest.email,
          phone: selectedGuest.phone,
          address: {
            street: selectedGuest.street,
            postalCode: selectedGuest.postalCode,
            city: selectedGuest.city,
            country: selectedGuest.country,
          }
        } : null}
        bookings={selectedGuest ? bookings.filter(b => b.guestId === selectedGuest.id && b.status === 'booked').map(b => ({
          id: b.id,
          displayId: `#${b.bookingNumber}`,
          checkIn: b.checkIn,
          checkOut: b.checkOut,
          roomName: b.roomName,
          roomNumber: b.roomNumber,
          adults: b.adults,
          children: b.children,
          status: b.status,
        })) : []}
        inquiries={selectedGuest ? bookings.filter(b => b.guestId === selectedGuest.id && (b.status === 'lead' || b.status === 'offer')).map(b => ({
          id: b.id,
          displayId: `#${b.bookingNumber}`,
          checkIn: b.checkIn,
          checkOut: b.checkOut,
          roomName: b.roomName,
          roomNumber: b.roomNumber,
          adults: b.adults,
          children: b.children,
          status: b.status,
        })) : []}
        stage={selectedGuest ? guestStages[selectedGuest.id] : undefined}
      />
    </div>
  );
}
