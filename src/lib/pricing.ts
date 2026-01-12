// ============================================================================
// STADLER SUITE - PREIS-ENGINE
// ============================================================================
// Zentrale Preisberechnung für Angebote und Buchungen
// CapCorn-Preise werden NICHT verwendet - alles kommt aus dieser Engine

import { db } from './firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

// ============================================================================
// TYPEN
// ============================================================================

// Basis-Preise pro Kategorie und Saison
export interface CategoryPrice {
  categoryId: string;
  categoryName: string;
  pricePerNight: number;          // Grundpreis pro Nacht (2 Personen)
  singleSupplement: number;       // Aufpreis Einzelbelegung
  extraPersonPrice: number;       // Preis pro zusätzliche Person
  extraBedPrice: number;          // Zustellbett
}

// Saison mit Preisanpassung
export interface PricingSeason {
  id: string;
  name: string;                   // "Hauptsaison", "Nebensaison", "Weihnachten"
  startDate: string;              // YYYY-MM-DD
  endDate: string;                // YYYY-MM-DD
  priceMultiplier: number;        // 1.0 = normal, 1.2 = +20%, 0.9 = -10%
  minStay?: number;               // Mindestaufenthalt in dieser Saison
  color?: string;                 // Für Kalender-Anzeige
  categoryPrices: CategoryPrice[]; // Preise pro Kategorie in dieser Saison
}

// Buchungsraten (Stornobedingungen)
export interface BookingRate {
  id: string;
  name: string;                   // "Flexibel", "Nicht erstattbar", "Frühbucher"
  description: string;
  discountPercent: number;        // z.B. -15 für 15% günstiger
  cancellationPolicy: string;     // Stornobedingungen Text
  cancellationDays?: number;      // Kostenlose Storno bis X Tage vorher
  prepaymentPercent: number;      // Anzahlung in % (0-100)
  refundable: boolean;
  minDaysAhead?: number;          // Buchung muss X Tage im Voraus sein
  active: boolean;
  sortOrder: number;
}

// Pauschalen / Packages
export interface PricingPackage {
  id: string;
  name: string;                   // "Romantik-Wochenende"
  description: string;
  categoryIds: string[];          // Für welche Kategorien verfügbar
  minNights: number;
  maxNights?: number;
  priceType: 'fixed' | 'per_night' | 'per_person' | 'per_person_night';
  basePrice: number;              // Grundpreis
  includedServices: string[];     // ["Halbpension", "Champagner", "Massage"]
  includedMealPlan?: 'none' | 'breakfast' | 'half_board' | 'full_board';
  validFrom: string;              // YYYY-MM-DD
  validTo: string;                // YYYY-MM-DD
  weekdaysOnly?: number[];        // 0=So, 1=Mo, ..., 6=Sa (leer = alle Tage)
  image?: string;
  active: boolean;
  sortOrder: number;
}

// Rabatte
export interface Discount {
  id: string;
  name: string;                   // "Stammgast-Rabatt", "Frühbucher"
  type: 'percentage' | 'fixed';
  value: number;                  // Prozent oder Fixbetrag
  conditions: {
    minNights?: number;           // Mind. X Nächte
    maxNights?: number;           // Max. X Nächte
    minDaysAhead?: number;        // Mind. X Tage im Voraus
    guestTier?: string[];         // ["gold", "platinum"]
    voucherCode?: string;         // Gutschein-Code
    validFrom?: string;
    validTo?: string;
    categoryIds?: string[];       // Nur für bestimmte Kategorien
  };
  stackable: boolean;             // Mit anderen Rabatten kombinierbar?
  active: boolean;
  sortOrder: number;
}

// Kinderermäßigungen
export interface ChildPricing {
  id: string;
  name: string;                   // "Kleinkind", "Kind", "Jugendlicher"
  ageFrom: number;
  ageTo: number;
  discountPercent: number;        // 100 = gratis, 50 = halber Preis
  freeInParentsBed: boolean;      // Gratis im Elternbett?
  mealPricePercent: number;       // HP/VP Preis in % vom Erwachsenen
}

// Extras / Zusatzleistungen
export interface Extra {
  id: string;
  name: string;                   // "E-Bike", "Massage", "Parkplatz"
  description?: string;
  priceType: 'per_day' | 'per_stay' | 'per_person' | 'per_person_day' | 'fixed';
  price: number;
  capcornArticleId?: number;      // Verknüpfung zu CapCorn
  category: 'mobility' | 'wellness' | 'food' | 'service' | 'other';
  maxQuantity?: number;           // Max. buchbare Anzahl
  requiresAvailability?: boolean; // Verfügbarkeit prüfen (z.B. E-Bikes)
  active: boolean;
  sortOrder: number;
}

