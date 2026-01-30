import { db } from './firebase';
import {
  doc,
  getDoc,
  setDoc,
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  Timestamp,
  runTransaction
} from 'firebase/firestore';

// Types
export interface HotelInfo {
  name: string;
  contactPerson: string;
  street: string;
  city: string;
  country: string;
  email: string;
  phone: string;
}

export interface Occupancy {
  id: string;
  adults: number;
  children: number;
  infants: number;
}

export interface Room {
  id: string;
  number: string;
  name: string;
  description: string;
  buildingId?: string; // Welches Gebäude/Haus
  buildingName?: string; // Cached building name für Sortierung
  occupancies: Occupancy[];
}

export interface Building {
  id: string;
  name: string;
  description?: string;
  sortOrder?: number;
}

export interface Category {
  id: string;
  name: string;
  description: string;
  rooms: Room[];
}

export interface AgePriceTier {
  id: string;
  ageFrom: number;
  ageTo: number;
  percentage: number; // Prozent vom Erwachsenenpreis
}

// Gästekategorien (Altersgruppen)
export interface GuestCategory {
  id: string;
  name: string;              // z.B. "Erwachsener", "Kind 5-8"
  shortName: string;         // z.B. "Erw.", "Kind"
  ageFrom: number;           // Mindestalter
  ageTo: number;             // Höchstalter
  isAdult: boolean;          // Ist Erwachsener?
  sortOrder: number;         // Sortierreihenfolge
  color?: string;            // Farbe für UI
}

export interface Rate {
  id: string;
  name: string;
  minNights: number;
  maxNights: number | null;
  pricePerAdult: number;
  childPrices: AgePriceTier[];
  infantPrices: AgePriceTier[];
}

export interface Season {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  rates: Rate[];
}

export interface Guest {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  street?: string;
  city?: string;
  country?: string;
  postalCode?: string;
  createdAt?: string;
}

// Deduplizierter Gast aus der Python Bridge
export interface DeduplicatedGuest {
  id: string;                    // "G100001"
  customerNumber: number;        // 100001 (6-stellig)

  // Normalisierte Kontaktdaten (für Matching)
  phoneNormalized?: string;      // "436641234567"
  emailNormalized?: string;      // "max@example.com"

  // Anzeige-Daten
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  street?: string;
  postalCode?: string;
  city?: string;
  country?: string;

  // CapHotel-Referenzen
  caphotelGuestIds: number[];    // [1234, 5678] - alle zusammengeführten Profile

  // Notizen/Anfragen
  notes?: string;                // Letzte Notiz/Anfrage-Nachricht

  // Statistiken
  totalBookings: number;
  totalRevenue: number;
  lastBooking?: string;

  // Metadata
  createdAt: string;
  updatedAt: string;
}

// Guest Lookup für schnelle Suche
export interface GuestLookup {
  guestId: string;
  customerNumber: number;
}

// Guest Counter für Kundennummer
export interface GuestCounter {
  lastNumber: number;
}

export interface Booking {
  id: string;
  guestId?: string;
  guestName: string;
  guestEmail?: string;
  guestPhone?: string;
  checkIn: string; // YYYY-MM-DD
  checkOut: string; // YYYY-MM-DD
  adults: number;
  children: number[];
  categoryIds: string[];
  roomId?: string;
  status: 'inquiry' | 'confirmed' | 'checked_in' | 'checked_out' | 'cancelled';
  createdAt: string;
  updatedAt?: string;
  notes?: string;
}

// ============ HOTEL INFO ============

export async function getHotelInfo(): Promise<HotelInfo | null> {
  try {
    const docRef = doc(db, 'settings', 'hotelInfo');
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return docSnap.data() as HotelInfo;
    }
    return null;
  } catch (error) {
    console.error('Error getting hotel info:', error);
    return null;
  }
}

export async function saveHotelInfo(info: HotelInfo): Promise<boolean> {
  try {
    const docRef = doc(db, 'settings', 'hotelInfo');
    await setDoc(docRef, info);
    return true;
  } catch (error) {
    console.error('Error saving hotel info:', error);
    return false;
  }
}

// ============ CATEGORIES ============

export async function getCategories(): Promise<Category[]> {
  try {
    const docRef = doc(db, 'settings', 'categories');
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return docSnap.data().items as Category[];
    }
    return [];
  } catch (error) {
    console.error('Error getting categories:', error);
    return [];
  }
}

