import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/auth/requireAdmin';

// ── PATCH /api/admin/quiz-questions/[id] ──────────────────────────────────
// Admin-only: edit a quiz question. Supports:
//   - editing any field
//   - publishing / unpublishing (toggle the `published` flag)
//
// Body: any subset of the fields accepted by POST. Fields not included
// in the body are left unchanged.
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const [admin, error] = await requireAdmin();
  if (error) return error;

  try {
    const { id } = await params;
    const body = await request.json();

    const existing = await db.quizQuestion.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Question not found.' }, { status: 404 });
    }

    const update: Record<string, unknown> = {};

    if (body.categoryId !== undefined) {
      if (typeof body.categoryId !== 'string' || body.categoryId.length === 0) {
        return NextResponse.json({ error: 'Invalid categoryId.' }, { status: 400 });
      }
      update.categoryId = body.categoryId;
    }

    if (body.text !== undefined) {
      if (typeof body.text !== 'string' || body.text.trim().length === 0) {
        return NextResponse.json({ error: 'Question text cannot be empty.' }, { status: 400 });
      }
      if (body.text.length > 1000) {
        return NextResponse.json({ error: 'Question text too long.' }, { status: 400 });
      }
      update.text = body.text.trim();
    }

    if (body.translations !== undefined) {
      update.translations = JSON.stringify(body.translations || {});
    }

    if (body.options !== undefined) {
      if (!Array.isArray(body.options) || body.options.length < 2 || body.options.length > 6) {
        return NextResponse.json({ error: 'Options must be 2-6 items.' }, { status: 400 });
      }
      for (const opt of body.options) {
        if (!opt.id || !opt.text) {
          return NextResponse.json({ error: 'Each option needs id + text.' }, { status: 400 });
        }
      }
      update.options = JSON.stringify(body.options);

      // If options changed, the client must ALSO pass correctOptionId and
      // we re-compute the index.
      if (body.correctOptionId !== undefined) {
        const idx = body.options.findIndex((o: { id: string }) => o.id === body.correctOptionId);
        if (idx < 0) {
          return NextResponse.json(
            { error: 'correctOptionId must match one of the option ids.' },
            { status: 400 },
          );
        }
        update.correctOptionIndex = idx;
      }
    } else if (body.correctOptionId !== undefined) {
      // Options unchanged but the admin wants to change the correct option.
      const opts = JSON.parse(existing.options) as Array<{ id: string }>;
      const idx = opts.findIndex((o) => o.id === body.correctOptionId);
      if (idx < 0) {
        return NextResponse.json(
          { error: 'correctOptionId must match one of the existing option ids.' },
          { status: 400 },
        );
      }
      update.correctOptionIndex = idx;
    }

    if (body.explanation !== undefined) {
      if (typeof body.explanation !== 'string' || body.explanation.trim().length === 0) {
        return NextResponse.json({ error: 'Explanation cannot be empty.' }, { status: 400 });
      }
      update.explanation = body.explanation.trim();
    }
    if (body.explanationTranslations !== undefined) {
      update.explanationTranslations = JSON.stringify(body.explanationTranslations || {});
    }
    if (body.source !== undefined) {
      update.source = typeof body.source === 'string' ? body.source.trim() || null : null;
    }
    if (body.difficulty !== undefined) {
      if (!['easy', 'medium', 'hard'].includes(body.difficulty)) {
        return NextResponse.json({ error: 'Invalid difficulty.' }, { status: 400 });
      }
      update.difficulty = body.difficulty;
    }
    if (body.language !== undefined) {
      update.language = body.language;
    }
    if (body.timeLimitSeconds !== undefined) {
      const t = Number(body.timeLimitSeconds);
      if (!Number.isFinite(t) || t < 0 || t > 600) {
        return NextResponse.json({ error: 'timeLimitSeconds must be 0-600.' }, { status: 400 });
      }
      update.timeLimitSeconds = t || null;
    }
    if (body.published !== undefined) {
      update.published = body.published === true;
    }

    if (Object.keys(update).length === 0) {
      return NextResponse.json({ error: 'No fields to update.' }, { status: 400 });
    }

    const updated = await db.quizQuestion.update({
      where: { id },
      data: update,
    });

    // Audit the publish/unpublish action — those are the high-stakes ones.
    if (update.published !== undefined) {
      await db.moderationAction.create({
        data: {
          adminId: admin!.id,
          action: update.published ? 'quiz_question_published' : 'quiz_question_unpublished',
          description: `Question ${id} ${update.published ? 'published' : 'unpublished'} by @${admin!.username}`,
        },
      });
    }

    return NextResponse.json({
      question: {
        id: updated.id,
        published: updated.published,
        text: updated.text.slice(0, 100),
      },
    });
  } catch (e) {
    console.error('Admin quiz question update error:', e);
    return NextResponse.json({ error: 'Failed to update question.' }, { status: 500 });
  }
}

// ── DELETE /api/admin/quiz-questions/[id] ─────────────────────────────────
// Admin-only: hard-delete a question. This is irreversible.
// (We hard-delete rather than soft-delete because questions are referenced
// by historical attempts — if a question is deleted, those attempts still
// hold the question ID + the user's selected option index in their JSON,
// they just can't be re-rendered. The attempt's score was computed at submit
// time and is preserved.)
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const [admin, error] = await requireAdmin();
  if (error) return error;

  try {
    const { id } = await params;

    // Require a confirmation header to prevent accidental deletes.
    const confirmHeader = request.headers.get('x-confirm-delete');
    if (confirmHeader !== 'true') {
      return NextResponse.json(
        { error: 'Confirmation required. Add x-confirm-delete: true header.' },
        { status: 400 },
      );
    }

    const existing = await db.quizQuestion.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Question not found.' }, { status: 404 });
    }

    await db.quizQuestion.delete({ where: { id } });

    await db.moderationAction.create({
      data: {
        adminId: admin!.id,
        action: 'quiz_question_deleted',
        description: `Question ${id} deleted by @${admin!.username}`,
      },
    });

    return NextResponse.json({ success: true, deletedQuestionId: id });
  } catch (e) {
    console.error('Admin quiz question delete error:', e);
    return NextResponse.json({ error: 'Failed to delete question.' }, { status: 500 });
  }
}
