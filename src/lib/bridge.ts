// CapCorn Bridge API Service
// Verbindet sich mit der Python Bridge auf localhost:5000

const BRIDGE_URL = process.env.NEXT_PUBLIC_BRIDGE_URL || 'http://localhost:5000';

// Types für Bridge-Antworten
export interface BridgeRoom {
  zimn: number;
  name: string;
  caid: number;
  category_name: string;
  bession: number;
  extrabet: number;
  status: string;
}

export interface BridgeGuest {
  gast: number;
  anre: string;
  vorn: string;
  nacn: string;
  mail: string;
  teln: string;
  stra: string;
  polz: string;
  ortb: string;
  land: string;
  gebd: string;
}

export interface BridgeBooking {
  resn: number;
  gast: number;
  vorn: string;
  nacn: string;
  mail: string;
  anre: string;
  teln: string;
  channel_name: string;
  rooms: {
    buzn: number;
    zimn: number;
    room_name: string;
    datea: string;
    datee: string;
    nights: number;
    pession: number;
    preis: number;
  }[];
}

export interface BridgeAvailability {
  date: string;
  zimn: number;
  room_name: string;
  status: 'free' | 'booked' | 'blocked';
  resn?: number;
}

export interface BridgeStats {
  total_guests: number;
  total_bookings: number;
  total_rooms: number;
  categories: number;
  channels: { chid: number; name: string }[];
}

// API Funktionen
class BridgeAPI {
  private baseUrl: string;

  constructor(baseUrl: string = BRIDGE_URL) {
    this.baseUrl = baseUrl;
  }

  // Verbindung testen
  async checkConnection(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  // Statistiken laden
  async getStats(): Promise<BridgeStats> {
    const response = await fetch(`${this.baseUrl}/stats`);
    if (!response.ok) throw new Error('Failed to fetch stats');
    return response.json();
  }

  // Alle Zimmer laden
  async getRooms(): Promise<BridgeRoom[]> {
    const response = await fetch(`${this.baseUrl}/rooms`);
    if (!response.ok) throw new Error('Failed to fetch rooms');
    const data = await response.json();
    return data.rooms;
  }

  // Alle Gäste laden (mit Pagination)
  async getGuests(limit: number = 100, offset: number = 0): Promise<{ guests: BridgeGuest[]; total: number }> {
    const response = await fetch(`${this.baseUrl}/guests?limit=${limit}&offset=${offset}`);
    if (!response.ok) throw new Error('Failed to fetch guests');
    return response.json();
  }

  // Einzelnen Gast laden
  async getGuest(guestId: number): Promise<BridgeGuest> {
    const response = await fetch(`${this.baseUrl}/guests/${guestId}`);
    if (!response.ok) throw new Error('Failed to fetch guest');
    const data = await response.json();
    return data.guest;
  }

  // Buchungen eines Gastes laden
  async getGuestBookings(guestId: number): Promise<BridgeBooking[]> {
    const response = await fetch(`${this.baseUrl}/guests/${guestId}/bookings`);
    if (!response.ok) throw new Error('Failed to fetch guest bookings');
    const data = await response.json();
    return data.bookings;
  }

  // Verfügbarkeit laden
  async getAvailability(startDate: string, endDate: string, roomId?: number): Promise<BridgeAvailability[]> {
    let url = `${this.baseUrl}/availability?start_date=${startDate}&end_date=${endDate}`;
    if (roomId) url += `&room_id=${roomId}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error('Failed to fetch availability');
    const data = await response.json();
    return data.availability;
  }

  // Kalender laden (Buchungen im Zeitraum)
  async getCalendar(startDate: string, endDate: string): Promise<BridgeBooking[]> {
    const response = await fetch(`${this.baseUrl}/calendar?start_date=${startDate}&end_date=${endDate}`);
    if (!response.ok) throw new Error('Failed to fetch calendar');
    const data = await response.json();
    return data.bookings;
  }

  // Einzelne Buchung laden
  async getBooking(reservationId: number): Promise<BridgeBooking> {
    const response = await fetch(`${this.baseUrl}/bookings/${reservationId}`);
    if (!response.ok) throw new Error('Failed to fetch booking');
    const data = await response.json();
    return data.booking;
  }
}

// Singleton Export
export const bridgeAPI = new BridgeAPI();

// React Hook für Bridge-Status
export function useBridgeStatus() {
  // Dieser Hook wird in React-Komponenten verwendet
  // um den Verbindungsstatus zu prüfen
}
