'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import {
  loadAllSettings,
  saveHotelInfo,
  saveCategories,
  saveSeasons,
  getBridgeMappings,
  saveBridgeConfig,
  saveRoomMappings,
  saveArticleMappings,
  saveSyncedBookings,
  saveSyncedGuests,
  saveSyncedArticles,
  saveSyncedRooms,
  saveSyncedChannels,
  saveSyncStatus,
  getSyncStatus,
  HotelInfo as FirestoreHotelInfo,
  Category as FirestoreCategory,
  Season as FirestoreSeason,
  BridgeConfig,
  RoomMapping,
  ArticleMapping,
  SyncStatus,
  CaphotelBooking,
  CaphotelGuest,
  CaphotelArticle,
  CaphotelRoom,
  CaphotelChannel
} from '@/lib/firestore';
import { storage } from '@/lib/firebase';
import { ref, getDownloadURL } from 'firebase/storage';
import {
  LogOut,
  Plus,
  X,
  ChevronRight,
  ChevronLeft,
  Building2,
  Bed,
  Euro,
  Trash2,
  Pencil,
  Image,
  Video,
  Box,
  Plug,
  CheckCircle2,
  Circle,
  Download,
  Play,
  RefreshCw,
  Loader2,
  Link2,
  Unlink,
  Package,
  ArrowRight,
  Check,
  AlertCircle,
  Globe,
  Cloud,
  CloudOff,
  Clock,
  Database,
  Bot,
  Sparkles,
  Key,
  MessageSquare,
  Zap,
  Settings2,
  ToggleLeft,
  ToggleRight,
  FileUp,
  FileText,
  HardDrive,
  Phone,
  Mail,
  Home,
  User
} from 'lucide-react';

// Types
interface Category {
  id: string;
  name: string;
  description: string;
  rooms: Room[];
}

// Room Feature Types
type FeatureCategory = 'comfort' | 'bathroom' | 'technology' | 'outdoor' | 'floor' | 'other';

interface RoomFeature {
  id: string;
  name: string;
  category: FeatureCategory;
  icon?: string;
}

// Available room features
const AVAILABLE_FEATURES: RoomFeature[] = [
  // Comfort
  { id: 'hairdryer', name: 'Föhn', category: 'comfort' },
  { id: 'safe', name: 'Tresor', category: 'comfort' },
  { id: 'bathrobe', name: 'Bademantel', category: 'comfort' },
  { id: 'slippers', name: 'Hausschuhe', category: 'comfort' },
  { id: 'minibar', name: 'Minibar', category: 'comfort' },
  { id: 'coffeemaker', name: 'Kaffeemaschine', category: 'comfort' },
  { id: 'kettle', name: 'Wasserkocher', category: 'comfort' },
  { id: 'iron', name: 'Bügeleisen', category: 'comfort' },
  // Bathroom
  { id: 'shower', name: 'Dusche', category: 'bathroom' },
  { id: 'bathtub', name: 'Badewanne', category: 'bathroom' },
  { id: 'bidet', name: 'Bidet', category: 'bathroom' },
  { id: 'toiletries', name: 'Pflegeprodukte', category: 'bathroom' },
  // Technology
  { id: 'tv', name: 'TV', category: 'technology' },
  { id: 'satellite', name: 'Sat-TV', category: 'technology' },
  { id: 'wifi', name: 'WLAN', category: 'technology' },
  { id: 'phone', name: 'Telefon', category: 'technology' },
  { id: 'usb', name: 'USB-Ladestationen', category: 'technology' },
  // Outdoor
  { id: 'balcony', name: 'Balkon', category: 'outdoor' },
  { id: 'terrace', name: 'Terrasse', category: 'outdoor' },
  { id: 'garden', name: 'Gartenblick', category: 'outdoor' },
  { id: 'lakeview', name: 'Seeblick', category: 'outdoor' },
  { id: 'mountainview', name: 'Bergblick', category: 'outdoor' },
  // Floor
  { id: 'wood', name: 'Holzboden', category: 'floor' },
  { id: 'carpet', name: 'Teppich', category: 'floor' },
  { id: 'tiles', name: 'Fliesen', category: 'floor' },
  { id: 'parquet', name: 'Parkett', category: 'floor' },
  // Other
  { id: 'ac', name: 'Klimaanlage', category: 'other' },
  { id: 'heating', name: 'Heizung', category: 'other' },
  { id: 'soundproof', name: 'Schallschutz', category: 'other' },
  { id: 'blackout', name: 'Verdunkelung', category: 'other' },
];

const FEATURE_CATEGORIES: { id: FeatureCategory; name: string }[] = [
  { id: 'comfort', name: 'Komfort' },
  { id: 'bathroom', name: 'Badezimmer' },
  { id: 'technology', name: 'Technik' },
  { id: 'outdoor', name: 'Außenbereich' },
  { id: 'floor', name: 'Boden' },
  { id: 'other', name: 'Sonstiges' },
];

interface Building {
  id: string;
  name: string;
  description?: string;
}

interface Room {
  id: string;
  number: string;
  name: string;
  buildingId?: string; // Welches Gebäude/Haus
  occupancies: Occupancy[];
  description?: string;
  photos?: string[];
  videos?: string[];
  tours3d?: string[];
  features?: string[]; // Array of feature IDs
  customFeatures?: { id: string; name: string; category: FeatureCategory }[]; // Custom features per room
}

interface Occupancy {
  id: string;
  adults: number;
  children: number;
  infants: number;
  label: string;
}

interface Season {
  id: string;
  categoryId: string; // Welche Zimmerkategorie
  name: string;
  startDate: string;
  endDate: string;
  rates: Rate[];
}

interface AgePriceTier {
  id: string;
  ageFrom: number;
  ageTo: number;
  percentage: number; // Prozent vom Erwachsenenpreis
}

interface Rate {
  id: string;
  name: string;
  minNights: number;
  maxNights: number | null;
  pricePerAdult: number;
  childPrices: AgePriceTier[];
  infantPrices: AgePriceTier[];
}

interface HotelInfo {
  name: string;
  contactPerson: string;
  street: string;
  city: string;
  postalCode: string;
  country: string;
  email: string;
  phone: string;
}

// AI Agent Types
type AIProvider = 'openai' | 'anthropic' | 'google';

interface AIAgentConfig {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  provider: AIProvider;
  apiKey: string;
  model: string;
  systemPrompt: string;
}

