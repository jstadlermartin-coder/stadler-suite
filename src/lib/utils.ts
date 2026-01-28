// ============================================================================
// STADLER SUITE - UTILITY FUNCTIONS
// ============================================================================

/**
 * Formatiert eine Kundennummer in das Format K0.000.001
 * @param num - Die Kundennummer als Integer (1, 2, 3, ...)
 * @returns Formatierte Kundennummer (z.B. "K0.000.001")
 */
export function formatCustomerNumber(num: number): string {
  if (!num || num <= 0) return 'K0.000.000';
  const padded = num.toString().padStart(7, '0');
  return `K${padded.slice(0, 1)}.${padded.slice(1, 4)}.${padded.slice(4, 7)}`;
}
// Examples:
// formatCustomerNumber(1)       -> "K0.000.001"
// formatCustomerNumber(12345)   -> "K0.012.345"
// formatCustomerNumber(1234567) -> "K1.234.567"

/**
 * Mapping fuer Verpflegungsarten (Pession)
 */
export const PESSION_LABELS: Record<number, string> = {
  0: 'UE', // Uebernachtung ohne Verpflegung
  1: 'F',  // Fruehstueck
  2: 'HP', // Halbpension
  3: 'VP', // Vollpension
};

/**
 * Formatiert den Pession-Code in lesbaren Text
 */
export function formatPession(code: number | undefined): string {
  if (code === undefined || code === null) return '-';
  return PESSION_LABELS[code] || '-';
}
