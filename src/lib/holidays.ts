// Feiertage für Österreich, Deutschland und Schweiz
// Berechnung von beweglichen Feiertagen (Ostern-basiert)

function getEasterDate(year: number): Date {
  // Gauss'sche Osterformel
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function formatDate(date: Date): string {
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `${month}-${day}`;
}

export interface Holiday {
  date: string; // MM-DD format for fixed, or will be calculated for movable
  name: string;
  country: 'AT' | 'DE' | 'CH';
}

// Feste Feiertage (MM-DD Format)
const fixedHolidays: Holiday[] = [
  // Österreich
  { date: '01-01', name: 'Neujahr', country: 'AT' },
  { date: '01-06', name: 'Heilige Drei Könige', country: 'AT' },
  { date: '05-01', name: 'Staatsfeiertag', country: 'AT' },
  { date: '08-15', name: 'Mariä Himmelfahrt', country: 'AT' },
  { date: '10-26', name: 'Nationalfeiertag', country: 'AT' },
  { date: '11-01', name: 'Allerheiligen', country: 'AT' },
  { date: '12-08', name: 'Mariä Empfängnis', country: 'AT' },
  { date: '12-25', name: 'Christtag', country: 'AT' },
  { date: '12-26', name: 'Stefanitag', country: 'AT' },

  // Deutschland
  { date: '01-01', name: 'Neujahr', country: 'DE' },
  { date: '05-01', name: 'Tag der Arbeit', country: 'DE' },
  { date: '10-03', name: 'Tag der Deutschen Einheit', country: 'DE' },
  { date: '12-25', name: '1. Weihnachtstag', country: 'DE' },
  { date: '12-26', name: '2. Weihnachtstag', country: 'DE' },

  // Schweiz
  { date: '01-01', name: 'Neujahr', country: 'CH' },
  { date: '08-01', name: 'Bundesfeiertag', country: 'CH' },
  { date: '12-25', name: 'Weihnachten', country: 'CH' },
  { date: '12-26', name: 'Stephanstag', country: 'CH' },
];

// Bewegliche Feiertage basierend auf Ostern
function getMovableHolidays(year: number): Holiday[] {
  const easter = getEasterDate(year);
  const holidays: Holiday[] = [];

  // Österreich - bewegliche Feiertage
  holidays.push({ date: formatDate(addDays(easter, -2)), name: 'Karfreitag', country: 'AT' });
  holidays.push({ date: formatDate(easter), name: 'Ostersonntag', country: 'AT' });
  holidays.push({ date: formatDate(addDays(easter, 1)), name: 'Ostermontag', country: 'AT' });
  holidays.push({ date: formatDate(addDays(easter, 39)), name: 'Christi Himmelfahrt', country: 'AT' });
  holidays.push({ date: formatDate(addDays(easter, 49)), name: 'Pfingstsonntag', country: 'AT' });
  holidays.push({ date: formatDate(addDays(easter, 50)), name: 'Pfingstmontag', country: 'AT' });
  holidays.push({ date: formatDate(addDays(easter, 60)), name: 'Fronleichnam', country: 'AT' });

  // Deutschland - bewegliche Feiertage
  holidays.push({ date: formatDate(addDays(easter, -2)), name: 'Karfreitag', country: 'DE' });
  holidays.push({ date: formatDate(easter), name: 'Ostersonntag', country: 'DE' });
  holidays.push({ date: formatDate(addDays(easter, 1)), name: 'Ostermontag', country: 'DE' });
  holidays.push({ date: formatDate(addDays(easter, 39)), name: 'Christi Himmelfahrt', country: 'DE' });
  holidays.push({ date: formatDate(addDays(easter, 49)), name: 'Pfingstsonntag', country: 'DE' });
  holidays.push({ date: formatDate(addDays(easter, 50)), name: 'Pfingstmontag', country: 'DE' });

  // Schweiz - bewegliche Feiertage
  holidays.push({ date: formatDate(addDays(easter, -2)), name: 'Karfreitag', country: 'CH' });
  holidays.push({ date: formatDate(easter), name: 'Ostersonntag', country: 'CH' });
  holidays.push({ date: formatDate(addDays(easter, 1)), name: 'Ostermontag', country: 'CH' });
  holidays.push({ date: formatDate(addDays(easter, 39)), name: 'Auffahrt', country: 'CH' });
  holidays.push({ date: formatDate(addDays(easter, 49)), name: 'Pfingstsonntag', country: 'CH' });
  holidays.push({ date: formatDate(addDays(easter, 50)), name: 'Pfingstmontag', country: 'CH' });

  return holidays;
}

export interface CustomEvent {
  id: string;
  date: string; // YYYY-MM-DD format
  name: string;
  color?: string;
}

export interface HolidaySettings {
  enableAT: boolean;
  enableDE: boolean;
  enableCH: boolean;
  customEvents: CustomEvent[];
}

export const defaultHolidaySettings: HolidaySettings = {
  enableAT: true,
  enableDE: false,
  enableCH: false,
  customEvents: [],
};

// Hole alle Feiertage für ein Jahr basierend auf den Einstellungen
export function getHolidaysForYear(year: number, settings: HolidaySettings): Map<string, string[]> {
  const holidayMap = new Map<string, string[]>();

  const allHolidays = [
    ...fixedHolidays,
    ...getMovableHolidays(year),
  ];

  for (const holiday of allHolidays) {
    const shouldInclude =
      (holiday.country === 'AT' && settings.enableAT) ||
      (holiday.country === 'DE' && settings.enableDE) ||
      (holiday.country === 'CH' && settings.enableCH);

    if (shouldInclude) {
      const key = `${year}-${holiday.date}`;
      const existing = holidayMap.get(key) || [];
      const nameWithCountry = `${holiday.name} (${holiday.country})`;
      if (!existing.includes(nameWithCountry)) {
        existing.push(nameWithCountry);
      }
      holidayMap.set(key, existing);
    }
  }

  // Füge eigene Events hinzu
  for (const event of settings.customEvents || []) {
    if (event.date.startsWith(year.toString())) {
      const key = event.date;
      const existing = holidayMap.get(key) || [];
      existing.push(event.name);
      holidayMap.set(key, existing);
    }
  }

  return holidayMap;
}

// Hole Feiertag/Event für ein bestimmtes Datum
export function getHolidayForDate(date: Date, settings: HolidaySettings): string | null {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  const key = `${year}-${month}-${day}`;

  const holidays = getHolidaysForYear(year, settings);
  const names = holidays.get(key);

  if (names && names.length > 0) {
    return names.join(', ');
  }

  return null;
}

// Erweitertes Interface für Feiertag/Event mit Farbe
export interface HolidayInfo {
  name: string;
  color: string | null; // null = Standard-Orange für offizielle Feiertage
  isCustomEvent: boolean;
}

// Hole ALLE Feiertage/Events mit Farbinformation für ein bestimmtes Datum
// Gibt ein Array zurück, da an einem Tag sowohl ein eigenes Event als auch ein Feiertag sein kann
export function getAllHolidayInfoForDate(date: Date, settings: HolidaySettings): HolidayInfo[] {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  const dateKey = `${year}-${month}-${day}`;
  const mmdd = `${month}-${day}`;

  const results: HolidayInfo[] = [];

  // Eigene Events
  for (const event of settings.customEvents || []) {
    if (event.date === dateKey) {
      results.push({
        name: event.name,
        color: event.color || null,
        isCustomEvent: true
      });
    }
  }

  // Offizielle Feiertage
  const allHolidays = [
    ...fixedHolidays,
    ...getMovableHolidays(year),
  ];

  const matchingHolidays: string[] = [];
  for (const holiday of allHolidays) {
    const shouldInclude =
      (holiday.country === 'AT' && settings.enableAT) ||
      (holiday.country === 'DE' && settings.enableDE) ||
      (holiday.country === 'CH' && settings.enableCH);

    if (shouldInclude && holiday.date === mmdd) {
      matchingHolidays.push(`${holiday.name} (${holiday.country})`);
    }
  }

  if (matchingHolidays.length > 0) {
    results.push({
      name: matchingHolidays.join(', '),
      color: null, // Standard-Orange für offizielle Feiertage
      isCustomEvent: false
    });
  }

  return results;
}

// Hole Feiertag/Event mit Farbinformation für ein bestimmtes Datum (erstes Element)
// Für Abwärtskompatibilität - gibt das erste Element zurück oder null
export function getHolidayInfoForDate(date: Date, settings: HolidaySettings): HolidayInfo | null {
  const all = getAllHolidayInfoForDate(date, settings);
  return all.length > 0 ? all[0] : null;
}