export async function saveCategories(categories: Category[]): Promise<boolean> {
  const docRef = doc(db, 'settings', 'categories');
  const cleanedCategories = removeUndefined(categories);
  await setDoc(docRef, { items: cleanedCategories, updatedAt: new Date().toISOString() });
  return true;
}

// ============ BUILDINGS ============

export async function getBuildings(): Promise<Building[]> {
  try {
    const docRef = doc(db, 'settings', 'buildings');
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return docSnap.data().items as Building[];
    }
    return [];
  } catch (error) {
    console.error('Error getting buildings:', error);
    return [];
  }
}

// Helper: Remove undefined values from object (Firestore doesn't accept undefined)
function removeUndefined<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

export async function saveBuildings(buildings: Building[]): Promise<boolean> {
  const docRef = doc(db, 'settings', 'buildings');
  const cleanedBuildings = removeUndefined(buildings);
  await setDoc(docRef, { items: cleanedBuildings, updatedAt: new Date().toISOString() });
  return true;
}

// ============ GUEST CATEGORIES (Altersgruppen) ============

// Default Gästekategorien
export const DEFAULT_GUEST_CATEGORIES: GuestCategory[] = [
  { id: 'adult', name: 'Erwachsener', shortName: 'Erw.', ageFrom: 17, ageTo: 99, isAdult: true, sortOrder: 1, color: '#3b82f6' },
  { id: 'teen', name: 'Jugendlicher (9-16)', shortName: 'Jug.', ageFrom: 9, ageTo: 16, isAdult: false, sortOrder: 2, color: '#10b981' },
  { id: 'child_5_8', name: 'Kind (5-8)', shortName: 'Kind', ageFrom: 5, ageTo: 8, isAdult: false, sortOrder: 3, color: '#f59e0b' },
  { id: 'child_0_4', name: 'Kleinkind (0-4)', shortName: 'Baby', ageFrom: 0, ageTo: 4, isAdult: false, sortOrder: 4, color: '#ec4899' },
];

export async function getGuestCategories(): Promise<GuestCategory[]> {
  try {
    const docRef = doc(db, 'settings', 'guestCategories');
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return docSnap.data().items as GuestCategory[];
    }
    return DEFAULT_GUEST_CATEGORIES;
  } catch (error) {
    console.error('Error getting guest categories:', error);
    return DEFAULT_GUEST_CATEGORIES;
  }
}

export async function saveGuestCategories(categories: GuestCategory[]): Promise<boolean> {
  const docRef = doc(db, 'settings', 'guestCategories');
  const cleanedCategories = removeUndefined(categories);
  await setDoc(docRef, { items: cleanedCategories, updatedAt: new Date().toISOString() });
  return true;
}

// ============ SEASONS ============

export async function getSeasons(): Promise<Season[]> {
  try {
    const docRef = doc(db, 'settings', 'seasons');
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return docSnap.data().items as Season[];
    }
    return [];
  } catch (error) {
    console.error('Error getting seasons:', error);
    return [];
  }
}

export async function saveSeasons(seasons: Season[]): Promise<boolean> {
  const docRef = doc(db, 'settings', 'seasons');
  const cleanedSeasons = removeUndefined(seasons);
  await setDoc(docRef, { items: cleanedSeasons, updatedAt: new Date().toISOString() });
  return true;
}

// ============ ARTICLES (App-eigene Artikel) ============

export interface AppArticle {
  id: string;
  name: string;
  description?: string;
  photos?: string[];
  basePrice: number;
  priceUnit: 'pro_nacht' | 'pro_aufenthalt' | 'pro_stueck' | 'pro_person_nacht';
  hasSeasonalPricing: boolean;
  seasonPrices?: { seasonId: string; basePrice: number }[];
  hasAgePricing: boolean;
  agePrices?: { id: string; ageFrom: number; ageTo: number; price: number }[];
  isOrtstaxe: boolean;
  ortstaxeMinAge?: number;
  active: boolean;
}

export async function getAppArticles(): Promise<AppArticle[]> {
  try {
    const docRef = doc(db, 'settings', 'articles');
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return docSnap.data().items as AppArticle[];
    }
    return [];
  } catch (error) {
    console.error('Error getting articles:', error);
    return [];
  }
}

export async function saveAppArticles(articles: AppArticle[]): Promise<boolean> {
  const docRef = doc(db, 'settings', 'articles');
  const cleanedArticles = removeUndefined(articles);
  await setDoc(docRef, { items: cleanedArticles, updatedAt: new Date().toISOString() });
  return true;
}

