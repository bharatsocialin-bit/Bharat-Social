import type { ProfileLink } from '@/lib/types';

/**
 * Shared profile validation rules (feature: complete profile system).
 *
 * Single source of truth used by BOTH the API routes (server-side
 * enforcement) and the client forms (live feedback). The client copy is
 * convenience only — every rule is re-validated on the server before any
 * database write, per the security requirement.
 *
 * Rules implemented here:
 *   - Username: required, unique (DB), 3–30 chars, [a-zA-Z0-9_] only,
 *     stored lowercase, checked against a small reserved-word list.
 *   - Bio: optional, max 200 characters.
 *   - Links: optional, max 4 entries, each a well-formed http(s) URL with
 *     an optional label.
 *   - Gender: optional, allowlist only.
 *   - Date of birth: optional, must be a real past date, age 13–120.
 *     Collected solely for the platform minimum-age policy; never public.
 *   - Mobile number: intentionally NOT collected during signup/onboarding.
 */

// ── Username ───────────────────────────────────────────────────────────────

export const USERNAME_MIN = 3;
export const USERNAME_MAX = 30;
// Accept mixed case on input; the value is lowercased before storage
// (same behaviour as the original /api/register route).
export const USERNAME_REGEX = /^[a-zA-Z0-9_]{3,30}$/;

/**
 * Names that are reserved for system/safety use and cannot be registered
 * as public usernames (impersonation and route-collision protection).
 * Matching is case-insensitive after lowercasing.
 */
export const RESERVED_USERNAMES = new Set([
  'admin',
  'administrator',
  'administrator_',
  'root',
  'mod',
  'moderator',
  'moderators',
  'support',
  'help',
  'helpdesk',
  'security',
  'official',
  'bharatsocial',
  'bharat_social',
  'bharatsocialin',
  'api',
  'system',
  'staff',
  'team',
  'null',
  'undefined',
  'nobody',
  'everyone',
  'here',
]);

export interface UsernameValidation {
  ok: boolean;
  /** Lowercased, trimmed candidate (only meaningful when ok === true). */
  value: string;
  error?: string;
}

export function validateUsername(raw: unknown): UsernameValidation {
  if (typeof raw !== 'string') {
    return { ok: false, value: '', error: 'Username is required.' };
  }
  const trimmed = raw.trim();
  if (trimmed.length < USERNAME_MIN || trimmed.length > USERNAME_MAX) {
    return {
      ok: false,
      value: trimmed.toLowerCase(),
      error: `Username must be ${USERNAME_MIN}-${USERNAME_MAX} characters long.`,
    };
  }
  if (!USERNAME_REGEX.test(trimmed)) {
    return {
      ok: false,
      value: trimmed.toLowerCase(),
      error: 'Username can only contain letters, numbers, and underscores.',
    };
  }
  const value = trimmed.toLowerCase();
  if (RESERVED_USERNAMES.has(value)) {
    return { ok: false, value, error: 'This username is reserved. Please choose another.' };
  }
  return { ok: true, value };
}

// ── Bio ────────────────────────────────────────────────────────────────────

export const BIO_MAX = 200;

// ── Links ──────────────────────────────────────────────────────────────────

export const LINKS_MAX = 4;
export const LINK_URL_MAX = 500;
export const LINK_LABEL_MAX = 50;

export interface LinksValidation {
  ok: boolean;
  links: ProfileLink[];
  error?: string;
}

/**
 * Validate a client-supplied links payload. Accepts unknown input (it may
 * have crossed the network) and returns a normalised, ordered array —
 * order is preserved so the client can reorder links.
 *
 * Rejects: non-arrays, more than LINKS_MAX entries, non-http(s) URLs,
 * unparseable URLs, overlong URLs/labels, and entries that are not plain
 * objects with string url fields.
 */
export function validateLinks(raw: unknown): LinksValidation {
  if (raw === undefined || raw === null) {
    return { ok: true, links: [] };
  }
  if (!Array.isArray(raw)) {
    return { ok: false, links: [], error: 'Links must be an array.' };
  }
  if (raw.length > LINKS_MAX) {
    return { ok: false, links: [], error: `You can add up to ${LINKS_MAX} links.` };
  }

  const links: ProfileLink[] = [];
  for (const entry of raw) {
    if (typeof entry !== 'object' || entry === null || Array.isArray(entry)) {
      return { ok: false, links: [], error: 'Each link must be an object.' };
    }
    const { url, label } = entry as { url?: unknown; label?: unknown };

    if (typeof url !== 'string' || url.trim() === '') {
      return { ok: false, links: [], error: 'Each link needs a URL.' };
    }
    if (url.length > LINK_URL_MAX) {
      return { ok: false, links: [], error: 'Link URL is too long.' };
    }

    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      return { ok: false, links: [], error: `"${url.slice(0, 60)}" is not a valid URL.` };
    }
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return { ok: false, links: [], error: 'Links must start with http:// or https://.' };
    }

    const cleanLink: ProfileLink = { url: parsed.toString() };
    if (label !== undefined && label !== null && label !== '') {
      if (typeof label !== 'string') {
        return { ok: false, links: [], error: 'Link label must be text.' };
      }
      if (label.trim().length > LINK_LABEL_MAX) {
        return { ok: false, links: [], error: `Link label is too long (max ${LINK_LABEL_MAX} characters).` };
      }
      cleanLink.label = label.trim();
    }
    links.push(cleanLink);
  }
  return { ok: true, links };
}

