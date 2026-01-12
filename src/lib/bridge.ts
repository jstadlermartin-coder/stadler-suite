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

// Artikel aus CapCorn
export interface BridgeArticle {
  artn: number;           // Artikel-ID
  beze: string;           // Bezeichnung
  prei: number;           // Preis
  knto?: number;          // Konto
  mwst?: number;          // MwSt-Satz
}

// Buchungskanäle
export interface BridgeChannel {
  chid: number;           // Channel-ID
  beze: string;           // Bezeichnung (Booking.com, Expedia, etc.)
}

// Kategorie
export interface BridgeCategory {
  catg: number;           // Kategorie-ID
  beze: string;           // Bezeichnung
}

// Neue Interfaces für Blockierung und Buchung mit Webapp-Preisen
export interface BridgeBlockRequest {
  zimm: number;
  von: string;  // YYYY-MM-DD
  bis: string;  // YYYY-MM-DD
  grund?: string;
  gast?: number;
}

export interface BridgeBlockResponse {
  success: boolean;
  resn: number;
  zimm: number;
  von: string;
  bis: string;
  flgl: number;
  message: string;
}

export interface BookingPosition {
  artikel: string;
  preis: number;
  artn?: number | null;
}

export interface BookingPauschale {
  name: string;
  preis: number;
}

export interface BridgeBookingWithPriceRequest {
  gast?: number;
  zimm: number;
  von: string;  // YYYY-MM-DD
  bis: string;  // YYYY-MM-DD
  pers?: number;
  kndr?: number;
  channel?: number;
  pession?: number;  // 0=UE, 1=F, 2=HP
  positionen?: BookingPosition[];
  pauschale?: BookingPauschale;
  // Gast-Daten wenn neu:
  vorname?: string;
  nachname?: string;
  email?: string;
  telefon?: string;
}

export interface BridgeBookingWithPriceResponse {
  success: boolean;
  resn: number;
  gast: number;
  zimm: number;
  von: string;
  bis: string;
  positionen: number;
  total: number;
  message: string;
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

  // Alle Artikel laden (E-Bike, HP, Massage, etc.)
  async getArticles(): Promise<BridgeArticle[]> {
    const response = await fetch(`${this.baseUrl}/articles`);
    if (!response.ok) throw new Error('Failed to fetch articles');
    const data = await response.json();
    return data.articles;
  }

  // Alle Buchungskanäle laden
  async getChannels(): Promise<BridgeChannel[]> {
    const response = await fetch(`${this.baseUrl}/channels`);
    if (!response.ok) throw new Error('Failed to fetch channels');
    const data = await response.json();
    return data.channels;
  }

  // Alle Kategorien laden
  async getCategories(): Promise<BridgeCategory[]> {
    const response = await fetch(`${this.baseUrl}/categories`);
    if (!response.ok) throw new Error('Failed to fetch categories');
    const data = await response.json();
    return data.categories;
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

  // ============================================================
  // BLOCKIERUNG (Kalender-Sichtbar)
  // ============================================================

  // Zeitraum im Kalender blockieren
  async createBlock(block: BridgeBlockRequest): Promise<BridgeBlockResponse> {
    const response = await fetch(`${this.baseUrl}/block`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(block),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create block');
    }
    return response.json();
  }

  // Blockierung entfernen
  async removeBlock(resn: number): Promise<{ success: boolean; message: string }> {
    const response = await fetch(`${this.baseUrl}/block/${resn}`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to remove block');
    }
    return response.json();
  }

  // ============================================================
  // BUCHUNG MIT WEBAPP-PREISEN
  // ============================================================

  // Buchung mit Preisen aus Webapp erstellen
  async createBookingWithPrice(booking: BridgeBookingWithPriceRequest): Promise<BridgeBookingWithPriceResponse> {
    const response = await fetch(`${this.baseUrl}/booking-with-price`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(booking),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create booking');
    }
    return response.json();
  }

  // Option zur Buchung wandeln
  async confirmBooking(resn: number): Promise<{ success: boolean; message: string }> {
    const response = await fetch(`${this.baseUrl}/book/${resn}`, {
      method: 'PUT',
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to confirm booking');
    }
    return response.json();
  }

  // Buchung stornieren
  async cancelBooking(resn: number): Promise<{ success: boolean; message: string }> {
    const response = await fetch(`${this.baseUrl}/cancel/${resn}`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to cancel booking');
    }
    return response.json();
  }

  // ============================================================
  // LEISTUNGEN / EXTRAS
  // ============================================================

  // Leistung auf Konto buchen
  async addService(resn: number, artn: number, preis?: number, beschreibung?: string): Promise<{ success: boolean; aknr: number }> {
    const response = await fetch(`${this.baseUrl}/service`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        resn,
        artn,
        prei: preis,
        bez1: beschreibung,
      }),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to add service');
    }
    return response.json();
  }

  // ============================================================
  // GÄSTE
  // ============================================================

  // Neuen Gast anlegen
  async createGuest(guest: {
    vorname?: string;
    nachname: string;
    email?: string;
    telefon?: string;
    strasse?: string;
    plz?: string;
    ort?: string;
    land?: string;
  }): Promise<{ success: boolean; gast: number }> {
    const response = await fetch(`${this.baseUrl}/guest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(guest),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create guest');
    }
    return response.json();
  }

  // Gast aktualisieren
  async updateGuest(gastId: number, updates: {
    vorname?: string;
    nachname?: string;
    email?: string;
    telefon?: string;
    strasse?: string;
    plz?: string;
    ort?: string;
    land?: string;
  }): Promise<{ success: boolean; message: string }> {
    const response = await fetch(`${this.baseUrl}/guest/${gastId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to update guest');
    }
    return response.json();
  }
}

// Singleton Export
export const bridgeAPI = new BridgeAPI();

// React Hook für Bridge-Status
export function useBridgeStatus() {
  // Dieser Hook wird in React-Komponenten verwendet
  // um den Verbindungsstatus zu prüfen
}