// ============ GUESTS ============

export async function getGuests(): Promise<Guest[]> {
  try {
    const querySnapshot = await getDocs(collection(db, 'guests'));
    const guests: Guest[] = [];
    querySnapshot.forEach((doc) => {
      guests.push({ id: doc.id, ...doc.data() } as Guest);
    });
    return guests;
  } catch (error) {
    console.error('Error getting guests:', error);
    return [];
  }
}

export async function addGuest(guest: Omit<Guest, 'id'>): Promise<string | null> {
  try {
    const docRef = await addDoc(collection(db, 'guests'), {
      ...guest,
      createdAt: new Date().toISOString()
    });
    return docRef.id;
  } catch (error) {
    console.error('Error adding guest:', error);
    return null;
  }
}

export async function updateGuest(id: string, data: Partial<Guest>): Promise<boolean> {
  try {
    const docRef = doc(db, 'guests', id);
    await updateDoc(docRef, data);
    return true;
  } catch (error) {
    console.error('Error updating guest:', error);
    return false;
  }
}

export async function deleteGuest(id: string): Promise<boolean> {
  try {
    await deleteDoc(doc(db, 'guests', id));
    return true;
  } catch (error) {
    console.error('Error deleting guest:', error);
    return false;
  }
}

// ============ DEDUPLICATED GUESTS (from Bridge) ============

export async function getDeduplicatedGuests(): Promise<DeduplicatedGuest[]> {
  try {
    const querySnapshot = await getDocs(collection(db, 'guests'));
    const guests: DeduplicatedGuest[] = [];
    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data();
      // Check if this is a deduplicated guest (has customerNumber)
      if (data.customerNumber) {
        guests.push({ id: docSnap.id, ...data } as DeduplicatedGuest);
      }
    });
    return guests;
  } catch (error) {
    console.error('Error getting deduplicated guests:', error);
    return [];
  }
}

export async function getDeduplicatedGuestById(guestId: string): Promise<DeduplicatedGuest | null> {
  try {
    const docRef = doc(db, 'guests', guestId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as DeduplicatedGuest;
    }
    return null;
  } catch (error) {
    console.error('Error getting deduplicated guest:', error);
    return null;
  }
}

export async function getGuestByLookup(lookupType: 'phone' | 'email', lookupValue: string): Promise<GuestLookup | null> {
  try {
    const lookupId = `${lookupType}_${lookupValue}`;
    const docRef = doc(db, 'guestLookup', lookupId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return docSnap.data() as GuestLookup;
    }
    return null;
  } catch (error) {
    console.error('Error getting guest lookup:', error);
    return null;
  }
}

// Lookup-Index speichern (für schnelle Suche nach Email/Telefon)
export async function saveGuestLookup(
  type: 'phone' | 'email',
  value: string,
  guestId: string,
  customerNumber: number
): Promise<boolean> {
  try {
    const lookupId = `${type}_${value}`;
    const docRef = doc(db, 'guestLookup', lookupId);
    await setDoc(docRef, {
      guestId,
      customerNumber,
      type,
      value,
      updatedAt: new Date().toISOString()
    });
    return true;
  } catch (error) {
    console.error('Error saving guest lookup:', error);
    return false;
  }
}

// Nächste Kundennummer atomar holen (thread-safe mit Transaction)
// Kundennummern starten bei 100001
export async function getNextCustomerNumber(): Promise<number> {
  const counterRef = doc(db, 'settings', 'guestCounter');

  const newNumber = await runTransaction(db, async (transaction) => {
    const counterDoc = await transaction.get(counterRef);

    let lastNumber = 100000; // Start bei 100000, erste Nummer wird 100001
    if (counterDoc.exists()) {
      lastNumber = counterDoc.data().lastNumber || 100000;
    }

    const nextNumber = lastNumber + 1;
    transaction.set(counterRef, { lastNumber: nextNumber, updatedAt: new Date().toISOString() });

    return nextNumber;
  });

  return newNumber;
}

// Deduplizierten Gast speichern
export async function saveDeduplicatedGuest(guest: DeduplicatedGuest): Promise<boolean> {
  try {
    const docRef = doc(db, 'guests', guest.id);
    await setDoc(docRef, removeUndefined(guest));
    return true;
  } catch (error) {
    console.error('Error saving deduplicated guest:', error);
    return false;
  }
}

