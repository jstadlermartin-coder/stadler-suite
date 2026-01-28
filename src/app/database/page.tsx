'use client';

import { useState, useEffect, useMemo } from 'react';
import { Search, ChevronRight, ChevronDown, Plus, Calendar, Hash, Euro, Building2, ExternalLink, Users, User } from 'lucide-react';
import { CustomerDetailSheet } from '@/components/drawers/CustomerDetailSheet';
import { getSyncedBookings, getDeduplicatedGuests, CaphotelBooking, DeduplicatedGuest } from '@/lib/firestore';
import { formatCustomerNumber, formatPession } from '@/lib/utils';
import { useGuestDrawer } from '@/components/drawers/GuestDrawer';

// Types
type BookingStatus = 'lead' | 'offer' | 'booked' | 'cancelled';
type ActiveTab = 'bookings' | 'guests';

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
  customerNumber?: number;
  caphotelGuestIds?: number[];
  totalBookings?: number;
  totalRevenue?: number;
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

// Filter Types
interface BookingFilters {
  gebucht: boolean;
  angebote: boolean;
  bookingCom: boolean;
  expedia: boolean;
  hrs: boolean;
  trivago: boolean;
  direkt: boolean;
}

// Helper: Parse date string (DD.MM.YYYY) to Date
function parseDate(dateStr: string): Date {
  if (!dateStr) return new Date();
  if (dateStr.includes('-')) {
    return new Date(dateStr);
  }
  const [day, month, year] = dateStr.split('.').map(Number);
  return new Date(year, month - 1, day);
}

// Helper: Format date to DD.MM
function formatDateShort(dateStr: string): string {
  if (!dateStr) return '-';
  const date = parseDate(dateStr);
  return date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
}

// Booking status based on CapCorn stat field
const bookingStatusColors: Record<number, string> = {
  0: 'bg-orange-100 text-orange-700 border-orange-200', // Angebot (nicht bestaetigt)
  1: 'bg-yellow-100 text-yellow-700 border-yellow-200', // Option/Angebot
  2: 'bg-green-100 text-green-700 border-green-200',    // Gebucht
  3: 'bg-red-100 text-red-700 border-red-200',          // Storniert
  4: 'bg-slate-100 text-slate-600 border-slate-200',    // Ausgecheckt
};

const bookingStatusLabels: Record<number, string> = {
  0: 'Angebot',
  1: 'Option',
  2: 'Gebucht',
  3: 'Storniert',
  4: 'Ausgecheckt',
};

// Channel Badge Colors
const channelColors: Record<string, string> = {
  'booking': 'bg-blue-600 text-white',
  'expedia': 'bg-yellow-500 text-black',
  'hrs': 'bg-red-600 text-white',
  'trivago': 'bg-teal-600 text-white',
  'direkt': 'bg-slate-600 text-white',
};

function getChannelColor(channelName?: string): string {
  if (!channelName) return channelColors.direkt;
  const lower = channelName.toLowerCase();
  if (lower.includes('booking')) return channelColors.booking;
  if (lower.includes('expedia')) return channelColors.expedia;
  if (lower.includes('hrs')) return channelColors.hrs;
  if (lower.includes('trivago')) return channelColors.trivago;
  return channelColors.direkt;
}

// Jahre fuer Filter
const years = [2024, 2025, 2026, 2027];

// Default filters - all false means show all
const defaultFilters: BookingFilters = {
  gebucht: false,
  angebote: false,
  bookingCom: false,
  expedia: false,
  hrs: false,
  trivago: false,
  direkt: false,
};

