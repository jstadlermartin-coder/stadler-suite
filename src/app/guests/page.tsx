'use client';

import { useState, useEffect, useMemo } from 'react';
import { Search, Plus, Mail, Phone, MapPin, Calendar, Euro, Star, Filter, ChevronDown, User, X, Loader2, Users, Link2, AlertCircle, Hash } from 'lucide-react';
import { getSyncedGuests, getSyncedBookings, getDeduplicatedGuests, CaphotelGuest, CaphotelBooking, DeduplicatedGuest } from '@/lib/firestore';

// ============================================================================
// DEDUPLIZIERUNG - Gäste werden nach Telefon/Email zusammengeführt
// ============================================================================

// Normalisiere Telefonnummer (nur Ziffern, führende 0 durch Ländercode ersetzen)
function normalizePhone(phone: string | undefined | null): string {
  if (!phone) return '';
  // Nur Ziffern behalten
  let cleaned = phone.replace(/\D/g, '');
  // Österreichische Nummern: führende 0 durch 43 ersetzen
  if (cleaned.startsWith('0') && !cleaned.startsWith('00')) {
    cleaned = '43' + cleaned.substring(1);
  }
  // 00 am Anfang entfernen (internationales Format)
  if (cleaned.startsWith('00')) {
    cleaned = cleaned.substring(2);
  }
  return cleaned;
}

// Normalisiere Email (Kleinschreibung, trimmen)
function normalizeEmail(email: string | undefined | null): string {
  if (!email) return '';
  return email.toLowerCase().trim();
}

// Erstelle eindeutigen Schlüssel für Gast basierend auf Telefon oder Email
function getGuestKey(guest: CaphotelGuest): string {
  const phone = normalizePhone(guest.teln);
  const email = normalizeEmail(guest.mail);

  // Priorität: Telefon > Email > CapHotel-ID als Fallback
  if (phone && phone.length >= 8) return `phone:${phone}`;
  if (email && email.includes('@')) return `email:${email}`;
  return `caphotel:${guest.gast}`; // Fallback: keine Deduplizierung möglich
}

// ============================================================================
// TYPES
// ============================================================================

interface LocalDeduplicatedGuest {
  id: string;                      // Eindeutiger Schlüssel (phone:xxx oder email:xxx oder G100001)
  customerNumber?: number;         // 6-stellige Kundennummer
  key: string;                     // Der Schlüssel-Typ (phone/email/caphotel)
  keyValue: string;                // Der Schlüssel-Wert

  // Gast-Daten (vom neuesten Profil)
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  phone: string;
  street: string;
  postalCode: string;
  city: string;
  country: string;

  // CapHotel Profile IDs die zusammengeführt wurden
  caphotelIds: number[];
  profileCount: number;

  // Statistiken
  totalStays: number;
  totalRevenue: number;
  lastStay: string | null;
  firstStay: string | null;

  // Verknüpfte Buchungen
  bookings: CaphotelBooking[];

  // Loyalty basierend auf Aufenthalten
  loyaltyTier: 'bronze' | 'silver' | 'gold' | 'platinum';
}

// ============================================================================
// LOYALTY BERECHNUNG
// ============================================================================

function calculateLoyaltyTier(totalStays: number): 'bronze' | 'silver' | 'gold' | 'platinum' {
  if (totalStays >= 10) return 'platinum';
  if (totalStays >= 5) return 'gold';
  if (totalStays >= 2) return 'silver';
  return 'bronze';
}

const loyaltyColors: Record<string, string> = {
  bronze: 'bg-amber-600',
  silver: 'bg-slate-400',
  gold: 'bg-yellow-500',
  platinum: 'bg-slate-700',
};

const loyaltyLabels: Record<string, string> = {
  bronze: 'Bronze',
  silver: 'Silber',
  gold: 'Gold',
  platinum: 'Platin',
};

// ============================================================================
// OTA BADGE - Für Booking.com, Expedia etc.
// ============================================================================

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

// ============================================================================
// COMPONENT
// ============================================================================