// Deduplizierten Gast aktualisieren (z.B. CapHotel-ID hinzufügen)
export async function updateDeduplicatedGuest(
  guestId: string,
  updates: Partial<DeduplicatedGuest>
): Promise<boolean> {
  try {
    const docRef = doc(db, 'guests', guestId);
    await updateDoc(docRef, removeUndefined({
      ...updates,
      updatedAt: new Date().toISOString()
    }));
    return true;
  } catch (error) {
    console.error('Error updating deduplicated guest:', error);
    return false;
  }
}

// ============ BOOKINGS ============

export async function getBookings(): Promise<Booking[]> {
  try {
    const querySnapshot = await getDocs(collection(db, 'bookings'));
    const bookings: Booking[] = [];
    querySnapshot.forEach((doc) => {
      bookings.push({ id: doc.id, ...doc.data() } as Booking);
    });
    return bookings;
  } catch (error) {
    console.error('Error getting bookings:', error);
    return [];
  }
}

export async function addBooking(booking: Omit<Booking, 'id'>): Promise<string | null> {
  try {
    const docRef = await addDoc(collection(db, 'bookings'), {
      ...booking,
      createdAt: new Date().toISOString()
    });
    return docRef.id;
  } catch (error) {
    console.error('Error adding booking:', error);
    return null;
  }
}

export async function updateBooking(id: string, data: Partial<Booking>): Promise<boolean> {
  try {
    const docRef = doc(db, 'bookings', id);
    await updateDoc(docRef, { ...data, updatedAt: new Date().toISOString() });
    return true;
  } catch (error) {
    console.error('Error updating booking:', error);
    return false;
  }
}

export async function deleteBooking(id: string): Promise<boolean> {
  try {
    await deleteDoc(doc(db, 'bookings', id));
    return true;
  } catch (error) {
    console.error('Error deleting booking:', error);
    return false;
  }
}

// ============ BRIDGE MAPPINGS ============

export interface RoomMapping {
  appRoomId: string;        // ID from our app (category.room.id)
  appRoomName: string;      // Display name in our app
  caphotelZimm: number;     // zimm field from CapHotel
  caphotelName: string;     // beze field from CapHotel
}

export interface ArticleMapping {
  appArticleId: string;     // ID in our app
  appArticleName: string;   // Display name in our app
  caphotelArtn: number;     // artn field from CapHotel
  caphotelName: string;     // beze field from CapHotel
  price: number;            // Default price
}

export interface BridgeConfig {
  bridgeUrl: string;        // e.g., "http://localhost:5000"
  lastConnected?: string;   // Last successful connection timestamp
  autoSync: boolean;        // Auto-sync bookings
}

export interface BridgeMappings {
  config: BridgeConfig;
  rooms: RoomMapping[];
  articles: ArticleMapping[];
  updatedAt: string;
}

export async function getBridgeMappings(): Promise<BridgeMappings | null> {
  try {
    const docRef = doc(db, 'settings', 'bridgeMappings');
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return docSnap.data() as BridgeMappings;
    }
    return null;
  } catch (error) {
    console.error('Error getting bridge mappings:', error);
    return null;
  }
}

export async function saveBridgeMappings(mappings: BridgeMappings): Promise<boolean> {
  try {
    const docRef = doc(db, 'settings', 'bridgeMappings');
    await setDoc(docRef, { ...mappings, updatedAt: new Date().toISOString() });
    return true;
  } catch (error) {
    console.error('Error saving bridge mappings:', error);
    return false;
  }
}

export async function saveBridgeConfig(config: BridgeConfig): Promise<boolean> {
  try {
    const current = await getBridgeMappings();
    const updated: BridgeMappings = {
      config,
      rooms: current?.rooms || [],
      articles: current?.articles || [],
      updatedAt: new Date().toISOString()
    };
    return saveBridgeMappings(updated);
  } catch (error) {
    console.error('Error saving bridge config:', error);
    return false;
  }
}

export async function saveRoomMappings(rooms: RoomMapping[]): Promise<boolean> {
  try {
    const current = await getBridgeMappings();
    const updated: BridgeMappings = {
      config: current?.config || { bridgeUrl: 'http://localhost:5000', autoSync: false },
      rooms,
      articles: current?.articles || [],
      updatedAt: new Date().toISOString()
    };
    return saveBridgeMappings(updated);
  } catch (error) {
    console.error('Error saving room mappings:', error);
    return false;
  }
}

