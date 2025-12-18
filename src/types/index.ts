// ============================================================================
// STADLER SUITE - DATENBANK TYPEN
// ============================================================================

// ----------------------------------------------------------------------------
// ZIMMER & KATEGORIEN
// ----------------------------------------------------------------------------

export interface Room {
  id: string;                    // Zimmer-ID (z.B. "1", "2", "3")
  name: string;                  // Bezeichnung (z.B. "DZ mit Balkon")
  categoryId: string;            // Verweis auf Kategorie
  floor?: number;                // Stockwerk
  beds: number;                  // Anzahl Betten
  maxPersons: number;            // Max. Personen
  maxChildren?: number;          // Max. Kinder
  amenities?: string[];          // Ausstattung ["Balkon", "Seeblick", "Minibar"]
  status: 'active' | 'inactive' | 'maintenance';
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Category {
  id: string;
  name: string;                  // z.B. "DZ mit Balkon und Seeblick"
  shortName: string;             // z.B. "DZ Seeblick"
  description?: string;
  beds: number;
  maxPersons: number;
  basePrice: number;             // Grundpreis pro Nacht
  images?: string[];
  amenities?: string[];
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

// ----------------------------------------------------------------------------
// PREISE & SAISONEN
// ----------------------------------------------------------------------------

export interface Season {
  id: string;
  name: string;                  // z.B. "Hauptsaison Sommer"
  startDate: Date;
  endDate: Date;
  priceMultiplier: number;       // z.B. 1.2 für +20%
  minStay?: number;              // Mindestaufenthalt
  createdAt: Date;
  updatedAt: Date;
}

export interface PriceRule {
  id: string;
  categoryId: string;
  seasonId?: string;             // Optional: Saison-spezifisch
  pricePerNight: number;
  pricePerPerson?: number;       // Aufpreis pro Person
  childDiscount?: number;        // Rabatt für Kinder (%)
  singleSupplement?: number;     // Einzelzimmer-Zuschlag
  weekendSupplement?: number;    // Wochenend-Zuschlag
  validFrom: Date;
  validTo: Date;
  createdAt: Date;
  updatedAt: Date;
}

// ----------------------------------------------------------------------------
// PAUSCHALEN & PACKAGES
// ----------------------------------------------------------------------------

export interface Package {
  id: string;
  name: string;                  // z.B. "Romantik-Wochenende"
  description: string;
  categoryIds: string[];         // Für welche Kategorien
  nights: number;                // Anzahl Nächte
  price: number;                 // Pauschalpreis
  pricePerPerson?: number;       // Oder pro Person
  includes: string[];            // Was ist inkludiert
  validFrom: Date;
  validTo: Date;
  weekdaysOnly?: number[];       // 0=So, 1=Mo, ..., 6=Sa
  active: boolean;
  image?: string;
  createdAt: Date;
  updatedAt: Date;
}

// ----------------------------------------------------------------------------
// GÄSTE
// ----------------------------------------------------------------------------

export interface Guest {
  id: string;
  salutation?: string;           // Herr, Frau, etc.
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  mobile?: string;
  street?: string;
  postalCode?: string;
  city?: string;
  country?: string;
  nationality?: string;
  dateOfBirth?: Date;
  language?: string;             // Bevorzugte Sprache

  // Familie
  partner?: {
    firstName: string;
    lastName: string;
    dateOfBirth?: Date;
  };
  children?: {
    firstName: string;
    dateOfBirth?: Date;
  }[];

  // Präferenzen
  preferences?: {
    roomPreference?: string;
    dietaryRequirements?: string[];
    specialRequests?: string;
  };

  // Statistiken
  totalStays: number;
  totalRevenue: number;
  firstStay?: Date;
  lastStay?: Date;

  // Loyalty
  loyaltyTier?: 'bronze' | 'silver' | 'gold' | 'platinum';
  loyaltyPoints?: number;

  // CapCorn Referenz
  capcornGuestId?: number;       // Original-ID aus CapCorn

  // Interne Notizen
  notes?: string;
  tags?: string[];               // z.B. ["VIP", "Stammgast", "Firmenkunde"]

  createdAt: Date;
  updatedAt: Date;
}

// ----------------------------------------------------------------------------
// BUCHUNGEN
// ----------------------------------------------------------------------------

export type BookingStatus =
  | 'inquiry'      // Anfrage
  | 'option'       // Option (blockiert)
  | 'confirmed'    // Bestätigt
  | 'checked_in'   // Eingecheckt
  | 'checked_out'  // Ausgecheckt
  | 'cancelled'    // Storniert
  | 'no_show';     // Nicht erschienen

export type BookingChannel =
  | 'direct'       // Direkt (Telefon, Email)
  | 'website'      // Eigene Website
  | 'booking_com'  // Booking.com
  | 'expedia'      // Expedia
  | 'hrs'          // HRS
  | 'other';       // Sonstige

export interface Booking {
  id: string;

  // Gast
  guestId: string;
  guestName: string;             // Für schnelle Anzeige
  guestEmail?: string;

  // Zeitraum
  checkIn: Date;
  checkOut: Date;
  nights: number;

  // Zimmer
  roomId: string;
  roomName: string;
  categoryId: string;

  // Personen
  adults: number;
  children: number;
  childrenAges?: number[];

  // Preis
  pricePerNight: number;
  totalPrice: number;
  discount?: number;
  discountReason?: string;
  packageId?: string;            // Falls Pauschale

  // Verpflegung
  mealPlan: 'none' | 'breakfast' | 'half_board' | 'full_board';

  // Status
  status: BookingStatus;
  channel: BookingChannel;

  // Zahlung
  depositAmount?: number;
  depositPaid?: boolean;
  depositPaidAt?: Date;
  paymentStatus: 'pending' | 'partial' | 'paid' | 'refunded';

  // CapCorn Referenz
  capcornReservationId?: number;
  capcornExternalId?: string;    // z.B. Booking.com Nummer

  // Zeiten
  optionExpiresAt?: Date;        // Wann läuft die Option ab
  confirmedAt?: Date;
  checkedInAt?: Date;
  checkedOutAt?: Date;
  cancelledAt?: Date;

  // Notizen
  guestNotes?: string;           // Wünsche vom Gast
  internalNotes?: string;        // Interne Notizen

  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;            // User-ID
}

// ----------------------------------------------------------------------------
// ANGEBOTE
// ----------------------------------------------------------------------------

export type OfferStatus =
  | 'draft'        // Entwurf
  | 'sent'         // Gesendet
  | 'viewed'       // Angesehen
  | 'accepted'     // Angenommen
  | 'declined'     // Abgelehnt
  | 'expired';     // Abgelaufen

export interface Offer {
  id: string;

  // Anfrage
  inquiryId?: string;
  guestId?: string;
  guestName: string;
  guestEmail: string;

  // Angebot
  checkIn: Date;
  checkOut: Date;
  nights: number;
  roomId?: string;
  categoryId: string;
  adults: number;
  children: number;

  // Preis
  pricePerNight: number;
  totalPrice: number;
  discount?: number;

  // Verpflegung
  mealPlan: 'none' | 'breakfast' | 'half_board' | 'full_board';

  // Status
  status: OfferStatus;
  expiresAt: Date;

  // Tracking
  sentAt?: Date;
  viewedAt?: Date;
  respondedAt?: Date;

  // Inhalt
  subject: string;
  message: string;               // Personalisierte Nachricht

  // Wenn angenommen -> Buchung
  bookingId?: string;

  createdAt: Date;
  updatedAt: Date;
}

// ----------------------------------------------------------------------------
// ANFRAGEN (Leads)
// ----------------------------------------------------------------------------

export type InquirySource =
  | 'email'
  | 'phone'
  | 'website'
  | 'instagram'
  | 'facebook'
  | 'whatsapp'
  | 'other';

export type InquiryStatus =
  | 'new'          // Neu
  | 'processing'   // In Bearbeitung
  | 'offer_sent'   // Angebot gesendet
  | 'converted'    // Gebucht
  | 'lost';        // Verloren

export interface Inquiry {
  id: string;

  // Kontakt
  name: string;
  email?: string;
  phone?: string;

  // Anfrage
  message: string;
  source: InquirySource;

  // Extrahierte Daten (von KI)
  extractedData?: {
    checkIn?: Date;
    checkOut?: Date;
    adults?: number;
    children?: number;
    roomType?: string;
    mealPlan?: string;
    specialRequests?: string;
  };

  // Status
  status: InquiryStatus;
  assignedTo?: string;           // User-ID

  // Verknüpfungen
  guestId?: string;
  offerId?: string;
  bookingId?: string;

  // Kommunikation
  lastContactAt?: Date;
  followUpAt?: Date;

  createdAt: Date;
  updatedAt: Date;
}

// ----------------------------------------------------------------------------
// VERFÜGBARKEIT (Cache von CapCorn)
// ----------------------------------------------------------------------------

export interface Availability {
  date: string;                  // YYYY-MM-DD
  roomId: string;
  status: 'free' | 'booked' | 'blocked' | 'option';
  bookingId?: string;
  capcornReservationId?: number;
  lastSyncedAt: Date;
}

// ----------------------------------------------------------------------------
// KORRESPONDENZ
// ----------------------------------------------------------------------------

export type MessageType =
  | 'email_in'     // Eingehende Email
  | 'email_out'    // Ausgehende Email
  | 'whatsapp_in'
  | 'whatsapp_out'
  | 'sms_in'
  | 'sms_out'
  | 'phone'        // Telefonnotiz
  | 'note';        // Interne Notiz

export interface Message {
  id: string;

  type: MessageType;

  // Verknüpfungen
  guestId?: string;
  bookingId?: string;
  inquiryId?: string;
  offerId?: string;

  // Inhalt
  subject?: string;
  content: string;

  // Email-spezifisch
  from?: string;
  to?: string;
  cc?: string[];
  attachments?: string[];

  // Status (für ausgehende)
  status?: 'draft' | 'sent' | 'delivered' | 'read' | 'failed';

  createdAt: Date;
  createdBy?: string;
}

// ----------------------------------------------------------------------------
// KONTO / LEISTUNGEN
// ----------------------------------------------------------------------------

export interface AccountItem {
  id: string;
  bookingId: string;

  date: Date;
  description: string;
  articleId?: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;

  // Kategorie
  category: 'accommodation' | 'food' | 'beverage' | 'service' | 'other';

  // Für Synchronisation mit CapCorn
  syncedToCapcorn: boolean;
  capcornAccountId?: number;

  createdAt: Date;
  createdBy?: string;
}

// ----------------------------------------------------------------------------
// ARTIKEL
// ----------------------------------------------------------------------------

export interface Article {
  id: string;
  name: string;
  description?: string;
  price: number;
  category: 'food' | 'beverage' | 'service' | 'rental' | 'other';
  taxRate: number;               // MwSt in %
  active: boolean;

  // CapCorn Referenz
  capcornArticleId?: number;

  createdAt: Date;
  updatedAt: Date;
}