/** Parse the stored JSON links column defensively. */
export function parseStoredLinks(raw: string | null | undefined): ProfileLink[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const { ok, links } = validateLinks(parsed);
    return ok ? links : [];
  } catch {
    return [];
  }
}

// ── Gender ─────────────────────────────────────────────────────────────────

export const GENDER_OPTIONS = [
  { value: 'female', label: 'Female' },
  { value: 'male', label: 'Male' },
  { value: 'non_binary', label: 'Non-binary' },
  { value: 'prefer_not_to_say', label: 'Prefer not to say' },
] as const;

export function validateGender(raw: unknown): { ok: boolean; value: string | null; error?: string } {
  if (raw === undefined || raw === null || raw === '') return { ok: true, value: null };
  if (typeof raw !== 'string') return { ok: false, value: null, error: 'Invalid gender value.' };
  const value = raw.trim().toLowerCase();
  if (value === '') return { ok: true, value: null };
  if (!GENDER_OPTIONS.some((g) => g.value === value)) {
    return { ok: false, value: null, error: 'Please choose a gender option from the list.' };
  }
  return { ok: true, value };
}

// ── Date of birth / minimum-age policy ─────────────────────────────────────

/**
 * Minimum age required by the platform's age policy. BharatSocial is a
 * general-audience community for India; accounts require a minimum age of
 * 13 (aligned with mainstream Indian platforms). Raise this constant if
 * the policy changes.
 */
export const MIN_AGE_YEARS = 13;
const MAX_AGE_YEARS = 120;
export const DOB_MIN_YEAR = new Date().getUTCFullYear() - MAX_AGE_YEARS;

export interface DobValidation {
  ok: boolean;
  date: Date | null;
  error?: string;
}

function calculateAge(dob: Date, now: Date): number {
  let age = now.getUTCFullYear() - dob.getUTCFullYear();
  const monthDiff = now.getUTCMonth() - dob.getUTCMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getUTCDate() < dob.getUTCDate())) {
    age--;
  }
  return age;
}

/**
 * Validate a date-of-birth string ("YYYY-MM-DD" from <input type="date">).
 *
 * Why we ask (shown to the user in the UI): to verify the account meets the
 * platform minimum-age requirement. The value is validated on the server,
 * stored privately, and never included in public API responses.
 */
export function validateDateOfBirth(raw: unknown): DobValidation {
  if (raw === undefined || raw === null || raw === '') {
    return { ok: true, date: null };
  }
  if (typeof raw !== 'string') {
    return { ok: false, date: null, error: 'Invalid date of birth.' };
  }
  const trimmed = raw.trim();
  if (trimmed === '') return { ok: true, date: null };

  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return { ok: false, date: null, error: 'Date of birth must be in YYYY-MM-DD format.' };
  }

  const dob = new Date(`${trimmed}T00:00:00.000Z`);
  if (Number.isNaN(dob.getTime()) || dob.toISOString().slice(0, 10) !== trimmed) {
    return { ok: false, date: null, error: 'Please enter a real calendar date.' };
  }

  const now = new Date();
  if (dob.getTime() > now.getTime()) {
    return { ok: false, date: null, error: 'Date of birth cannot be in the future.' };
  }

  const age = calculateAge(dob, now);
  if (age < MIN_AGE_YEARS) {
    return {
      ok: false,
      date: null,
      error:
        `BharatSocial requires a minimum age of ${MIN_AGE_YEARS}. ` +
        'You cannot register with this date of birth.',
    };
  }
  if (age > MAX_AGE_YEARS) {
    return { ok: false, date: null, error: 'Please enter a valid date of birth.' };
  }
  return { ok: true, date: dob };
}

// ── Onboarding completeness ────────────────────────────────────────────────

/**
 * The ONLY required onboarding field is the username (every user already
 * has one — auto-generated for OAuth users). A user with `onboardedAt`
 * set has completed the "Complete your profile" flow at least once.
 */
export function isOnboardingRequired(user: { onboardedAt: Date | string | null } | null | undefined): boolean {
  if (!user) return true;
  return user.onboardedAt == null;
}

// ── Indian states (for the optional State field) ───────────────────────────

export const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Delhi', 'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jammu and Kashmir',
  'Jharkhand', 'Karnataka', 'Kerala', 'Ladakh', 'Madhya Pradesh', 'Maharashtra',
  'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Puducherry',
  'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura',
  'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
] as const;
