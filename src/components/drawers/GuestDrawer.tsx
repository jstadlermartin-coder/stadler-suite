'use client';

import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { X, User, Mail, Phone, MapPin, Calendar, ChevronRight, FileText, Hash } from 'lucide-react';
import { getSyncedBookings, CaphotelBooking } from '@/lib/firestore';

// Types - Extended for deduplicated guests
interface Guest {
  id: string;
  customerNumber?: number;        // Kundennummer (6-stellig)
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  street?: string;
  city?: string;
  country?: string;
  postalCode?: string;
  caphotelGuestIds?: number[];    // CapHotel-Profile IDs
  totalBookings?: number;
  totalRevenue?: number;
}

interface Booking {
  id: string;
  bookingNumber: string;
  guestId: string;
  roomNumber: string;
  roomName?: string;
  checkIn: string;
  checkOut: string;
  status: 'confirmed' | 'pending' | 'checked-in' | 'checked-out' | 'cancelled';
  totalPrice?: number;
  source?: string;
  externalRef?: string;      // Externe Buchungsnummer (Booking.com, Expedia etc.)
  adults?: number;
  children?: number;
}

// OTA Badge Component
function OTABadge({ channelName, externalRef }: { channelName?: string, externalRef?: string }) {
  if (!channelName || channelName === 'Direkt' || !externalRef) return null;

  const isBookingCom = channelName.toLowerCase().includes('booking');
  const isExpedia = channelName.toLowerCase().includes('expedia');
  const isAirbnb = channelName.toLowerCase().includes('airbnb');
  const isHRS = channelName.toLowerCase().includes('hrs');

  let badgeClass = 'bg-slate-500 text-white';
  if (isBookingCom) badgeClass = 'bg-blue-600 text-white';
  else if (isExpedia) badgeClass = 'bg-yellow-500 text-black';
  else if (isAirbnb) badgeClass = 'bg-rose-500 text-white';
  else if (isHRS) badgeClass = 'bg-red-600 text-white';

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${badgeClass}`}>
      {channelName}
      <span className="opacity-75">#{externalRef}</span>
    </span>
  );
}

// Context
interface GuestDrawerContextType {
  isOpen: boolean;
  guest: Guest | null;
  openGuest: (guest: Guest) => void;
  close: () => void;
}

const GuestDrawerContext = createContext<GuestDrawerContextType | undefined>(undefined);

export function useGuestDrawer() {
  const context = useContext(GuestDrawerContext);
  if (!context) {
    throw new Error('useGuestDrawer must be used within GuestDrawerProvider');
  }
  return context;
}

export function GuestDrawerProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [guest, setGuest] = useState<Guest | null>(null);

  const openGuest = (guest: Guest) => {
    setGuest(guest);
    setIsOpen(true);
  };

  const close = () => {
    setIsOpen(false);
    setTimeout(() => setGuest(null), 300);
  };

  return (
    <GuestDrawerContext.Provider value={{ isOpen, guest, openGuest, close }}>
      {children}
    </GuestDrawerContext.Provider>
  );
}

// Booking Drawer (nested)
interface BookingDrawerState {
  isOpen: boolean;
  booking: Booking | null;
}

function BookingDetailDrawer({
  booking,
  isOpen,
  onClose
}: {
  booking: Booking | null;
  isOpen: boolean;
  onClose: () => void;
}) {
  if (!booking) return null;

  const statusColors = {
    'confirmed': 'bg-green-100 text-green-700',
    'pending': 'bg-yellow-100 text-yellow-700',
    'checked-in': 'bg-blue-100 text-blue-700',
    'checked-out': 'bg-slate-100 text-slate-700',
    'cancelled': 'bg-red-100 text-red-700'
  };

  const statusLabels = {
    'confirmed': 'Bestätigt',
    'pending': 'Ausstehend',
    'checked-in': 'Eingecheckt',
    'checked-out': 'Ausgecheckt',
    'cancelled': 'Storniert'
  };

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/20 z-[60]"
          onClick={onClose}
        />
      )}

      {/* Drawer */}
      <div
        className={`
          fixed top-0 right-0 h-full w-full max-w-md bg-white shadow-2xl z-[70]
          transform transition-transform duration-300 ease-out
          ${isOpen ? 'translate-x-0' : 'translate-x-full'}
        `}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-100">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              Buchung #{booking.bookingNumber}
            </h2>
            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium mt-1 ${statusColors[booking.status]}`}>
              {statusLabels[booking.status]}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-slate-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 overflow-auto h-[calc(100%-80px)]">
          {/* Zeitraum */}
          <div className="bg-slate-50 rounded-xl p-4">
            <div className="flex items-center gap-3 mb-3">
              <Calendar className="h-5 w-5 text-slate-400" />
              <span className="font-medium text-slate-900">Aufenthalt</span>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-slate-500 mb-1">Check-in</p>
                <p className="font-medium text-slate-900">{booking.checkIn}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-1">Check-out</p>
                <p className="font-medium text-slate-900">{booking.checkOut}</p>
              </div>
            </div>
          </div>

          {/* Zimmer */}
          <div>
            <h3 className="text-sm font-medium text-slate-500 mb-3">Zimmer</h3>
            <div className="bg-slate-50 rounded-xl p-4">
              <p className="font-medium text-slate-900">
                {booking.roomName || `Zimmer ${booking.roomNumber}`}
              </p>
              <p className="text-sm text-slate-500">Zimmer Nr. {booking.roomNumber}</p>
            </div>
          </div>

          {/* Gäste */}
          <div>
            <h3 className="text-sm font-medium text-slate-500 mb-3">Gäste</h3>
            <div className="bg-slate-50 rounded-xl p-4">
              <div className="flex gap-6">
                <div>
                  <p className="text-2xl font-semibold text-slate-900">{booking.adults || 1}</p>
                  <p className="text-sm text-slate-500">Erwachsene</p>
                </div>
                <div>
                  <p className="text-2xl font-semibold text-slate-900">{booking.children || 0}</p>
                  <p className="text-sm text-slate-500">Kinder</p>
                </div>
              </div>
            </div>
          </div>

          {/* Preis */}
          {booking.totalPrice && (
            <div>
              <h3 className="text-sm font-medium text-slate-500 mb-3">Preis</h3>
              <div className="bg-slate-50 rounded-xl p-4">
                <p className="text-2xl font-semibold text-slate-900">
                  €{booking.totalPrice.toFixed(2)}
                </p>
                <p className="text-sm text-slate-500">Gesamtpreis</p>
              </div>
            </div>
          )}

          {/* Quelle / OTA */}
          {booking.source && (
            <div>
              <h3 className="text-sm font-medium text-slate-500 mb-3">Buchungsquelle</h3>
              <div className="bg-slate-50 rounded-xl p-4">
                {booking.externalRef ? (
                  <div className="space-y-2">
                    <OTABadge
                      channelName={booking.source}
                      externalRef={booking.externalRef}
                    />
                    <p className="text-xs text-slate-500">Externe Referenz: {booking.externalRef}</p>
                  </div>
                ) : (
                  <p className="font-medium text-slate-900">{booking.source}</p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export function GuestDrawer() {
  const { isOpen, guest, close } = useGuestDrawer();
  const [activeTab, setActiveTab] = useState<'info' | 'bookings'>('info');
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loadingBookings, setLoadingBookings] = useState(false);
  const [bookingDrawer, setBookingDrawer] = useState<BookingDrawerState>({
    isOpen: false,
    booking: null
  });

  // Buchungen laden wenn Gast geöffnet wird
  useEffect(() => {
    if (guest && isOpen) {
      setLoadingBookings(true);

      // Echte Buchungen aus Firestore laden
      const loadBookings = async () => {
        try {
          const syncedBookings = await getSyncedBookings();

          // Buchungen nach caphotelGuestIds filtern
          const caphotelIds = guest.caphotelGuestIds || [];
          const guestBookings = syncedBookings
            .filter((b: CaphotelBooking) => caphotelIds.includes(b.gast))
            .map((b: CaphotelBooking): Booking => {
              // Status mapping: CapHotel stat codes
              let status: Booking['status'] = 'confirmed';
              if (b.stat === 65536) status = 'cancelled';
              else if (b.stat === 64) status = 'confirmed';
              else if (b.stat === 2) status = 'pending';

              // Datum formatieren
              const formatDate = (dateStr: string | undefined) => {
                if (!dateStr) return '-';
                try {
                  return new Date(dateStr).toLocaleDateString('de-DE', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric'
                  });
                } catch {
                  return dateStr;
                }
              };

              return {
                id: String(b.resn),
                bookingNumber: String(b.resn),
                guestId: guest.id,
                roomNumber: b.rooms?.[0]?.zimm?.toString() || '-',
                roomName: undefined,
                checkIn: formatDate(b.andf),
                checkOut: formatDate(b.ande),
                status,
                totalPrice: b.accountTotal || 0,
                source: b.channelName || 'Direkt',
                externalRef: b.extn,
                adults: b.rooms?.[0]?.pers || 1,
                children: b.rooms?.[0]?.kndr || 0
              };
            })
            .sort((a, b) => {
              // Nach Buchungsnummer sortieren (neueste zuerst)
              return Number(b.bookingNumber) - Number(a.bookingNumber);
            });

          setBookings(guestBookings);
        } catch (error) {
          console.error('Error loading bookings:', error);
          setBookings([]);
        } finally {
          setLoadingBookings(false);
        }
      };

      loadBookings();
    }
  }, [guest, isOpen]);

  // Reset Tab wenn geschlossen
  useEffect(() => {
    if (!isOpen) {
      setActiveTab('info');
      setBookings([]);
    }
  }, [isOpen]);

  const openBookingDetail = (booking: Booking) => {
    setBookingDrawer({ isOpen: true, booking });
  };

  const closeBookingDetail = () => {
    setBookingDrawer({ isOpen: false, booking: null });
  };

  if (!guest) return null;

  const tabs = [
    { id: 'info' as const, label: 'Basisdaten' },
    { id: 'bookings' as const, label: 'Buchungen' }
  ];

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/20 z-40"
          onClick={close}
        />
      )}

      {/* Drawer */}
      <div
        className={`
          fixed top-0 right-0 h-full w-full max-w-md bg-white shadow-2xl z-50
          transform transition-transform duration-300 ease-out
          ${isOpen ? 'translate-x-0' : 'translate-x-full'}
        `}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-100">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center">
              <User className="h-6 w-6 text-slate-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                {guest.firstName} {guest.lastName}
              </h2>
              <div className="flex items-center gap-2">
                {guest.customerNumber && (
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                    <Hash className="h-3 w-3" />
                    {guest.customerNumber}
                  </span>
                )}
                {guest.email && (
                  <span className="text-sm text-slate-500">{guest.email}</span>
                )}
              </div>
            </div>
          </div>
          <button
            onClick={close}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-slate-500" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-100">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                flex-1 py-3 text-sm font-medium transition-colors
                ${activeTab === tab.id
                  ? 'text-slate-900 border-b-2 border-slate-900'
                  : 'text-slate-500 hover:text-slate-700'
                }
              `}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="p-6 overflow-auto h-[calc(100%-160px)]">
          {activeTab === 'info' ? (
            <div className="space-y-4">
              {/* Name */}
              <div className="bg-slate-50 rounded-xl p-4">
                <div className="flex items-center gap-3 text-slate-400 mb-2">
                  <User className="h-4 w-4" />
                  <span className="text-xs font-medium uppercase">Name</span>
                </div>
                <p className="text-slate-900 font-medium">
                  {guest.firstName} {guest.lastName}
                </p>
              </div>

              {/* Email */}
              {guest.email && (
                <div className="bg-slate-50 rounded-xl p-4">
                  <div className="flex items-center gap-3 text-slate-400 mb-2">
                    <Mail className="h-4 w-4" />
                    <span className="text-xs font-medium uppercase">E-Mail</span>
                  </div>
                  <a href={`mailto:${guest.email}`} className="text-slate-900 font-medium hover:text-blue-600">
                    {guest.email}
                  </a>
                </div>
              )}

              {/* Telefon */}
              {guest.phone && (
                <div className="bg-slate-50 rounded-xl p-4">
                  <div className="flex items-center gap-3 text-slate-400 mb-2">
                    <Phone className="h-4 w-4" />
                    <span className="text-xs font-medium uppercase">Telefon</span>
                  </div>
                  <a href={`tel:${guest.phone}`} className="text-slate-900 font-medium hover:text-blue-600">
                    {guest.phone}
                  </a>
                </div>
              )}

              {/* Adresse */}
              {(guest.street || guest.city || guest.country) && (
                <div className="bg-slate-50 rounded-xl p-4">
                  <div className="flex items-center gap-3 text-slate-400 mb-2">
                    <MapPin className="h-4 w-4" />
                    <span className="text-xs font-medium uppercase">Adresse</span>
                  </div>
                  <div className="text-slate-900">
                    {guest.street && <p>{guest.street}</p>}
                    {(guest.postalCode || guest.city) && (
                      <p>{guest.postalCode} {guest.city}</p>
                    )}
                    {guest.country && <p>{guest.country}</p>}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {loadingBookings ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-2 border-slate-200 border-t-slate-900"></div>
                </div>
              ) : bookings.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="h-12 w-12 text-slate-200 mx-auto mb-4" />
                  <p className="text-slate-500">Keine Buchungen gefunden</p>
                </div>
              ) : (
                bookings.map((booking) => {
                  const statusColors = {
                    'confirmed': 'bg-green-100 text-green-700',
                    'pending': 'bg-yellow-100 text-yellow-700',
                    'checked-in': 'bg-blue-100 text-blue-700',
                    'checked-out': 'bg-slate-100 text-slate-700',
                    'cancelled': 'bg-red-100 text-red-700'
                  };

                  return (
                    <button
                      key={booking.id}
                      onClick={() => openBookingDetail(booking)}
                      className="w-full bg-slate-50 hover:bg-slate-100 rounded-xl p-4 text-left transition-colors"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-slate-900">
                          #{booking.bookingNumber}
                        </span>
                        <span className={`text-xs px-2 py-1 rounded-full ${statusColors[booking.status]}`}>
                          {booking.status === 'confirmed' ? 'Bestätigt' :
                           booking.status === 'checked-out' ? 'Ausgecheckt' :
                           booking.status === 'checked-in' ? 'Eingecheckt' :
                           booking.status === 'cancelled' ? 'Storniert' : 'Ausstehend'}
                        </span>
                      </div>
                      {booking.externalRef && booking.source && (
                        <div className="mb-2">
                          <OTABadge
                            channelName={booking.source}
                            externalRef={booking.externalRef}
                          />
                        </div>
                      )}
                      <p className="text-sm text-slate-600 mb-1">
                        {booking.roomName || `Zimmer ${booking.roomNumber}`}
                      </p>
                      <div className="flex items-center justify-between">
                        <p className="text-sm text-slate-500">
                          {booking.checkIn} - {booking.checkOut}
                        </p>
                        <ChevronRight className="h-4 w-4 text-slate-400" />
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          )}
        </div>
      </div>

      {/* Nested Booking Detail Drawer */}
      <BookingDetailDrawer
        booking={bookingDrawer.booking}
        isOpen={bookingDrawer.isOpen}
        onClose={closeBookingDetail}
      />
    </>
  );
}