// Verpflegungspreise
export interface MealPlanPricing {
  breakfast: {
    adultPrice: number;
    childPrices: { ageFrom: number; ageTo: number; price: number }[];
  };
  halfBoard: {
    adultPrice: number;
    childPrices: { ageFrom: number; ageTo: number; price: number }[];
  };
  fullBoard: {
    adultPrice: number;
    childPrices: { ageFrom: number; ageTo: number; price: number }[];
  };
}

// Gesamte Pricing-Konfiguration
export interface PricingConfig {
  seasons: PricingSeason[];
  rates: BookingRate[];
  packages: PricingPackage[];
  discounts: Discount[];
  childPricing: ChildPricing[];
  extras: Extra[];
  mealPlanPricing: MealPlanPricing;
  updatedAt: string;
}

// ============================================================================
// PREIS-BERECHNUNG
// ============================================================================

export interface PriceCalculationInput {
  categoryId: string;
  checkIn: string;                // YYYY-MM-DD
  checkOut: string;               // YYYY-MM-DD
  adults: number;
  children: { age: number }[];
  mealPlan: 'none' | 'breakfast' | 'half_board' | 'full_board';
  rateId?: string;
  packageId?: string;
  extras?: { extraId: string; quantity: number }[];
  discountCodes?: string[];
  guestTier?: string;
}

export interface PriceBreakdownItem {
  description: string;
  quantity?: number;
  unitPrice?: number;
  total: number;
  type: 'accommodation' | 'meal' | 'extra' | 'discount' | 'package';
}

export interface PriceCalculationResult {
  valid: boolean;
  errorMessage?: string;

  // Zusammenfassung
  nights: number;
  totalPrice: number;
  pricePerNight: number;

  // Details
  breakdown: PriceBreakdownItem[];

  // Angewandte Rabatte
  appliedDiscounts: { name: string; amount: number }[];
  totalDiscount: number;

  // Für CapCorn-Buchung
  positions: { artikel: string; preis: number; artn?: number }[];
}

// Hilfsfunktion: Datum-String zu Date
function parseDate(dateStr: string): Date {
  return new Date(dateStr + 'T00:00:00');
}

// Hilfsfunktion: Nächte berechnen
function calculateNights(checkIn: string, checkOut: string): number {
  const start = parseDate(checkIn);
  const end = parseDate(checkOut);
  return Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
}

// Hilfsfunktion: Saison für ein Datum finden
function findSeasonForDate(date: string, seasons: PricingSeason[]): PricingSeason | null {
  const d = parseDate(date);
  for (const season of seasons) {
    const start = parseDate(season.startDate);
    const end = parseDate(season.endDate);
    if (d >= start && d <= end) {
      return season;
    }
  }
  return null;
}