export default function GuestsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGuestId, setSelectedGuestId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Raw data from Firestore (for fallback deduplication)
  const [rawGuests, setRawGuests] = useState<CaphotelGuest[]>([]);
  const [rawBookings, setRawBookings] = useState<CaphotelBooking[]>([]);

  // Server-deduplicated guests from 'guests' collection
  const [serverDeduplicatedGuests, setServerDeduplicatedGuests] = useState<DeduplicatedGuest[]>([]);
  const [useServerDedup, setUseServerDedup] = useState(false);

  // Load data from Firestore
  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        setError(null);

        // First, try to load server-deduplicated guests
        const dedupGuests = await getDeduplicatedGuests();

        if (dedupGuests.length > 0) {
          // Server-seitige Deduplizierung verfügbar
          setServerDeduplicatedGuests(dedupGuests);
          setUseServerDedup(true);

          // Lade auch Buchungen für die Gäste-Details
          const bookings = await getSyncedBookings();
          setRawBookings(bookings);
        } else {
          // Fallback: Lade Rohdaten und dedupliziere client-seitig
          const [guests, bookings] = await Promise.all([
            getSyncedGuests(),
            getSyncedBookings()
          ]);

          setRawGuests(guests);
          setRawBookings(bookings);
          setUseServerDedup(false);
        }
      } catch (err) {
        console.error('Error loading guests:', err);
        setError('Fehler beim Laden der Gäste. Bitte stelle sicher, dass die Bridge synchronisiert.');
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  // ============================================================================
  // DEDUPLIZIERUNG - Gäste zusammenführen
  // ============================================================================

  const deduplicatedGuests = useMemo((): LocalDeduplicatedGuest[] => {
    // Wenn Server-seitige Deduplizierung verfügbar ist, konvertiere zu lokalem Format
    if (useServerDedup && serverDeduplicatedGuests.length > 0) {
      return serverDeduplicatedGuests.map((g): LocalDeduplicatedGuest => {
        // Finde Buchungen für diesen Gast
        const guestBookings = rawBookings.filter(b =>
          g.caphotelGuestIds?.includes(b.gast)
        );

        const lastBookingDate = guestBookings.length > 0
          ? guestBookings.reduce((latest, b) => {
              const date = b.andf || '';
              return date > latest ? date : latest;
            }, '')
          : null;

        const firstBookingDate = guestBookings.length > 0
          ? guestBookings.reduce((earliest, b) => {
              const date = b.andf || '';
              return !earliest || date < earliest ? date : earliest;
            }, '')
          : null;

        return {
          id: g.id,
          customerNumber: g.customerNumber,
          key: g.phoneNormalized ? 'phone' : g.emailNormalized ? 'email' : 'caphotel',
          keyValue: g.phoneNormalized || g.emailNormalized || g.id,
          firstName: g.firstName || '',
          lastName: g.lastName || '',
          fullName: `${g.firstName || ''} ${g.lastName || ''}`.trim(),
          email: g.email || '',
          phone: g.phone || '',
          street: g.street || '',
          postalCode: g.postalCode || '',
          city: g.city || '',
          country: g.country || '',
          caphotelIds: g.caphotelGuestIds || [],
          profileCount: g.caphotelGuestIds?.length || 1,
          totalStays: g.totalBookings || guestBookings.length,
          totalRevenue: g.totalRevenue || 0,
          lastStay: g.lastBooking || lastBookingDate,
          firstStay: firstBookingDate,
          bookings: guestBookings,
          loyaltyTier: calculateLoyaltyTier(g.totalBookings || guestBookings.length)
        };
      }).sort((a, b) => {
        if (!a.lastStay && !b.lastStay) return 0;
        if (!a.lastStay) return 1;
        if (!b.lastStay) return -1;
        return b.lastStay.localeCompare(a.lastStay);
      });
    }

    // Fallback: Client-seitige Deduplizierung
    const guestMap = new Map<string, LocalDeduplicatedGuest>();

    // Schritt 1: Alle CapHotel-Gäste nach Schlüssel gruppieren
    rawGuests.forEach(guest => {
      const key = getGuestKey(guest);
      const [keyType, keyValue] = key.split(':');

      if (guestMap.has(key)) {
        // Gast existiert bereits - Profile zusammenführen
        const existing = guestMap.get(key)!;
        existing.caphotelIds.push(guest.gast);
        existing.profileCount++;

        // Neuere/bessere Daten übernehmen (falls vorhanden)
        if (guest.vorn && !existing.firstName) existing.firstName = guest.vorn;
        if (guest.nacn && !existing.lastName) existing.lastName = guest.nacn;
        if (guest.mail && !existing.email) existing.email = guest.mail || '';
        if (guest.teln && !existing.phone) existing.phone = guest.teln || '';
        if (guest.stra && !existing.street) existing.street = guest.stra || '';
        if (guest.polz && !existing.postalCode) existing.postalCode = guest.polz || '';
        if (guest.ortb && !existing.city) existing.city = guest.ortb || '';
        if (guest.land && !existing.country) existing.country = guest.land || '';

        existing.fullName = `${existing.firstName} ${existing.lastName}`.trim();
      } else {
        // Neuer Gast
        guestMap.set(key, {
          id: key,
          key: keyType,
          keyValue: keyValue,
          firstName: guest.vorn || '',
          lastName: guest.nacn || '',
          fullName: `${guest.vorn || ''} ${guest.nacn || ''}`.trim(),
          email: guest.mail || '',
          phone: guest.teln || '',
          street: guest.stra || '',
          postalCode: guest.polz || '',
          city: guest.ortb || '',
          country: guest.land || '',
          caphotelIds: [guest.gast],
          profileCount: 1,
          totalStays: 0,
          totalRevenue: 0,
          lastStay: null,
          firstStay: null,
          bookings: [],
          loyaltyTier: 'bronze'
        });
      }
    });

    // Schritt 2: Buchungen den Gästen zuordnen
    rawBookings.forEach(booking => {
      // Finde den Gast anhand der gast-ID
      for (const [, guest] of guestMap) {
        if (guest.caphotelIds.includes(booking.gast)) {
          guest.bookings.push(booking);
          guest.totalStays++;
          guest.totalRevenue += booking.accountTotal || 0;

          // Letzter/Erster Aufenthalt
          const checkIn = booking.andf;
          if (!guest.lastStay || checkIn > guest.lastStay) {
            guest.lastStay = checkIn;
          }
          if (!guest.firstStay || checkIn < guest.firstStay) {
            guest.firstStay = checkIn;
          }
          break;
        }
      }
    });

    // Schritt 3: Loyalty Tier berechnen
    guestMap.forEach(guest => {
      guest.loyaltyTier = calculateLoyaltyTier(guest.totalStays);
    });

    // Als Array zurückgeben, sortiert nach letztem Aufenthalt
    return Array.from(guestMap.values())
      .sort((a, b) => {
        if (!a.lastStay && !b.lastStay) return 0;
        if (!a.lastStay) return 1;
        if (!b.lastStay) return -1;
        return b.lastStay.localeCompare(a.lastStay);
      });
  }, [useServerDedup, serverDeduplicatedGuests, rawGuests, rawBookings]);

  // Filter guests by search
  const filteredGuests = useMemo(() => {
    if (!searchQuery.trim()) return deduplicatedGuests;

    const searchLower = searchQuery.toLowerCase();
    return deduplicatedGuests.filter(guest =>
      guest.fullName.toLowerCase().includes(searchLower) ||
      guest.email.toLowerCase().includes(searchLower) ||
      guest.phone.includes(searchQuery) ||
      guest.city.toLowerCase().includes(searchLower)
    );
  }, [deduplicatedGuests, searchQuery]);

  // Selected guest for drawer
  const selectedGuest = useMemo(() => {
    if (!selectedGuestId) return null;
    return deduplicatedGuests.find(g => g.id === selectedGuestId) || null;
  }, [selectedGuestId, deduplicatedGuests]);

  // Stats
  const stats = useMemo(() => {
    const byTier = {
      platinum: deduplicatedGuests.filter(g => g.loyaltyTier === 'platinum').length,
      gold: deduplicatedGuests.filter(g => g.loyaltyTier === 'gold').length,
      silver: deduplicatedGuests.filter(g => g.loyaltyTier === 'silver').length,
      bronze: deduplicatedGuests.filter(g => g.loyaltyTier === 'bronze').length,
    };
    const duplicatesFound = deduplicatedGuests.filter(g => g.profileCount > 1).length;
    const totalProfiles = useServerDedup
      ? deduplicatedGuests.reduce((sum, g) => sum + g.profileCount, 0)
      : rawGuests.length;

    return { byTier, duplicatesFound, totalProfiles, serverDedup: useServerDedup };
  }, [deduplicatedGuests, rawGuests, useServerDedup]);

  // Helpers
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  // Loading state
  if (loading) {
    return (
      <div className="p-8 h-full flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-slate-600">Lade Gästedaten...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="p-8 h-full flex items-center justify-center">
        <div className="text-center max-w-md">
          <AlertCircle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-slate-900 mb-2">Keine Daten verfügbar</h2>
          <p className="text-slate-600 mb-4">{error}</p>
          <p className="text-sm text-slate-500">
            Gehe zu Einstellungen → Bridge um die Synchronisation einzurichten.
          </p>
        </div>
      </div>
    );
  }

  // Empty state
  if (deduplicatedGuests.length === 0 && rawGuests.length === 0 && serverDeduplicatedGuests.length === 0) {
    return (
      <div className="p-8 h-full flex items-center justify-center">
        <div className="text-center max-w-md">
          <Users className="h-12 w-12 text-slate-300 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-slate-900 mb-2">Noch keine Gäste</h2>
          <p className="text-slate-600">
            Sobald die Bridge synchronisiert, erscheinen hier alle Gäste aus CapHotel.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Gäste</h1>
          <p className="mt-1 text-slate-600">
            {deduplicatedGuests.length} Gäste ({stats.totalProfiles} Profile zusammengeführt)
            {stats.serverDedup && (
              <span className="ml-2 text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded">
                Server-Deduplizierung
              </span>
            )}
          </p>
        </div>
        {stats.duplicatesFound > 0 && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 border border-green-200 rounded-lg">
            <Link2 className="h-4 w-4 text-green-600" />
            <span className="text-sm text-green-700">
              {stats.duplicatesFound} Gäste mit mehreren Profilen zusammengeführt
            </span>
          </div>
        )}
      </div>

      {/* Search Bar */}
      <div className="flex items-center gap-4 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
          <input
            type="text"
            placeholder="Suche nach Name, Email, Telefon, Ort..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Loyalty Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {(['platinum', 'gold', 'silver', 'bronze'] as const).map((tier) => (
          <div key={tier} className="bg-white rounded-lg border border-slate-200 p-4">
            <div className="flex items-center gap-3">
              <div className={`${loyaltyColors[tier]} w-10 h-10 rounded-full flex items-center justify-center`}>
                <Star className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{stats.byTier[tier]}</p>
                <p className="text-sm text-slate-500">{loyaltyLabels[tier]}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Guest List */}
      <div className="flex-1 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-700">Gast</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-700">Kontakt</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-700">Ort</th>
                <th className="text-center px-6 py-4 text-sm font-semibold text-slate-700">Aufenthalte</th>
                <th className="text-right px-6 py-4 text-sm font-semibold text-slate-700">Umsatz</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-700">Letzter Besuch</th>
                <th className="text-center px-6 py-4 text-sm font-semibold text-slate-700">Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredGuests.map((guest) => (
                <tr
                  key={guest.id}
                  onClick={() => setSelectedGuestId(guest.id)}
                  className={`border-b border-slate-100 hover:bg-slate-50 cursor-pointer transition-colors ${
                    selectedGuestId === guest.id ? 'bg-blue-50' : ''
                  }`}
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center relative">
                        <User className="h-5 w-5 text-blue-600" />
                        {guest.profileCount > 1 && (
                          <span className="absolute -top-1 -right-1 h-5 w-5 bg-green-500 text-white text-xs rounded-full flex items-center justify-center">
                            {guest.profileCount}
                          </span>
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-slate-900">{guest.fullName || 'Unbekannt'}</p>
                          {guest.customerNumber && (
                            <span className="inline-flex items-center gap-0.5 text-xs font-medium text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">
                              <Hash className="h-3 w-3" />
                              {guest.customerNumber}
                            </span>
                          )}
                        </div>
                        {guest.profileCount > 1 && (
                          <p className="text-xs text-green-600">{guest.profileCount} Profile zusammengeführt</p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="space-y-1">
                      {guest.email && (
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                          <Mail className="h-4 w-4" />
                          <span>{guest.email}</span>
                        </div>
                      )}
                      {guest.phone && (
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                          <Phone className="h-4 w-4" />
                          <span>{guest.phone}</span>
                        </div>
                      )}
                      {!guest.email && !guest.phone && (
                        <span className="text-sm text-slate-400">Keine Kontaktdaten</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {guest.city ? (
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <MapPin className="h-4 w-4" />
                        <span>{[guest.city, guest.country].filter(Boolean).join(', ')}</span>
                      </div>
                    ) : (
                      <span className="text-sm text-slate-400">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className="text-lg font-semibold text-slate-900">{guest.totalStays}</span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className="font-semibold text-emerald-600">
                      {formatCurrency(guest.totalRevenue)}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <Calendar className="h-4 w-4" />
                      <span>{formatDate(guest.lastStay)}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium text-white ${loyaltyColors[guest.loyaltyTier]}`}>
                      <Star className="h-3 w-3" />
                      {loyaltyLabels[guest.loyaltyTier]}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Guest Detail Drawer */}
      {selectedGuest && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/20"
            onClick={() => setSelectedGuestId(null)}
          />

          {/* Drawer */}
          <div className="relative w-full max-w-lg bg-white shadow-xl overflow-y-auto">
            {/* Header */}
            <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-semibold text-slate-900">{selectedGuest.fullName}</h2>
                  {selectedGuest.customerNumber && (
                    <span className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                      <Hash className="h-3.5 w-3.5" />
                      {selectedGuest.customerNumber}
                    </span>
                  )}
                </div>
                <p className="text-sm text-slate-500">
                  Gast seit {formatDate(selectedGuest.firstStay)}
                </p>
              </div>
              <button
                onClick={() => setSelectedGuestId(null)}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="h-5 w-5 text-slate-500" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Kontaktdaten */}
              <div>
                <h3 className="text-sm font-semibold text-slate-900 mb-3">Kontakt</h3>
                <div className="space-y-2">
                  {selectedGuest.email && (
                    <div className="flex items-center gap-3">
                      <Mail className="h-4 w-4 text-slate-400" />
                      <span className="text-slate-700">{selectedGuest.email}</span>
                      {selectedGuest.key === 'email' && (
                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">Schlüssel</span>
                      )}
                    </div>
                  )}
                  {selectedGuest.phone && (
                    <div className="flex items-center gap-3">
                      <Phone className="h-4 w-4 text-slate-400" />
                      <span className="text-slate-700">{selectedGuest.phone}</span>
                      {selectedGuest.key === 'phone' && (
                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">Schlüssel</span>
                      )}
                    </div>
                  )}
                  {(selectedGuest.street || selectedGuest.city) && (
                    <div className="flex items-start gap-3">
                      <MapPin className="h-4 w-4 text-slate-400 mt-0.5" />
                      <div className="text-slate-700">
                        {selectedGuest.street && <div>{selectedGuest.street}</div>}
                        <div>{[selectedGuest.postalCode, selectedGuest.city].filter(Boolean).join(' ')}</div>
                        {selectedGuest.country && <div>{selectedGuest.country}</div>}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Statistiken */}
              <div>
                <h3 className="text-sm font-semibold text-slate-900 mb-3">Statistiken</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-slate-50 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-slate-900">{selectedGuest.totalStays}</p>
                    <p className="text-xs text-slate-500">Aufenthalte</p>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-emerald-600">{formatCurrency(selectedGuest.totalRevenue)}</p>
                    <p className="text-xs text-slate-500">Umsatz</p>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-3 text-center">
                    <div className={`${loyaltyColors[selectedGuest.loyaltyTier]} w-8 h-8 rounded-full flex items-center justify-center mx-auto mb-1`}>
                      <Star className="h-4 w-4 text-white" />
                    </div>
                    <p className="text-xs text-slate-500">{loyaltyLabels[selectedGuest.loyaltyTier]}</p>
                  </div>
                </div>
              </div>

              {/* Zusammengeführte Profile */}
              {selectedGuest.profileCount > 1 && (
                <div>
                  <h3 className="text-sm font-semibold text-slate-900 mb-3">
                    Zusammengeführte Profile ({selectedGuest.profileCount})
                  </h3>
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                    <p className="text-sm text-green-700 mb-2">
                      Dieser Gast hatte {selectedGuest.profileCount} separate Profile in CapHotel,
                      die automatisch zusammengeführt wurden.
                    </p>
                    <p className="text-xs text-green-600">
                      CapHotel IDs: {selectedGuest.caphotelIds.join(', ')}
                    </p>
                  </div>
                </div>
              )}

              {/* Buchungen */}
              <div>
                <h3 className="text-sm font-semibold text-slate-900 mb-3">
                  Buchungen ({selectedGuest.bookings.length})
                </h3>
                <div className="space-y-2">
                  {selectedGuest.bookings.length === 0 ? (
                    <p className="text-sm text-slate-500">Keine Buchungen vorhanden</p>
                  ) : (
                    selectedGuest.bookings
                      .sort((a, b) => b.andf.localeCompare(a.andf))
                      .map((booking) => (
                        <div
                          key={booking.resn}
                          className="bg-slate-50 rounded-lg p-3"
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-medium text-slate-900">
                              #{booking.resn}
                            </span>
                            <span className="text-sm text-emerald-600 font-medium">
                              {formatCurrency(booking.accountTotal || 0)}
                            </span>
                          </div>
                          <div className="text-sm text-slate-600">
                            {formatDate(booking.andf)} - {formatDate(booking.ande)}
                          </div>
                          {booking.extn && booking.channelName ? (
                            <div className="mt-2">
                              <OTABadge
                                channelName={booking.channelName}
                                externalRef={booking.extn}
                              />
                            </div>
                          ) : booking.channelName && booking.channelName !== 'Direkt' ? (
                            <div className="text-xs text-slate-400 mt-1">
                              via {booking.channelName}
                            </div>
                          ) : null}
                        </div>
                      ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
