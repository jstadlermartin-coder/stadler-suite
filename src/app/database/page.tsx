'use client';

import { useState, useEffect } from 'react';
import { Search, Users, FileText, Filter, X, User, Mail, Phone, MapPin, Calendar, ChevronRight, MessageSquare } from 'lucide-react';

// Types
type BookingStatus = 'lead' | 'offer' | 'booked' | 'cancelled';

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

type ViewMode = 'guests' | 'bookings';

// CDS (Customer Detail Sheet)
function CustomerDetailSheet({
  isOpen,
  onClose,
  guest,
  bookings
}: {
  isOpen: boolean;
  onClose: () => void;
  guest: Guest | null;
  bookings: Booking[];
}) {
  const [activeTab, setActiveTab] = useState<'info' | 'bookings' | 'inquiries'>('info');

  if (!guest) return null;

  const guestBookings = bookings.filter(b => b.guestId === guest.id);

  const statusColors = {
    'lead': 'bg-yellow-100 text-yellow-700',
    'offer': 'bg-blue-100 text-blue-700',
    'booked': 'bg-green-100 text-green-700',
    'cancelled': 'bg-red-100 text-red-700'
  };

  const statusLabels = {
    'lead': 'Lead',
    'offer': 'Offer',
    'booked': 'Booked',
    'cancelled': 'Storniert'
  };

  return (
    <>
      {isOpen && <div className="fixed inset-0 bg-black/20 z-40" onClick={onClose} />}
      <div className={`fixed top-0 right-0 h-full w-full max-w-md bg-white shadow-2xl z-50 transform transition-transform duration-300 ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-100">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center">
              <User className="h-6 w-6 text-slate-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900">{guest.firstName} {guest.lastName}</h2>
              {guest.email && <p className="text-sm text-slate-500">{guest.email}</p>}
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg">
            <X className="h-5 w-5 text-slate-500" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-100">
          <button onClick={() => setActiveTab('info')} className={`flex-1 py-3 text-sm font-medium ${activeTab === 'info' ? 'text-slate-900 border-b-2 border-slate-900' : 'text-slate-500'}`}>Basisdaten</button>
          <button onClick={() => setActiveTab('bookings')} className={`flex-1 py-3 text-sm font-medium ${activeTab === 'bookings' ? 'text-slate-900 border-b-2 border-slate-900' : 'text-slate-500'}`}>Buchungen</button>
          <button onClick={() => setActiveTab('inquiries')} className={`flex-1 py-3 text-sm font-medium ${activeTab === 'inquiries' ? 'text-slate-900 border-b-2 border-slate-900' : 'text-slate-500'}`}>Anfragen</button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-auto h-[calc(100%-160px)]">
          {activeTab === 'info' && (
            <div className="space-y-4">
              <div className="bg-slate-50 rounded-xl p-4">
                <div className="flex items-center gap-3 text-slate-400 mb-2"><User className="h-4 w-4" /><span className="text-xs font-medium uppercase">Name</span></div>
                <p className="text-slate-900 font-medium">{guest.firstName} {guest.lastName}</p>
              </div>

              {guest.email && (
                <div className="bg-slate-50 rounded-xl p-4">
                  <div className="flex items-center gap-3 text-slate-400 mb-2"><Mail className="h-4 w-4" /><span className="text-xs font-medium uppercase">E-Mail</span></div>
                  <a href={`mailto:${guest.email}`} className="text-slate-900 font-medium hover:text-blue-600">{guest.email}</a>
                </div>
              )}

              {guest.phone && (
                <div className="bg-slate-50 rounded-xl p-4">
                  <div className="flex items-center gap-3 text-slate-400 mb-2"><Phone className="h-4 w-4" /><span className="text-xs font-medium uppercase">Telefon</span></div>
                  <a href={`tel:${guest.phone}`} className="text-slate-900 font-medium hover:text-blue-600">{guest.phone}</a>
                </div>
              )}

              {(guest.street || guest.city || guest.country) && (
                <div className="bg-slate-50 rounded-xl p-4">
                  <div className="flex items-center gap-3 text-slate-400 mb-2"><MapPin className="h-4 w-4" /><span className="text-xs font-medium uppercase">Adresse</span></div>
                  <div className="text-slate-900">
                    {guest.street && <p>{guest.street}</p>}
                    {(guest.postalCode || guest.city) && <p>{guest.postalCode} {guest.city}</p>}
                    {guest.country && <p>{guest.country}</p>}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'bookings' && (
            <div className="space-y-3">
              {guestBookings.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="h-12 w-12 text-slate-200 mx-auto mb-4" />
                  <p className="text-slate-500">Keine Buchungen</p>
                </div>
              ) : (
                guestBookings.map((booking) => (
                  <div key={booking.id} className="bg-slate-50 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-slate-900">#{booking.bookingNumber}</span>
                      <span className={`text-xs px-2 py-1 rounded-full ${statusColors[booking.status]}`}>{statusLabels[booking.status]}</span>
                    </div>
                    <p className="text-sm text-slate-600">{booking.roomName || `Zimmer ${booking.roomNumber}`}</p>
                    <p className="text-sm text-slate-400">{booking.checkIn} - {booking.checkOut}</p>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'inquiries' && (
            <div className="space-y-3">
              <div className="text-center py-12">
                <MessageSquare className="h-12 w-12 text-slate-200 mx-auto mb-4" />
                <p className="text-slate-500">Keine Anfragen</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export default function DatabasePage() {
  const [viewMode, setViewMode] = useState<ViewMode>('guests');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<BookingStatus | 'all'>('all');
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
        { id: '4', firstName: 'Anna', lastName: 'Schmidt', email: 'anna.schmidt@web.de', phone: '+49 170 1234567', street: 'Bergweg 8', city: 'München', country: 'Deutschland', postalCode: '80331' }
      ]);

      setBookings([
        { id: '1', bookingNumber: '12345', guestId: '1', guestName: 'Max Mustermann', guestEmail: 'max.mustermann@example.com', roomNumber: '101', roomName: 'Doppelzimmer Seeblick', checkIn: '15.01.2025', checkOut: '18.01.2025', status: 'booked', adults: 2, children: 0 },
        { id: '2', bookingNumber: '12346', guestId: '2', guestName: 'Maria Musterfrau', guestEmail: 'maria@example.com', roomNumber: '203', roomName: 'Suite Bergblick', checkIn: '20.01.2025', checkOut: '25.01.2025', status: 'offer', adults: 2, children: 1 },
        { id: '3', bookingNumber: '12340', guestId: '3', guestName: 'Hans Huber', guestEmail: 'hans.huber@gmx.at', roomNumber: '102', roomName: 'Einzelzimmer', checkIn: '10.01.2025', checkOut: '12.01.2025', status: 'booked', adults: 1, children: 0 },
        { id: '4', bookingNumber: '12347', guestId: '4', guestName: 'Anna Schmidt', guestEmail: 'anna.schmidt@web.de', roomNumber: '201', roomName: 'Suite Panorama', checkIn: '01.02.2025', checkOut: '05.02.2025', status: 'lead', adults: 2, children: 0 }
      ]);
      setLoading(false);
    }, 500);
  }, []);

  // Gefilterte Ergebnisse
  const filteredGuests = guests.filter(guest => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return guest.firstName.toLowerCase().includes(query) || guest.lastName.toLowerCase().includes(query) || guest.email?.toLowerCase().includes(query) || guest.phone?.includes(query);
  });

  const filteredBookings = bookings.filter(booking => {
    const matchesSearch = !searchQuery || booking.bookingNumber.includes(searchQuery) || booking.guestName.toLowerCase().includes(searchQuery.toLowerCase()) || booking.guestEmail?.toLowerCase().includes(searchQuery.toLowerCase()) || booking.roomNumber.includes(searchQuery);
    const matchesStatus = statusFilter === 'all' || booking.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleGuestClick = (guest: Guest) => {
    setSelectedGuest(guest);
    setCdsOpen(true);
  };

  const handleBookingClick = (booking: Booking) => {
    const guest = guests.find(g => g.id === booking.guestId);
    if (guest) {
      setSelectedGuest(guest);
      setCdsOpen(true);
    }
  };

  const statusColors = {
    'lead': 'bg-yellow-100 text-yellow-700',
    'offer': 'bg-blue-100 text-blue-700',
    'booked': 'bg-green-100 text-green-700',
    'cancelled': 'bg-red-100 text-red-700'
  };

  const statusLabels = {
    'lead': 'Lead',
    'offer': 'Offer',
    'booked': 'Booked',
    'cancelled': 'Storniert'
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Database</h1>
        <p className="text-slate-500">Gäste und Buchungen durchsuchen</p>
      </div>

      {/* Tabs & Suche */}
      <div className="flex flex-col gap-4 mb-6">
        <div className="flex flex-wrap gap-4">
          {/* View Mode Tabs */}
          <div className="flex bg-slate-100 rounded-xl p-1">
            <button onClick={() => setViewMode('guests')} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${viewMode === 'guests' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}><Users className="h-4 w-4" />Gäste</button>
            <button onClick={() => setViewMode('bookings')} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${viewMode === 'bookings' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}><FileText className="h-4 w-4" />Buchungen</button>
          </div>

          {/* Status Filter (nur bei Buchungen) */}
          {viewMode === 'bookings' && (
            <div className="flex gap-2">
              {(['all', 'lead', 'offer', 'booked'] as const).map((status) => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${statusFilter === status ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                >
                  {status === 'all' ? 'Alle' : statusLabels[status]}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Suchleiste */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={viewMode === 'guests' ? 'Name, E-Mail oder Telefon...' : 'Buchungsnummer, Name oder Zimmer...'}
            className="w-full pl-12 pr-4 py-3 bg-slate-100 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900"
          />
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-slate-200 border-t-slate-900"></div>
        </div>
      ) : viewMode === 'guests' ? (
        <div className="space-y-2">
          {filteredGuests.length === 0 ? (
            <div className="text-center py-20">
              <Users className="h-12 w-12 text-slate-200 mx-auto mb-4" />
              <p className="text-slate-500">{searchQuery ? 'Keine Gäste gefunden' : 'Keine Gäste vorhanden'}</p>
            </div>
          ) : (
            filteredGuests.map((guest) => (
              <button key={guest.id} onClick={() => handleGuestClick(guest)} className="w-full flex items-center gap-4 p-4 bg-slate-50 hover:bg-slate-100 rounded-xl transition-colors text-left">
                <div className="h-12 w-12 rounded-full bg-slate-200 flex items-center justify-center flex-shrink-0">
                  <span className="text-lg font-medium text-slate-600">{guest.firstName.charAt(0)}{guest.lastName.charAt(0)}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-900">{guest.firstName} {guest.lastName}</p>
                  <p className="text-sm text-slate-500 truncate">{guest.email || guest.phone || 'Keine Kontaktdaten'}</p>
                </div>
                {guest.city && <div className="text-sm text-slate-400 text-right hidden sm:block">{guest.city}, {guest.country}</div>}
                <ChevronRight className="h-5 w-5 text-slate-300" />
              </button>
            ))
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {filteredBookings.length === 0 ? (
            <div className="text-center py-20">
              <FileText className="h-12 w-12 text-slate-200 mx-auto mb-4" />
              <p className="text-slate-500">{searchQuery ? 'Keine Buchungen gefunden' : 'Keine Buchungen vorhanden'}</p>
            </div>
          ) : (
            filteredBookings.map((booking) => (
              <button key={booking.id} onClick={() => handleBookingClick(booking)} className="w-full flex items-center gap-4 p-4 bg-slate-50 hover:bg-slate-100 rounded-xl transition-colors text-left">
                <div className="h-12 w-12 rounded-xl bg-slate-200 flex items-center justify-center flex-shrink-0">
                  <FileText className="h-6 w-6 text-slate-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-medium text-slate-900">#{booking.bookingNumber}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${statusColors[booking.status]}`}>{statusLabels[booking.status]}</span>
                  </div>
                  <p className="text-sm text-slate-600">{booking.guestName} • {booking.roomName || `Zimmer ${booking.roomNumber}`}</p>
                  <p className="text-sm text-slate-400">{booking.checkIn} - {booking.checkOut}</p>
                </div>
                <ChevronRight className="h-5 w-5 text-slate-300" />
              </button>
            ))
          )}
        </div>
      )}

      {/* Stats Footer */}
      <div className="mt-8 text-center text-sm text-slate-400">
        {viewMode === 'guests' ? `${filteredGuests.length} von ${guests.length} Gästen` : `${filteredBookings.length} von ${bookings.length} Buchungen`}
      </div>

      {/* CDS */}
      <CustomerDetailSheet isOpen={cdsOpen} onClose={() => { setCdsOpen(false); setSelectedGuest(null); }} guest={selectedGuest} bookings={bookings} />
    </div>
  );
}