// Hauptfunktion: Preis berechnen
export function calculatePrice(
  input: PriceCalculationInput,
  config: PricingConfig
): PriceCalculationResult {
  const nights = calculateNights(input.checkIn, input.checkOut);

  if (nights <= 0) {
    return {
      valid: false,
      errorMessage: 'Ungültiger Zeitraum',
      nights: 0,
      totalPrice: 0,
      pricePerNight: 0,
      breakdown: [],
      appliedDiscounts: [],
      totalDiscount: 0,
      positions: []
    };
  }

  const breakdown: PriceBreakdownItem[] = [];
  const positions: { artikel: string; preis: number; artn?: number }[] = [];
  let totalPrice = 0;

  // =========== PAUSCHALE? ===========
  if (input.packageId) {
    const pkg = config.packages.find(p => p.id === input.packageId);
    if (pkg && pkg.active) {
      let packagePrice = pkg.basePrice;

      if (pkg.priceType === 'per_night') {
        packagePrice = pkg.basePrice * nights;
      } else if (pkg.priceType === 'per_person') {
        packagePrice = pkg.basePrice * (input.adults + input.children.length);
      } else if (pkg.priceType === 'per_person_night') {
        packagePrice = pkg.basePrice * (input.adults + input.children.length) * nights;
      }

      breakdown.push({
        description: pkg.name,
        total: packagePrice,
        type: 'package'
      });

      positions.push({
        artikel: pkg.name,
        preis: packagePrice
      });

      totalPrice = packagePrice;

      // Pauschale - keine weiteren Berechnungen für Unterkunft
      return {
        valid: true,
        nights,
        totalPrice,
        pricePerNight: totalPrice / nights,
        breakdown,
        appliedDiscounts: [],
        totalDiscount: 0,
        positions
      };
    }
  }

  // =========== UNTERKUNFT BERECHNEN ===========
  let accommodationTotal = 0;
  const nightDates: string[] = [];

  // Alle Nächte durchgehen
  let currentDate = parseDate(input.checkIn);
  for (let i = 0; i < nights; i++) {
    const dateStr = currentDate.toISOString().split('T')[0];
    nightDates.push(dateStr);

    const season = findSeasonForDate(dateStr, config.seasons);
    if (season) {
      const categoryPrice = season.categoryPrices.find(cp => cp.categoryId === input.categoryId);
      if (categoryPrice) {
        let nightPrice = categoryPrice.pricePerNight * season.priceMultiplier;

        // Einzelbelegung?
        if (input.adults === 1 && input.children.length === 0) {
          nightPrice += categoryPrice.singleSupplement;
        }

        // Zusätzliche Erwachsene?
        if (input.adults > 2) {
          nightPrice += (input.adults - 2) * categoryPrice.extraPersonPrice;
        }

        accommodationTotal += nightPrice;
      }
    }

    currentDate.setDate(currentDate.getDate() + 1);
  }

  if (accommodationTotal > 0) {
    breakdown.push({
      description: `Unterkunft ${nights} Nächte`,
      quantity: nights,
      unitPrice: accommodationTotal / nights,
      total: accommodationTotal,
      type: 'accommodation'
    });

    positions.push({
      artikel: `Zimmer ${nights} Nächte`,
      preis: accommodationTotal
    });

    totalPrice += accommodationTotal;
  }

  // =========== KINDERPREISE ===========
  for (const child of input.children) {
    const childPricing = config.childPricing.find(
      cp => child.age >= cp.ageFrom && child.age <= cp.ageTo
    );

    if (childPricing && childPricing.discountPercent < 100) {
      // Kind zahlt einen Teil
      const childPrice = (accommodationTotal / input.adults) * ((100 - childPricing.discountPercent) / 100);

      breakdown.push({
        description: `Kind ${child.age} Jahre`,
        total: childPrice,
        type: 'accommodation'
      });

      positions.push({
        artikel: `Kind ${child.age}J`,
        preis: childPrice
      });

      totalPrice += childPrice;
    }
    // Wenn discountPercent = 100, ist das Kind gratis
  }

  // =========== VERPFLEGUNG ===========
  if (input.mealPlan !== 'none') {
    let mealTotal = 0;
    const mealPricing = config.mealPlanPricing;

    let adultMealPrice = 0;
    if (input.mealPlan === 'breakfast') {
      adultMealPrice = mealPricing.breakfast.adultPrice;
    } else if (input.mealPlan === 'half_board') {
      adultMealPrice = mealPricing.halfBoard.adultPrice;
    } else if (input.mealPlan === 'full_board') {
      adultMealPrice = mealPricing.fullBoard.adultPrice;
    }

    // Erwachsene
    mealTotal += adultMealPrice * input.adults * nights;

    // Kinder
    for (const child of input.children) {
      let childMealPrice = 0;
      const mealChildPrices = input.mealPlan === 'breakfast'
        ? mealPricing.breakfast.childPrices
        : input.mealPlan === 'half_board'
          ? mealPricing.halfBoard.childPrices
          : mealPricing.fullBoard.childPrices;

      const tier = mealChildPrices.find(t => child.age >= t.ageFrom && child.age <= t.ageTo);
      if (tier) {
        childMealPrice = tier.price;
      }

      mealTotal += childMealPrice * nights;
    }

    if (mealTotal > 0) {
      const mealName = input.mealPlan === 'breakfast' ? 'Frühstück'
        : input.mealPlan === 'half_board' ? 'Halbpension'
        : 'Vollpension';

      breakdown.push({
        description: `${mealName} ${nights} Tage`,
        quantity: nights,
        unitPrice: mealTotal / nights,
        total: mealTotal,
        type: 'meal'
      });

      // HP-Artikel-IDs: 53=Erw, 54=Kind 8-16, 55=Kind 5-7, 56=Kind 0-4
      positions.push({
        artikel: `${mealName} ${input.adults + input.children.length} Pers.`,
        preis: mealTotal,
        artn: input.mealPlan === 'half_board' ? 53 : undefined
      });

      totalPrice += mealTotal;
    }
  }

  // =========== EXTRAS ===========
  if (input.extras && input.extras.length > 0) {
    for (const extraInput of input.extras) {
      const extra = config.extras.find(e => e.id === extraInput.extraId);
      if (extra && extra.active) {
        let extraPrice = extra.price * extraInput.quantity;

        if (extra.priceType === 'per_day') {
          extraPrice = extra.price * extraInput.quantity * nights;
        } else if (extra.priceType === 'per_person') {
          extraPrice = extra.price * extraInput.quantity * (input.adults + input.children.length);
        } else if (extra.priceType === 'per_person_day') {
          extraPrice = extra.price * extraInput.quantity * (input.adults + input.children.length) * nights;
        }

        breakdown.push({
          description: extra.name,
          quantity: extraInput.quantity,
          unitPrice: extra.price,
          total: extraPrice,
          type: 'extra'
        });

        positions.push({
          artikel: extra.name,
          preis: extraPrice,
          artn: extra.capcornArticleId
        });

        totalPrice += extraPrice;
      }
    }
  }

  // =========== RATE (Rabatt für Buchungsart) ===========
  let rateDiscount = 0;
  if (input.rateId) {
    const rate = config.rates.find(r => r.id === input.rateId);
    if (rate && rate.active && rate.discountPercent !== 0) {
      rateDiscount = totalPrice * (rate.discountPercent / 100);

      breakdown.push({
        description: rate.name,
        total: rateDiscount,
        type: 'discount'
      });

      if (rateDiscount !== 0) {
        positions.push({
          artikel: rate.name,
          preis: rateDiscount
        });
      }

      totalPrice += rateDiscount; // rateDiscount ist negativ bei Rabatt
    }
  }

  // =========== WEITERE RABATTE ===========
  const appliedDiscounts: { name: string; amount: number }[] = [];
  let totalDiscount = rateDiscount;

  for (const discount of config.discounts.filter(d => d.active)) {
    // Bedingungen prüfen
    const cond = discount.conditions;

    if (cond.minNights && nights < cond.minNights) continue;
    if (cond.maxNights && nights > cond.maxNights) continue;

    if (cond.voucherCode && !input.discountCodes?.includes(cond.voucherCode)) continue;

    if (cond.guestTier && (!input.guestTier || !cond.guestTier.includes(input.guestTier))) continue;

    if (cond.categoryIds && !cond.categoryIds.includes(input.categoryId)) continue;

    if (cond.validFrom && input.checkIn < cond.validFrom) continue;
    if (cond.validTo && input.checkIn > cond.validTo) continue;

    // Rabatt anwenden
    let discountAmount = 0;
    if (discount.type === 'percentage') {
      discountAmount = -Math.abs(totalPrice * (discount.value / 100));
    } else {
      discountAmount = -Math.abs(discount.value);
    }

    breakdown.push({
      description: discount.name,
      total: discountAmount,
      type: 'discount'
    });

    positions.push({
      artikel: discount.name,
      preis: discountAmount
    });

    appliedDiscounts.push({ name: discount.name, amount: discountAmount });
    totalDiscount += discountAmount;
    totalPrice += discountAmount;

    // Wenn nicht stackable, hier aufhören
    if (!discount.stackable) break;
  }

  return {
    valid: true,
    nights,
    totalPrice: Math.round(totalPrice * 100) / 100,
    pricePerNight: Math.round((totalPrice / nights) * 100) / 100,
    breakdown,
    appliedDiscounts,
    totalDiscount: Math.round(totalDiscount * 100) / 100,
    positions
  };
}

