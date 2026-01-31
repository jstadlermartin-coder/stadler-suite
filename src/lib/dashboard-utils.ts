// Dashboard Utility Functions
// Berechnungen für Dashboard-Statistiken basierend auf CapHotel Buchungsdaten

import { CaphotelBooking } from './firestore';

/**
 * Formatiert ein Datum als YYYY-MM-DD String (für Vergleich mit andf/ande)
 */
function formatDateToYMD(date: Date): string {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Prüft ob ein Datum-String im Format YYYY-MM-DD oder DD.MM.YYYY mit einem Datum übereinstimmt
 */
function isSameDate(dateStr: string, targetDate: Date): boolean {
  const target = formatDateToYMD(targetDate);

  // YYYY-MM-DD Format
  if (dateStr.includes('-') && dateStr.length === 10) {
    return dateStr === target;
  }

  // DD.MM.YYYY Format
  if (dateStr.includes('.')) {
    const [day, month, year] = dateStr.split('.');
    const converted = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    return converted === target;
  }

  return false;
}

/**
 * Prüft ob ein Datum innerhalb eines Buchungszeitraums liegt (exklusiv Abreisetag)
 */
function isDateInBookingRange(checkDate: Date, andf: string, ande: string): boolean {
  const check = formatDateToYMD(checkDate);

  // Konvertiere andf/ande zu YYYY-MM-DD falls nötig
  let startDate = andf;
  let endDate = ande;

  if (andf.includes('.')) {
    const [day, month, year] = andf.split('.');
    startDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }

  if (ande.includes('.')) {
    const [day, month, year] = ande.split('.');
    endDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }

  // Gast ist im Haus: >= Anreise UND < Abreise
  return check >= startDate && check < endDate;
}

/**
 * Filtert aktive Buchungen (Status: Bestätigt oder Eingecheckt)
 * stat: 1 = Bestätigt, 2 = Eingecheckt
 */
function getActiveBookings(bookings: CaphotelBooking[]): CaphotelBooking[] {
  return bookings.filter(b => b.stat === 1 || b.stat === 2);
}

/**
 * Holt alle Anreisen für ein bestimmtes Datum
 */
export function getArrivalsForDate(bookings: CaphotelBooking[], date: Date): CaphotelBooking[] {
  const active = getActiveBookings(bookings);
  return active.filter(booking => isSameDate(booking.andf, date));
}

/**
 * Holt alle Abreisen für ein bestimmtes Datum
 */
export function getDeparturesForDate(bookings: CaphotelBooking[], date: Date): CaphotelBooking[] {
  const active = getActiveBookings(bookings);
  return active.filter(booking => isSameDate(booking.ande, date));
}

/**
 * Holt alle Gäste die an einem bestimmten Datum im Haus sind
 * (Anreise <= Datum < Abreise)
 */
export function getInHouseGuests(bookings: CaphotelBooking[], date: Date): CaphotelBooking[] {
  const active = getActiveBookings(bookings);
  return active.filter(booking => isDateInBookingRange(date, booking.andf, booking.ande));
}

/**
 * Berechnet die Anzahl belegter Zimmer für ein Datum
 */
export function getOccupiedRoomsCount(bookings: CaphotelBooking[], date: Date): number {
  const inHouse = getInHouseGuests(bookings, date);

  // Zähle eindeutige Zimmer
  const uniqueRooms = new Set<number>();
  inHouse.forEach(booking => {
    if (booking.rooms && booking.rooms.length > 0) {
      booking.rooms.forEach(room => {
        // Prüfe ob das Zimmer an diesem Datum belegt ist
        if (room.vndt && room.bsdt) {
          const roomStart = room.vndt;
          const roomEnd = room.bsdt;
          if (isDateInBookingRange(date, roomStart, roomEnd)) {
            uniqueRooms.add(room.zimm);
          }
        } else {
          // Fallback: Nehme das Hauptbuchungsdatum
          uniqueRooms.add(room.zimm);
        }
      });
    }
  });

  return uniqueRooms.size;
}

/**
 * Berechnet freie Zimmer für ein Datum
 */
export function getAvailableRooms(bookings: CaphotelBooking[], totalRooms: number, date: Date): number {
  const occupied = getOccupiedRoomsCount(bookings, date);
  return Math.max(0, totalRooms - occupied);
}

/**
 * Zählt die Gesamtzahl der Gäste (Personen) im Haus
 */
export function getGuestCount(bookings: CaphotelBooking[], date: Date): number {
  const inHouse = getInHouseGuests(bookings, date);

  let totalGuests = 0;
  inHouse.forEach(booking => {
    if (booking.rooms && booking.rooms.length > 0) {
      booking.rooms.forEach(room => {
        totalGuests += (room.pers || 0) + (room.kndr || 0);
      });
    }
  });

  return totalGuests;
}

/**
 * Dashboard Stats für einen Tag
 */
export interface DashboardStats {
  arrivals: number;
  departures: number;
  inHouse: number;
  available: number;
  guestCount: number;
}

/**
 * Holt alle Dashboard-Statistiken für ein Datum
 */
export function getDashboardStats(
  bookings: CaphotelBooking[],
  totalRooms: number,
  date: Date
): DashboardStats {
  return {
    arrivals: getArrivalsForDate(bookings, date).length,
    departures: getDeparturesForDate(bookings, date).length,
    inHouse: getOccupiedRoomsCount(bookings, date),
    available: getAvailableRooms(bookings, totalRooms, date),
    guestCount: getGuestCount(bookings, date)
  };
}

/**
 * Holt Stats für mehrere Tage (für Statistik-Ansicht)
 */
export function getStatsForDateRange(
  bookings: CaphotelBooking[],
  totalRooms: number,
  startDate: Date,
  days: number
): { date: Date; stats: DashboardStats }[] {
  const result: { date: Date; stats: DashboardStats }[] = [];

  for (let i = 0; i < days; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);
    result.push({
      date,
      stats: getDashboardStats(bookings, totalRooms, date)
    });
  }

  return result;
}

/**
 * Formatiert ein Datum für die Anzeige (z.B. "Heute, 14:00")
 */
export function formatArrivalTime(date: Date): string {
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const isToday = formatDateToYMD(date) === formatDateToYMD(today);
  const isTomorrow = formatDateToYMD(date) === formatDateToYMD(tomorrow);

  if (isToday) return 'Heute';
  if (isTomorrow) return 'Morgen';

  return date.toLocaleDateString('de-DE', { weekday: 'short', day: 'numeric', month: 'short' });
}
