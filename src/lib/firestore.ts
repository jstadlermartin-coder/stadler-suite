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
  Timestamp
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
  try {
    const docRef = doc(db, 'settings', 'categories');
    await setDoc(docRef, { items: categories, updatedAt: new Date().toISOString() });
    return true;
  } catch (error) {
    console.error('Error saving categories:', error);
    return false;
  }
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

export async function saveBuildings(buildings: Building[]): Promise<boolean> {
  try {
    const docRef = doc(db, 'settings', 'buildings');
    await setDoc(docRef, { items: buildings, updatedAt: new Date().toISOString() });
    return true;
  } catch (error) {
    console.error('Error saving buildings:', error);
    return false;
  }
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
  try {
    const docRef = doc(db, 'settings', 'seasons');
    await setDoc(docRef, { items: seasons, updatedAt: new Date().toISOString() });
    return true;
  } catch (error) {
    console.error('Error saving seasons:', error);
    return false;
  }
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
  resn: number;              // Reservierungsnummer
  gast: number;              // Gast-ID
  stat: number;              // Status
  andf: string;              // Anreise
  ande: string;              // Abreise
  chid: number;              // Channel ID
  guestName?: string;        // Gastname (joined)
  guestEmail?: string;       // E-Mail
  channelName?: string;      // Channel Name
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
}

export interface CaphotelGuest {
  gast: number;
  vorn: string;              // Vorname
  nacn: string;              // Nachname
  mail?: string;
  teln?: string;
  stra?: string;             // Strasse
  polz?: string;             // PLZ
  ortb?: string;             // Ort
  land?: string;
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
