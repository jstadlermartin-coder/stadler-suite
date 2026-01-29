/**
 * Guest Matching Service
 *
 * Dedupliziert Gäste aus CapCorn/CapHotel durch Abgleich von Email und Telefon.
 * Bei Match: Bestehenden Kunden verknüpfen
 * Bei Neuem: Kundennummer generieren (G100001, G100002...)
 */

import {
  CaphotelGuest,
  DeduplicatedGuest,
  getGuestByLookup,
  getDeduplicatedGuestById,
  saveGuestLookup,
  saveDeduplicatedGuest,
  updateDeduplicatedGuest,
  getNextCustomerNumber
} from './firestore';

// ============ NORMALISIERUNG ============

/**
 * Telefonnummer normalisieren für Matching
 * "0664 123 45 67" → "436641234567"
 * "+43 664 123 45 67" → "436641234567"
 * "0043664/1234567" → "436641234567"
 */
export function normalizePhone(phone: string | undefined | null): string | null {
  if (!phone) return null;

  // Alle Nicht-Ziffern entfernen
  let cleaned = phone.replace(/\D/g, '');

  if (cleaned.length === 0) return null;

  // Österreichische Vorwahl normalisieren
  // 0664... → 43664...
  if (cleaned.startsWith('0') && !cleaned.startsWith('00')) {
    cleaned = '43' + cleaned.slice(1);
  }
  // 0043... → 43...
  else if (cleaned.startsWith('00')) {
    cleaned = cleaned.slice(2);
  }
  // +43... (bereits entfernt durch \D) → 43...
  // Falls Nummer mit 43 beginnt, ist sie bereits normalisiert

  // Mindestlänge für gültige Nummer
  if (cleaned.length < 8) return null;

  return cleaned;
}

/**
 * Email normalisieren für Matching
 * " MAX@Example.COM " → "max@example.com"
 */
export function normalizeEmail(email: string | undefined | null): string | null {
  if (!email) return null;

  const cleaned = email.trim().toLowerCase();

  // Einfache Validierung
  if (!cleaned.includes('@') || cleaned.length < 5) return null;

  return cleaned;
}

// ============ MATCHING RESULT ============

export interface GuestMatchResult {
  guestId: string;        // "G100001"
  customerNumber: number; // 100001
  isNew: boolean;         // Neuer Kunde angelegt?
  matchedBy: 'phone' | 'email' | null; // Wodurch gematched?
}

// ============ FIND OR CREATE ============

/**
 * Hauptfunktion: Gast in der deduplizierten Datenbank finden oder anlegen
 */
export async function findOrCreateGuest(caphotelGuest: CaphotelGuest): Promise<GuestMatchResult> {
  const phoneNormalized = normalizePhone(caphotelGuest.teln);
  const emailNormalized = normalizeEmail(caphotelGuest.mail);

  // 1. Versuche Match über Telefon
  if (phoneNormalized) {
    const phoneLookup = await getGuestByLookup('phone', phoneNormalized);
    if (phoneLookup) {
      // Existierenden Gast gefunden - CapHotel-ID hinzufügen
      await addCaphotelIdToGuest(phoneLookup.guestId, caphotelGuest.gast);
      return {
        guestId: phoneLookup.guestId,
        customerNumber: phoneLookup.customerNumber,
        isNew: false,
        matchedBy: 'phone'
      };
    }
  }

  // 2. Versuche Match über Email
  if (emailNormalized) {
    const emailLookup = await getGuestByLookup('email', emailNormalized);
    if (emailLookup) {
      // Existierenden Gast gefunden - CapHotel-ID hinzufügen
      await addCaphotelIdToGuest(emailLookup.guestId, caphotelGuest.gast);

      // Falls neue Telefonnummer, auch diese speichern
      if (phoneNormalized) {
        const existingGuest = await getDeduplicatedGuestById(emailLookup.guestId);
        if (existingGuest && !existingGuest.phoneNormalized) {
          await updateDeduplicatedGuest(emailLookup.guestId, {
            phone: caphotelGuest.teln,
            phoneNormalized
          });
          await saveGuestLookup('phone', phoneNormalized, emailLookup.guestId, emailLookup.customerNumber);
        }
      }

      return {
        guestId: emailLookup.guestId,
        customerNumber: emailLookup.customerNumber,
        isNew: false,
        matchedBy: 'email'
      };
    }
  }

  // 3. Kein Match - neuen Kunden anlegen
  return await createNewGuest(caphotelGuest, phoneNormalized, emailNormalized);
}

