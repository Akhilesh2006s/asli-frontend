/** Shared contact-field checks for admin create/edit forms. */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Digits only after stripping common separators; optional leading +. */
export function normalizePhoneInput(raw: string): string {
  const trimmed = String(raw || '').trim();
  if (!trimmed) return '';
  const hasPlus = trimmed.startsWith('+');
  const digits = trimmed.replace(/\D/g, '');
  if (!digits) return '';
  return hasPlus ? `+${digits}` : digits;
}

/** Allow typing digits, spaces, dashes, parentheses, and one leading +. */
export function sanitizePhoneTyping(raw: string): string {
  const s = String(raw || '');
  let out = '';
  let sawPlus = false;
  for (let i = 0; i < s.length; i += 1) {
    const ch = s[i];
    if (ch === '+' && i === 0 && !sawPlus) {
      out += ch;
      sawPlus = true;
      continue;
    }
    if (/\d/.test(ch) || ch === ' ' || ch === '-' || ch === '(' || ch === ')') {
      out += ch;
    }
  }
  return out.slice(0, 18);
}

export function isValidEmail(value: unknown): boolean {
  const email = String(value || '').trim();
  if (!email || email.length > 254) return false;
  return EMAIL_RE.test(email);
}

/**
 * Indian / international phone: 10–15 digits (country code optional via +).
 * Rejects letters and other junk.
 */
export function isValidPhone(value: unknown): boolean {
  const normalized = normalizePhoneInput(String(value || ''));
  if (!normalized) return false;
  const digits = normalized.replace(/\D/g, '');
  return digits.length >= 10 && digits.length <= 15;
}

export function contactFieldError(fields: {
  email?: string;
  phone?: string;
  requirePhone?: boolean;
}): string | null {
  const email = String(fields.email || '').trim();
  const phone = String(fields.phone || '').trim();
  if (!isValidEmail(email)) {
    return 'Please enter a valid email address (e.g. name@school.com).';
  }
  if (fields.requirePhone !== false) {
    if (!phone) return 'Phone number is required.';
    if (!isValidPhone(phone)) {
      return 'Please enter a valid phone number (10–15 digits; letters are not allowed).';
    }
  } else if (phone && !isValidPhone(phone)) {
    return 'Please enter a valid phone number (10–15 digits; letters are not allowed).';
  }
  return null;
}

/** Digits only, max 6 — for controlled inputs while typing. */
export function sanitizePincodeInput(raw: string): string {
  return String(raw || '').replace(/\D/g, '').slice(0, 6);
}

/**
 * Indian PIN: empty OR exactly 6 digits (first digit 1–9).
 * Does not silently accept longer values by truncating — rejects wrong length.
 */
export function isValidOptionalIndianPincode(raw: unknown): boolean {
  const trimmed = String(raw ?? '').trim();
  if (!trimmed) return true;
  if (!/^\d+$/.test(trimmed)) return false;
  if (trimmed.length !== 6) return false;
  return /^[1-9]\d{5}$/.test(trimmed);
}

/**
 * Optional address lines (door / street / area): empty OK;
 * otherwise allow letters, digits, spaces, and .,'&()-/# ; reject symbol-only junk.
 */
export function isValidOptionalAddressLine(
  raw: unknown,
  options: { max?: number } = {}
): boolean {
  const max = options.max ?? 120;
  const s = String(raw ?? '').trim();
  if (!s) return true;
  if (s.length > max) return false;
  try {
    if (!/[\p{L}\p{N}]/u.test(s)) return false;
    return /^[\p{L}\p{M}\p{N}\s.'&\-()/#]+$/u.test(s);
  } catch {
    if (!/[A-Za-z0-9]/.test(s)) return false;
    return /^[A-Za-z0-9\s.'&\-()/#]+$/.test(s);
  }
}

/**
 * School / city / district labels: must include letters; block symbol-only junk.
 * Allows letters (incl. Indic), marks, digits, spaces, and .,'&()-/
 */
export function isValidSchoolPlaceName(
  raw: unknown,
  options: { min?: number; max?: number } = {}
): boolean {
  const min = options.min ?? 2;
  const max = options.max ?? 120;
  const s = String(raw ?? '').trim();
  if (s.length < min || s.length > max) return false;
  try {
    if (!/\p{L}/u.test(s)) return false;
    return /^[\p{L}\p{M}\p{N}\s.'&\-()/]+$/u.test(s);
  } catch {
    // Environments without Unicode property escapes
    if (!/[A-Za-z]/.test(s)) return false;
    return /^[A-Za-z0-9\s.'&\-()/]+$/.test(s);
  }
}

export function schoolAddressFieldError(fields: {
  schoolName?: string;
  city?: string;
  district?: string;
  pin?: string;
  doorNo?: string;
  street?: string;
  area?: string;
}): string | null {
  if (!isValidSchoolPlaceName(fields.schoolName, { min: 2, max: 200 })) {
    return 'School name must be 2–200 characters and include letters (symbols-only names are not allowed).';
  }
  if (!isValidSchoolPlaceName(fields.city, { min: 2, max: 100 })) {
    return 'City must be 2–100 characters and include letters.';
  }
  if (!isValidSchoolPlaceName(fields.district, { min: 2, max: 100 })) {
    return 'District must be 2–100 characters and include letters.';
  }
  if (!isValidOptionalAddressLine(fields.doorNo)) {
    return 'Door No contains invalid characters. Use letters, numbers, and common punctuation only.';
  }
  if (!isValidOptionalAddressLine(fields.street)) {
    return 'Street contains invalid characters. Use letters, numbers, and common punctuation only.';
  }
  if (!isValidOptionalAddressLine(fields.area)) {
    return 'Area contains invalid characters. Use letters, numbers, and common punctuation only.';
  }
  if (!isValidOptionalIndianPincode(fields.pin)) {
    return 'Pincode must be exactly 6 digits (Indian PIN, e.g. 500001), or left empty. Longer or non-numeric values are not allowed.';
  }
  return null;
}

