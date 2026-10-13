/**
 * Source quality audit: inspect a sample from every category.
 * Verify that source references exist, are appropriate, and support the answers.
 */
import { db } from '@/lib/db';

async function main() {
  console.log('=== Source Quality Audit ===\n');

  const categories = await db.quizQuestion.groupBy({
    by: ['categoryId'],
    _count: { id: true },
    orderBy: { categoryId: 'asc' },
  });

  let totalQuestions = 0;
  let questionsWithSource = 0;
  let questionsWithExplanation = 0;
  const issues: string[] = [];

  for (const cat of categories) {
    console.log(`\n--- ${cat.categoryId} (${cat._count.id} questions) ---`);
    const questions = await db.quizQuestion.findMany({
      where: { categoryId: cat.categoryId },
      select: { id: true, text: true, source: true, explanation: true, correctOptionIndex: true, options: true },
      take: 3, // sample 3 from each
    });

    for (const q of questions) {
      totalQuestions++;
      const opts = JSON.parse(q.options);
      const correctOpt = opts[q.correctOptionIndex];

      // Check source exists
      const hasSource = q.source && q.source.trim().length > 0;
      if (hasSource) questionsWithSource++;

      // Check explanation exists
      const hasExplanation = q.explanation && q.explanation.trim().length > 0;
      if (hasExplanation) questionsWithExplanation++;

      // Check source is not generic/placeholder
      const genericSources = ['wikipedia', 'google', 'internet', 'website', 'unknown', 'n/a'];
      const isGeneric = genericSources.some(g => q.source?.toLowerCase().includes(g));

      // Check source mentions a real institution/organisation
      const realSourcePatterns = [
        /government of india/i, /ministry of/i, /reserve bank/i, /isro/i, /election commission/i,
        /constitution of india/i, /supreme court/i, /parliament/i, /university/i,
        /unesco/i, /iucn/i, /survey of india/i, /archaeological survey/i,
        /sports reference/i, /espncricinfo/i, /icc/i, /ioc/i, /international olympic/i,
        /fi/i, /international hockey/i, /nobel prize/i, /britannica/i, /iit/i,
        /sangeet natak/i, /sahitya akademi/i, /jnanpith/i, /gst council/i,
        /niti aayog/i, /forest survey/i, /wwf/i, /unep/i, /unfccc/i,
        /icmr/i, /bharat biotech/i, /iit/i, /ugc/i, /national museum/i,
        /indian council of historical/i, /gandhi memorial/i, /jallianwala/i,
        /department of tourism/i, /ministry of rural/i, /startup india/i,
        /bombay stock exchange/i, /ministry of finance/i, /ministry of environment/i,
        /ministry of education/i, /national tiger/i, /wildlife institute/i,
        /geological survey/i, /national museum/i, /ramakrishna mission/i,
        /international solar alliance/i, /booker prize/i,
      ];
      const hasRealSource = realSourcePatterns.some(p => p.test(q.source || ''));

      console.log(`  [${q.id}]`);
      console.log(`    Q: ${q.text.slice(0, 80)}...`);
      console.log(`    Correct: ${correctOpt?.text}`);
      console.log(`    Source: ${q.source || '(MISSING)'}`);
      console.log(`    Explanation: ${q.explanation?.slice(0, 80)}...`);
      console.log(`    Source OK: ${hasSource ? '✓' : '✗ MISSING'} | Real institution: ${hasRealSource ? '✓' : '? check'} | Generic: ${isGeneric ? '⚠' : '✓'}`);

      if (!hasSource) issues.push(`[${q.id}] Missing source`);
      if (!hasExplanation) issues.push(`[${q.id}] Missing explanation`);
      if (isGeneric) issues.push(`[${q.id}] Generic source: "${q.source}"`);
      if (!hasRealSource) issues.push(`[${q.id}] Source doesn't reference a recognised institution`);
    }
  }

  console.log('\n=== Source Quality Summary ===');
  console.log(`Total sampled: ${totalQuestions}`);
  console.log(`With source: ${questionsWithSource} / ${totalQuestions} (${Math.round(questionsWithSource / totalQuestions * 100)}%)`);
  console.log(`With explanation: ${questionsWithExplanation} / ${totalQuestions} (${Math.round(questionsWithExplanation / totalQuestions * 100)}%)`);
  console.log(`Issues found: ${issues.length}`);
  if (issues.length > 0) {
    console.log('\n--- Issues ---');
    for (const i of issues) console.log('  ' + i);
  } else {
    console.log('\n  ✓ All sampled questions have sources and explanations.');
  }
}

main().then(() => process.exit(0));