/**
 * Neuen deduplizierten Gast anlegen
 */
async function createNewGuest(
  caphotelGuest: CaphotelGuest,
  phoneNormalized: string | null,
  emailNormalized: string | null
): Promise<GuestMatchResult> {
  // Nächste Kundennummer atomar holen
  const customerNumber = await getNextCustomerNumber();
  const guestId = `G${customerNumber}`;
  const now = new Date().toISOString();

  // Deduplizierten Gast erstellen
  const newGuest: DeduplicatedGuest = {
    id: guestId,
    customerNumber,
    firstName: caphotelGuest.vorn || '',
    lastName: caphotelGuest.nacn || '',
    email: caphotelGuest.mail || undefined,
    phone: caphotelGuest.teln || undefined,
    phoneNormalized: phoneNormalized || undefined,
    emailNormalized: emailNormalized || undefined,
    street: caphotelGuest.stra || undefined,
    postalCode: caphotelGuest.polz || undefined,
    city: caphotelGuest.ortb || undefined,
    country: caphotelGuest.land || undefined,
    caphotelGuestIds: [caphotelGuest.gast],
    totalBookings: 0,
    totalRevenue: 0,
    createdAt: now,
    updatedAt: now
  };

  // In Firestore speichern
  await saveDeduplicatedGuest(newGuest);

  // Lookup-Indizes anlegen
  if (phoneNormalized) {
    await saveGuestLookup('phone', phoneNormalized, guestId, customerNumber);
  }
  if (emailNormalized) {
    await saveGuestLookup('email', emailNormalized, guestId, customerNumber);
  }

  return {
    guestId,
    customerNumber,
    isNew: true,
    matchedBy: null
  };
}

/**
 * CapHotel-ID zu bestehendem Gast hinzufügen
 */
async function addCaphotelIdToGuest(guestId: string, caphotelGuestId: number): Promise<void> {
  const guest = await getDeduplicatedGuestById(guestId);
  if (guest) {
    // Nur hinzufügen wenn nicht bereits vorhanden
    if (!guest.caphotelGuestIds.includes(caphotelGuestId)) {
      await updateDeduplicatedGuest(guestId, {
        caphotelGuestIds: [...guest.caphotelGuestIds, caphotelGuestId],
        updatedAt: new Date().toISOString()
      });
    }
  }
}

// ============ BATCH PROCESSING ============

export interface GuestProcessingResult {
  uniqueGuestsCount: number;     // Anzahl eindeutiger Kunden nach Deduplizierung
  newGuestsCreated: number;      // Neue Kunden angelegt
  existingGuestsMatched: number; // Bestehende Kunden gematched
  matchedByPhone: number;        // Per Telefon gematched
  matchedByEmail: number;        // Per Email gematched
  errors: number;                // Fehler bei Verarbeitung
}

/**
 * Alle Gäste aus einem Sync verarbeiten und deduplizieren
 */
export async function processGuestsWithMatching(
  guests: CaphotelGuest[]
): Promise<GuestProcessingResult> {
  const result: GuestProcessingResult = {
    uniqueGuestsCount: 0,
    newGuestsCreated: 0,
    existingGuestsMatched: 0,
    matchedByPhone: 0,
    matchedByEmail: 0,
    errors: 0
  };

  // Set um eindeutige guestIds zu tracken (innerhalb dieses Batches)
  const processedGuestIds = new Set<string>();

  for (const guest of guests) {
    try {
      const matchResult = await findOrCreateGuest(guest);

      // Zähle nur eindeutige Gäste
      if (!processedGuestIds.has(matchResult.guestId)) {
        processedGuestIds.add(matchResult.guestId);
        result.uniqueGuestsCount++;
      }

      if (matchResult.isNew) {
        result.newGuestsCreated++;
      } else {
        result.existingGuestsMatched++;
        if (matchResult.matchedBy === 'phone') {
          result.matchedByPhone++;
        } else if (matchResult.matchedBy === 'email') {
          result.matchedByEmail++;
        }
      }
    } catch (error) {
      console.error(`Error processing guest ${guest.gast}:`, error);
      result.errors++;
    }
  }

  return result;
}