export async function saveArticleMappings(articles: ArticleMapping[]): Promise<boolean> {
  try {
    const current = await getBridgeMappings();
    const updated: BridgeMappings = {
      config: current?.config || { bridgeUrl: 'http://localhost:5000', autoSync: false },
      rooms: current?.rooms || [],
      articles,
      updatedAt: new Date().toISOString()
    };
    return saveBridgeMappings(updated);
  } catch (error) {
    console.error('Error saving article mappings:', error);
    return false;
  }
}

// ============ CAPHOTEL SYNC DATA ============

export interface CaphotelBooking {
  resn: number;              // Reservierungsnummer (5-stellig, Hauptnummer)
  gast: number;              // Gast-ID
  stat: number;              // Status
  andf: string;              // Anreise
  ande: string;              // Abreise
  chid: number;              // Channel ID
  extn?: string;             // Externe Buchungsnummer (Booking.com, Expedia etc.)
  guestName?: string;        // Gastname (joined)
  guestEmail?: string;       // E-Mail
  guestPhone?: string;       // Telefonnummer
  guestSalutation?: string;  // Anrede (Herr, Frau, etc.)
  channelName?: string;      // Channel Name (z.B. "Booking.com", "Expedia", "Direkt")
  pession?: number;          // Verpflegung: 0=UE, 1=F, 2=HP, 3=VP (aus BUZ-Tabelle)
  nights?: number;           // Anzahl Nächte
  totalPrice?: number;       // Gesamtpreis der Buchung
  rooms?: CaphotelBookingRoom[];
  account?: CaphotelAccountPosition[];
  accountTotal?: number;
  syncedAt: string;
}

export interface CaphotelBookingRoom {
  zimm: number;
  vndt: string;
  bsdt: string;
  pers: number;
  kndr: number;
  pession?: number;          // Verpflegung pro Zimmer
  nights?: number;           // Nächte pro Zimmer
  preis?: number;            // Preis pro Zimmer
  roomName?: string;         // Zimmername
}

export interface CaphotelGuest {
  gast: number;
  anre?: string;             // Anrede (Herr, Frau, etc.)
  vorn: string;              // Vorname
  nacn: string;              // Nachname
  mail?: string;
  teln?: string;
  stra?: string;             // Strasse
  polz?: string;             // PLZ
  ortb?: string;             // Ort
  land?: string;
  gebd?: string;             // Geburtsdatum
  noti?: string;             // Notizen/Anfrage-Nachricht vom Formular
  syncedAt: string;
}

export interface CaphotelAccountPosition {
  aknr: number;
  resn: number;
  zimm: number;
  artn: number;
  prei: number;
  bez1: string;
  edat: string;
  artikelName?: string;
}

export interface CaphotelArticle {
  artn: number;
  beze: string;
  prei: number;
  knto?: number;
  syncedAt: string;
}

export interface CaphotelRoom {
  zimm: number;
  beze: string;
  bett: number;
  catg: number;
  stat: number;
  syncedAt: string;
}

export interface CaphotelChannel {
  chid: number;
  name: string;
  syncedAt: string;
}

export interface CaphotelCategory {
  catg: number;              // Kategorie-ID
  beze: string;              // Bezeichnung
  syncedAt: string;
}

export interface SyncStatus {
  lastSync?: string | null;
  lastFullSync?: string | null;
  lastSyncSuccess?: boolean;
  syncInProgress?: boolean;
  bookingsCount?: number;
  guestsCount?: number;
  rooms?: number;
  guests?: number;
  bookings?: number;
  articles?: number;
  channels?: number;
  error?: string;
  autoSyncEnabled?: boolean;
  autoSyncInterval?: number;  // in minutes
}

// Save synced bookings
export async function saveSyncedBookings(bookings: CaphotelBooking[]): Promise<boolean> {
  try {
    const docRef = doc(db, 'caphotelSync', 'bookings');
    await setDoc(docRef, {
      items: bookings,
      count: bookings.length,
      syncedAt: new Date().toISOString()
    });
    return true;
  } catch (error) {
    console.error('Error saving synced bookings:', error);
    return false;
  }
}

export async function getSyncedBookings(): Promise<CaphotelBooking[]> {
  try {
    const docRef = doc(db, 'caphotelSync', 'bookings');
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return docSnap.data().items as CaphotelBooking[];
    }
    return [];
  } catch (error) {
    console.error('Error getting synced bookings:', error);
    return [];
  }
}