const AI_PROVIDERS = [
  { id: 'openai' as const, name: 'OpenAI (GPT)', models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo'] },
  { id: 'anthropic' as const, name: 'Anthropic (Claude)', models: ['claude-opus-4-5-20251101', 'claude-sonnet-4-20250514', 'claude-3-5-haiku-20241022'] },
  { id: 'google' as const, name: 'Google (Gemini)', models: ['gemini-2.0-flash', 'gemini-1.5-pro'] }
];

// Knowledge Base Document for AI
interface KnowledgeDocument {
  id: string;
  name: string;
  type: 'pdf' | 'text' | 'url';
  size: number; // in bytes
  uploadedAt: string;
  storageUrl?: string;
  content?: string; // For text content or extracted PDF text
}

// Article Types
type ArticlePriceUnit = 'pro_nacht' | 'pro_aufenthalt' | 'pro_stueck' | 'pro_person_nacht';

interface ArticleAgePricing {
  id: string;
  ageFrom: number;
  ageTo: number;
  price: number;
}

interface ArticleSeasonPrice {
  seasonId: string;
  basePrice: number;
  agePrices?: ArticleAgePricing[];
}

interface Article {
  id: string;
  name: string;
  description?: string;
  photos?: string[];
  basePrice: number;
  priceUnit: ArticlePriceUnit;
  hasSeasonalPricing: boolean;
  seasonPrices?: ArticleSeasonPrice[];
  hasAgePricing: boolean;
  agePrices?: ArticleAgePricing[];
  isOrtstaxe: boolean; // Auto-add to bookings for persons over 14
  ortstaxeMinAge?: number; // Minimum age for Ortstaxe (default 14)
  active: boolean;
}

const PRICE_UNITS: { id: ArticlePriceUnit; label: string }[] = [
  { id: 'pro_nacht', label: 'Pro Nacht' },
  { id: 'pro_aufenthalt', label: 'Pro Aufenthalt' },
  { id: 'pro_stueck', label: 'Pro Stück' },
  { id: 'pro_person_nacht', label: 'Pro Person/Nacht' },
];

export default function SettingsPage() {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<'basic' | 'resource' | 'communication' | 'bridge' | 'ai'>('basic');
  const [resourceSubTab, setResourceSubTab] = useState<'lage' | 'kategorie' | 'artikel'>('lage');
  const [communicationSubTab, setCommunicationSubTab] = useState<'whatsapp' | 'email' | 'email-template' | 'email-import' | 'public-pages'>('whatsapp');
  const [bridgeStatus, setBridgeStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');

  // WhatsApp State & API Config
  const WHATSAPP_API_URL = 'http://146.148.3.123:3001';
  const WHATSAPP_API_KEY = 'tt_live_a8f3k2m9x7p4q1w6';
  const WHATSAPP_SESSION_ID = 'stadler-suite';
  const [whatsappStatus, setWhatsappStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');
  const [whatsappQrCode, setWhatsappQrCode] = useState<string | null>(null);
  const [whatsappLoading, setWhatsappLoading] = useState(false);
  const [whatsappPhone, setWhatsappPhone] = useState<string | null>(null);
  const [bridgeDownloading, setBridgeDownloading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');

  // Hotel Info State
  const [hotelInfo, setHotelInfo] = useState<HotelInfo>({
    name: 'Hotel Stadler am Attersee',
    contactPerson: '',
    street: '',
    city: 'Attersee',
    postalCode: '',
    country: 'Österreich',
    email: 'info@seegasthof-stadler.at',
    phone: ''
  });

  // AI Agent State
  const [aiAgents, setAiAgents] = useState<AIAgentConfig[]>([
    {
      id: 'inquiry-agent',
      name: 'Anfrage-Agent',
      description: 'Beantwortet automatisch Anfragen und erstellt passende Angebote basierend auf Zimmerverfügbarkeit und Gastpräferenzen.',
      enabled: false,
      provider: 'anthropic',
      apiKey: '',
      model: 'claude-sonnet-4-20250514',
      systemPrompt: `Du bist der freundliche und professionelle KI-Assistent des Hotel Stadler am Attersee.

Deine Aufgaben:
1. Analysiere eingehende Anfragen (Zeitraum, Gästeanzahl, besondere Wünsche)
2. Prüfe die Zimmerverfügbarkeit für den angefragten Zeitraum
3. Wähle das passende Zimmer basierend auf:
   - Anzahl der Gäste (Erwachsene, Kinder)
   - Besondere Wünsche (Seeblick, Balkon, etc.)
   - Ausstattung des Zimmers
4. Erstelle ein freundliches, persönliches Angebot

Ton: Herzlich, professionell, österreichisch-familiär. Verwende "Sie" als Anrede.
Unterschrift: Hotel Stadler am Attersee - Familie Stadler`
    }
  ]);
  const [editingAgent, setEditingAgent] = useState<AIAgentConfig | null>(null);
  const [showApiKey, setShowApiKey] = useState(false);
  const [knowledgeDocs, setKnowledgeDocs] = useState<KnowledgeDocument[]>([]);
  const [uploadingDoc, setUploadingDoc] = useState(false);

  // Categories State
  const [categories, setCategories] = useState<Category[]>([]);

  // Buildings State
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [buildingDrawerOpen, setBuildingDrawerOpen] = useState(false);
  const [editingBuilding, setEditingBuilding] = useState<Building | null>(null);
  const [newBuilding, setNewBuilding] = useState({ name: '', description: '' });

  // Seasons State
  const [seasons, setSeasons] = useState<Season[]>([]);

  // Bridge State
  const [bridgeConfig, setBridgeConfig] = useState<BridgeConfig>({
    bridgeUrl: 'http://localhost:5000',
    autoSync: false
  });
  const [roomMappings, setRoomMappings] = useState<RoomMapping[]>([]);
  const [articleMappings, setArticleMappings] = useState<ArticleMapping[]>([]);

  // CapHotel data loaded from Bridge
  const [caphotelRooms, setCaphotelRooms] = useState<{ zimm: number; beze: string; catg: number }[]>([]);
  const [caphotelArticles, setCaphotelArticles] = useState<{ artn: number; beze: string; prei: number }[]>([]);
  const [bridgeLoading, setBridgeLoading] = useState(false);

  // Bridge sub-tab
  const [bridgeSubTab, setBridgeSubTab] = useState<'setup' | 'rooms' | 'articles' | 'sync'>('setup');

  // Sync State
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    lastSync: null,
    lastSyncSuccess: false,
    syncInProgress: false,
    bookingsCount: 0,
    guestsCount: 0,
    autoSyncEnabled: false,
    autoSyncInterval: 15
  });
  const [syncError, setSyncError] = useState<string | null>(null);

  // Articles State
  const [articles, setArticles] = useState<Article[]>([]);
  const [articleDrawerOpen, setArticleDrawerOpen] = useState(false);
  const [editingArticle, setEditingArticle] = useState<Article | null>(null);
  const [newArticle, setNewArticle] = useState<Partial<Article>>({
    name: '',
    description: '',
    basePrice: 0,
    priceUnit: 'pro_nacht',
    hasSeasonalPricing: false,
    seasonPrices: [],
    hasAgePricing: false,
    agePrices: [],
    isOrtstaxe: false,
    ortstaxeMinAge: 14,
    active: true
  });
  const [deleteArticleConfirm, setDeleteArticleConfirm] = useState<{ id: string; name: string } | null>(null);

  // Load data from Firestore on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const [settings, bridgeMappings, savedSyncStatus] = await Promise.all([
          loadAllSettings(),
          getBridgeMappings(),
          getSyncStatus()
        ]);

        if (settings.hotelInfo) {
          setHotelInfo({
            ...hotelInfo,
            ...settings.hotelInfo
          });
        }

        if (settings.categories && settings.categories.length > 0) {
          setCategories(settings.categories as Category[]);
        }

        if (settings.seasons && settings.seasons.length > 0) {
          setSeasons(settings.seasons as Season[]);
        }

        // Load bridge mappings
        if (bridgeMappings) {
          setBridgeConfig(bridgeMappings.config);
          setRoomMappings(bridgeMappings.rooms || []);
          setArticleMappings(bridgeMappings.articles || []);
        }

        // Load sync status
        if (savedSyncStatus) {
          setSyncStatus(savedSyncStatus);
        }
      } catch (error) {
        console.error('Error loading settings:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // Auto-save hotel info when changed
  const handleHotelInfoChange = async (field: keyof HotelInfo, value: string) => {
    const newInfo = { ...hotelInfo, [field]: value };
    setHotelInfo(newInfo);

    // Debounced save
    setSaving(true);
    try {
      await saveHotelInfo(newInfo);
      setSaveStatus('success');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch {
      setSaveStatus('error');
    } finally {
      setSaving(false);
    }
  };

  // Save categories to Firestore
  const saveCategoriesData = async (newCategories: Category[]) => {
    setCategories(newCategories);
    try {
      await saveCategories(newCategories as FirestoreCategory[]);
    } catch (error) {
      console.error('Error saving categories:', error);
    }
  };

  // Save seasons to Firestore
  const saveSeasonsData = async (newSeasons: Season[]) => {
    setSeasons(newSeasons);
    try {
      await saveSeasons(newSeasons as FirestoreSeason[]);
    } catch (error) {
      console.error('Error saving seasons:', error);
    }
  };

  // Drawer States
  const [categoryDrawerOpen, setCategoryDrawerOpen] = useState(false);
  const [roomDrawerOpen, setRoomDrawerOpen] = useState(false);
  const [priceDrawerOpen, setPriceDrawerOpen] = useState(false);
  const [seasonDrawerOpen, setSeasonDrawerOpen] = useState(false);
  const [rateDrawerOpen, setRateDrawerOpen] = useState(false);
  const [rateDrawerSeasonId, setRateDrawerSeasonId] = useState<string | null>(null);
  const [pricingFullscreenOpen, setPricingFullscreenOpen] = useState(false);
  const [selectedPricingCategory, setSelectedPricingCategory] = useState<string | null>(null);

  // Edit States
  const [editingRoom, setEditingRoom] = useState<{ categoryId: string; room: Room | null }>({ categoryId: '', room: null });

  // Form States
  const [newCategory, setNewCategory] = useState({ name: '', description: '' });
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [newRoom, setNewRoom] = useState<Partial<Room>>({ number: '', name: '', occupancies: [], description: '', customFeatures: [] });
  const [roomDrawerPage, setRoomDrawerPage] = useState<1 | 2 | 3 | 4>(1);
  const [addingCustomFeature, setAddingCustomFeature] = useState<FeatureCategory | null>(null);
  const [customFeatureName, setCustomFeatureName] = useState('');
  const [newSeason, setNewSeason] = useState({ name: '', startDate: '', endDate: '', categoryId: '' });
  const [editingSeason, setEditingSeason] = useState<Season | null>(null);
  const [selectedPriceCategory, setSelectedPriceCategory] = useState<string | null>(null);
  const [newOccupancy, setNewOccupancy] = useState({ adults: '2', children: '', infants: '' });
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [selectingDate, setSelectingDate] = useState<'start' | 'end'>('start');
  const [newRate, setNewRate] = useState({
    name: '',
    minNights: 1,
    maxNights: '' as string | number,
    pricePerAdult: '',
    childPrices: [] as { id: string; ageFrom: number; ageTo: number; percentage: string }[],
    infantPrices: [] as { id: string; ageFrom: number; ageTo: number; percentage: string }[]
  });
  const [editingRate, setEditingRate] = useState<{ seasonId: string; rate: Rate } | null>(null);
  const [deleteRateConfirm, setDeleteRateConfirm] = useState<{ seasonId: string; rateId: string; rateName: string } | null>(null);

  const handleLogout = async () => {
    await logout();
  };

  // Bridge Download
  const handleBridgeDownload = async () => {
    setBridgeDownloading(true);
    try {
      const bridgeRef = ref(storage, 'downloads/CapCornBridge-Setup.exe');
      const url = await getDownloadURL(bridgeRef);

      // Open download in new tab
      const link = document.createElement('a');
      link.href = url;
      link.download = 'CapCornBridge-Setup.exe';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error: unknown) {
      console.error('Error downloading bridge:', error);
      // If file doesn't exist yet, show info
      if (error && typeof error === 'object' && 'code' in error && error.code === 'storage/object-not-found') {
        alert('Die Bridge-Datei ist noch nicht verfügbar. Bitte wenden Sie sich an den Support.');
      } else {
        alert('Fehler beim Herunterladen. Bitte versuchen Sie es später erneut.');
      }
    } finally {
      setBridgeDownloading(false);
    }
  };

  // Bridge Functions
  const testBridgeConnection = async () => {
    setBridgeStatus('connecting');
    try {
      const response = await fetch(`${bridgeConfig.bridgeUrl}/health`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      if (response.ok) {
        setBridgeStatus('connected');
        // Save last connected time
        const updatedConfig = { ...bridgeConfig, lastConnected: new Date().toISOString() };
        setBridgeConfig(updatedConfig);
        await saveBridgeConfig(updatedConfig);
      } else {
        setBridgeStatus('disconnected');
      }
    } catch (error) {
      console.error('Bridge connection error:', error);
      setBridgeStatus('disconnected');
    }
  };

  const loadCaphotelData = async () => {
    setBridgeLoading(true);
    try {
      // Load rooms and articles from CapHotel via Bridge
      const [roomsRes, articlesRes] = await Promise.all([
        fetch(`${bridgeConfig.bridgeUrl}/rooms`),
        fetch(`${bridgeConfig.bridgeUrl}/articles`)
      ]);

      if (roomsRes.ok) {
        const roomsData = await roomsRes.json();
        setCaphotelRooms(roomsData.rooms || []);
      }

      if (articlesRes.ok) {
        const articlesData = await articlesRes.json();
        setCaphotelArticles(articlesData.articles || []);
      }

      setBridgeStatus('connected');
    } catch (error) {
      console.error('Error loading CapHotel data:', error);
      setBridgeStatus('disconnected');
    } finally {
      setBridgeLoading(false);
    }
  };

  const handleSaveBridgeConfig = async () => {
    setSaving(true);
    try {
      await saveBridgeConfig(bridgeConfig);
      setSaveStatus('success');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch {
      setSaveStatus('error');
    } finally {
      setSaving(false);
    }
  };

  const handleRoomMapping = async (appRoomId: string, appRoomName: string, caphotelZimm: number, caphotelName: string) => {
    // Check if mapping already exists
    const existingIndex = roomMappings.findIndex(m => m.appRoomId === appRoomId);

    let newMappings: RoomMapping[];
    if (existingIndex >= 0) {
      // Update existing
      newMappings = [...roomMappings];
      newMappings[existingIndex] = { appRoomId, appRoomName, caphotelZimm, caphotelName };
    } else {
      // Add new
      newMappings = [...roomMappings, { appRoomId, appRoomName, caphotelZimm, caphotelName }];
    }

    setRoomMappings(newMappings);
    await saveRoomMappings(newMappings);
  };

  const handleRemoveRoomMapping = async (appRoomId: string) => {
    const newMappings = roomMappings.filter(m => m.appRoomId !== appRoomId);
    setRoomMappings(newMappings);
    await saveRoomMappings(newMappings);
  };

  const handleArticleMapping = async (appArticleId: string, appArticleName: string, caphotelArtn: number, caphotelName: string, price: number) => {
    const existingIndex = articleMappings.findIndex(m => m.appArticleId === appArticleId);

    let newMappings: ArticleMapping[];
    if (existingIndex >= 0) {
      newMappings = [...articleMappings];
      newMappings[existingIndex] = { appArticleId, appArticleName, caphotelArtn, caphotelName, price };
    } else {
      newMappings = [...articleMappings, { appArticleId, appArticleName, caphotelArtn, caphotelName, price }];
    }

    setArticleMappings(newMappings);
    await saveArticleMappings(newMappings);
  };

  const handleRemoveArticleMapping = async (appArticleId: string) => {
    const newMappings = articleMappings.filter(m => m.appArticleId !== appArticleId);
    setArticleMappings(newMappings);
    await saveArticleMappings(newMappings);
  };

  // Perform full sync from CapHotel to Firebase
  const performSync = async () => {
    if (syncStatus.syncInProgress) return;

    setSyncError(null);
    setSyncStatus(prev => ({ ...prev, syncInProgress: true }));

    try {
      // Fetch all data from Bridge API
      const [bookingsRes, guestsRes, articlesRes, roomsRes, channelsRes] = await Promise.all([
        fetch(`${bridgeConfig.bridgeUrl}/bookings`).catch(() => null),
        fetch(`${bridgeConfig.bridgeUrl}/guests`).catch(() => null),
        fetch(`${bridgeConfig.bridgeUrl}/articles`).catch(() => null),
        fetch(`${bridgeConfig.bridgeUrl}/rooms`).catch(() => null),
        fetch(`${bridgeConfig.bridgeUrl}/channels`).catch(() => null)
      ]);

      const now = new Date().toISOString();
      let bookingsCount = 0;
      let guestsCount = 0;

      // Save bookings
      if (bookingsRes?.ok) {
        const data = await bookingsRes.json();
        const bookings: CaphotelBooking[] = (data.bookings || []).map((b: Record<string, unknown>) => ({
          ...b,
          syncedAt: now
        }));
        await saveSyncedBookings(bookings);
        bookingsCount = bookings.length;
      }

      // Save guests
      if (guestsRes?.ok) {
        const data = await guestsRes.json();
        const guests: CaphotelGuest[] = (data.guests || []).map((g: Record<string, unknown>) => ({
          ...g,
          syncedAt: now
        }));
        await saveSyncedGuests(guests);
        guestsCount = guests.length;
      }

      // Save articles
      if (articlesRes?.ok) {
        const data = await articlesRes.json();
        const articles: CaphotelArticle[] = (data.articles || []).map((a: Record<string, unknown>) => ({
          ...a,
          syncedAt: now
        }));
        await saveSyncedArticles(articles);
      }

      // Save rooms
      if (roomsRes?.ok) {
        const data = await roomsRes.json();
        const rooms: CaphotelRoom[] = (data.rooms || []).map((r: Record<string, unknown>) => ({
          ...r,
          syncedAt: now
        }));
        await saveSyncedRooms(rooms);
      }

      // Save channels
      if (channelsRes?.ok) {
        const data = await channelsRes.json();
        const channels: CaphotelChannel[] = (data.channels || []).map((c: Record<string, unknown>) => ({
          ...c,
          syncedAt: now
        }));
        await saveSyncedChannels(channels);
      }

      // Update sync status
      const newStatus: SyncStatus = {
        lastSync: now,
        lastSyncSuccess: true,
        syncInProgress: false,
        bookingsCount,
        guestsCount,
        autoSyncEnabled: syncStatus.autoSyncEnabled,
        autoSyncInterval: syncStatus.autoSyncInterval
      };
      setSyncStatus(newStatus);
      await saveSyncStatus(newStatus);
      setBridgeStatus('connected');

    } catch (error) {
      console.error('Sync error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Verbindung fehlgeschlagen';
      setSyncError(errorMessage);
      const newStatus: SyncStatus = {
        ...syncStatus,
        lastSyncSuccess: false,
        syncInProgress: false,
        error: errorMessage
      };
      setSyncStatus(newStatus);
      await saveSyncStatus(newStatus);
      setBridgeStatus('disconnected');
    }
  };

  // Toggle auto-sync
  const toggleAutoSync = async () => {
    const newStatus: SyncStatus = {
      ...syncStatus,
      autoSyncEnabled: !syncStatus.autoSyncEnabled
    };
    setSyncStatus(newStatus);
    await saveSyncStatus(newStatus);
  };

  // Update auto-sync interval
  const updateSyncInterval = async (minutes: number) => {
    const newStatus: SyncStatus = {
      ...syncStatus,
      autoSyncInterval: minutes
    };
    setSyncStatus(newStatus);
    await saveSyncStatus(newStatus);
  };

  // Auto-sync effect
  useEffect(() => {
    if (!syncStatus.autoSyncEnabled || bridgeStatus !== 'connected') return;

    const interval = setInterval(() => {
      performSync();
    }, syncStatus.autoSyncInterval * 60 * 1000); // Convert minutes to ms

    return () => clearInterval(interval);
  }, [syncStatus.autoSyncEnabled, syncStatus.autoSyncInterval, bridgeStatus, bridgeConfig.bridgeUrl]);

  // WhatsApp status check - auto-load when Communication tab is active
  useEffect(() => {
    if (activeTab !== 'communication' || communicationSubTab !== 'whatsapp') return;

    // Initial check
    checkWhatsAppStatusAuto();

    // Poll every 5 seconds while connecting (waiting for QR scan)
    const interval = setInterval(() => {
      if (whatsappStatus === 'connecting' || whatsappStatus === 'disconnected') {
        checkWhatsAppStatusAuto();
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [activeTab, communicationSubTab]);

  const checkWhatsAppStatusAuto = async () => {
    try {
      // Check if our session exists
      const statusResponse = await fetch(`${WHATSAPP_API_URL}/status`, {
        headers: { 'X-API-Key': WHATSAPP_API_KEY }
      });
      const statusData = await statusResponse.json();

      // Find our session by appId (since session ID has suffix)
      const ourSession = statusData.sessions?.find((s: { appId: string }) => s.appId === WHATSAPP_SESSION_ID);

      if (ourSession) {
        if (ourSession.status === 'connected') {
          setWhatsappStatus('connected');
          setWhatsappQrCode(null);
          setWhatsappPhone(ourSession.phoneNumber || null);
          return;
        } else if (ourSession.hasQr) {
          // Get QR code for existing session - use full session ID
          const qrResponse = await fetch(`${WHATSAPP_API_URL}/sessions/${ourSession.id}/qr`, {
            headers: { 'X-API-Key': WHATSAPP_API_KEY }
          });
          const qrData = await qrResponse.json();
          if (qrData.qrCode) {
            setWhatsappStatus('connecting');
            setWhatsappQrCode(qrData.qrCode);
            return;
          }
        }
      }

      // Session doesn't exist - create new session
      const createResponse = await fetch(`${WHATSAPP_API_URL}/sessions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': WHATSAPP_API_KEY
        },
        body: JSON.stringify({
          sessionId: WHATSAPP_SESSION_ID,
          appId: WHATSAPP_SESSION_ID
        })
      });
      const createData = await createResponse.json();

      if (createData.success && createData.sessionId) {
        // Session created, wait a bit then get QR code
        setWhatsappStatus('connecting');
        setTimeout(async () => {
          try {
            const qrResponse = await fetch(`${WHATSAPP_API_URL}/sessions/${createData.sessionId}/qr`, {
              headers: { 'X-API-Key': WHATSAPP_API_KEY }
            });
            const qrData = await qrResponse.json();
            if (qrData.qrCode) {
              setWhatsappQrCode(qrData.qrCode);
            }
          } catch (err) {
            console.error('Error getting QR code:', err);
          }
        }, 2000);
      } else if (createData.status === 'connected') {
        setWhatsappStatus('connected');
        setWhatsappQrCode(null);
      } else {
        setWhatsappStatus('disconnected');
        setWhatsappQrCode(null);
      }
    } catch (error) {
      console.error('WhatsApp status check failed:', error);
      setWhatsappStatus('disconnected');
    }
  };

  // Get all rooms from categories for mapping
  const getAllAppRooms = () => {
    const rooms: { id: string; name: string; categoryName: string }[] = [];
    categories.forEach(cat => {
      cat.rooms?.forEach(room => {
        rooms.push({
          id: room.id,
          name: room.number || room.name,
          categoryName: cat.name
        });
      });
    });
    return rooms;
  };

  // Category Functions
  const openCategoryDrawer = (category?: Category) => {
    if (category) {
      setEditingCategory(category);
      setNewCategory({ name: category.name, description: category.description });
    } else {
      setEditingCategory(null);
      setNewCategory({ name: '', description: '' });
    }
    setCategoryDrawerOpen(true);
  };

  const handleSaveCategory = () => {
    if (!newCategory.name.trim()) return;

    let newCategories: Category[];
    if (editingCategory) {
      // Update existing
      newCategories = categories.map(c =>
        c.id === editingCategory.id
          ? { ...c, name: newCategory.name, description: newCategory.description }
          : c
      );
    } else {
      // Create new
      const category: Category = {
        id: Date.now().toString(),
        name: newCategory.name,
        description: newCategory.description,
        rooms: []
      };
      newCategories = [...categories, category];
    }

    saveCategoriesData(newCategories);
    setNewCategory({ name: '', description: '' });
    setEditingCategory(null);
    setCategoryDrawerOpen(false);
  };

  const handleDeleteCategory = (id: string) => {
    const newCategories = categories.filter(c => c.id !== id);
    saveCategoriesData(newCategories);
  };

  // Room Functions
  const openRoomDrawer = (categoryId: string, room?: Room) => {
    setEditingRoom({ categoryId, room: room || null });
    if (room) {
      setNewRoom({ ...room, features: room.features || [], customFeatures: room.customFeatures || [] });
    } else {
      setNewRoom({ number: '', name: '', occupancies: [], description: '', features: [], customFeatures: [] });
    }
    setRoomDrawerPage(1);
    setRoomDrawerOpen(true);
  };

  // Add custom feature
  const handleAddCustomFeature = () => {
    if (!customFeatureName.trim() || !addingCustomFeature) return;
    const newFeature = {
      id: `custom-${Date.now()}`,
      name: customFeatureName.trim(),
      category: addingCustomFeature
    };
    setNewRoom({
      ...newRoom,
      customFeatures: [...(newRoom.customFeatures || []), newFeature]
    });
    setCustomFeatureName('');
    setAddingCustomFeature(null);
  };

  // Remove custom feature
  const handleRemoveCustomFeature = (featureId: string) => {
    setNewRoom({
      ...newRoom,
      customFeatures: (newRoom.customFeatures || []).filter(f => f.id !== featureId)
    });
  };

  const handleAddOccupancy = () => {
    const adults = parseInt(newOccupancy.adults) || 1;
    const children = parseInt(newOccupancy.children) || 0;
    const infants = parseInt(newOccupancy.infants) || 0;

    const label = `${adults} Erw.${children > 0 ? ` + ${children} Kind${children > 1 ? 'er' : ''}` : ''}${infants > 0 ? ` + ${infants} Baby${infants > 1 ? 's' : ''}` : ''}`;

    const occupancy: Occupancy = {
      id: Date.now().toString(),
      adults,
      children,
      infants,
      label
    };

    setNewRoom({
      ...newRoom,
      occupancies: [...(newRoom.occupancies || []), occupancy]
    });
    setNewOccupancy({ adults: '2', children: '', infants: '' });
  };

  const handleRemoveOccupancy = (id: string) => {
    setNewRoom({
      ...newRoom,
      occupancies: (newRoom.occupancies || []).filter(o => o.id !== id)
    });
  };

  const handleSaveRoom = () => {
    if (!newRoom.number?.trim() || !newRoom.name?.trim()) return;

    const room: Room = {
      id: editingRoom.room?.id || Date.now().toString(),
      number: newRoom.number || '',
      name: newRoom.name || '',
      occupancies: newRoom.occupancies || [],
      description: newRoom.description,
      photos: newRoom.photos || [],
      videos: newRoom.videos || [],
      tours3d: newRoom.tours3d || []
    };

    const newCategories = categories.map(c => {
      if (c.id === editingRoom.categoryId) {
        if (editingRoom.room) {
          return { ...c, rooms: c.rooms.map(r => r.id === room.id ? room : r) };
        } else {
          return { ...c, rooms: [...c.rooms, room] };
        }
      }
      return c;
    });

    saveCategoriesData(newCategories);
    setRoomDrawerOpen(false);
    setNewRoom({ number: '', name: '', occupancies: [], description: '' });
  };

  // Season Functions
  const openSeasonDrawer = (categoryId: string, season?: Season) => {
    if (season) {
      setEditingSeason(season);
      setNewSeason({ name: season.name, startDate: season.startDate, endDate: season.endDate, categoryId: season.categoryId });
    } else {
      setEditingSeason(null);
      setNewSeason({ name: '', startDate: '', endDate: '', categoryId });
    }
    setSelectingDate('start');
    setSeasonDrawerOpen(true);
  };

  const handleSaveSeason = () => {
    if (!newSeason.name.trim() || !newSeason.startDate || !newSeason.endDate || !newSeason.categoryId) return;

    let newSeasons: Season[];
    if (editingSeason) {
      // Update existing
      newSeasons = seasons.map(s =>
        s.id === editingSeason.id
          ? { ...s, name: newSeason.name, startDate: newSeason.startDate, endDate: newSeason.endDate, categoryId: newSeason.categoryId }
          : s
      );
    } else {
      // Create new
      const season: Season = {
        id: Date.now().toString(),
        categoryId: newSeason.categoryId,
        name: newSeason.name,
        startDate: newSeason.startDate,
        endDate: newSeason.endDate,
        rates: []
      };
      newSeasons = [...seasons, season];
    }

    saveSeasonsData(newSeasons);
    setNewSeason({ name: '', startDate: '', endDate: '', categoryId: '' });
    setEditingSeason(null);
    setSeasonDrawerOpen(false);
  };

  const handleDeleteSeason = (id: string) => {
    const newSeasons = seasons.filter(s => s.id !== id);
    saveSeasonsData(newSeasons);
  };

  // Calendar Helpers
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const days: (Date | null)[] = [];

    // Add empty slots for days before the first day of month
    for (let i = 0; i < firstDay.getDay(); i++) {
      days.push(null);
    }

    // Add all days of the month
    for (let d = 1; d <= lastDay.getDate(); d++) {
      days.push(new Date(year, month, d));
    }

    return days;
  };

  const formatDateForInput = (date: Date) => {
    return date.toISOString().split('T')[0];
  };

  const handleCalendarDayClick = (date: Date) => {
    const dateStr = formatDateForInput(date);
    if (selectingDate === 'start') {
      setNewSeason({ ...newSeason, startDate: dateStr, endDate: '' });
      setSelectingDate('end');
    } else {
      if (dateStr >= newSeason.startDate) {
        setNewSeason({ ...newSeason, endDate: dateStr });
      } else {
        // If selected end is before start, swap them
        setNewSeason({ ...newSeason, startDate: dateStr, endDate: newSeason.startDate });
      }
    }
  };

  const isDateInRange = (date: Date) => {
    if (!newSeason.startDate) return false;
    const dateStr = formatDateForInput(date);
    if (!newSeason.endDate) return dateStr === newSeason.startDate;
    return dateStr >= newSeason.startDate && dateStr <= newSeason.endDate;
  };

  const isStartDate = (date: Date) => newSeason.startDate === formatDateForInput(date);
  const isEndDate = (date: Date) => newSeason.endDate === formatDateForInput(date);

  const monthNames = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];

  const openRateDrawer = (seasonId: string, rate?: Rate) => {
    setRateDrawerSeasonId(seasonId);
    if (rate) {
      // Edit mode
      setEditingRate({ seasonId, rate });
      setNewRate({
        name: rate.name,
        minNights: rate.minNights,
        maxNights: rate.maxNights || '',
        pricePerAdult: rate.pricePerAdult.toString(),
        childPrices: rate.childPrices.map(cp => ({ ...cp, percentage: cp.percentage.toString() })),
        infantPrices: rate.infantPrices.map(ip => ({ ...ip, percentage: ip.percentage.toString() }))
      });
    } else {
      // Create mode
      setEditingRate(null);
      setNewRate({
        name: '',
        minNights: 1,
        maxNights: '',
        pricePerAdult: '',
        childPrices: [],
        infantPrices: []
      });
    }
    setRateDrawerOpen(true);
  };

  const addChildPriceTier = () => {
    const lastTier = newRate.childPrices[newRate.childPrices.length - 1];
    const newAgeFrom = lastTier ? lastTier.ageTo + 1 : 3;
    setNewRate({
      ...newRate,
      childPrices: [...newRate.childPrices, { id: Date.now().toString(), ageFrom: newAgeFrom, ageTo: newAgeFrom + 3, percentage: '50' }]
    });
  };

  const addInfantPriceTier = () => {
    const lastTier = newRate.infantPrices[newRate.infantPrices.length - 1];
    const newAgeFrom = lastTier ? lastTier.ageTo + 1 : 0;
    setNewRate({
      ...newRate,
      infantPrices: [...newRate.infantPrices, { id: Date.now().toString(), ageFrom: newAgeFrom, ageTo: Math.min(newAgeFrom + 1, 2), percentage: '0' }]
    });
  };

  const updateChildPriceTier = (id: string, field: string, value: number | string) => {
    setNewRate({
      ...newRate,
      childPrices: newRate.childPrices.map(tier =>
        tier.id === id ? { ...tier, [field]: value } : tier
      )
    });
  };

  const updateInfantPriceTier = (id: string, field: string, value: number | string) => {
    setNewRate({
      ...newRate,
      infantPrices: newRate.infantPrices.map(tier =>
        tier.id === id ? { ...tier, [field]: value } : tier
      )
    });
  };

  const removeChildPriceTier = (id: string) => {
    setNewRate({
      ...newRate,
      childPrices: newRate.childPrices.filter(tier => tier.id !== id)
    });
  };

  const removeInfantPriceTier = (id: string) => {
    setNewRate({
      ...newRate,
      infantPrices: newRate.infantPrices.filter(tier => tier.id !== id)
    });
  };

  const handleSaveRate = () => {
    if (!rateDrawerSeasonId || !newRate.name.trim() || !newRate.pricePerAdult) return;

    const rate: Rate = {
      id: editingRate?.rate.id || Date.now().toString(),
      name: newRate.name,
      minNights: newRate.minNights,
      maxNights: newRate.maxNights ? Number(newRate.maxNights) : null,
      pricePerAdult: Number(newRate.pricePerAdult) || 0,
      childPrices: newRate.childPrices.map(tier => ({
        id: tier.id,
        ageFrom: tier.ageFrom,
        ageTo: tier.ageTo,
        percentage: Number(tier.percentage) || 0
      })),
      infantPrices: newRate.infantPrices.map(tier => ({
        id: tier.id,
        ageFrom: tier.ageFrom,
        ageTo: tier.ageTo,
        percentage: Number(tier.percentage) || 0
      }))
    };

    const newSeasons = seasons.map(s => {
      if (s.id === rateDrawerSeasonId) {
        if (editingRate) {
          // Update existing rate
          return { ...s, rates: s.rates.map(r => r.id === rate.id ? rate : r) };
        } else {
          // Add new rate
          return { ...s, rates: [...s.rates, rate] };
        }
      }
      return s;
    });

    saveSeasonsData(newSeasons);
    setRateDrawerOpen(false);
    setRateDrawerSeasonId(null);
    setEditingRate(null);
  };

  const handleDeleteRateClick = (seasonId: string, rate: Rate) => {
    setDeleteRateConfirm({ seasonId, rateId: rate.id, rateName: rate.name });
  };

  const confirmDeleteRate = () => {
    if (!deleteRateConfirm) return;
    const newSeasons = seasons.map(s => {
      if (s.id === deleteRateConfirm.seasonId) {
        return { ...s, rates: s.rates.filter(r => r.id !== deleteRateConfirm.rateId) };
      }
      return s;
    });
    saveSeasonsData(newSeasons);
    setDeleteRateConfirm(null);
  };

  // Article Handlers
  const openArticleDrawer = (article?: Article) => {
    if (article) {
      setEditingArticle(article);
      setNewArticle({
        name: article.name,
        description: article.description || '',
        basePrice: article.basePrice,
        priceUnit: article.priceUnit,
        hasSeasonalPricing: article.hasSeasonalPricing,
        seasonPrices: article.seasonPrices || [],
        hasAgePricing: article.hasAgePricing,
        agePrices: article.agePrices || [],
        isOrtstaxe: article.isOrtstaxe,
        ortstaxeMinAge: article.ortstaxeMinAge || 14,
        active: article.active
      });
    } else {
      setEditingArticle(null);
      setNewArticle({
        name: '',
        description: '',
        basePrice: 0,
        priceUnit: 'pro_nacht',
        hasSeasonalPricing: false,
        seasonPrices: [],
        hasAgePricing: false,
        agePrices: [],
        isOrtstaxe: false,
        ortstaxeMinAge: 14,
        active: true
      });
    }
    setArticleDrawerOpen(true);
  };

  const addArticleAgePriceTier = () => {
    const lastTier = newArticle.agePrices?.[newArticle.agePrices.length - 1];
    const newAgeFrom = lastTier ? lastTier.ageTo + 1 : 0;
    setNewArticle({
      ...newArticle,
      agePrices: [...(newArticle.agePrices || []), { id: Date.now().toString(), ageFrom: newAgeFrom, ageTo: newAgeFrom + 5, price: 0 }]
    });
  };

  const updateArticleAgePriceTier = (id: string, field: string, value: number) => {
    setNewArticle({
      ...newArticle,
      agePrices: (newArticle.agePrices || []).map(tier =>
        tier.id === id ? { ...tier, [field]: value } : tier
      )
    });
  };

  const removeArticleAgePriceTier = (id: string) => {
    setNewArticle({
      ...newArticle,
      agePrices: (newArticle.agePrices || []).filter(tier => tier.id !== id)
    });
  };

  const initializeSeasonPrices = () => {
    const seasonPrices = seasons.map(season => ({
      seasonId: season.id,
      basePrice: newArticle.basePrice || 0,
      agePrices: newArticle.hasAgePricing ? [...(newArticle.agePrices || [])] : []
    }));
    setNewArticle({
      ...newArticle,
      seasonPrices
    });
  };

  const updateSeasonPrice = (seasonId: string, price: number) => {
    setNewArticle({
      ...newArticle,
      seasonPrices: (newArticle.seasonPrices || []).map(sp =>
        sp.seasonId === seasonId ? { ...sp, basePrice: price } : sp
      )
    });
  };

  const handleSaveArticle = () => {
    if (!newArticle.name?.trim()) return;

    const article: Article = {
      id: editingArticle?.id || Date.now().toString(),
      name: newArticle.name || '',
      description: newArticle.description,
      basePrice: newArticle.basePrice || 0,
      priceUnit: newArticle.priceUnit || 'pro_nacht',
      hasSeasonalPricing: newArticle.hasSeasonalPricing || false,
      seasonPrices: newArticle.hasSeasonalPricing ? newArticle.seasonPrices : [],
      hasAgePricing: newArticle.hasAgePricing || false,
      agePrices: newArticle.hasAgePricing ? newArticle.agePrices : [],
      isOrtstaxe: newArticle.isOrtstaxe || false,
      ortstaxeMinAge: newArticle.isOrtstaxe ? (newArticle.ortstaxeMinAge || 14) : undefined,
      active: newArticle.active !== false
    };

    if (editingArticle) {
      setArticles(articles.map(a => a.id === editingArticle.id ? article : a));
    } else {
      setArticles([...articles, article]);
    }

    setArticleDrawerOpen(false);
    setEditingArticle(null);
  };

  const handleDeleteArticleClick = (article: Article) => {
    setDeleteArticleConfirm({ id: article.id, name: article.name });
  };

  const confirmDeleteArticle = () => {
    if (!deleteArticleConfirm) return;
    setArticles(articles.filter(a => a.id !== deleteArticleConfirm.id));
    setDeleteArticleConfirm(null);
  };

  // Knowledge Document Handlers
  const handleDocumentUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setUploadingDoc(true);
    try {
      for (const file of Array.from(files)) {
        // Check if PDF or text
        const isPdf = file.type === 'application/pdf';
        const isText = file.type === 'text/plain' || file.name.endsWith('.txt') || file.name.endsWith('.md');

        if (!isPdf && !isText) {
          alert(`Datei "${file.name}" wird nicht unterstützt. Nur PDF und Text-Dateien.`);
          continue;
        }

        // For now, we'll store the file info locally
        // In production, this would upload to Firebase Storage
        const doc: KnowledgeDocument = {
          id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
          name: file.name,
          type: isPdf ? 'pdf' : 'text',
          size: file.size,
          uploadedAt: new Date().toISOString(),
        };

        // Read text content if it's a text file
        if (isText) {
          const content = await file.text();
          doc.content = content;
        }

        setKnowledgeDocs(prev => [...prev, doc]);
      }
    } catch (error) {
      console.error('Error uploading document:', error);
      alert('Fehler beim Hochladen des Dokuments');
    } finally {
      setUploadingDoc(false);
      // Reset input
      event.target.value = '';
    }
  };

  const handleDeleteDocument = (docId: string) => {
    setKnowledgeDocs(prev => prev.filter(d => d.id !== docId));
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  // WhatsApp API Functions (manual check with loading state)
  const checkWhatsAppStatus = async () => {
    setWhatsappLoading(true);
    try {
      await checkWhatsAppStatusAuto();
    } catch (error) {
      console.error('WhatsApp status check failed:', error);
      setWhatsappStatus('disconnected');
    } finally {
      setWhatsappLoading(false);
    }
  };

  const tabs = [
    { id: 'basic' as const, label: 'Basic', icon: Building2 },
    { id: 'resource' as const, label: 'Resource', icon: Bed },
    { id: 'communication' as const, label: 'Kommunikation', icon: MessageSquare },
    { id: 'ai' as const, label: 'KI', icon: Bot },
    { id: 'bridge' as const, label: 'Bridge', icon: Plug }
  ];

  const bridgeSteps = [
    {
      number: 1,
      title: 'Google Cloud SDK installieren',
      description: 'Einmalig auf dem Datenbank-PC: Lade das Google Cloud SDK herunter und installiere es.',
      action: 'SDK Download',
      actionUrl: 'https://cloud.google.com/sdk/docs/install',
      icon: Download,
      details: 'Das SDK wird benoetigt, damit die Bridge Daten zu Firebase senden kann.'
    },
    {
      number: 2,
      title: 'Google-Anmeldung durchfuehren',
      description: 'Oeffne die Eingabeaufforderung (cmd) und fuehre folgenden Befehl aus:',
      action: null,
      icon: null,
      command: 'gcloud auth application-default login',
      details: 'Es oeffnet sich ein Browser. Melde dich mit deinem Google-Account an (der auch Zugriff auf Firebase hat).'
    },
    {
      number: 3,
      title: 'Bridge herunterladen',
      description: 'Lade die CapCorn Bridge Software auf den PC herunter, auf dem die CapHotel-Datenbank liegt.',
      action: 'Download',
      icon: Download,
      details: 'Die Datei ist ca. 50 MB gross.'
    },
    {
      number: 4,
      title: 'Bridge starten & konfigurieren',
      description: 'Starte die heruntergeladene EXE-Datei. Im Einstellungen-Tab:',
      action: null,
      icon: null,
      checklist: [
        'Datenbank-Pfad auswaehlen (z.B. C:\\datat\\caphotel.mdb)',
        'Verbindung testen - sollte gruene Meldung zeigen',
        'Automatische Synchronisation aktivieren',
        'Sync-Interval waehlen (Standard: 15 Minuten)',
        'Windows-Autostart aktivieren',
        'Einstellungen speichern'
      ]
    },
    {
      number: 5,
      title: 'Ersten Sync durchfuehren',
      description: 'Gehe im Bridge-Fenster auf "Jetzt synchronisieren" um den ersten Sync zu starten.',
      action: null,
      icon: null,
      details: 'Nach erfolgreichem Sync siehst du hier im "Backup"-Tab die synchronisierten Daten.'
    },
    {
      number: 6,
      title: 'Fertig!',
      description: 'Die Bridge laeuft jetzt im Hintergrund (System-Tray unten rechts bei der Uhr).',
      action: null,
      icon: null,
      details: 'Sie startet automatisch mit Windows und synchronisiert alle 15 Minuten. Du kannst das Fenster schliessen - es minimiert sich nur ins Tray.'
    }
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header with User Info */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <p className="text-sm text-slate-500">Angemeldet als</p>
              <div className="flex items-center gap-3">
                {user?.photoURL ? (
                  <img src={user.photoURL} alt="Profil" className="h-12 w-12 rounded-full" />
                ) : (
                  <div className="h-12 w-12 rounded-full bg-blue-600 flex items-center justify-center">
                    <span className="text-lg font-medium text-white">
                      {user?.email?.charAt(0).toUpperCase() || 'S'}
                    </span>
                  </div>
                )}
                <div>
                  <p className="font-semibold text-slate-900">{user?.displayName || 'Hotel Stadler'}</p>
                  <p className="text-sm text-slate-500">{user?.email}</p>
                </div>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 border border-slate-300 rounded-lg text-slate-600 hover:bg-slate-50 hover:border-slate-400 transition-colors"
            >
              <LogOut className="h-4 w-4" />
              Abmelden
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-4">
          <div className="flex gap-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors
                  ${activeTab === tab.id
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                  }
                `}
              >
                <tab.icon className="h-4 w-4" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-4 py-8">
        {activeTab === 'basic' ? (
          /* Basic Tab */
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-6">Hotel Informationen</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Hotel Name</label>
                <input
                  type="text"
                  value={hotelInfo.name}
                  onChange={(e) => setHotelInfo({ ...hotelInfo, name: e.target.value })}
                  onBlur={() => handleHotelInfoChange('name', hotelInfo.name)}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Ansprechpartner</label>
                <input
                  type="text"
                  value={hotelInfo.contactPerson}
                  onChange={(e) => setHotelInfo({ ...hotelInfo, contactPerson: e.target.value })}
                  onBlur={() => handleHotelInfoChange('contactPerson', hotelInfo.contactPerson)}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-2">Straße</label>
                <input
                  type="text"
                  value={hotelInfo.street}
                  onChange={(e) => setHotelInfo({ ...hotelInfo, street: e.target.value })}
                  onBlur={() => handleHotelInfoChange('street', hotelInfo.street)}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">PLZ</label>
                <input
                  type="text"
                  value={hotelInfo.postalCode}
                  onChange={(e) => setHotelInfo({ ...hotelInfo, postalCode: e.target.value })}
                  onBlur={() => handleHotelInfoChange('postalCode', hotelInfo.postalCode)}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Ort</label>
                <input
                  type="text"
                  value={hotelInfo.city}
                  onChange={(e) => setHotelInfo({ ...hotelInfo, city: e.target.value })}
                  onBlur={() => handleHotelInfoChange('city', hotelInfo.city)}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Land</label>
                <input
                  type="text"
                  value={hotelInfo.country}
                  onChange={(e) => setHotelInfo({ ...hotelInfo, country: e.target.value })}
                  onBlur={() => handleHotelInfoChange('country', hotelInfo.country)}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">E-Mail</label>
                <input
                  type="email"
                  value={hotelInfo.email}
                  onChange={(e) => setHotelInfo({ ...hotelInfo, email: e.target.value })}
                  onBlur={() => handleHotelInfoChange('email', hotelInfo.email)}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Telefon</label>
                <input
                  type="tel"
                  value={hotelInfo.phone}
                  onChange={(e) => setHotelInfo({ ...hotelInfo, phone: e.target.value })}
                  onBlur={() => handleHotelInfoChange('phone', hotelInfo.phone)}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            <div className="mt-6 flex items-center justify-between">
              {saveStatus === 'success' && (
                <span className="text-sm text-green-600">Gespeichert!</span>
              )}
              {saveStatus === 'error' && (
                <span className="text-sm text-red-600">Fehler beim Speichern</span>
              )}
              {saveStatus === 'idle' && <span />}
              <button
                onClick={async () => {
                  setSaving(true);
                  const success = await saveHotelInfo(hotelInfo);
                  setSaveStatus(success ? 'success' : 'error');
                  setTimeout(() => setSaveStatus('idle'), 2000);
                  setSaving(false);
                }}
                disabled={saving}
                className="px-6 py-2 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 transition-colors disabled:opacity-50"
              >
                {saving ? 'Speichern...' : 'Speichern'}
              </button>
            </div>
          </div>
        ) : activeTab === 'resource' ? (
          /* Resource Tab */
          <div className="space-y-6">
            {/* Sub-Tabs */}
            <div className="bg-white rounded-xl border border-slate-200">
              <div className="flex border-b border-slate-200">
                <button
                  onClick={() => setResourceSubTab('lage')}
                  className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                    resourceSubTab === 'lage'
                      ? 'text-blue-600 border-b-2 border-blue-600 -mb-px'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <Home className="h-4 w-4 inline mr-2" />
                  Lage ({buildings.length})
                </button>
                <button
                  onClick={() => setResourceSubTab('kategorie')}
                  className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                    resourceSubTab === 'kategorie'
                      ? 'text-blue-600 border-b-2 border-blue-600 -mb-px'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <Bed className="h-4 w-4 inline mr-2" />
                  Kategorie ({categories.length})
                </button>
                <button
                  onClick={() => setResourceSubTab('artikel')}
                  className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                    resourceSubTab === 'artikel'
                      ? 'text-blue-600 border-b-2 border-blue-600 -mb-px'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <Package className="h-4 w-4 inline mr-2" />
                  Artikel ({articleMappings.length})
                </button>
              </div>

              <div className="p-6">
                {/* Lage Sub-Tab */}
                {resourceSubTab === 'lage' && (
                  <div className="space-y-4">
                    {/* Action Button */}
                    <div className="flex justify-end">
                      <button
                        onClick={() => {
                          setEditingBuilding(null);
                          setNewBuilding({ name: '', description: '' });
                          setBuildingDrawerOpen(true);
                        }}
                        className="flex items-center gap-2 px-4 py-2 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
                      >
                        <Plus className="h-4 w-4" />
                        Haus/Gebäude
                      </button>
                    </div>

                    {/* Buildings List */}
                    {buildings.length === 0 ? (
                      <div className="py-12 text-center">
                        <Home className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                        <p className="text-slate-500">Noch keine Häuser/Gebäude erstellt</p>
                        <p className="text-sm text-slate-400 mt-1">Erstelle Gebäude um deine Zimmer nach Lage zu gruppieren</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {buildings.map((building) => {
                          // Count rooms in this building
                          const roomCount = categories.reduce((acc, cat) =>
                            acc + cat.rooms.filter(r => r.buildingId === building.id).length, 0
                          );
                          return (
                            <div
                              key={building.id}
                              onClick={() => {
                                setEditingBuilding(building);
                                setNewBuilding({ name: building.name, description: building.description || '' });
                                setBuildingDrawerOpen(true);
                              }}
                              className="flex items-center justify-between p-4 bg-slate-50 rounded-xl hover:bg-slate-100 cursor-pointer transition-colors group"
                            >
                              <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                                  <Home className="h-5 w-5 text-blue-600" />
                                </div>
                                <div>
                                  <h3 className="font-semibold text-slate-900">{building.name}</h3>
                                  {building.description && (
                                    <p className="text-sm text-slate-500">{building.description}</p>
                                  )}
                                  <p className="text-xs text-slate-400 mt-1">{roomCount} Zimmer</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Pencil className="h-4 w-4 text-slate-400 group-hover:text-slate-600" />
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (confirm(`Möchtest du "${building.name}" wirklich löschen?`)) {
                                      setBuildings(buildings.filter(b => b.id !== building.id));
                                    }
                                  }}
                                  className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* Kategorie Sub-Tab */}
                {resourceSubTab === 'kategorie' && (
                  <div className="space-y-4">
                    {/* Action Buttons */}
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => {
                          setSelectedPricingCategory(categories[0]?.id || null);
                          setPricingFullscreenOpen(true);
                        }}
                        className="flex items-center gap-2 px-4 py-2 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
                      >
                        <Euro className="h-4 w-4" />
                        Preise
                      </button>
                      <button
                        onClick={() => openCategoryDrawer()}
                        className="flex items-center gap-2 px-4 py-2 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
                      >
                        <Plus className="h-4 w-4" />
                        Kategorie
                      </button>
                    </div>

                    {/* Categories */}
                    {categories.length === 0 ? (
                      <div className="py-12 text-center">
                        <Bed className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                        <p className="text-slate-500">Noch keine Kategorien erstellt</p>
                        <p className="text-sm text-slate-400 mt-1">Klicke auf "Kategorie" um deine erste Zimmerkategorie zu erstellen</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {categories.map((category) => (
                          <div key={category.id} className="bg-slate-50 rounded-xl overflow-hidden">
                            {/* Category Header */}
                            <div className="flex items-center justify-between p-4 border-b border-slate-200">
                              <div
                                className="flex-1 cursor-pointer hover:bg-slate-100 -m-2 p-2 rounded-lg transition-colors"
                                onClick={() => openCategoryDrawer(category)}
                              >
                                <div className="flex items-center gap-2">
                                  <h3 className="font-semibold text-slate-900">{category.name}</h3>
                                  <Pencil className="h-3.5 w-3.5 text-slate-400" />
                                </div>
                                {category.description && (
                                  <p className="text-sm text-slate-500 mt-1">{category.description}</p>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => openRoomDrawer(category.id)}
                                  className="flex items-center gap-1 px-3 py-1.5 border border-blue-600 text-blue-600 rounded-lg text-sm hover:bg-blue-50 transition-colors"
                                >
                                  <Plus className="h-4 w-4" />
                                  Zimmer
                                </button>
                                <button
                                  onClick={() => handleDeleteCategory(category.id)}
                                  className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            </div>

                            {/* Rooms */}
                            {category.rooms.length > 0 && (
                              <div className="p-4">
                                <div className="space-y-2">
                                  {category.rooms.map((room) => (
                                    <div
                                      key={room.id}
                                      onClick={() => openRoomDrawer(category.id, room)}
                                      className="flex items-center justify-between p-3 bg-white rounded-lg hover:bg-slate-100 cursor-pointer transition-colors group"
                                    >
                                      <div>
                                        <p className="font-medium text-slate-900">Zimmer {room.number}</p>
                                        <p className="text-sm text-slate-500">{room.name}</p>
                                        {room.occupancies.length > 0 && (
                                          <p className="text-xs text-slate-400 mt-1">
                                            {room.occupancies.length} Belegung{room.occupancies.length !== 1 ? 'en' : ''}
                                          </p>
                                        )}
                                      </div>
                                      <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-slate-600" />
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Artikel Sub-Tab */}
                {resourceSubTab === 'artikel' && (
                  <div className="space-y-4">
                    {/* Header with Add Button */}
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold text-slate-900">Artikel & Zusatzleistungen</h3>
                        <p className="text-sm text-slate-500">Extras, Fahrräder, Ortstaxe und mehr</p>
                      </div>
                      <button
                        onClick={() => openArticleDrawer()}
                        className="flex items-center gap-2 px-4 py-2 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
                      >
                        <Plus className="h-4 w-4" />
                        Artikel erstellen
                      </button>
                    </div>

                    {/* Articles List */}
                    {articles.length === 0 ? (
                      <div className="py-12 text-center bg-slate-50 rounded-xl border-2 border-dashed border-slate-200">
                        <Package className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                        <p className="text-slate-500 font-medium">Noch keine Artikel erstellt</p>
                        <p className="text-sm text-slate-400 mt-1">Erstellen Sie Artikel wie Fahrradverleih, Frühstück oder Ortstaxe</p>
                        <button
                          onClick={() => openArticleDrawer()}
                          className="mt-4 px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors text-sm font-medium"
                        >
                          Ersten Artikel erstellen
                        </button>
                      </div>
                    ) : (
                      <div className="grid gap-4">
                        {articles.map((article) => (
                          <div
                            key={article.id}
                            className={`bg-white rounded-xl border ${article.isOrtstaxe ? 'border-orange-200' : 'border-slate-200'} overflow-hidden`}
                          >
                            <div className="p-4">
                              <div className="flex items-start justify-between">
                                <div className="flex items-start gap-3">
                                  <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${
                                    article.isOrtstaxe ? 'bg-orange-100' : 'bg-blue-100'
                                  }`}>
                                    {article.isOrtstaxe ? (
                                      <Euro className="h-5 w-5 text-orange-600" />
                                    ) : (
                                      <Package className="h-5 w-5 text-blue-600" />
                                    )}
                                  </div>
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <span className="font-medium text-slate-900">{article.name}</span>
                                      {article.isOrtstaxe && (
                                        <span className="px-2 py-0.5 bg-orange-100 text-orange-700 text-xs rounded-full font-medium">
                                          Ortstaxe
                                        </span>
                                      )}
                                      {!article.active && (
                                        <span className="px-2 py-0.5 bg-slate-100 text-slate-500 text-xs rounded-full font-medium">
                                          Inaktiv
                                        </span>
                                      )}
                                    </div>
                                    {article.description && (
                                      <p className="text-sm text-slate-500 mt-0.5">{article.description}</p>
                                    )}
                                    <div className="flex items-center gap-3 mt-2 text-xs text-slate-400">
                                      <span>{PRICE_UNITS.find(u => u.id === article.priceUnit)?.label}</span>
                                      {article.hasSeasonalPricing && <span>• Saisonpreise</span>}
                                      {article.hasAgePricing && <span>• Alterspreise</span>}
                                      {article.isOrtstaxe && <span>• Ab {article.ortstaxeMinAge} Jahre</span>}
                                    </div>
                                  </div>
                                </div>
                                <div className="flex items-center gap-4">
                                  <div className="text-right">
                                    <div className="font-bold text-slate-900">€{article.basePrice.toFixed(2)}</div>
                                    <div className="text-xs text-slate-400">Basispreis</div>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <button
                                      onClick={() => openArticleDrawer(article)}
                                      className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                                      title="Bearbeiten"
                                    >
                                      <Pencil className="h-4 w-4" />
                                    </button>
                                    <button
                                      onClick={() => handleDeleteArticleClick(article)}
                                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                      title="Löschen"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </button>
                                  </div>
                                </div>
                              </div>

                              {/* Age Pricing Preview */}
                              {article.hasAgePricing && article.agePrices && article.agePrices.length > 0 && (
                                <div className="mt-3 pt-3 border-t border-slate-100">
                                  <p className="text-xs text-slate-500 mb-2">Altersbasierte Preise:</p>
                                  <div className="flex flex-wrap gap-2">
                                    {article.agePrices.map((ap) => (
                                      <span key={ap.id} className="px-2 py-1 bg-green-50 text-green-700 rounded text-xs">
                                        {ap.ageFrom}-{ap.ageTo} Jahre: EUR {ap.price.toFixed(2)}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Season Pricing Preview */}
                              {article.hasSeasonalPricing && article.seasonPrices && article.seasonPrices.length > 0 && (
                                <div className="mt-3 pt-3 border-t border-slate-100">
                                  <p className="text-xs text-slate-500 mb-2">Saisonpreise:</p>
                                  <div className="flex flex-wrap gap-2">
                                    {article.seasonPrices.map((sp) => {
                                      const season = seasons.find(s => s.id === sp.seasonId);
                                      return season ? (
                                        <span key={sp.seasonId} className="px-2 py-1 bg-purple-50 text-purple-700 rounded text-xs">
                                          {season.name}: EUR {sp.basePrice.toFixed(2)}
                                        </span>
                                      ) : null;
                                    })}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Bridge Synced Articles Info */}
                    {articleMappings.length > 0 && (
                      <div className="mt-6 p-4 bg-slate-50 rounded-xl">
                        <p className="text-sm text-slate-600 font-medium mb-3 flex items-center gap-2">
                          <Link2 className="h-4 w-4" />
                          {articleMappings.length} Artikel von Bridge verknüpft
                        </p>
                        <div className="space-y-2">
                          {articleMappings.map((article) => (
                            <div key={article.appArticleId} className="flex items-center justify-between p-2 bg-white rounded-lg text-sm">
                              <span className="text-slate-700">{article.appArticleName}</span>
                              <span className="text-slate-500">€{article.price}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : activeTab === 'communication' ? (
          /* Kommunikation Tab */
          <div className="space-y-6">
            {/* Header */}
            <div className="bg-gradient-to-r from-green-600 to-emerald-600 rounded-xl p-6 text-white">
              <div className="flex items-center gap-4">
                <div className="h-14 w-14 rounded-xl bg-white/20 flex items-center justify-center">
                  <MessageSquare className="h-7 w-7 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold">Kommunikation</h2>
                  <p className="text-white/80">E-Mail und WhatsApp Einstellungen</p>
                </div>
              </div>
            </div>

            {/* Sub-Tabs */}
            <div className="flex gap-2 border-b border-slate-200 pb-4 overflow-x-auto">
              <button
                onClick={() => setCommunicationSubTab('whatsapp')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap ${
                  communicationSubTab === 'whatsapp'
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Phone className="h-4 w-4" />
                WhatsApp
              </button>
              <button
                onClick={() => setCommunicationSubTab('email')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap ${
                  communicationSubTab === 'email'
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Mail className="h-4 w-4" />
                E-Mail
              </button>
              <button
                onClick={() => setCommunicationSubTab('email-template')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap ${
                  communicationSubTab === 'email-template'
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <FileText className="h-4 w-4" />
                E-Mail Template
              </button>
              <button
                onClick={() => setCommunicationSubTab('email-import')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap ${
                  communicationSubTab === 'email-import'
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Download className="h-4 w-4" />
                E-Mail Import
              </button>
              <button
                onClick={() => setCommunicationSubTab('public-pages')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap ${
                  communicationSubTab === 'public-pages'
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Globe className="h-4 w-4" />
                Öffentliche Seiten
              </button>
            </div>

            {/* WhatsApp Sub-Tab */}
            {communicationSubTab === 'whatsapp' && (
              <div className="space-y-6">
                {/* Connection Status */}
                <div className="bg-white rounded-xl border border-slate-200 p-6">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <div className={`h-3 w-3 rounded-full ${
                        whatsappStatus === 'connected' ? 'bg-green-500' :
                        whatsappStatus === 'connecting' ? 'bg-yellow-500 animate-pulse' : 'bg-slate-400'
                      }`} />
                      <span className="font-medium text-slate-900">
                        {whatsappStatus === 'connected' ? 'Verbunden' :
                         whatsappStatus === 'connecting' ? 'Verbinde...' : 'Nicht verbunden'}
                      </span>
                    </div>
                    <button
                      onClick={checkWhatsAppStatus}
                      disabled={whatsappLoading}
                      className="flex items-center gap-2 px-4 py-2 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 transition-colors disabled:opacity-50"
                    >
                      {whatsappLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <RefreshCw className="h-4 w-4" />
                      )}
                      Status prüfen
                    </button>
                  </div>

                  {/* QR Code or Success Message */}
                  {whatsappStatus === 'connected' ? (
                    <div className="text-center py-8">
                      <div className="h-16 w-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Check className="h-8 w-8 text-green-600" />
                      </div>
                      <h3 className="text-lg font-semibold text-slate-900 mb-2">WhatsApp ist verbunden!</h3>
                      <p className="text-slate-500">Sie können jetzt Nachrichten über WhatsApp senden und empfangen.</p>
                    </div>
                  ) : whatsappStatus === 'connecting' && whatsappQrCode ? (
                    <div className="text-center">
                      <h3 className="text-lg font-semibold text-slate-900 mb-4">QR-Code scannen</h3>
                      <p className="text-slate-500 mb-6">Öffnen Sie WhatsApp auf Ihrem Handy und scannen Sie diesen QR-Code:</p>
                      <div className="inline-block p-4 bg-white border-2 border-slate-200 rounded-xl">
                        <img src={whatsappQrCode} alt="WhatsApp QR Code" className="w-64 h-64" />
                      </div>
                      <p className="text-sm text-slate-400 mt-4">WhatsApp → Verknüpfte Geräte → Gerät hinzufügen</p>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <div className="h-16 w-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Phone className="h-8 w-8 text-slate-400" />
                      </div>
                      <h3 className="text-lg font-semibold text-slate-900 mb-2">WhatsApp verbinden</h3>
                      <p className="text-slate-500 mb-4">Klicken Sie auf &quot;Status prüfen&quot; um den QR-Code zu laden.</p>
                    </div>
                  )}
                </div>

                {/* How it works */}
                <div className="bg-green-50 border border-green-200 rounded-xl p-6">
                  <h4 className="font-semibold text-green-900 mb-4 flex items-center gap-2">
                    <Sparkles className="h-5 w-5" />
                    So funktioniert WhatsApp-Integration
                  </h4>
                  <ol className="space-y-3 text-green-800">
                    <li className="flex items-start gap-3">
                      <span className="flex-shrink-0 h-6 w-6 bg-green-200 rounded-full flex items-center justify-center text-sm font-bold text-green-800">1</span>
                      <span>Scannen Sie den QR-Code mit Ihrer WhatsApp Business App</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="flex-shrink-0 h-6 w-6 bg-green-200 rounded-full flex items-center justify-center text-sm font-bold text-green-800">2</span>
                      <span>Sobald verbunden, können Sie in der Gästekarte WhatsApp-Nachrichten senden</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="flex-shrink-0 h-6 w-6 bg-green-200 rounded-full flex items-center justify-center text-sm font-bold text-green-800">3</span>
                      <span>Eingehende Antworten werden automatisch dem Gast zugeordnet</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="flex-shrink-0 h-6 w-6 bg-green-200 rounded-full flex items-center justify-center text-sm font-bold text-green-800">4</span>
                      <span>Senden Sie Angebote, Buchungsbestätigungen und mehr direkt via WhatsApp</span>
                    </li>
                  </ol>
                </div>
              </div>
            )}

            {/* Email Sub-Tab */}
            {communicationSubTab === 'email' && (
              <div className="space-y-6">
                <div className="bg-white rounded-xl border border-slate-200 p-6">
                  <h3 className="font-semibold text-slate-900 mb-4">E-Mail Einstellungen</h3>
                  <div className="text-center py-8">
                    <div className="h-16 w-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Mail className="h-8 w-8 text-blue-600" />
                    </div>
                    <p className="text-slate-500">E-Mail-Einstellungen werden über Firebase verwaltet.</p>
                    <p className="text-sm text-slate-400 mt-2">Angebote und Buchungsbestätigungen werden automatisch versendet.</p>
                  </div>
                </div>
              </div>
            )}

            {/* Email Template Sub-Tab */}
            {communicationSubTab === 'email-template' && (
              <div className="space-y-6">
                <div className="bg-white rounded-xl border border-slate-200 p-6">
                  <h3 className="font-semibold text-slate-900 mb-4">E-Mail Template</h3>
                  <p className="text-sm text-slate-500 mb-6">Gestalten Sie das Aussehen Ihrer E-Mails mit Header, Logo und automatischer Footer-Zeile.</p>

                  {/* Header Upload */}
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-slate-700 mb-2">Header-Bild</label>
                    <div className="border-2 border-dashed border-slate-200 rounded-xl p-8 text-center hover:border-blue-300 transition-colors cursor-pointer">
                      <Image className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                      <p className="text-slate-600 font-medium">Klicken zum Hochladen</p>
                      <p className="text-sm text-slate-400 mt-1">PNG, JPG bis 2MB, empfohlen 600x150px</p>
                    </div>
                  </div>

                  {/* Logo Upload */}
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-slate-700 mb-2">Logo</label>
                    <div className="border-2 border-dashed border-slate-200 rounded-xl p-8 text-center hover:border-blue-300 transition-colors cursor-pointer">
                      <Image className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                      <p className="text-slate-600 font-medium">Klicken zum Hochladen</p>
                      <p className="text-sm text-slate-400 mt-1">PNG, JPG bis 1MB, empfohlen 200x200px</p>
                    </div>
                  </div>

                  {/* Footer Preview */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Footer-Zeile (automatisch)</label>
                    <div className="bg-slate-50 rounded-xl p-4 text-center text-sm text-slate-600">
                      <p className="font-medium">{hotelInfo.name || 'Hotel Name'}</p>
                      <p>{hotelInfo.street || 'Straße'}, {hotelInfo.city || 'Ort'}</p>
                      <p>{hotelInfo.email || 'email@hotel.at'} | {hotelInfo.phone || 'Telefon'}</p>
                    </div>
                    <p className="text-xs text-slate-400 mt-2">Die Footer-Daten werden aus den Basic-Einstellungen übernommen.</p>
                  </div>
                </div>

                <button className="w-full py-3 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 transition-colors font-medium">
                  Template speichern
                </button>
              </div>
            )}

            {/* Email Import Sub-Tab */}
            {communicationSubTab === 'email-import' && (
              <div className="space-y-6">
                <div className="bg-white rounded-xl border border-slate-200 p-6">
                  <h3 className="font-semibold text-slate-900 mb-4">E-Mail Import</h3>
                  <p className="text-sm text-slate-500 mb-6">Verbinden Sie einen Gmail-Ordner um E-Mail-Anfragen automatisch zu importieren und als neue Anfragen anzulegen.</p>

                  {/* Gmail Connection Status */}
                  <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl mb-6">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-slate-200 flex items-center justify-center">
                        <Mail className="h-5 w-5 text-slate-500" />
                      </div>
                      <div>
                        <p className="font-medium text-slate-900">Gmail Konto</p>
                        <p className="text-sm text-slate-500">Nicht verbunden</p>
                      </div>
                    </div>
                    <button className="px-4 py-2 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 transition-colors text-sm font-medium">
                      Verbinden
                    </button>
                  </div>

                  {/* Folder Selection */}
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-slate-700 mb-2">Ordner auswählen</label>
                    <select className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-slate-600">
                      <option>Zuerst Gmail verbinden...</option>
                    </select>
                    <p className="text-xs text-slate-400 mt-2">E-Mails aus diesem Ordner werden als neue Anfragen importiert.</p>
                  </div>

                  {/* How it works */}
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                    <h4 className="font-medium text-blue-900 mb-2">So funktioniert der Import:</h4>
                    <ul className="text-sm text-blue-800 space-y-1">
                      <li>• Neue E-Mails werden automatisch als Anfrage angelegt</li>
                      <li>• Falls der Gast nicht existiert, wird ein neuer CDS erstellt</li>
                      <li>• Die Anfrage wird dem Gast zugeordnet</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {/* Public Pages Sub-Tab */}
            {communicationSubTab === 'public-pages' && (
              <div className="space-y-6">
                <div className="bg-white rounded-xl border border-slate-200 p-6">
                  <h3 className="font-semibold text-slate-900 mb-4">Öffentliche Seiten</h3>
                  <p className="text-sm text-slate-500 mb-6">Verwalten Sie öffentliche Seiten für Gäste.</p>

                  {/* Gästeportal */}
                  <div className="p-4 bg-slate-50 rounded-xl mb-4 hover:bg-slate-100 transition-colors cursor-pointer">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-purple-100 flex items-center justify-center">
                          <User className="h-5 w-5 text-purple-600" />
                        </div>
                        <div>
                          <p className="font-medium text-slate-900">Gästeportal</p>
                          <p className="text-sm text-slate-500">Persönliches Portal für jeden Gast</p>
                        </div>
                      </div>
                      <ChevronRight className="h-5 w-5 text-slate-400" />
                    </div>
                  </div>

                  {/* Lead Formular */}
                  <div className="p-4 bg-slate-50 rounded-xl mb-4 hover:bg-slate-100 transition-colors cursor-pointer">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                          <FileText className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <p className="font-medium text-slate-900">Lead-Formular</p>
                          <p className="text-sm text-slate-500">Aus Offer Office generierte Formulare</p>
                        </div>
                      </div>
                      <ChevronRight className="h-5 w-5 text-slate-400" />
                    </div>
                  </div>
                </div>

                {/* Gästeportal Info */}
                <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
                  <h4 className="font-medium text-purple-900 mb-2">Über das Gästeportal</h4>
                  <ul className="text-sm text-purple-800 space-y-1">
                    <li>• Jeder Gast erhält automatisch ein persönliches Portal</li>
                    <li>• Gäste können ihre Daten selbst aktualisieren</li>
                    <li>• Anfragen und Buchungen einsehen</li>
                    <li>• Link per WhatsApp, E-Mail oder kopieren teilen</li>
                  </ul>
                </div>
              </div>
            )}
          </div>
        ) : activeTab === 'ai' ? (
          /* KI Tab */
          <div className="space-y-6">
            {/* KI Agents Header */}
            <div className="bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl p-6 text-white">
              <div className="flex items-center gap-4">
                <div className="h-14 w-14 rounded-xl bg-white/20 flex items-center justify-center">
                  <Bot className="h-7 w-7 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold">KI-Agenten</h2>
                  <p className="text-white/80">Automatisiere Anfragen mit künstlicher Intelligenz</p>
                </div>
              </div>
            </div>

            {/* AI Agents List */}
            {aiAgents.map((agent) => (
              <div key={agent.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                {/* Agent Header */}
                <div className="p-6 border-b border-slate-100">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`h-12 w-12 rounded-xl flex items-center justify-center ${
                        agent.enabled ? 'bg-green-100' : 'bg-slate-100'
                      }`}>
                        <Sparkles className={`h-6 w-6 ${agent.enabled ? 'text-green-600' : 'text-slate-400'}`} />
                      </div>
                      <div>
                        <h3 className="font-semibold text-slate-900">{agent.name}</h3>
                        <p className="text-sm text-slate-500">{agent.description}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setAiAgents(aiAgents.map(a =>
                          a.id === agent.id ? { ...a, enabled: !a.enabled } : a
                        ));
                      }}
                      className={`p-2 rounded-lg transition-colors ${
                        agent.enabled ? 'bg-green-100 text-green-600' : 'bg-slate-100 text-slate-400'
                      }`}
                    >
                      {agent.enabled ? <ToggleRight className="h-6 w-6" /> : <ToggleLeft className="h-6 w-6" />}
                    </button>
                  </div>
                </div>

                {/* Agent Settings */}
                <div className="p-6 space-y-6">
                  {/* Provider & Model Selection */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        <Zap className="h-4 w-4 inline mr-1" />
                        KI-Anbieter
                      </label>
                      <select
                        value={agent.provider}
                        onChange={(e) => {
                          const newProvider = e.target.value as AIProvider;
                          const models = AI_PROVIDERS.find(p => p.id === newProvider)?.models || [];
                          setAiAgents(aiAgents.map(a =>
                            a.id === agent.id ? { ...a, provider: newProvider, model: models[0] || '' } : a
                          ));
                        }}
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        {AI_PROVIDERS.map(p => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        <Settings2 className="h-4 w-4 inline mr-1" />
                        Modell
                      </label>
                      <select
                        value={agent.model}
                        onChange={(e) => {
                          setAiAgents(aiAgents.map(a =>
                            a.id === agent.id ? { ...a, model: e.target.value } : a
                          ));
                        }}
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        {AI_PROVIDERS.find(p => p.id === agent.provider)?.models.map(m => (
                          <option key={m} value={m}>{m}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* API Key */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      <Key className="h-4 w-4 inline mr-1" />
                      API-Schlüssel
                    </label>
                    <div className="relative">
                      <input
                        type={showApiKey ? 'text' : 'password'}
                        value={agent.apiKey}
                        onChange={(e) => {
                          setAiAgents(aiAgents.map(a =>
                            a.id === agent.id ? { ...a, apiKey: e.target.value } : a
                          ));
                        }}
                        placeholder={`${agent.provider === 'openai' ? 'sk-...' : agent.provider === 'anthropic' ? 'sk-ant-...' : 'AIza...'}`}
                        className="w-full px-4 py-2 pr-12 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                      />
                      <button
                        type="button"
                        onClick={() => setShowApiKey(!showApiKey)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        {showApiKey ? 'Verbergen' : 'Anzeigen'}
                      </button>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">
                      Der API-Schlüssel wird verschlüsselt gespeichert.
                    </p>
                  </div>

                  {/* System Prompt */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      <MessageSquare className="h-4 w-4 inline mr-1" />
                      System-Prompt (Anweisungen für die KI)
                    </label>
                    <textarea
                      value={agent.systemPrompt}
                      onChange={(e) => {
                        setAiAgents(aiAgents.map(a =>
                          a.id === agent.id ? { ...a, systemPrompt: e.target.value } : a
                        ));
                      }}
                      rows={10}
                      className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm resize-none"
                      placeholder="Hier die Anweisungen für die KI eingeben..."
                    />
                  </div>

                  {/* Data Access Info */}
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <h4 className="font-medium text-blue-900 mb-2 flex items-center gap-2">
                      <Database className="h-4 w-4" />
                      Datenzugriff des Agenten
                    </h4>
                    <ul className="text-sm text-blue-800 space-y-1">
                      <li>• Zimmerinformationen & Ausstattung</li>
                      <li>• Zimmerfotos und Beschreibungen</li>
                      <li>• Preise nach Saison und Personenanzahl</li>
                      <li>• Verfügbarkeit im angefragten Zeitraum</li>
                      <li>• Buchungshistorie des Gastes (falls vorhanden)</li>
                      {knowledgeDocs.length > 0 && (
                        <li>• {knowledgeDocs.length} Wissensdokument(e)</li>
                      )}
                    </ul>
                  </div>

                  {/* Knowledge Base */}
                  <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                    <h4 className="font-medium text-amber-900 mb-3 flex items-center gap-2">
                      <HardDrive className="h-4 w-4" />
                      Wissensbasis (Dokumente)
                    </h4>
                    <p className="text-sm text-amber-800 mb-4">
                      Laden Sie PDFs oder Text-Dateien hoch, damit die KI über Hotel-spezifische Informationen Bescheid weiß (z.B. Hausordnung, FAQ, Speisekarte).
                    </p>

                    {/* Upload Button */}
                    <div className="mb-4">
                      <label className="flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-amber-300 rounded-lg cursor-pointer hover:bg-amber-100 transition-colors">
                        <input
                          type="file"
                          accept=".pdf,.txt,.md"
                          multiple
                          onChange={handleDocumentUpload}
                          className="hidden"
                          disabled={uploadingDoc}
                        />
                        {uploadingDoc ? (
                          <>
                            <Loader2 className="h-5 w-5 animate-spin text-amber-600" />
                            <span className="text-amber-700 font-medium">Wird hochgeladen...</span>
                          </>
                        ) : (
                          <>
                            <FileUp className="h-5 w-5 text-amber-600" />
                            <span className="text-amber-700 font-medium">PDF oder Text-Datei hochladen</span>
                          </>
                        )}
                      </label>
                    </div>

                    {/* Uploaded Documents */}
                    {knowledgeDocs.length > 0 && (
                      <div className="space-y-2">
                        {knowledgeDocs.map((doc) => (
                          <div key={doc.id} className="flex items-center justify-between p-3 bg-white rounded-lg border border-amber-200">
                            <div className="flex items-center gap-3">
                              <FileText className={`h-5 w-5 ${doc.type === 'pdf' ? 'text-red-500' : 'text-blue-500'}`} />
                              <div>
                                <p className="text-sm font-medium text-slate-900">{doc.name}</p>
                                <p className="text-xs text-slate-500">
                                  {formatFileSize(doc.size)} • {new Date(doc.uploadedAt).toLocaleDateString('de-DE')}
                                </p>
                              </div>
                            </div>
                            <button
                              onClick={() => handleDeleteDocument(doc.id)}
                              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Info about API key */}
                    <div className="mt-4 p-3 bg-white rounded-lg border border-amber-200">
                      <p className="text-xs text-amber-700">
                        <strong>Hinweis:</strong> Die hochgeladenen Dokumente werden separat von Ihrem API-Schlüssel gespeichert. Wenn Sie den API-Schlüssel wechseln, bleiben alle Dokumente erhalten und müssen nicht erneut hochgeladen werden.
                      </p>
                    </div>
                  </div>

                  {/* How it works */}
                  {agent.id === 'inquiry-agent' && (
                    <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
                      <h4 className="font-medium text-purple-900 mb-2 flex items-center gap-2">
                        <Sparkles className="h-4 w-4" />
                        So funktioniert der Anfrage-Agent
                      </h4>
                      <ol className="text-sm text-purple-800 space-y-2">
                        <li><strong>1.</strong> Neue Lead-Anfrage wird erkannt</li>
                        <li><strong>2.</strong> KI analysiert: Zeitraum, Gäste, Wünsche</li>
                        <li><strong>3.</strong> Verfügbare Zimmer werden geprüft</li>
                        <li><strong>4.</strong> Passendes Zimmer wird ausgewählt</li>
                        <li><strong>5.</strong> Personalisiertes Angebot wird erstellt</li>
                        <li><strong>6.</strong> Status wechselt automatisch zu &quot;Offer&quot;</li>
                      </ol>
                    </div>
                  )}
                </div>

                {/* Agent Footer */}
                <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`h-2 w-2 rounded-full ${agent.enabled && agent.apiKey ? 'bg-green-500' : 'bg-slate-300'}`} />
                    <span className="text-sm text-slate-600">
                      {!agent.apiKey ? 'API-Schlüssel fehlt' : agent.enabled ? 'Aktiv' : 'Inaktiv'}
                    </span>
                  </div>
                  <button
                    disabled={!agent.apiKey}
                    className="px-4 py-2 border border-blue-600 text-blue-600 rounded-lg text-sm font-medium hover:bg-blue-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Testen
                  </button>
                </div>
              </div>
            ))}

            {/* Coming Soon */}
            <div className="bg-white rounded-xl border border-dashed border-slate-300 p-8 text-center">
              <Bot className="h-12 w-12 text-slate-300 mx-auto mb-4" />
              <h3 className="font-medium text-slate-700 mb-1">Weitere Agenten</h3>
              <p className="text-sm text-slate-500">Bald verfügbar: Bewertungs-Agent, Follow-Up Agent, Upselling Agent</p>
            </div>
          </div>
        ) : (
          /* Bridge Tab */
          <div className="space-y-6">
            {/* Connection Status Card */}
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`h-3 w-3 rounded-full ${
                    bridgeStatus === 'connected' ? 'bg-green-500' :
                    bridgeStatus === 'connecting' ? 'bg-yellow-500 animate-pulse' : 'bg-slate-400'
                  }`} />
                  <div>
                    <h2 className="font-semibold text-slate-900">
                      {bridgeStatus === 'connected' ? 'Verbunden' :
                       bridgeStatus === 'connecting' ? 'Verbinde...' : 'Nicht verbunden'}
                    </h2>
                    <p className="text-sm text-slate-500">{bridgeConfig.bridgeUrl}</p>
                  </div>
                </div>
                <button
                  onClick={testBridgeConnection}
                  disabled={bridgeStatus === 'connecting'}
                  className="flex items-center gap-2 px-4 py-2 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 transition-colors disabled:opacity-50"
                >
                  <RefreshCw className={`h-4 w-4 ${bridgeStatus === 'connecting' ? 'animate-spin' : ''}`} />
                  Testen
                </button>
              </div>

              {/* Bridge URL Config */}
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="block text-sm text-slate-600 mb-1">Bridge URL</label>
                  <input
                    type="text"
                    value={bridgeConfig.bridgeUrl}
                    onChange={(e) => setBridgeConfig({ ...bridgeConfig, bridgeUrl: e.target.value })}
                    placeholder="http://localhost:5000"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                  />
                </div>
                <button
                  onClick={handleSaveBridgeConfig}
                  className="self-end px-4 py-2 border border-slate-300 text-slate-600 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  Speichern
                </button>
              </div>
            </div>

            {/* Sub-Tabs */}
            <div className="bg-white rounded-xl border border-slate-200">
              <div className="flex border-b border-slate-200">
                <button
                  onClick={() => setBridgeSubTab('setup')}
                  className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                    bridgeSubTab === 'setup'
                      ? 'text-blue-600 border-b-2 border-blue-600 -mb-px'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <Download className="h-4 w-4 inline mr-2" />
                  Setup
                </button>
                <button
                  onClick={() => setBridgeSubTab('rooms')}
                  className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                    bridgeSubTab === 'rooms'
                      ? 'text-blue-600 border-b-2 border-blue-600 -mb-px'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <Bed className="h-4 w-4 inline mr-2" />
                  Zimmer ({roomMappings.length})
                </button>
                <button
                  onClick={() => setBridgeSubTab('articles')}
                  className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                    bridgeSubTab === 'articles'
                      ? 'text-blue-600 border-b-2 border-blue-600 -mb-px'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <Package className="h-4 w-4 inline mr-2" />
                  Artikel ({articleMappings.length})
                </button>
                <button
                  onClick={() => setBridgeSubTab('sync')}
                  className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                    bridgeSubTab === 'sync'
                      ? 'text-blue-600 border-b-2 border-blue-600 -mb-px'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <Cloud className="h-4 w-4 inline mr-2" />
                  Backup
                </button>
              </div>

              <div className="p-6">
                {/* Setup Sub-Tab */}
                {bridgeSubTab === 'setup' && (
                  <div className="space-y-4">
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                      <h3 className="font-semibold text-blue-900 mb-1">Einrichtungsanleitung</h3>
                      <p className="text-sm text-blue-700">
                        Folge diesen Schritten um die Bridge auf dem PC mit der CapHotel-Datenbank einzurichten.
                        Nach der Einrichtung laeuft alles automatisch im Hintergrund.
                      </p>
                    </div>

                    {bridgeSteps.map((step, index) => (
                      <div key={step.number} className={`p-4 rounded-lg border ${step.number === 6 ? 'bg-green-50 border-green-200' : 'bg-white border-slate-200'}`}>
                        <div className="flex gap-4">
                          <div className="flex-shrink-0">
                            <div className={`h-10 w-10 rounded-full flex items-center justify-center font-bold text-lg ${
                              step.number === 6 ? 'bg-green-500 text-white' : 'bg-blue-600 text-white'
                            }`}>
                              {step.number === 6 ? <Check className="h-5 w-5" /> : step.number}
                            </div>
                          </div>
                          <div className="flex-1">
                            <h3 className={`font-semibold mb-1 ${step.number === 6 ? 'text-green-800' : 'text-slate-900'}`}>
                              {step.title}
                            </h3>
                            <p className="text-sm text-slate-600 mb-2">{step.description}</p>

                            {/* Command box */}
                            {'command' in step && step.command && (
                              <div className="bg-slate-900 text-green-400 rounded-lg p-3 font-mono text-sm mb-2">
                                <code>{step.command}</code>
                              </div>
                            )}

                            {/* Checklist */}
                            {'checklist' in step && step.checklist && (
                              <ul className="space-y-1 mb-2">
                                {step.checklist.map((item, i) => (
                                  <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
                                    <CheckCircle2 className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                                    {item}
                                  </li>
                                ))}
                              </ul>
                            )}

                            {/* Details text */}
                            {'details' in step && step.details && (
                              <p className="text-xs text-slate-500 italic">{step.details}</p>
                            )}

                            {/* Action buttons */}
                            {step.action && step.icon && (
                              <button
                                onClick={() => {
                                  if ('actionUrl' in step && step.actionUrl) {
                                    window.open(step.actionUrl, '_blank');
                                  } else if (step.number === 3) {
                                    handleBridgeDownload();
                                  }
                                }}
                                disabled={step.number === 3 && bridgeDownloading}
                                className="mt-2 flex items-center gap-2 px-4 py-2 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 transition-colors text-sm disabled:opacity-50"
                              >
                                {step.number === 3 && bridgeDownloading ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <step.icon className="h-4 w-4" />
                                )}
                                {step.number === 3 && bridgeDownloading ? 'Wird heruntergeladen...' : step.action}
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Rooms Mapping Sub-Tab */}
                {bridgeSubTab === 'rooms' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-slate-600">
                        Verknüpfe deine App-Zimmer mit den CapHotel-Zimmern
                      </p>
                      <button
                        onClick={loadCaphotelData}
                        disabled={bridgeLoading}
                        className="flex items-center gap-2 px-3 py-1.5 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 transition-colors text-sm disabled:opacity-50"
                      >
                        {bridgeLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                        Daten laden
                      </button>
                    </div>

                    {caphotelRooms.length === 0 ? (
                      <div className="text-center py-8 bg-slate-50 rounded-lg">
                        <Globe className="h-10 w-10 text-slate-300 mx-auto mb-3" />
                        <p className="text-slate-500 text-sm">Klicke "Daten laden" um Zimmer aus CapHotel zu laden</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {getAllAppRooms().map(appRoom => {
                          const mapping = roomMappings.find(m => m.appRoomId === appRoom.id);
                          return (
                            <div key={appRoom.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                              <div className="flex-1">
                                <div className="font-medium text-slate-900 text-sm">{appRoom.name}</div>
                                <div className="text-xs text-slate-500">{appRoom.categoryName}</div>
                              </div>
                              <ArrowRight className="h-4 w-4 text-slate-400" />
                              <div className="flex-1">
                                {mapping ? (
                                  <div className="flex items-center gap-2">
                                    <div className="flex-1">
                                      <div className="font-medium text-green-700 text-sm flex items-center gap-1">
                                        <Check className="h-3 w-3" />
                                        Zimmer {mapping.caphotelZimm}
                                      </div>
                                      <div className="text-xs text-slate-500">{mapping.caphotelName}</div>
                                    </div>
                                    <button
                                      onClick={() => handleRemoveRoomMapping(appRoom.id)}
                                      className="p-1 text-red-500 hover:bg-red-50 rounded"
                                    >
                                      <Unlink className="h-4 w-4" />
                                    </button>
                                  </div>
                                ) : (
                                  <select
                                    onChange={(e) => {
                                      if (e.target.value) {
                                        const capRoom = caphotelRooms.find(r => r.zimm === parseInt(e.target.value));
                                        if (capRoom) {
                                          handleRoomMapping(appRoom.id, appRoom.name, capRoom.zimm, capRoom.beze);
                                        }
                                      }
                                    }}
                                    className="w-full px-2 py-1.5 border border-slate-300 rounded text-sm"
                                    defaultValue=""
                                  >
                                    <option value="">-- CapHotel Zimmer wählen --</option>
                                    {caphotelRooms
                                      .filter(cr => !roomMappings.some(m => m.caphotelZimm === cr.zimm))
                                      .map(cr => (
                                        <option key={cr.zimm} value={cr.zimm}>
                                          Zimmer {cr.zimm} - {cr.beze}
                                        </option>
                                      ))}
                                  </select>
                                )}
                              </div>
                            </div>
                          );
                        })}

                        {getAllAppRooms().length === 0 && (
                          <div className="text-center py-8 bg-amber-50 rounded-lg">
                            <AlertCircle className="h-10 w-10 text-amber-400 mx-auto mb-3" />
                            <p className="text-amber-700 text-sm">Erstelle zuerst Zimmer unter "Resource"</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Articles Mapping Sub-Tab */}
                {bridgeSubTab === 'articles' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-slate-600">
                        Verknüpfe Artikel für Zusatzverkäufe (E-Bike, Massage, etc.)
                      </p>
                      <button
                        onClick={loadCaphotelData}
                        disabled={bridgeLoading}
                        className="flex items-center gap-2 px-3 py-1.5 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 transition-colors text-sm disabled:opacity-50"
                      >
                        {bridgeLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                        Daten laden
                      </button>
                    </div>

                    {caphotelArticles.length === 0 ? (
                      <div className="text-center py-8 bg-slate-50 rounded-lg">
                        <Globe className="h-10 w-10 text-slate-300 mx-auto mb-3" />
                        <p className="text-slate-500 text-sm">Klicke "Daten laden" um Artikel aus CapHotel zu laden</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {/* Existing mappings */}
                        {articleMappings.map(mapping => (
                          <div key={mapping.appArticleId} className="flex items-center gap-3 p-3 bg-green-50 rounded-lg border border-green-200">
                            <Package className="h-5 w-5 text-green-600" />
                            <div className="flex-1">
                              <div className="font-medium text-green-800 text-sm">{mapping.appArticleName}</div>
                              <div className="text-xs text-green-600">
                                CapHotel: {mapping.caphotelName} (Art. {mapping.caphotelArtn}) - {mapping.price.toFixed(2)} €
                              </div>
                            </div>
                            <button
                              onClick={() => handleRemoveArticleMapping(mapping.appArticleId)}
                              className="p-1 text-red-500 hover:bg-red-50 rounded"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        ))}

                        {/* Available CapHotel articles to add */}
                        <div className="border-t border-slate-200 pt-4 mt-4">
                          <h4 className="text-sm font-medium text-slate-700 mb-3">Verfügbare CapHotel Artikel</h4>
                          <div className="grid grid-cols-2 gap-2">
                            {caphotelArticles
                              .filter(ca => !articleMappings.some(m => m.caphotelArtn === ca.artn))
                              .map(article => (
                                <button
                                  key={article.artn}
                                  onClick={() => {
                                    const id = `art-${article.artn}-${Date.now()}`;
                                    handleArticleMapping(id, article.beze, article.artn, article.beze, article.prei || 0);
                                  }}
                                  className="flex items-center gap-2 p-2 bg-slate-50 hover:bg-slate-100 rounded-lg text-left transition-colors"
                                >
                                  <Plus className="h-4 w-4 text-blue-600" />
                                  <div className="flex-1 min-w-0">
                                    <div className="text-sm font-medium text-slate-900 truncate">{article.beze}</div>
                                    <div className="text-xs text-slate-500">{(article.prei || 0).toFixed(2)} €</div>
                                  </div>
                                </button>
                              ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Sync/Backup Sub-Tab */}
                {bridgeSubTab === 'sync' && (
                  <div className="space-y-6">
                    {/* Sync Status Card */}
                    <div className={`p-4 rounded-lg border ${
                      syncStatus.lastSyncSuccess ? 'bg-green-50 border-green-200' :
                      syncStatus.lastSync ? 'bg-red-50 border-red-200' : 'bg-slate-50 border-slate-200'
                    }`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {syncStatus.lastSyncSuccess ? (
                            <Cloud className="h-8 w-8 text-green-600" />
                          ) : syncStatus.lastSync ? (
                            <CloudOff className="h-8 w-8 text-red-600" />
                          ) : (
                            <Cloud className="h-8 w-8 text-slate-400" />
                          )}
                          <div>
                            <h3 className="font-semibold text-slate-900">
                              {syncStatus.lastSyncSuccess ? 'Backup aktuell' :
                               syncStatus.lastSync ? 'Letzter Sync fehlgeschlagen' : 'Noch kein Backup'}
                            </h3>
                            {syncStatus.lastSync && (
                              <p className="text-sm text-slate-600">
                                Letzter Sync: {new Date(syncStatus.lastSync).toLocaleString('de-DE')}
                              </p>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={performSync}
                          disabled={syncStatus.syncInProgress}
                          className="flex items-center gap-2 px-4 py-2 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 transition-colors disabled:opacity-50"
                        >
                          {syncStatus.syncInProgress ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <RefreshCw className="h-4 w-4" />
                          )}
                          {syncStatus.syncInProgress ? 'Synchronisiere...' : 'Jetzt synchronisieren'}
                        </button>
                      </div>

                      {syncError && (
                        <div className="mt-3 p-2 bg-red-100 rounded text-sm text-red-700">
                          Fehler: {syncError}
                        </div>
                      )}
                    </div>

                    {/* Sync Stats */}
                    {syncStatus.lastSync && (
                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 bg-white border border-slate-200 rounded-lg">
                          <div className="flex items-center gap-2 mb-1">
                            <Database className="h-4 w-4 text-blue-600" />
                            <span className="text-sm text-slate-600">Buchungen</span>
                          </div>
                          <p className="text-2xl font-bold text-slate-900">{syncStatus.bookingsCount}</p>
                        </div>
                        <div className="p-4 bg-white border border-slate-200 rounded-lg">
                          <div className="flex items-center gap-2 mb-1">
                            <Database className="h-4 w-4 text-blue-600" />
                            <span className="text-sm text-slate-600">Gäste</span>
                          </div>
                          <p className="text-2xl font-bold text-slate-900">{syncStatus.guestsCount}</p>
                        </div>
                      </div>
                    )}

                    {/* Auto-Sync Settings */}
                    <div className="p-4 bg-white border border-slate-200 rounded-lg">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h4 className="font-medium text-slate-900">Automatisches Backup</h4>
                          <p className="text-sm text-slate-500">
                            Daten werden automatisch in Firebase gesichert
                          </p>
                        </div>
                        <button
                          onClick={toggleAutoSync}
                          className={`relative w-12 h-6 rounded-full transition-colors ${
                            syncStatus.autoSyncEnabled ? 'bg-blue-600' : 'bg-slate-300'
                          }`}
                        >
                          <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                            syncStatus.autoSyncEnabled ? 'left-7' : 'left-1'
                          }`} />
                        </button>
                      </div>

                      {syncStatus.autoSyncEnabled && (
                        <div className="flex items-center gap-3 pt-3 border-t border-slate-100">
                          <Clock className="h-4 w-4 text-slate-400" />
                          <span className="text-sm text-slate-600">Interval:</span>
                          <select
                            value={syncStatus.autoSyncInterval}
                            onChange={(e) => updateSyncInterval(parseInt(e.target.value))}
                            className="px-2 py-1 border border-slate-300 rounded text-sm"
                          >
                            <option value={5}>Alle 5 Minuten</option>
                            <option value={15}>Alle 15 Minuten</option>
                            <option value={30}>Alle 30 Minuten</option>
                            <option value={60}>Jede Stunde</option>
                          </select>
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <h4 className="font-medium text-blue-900 mb-2">Was wird gesichert?</h4>
                      <ul className="text-sm text-blue-800 space-y-1">
                        <li>• Alle Buchungen und deren Zimmerzuweisungen</li>
                        <li>• Gästedaten (Namen, Adressen, Kontakte)</li>
                        <li>• Kontopositionen (Artikel, Getränke, Essen)</li>
                        <li>• Artikel- und Zimmerstammdaten</li>
                        <li>• Buchungskanäle</li>
                      </ul>
                      <p className="text-xs text-blue-700 mt-3">
                        Die Daten werden verschlüsselt in Firebase gespeichert und können bei Datenverlust wiederhergestellt werden.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Category Drawer */}
      {categoryDrawerOpen && (
        <>
          <div className="fixed inset-0 bg-black/20 z-40" onClick={() => setCategoryDrawerOpen(false)} />
          <div className="fixed top-0 right-0 h-full w-full max-w-md bg-white shadow-2xl z-50">
            <div className="flex items-center justify-between p-6 border-b border-slate-200">
              <h2 className="text-lg font-semibold text-slate-900">
                {editingCategory ? 'Kategorie bearbeiten' : 'Neue Kategorie'}
              </h2>
              <button
                onClick={() => setCategoryDrawerOpen(false)}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="h-5 w-5 text-slate-500" />
              </button>
            </div>
            <div className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Name</label>
                <input
                  type="text"
                  value={newCategory.name}
                  onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
                  placeholder="z.B. Doppelzimmer"
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Beschreibung</label>
                <textarea
                  value={newCategory.description}
                  onChange={(e) => setNewCategory({ ...newCategory, description: e.target.value })}
                  rows={4}
                  placeholder="Beschreibung der Kategorie..."
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                />
              </div>
            </div>
            <div className="absolute bottom-0 left-0 right-0 p-6 border-t border-slate-200 bg-white">
              <button
                onClick={handleSaveCategory}
                disabled={!newCategory.name.trim()}
                className="w-full py-3 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {editingCategory ? 'Speichern' : 'Kategorie erstellen'}
              </button>
            </div>
          </div>
        </>
      )}

      {/* Room Drawer */}
      {roomDrawerOpen && (
        <>
          <div className="fixed inset-0 bg-black/20 z-40" onClick={() => setRoomDrawerOpen(false)} />
          <div className="fixed top-0 right-0 h-full w-full max-w-md bg-white shadow-2xl z-50 flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-slate-200">
              <h2 className="text-lg font-semibold text-slate-900">
                {editingRoom.room ? 'Zimmer bearbeiten' : 'Neues Zimmer'}
              </h2>
              <button
                onClick={() => setRoomDrawerOpen(false)}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="h-5 w-5 text-slate-500" />
              </button>
            </div>

            {/* Page Tabs */}
            <div className="flex border-b border-slate-200">
              <button
                onClick={() => setRoomDrawerPage(1)}
                className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${
                  roomDrawerPage === 1 ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500'
                }`}
              >
                Grunddaten
              </button>
              <button
                onClick={() => setRoomDrawerPage(4)}
                className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${
                  roomDrawerPage === 4 ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500'
                }`}
              >
                Lage
              </button>
              <button
                onClick={() => setRoomDrawerPage(2)}
                className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${
                  roomDrawerPage === 2 ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500'
                }`}
              >
                Ausstattung
              </button>
              <button
                onClick={() => setRoomDrawerPage(3)}
                className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${
                  roomDrawerPage === 3 ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500'
                }`}
              >
                Medien
              </button>
            </div>

            <div className="flex-1 overflow-auto p-6">
              {roomDrawerPage === 1 ? (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Zimmernummer</label>
                      <input
                        type="text"
                        value={newRoom.number || ''}
                        onChange={(e) => setNewRoom({ ...newRoom, number: e.target.value })}
                        placeholder="z.B. 101"
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Zimmername</label>
                      <input
                        type="text"
                        value={newRoom.name || ''}
                        onChange={(e) => setNewRoom({ ...newRoom, name: e.target.value })}
                        placeholder="z.B. Seeblick"
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>

                  {/* Occupancies */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Belegungsmöglichkeiten</label>

                    {/* Existing Occupancies */}
                    {(newRoom.occupancies || []).length > 0 && (
                      <div className="space-y-2 mb-4">
                        {(newRoom.occupancies || []).map((occ) => (
                          <div key={occ.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                            <span className="text-sm text-slate-700">{occ.label}</span>
                            <button
                              onClick={() => handleRemoveOccupancy(occ.id)}
                              className="p-1 text-slate-400 hover:text-red-600 transition-colors"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Add Occupancy */}
                    <div className="p-4 border border-slate-200 rounded-lg space-y-4">
                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <label className="block text-xs text-slate-500 mb-1">Erwachsene</label>
                          <input
                            type="text"
                            inputMode="numeric"
                            value={newOccupancy.adults}
                            onChange={(e) => setNewOccupancy({ ...newOccupancy, adults: e.target.value.replace(/[^0-9]/g, '') })}
                            placeholder="2"
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-slate-500 mb-1">Kinder</label>
                          <input
                            type="text"
                            inputMode="numeric"
                            value={newOccupancy.children}
                            onChange={(e) => setNewOccupancy({ ...newOccupancy, children: e.target.value.replace(/[^0-9]/g, '') })}
                            placeholder="0"
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-slate-500 mb-1">Babys</label>
                          <input
                            type="text"
                            inputMode="numeric"
                            value={newOccupancy.infants}
                            onChange={(e) => setNewOccupancy({ ...newOccupancy, infants: e.target.value.replace(/[^0-9]/g, '') })}
                            placeholder="0"
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                      </div>
                      <button
                        onClick={handleAddOccupancy}
                        className="w-full py-2 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 transition-colors text-sm"
                      >
                        Belegung hinzufügen
                      </button>
                    </div>
                  </div>
                </div>
              ) : roomDrawerPage === 2 ? (
                /* Ausstattung Tab */
                <div className="space-y-6">
                  <p className="text-sm text-slate-500 mb-4">
                    Wähle die Ausstattungsmerkmale für dieses Zimmer aus.
                  </p>

                  {FEATURE_CATEGORIES.map((category) => {
                    const categoryFeatures = AVAILABLE_FEATURES.filter(f => f.category === category.id);
                    const customCategoryFeatures = (newRoom.customFeatures || []).filter(f => f.category === category.id);
                    return (
                      <div key={category.id}>
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="text-sm font-medium text-slate-700">{category.name}</h4>
                          <button
                            type="button"
                            onClick={() => setAddingCustomFeature(category.id)}
                            className="p-1 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                            title="Eigenes Merkmal hinzufügen"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>

                        {/* Custom feature input */}
                        {addingCustomFeature === category.id && (
                          <div className="flex gap-2 mb-3">
                            <input
                              type="text"
                              value={customFeatureName}
                              onChange={(e) => setCustomFeatureName(e.target.value)}
                              onKeyDown={(e) => e.key === 'Enter' && handleAddCustomFeature()}
                              placeholder="Neues Merkmal eingeben..."
                              className="flex-1 px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                              autoFocus
                            />
                            <button
                              type="button"
                              onClick={handleAddCustomFeature}
                              className="px-3 py-2 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 text-sm"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => { setAddingCustomFeature(null); setCustomFeatureName(''); }}
                              className="px-3 py-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 text-sm"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        )}

                        <div className="grid grid-cols-2 gap-2">
                          {/* Standard features */}
                          {categoryFeatures.map((feature) => {
                            const isSelected = (newRoom.features || []).includes(feature.id);
                            return (
                              <button
                                key={feature.id}
                                type="button"
                                onClick={() => {
                                  const currentFeatures = newRoom.features || [];
                                  if (isSelected) {
                                    setNewRoom({
                                      ...newRoom,
                                      features: currentFeatures.filter(f => f !== feature.id)
                                    });
                                  } else {
                                    setNewRoom({
                                      ...newRoom,
                                      features: [...currentFeatures, feature.id]
                                    });
                                  }
                                }}
                                className={`
                                  p-3 rounded-lg text-left text-sm transition-all border
                                  ${isSelected
                                    ? 'bg-blue-50 border-blue-300 text-blue-700'
                                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-slate-300'
                                  }
                                `}
                              >
                                <div className="flex items-center gap-2">
                                  <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${
                                    isSelected ? 'bg-blue-600 border-blue-600' : 'border-slate-300'
                                  }`}>
                                    {isSelected && <Check className="w-3 h-3 text-white" />}
                                  </div>
                                  {feature.name}
                                </div>
                              </button>
                            );
                          })}

                          {/* Custom features for this category */}
                          {customCategoryFeatures.map((feature) => (
                            <div
                              key={feature.id}
                              className="p-3 rounded-lg text-left text-sm border bg-green-50 border-green-300 text-green-700 flex items-center justify-between"
                            >
                              <div className="flex items-center gap-2">
                                <div className="w-4 h-4 rounded border-2 flex items-center justify-center bg-green-600 border-green-600">
                                  <Check className="w-3 h-3 text-white" />
                                </div>
                                {feature.name}
                              </div>
                              <button
                                type="button"
                                onClick={() => handleRemoveCustomFeature(feature.id)}
                                className="p-1 text-green-600 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}

                  {/* Selected Count */}
                  <div className="p-3 bg-blue-50 rounded-lg text-center">
                    <p className="text-sm text-blue-700">
                      {(newRoom.features || []).length + (newRoom.customFeatures || []).length} Ausstattungsmerkmale ausgewählt
                      {(newRoom.customFeatures || []).length > 0 && (
                        <span className="text-green-600 ml-1">
                          ({(newRoom.customFeatures || []).length} individuell)
                        </span>
                      )}
                    </p>
                  </div>
                </div>
              ) : roomDrawerPage === 3 ? (
                /* Medien Tab */
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Beschreibung</label>
                    <textarea
                      value={newRoom.description || ''}
                      onChange={(e) => setNewRoom({ ...newRoom, description: e.target.value })}
                      rows={4}
                      placeholder="Beschreibung des Zimmers..."
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                    />
                  </div>

                  {/* Photos Placeholder */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Fotos</label>
                    <div className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center">
                      <Image className="h-8 w-8 text-slate-400 mx-auto mb-2" />
                      <p className="text-sm text-slate-500">Fotos hochladen</p>
                      <p className="text-xs text-slate-400 mt-1">Kommt bald</p>
                    </div>
                  </div>

                  {/* Videos Placeholder */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Videos</label>
                    <div className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center">
                      <Video className="h-8 w-8 text-slate-400 mx-auto mb-2" />
                      <p className="text-sm text-slate-500">Videos hochladen</p>
                      <p className="text-xs text-slate-400 mt-1">Kommt bald</p>
                    </div>
                  </div>

                  {/* 3D Tours Placeholder */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">3D-Touren</label>
                    <div className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center">
                      <Box className="h-8 w-8 text-slate-400 mx-auto mb-2" />
                      <p className="text-sm text-slate-500">3D-Touren hinzufügen</p>
                      <p className="text-xs text-slate-400 mt-1">Kommt bald</p>
                    </div>
                  </div>
                </div>
              ) : roomDrawerPage === 4 ? (
                /* Lage Tab */
                <div className="space-y-6">
                  <p className="text-sm text-slate-500 mb-4">
                    Ordne dieses Zimmer einem Haus/Gebäude zu.
                  </p>

                  {buildings.length === 0 ? (
                    <div className="py-8 text-center bg-slate-50 rounded-xl">
                      <Home className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                      <p className="text-slate-500">Keine Häuser/Gebäude vorhanden</p>
                      <p className="text-sm text-slate-400 mt-1">
                        Erstelle zuerst Gebäude im Lage-Tab
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {/* Option: Kein Gebäude */}
                      <button
                        type="button"
                        onClick={() => setNewRoom({ ...newRoom, buildingId: undefined })}
                        className={`w-full p-4 rounded-lg text-left transition-all border ${
                          !newRoom.buildingId
                            ? 'bg-blue-50 border-blue-300 text-blue-700'
                            : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${
                            !newRoom.buildingId ? 'bg-blue-100' : 'bg-slate-200'
                          }`}>
                            <Home className={`h-5 w-5 ${!newRoom.buildingId ? 'text-blue-600' : 'text-slate-400'}`} />
                          </div>
                          <div>
                            <div className="font-medium">Kein Gebäude</div>
                            <div className="text-sm opacity-70">Zimmer keinem Gebäude zuordnen</div>
                          </div>
                          {!newRoom.buildingId && (
                            <Check className="h-5 w-5 text-blue-600 ml-auto" />
                          )}
                        </div>
                      </button>

                      {/* Gebäude-Liste */}
                      {buildings.map((building) => {
                        const isSelected = newRoom.buildingId === building.id;
                        return (
                          <button
                            key={building.id}
                            type="button"
                            onClick={() => setNewRoom({ ...newRoom, buildingId: building.id })}
                            className={`w-full p-4 rounded-lg text-left transition-all border ${
                              isSelected
                                ? 'bg-blue-50 border-blue-300 text-blue-700'
                                : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-slate-300'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${
                                isSelected ? 'bg-blue-100' : 'bg-slate-200'
                              }`}>
                                <Home className={`h-5 w-5 ${isSelected ? 'text-blue-600' : 'text-slate-400'}`} />
                              </div>
                              <div>
                                <div className="font-medium">{building.name}</div>
                                {building.description && (
                                  <div className="text-sm opacity-70">{building.description}</div>
                                )}
                              </div>
                              {isSelected && (
                                <Check className="h-5 w-5 text-blue-600 ml-auto" />
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* Current Selection */}
                  {newRoom.buildingId && (
                    <div className="p-3 bg-blue-50 rounded-lg text-center">
                      <p className="text-sm text-blue-700">
                        Zugeordnet: <strong>{buildings.find(b => b.id === newRoom.buildingId)?.name}</strong>
                      </p>
                    </div>
                  )}
                </div>
              ) : null}
            </div>

            <div className="p-6 border-t border-slate-200 bg-white">
              <button
                onClick={handleSaveRoom}
                disabled={!newRoom.number?.trim() || !newRoom.name?.trim()}
                className="w-full py-3 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {editingRoom.room ? 'Speichern' : 'Zimmer erstellen'}
              </button>
            </div>
          </div>
        </>
      )}

      {/* Old Price Drawer removed - now using category-based pricing in Preise sub-tab */}

      {/* Season Drawer with Calendar */}
      {seasonDrawerOpen && (
        <>
          <div className="fixed inset-0 bg-black/20 z-[120]" onClick={() => setSeasonDrawerOpen(false)} />
          <div className="fixed top-0 right-0 h-full w-full max-w-lg bg-white shadow-2xl z-[130] flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-slate-200">
              <h2 className="text-lg font-semibold text-slate-900">
                {editingSeason ? 'Saison bearbeiten' : 'Neue Saison'}
              </h2>
              <button
                onClick={() => setSeasonDrawerOpen(false)}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="h-5 w-5 text-slate-500" />
              </button>
            </div>

            <div className="flex-1 overflow-auto p-6 space-y-6">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Name</label>
                <input
                  type="text"
                  value={newSeason.name}
                  onChange={(e) => setNewSeason({ ...newSeason, name: e.target.value })}
                  placeholder="z.B. Hauptsaison"
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Date Selection Info */}
              <div className="flex gap-4">
                <div
                  className={`flex-1 p-4 rounded-lg border-2 cursor-pointer transition-colors ${
                    selectingDate === 'start'
                      ? 'border-blue-500 bg-blue-50'
                      : newSeason.startDate
                      ? 'border-green-300 bg-green-50'
                      : 'border-slate-200'
                  }`}
                  onClick={() => setSelectingDate('start')}
                >
                  <p className="text-xs text-slate-500 mb-1">Startdatum</p>
                  <p className="font-medium text-slate-900">
                    {newSeason.startDate
                      ? new Date(newSeason.startDate).toLocaleDateString('de-DE', { day: '2-digit', month: 'short', year: 'numeric' })
                      : 'Auswählen...'}
                  </p>
                </div>
                <div
                  className={`flex-1 p-4 rounded-lg border-2 cursor-pointer transition-colors ${
                    selectingDate === 'end'
                      ? 'border-blue-500 bg-blue-50'
                      : newSeason.endDate
                      ? 'border-green-300 bg-green-50'
                      : 'border-slate-200'
                  }`}
                  onClick={() => setSelectingDate('end')}
                >
                  <p className="text-xs text-slate-500 mb-1">Enddatum</p>
                  <p className="font-medium text-slate-900">
                    {newSeason.endDate
                      ? new Date(newSeason.endDate).toLocaleDateString('de-DE', { day: '2-digit', month: 'short', year: 'numeric' })
                      : 'Auswählen...'}
                  </p>
                </div>
              </div>

              {/* Calendar */}
              <div className="bg-slate-50 rounded-xl p-4">
                {/* Month Navigation */}
                <div className="flex items-center justify-between mb-4">
                  <button
                    onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1))}
                    className="p-2 hover:bg-slate-200 rounded-lg transition-colors"
                  >
                    <ChevronLeft className="h-5 w-5 text-slate-600" />
                  </button>
                  <h3 className="font-semibold text-slate-900">
                    {monthNames[calendarMonth.getMonth()]} {calendarMonth.getFullYear()}
                  </h3>
                  <button
                    onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1))}
                    className="p-2 hover:bg-slate-200 rounded-lg transition-colors"
                  >
                    <ChevronRight className="h-5 w-5 text-slate-600" />
                  </button>
                </div>

                {/* Weekday Headers */}
                <div className="grid grid-cols-7 gap-1 mb-2">
                  {['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'].map((day) => (
                    <div key={day} className="text-center text-xs font-medium text-slate-500 py-2">
                      {day}
                    </div>
                  ))}
                </div>

                {/* Calendar Days */}
                <div className="grid grid-cols-7 gap-1">
                  {getDaysInMonth(calendarMonth).map((day, index) => (
                    <div key={index} className="aspect-square">
                      {day ? (
                        <button
                          onClick={() => handleCalendarDayClick(day)}
                          className={`w-full h-full rounded-lg text-sm font-medium transition-all ${
                            isStartDate(day) || isEndDate(day)
                              ? 'bg-blue-600 text-white'
                              : isDateInRange(day)
                              ? 'bg-blue-100 text-blue-700'
                              : 'hover:bg-slate-200 text-slate-700'
                          }`}
                        >
                          {day.getDate()}
                        </button>
                      ) : (
                        <div />
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Hint */}
              <p className="text-sm text-slate-500 text-center">
                {selectingDate === 'start'
                  ? 'Klicke auf das Startdatum der Saison'
                  : 'Klicke auf das Enddatum der Saison'}
              </p>
            </div>

            <div className="p-6 border-t border-slate-200 bg-white">
              <button
                onClick={handleSaveSeason}
                disabled={!newSeason.name.trim() || !newSeason.startDate || !newSeason.endDate}
                className="w-full py-3 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {editingSeason ? 'Speichern' : 'Saison erstellen'}
              </button>
            </div>
          </div>
        </>
      )}

      {/* Rate Drawer - mit Prozent-Eingabe */}
      {rateDrawerOpen && (
        <>
          <div className="fixed inset-0 bg-black/20 z-[140]" onClick={() => { setRateDrawerOpen(false); setEditingRate(null); }} />
          <div className="fixed top-0 right-0 h-full w-full max-w-md bg-white shadow-2xl z-[150] flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-slate-200">
              <h2 className="text-lg font-semibold text-slate-900">
                {editingRate ? 'Rate bearbeiten' : 'Neue Rate'}
              </h2>
              <button
                onClick={() => { setRateDrawerOpen(false); setEditingRate(null); }}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="h-5 w-5 text-slate-500" />
              </button>
            </div>

            <div className="flex-1 overflow-auto p-6 space-y-6">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Name der Rate</label>
                <input
                  type="text"
                  value={newRate.name}
                  onChange={(e) => setNewRate({ ...newRate, name: e.target.value })}
                  placeholder="z.B. Standard, Frühbucher, Last Minute"
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Night Range */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Aufenthaltsdauer</label>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Von Nächte</label>
                    <input
                      type="number"
                      min="1"
                      value={newRate.minNights}
                      onChange={(e) => setNewRate({ ...newRate, minNights: parseInt(e.target.value) || 1 })}
                      className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Bis Nächte (leer = unbegrenzt)</label>
                    <input
                      type="number"
                      min="1"
                      value={newRate.maxNights}
                      onChange={(e) => setNewRate({ ...newRate, maxNights: e.target.value })}
                      placeholder="∞"
                      className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>

              {/* Prices */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-3">Preise pro Nacht</label>

                {/* Erwachsene - Basispreis */}
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg mb-4">
                  <label className="block text-sm font-medium text-blue-800 mb-2">Erwachsene (Basispreis)</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-600 font-medium">€</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={newRate.pricePerAdult}
                      onChange={(e) => setNewRate({ ...newRate, pricePerAdult: e.target.value })}
                      placeholder="0.00"
                      className="w-full pl-8 pr-4 py-3 border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg font-medium"
                    />
                  </div>
                  <p className="text-xs text-blue-600 mt-2">Dieser Preis ist die Basis für alle anderen Preise</p>
                </div>

                {/* Kinder - Prozent vom Erwachsenenpreis */}
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg mb-4">
                  <div className="flex items-center justify-between mb-3">
                    <label className="text-sm font-medium text-green-800">Kinder (% vom Erwachsenenpreis)</label>
                    <button
                      type="button"
                      onClick={addChildPriceTier}
                      className="text-xs text-green-600 hover:text-green-700 font-medium flex items-center gap-1"
                    >
                      <Plus className="h-3 w-3" />
                      Altersgruppe
                    </button>
                  </div>
                  {newRate.childPrices.length === 0 ? (
                    <p className="text-sm text-green-600 text-center py-2">Keine Kinderpreise definiert</p>
                  ) : (
                    <div className="space-y-3">
                      {newRate.childPrices.map((tier) => {
                        const calculatedPrice = newRate.pricePerAdult ? (parseFloat(newRate.pricePerAdult) * (parseFloat(tier.percentage) || 0) / 100).toFixed(2) : '0.00';
                        return (
                          <div key={tier.id} className="bg-white p-3 rounded-lg border border-green-200">
                            <div className="flex items-center gap-2 mb-2">
                              <div className="flex items-center gap-1">
                                <input
                                  type="number"
                                  min="0"
                                  max="17"
                                  value={tier.ageFrom}
                                  onChange={(e) => updateChildPriceTier(tier.id, 'ageFrom', parseInt(e.target.value) || 0)}
                                  className="w-12 px-2 py-1.5 border border-slate-300 rounded text-center text-sm"
                                />
                                <span className="text-slate-400">-</span>
                                <input
                                  type="number"
                                  min="0"
                                  max="17"
                                  value={tier.ageTo}
                                  onChange={(e) => updateChildPriceTier(tier.id, 'ageTo', parseInt(e.target.value) || 0)}
                                  className="w-12 px-2 py-1.5 border border-slate-300 rounded text-center text-sm"
                                />
                                <span className="text-xs text-slate-500">Jahre</span>
                              </div>
                              <div className="flex-1 relative">
                                <input
                                  type="number"
                                  min="0"
                                  max="100"
                                  value={tier.percentage}
                                  onChange={(e) => updateChildPriceTier(tier.id, 'percentage', e.target.value)}
                                  placeholder="50"
                                  className="w-full pr-8 pl-3 py-1.5 border border-slate-300 rounded text-sm text-right"
                                />
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">%</span>
                              </div>
                              <button
                                type="button"
                                onClick={() => removeChildPriceTier(tier.id)}
                                className="p-1 text-red-500 hover:bg-red-50 rounded"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </div>
                            <div className="text-xs text-green-700 text-right">
                              = EUR {calculatedPrice} pro Nacht
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Babys - Prozent vom Erwachsenenpreis */}
                <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <label className="text-sm font-medium text-purple-800">Babys (% vom Erwachsenenpreis)</label>
                    <button
                      type="button"
                      onClick={addInfantPriceTier}
                      className="text-xs text-purple-600 hover:text-purple-700 font-medium flex items-center gap-1"
                    >
                      <Plus className="h-3 w-3" />
                      Altersgruppe
                    </button>
                  </div>
                  {newRate.infantPrices.length === 0 ? (
                    <p className="text-sm text-purple-600 text-center py-2">Keine Babypreise definiert (meist 0%)</p>
                  ) : (
                    <div className="space-y-3">
                      {newRate.infantPrices.map((tier) => {
                        const calculatedPrice = newRate.pricePerAdult ? (parseFloat(newRate.pricePerAdult) * (parseFloat(tier.percentage) || 0) / 100).toFixed(2) : '0.00';
                        return (
                          <div key={tier.id} className="bg-white p-3 rounded-lg border border-purple-200">
                            <div className="flex items-center gap-2 mb-2">
                              <div className="flex items-center gap-1">
                                <input
                                  type="number"
                                  min="0"
                                  max="2"
                                  value={tier.ageFrom}
                                  onChange={(e) => updateInfantPriceTier(tier.id, 'ageFrom', parseInt(e.target.value) || 0)}
                                  className="w-12 px-2 py-1.5 border border-slate-300 rounded text-center text-sm"
                                />
                                <span className="text-slate-400">-</span>
                                <input
                                  type="number"
                                  min="0"
                                  max="2"
                                  value={tier.ageTo}
                                  onChange={(e) => updateInfantPriceTier(tier.id, 'ageTo', parseInt(e.target.value) || 0)}
                                  className="w-12 px-2 py-1.5 border border-slate-300 rounded text-center text-sm"
                                />
                                <span className="text-xs text-slate-500">Jahre</span>
                              </div>
                              <div className="flex-1 relative">
                                <input
                                  type="number"
                                  min="0"
                                  max="100"
                                  value={tier.percentage}
                                  onChange={(e) => updateInfantPriceTier(tier.id, 'percentage', e.target.value)}
                                  placeholder="0"
                                  className="w-full pr-8 pl-3 py-1.5 border border-slate-300 rounded text-sm text-right"
                                />
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">%</span>
                              </div>
                              <button
                                type="button"
                                onClick={() => removeInfantPriceTier(tier.id)}
                                className="p-1 text-red-500 hover:bg-red-50 rounded"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </div>
                            <div className="text-xs text-purple-700 text-right">
                              = EUR {calculatedPrice} pro Nacht
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-slate-200 bg-white">
              <button
                onClick={handleSaveRate}
                disabled={!newRate.name.trim() || !newRate.pricePerAdult}
                className="w-full py-3 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                {editingRate ? 'Änderungen speichern' : 'Rate erstellen'}
              </button>
            </div>
          </div>
        </>
      )}

      {/* Rate Delete Confirmation Drawer */}
      {deleteRateConfirm && (
        <>
          <div className="fixed inset-0 bg-black/20 z-[100]" onClick={() => setDeleteRateConfirm(null)} />
          <div className="fixed top-0 right-0 h-full w-full max-w-sm bg-white shadow-2xl z-[110] flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-slate-200">
              <h2 className="text-lg font-semibold text-slate-900">Rate löschen</h2>
              <button
                onClick={() => setDeleteRateConfirm(null)}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="h-5 w-5 text-slate-500" />
              </button>
            </div>

            <div className="flex-1 p-6">
              <div className="flex items-center justify-center w-16 h-16 mx-auto mb-6 bg-red-100 rounded-full">
                <AlertCircle className="h-8 w-8 text-red-600" />
              </div>
              <div className="text-center">
                <p className="text-lg font-medium text-slate-900 mb-2">
                  Möchten Sie diese Rate wirklich löschen?
                </p>
                <p className="text-slate-600 mb-4">
                  <span className="font-semibold">&quot;{deleteRateConfirm.rateName}&quot;</span>
                </p>
                <p className="text-sm text-slate-500">
                  Diese Aktion kann nicht rückgängig gemacht werden.
                </p>
              </div>
            </div>

            <div className="p-6 border-t border-slate-200 bg-white space-y-3">
              <button
                onClick={confirmDeleteRate}
                className="w-full py-3 border border-red-600 text-red-600 rounded-lg hover:bg-red-50 transition-colors font-medium flex items-center justify-center gap-2"
              >
                <Trash2 className="h-5 w-5" />
                Ja, Rate löschen
              </button>
              <button
                onClick={() => setDeleteRateConfirm(null)}
                className="w-full py-3 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors font-medium"
              >
                Abbrechen
              </button>
            </div>
          </div>
        </>
      )}

      {/* Article Drawer */}
      {articleDrawerOpen && (
        <>
          <div className="fixed inset-0 bg-black/20 z-[80]" onClick={() => { setArticleDrawerOpen(false); setEditingArticle(null); }} />
          <div className="fixed top-0 right-0 h-full w-full max-w-lg bg-white shadow-2xl z-[90] flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-slate-200">
              <h2 className="text-lg font-semibold text-slate-900">
                {editingArticle ? 'Artikel bearbeiten' : 'Neuer Artikel'}
              </h2>
              <button
                onClick={() => { setArticleDrawerOpen(false); setEditingArticle(null); }}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="h-5 w-5 text-slate-500" />
              </button>
            </div>

            <div className="flex-1 overflow-auto p-6 space-y-6">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Artikelname *</label>
                <input
                  type="text"
                  value={newArticle.name || ''}
                  onChange={(e) => setNewArticle({ ...newArticle, name: e.target.value })}
                  placeholder="z.B. Fahrradverleih, Frühstück, Parkplatz"
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Beschreibung</label>
                <textarea
                  value={newArticle.description || ''}
                  onChange={(e) => setNewArticle({ ...newArticle, description: e.target.value })}
                  placeholder="Optionale Beschreibung des Artikels"
                  rows={2}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                />
              </div>

              {/* Price Unit */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Preiseinheit</label>
                <div className="grid grid-cols-2 gap-2">
                  {PRICE_UNITS.map((unit) => (
                    <button
                      key={unit.id}
                      type="button"
                      onClick={() => setNewArticle({ ...newArticle, priceUnit: unit.id })}
                      className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
                        newArticle.priceUnit === unit.id
                          ? 'border-blue-600 bg-blue-50 text-blue-700'
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {unit.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Base Price */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Basispreis</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-medium">€</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={newArticle.basePrice || ''}
                    onChange={(e) => setNewArticle({ ...newArticle, basePrice: parseFloat(e.target.value) || 0 })}
                    placeholder="0.00"
                    className="w-full pl-8 pr-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg font-medium"
                  />
                </div>
              </div>

              {/* Ortstaxe Toggle */}
              <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Euro className="h-5 w-5 text-orange-600" />
                    <div>
                      <p className="font-medium text-orange-900">Ortstaxe</p>
                      <p className="text-xs text-orange-700">Wird automatisch zu Buchungen hinzugefügt</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setNewArticle({
                      ...newArticle,
                      isOrtstaxe: !newArticle.isOrtstaxe,
                      priceUnit: !newArticle.isOrtstaxe ? 'pro_person_nacht' : newArticle.priceUnit
                    })}
                    className={`p-2 rounded-lg transition-colors ${
                      newArticle.isOrtstaxe ? 'bg-orange-200 text-orange-700' : 'bg-white text-slate-400'
                    }`}
                  >
                    {newArticle.isOrtstaxe ? <ToggleRight className="h-6 w-6" /> : <ToggleLeft className="h-6 w-6" />}
                  </button>
                </div>
                {newArticle.isOrtstaxe && (
                  <div className="mt-4 pt-4 border-t border-orange-200">
                    <label className="block text-sm font-medium text-orange-800 mb-2">Mindestalter für Ortstaxe</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="0"
                        max="99"
                        value={newArticle.ortstaxeMinAge || 14}
                        onChange={(e) => setNewArticle({ ...newArticle, ortstaxeMinAge: parseInt(e.target.value) || 14 })}
                        className="w-20 px-3 py-2 border border-orange-300 rounded-lg text-center"
                      />
                      <span className="text-sm text-orange-700">Jahre (Personen ab diesem Alter zahlen Ortstaxe)</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Age-based Pricing Toggle */}
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="font-medium text-green-900">Altersbasierte Preise</p>
                    <p className="text-xs text-green-700">Unterschiedliche Preise nach Altersgruppen</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setNewArticle({ ...newArticle, hasAgePricing: !newArticle.hasAgePricing })}
                    className={`p-2 rounded-lg transition-colors ${
                      newArticle.hasAgePricing ? 'bg-green-200 text-green-700' : 'bg-white text-slate-400'
                    }`}
                  >
                    {newArticle.hasAgePricing ? <ToggleRight className="h-6 w-6" /> : <ToggleLeft className="h-6 w-6" />}
                  </button>
                </div>
                {newArticle.hasAgePricing && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-green-700">Altersgruppen</span>
                      <button
                        type="button"
                        onClick={addArticleAgePriceTier}
                        className="text-xs text-green-600 hover:text-green-700 font-medium flex items-center gap-1"
                      >
                        <Plus className="h-3 w-3" />
                        Hinzufügen
                      </button>
                    </div>
                    {(newArticle.agePrices || []).length === 0 ? (
                      <p className="text-sm text-green-600 text-center py-2">Keine Altersgruppen definiert</p>
                    ) : (
                      <div className="space-y-2">
                        {(newArticle.agePrices || []).map((tier) => (
                          <div key={tier.id} className="bg-white p-3 rounded-lg border border-green-200">
                            <div className="flex items-center gap-2">
                              <input
                                type="number"
                                min="0"
                                max="99"
                                value={tier.ageFrom}
                                onChange={(e) => updateArticleAgePriceTier(tier.id, 'ageFrom', parseInt(e.target.value) || 0)}
                                className="w-14 px-2 py-1.5 border border-slate-300 rounded text-center text-sm"
                              />
                              <span className="text-slate-400">-</span>
                              <input
                                type="number"
                                min="0"
                                max="99"
                                value={tier.ageTo}
                                onChange={(e) => updateArticleAgePriceTier(tier.id, 'ageTo', parseInt(e.target.value) || 0)}
                                className="w-14 px-2 py-1.5 border border-slate-300 rounded text-center text-sm"
                              />
                              <span className="text-xs text-slate-500">Jahre</span>
                              <div className="flex-1 relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">€</span>
                                <input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={tier.price}
                                  onChange={(e) => updateArticleAgePriceTier(tier.id, 'price', parseFloat(e.target.value) || 0)}
                                  className="w-full pl-7 pr-3 py-1.5 border border-slate-300 rounded text-sm"
                                />
                              </div>
                              <button
                                type="button"
                                onClick={() => removeArticleAgePriceTier(tier.id)}
                                className="p-1 text-slate-400 hover:text-red-600"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Seasonal Pricing Toggle */}
              <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="font-medium text-purple-900">Saisonpreise</p>
                    <p className="text-xs text-purple-700">Unterschiedliche Preise je Saison</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const newHasSeasonal = !newArticle.hasSeasonalPricing;
                      setNewArticle({ ...newArticle, hasSeasonalPricing: newHasSeasonal });
                      if (newHasSeasonal && (!newArticle.seasonPrices || newArticle.seasonPrices.length === 0)) {
                        initializeSeasonPrices();
                      }
                    }}
                    className={`p-2 rounded-lg transition-colors ${
                      newArticle.hasSeasonalPricing ? 'bg-purple-200 text-purple-700' : 'bg-white text-slate-400'
                    }`}
                  >
                    {newArticle.hasSeasonalPricing ? <ToggleRight className="h-6 w-6" /> : <ToggleLeft className="h-6 w-6" />}
                  </button>
                </div>
                {newArticle.hasSeasonalPricing && (
                  <div className="space-y-2">
                    {seasons.length === 0 ? (
                      <p className="text-sm text-purple-600 text-center py-2">Keine Saisons definiert - gehe zum Preise-Tab</p>
                    ) : (
                      (newArticle.seasonPrices || []).map((sp) => {
                        const season = seasons.find(s => s.id === sp.seasonId);
                        return season ? (
                          <div key={sp.seasonId} className="bg-white p-3 rounded-lg border border-purple-200">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium text-slate-700">{season.name}</span>
                              <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">€</span>
                                <input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={sp.basePrice}
                                  onChange={(e) => updateSeasonPrice(sp.seasonId, parseFloat(e.target.value) || 0)}
                                  className="w-24 pl-7 pr-3 py-1.5 border border-slate-300 rounded text-sm text-right"
                                />
                              </div>
                            </div>
                          </div>
                        ) : null;
                      })
                    )}
                  </div>
                )}
              </div>

              {/* Active Toggle */}
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                <div>
                  <p className="font-medium text-slate-900">Artikel aktiv</p>
                  <p className="text-xs text-slate-500">Inaktive Artikel werden nicht zur Buchung angeboten</p>
                </div>
                <button
                  type="button"
                  onClick={() => setNewArticle({ ...newArticle, active: !newArticle.active })}
                  className={`p-2 rounded-lg transition-colors ${
                    newArticle.active !== false ? 'bg-green-100 text-green-600' : 'bg-slate-200 text-slate-400'
                  }`}
                >
                  {newArticle.active !== false ? <ToggleRight className="h-6 w-6" /> : <ToggleLeft className="h-6 w-6" />}
                </button>
              </div>
            </div>

            <div className="p-6 border-t border-slate-200 bg-white">
              <button
                onClick={handleSaveArticle}
                disabled={!newArticle.name?.trim()}
                className="w-full py-3 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                {editingArticle ? 'Änderungen speichern' : 'Artikel erstellen'}
              </button>
            </div>
          </div>
        </>
      )}

      {/* Article Delete Confirmation Drawer */}
      {deleteArticleConfirm && (
        <>
          <div className="fixed inset-0 bg-black/20 z-[100]" onClick={() => setDeleteArticleConfirm(null)} />
          <div className="fixed top-0 right-0 h-full w-full max-w-sm bg-white shadow-2xl z-[110] flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-slate-200">
              <h2 className="text-lg font-semibold text-slate-900">Artikel löschen</h2>
              <button
                onClick={() => setDeleteArticleConfirm(null)}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="h-5 w-5 text-slate-500" />
              </button>
            </div>

            <div className="flex-1 p-6">
              <div className="flex items-center justify-center w-16 h-16 mx-auto mb-6 bg-red-100 rounded-full">
                <AlertCircle className="h-8 w-8 text-red-600" />
              </div>
              <div className="text-center">
                <p className="text-lg font-medium text-slate-900 mb-2">
                  Möchten Sie diesen Artikel wirklich löschen?
                </p>
                <p className="text-slate-600 mb-4">
                  <span className="font-semibold">&quot;{deleteArticleConfirm.name}&quot;</span>
                </p>
                <p className="text-sm text-slate-500">
                  Diese Aktion kann nicht rückgängig gemacht werden.
                </p>
              </div>
            </div>

            <div className="p-6 border-t border-slate-200 bg-white space-y-3">
              <button
                onClick={confirmDeleteArticle}
                className="w-full py-3 border border-red-600 text-red-600 rounded-lg hover:bg-red-50 transition-colors font-medium flex items-center justify-center gap-2"
              >
                <Trash2 className="h-5 w-5" />
                Ja, Artikel löschen
              </button>
              <button
                onClick={() => setDeleteArticleConfirm(null)}
                className="w-full py-3 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors font-medium"
              >
                Abbrechen
              </button>
            </div>
          </div>
        </>
      )}

      {/* Fullscreen Pricing Drawer */}
      {pricingFullscreenOpen && (
        <>
          <div className="fixed inset-0 bg-black/20 z-[100]" onClick={() => setPricingFullscreenOpen(false)} />
          <div className="fixed top-0 right-0 h-full w-full bg-white shadow-2xl z-[110] flex flex-col overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-slate-200 bg-white">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Preise & Saisonen</h2>
                <p className="text-slate-500 text-sm">Alle Zimmer und Preise im Überblick</p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => openSeasonDrawer(categories[0]?.id)}
                  className="flex items-center gap-2 px-4 py-2 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
                >
                  <Plus className="h-4 w-4" />
                  Saison hinzufügen
                </button>
                <button
                  onClick={() => setPricingFullscreenOpen(false)}
                  className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-500"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
            </div>

            {/* Content - All rooms in a list */}
            <div className="flex-1 overflow-auto p-6">
              {categories.length === 0 ? (
                <div className="h-full flex items-center justify-center">
                  <div className="text-center">
                    <Bed className="h-16 w-16 text-slate-200 mx-auto mb-4" />
                    <p className="text-slate-500 font-medium">Keine Kategorien vorhanden</p>
                    <p className="text-sm text-slate-400 mt-1">Erstelle zuerst Kategorien und Zimmer</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-8">
                  {categories.map((category) => {
                    const categorySeasons = seasons.filter(s => s.categoryId === category.id);
                    return (
                      <div key={category.id} className="border border-slate-200 rounded-xl overflow-hidden">
                        {/* Category Header */}
                        <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                              <Bed className="h-5 w-5 text-blue-600" />
                            </div>
                            <div>
                              <h3 className="font-semibold text-slate-900">{category.name}</h3>
                              <p className="text-sm text-slate-500">{category.rooms.length} Zimmer • {categorySeasons.length} Saison(en)</p>
                            </div>
                          </div>
                          <button
                            onClick={() => openSeasonDrawer(category.id)}
                            className="flex items-center gap-2 px-3 py-1.5 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 transition-colors text-sm"
                          >
                            <Plus className="h-4 w-4" />
                            Saison
                          </button>
                        </div>

                        {/* Rooms List */}
                        <div className="divide-y divide-slate-100">
                          {category.rooms.length === 0 ? (
                            <div className="p-6 text-center text-slate-400 text-sm">
                              Keine Zimmer in dieser Kategorie
                            </div>
                          ) : (
                            category.rooms.map((room) => (
                              <div key={room.id} className="p-4 hover:bg-slate-50 transition-colors">
                                <div className="flex items-start gap-4">
                                  {/* Room Info */}
                                  <div className="min-w-[160px]">
                                    <div className="font-medium text-slate-900">{room.number || room.name}</div>
                                    {room.number && room.name && room.name !== room.number && (
                                      <div className="text-sm text-slate-500">{room.name}</div>
                                    )}
                                  </div>

                                  {/* Seasons with Prices */}
                                  <div className="flex-1 flex flex-wrap gap-3">
                                    {categorySeasons.length === 0 ? (
                                      <span className="text-sm text-slate-400">Keine Saisonen definiert</span>
                                    ) : (
                                      categorySeasons.map((season) => (
                                        <div
                                          key={season.id}
                                          onClick={() => openSeasonDrawer(category.id, season)}
                                          className="bg-white border border-slate-200 rounded-lg p-3 min-w-[180px] cursor-pointer hover:border-blue-300 hover:shadow-sm transition-all"
                                        >
                                          <div className="flex items-center justify-between mb-2">
                                            <span className="font-medium text-slate-700 text-sm">{season.name}</span>
                                            <Pencil className="h-3 w-3 text-slate-300" />
                                          </div>
                                          <div className="text-xs text-slate-400 mb-2">
                                            {new Date(season.startDate).toLocaleDateString('de-DE', { day: '2-digit', month: 'short' })} - {new Date(season.endDate).toLocaleDateString('de-DE', { day: '2-digit', month: 'short' })}
                                          </div>
                                          {season.rates.length > 0 ? (
                                            <div className="space-y-1">
                                              {season.rates.slice(0, 2).map((rate) => (
                                                <div key={rate.id} className="flex items-center justify-between text-sm">
                                                  <span className="text-slate-500 truncate">{rate.name}</span>
                                                  <span className="font-semibold text-blue-600">€{rate.pricePerAdult.toFixed(0)}</span>
                                                </div>
                                              ))}
                                              {season.rates.length > 2 && (
                                                <div className="text-xs text-slate-400">+{season.rates.length - 2} weitere</div>
                                              )}
                                            </div>
                                          ) : (
                                            <div className="text-xs text-slate-400">Keine Raten</div>
                                          )}
                                        </div>
                                      ))
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Building Drawer */}
      {buildingDrawerOpen && (
        <>
          <div className="fixed inset-0 bg-black/20 z-[60]" onClick={() => setBuildingDrawerOpen(false)} />
          <div className="fixed top-0 right-0 h-full w-full max-w-md bg-white shadow-2xl z-[70] flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-slate-200">
              <h2 className="text-lg font-semibold text-slate-900">
                {editingBuilding ? 'Haus/Gebäude bearbeiten' : 'Neues Haus/Gebäude'}
              </h2>
              <button
                onClick={() => setBuildingDrawerOpen(false)}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="h-5 w-5 text-slate-500" />
              </button>
            </div>

            <div className="flex-1 overflow-auto p-6 space-y-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Name *</label>
                <input
                  type="text"
                  value={newBuilding.name}
                  onChange={(e) => setNewBuilding({ ...newBuilding, name: e.target.value })}
                  placeholder="z.B. Haupthaus, Nebengebäude..."
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Beschreibung</label>
                <textarea
                  value={newBuilding.description}
                  onChange={(e) => setNewBuilding({ ...newBuilding, description: e.target.value })}
                  placeholder="Optionale Beschreibung..."
                  rows={3}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                />
              </div>
            </div>

            <div className="p-6 border-t border-slate-200 bg-white">
              <button
                onClick={() => {
                  if (!newBuilding.name.trim()) return;

                  if (editingBuilding) {
                    setBuildings(buildings.map(b =>
                      b.id === editingBuilding.id
                        ? { ...b, name: newBuilding.name, description: newBuilding.description }
                        : b
                    ));
                  } else {
                    const building: Building = {
                      id: `building-${Date.now()}`,
                      name: newBuilding.name,
                      description: newBuilding.description || undefined
                    };
                    setBuildings([...buildings, building]);
                  }
                  setBuildingDrawerOpen(false);
                }}
                disabled={!newBuilding.name.trim()}
                className="w-full py-3 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {editingBuilding ? 'Speichern' : 'Haus/Gebäude erstellen'}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