// ============================================================================
// FIRESTORE CRUD
// ============================================================================

const PRICING_DOC = 'settings/pricing';

export async function getPricingConfig(): Promise<PricingConfig | null> {
  try {
    const docRef = doc(db, 'settings', 'pricing');
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return docSnap.data() as PricingConfig;
    }
    return null;
  } catch (error) {
    console.error('Error getting pricing config:', error);
    return null;
  }
}

export async function savePricingConfig(config: PricingConfig): Promise<boolean> {
  try {
    const docRef = doc(db, 'settings', 'pricing');
    await setDoc(docRef, {
      ...config,
      updatedAt: new Date().toISOString()
    });
    return true;
  } catch (error) {
    console.error('Error saving pricing config:', error);
    return false;
  }
}

// Hilfsfunktionen für einzelne Teile
export async function saveSeasons(seasons: PricingSeason[]): Promise<boolean> {
  const config = await getPricingConfig() || getDefaultPricingConfig();
  config.seasons = seasons;
  return savePricingConfig(config);
}

export async function saveRates(rates: BookingRate[]): Promise<boolean> {
  const config = await getPricingConfig() || getDefaultPricingConfig();
  config.rates = rates;
  return savePricingConfig(config);
}

export async function savePackages(packages: PricingPackage[]): Promise<boolean> {
  const config = await getPricingConfig() || getDefaultPricingConfig();
  config.packages = packages;
  return savePricingConfig(config);
}

