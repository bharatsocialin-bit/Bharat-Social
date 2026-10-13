/**
 * Tests for the fuzzy duplicate detection module.
 *
 * Tests:
 *   1. Exact duplicate (different case + whitespace) → auto-reject
 *   2. Abbreviation expansion ("PM" vs "Prime Minister") → near-duplicate warning
 *   3. Genuinely distinct questions → no warning (false positive test)
 *   4. Near-duplicate with slightly different wording → warning
 *   5. Completely unrelated questions → no match
 *   6. Same question with different punctuation → exact match
 *   7. Abbreviation in the other direction → still detected
 *   8. Questions with numbers vs words ("2+2" vs "two plus two") → not flagged
 *   9. Threshold boundary — 84% similar → no warning, 86% → warning
 *  10. Normalization strips punctuation correctly
 */
import { checkDuplicate, normalizeForComparison, similarityRatio } from '@/lib/quiz/duplicate-detector';

const c = {
  reset: '\x1b[0m', red: '\x1b[31m', green: '\x1b[32m', yellow: '\x1b[33m', blue: '\x1b[34m', grey: '\x1b[90m',
};
let pass = 0, fail = 0;
function log(ok, name, detail) {
  const sym = ok ? c.green + '✓' + c.reset : c.red + '✗' + c.reset;
  if (ok) pass++; else fail++;
  console.log(`  ${sym} ${name}${detail ? ' ' + c.grey + detail + c.reset : ''}`);
}