// Save synced guests
export async function saveSyncedGuests(guests: CaphotelGuest[]): Promise<boolean> {
  try {
    const docRef = doc(db, 'caphotelSync', 'guests');
    await setDoc(docRef, {
      items: guests,
      count: guests.length,
      syncedAt: new Date().toISOString()
    });
    return true;
  } catch (error) {
    console.error('Error saving synced guests:', error);
    return false;
  }
}

export async function getSyncedGuests(): Promise<CaphotelGuest[]> {
  try {
    const docRef = doc(db, 'caphotelSync', 'guests');
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return docSnap.data().items as CaphotelGuest[];
    }
    return [];
  } catch (error) {
    console.error('Error getting synced guests:', error);
    return [];
  }
}

// Save synced articles
export async function saveSyncedArticles(articles: CaphotelArticle[]): Promise<boolean> {
  try {
    const docRef = doc(db, 'caphotelSync', 'articles');
    await setDoc(docRef, {
      items: articles,
      count: articles.length,
      syncedAt: new Date().toISOString()
    });
    return true;
  } catch (error) {
    console.error('Error saving synced articles:', error);
    return false;
  }
}

export async function getSyncedArticles(): Promise<CaphotelArticle[]> {
  try {
    const docRef = doc(db, 'caphotelSync', 'articles');
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return docSnap.data().items as CaphotelArticle[];
    }
    return [];
  } catch (error) {
    console.error('Error getting synced articles:', error);
    return [];
  }
}

// Save synced rooms
export async function saveSyncedRooms(rooms: CaphotelRoom[]): Promise<boolean> {
  try {
    const docRef = doc(db, 'caphotelSync', 'rooms');
    await setDoc(docRef, {
      items: rooms,
      count: rooms.length,
      syncedAt: new Date().toISOString()
    });
    return true;
  } catch (error) {
    console.error('Error saving synced rooms:', error);
    return false;
  }
}

// Save synced channels
export async function saveSyncedChannels(channels: CaphotelChannel[]): Promise<boolean> {
  try {
    const docRef = doc(db, 'caphotelSync', 'channels');
    await setDoc(docRef, {
      items: channels,
      count: channels.length,
      syncedAt: new Date().toISOString()
    });
    return true;
  } catch (error) {
    console.error('Error saving synced channels:', error);
    return false;
  }
}

export async function getSyncedChannels(): Promise<CaphotelChannel[]> {
  try {
    const docRef = doc(db, 'caphotelSync', 'channels');
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return docSnap.data().items as CaphotelChannel[];
    }
    return [];
  } catch (error) {
    console.error('Error getting synced channels:', error);
    return [];
  }
}

// Save synced categories (Zimmerkategorien aus CapCorn)
export async function saveSyncedCategories(categories: CaphotelCategory[]): Promise<boolean> {
  try {
    const docRef = doc(db, 'caphotelSync', 'categories');
    await setDoc(docRef, {
      items: categories,
      count: categories.length,
      syncedAt: new Date().toISOString()
    });
    return true;
  } catch (error) {
    console.error('Error saving synced categories:', error);
    return false;
  }
}

export async function getSyncedCategories(): Promise<CaphotelCategory[]> {
  try {
    const docRef = doc(db, 'caphotelSync', 'categories');
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return docSnap.data().items as CaphotelCategory[];
    }
    return [];
  } catch (error) {
    console.error('Error getting synced categories:', error);
    return [];
  }
}

// Sync status
export async function saveSyncStatus(status: SyncStatus): Promise<boolean> {
  try {
    const docRef = doc(db, 'caphotelSync', 'status');
    await setDoc(docRef, status);
    return true;
  } catch (error) {
    console.error('Error saving sync status:', error);
    return false;
  }
}

export async function getSyncStatus(): Promise<SyncStatus | null> {
  try {
    const docRef = doc(db, 'caphotelSync', 'status');
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return docSnap.data() as SyncStatus;
    }
    return null;
  } catch (error) {
    console.error('Error getting sync status:', error);
    return null;
  }
}

// ============ ALL SETTINGS (Combined load/save) ============

export interface AllSettings {
  hotelInfo: HotelInfo | null;
  categories: Category[];
  seasons: Season[];
}

export async function loadAllSettings(): Promise<AllSettings> {
  const [hotelInfo, categories, seasons] = await Promise.all([
    getHotelInfo(),
    getCategories(),
    getSeasons()
  ]);

  return { hotelInfo, categories, seasons };
}

