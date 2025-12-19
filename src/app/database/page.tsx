'use client';

import { useState, useEffect, useMemo } from 'react';
import { Search, ChevronRight, ChevronDown, Plus, User } from 'lucide-react';
import { CustomerDetailSheet } from '@/components/drawers/CustomerDetailSheet';

// Types
type BookingStatus = 'lead' | 'offer' | 'booked' | 'cancelled';
type GuestStage = 'lead' | 'booked' | 'past_booking';

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
  const [day, month, year] = dateStr.split('.').map(Number);
  return new Date(year, month - 1, day);
}

// Helper: Get guest stage based on bookings
function getGuestStage(guestId: string, bookings: Booking[]): GuestStage {
  const guestBookings = bookings.filter(b => b.guestId === guestId);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Check for active booking (check-in <= today <= check-out, status = booked)
  const hasActiveBooking = guestBookings.some(b => {
    if (b.status !== 'booked') return false;
    const checkIn = parseDate(b.checkIn);
    const checkOut = parseDate(b.checkOut);
    return checkIn <= today && today <= checkOut;
  });
  if (hasActiveBooking) return 'booked';

  // Check for future booking (check-in > today, status = booked)
  const hasFutureBooking = guestBookings.some(b => {
    if (b.status !== 'booked') return false;
    const checkIn = parseDate(b.checkIn);
    return checkIn > today;
  });
  if (hasFutureBooking) return 'booked';

  // Check for past booking (check-out < today, status = booked)
  const hasPastBooking = guestBookings.some(b => {
    if (b.status !== 'booked') return false;
    const checkOut = parseDate(b.checkOut);
    return checkOut < today;
  });
  if (hasPastBooking) return 'past_booking';

  // Default: Lead (has inquiry or no bookings)
  return 'lead';
}

const stageColors: Record<GuestStage, string> = {
  'lead': 'bg-yellow-100 text-yellow-700',
  'booked': 'bg-green-100 text-green-700',
  'past_booking': 'bg-slate-100 text-slate-600'
};

const stageLabels: Record<GuestStage, string> = {
  'lead': 'Lead',
  'booked': 'Booked',
  'past_booking': 'Past Booking'
};

// Jahre fuer Filter
const years = [2023, 2024, 2025, 2026];

export default function DatabasePage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [stageFilter, setStageFilter] = useState<GuestStage | 'all'>('all');
  const [yearFilter, setYearFilter] = useState<number | 'all'>('all');
  const [guests, setGuests] = useState<Guest[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedGuest, setSelectedGuest] = useState<Guest | null>(null);
  const [cdsOpen, setCdsOpen] = useState(false);

  // Daten laden
  useEffect(() => {
    setLoading(true);
    setTimeout(() => {
      setGuests([
        { id: '1', firstName: 'Max', lastName: 'Mustermann', email: 'max.mustermann@example.com', phone: '+43 664 1234567', street: 'Hauptstraße 1', city: 'Wien', country: 'Österreich', postalCode: '1010' },
        { id: '2', firstName: 'Maria', lastName: 'Musterfrau', email: 'maria@example.com', phone: '+43 660 9876543', city: 'Salzburg', country: 'Österreich' },
        { id: '3', firstName: 'Hans', lastName: 'Huber', email: 'hans.huber@gmx.at', phone: '+43 664 5555555', street: 'Seestraße 42', city: 'Attersee', country: 'Österreich', postalCode: '4864' },
        { id: '4', firstName: 'Anna', lastName: 'Schmidt', email: 'anna.schmidt@web.de', phone: '+49 170 1234567', street: 'Bergweg 8', city: 'München', country: 'Deutschland', postalCode: '80331' },
        { id: '5', firstName: 'Thomas', lastName: 'Weber', email: 'thomas.weber@gmail.com', phone: '+43 699 1112233', city: 'Linz', country: 'Österreich' }
      ]);

      setBookings([
        { id: '1', bookingNumber: '12345', guestId: '1', guestName: 'Max Mustermann', guestEmail: 'max.mustermann@example.com', roomNumber: '101', roomName: 'Doppelzimmer Seeblick', checkIn: '15.12.2025', checkOut: '18.12.2025', status: 'booked', adults: 2, children: 0 },
        { id: '2', bookingNumber: '12346', guestId: '2', guestName: 'Maria Musterfrau', guestEmail: 'maria@example.com', roomNumber: '203', roomName: 'Suite Bergblick', checkIn: '20.01.2025', checkOut: '25.01.2025', status: 'offer', adults: 2, children: 1 },
        { id: '3', bookingNumber: '12340', guestId: '3', guestName: 'Hans Huber', guestEmail: 'hans.huber@gmx.at', roomNumber: '102', roomName: 'Einzelzimmer', checkIn: '10.11.2024', checkOut: '12.11.2024', status: 'booked', adults: 1, children: 0 },
        { id: '4', bookingNumber: '12347', guestId: '4', guestName: 'Anna Schmidt', guestEmail: 'anna.schmidt@web.de', roomNumber: '201', roomName: 'Suite Panorama', checkIn: '01.02.2025', checkOut: '05.02.2025', status: 'lead', adults: 2, children: 0 }
      ]);
      setLoading(false);
    }, 500);
  }, []);

  // Compute guest stages
  const guestStages = useMemo(() => {
    const stages: Record<string, GuestStage> = {};
    guests.forEach(guest => {
      stages[guest.id] = getGuestStage(guest.id, bookings);
    });
    return stages;
  }, [guests, bookings]);

  // Gefilterte Ergebnisse
  const filteredGuests = useMemo(() => {
    return guests.filter(guest => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesSearch =
          guest.firstName.toLowerCase().includes(query) ||
          guest.lastName.toLowerCase().includes(query) ||
          guest.email?.toLowerCase().includes(query) ||
          guest.phone?.includes(query);
        if (!matchesSearch) return false;
      }

      // Stage filter
      if (stageFilter !== 'all') {
        if (guestStages[guest.id] !== stageFilter) return false;
      }

      return true;
    });
  }, [guests, searchQuery, stageFilter, guestStages]);

  const handleGuestClick = (guest: Guest) => {
    setSelectedGuest(guest);
    setCdsOpen(true);
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Full-Width Search */}
      <div className="border-b border-slate-200">
        <div className="relative">
          <Search className="absolute left-6 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Name, E-Mail oder Telefon suchen..."
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

            {/* Status Filter */}
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
          </div>

          {/* Neuer Gast Button */}
          <button className="flex items-center justify-center w-9 h-9 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Neuer Gast">
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
        ) : filteredGuests.length === 0 ? (
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
        )}
      </div>

      {/* Stats Footer */}
      <div className="px-6 py-4 text-center text-sm text-slate-400 border-t border-slate-100">
        {filteredGuests.length} von {guests.length} Gästen
      </div>

      {/* CDS */}
      <CustomerDetailSheet
        isOpen={cdsOpen}
        onClose={() => { setCdsOpen(false); setSelectedGuest(null); }}
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