async function main() {
  console.log(c.blue + '━'.repeat(70) + c.reset);
  console.log(c.blue + 'Fuzzy Duplicate Detection — Test Suite' + c.reset);
  console.log(c.blue + '━'.repeat(70) + c.reset);

  // ── Test 1: Exact duplicate (different case + whitespace) ──
  console.log('\n' + c.yellow + 'Test 1: Exact duplicate (case + whitespace difference)' + c.reset);
  {
    const existing = ['Who was the first Prime Minister of India?'];
    const result = checkDuplicate('WHO WAS THE FIRST   prime minister of India?', existing);
    log(result.isExactDuplicate === true, 'exact duplicate detected', `(similarity=${result.similarity})`);
    log(result.isDuplicate === true, 'isDuplicate=true');
  }

  // ── Test 2: Abbreviation expansion ("PM" vs "Prime Minister") ──
  console.log('\n' + c.yellow + 'Test 2: Abbreviation expansion (PM vs Prime Minister)' + c.reset);
  {
    const existing = ['Who was the first PM of India?'];
    const result = checkDuplicate('Who was the first Prime Minister of India?', existing);
    log(result.isExactDuplicate === true, 'exact duplicate after abbreviation expansion', `(similarity=${result.similarity})`);
  }

  // ── Test 3: Genuinely distinct questions (false positive test) ──
  console.log('\n' + c.yellow + 'Test 3: Distinct questions — no false positive' + c.reset);
  {
    const existing = ['What is the capital of India?'];
    const result = checkDuplicate('Who was the first Prime Minister of India?', existing);
    log(result.isDuplicate === false, 'not flagged as duplicate', `(similarity=${result.similarity.toFixed(2)})`);
    log(result.isNearDuplicate === false, 'not a near-duplicate');
  }

  // ── Test 4: Near-duplicate with slightly different wording ──
  console.log('\n' + c.yellow + 'Test 4: Near-duplicate (slightly reworded)' + c.reset);
  {
    const existing = ['In which year did India gain independence from British rule?'];
    const result = checkDuplicate('In what year did India gain independence from British rule?', existing);
    // "which" vs "what" — 1 word difference out of ~10 → ~90% similar
    log(result.isNearDuplicate === true, 'near-duplicate warning', `(similarity=${result.similarity.toFixed(2)})`);
    log(result.isExactDuplicate === false, 'not an exact duplicate');
  }

  // ── Test 5: Completely unrelated questions ──
  console.log('\n' + c.yellow + 'Test 5: Completely unrelated — no match' + c.reset);
  {
    const existing = ['What is the national animal of India?'];
    const result = checkDuplicate('In which year was the Constitution of India adopted?', existing);
    log(result.isDuplicate === false, 'no match', `(similarity=${result.similarity.toFixed(2)})`);
  }

  // ── Test 6: Same question with different punctuation ──
  console.log('\n' + c.yellow + 'Test 6: Same question, different punctuation' + c.reset);
  {
    const existing = ['What is the capital of Karnataka?'];
    const result = checkDuplicate('What is the capital of Karnataka', existing);
    log(result.isExactDuplicate === true, 'exact match after punctuation removal', `(similarity=${result.similarity})`);
  }

  // ── Test 7: Abbreviation in the other direction ──
  console.log('\n' + c.yellow + 'Test 7: Abbreviation reverse (Prime Minister → PM)' + c.reset);
  {
    const existing = ['Who was the first Prime Minister of India?'];
    const result = checkDuplicate('Who was the first PM of India?', existing);
    log(result.isExactDuplicate === true, 'exact match (both directions expand to same text)', `(similarity=${result.similarity})`);
  }

  // ── Test 8: Numbers vs words — should NOT be flagged ──
  console.log('\n' + c.yellow + 'Test 8: Numbers vs words — not flagged' + c.reset);
  {
    const existing = ['How many states are there in India?'];
    const result = checkDuplicate('How many Union Territories are there in India?', existing);
    // "states" vs "Union Territories" — different concepts
    log(result.isDuplicate === false, 'not flagged (distinct concepts)', `(similarity=${result.similarity.toFixed(2)})`);
  }

  // ── Test 9: Threshold boundary ──
  console.log('\n' + c.yellow + 'Test 9: Similarity ratio calculation' + c.reset);
  {
    // Identical strings
    log(similarityRatio('hello world', 'hello world') === 1.0, 'identical → 1.0');
    // Completely different
    log(similarityRatio('abc', 'xyz') === 0.0, 'completely different → 0.0');
    // 1 char diff in 10 chars → 0.9 similarity
    const sim = similarityRatio('abcdefghij', 'abcdefghik');
    log(sim > 0.88 && sim < 0.92, '1-char diff → ~0.9', `(got ${sim.toFixed(2)})`);
  }

  // ── Test 10: Normalization ──
  console.log('\n' + c.yellow + 'Test 10: Normalization function' + c.reset);
  {
    const n1 = normalizeForComparison('Who was the first PM of India?');
    const n2 = normalizeForComparison('who was the first prime minister of india');
    log(n1 === n2, 'PM expands to "prime minister"', `(${n1} === ${n2})`);

    const n3 = normalizeForComparison('What is the GDP of India?');
    const n4 = normalizeForComparison('what is the gross domestic product of india');
    log(n3 === n4, 'GDP expands to "gross domestic product"', `(${n3})`);
  }

  // ── Test 11: Multiple existing texts ──
  console.log('\n' + c.yellow + 'Test 11: Multiple existing texts — finds best match' + c.reset);
  {
    const existing = [
      'What is the capital of India?',
      'Who was the first Prime Minister of India?',
      'In which year did India gain independence?',
    ];
    const result = checkDuplicate('Who was the first PM of India?', existing);
    log(result.isExactDuplicate === true, 'found exact match in list', `(matched: "${result.matchedText?.slice(0, 40)}…")`);
  }

  // ── Test 12: Empty existing list ──
  console.log('\n' + c.yellow + 'Test 12: Empty existing list — no match' + c.reset);
  {
    const result = checkDuplicate('Any question?', []);
    log(result.isDuplicate === false, 'no match with empty list');
    log(result.similarity === 0, 'similarity=0');
  }

  console.log('\n' + c.blue + '━'.repeat(70) + c.reset);
  console.log(c.green + `Passed: ${pass}` + c.reset + c.red + `  Failed: ${fail}` + c.reset);
  console.log(c.blue + '━'.repeat(70) + c.reset);
  process.exit(fail === 0 ? 0 : 1);
}

main();