export async function saveAllSettings(settings: AllSettings): Promise<boolean> {
  try {
    const promises: Promise<boolean>[] = [];

    if (settings.hotelInfo) {
      promises.push(saveHotelInfo(settings.hotelInfo));
    }
    promises.push(saveCategories(settings.categories));
    promises.push(saveSeasons(settings.seasons));

    const results = await Promise.all(promises);
    return results.every(r => r);
  } catch (error) {
    console.error('Error saving all settings:', error);
    return false;
  }
}

// ============ LEAD LINKS ============

export interface LeadLinkField {
  id: string;
  type: 'name' | 'email' | 'phone' | 'address' | 'dates' | 'guests' | 'message';
  required: boolean;
  label: string;
}

export interface LeadLink {
  id: string;
  name: string;           // z.B. "Instagram Sommer 2025"
  fields: LeadLinkField[];
  createdAt: string;
  isActive: boolean;
}

export async function getLeadLinks(): Promise<LeadLink[]> {
  try {
    const docRef = doc(db, 'settings', 'leadLinks');
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return docSnap.data().items as LeadLink[];
    }
    return [];
  } catch (error) {
    console.error('Error getting lead links:', error);
    return [];
  }
}

export async function saveLeadLinks(links: LeadLink[]): Promise<boolean> {
  try {
    const docRef = doc(db, 'settings', 'leadLinks');
    await setDoc(docRef, { items: links, updatedAt: new Date().toISOString() });
    return true;
  } catch (error) {
    console.error('Error saving lead links:', error);
    return false;
  }
}

export async function addLeadLink(link: Omit<LeadLink, 'id' | 'createdAt'>): Promise<string | null> {
  try {
    const links = await getLeadLinks();
    const newLink: LeadLink = {
      ...link,
      id: Date.now().toString(36) + Math.random().toString(36).substr(2, 5),
      createdAt: new Date().toISOString()
    };
    links.push(newLink);
    await saveLeadLinks(links);
    return newLink.id;
  } catch (error) {
    console.error('Error adding lead link:', error);
    return null;
  }
}

export async function deleteLeadLink(id: string): Promise<boolean> {
  try {
    const links = await getLeadLinks();
    const filtered = links.filter(l => l.id !== id);
    return saveLeadLinks(filtered);
  } catch (error) {
    console.error('Error deleting lead link:', error);
    return false;
  }
}

export async function getLeadLinkById(id: string): Promise<LeadLink | null> {
  try {
    const links = await getLeadLinks();
    return links.find(l => l.id === id) || null;
  } catch (error) {
    console.error('Error getting lead link by id:', error);
    return null;
  }
}

// ============ LEAD SUBMISSIONS ============

export interface LeadSubmission {
  id: string;
  linkId: string;
  linkName: string;
  data: Record<string, string | number | string[]>;
  submittedAt: string;
  status: 'new' | 'contacted' | 'converted' | 'lost';
}

export async function saveLeadSubmission(submission: Omit<LeadSubmission, 'id' | 'submittedAt'>): Promise<string | null> {
  try {
    const docRef = await addDoc(collection(db, 'leadSubmissions'), {
      ...submission,
      submittedAt: new Date().toISOString()
    });
    return docRef.id;
  } catch (error) {
    console.error('Error saving lead submission:', error);
    return null;
  }
}

export async function getLeadSubmissions(): Promise<LeadSubmission[]> {
  try {
    const querySnapshot = await getDocs(collection(db, 'leadSubmissions'));
    const submissions: LeadSubmission[] = [];
    querySnapshot.forEach((doc) => {
      submissions.push({ id: doc.id, ...doc.data() } as LeadSubmission);
    });
    return submissions.sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
  } catch (error) {
    console.error('Error getting lead submissions:', error);
    return [];
  }
}

// ============ GUEST NOTIFICATION SETTINGS ============

export type NotificationChannel = 'whatsapp' | 'email' | 'sms' | 'push';

export interface EventChannelSettings {
  whatsapp: boolean;
  email: boolean;
  push: boolean;
  sms: boolean;
}

export interface GuestNotificationSettings {
  // Ereignis-Toggles
  events: {
    confirmation: EventChannelSettings;
    changes: EventChannelSettings;
    cancellation: EventChannelSettings;
    reminder: EventChannelSettings & {
      hours: number; // Stunden vorher
    };
    review: EventChannelSettings & {
      hours: number; // Stunden nachher
      url: string; // Bewertungslink
    };
  };

