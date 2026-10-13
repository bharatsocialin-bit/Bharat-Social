/**
 * Quiz Question Bank Audit
 *
 * Checks:
 *   - Total question count + count by category
 *   - Published vs unpublished breakdown
 *   - Duplicate question text detection
 *   - Duplicate option text within a question
 *   - Invalid correctOptionIndex (out of range, or doesn't match a real option)
 *   - Missing explanations
 *   - Placeholder/lorem content
 *   - Each question has exactly 4 options
 *   - Each option has non-empty text
 */
import { db } from '@/lib/db';

interface Issue {
  severity: 'critical' | 'warning' | 'info';
  questionId: string;
  categoryId: string;
  text: string;
  issue: string;
}

async function main() {
  console.log('=== Quiz Question Bank Audit ===\n');

  // 1. Total count
  const total = await db.quizQuestion.count();
  const published = await db.quizQuestion.count({ where: { published: true } });
  const unpublished = await db.quizQuestion.count({ where: { published: false } });
  console.log(`Total questions: ${total}`);
  console.log(`  Published: ${published}`);
  console.log(`  Unpublished: ${unpublished}`);

  // 2. Count by category
  console.log('\n=== Questions by category ===');
  const byCategory = await db.quizQuestion.groupBy({
    by: ['categoryId'],
    _count: { id: true },
    orderBy: { categoryId: 'asc' },
  });
  for (const c of byCategory) {
    const pub = await db.quizQuestion.count({ where: { categoryId: c.categoryId, published: true } });
    console.log(`  ${c.categoryId}: ${c._count.id} total, ${pub} published`);
  }

  // 3. Distinct categories represented
  const categories = byCategory.map((c) => c.categoryId);
  console.log(`\nCategories represented: ${categories.length} / 10 expected`);
  console.log(`  Categories: ${categories.join(', ')}`);

  // 4. Load ALL questions for deep validation
  const allQuestions = await db.quizQuestion.findMany();
  const issues: Issue[] = [];

  for (const q of allQuestions) {
    // Parse options JSON
    let options: Array<{ id: string; text: string }> = [];
    try {
      options = JSON.parse(q.options);
    } catch {
      issues.push({
        severity: 'critical',
        questionId: q.id,
        categoryId: q.categoryId,
        text: q.text.slice(0, 60),
        issue: 'Options JSON is unparseable',
      });
      continue;
    }

    // Check: exactly 4 options
    if (options.length !== 4) {
      issues.push({
        severity: 'critical',
        questionId: q.id,
        categoryId: q.categoryId,
        text: q.text.slice(0, 60),
        issue: `Expected 4 options, got ${options.length}`,
      });
    }

    // Check: correctOptionIndex in range [0, options.length-1]
    if (q.correctOptionIndex < 0 || q.correctOptionIndex >= options.length) {
      issues.push({
        severity: 'critical',
        questionId: q.id,
        categoryId: q.categoryId,
        text: q.text.slice(0, 60),
        issue: `correctOptionIndex ${q.correctOptionIndex} is out of range [0, ${options.length - 1}]`,
      });
    }

    // Check: each option has non-empty text
    for (let i = 0; i < options.length; i++) {
      if (!options[i].text || options[i].text.trim().length === 0) {
        issues.push({
          severity: 'critical',
          questionId: q.id,
          categoryId: q.categoryId,
          text: q.text.slice(0, 60),
          issue: `Option ${i} (${options[i].id}) has empty text`,
        });
      }
    }

    // Check: duplicate option text within a question
    const optionTexts = options.map((o) => o.text.toLowerCase().trim());
    const seen = new Set<string>();
    for (let i = 0; i < optionTexts.length; i++) {
      if (seen.has(optionTexts[i])) {
        issues.push({
          severity: 'warning',
          questionId: q.id,
          categoryId: q.categoryId,
          text: q.text.slice(0, 60),
          issue: `Duplicate option text: "${optionTexts[i]}"`,
        });
      }
      seen.add(optionTexts[i]);
    }

    // Check: missing explanation
    if (!q.explanation || q.explanation.trim().length === 0) {
      issues.push({
        severity: 'critical',
        questionId: q.id,
        categoryId: q.categoryId,
        text: q.text.slice(0, 60),
        issue: 'Missing explanation',
      });
    }

    // Check: placeholder/lorem content
    const placeholderPatterns = [
      /lorem\s+ipsum/i,
      /test\s+question/i,
      /placeholder/i,
      /todo/i,
      /tbd/i,
      /xxx+/i,
      /^option\s+[a-d]$/i,
      /^sample/i,
    ];
    for (const pattern of placeholderPatterns) {
      if (pattern.test(q.text)) {
        issues.push({
          severity: 'warning',
          questionId: q.id,
          categoryId: q.categoryId,
          text: q.text.slice(0, 60),
          issue: `Question text matches placeholder pattern: ${pattern.source}`,
        });
      }
      if (pattern.test(q.explanation)) {
        issues.push({
          severity: 'warning',
          questionId: q.id,
          categoryId: q.categoryId,
          text: q.text.slice(0, 60),
          issue: `Explanation matches placeholder pattern: ${pattern.source}`,
        });
      }
      for (const opt of options) {
        if (pattern.test(opt.text)) {
          issues.push({
            severity: 'warning',
            questionId: q.id,
            categoryId: q.categoryId,
            text: q.text.slice(0, 60),
            issue: `Option "${opt.text}" matches placeholder pattern: ${pattern.source}`,
          });
        }
      }
    }

    // Check: question text too short (< 10 chars)
    if (q.text.trim().length < 10) {
      issues.push({
        severity: 'warning',
        questionId: q.id,
        categoryId: q.categoryId,
        text: q.text.slice(0, 60),
        issue: `Question text too short (${q.text.trim().length} chars)`,
      });
    }
  }

  // 5. Duplicate question text across the bank
  const textMap = new Map<string, string[]>();
  for (const q of allQuestions) {
    const normalized = q.text.toLowerCase().trim().replace(/\s+/g, ' ');
    if (!textMap.has(normalized)) textMap.set(normalized, []);
    textMap.get(normalized)!.push(q.id);
  }
  for (const [text, ids] of textMap) {
    if (ids.length > 1) {
      issues.push({
        severity: 'critical',
        questionId: ids.join(','),
        categoryId: '(multiple)',
        text: text.slice(0, 60),
        issue: `Duplicate question text (${ids.length} copies)`,
      });
    }
  }

  // 6. Report issues
  console.log('\n=== Audit issues found ===');
  if (issues.length === 0) {
    console.log('  ✓ No issues found.');
  } else {
    const critical = issues.filter((i) => i.severity === 'critical');
    const warnings = issues.filter((i) => i.severity === 'warning');
    const info = issues.filter((i) => i.severity === 'info');
    console.log(`  Critical: ${critical.length}`);
    console.log(`  Warnings: ${warnings.length}`);
    console.log(`  Info: ${info.length}`);
    console.log('\n  --- Critical issues (first 20) ---');
    for (const i of critical.slice(0, 20)) {
      console.log(`  [${i.questionId}] ${i.issue}`);
      console.log(`    Q: "${i.text}…"`);
    }
    if (warnings.length > 0) {
      console.log('\n  --- Warnings (first 10) ---');
      for (const i of warnings.slice(0, 10)) {
        console.log(`  [${i.questionId}] ${i.issue}`);
        console.log(`    Q: "${i.text}…"`);
      }
    }
  }

  // 7. Final summary
  console.log('\n=== Summary ===');
  console.log(`Total questions: ${total}`);
  console.log(`Published: ${published}`);
  console.log(`Categories represented: ${categories.length} / 10`);
  console.log(`Critical issues: ${issues.filter((i) => i.severity === 'critical').length}`);
  console.log(`Warnings: ${issues.filter((i) => i.severity === 'warning').length}`);
  console.log(`\n⚠ NOTE: The spec asks for "at least 1,000 distinct questions".`);
  console.log(`  Actual count: ${total}. This is ${total < 1000 ? 'BELOW' : 'AT OR ABOVE'} the target.`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => { console.error(e); process.exit(1); });
