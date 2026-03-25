/**
 * Shared E.164 phone number normalization.
 * All phone numbers stored in the DB should pass through normalizePhoneE164()
 * before insert/update to ensure consistent matching and delivery.
 */

/**
 * Normalize a phone number to E.164 format (+{country_code}{subscriber}).
 *
 * Handles:
 *  - US/CA 10-digit numbers → +1XXXXXXXXXX
 *  - Numbers starting with "00" (international dialing prefix) → +{rest}
 *  - Numbers starting with "+" already → validated & returned
 *  - 11-digit numbers starting with "1" (US/CA with country code) → +1XXXXXXXXXX
 *  - All other 10-15 digit numbers → +{digits}
 *
 * Returns the original string (trimmed) if it cannot be normalized.
 */
export function normalizePhoneE164(value: unknown): string {
  if (value == null || value === "") return "";
  const raw = String(value).trim();
  if (raw === "") return "";

  // Strip all non-digit characters except leading +
  const hasPlus = raw.startsWith("+");
  const digits = raw.replace(/\D/g, "");

  if (digits.length === 0) return raw;

  // Handle "00" international prefix (e.g., 0044xxx → +44xxx)
  if (digits.startsWith("00") && digits.length >= 12) {
    return `+${digits.slice(2)}`;
  }

  // Already has + prefix — validate digit count
  if (hasPlus) {
    if (digits.length >= 10 && digits.length <= 15) {
      return `+${digits}`;
    }
    return raw; // Malformed but keep as-is
  }

  // US/CA: bare 10-digit number → +1 prefix
  if (digits.length === 10) {
    return `+1${digits}`;
  }

  // US/CA: 11 digits starting with 1 → +1XXXXXXXXXX
  if (digits.length === 11 && digits.startsWith("1")) {
    return `+${digits}`;
  }

  // International: 11-15 digits → assume country code is included
  if (digits.length >= 11 && digits.length <= 15) {
    return `+${digits}`;
  }

  // Fallback: return digits only (too short for E.164 but useful for matching)
  return digits;
}

/**
 * Extract just the digits from a phone number for comparison/matching.
 */
export function phoneDigitsOnly(value: unknown): string {
  if (value == null || value === "") return "";
  return String(value).replace(/\D/g, "");
}

/**
 * Validate that a phone string has a plausible number of digits (10-15).
 */
export function isValidPhoneLength(value: unknown): boolean {
  const digits = phoneDigitsOnly(value);
  return digits.length >= 10 && digits.length <= 15;
}