  // Twilio SMS Einstellungen
  twilio: {
    enabled: boolean;
    accountSid: string;
    authToken: string;
    phoneNumber: string;
    verified: boolean;
  };

  // Push Einstellungen
  push: {
    enabled: boolean; // Gäste werden gefragt
    registeredDevices: number;
  };

  // Fallback Einstellungen
  fallback: {
    enabled: boolean;
    priority: NotificationChannel[];
    rememberSuccessfulChannel: boolean;
  };

  // Nachrichtentexte
  messageTemplates: {
    confirmation: {
      whatsapp: string;
      sms: string;
    };
    changes: {
      whatsapp: string;
      sms: string;
    };
    cancellation: {
      whatsapp: string;
      sms: string;
    };
    reminder: {
      whatsapp: string;
      sms: string;
    };
    review: {
      whatsapp: string;
      sms: string;
    };
  };

  updatedAt?: string;
}

export const DEFAULT_GUEST_NOTIFICATION_SETTINGS: GuestNotificationSettings = {
  events: {
    confirmation: { whatsapp: true, email: true, push: false, sms: false },
    changes: { whatsapp: true, email: true, push: false, sms: false },
    cancellation: { whatsapp: true, email: true, push: false, sms: false },
    reminder: { whatsapp: true, email: false, push: true, sms: false, hours: 24 },
    review: { whatsapp: false, email: true, push: false, sms: false, hours: 48, url: '' },
  },
  twilio: {
    enabled: false,
    accountSid: '',
    authToken: '',
    phoneNumber: '',
    verified: false,
  },
  push: {
    enabled: false,
    registeredDevices: 0,
  },
  fallback: {
    enabled: true,
    priority: ['whatsapp', 'email', 'push', 'sms'],
    rememberSuccessfulChannel: true,
  },
  messageTemplates: {
    confirmation: {
      whatsapp: 'Hallo {guestName}! Ihre Reservierung im {hotelName} vom {checkIn} bis {checkOut} wurde bestätigt. Wir freuen uns auf Sie!',
      sms: 'Reservierung bestätigt: {hotelName} vom {checkIn}-{checkOut}. Wir freuen uns auf Sie!',
    },
    changes: {
      whatsapp: 'Hallo {guestName}! Ihre Reservierung im {hotelName} wurde geändert. Neuer Zeitraum: {checkIn} bis {checkOut}.',
      sms: 'Reservierung geändert: {hotelName} {checkIn}-{checkOut}',
    },
    cancellation: {
      whatsapp: 'Hallo {guestName}! Ihre Reservierung im {hotelName} vom {checkIn} bis {checkOut} wurde storniert. Bei Fragen kontaktieren Sie uns gerne.',
      sms: 'Reservierung storniert: {hotelName} {checkIn}-{checkOut}',
    },
    reminder: {
      whatsapp: 'Hallo {guestName}! Wir freuen uns, Sie morgen im {hotelName} begrüßen zu dürfen. Check-in ist ab 15:00 Uhr möglich.',
      sms: 'Erinnerung: Check-in morgen im {hotelName} ab 15:00 Uhr',
    },
    review: {
      whatsapp: 'Hallo {guestName}! Vielen Dank für Ihren Aufenthalt im {hotelName}. Wir würden uns über Ihre Bewertung freuen: {reviewUrl}',
      sms: 'Danke für Ihren Aufenthalt im {hotelName}! Bewertung: {reviewUrl}',
    },
  },
};

export async function getGuestNotificationSettings(): Promise<GuestNotificationSettings> {
  try {
    const docRef = doc(db, 'settings', 'guestNotifications');
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return { ...DEFAULT_GUEST_NOTIFICATION_SETTINGS, ...docSnap.data() } as GuestNotificationSettings;
    }
    return DEFAULT_GUEST_NOTIFICATION_SETTINGS;
  } catch (error) {
    console.error('Error getting guest notification settings:', error);
    return DEFAULT_GUEST_NOTIFICATION_SETTINGS;
  }
}

export async function saveGuestNotificationSettings(settings: GuestNotificationSettings): Promise<boolean> {
  try {
    const docRef = doc(db, 'settings', 'guestNotifications');
    await setDoc(docRef, { ...settings, updatedAt: new Date().toISOString() });
    return true;
  } catch (error) {
    console.error('Error saving guest notification settings:', error);
    return false;
  }
}