export async function saveDiscounts(discounts: Discount[]): Promise<boolean> {
  const config = await getPricingConfig() || getDefaultPricingConfig();
  config.discounts = discounts;
  return savePricingConfig(config);
}

export async function saveChildPricing(childPricing: ChildPricing[]): Promise<boolean> {
  const config = await getPricingConfig() || getDefaultPricingConfig();
  config.childPricing = childPricing;
  return savePricingConfig(config);
}

export async function saveExtras(extras: Extra[]): Promise<boolean> {
  const config = await getPricingConfig() || getDefaultPricingConfig();
  config.extras = extras;
  return savePricingConfig(config);
}

export async function saveMealPlanPricing(mealPlanPricing: MealPlanPricing): Promise<boolean> {
  const config = await getPricingConfig() || getDefaultPricingConfig();
  config.mealPlanPricing = mealPlanPricing;
  return savePricingConfig(config);
}

// ============================================================================
// DEFAULT CONFIG
// ============================================================================

export function getDefaultPricingConfig(): PricingConfig {
  return {
    seasons: [],
    rates: [
      {
        id: 'standard',
        name: 'Standard (Flexibel)',
        description: 'Kostenlose Stornierung bis 7 Tage vor Anreise',
        discountPercent: 0,
        cancellationPolicy: 'Kostenlose Stornierung bis 7 Tage vor Anreise. Danach 100% Stornogebühr.',
        cancellationDays: 7,
        prepaymentPercent: 30,
        refundable: true,
        active: true,
        sortOrder: 1
      },
      {
        id: 'non-refundable',
        name: 'Nicht erstattbar (-10%)',
        description: '10% Rabatt, keine Stornierung möglich',
        discountPercent: -10,
        cancellationPolicy: 'Keine Stornierung möglich. Bei Nichtanreise 100% Stornogebühr.',
        prepaymentPercent: 100,
        refundable: false,
        active: true,
        sortOrder: 2
      }
    ],
    packages: [],
    discounts: [],
    childPricing: [
      { id: 'infant', name: 'Kleinkind', ageFrom: 0, ageTo: 2, discountPercent: 100, freeInParentsBed: true, mealPricePercent: 0 },
      { id: 'child-small', name: 'Kind klein', ageFrom: 3, ageTo: 5, discountPercent: 80, freeInParentsBed: false, mealPricePercent: 30 },
      { id: 'child', name: 'Kind', ageFrom: 6, ageTo: 11, discountPercent: 50, freeInParentsBed: false, mealPricePercent: 50 },
      { id: 'teen', name: 'Jugendlicher', ageFrom: 12, ageTo: 17, discountPercent: 20, freeInParentsBed: false, mealPricePercent: 80 }
    ],
    extras: [],
    mealPlanPricing: {
      breakfast: {
        adultPrice: 15,
        childPrices: [
          { ageFrom: 0, ageTo: 2, price: 0 },
          { ageFrom: 3, ageTo: 5, price: 5 },
          { ageFrom: 6, ageTo: 11, price: 8 },
          { ageFrom: 12, ageTo: 17, price: 12 }
        ]
      },
      halfBoard: {
        adultPrice: 35,
        childPrices: [
          { ageFrom: 0, ageTo: 2, price: 0 },
          { ageFrom: 3, ageTo: 5, price: 10 },
          { ageFrom: 6, ageTo: 11, price: 18 },
          { ageFrom: 12, ageTo: 17, price: 28 }
        ]
      },
      fullBoard: {
        adultPrice: 55,
        childPrices: [
          { ageFrom: 0, ageTo: 2, price: 0 },
          { ageFrom: 3, ageTo: 5, price: 15 },
          { ageFrom: 6, ageTo: 11, price: 28 },
          { ageFrom: 12, ageTo: 17, price: 44 }
        ]
      }
    },
    updatedAt: new Date().toISOString()
  };
}