export default function DatabasePage() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('bookings');
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<BookingFilters>(defaultFilters);
  const [yearFilter, setYearFilter] = useState<number | 'all'>(new Date().getFullYear());
  const [guests, setGuests] = useState<Guest[]>([]);
  const [deduplicatedGuests, setDeduplicatedGuests] = useState<DeduplicatedGuest[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [caphotelBookings, setCaphotelBookings] = useState<CaphotelBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedGuest, setSelectedGuest] = useState<Guest | null>(null);
  const [selectedBooking, setSelectedBooking] = useState<CaphotelBooking | null>(null);
  const [cdsOpen, setCdsOpen] = useState(false);

  const { openGuest } = useGuestDrawer();

  // Check if any filter is active
  const isAnyFilterActive = Object.values(filters).some(v => v);

  // Toggle filter
  const toggleFilter = (key: keyof BookingFilters) => {
    setFilters(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // Reset all filters
  const resetFilters = () => {
    setFilters(defaultFilters);
  };

  // Daten aus Firestore laden
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        // Load synced bookings from Firestore
        const syncedBookings = await getSyncedBookings();
        setCaphotelBookings(syncedBookings);

        // Load deduplicated guests
        const dedupGuests = await getDeduplicatedGuests();
        setDeduplicatedGuests(dedupGuests);

        // Map deduplicated guests to Guest interface
        const mappedGuests: Guest[] = dedupGuests.map((g: DeduplicatedGuest) => ({
          id: g.id,
          firstName: g.firstName || '',
          lastName: g.lastName || '',
          email: g.email,
          phone: g.phone,
          street: g.street,
          city: g.city,
          country: g.country,
          postalCode: g.postalCode,
          customerNumber: g.customerNumber,
          caphotelGuestIds: g.caphotelGuestIds,
          totalBookings: g.totalBookings,
          totalRevenue: g.totalRevenue,
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

      // Year filter
      if (yearFilter !== 'all') {
        const arrivalYear = new Date(booking.andf).getFullYear();
        if (arrivalYear !== yearFilter) return false;
      }

      // If no filters are active, show all
      if (!isAnyFilterActive) return true;

      // Status filters (combinable)
      const statusFiltersActive = filters.gebucht || filters.angebote;
      let matchesStatus = false;

      if (statusFiltersActive) {
        if (filters.gebucht && booking.stat === 2) matchesStatus = true;
        if (filters.angebote && (booking.stat === 0 || booking.stat === 1)) matchesStatus = true;
      } else {
        matchesStatus = true; // No status filter = match all
      }

      // Channel filters (combinable)
      const channelFiltersActive = filters.bookingCom || filters.expedia || filters.hrs || filters.trivago || filters.direkt;
      let matchesChannel = false;

      if (channelFiltersActive) {
        const channelName = booking.channelName?.toLowerCase() || '';
        const isDirect = booking.chid === 0 || !booking.channelName;

        if (filters.bookingCom && channelName.includes('booking')) matchesChannel = true;
        if (filters.expedia && channelName.includes('expedia')) matchesChannel = true;
        if (filters.hrs && channelName.includes('hrs')) matchesChannel = true;
        if (filters.trivago && channelName.includes('trivago')) matchesChannel = true;
        if (filters.direkt && isDirect) matchesChannel = true;
      } else {
        matchesChannel = true; // No channel filter = match all
      }

      return matchesStatus && matchesChannel;
    });
  }, [caphotelBookings, searchQuery, yearFilter, filters, isAnyFilterActive]);

  // Gefilterte Gaeste
  const filteredGuests = useMemo(() => {
    if (!searchQuery) return deduplicatedGuests;

    const query = searchQuery.toLowerCase();
    return deduplicatedGuests.filter(guest => {
      return (
        guest.firstName?.toLowerCase().includes(query) ||
        guest.lastName?.toLowerCase().includes(query) ||
        guest.email?.toLowerCase().includes(query) ||
        guest.phone?.includes(query) ||
        formatCustomerNumber(guest.customerNumber).toLowerCase().includes(query)
      );
    });
  }, [deduplicatedGuests, searchQuery]);

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

  const handleGuestClick = (guest: DeduplicatedGuest) => {
    // Open the GuestDrawer with this guest
    openGuest({
      id: guest.id,
      customerNumber: guest.customerNumber,
      firstName: guest.firstName,
      lastName: guest.lastName,
      email: guest.email,
      phone: guest.phone,
      street: guest.street,
      city: guest.city,
      country: guest.country,
      postalCode: guest.postalCode,
      caphotelGuestIds: guest.caphotelGuestIds,
      totalBookings: guest.totalBookings,
      totalRevenue: guest.totalRevenue,
    });
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="border-b border-slate-200 px-6 py-4">
        <h1 className="text-2xl font-bold text-slate-900">
          <Hash className="h-6 w-6 inline mr-2 text-slate-400" />
          Database
        </h1>
        <p className="text-sm text-slate-500 mt-1">Buchungen, Angebote und Gaeste</p>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200">
        <div className="flex px-6">
          <button
            onClick={() => setActiveTab('bookings')}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'bookings'
                ? 'border-slate-900 text-slate-900'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            Buchungen & Angebote
          </button>
          <button
            onClick={() => setActiveTab('guests')}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'guests'
                ? 'border-slate-900 text-slate-900'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            Gaeste
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
            placeholder={activeTab === 'bookings'
              ? "Buchungsnummer, Name oder E-Mail suchen..."
              : "Kundennummer, Name oder E-Mail suchen..."
            }
            className="w-full pl-14 pr-6 py-5 text-lg text-slate-900 placeholder-slate-400 focus:outline-none"
            autoFocus
          />
        </div>
      </div>

      {/* Filters - Only for Bookings Tab */}
      {activeTab === 'bookings' && (
        <div className="border-b border-slate-200 px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4 flex-wrap">
              {/* Alle Button */}
              <button
                onClick={resetFilters}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                  !isAnyFilterActive
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Alle
              </button>

              {/* Divider */}
              <div className="h-6 w-px bg-slate-200" />

              {/* Status Filters */}
              <button
                onClick={() => toggleFilter('gebucht')}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                  filters.gebucht
                    ? 'bg-green-100 text-green-700 border border-green-200'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Gebucht
              </button>
              <button
                onClick={() => toggleFilter('angebote')}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                  filters.angebote
                    ? 'bg-yellow-100 text-yellow-700 border border-yellow-200'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Angebote
              </button>

              {/* Divider */}
              <div className="h-6 w-px bg-slate-200" />

              {/* Channel Filters */}
              <button
                onClick={() => toggleFilter('bookingCom')}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                  filters.bookingCom
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Booking.com
              </button>
              <button
                onClick={() => toggleFilter('expedia')}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                  filters.expedia
                    ? 'bg-yellow-500 text-black'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Expedia
              </button>
              <button
                onClick={() => toggleFilter('hrs')}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                  filters.hrs
                    ? 'bg-red-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                HRS
              </button>
              <button
                onClick={() => toggleFilter('trivago')}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                  filters.trivago
                    ? 'bg-teal-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Trivago
              </button>
              <button
                onClick={() => toggleFilter('direkt')}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                  filters.direkt
                    ? 'bg-slate-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Direkt
              </button>

              {/* Divider */}
              <div className="h-6 w-px bg-slate-200" />

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
            </div>

            {/* Neuer Eintrag Button */}
            <button className="flex items-center justify-center w-9 h-9 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Neu">
              <Plus className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="px-6 py-4">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-10 w-10 border-2 border-slate-200 border-t-slate-900"></div>
          </div>
        ) : activeTab === 'bookings' ? (
          // Bookings Tab Content
          filteredBookings.length === 0 ? (
            <div className="text-center py-20">
              <Hash className="h-12 w-12 text-slate-200 mx-auto mb-4" />
              <p className="text-slate-500">{searchQuery ? 'Keine Buchungen gefunden' : 'Keine Buchungen vorhanden'}</p>
              <p className="text-sm text-slate-400 mt-2">Synchronisiere Daten ueber die Bridge</p>
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
                  <div className="w-28 flex-shrink-0">
                    {booking.extn ? (
                      <div className="flex items-center gap-1">
                        <ExternalLink className="h-3 w-3 text-slate-400" />
                        <span className="text-sm text-slate-600 truncate">{booking.extn}</span>
                      </div>
                    ) : (
                      <span className="text-sm text-slate-300">-</span>
                    )}
                  </div>

                  {/* Name */}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-900 truncate">{booking.guestName || 'Unbekannt'}</p>
                  </div>

                  {/* Anreise/Abreise */}
                  <div className="w-32 flex-shrink-0 text-center">
                    <div className="flex items-center justify-center gap-1 text-sm">
                      <span className="text-slate-700">{formatDateShort(booking.andf)}</span>
                      <span className="text-slate-300">→</span>
                      <span className="text-slate-700">{formatDateShort(booking.ande)}</span>
                    </div>
                  </div>

                  {/* Verpflegung */}
                  <div className="w-12 flex-shrink-0 text-center">
                    <span className="text-sm font-medium text-slate-600">
                      {formatPession((booking as CaphotelBooking & { pession?: number }).pession)}
                    </span>
                  </div>

                  {/* Personen */}
                  <div className="w-16 flex-shrink-0 text-center">
                    <div className="flex items-center justify-center gap-1 text-sm text-slate-600">
                      <Users className="h-3.5 w-3.5 text-slate-400" />
                      <span>{booking.rooms?.[0]?.pers || 2}</span>
                      {(booking.rooms?.[0]?.kndr || 0) > 0 && (
                        <span className="text-slate-400">+{booking.rooms?.[0]?.kndr}</span>
                      )}
                    </div>
                  </div>

                  {/* Summe */}
                  <div className="w-24 flex-shrink-0 text-right">
                    {booking.accountTotal !== undefined && booking.accountTotal > 0 ? (
                      <div className="flex items-center justify-end gap-1">
                        <Euro className="h-4 w-4 text-green-600" />
                        <span className="font-semibold text-green-700">
                          {booking.accountTotal.toFixed(0)}
                        </span>
                      </div>
                    ) : (
                      <span className="text-sm text-slate-300">-</span>
                    )}
                  </div>

                  {/* Badge: Channel or Status */}
                  <div className="w-28 flex-shrink-0">
                    {booking.stat === 0 || booking.stat === 1 ? (
                      // Angebot Badge
                      <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium border ${bookingStatusColors[booking.stat]}`}>
                        Angebot
                      </span>
                    ) : booking.channelName && booking.channelName !== 'Direkt' ? (
                      // Channel Badge
                      <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${getChannelColor(booking.channelName)}`}>
                        {booking.channelName}
                      </span>
                    ) : (
                      // Status Badge for direct bookings
                      <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium border ${bookingStatusColors[booking.stat] || 'bg-slate-100 text-slate-600'}`}>
                        {bookingStatusLabels[booking.stat] || 'Direkt'}
                      </span>
                    )}
                  </div>

                  <ChevronRight className="h-5 w-5 text-slate-300 flex-shrink-0" />
                </button>
              ))}
            </div>
          )
        ) : (
          // Guests Tab Content
          filteredGuests.length === 0 ? (
            <div className="text-center py-20">
              <User className="h-12 w-12 text-slate-200 mx-auto mb-4" />
              <p className="text-slate-500">{searchQuery ? 'Keine Gaeste gefunden' : 'Keine Gaeste vorhanden'}</p>
              <p className="text-sm text-slate-400 mt-2">Synchronisiere Daten ueber die Bridge</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredGuests.map((guest) => (
                <button
                  key={guest.id}
                  onClick={() => handleGuestClick(guest)}
                  className="w-full flex items-center gap-4 p-4 hover:bg-slate-50 rounded-xl transition-colors text-left border border-slate-100"
                >
                  {/* Kundennummer */}
                  <div className="w-28 flex-shrink-0">
                    <span className="text-sm font-mono font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded">
                      {formatCustomerNumber(guest.customerNumber)}
                    </span>
                  </div>

                  {/* Nachname */}
                  <div className="w-40 flex-shrink-0">
                    <p className="font-semibold text-slate-900">{guest.lastName || '-'}</p>
                  </div>

                  {/* Vorname */}
                  <div className="w-32 flex-shrink-0">
                    <p className="text-slate-700">{guest.firstName || '-'}</p>
                  </div>

                  {/* Land */}
                  <div className="flex-1 min-w-0">
                    <p className="text-slate-500 truncate">{guest.country || '-'}</p>
                  </div>

                  {/* Buchungen */}
                  <div className="w-28 flex-shrink-0 text-right">
                    <span className="text-sm text-slate-600">
                      {guest.totalBookings || 0} Buch.
                    </span>
                  </div>

                  <ChevronRight className="h-5 w-5 text-slate-300 flex-shrink-0" />
                </button>
              ))}
            </div>
          )
        )}
      </div>

      {/* Stats Footer */}
      <div className="px-6 py-4 text-center text-sm text-slate-400 border-t border-slate-100">
        {activeTab === 'bookings'
          ? `${filteredBookings.length} von ${caphotelBookings.length} Buchungen`
          : `${filteredGuests.length} von ${deduplicatedGuests.length} Gaeste`
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
      />
    </div>
  );
}
