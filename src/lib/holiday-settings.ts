// Holiday Settings - Firebase Functions
// Speichert und lädt Feiertags-Einstellungen aus Firebase

import { db } from './firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { HolidaySettings, CustomEvent, defaultHolidaySettings } from './holidays';

const SETTINGS_PATH = 'settings';
const SETTINGS_DOC = 'holidaySettings';

/**
 * Lädt die Feiertags-Einstellungen aus Firebase
 */
export async function getHolidaySettings(): Promise<HolidaySettings> {
  try {
    const docRef = doc(db, SETTINGS_PATH, SETTINGS_DOC);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const data = docSnap.data();
      return {
        enableAT: data.enableAT ?? defaultHolidaySettings.enableAT,
        enableDE: data.enableDE ?? defaultHolidaySettings.enableDE,
        enableCH: data.enableCH ?? defaultHolidaySettings.enableCH,
        customEvents: data.customEvents ?? defaultHolidaySettings.customEvents,
      };
    }

    return defaultHolidaySettings;
  } catch (error) {
    console.error('Error getting holiday settings:', error);
    return defaultHolidaySettings;
  }
}

/**
 * Speichert die Feiertags-Einstellungen in Firebase
 */
export async function saveHolidaySettings(settings: HolidaySettings): Promise<boolean> {
  try {
    const docRef = doc(db, SETTINGS_PATH, SETTINGS_DOC);
    await setDoc(docRef, {
      enableAT: settings.enableAT,
      enableDE: settings.enableDE,
      enableCH: settings.enableCH,
      customEvents: settings.customEvents,
      updatedAt: new Date().toISOString()
    });
    return true;
  } catch (error) {
    console.error('Error saving holiday settings:', error);
    return false;
  }
}

/**
 * Fügt ein eigenes Event hinzu
 */
export async function addCustomEvent(event: Omit<CustomEvent, 'id'>): Promise<string | null> {
  try {
    const settings = await getHolidaySettings();
    const newEvent: CustomEvent = {
      ...event,
      id: Date.now().toString(36) + Math.random().toString(36).substr(2, 5)
    };

    settings.customEvents.push(newEvent);
    const success = await saveHolidaySettings(settings);

    return success ? newEvent.id : null;
  } catch (error) {
    console.error('Error adding custom event:', error);
    return null;
  }
}

/**
 * Aktualisiert ein eigenes Event
 */
export async function updateCustomEvent(id: string, updates: Partial<CustomEvent>): Promise<boolean> {
  try {
    const settings = await getHolidaySettings();
    const index = settings.customEvents.findIndex(e => e.id === id);

    if (index === -1) return false;

    settings.customEvents[index] = {
      ...settings.customEvents[index],
      ...updates
    };

    return await saveHolidaySettings(settings);
  } catch (error) {
    console.error('Error updating custom event:', error);
    return false;
  }
}

/**
 * Löscht ein eigenes Event
 */
export async function deleteCustomEvent(id: string): Promise<boolean> {
  try {
    const settings = await getHolidaySettings();
    settings.customEvents = settings.customEvents.filter(e => e.id !== id);
    return await saveHolidaySettings(settings);
  } catch (error) {
    console.error('Error deleting custom event:', error);
    return false;
  }
}
