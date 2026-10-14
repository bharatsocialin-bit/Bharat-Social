/**
 * Unit tests for the profile validation library (src/lib/profile.ts).
 * Run: bun scripts/test-profile-validation.ts
 * Mirrors the server-side rules — no DB or network needed.
 */

import {
  validateUsername,
  validateLinks,
  validateGender,
  validateDateOfBirth,
  isOnboardingRequired,
  parseStoredLinks,
} from '../src/lib/profile';

let passed = 0;
let failed = 0;

function ok(condition: boolean, name: string) {
  if (condition) {
    passed++;
    console.log(`  ✓ ${name}`);
  } else {
    failed++;
    console.error(`  ✗ ${name}`);
  }
}

// ── Username ─────────────────────────────────────────────────────────────────
console.log('validateUsername:');
ok(validateUsername('ab').ok === false, 'rejects too-short (2 chars)');
ok(validateUsername('a'.repeat(31)).ok === false, 'rejects too-long (31 chars)');
ok(validateUsername('has space').ok === false, 'rejects spaces');
ok(validateUsername('bad-name!').ok === false, 'rejects special characters');
ok(validateUsername('Admin').ok === false, 'rejects reserved word (any case)');
ok(validateUsername('support').ok === false, 'rejects reserved "support"');
ok(validateUsername('Good_Name_1').ok === true, 'accepts letters/numbers/underscore');
ok(validateUsername('Good_Name_1').value === 'good_name_1', 'lowercases the stored value');
ok(validateUsername('').ok === false, 'rejects empty');

// ── Links ────────────────────────────────────────────────────────────────────
console.log('validateLinks:');
ok(validateLinks(undefined).ok === true, 'accepts undefined (clear)');
ok(validateLinks([]).ok === true, 'accepts empty array');
ok(
  validateLinks([{ url: 'https://a.example' }, { url: 'http://b.example', label: 'B' }]).ok === true,
  'accepts http + https with label',
);
ok(
  validateLinks([1, 2, 3, 4, 5].map((i) => ({ url: `https://x${i}.example` }))).ok === false,
  'rejects 5 links (max 4)',
);
ok(validateLinks([{ url: 'not a url' }]).ok === false, 'rejects malformed URL');
ok(validateLinks([{ url: 'ftp://files.example' }]).ok === false, 'rejects non-http(s) scheme');
ok(validateLinks([{ url: 'javascript:alert(1)' }]).ok === false, 'rejects javascript: scheme');
ok(validateLinks([{ url: 'https://ok.example', label: 'x'.repeat(51) }]).ok === false, 'rejects long label');
ok(validateLinks([{ url: `https://x.example/${'a'.repeat(600)}` }]).ok === false, 'rejects long URL');
ok(validateLinks('nope').ok === false, 'rejects non-array payload');
ok(validateLinks([null]).ok === false, 'rejects null entries');

// ── Gender ───────────────────────────────────────────────────────────────────
console.log('validateGender:');
ok(validateGender('female').ok === true, 'accepts female');
ok(validateGender('prefer_not_to_say').ok === true, 'accepts prefer_not_to_say');
ok(validateGender('').ok === true && validateGender('').value === null, 'empty string clears');
ok(validateGender(undefined).ok === true, 'undefined ok');
ok(validateGender('attack helicopter').ok === false, 'rejects non-allowlist value');
ok(validateGender(42).ok === false, 'rejects non-string');

// ── Date of birth ────────────────────────────────────────────────────────────
console.log('validateDateOfBirth:');
ok(validateDateOfBirth(undefined).ok === true, 'undefined ok');
ok(validateDateOfBirth('').ok === true, 'empty ok');
const child = new Date();
child.setUTCFullYear(child.getUTCFullYear() - 10);
ok(validateDateOfBirth(child.toISOString().slice(0, 10)).ok === false, 'rejects 10-year-old (< 13)');
const adult = new Date();
adult.setUTCFullYear(adult.getUTCFullYear() - 25);
ok(validateDateOfBirth(adult.toISOString().slice(0, 10)).ok === true, 'accepts 25-year-old');
ok(validateDateOfBirth('2090-01-01').ok === false, 'rejects future date');
ok(validateDateOfBirth('1990-13-40').ok === false, 'rejects impossible calendar date');
ok(validateDateOfBirth('01/02/1990').ok === false, 'rejects non-ISO format');
ok(validateDateOfBirth(19900101).ok === false, 'rejects non-string');

// ── Onboarding ───────────────────────────────────────────────────────────────
console.log('isOnboardingRequired:');
ok(isOnboardingRequired(null) === true, 'null user → required');
ok(isOnboardingRequired({ onboardedAt: null }) === true, 'null onboardedAt → required');
ok(isOnboardingRequired({ onboardedAt: new Date() }) === false, 'set onboardedAt → not required');

// ── parseStoredLinks ─────────────────────────────────────────────────────────
console.log('parseStoredLinks:');
ok(parseStoredLinks('[]').length === 0, 'empty JSON array');
ok(parseStoredLinks(null as unknown as string).length === 0, 'null → empty');
ok(parseStoredLinks('not json').length === 0, 'invalid JSON → empty');
const parsed = parseStoredLinks(JSON.stringify([{ url: 'https://a.example', label: 'A' }]));
ok(parsed.length === 1 && parsed[0].label === 'A', 'parses stored links');

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
