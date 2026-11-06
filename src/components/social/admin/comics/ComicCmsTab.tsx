'use client';

/**
 * Lordsbook Comic Bible Admin CMS — Comic Bible tab (Content Management).
 *
 * Backend (already built, in src/app/api/admin/comics/*):
 *   GET/POST  /api/admin/comics              — list + create
 *   GET/PATCH/DELETE /api/admin/comics/[id]  — detail + update + delete
 *   GET       /api/admin/comics/stats        — dashboard counters
 *   POST      /api/admin/comics/[id]/cover            — cover upload
 *   POST      /api/admin/comics/[id]/pages            — batch page upload
 *   PATCH/DELETE /api/admin/comics/[id]/pages/[pageId]— replace / renumber / layout / delete
 *   POST      /api/admin/comics/[id]/pages/reorder    — drag reorder
 *   GET       /api/admin/comics/[id]/translations     — language catalog + rows
 *   PATCH/DELETE /api/admin/comics/[id]/translations/[lc] — save / remove a translation
 *   POST      /api/admin/comics/[id]/workflow         — submit_review / revert / publish / unpublish
 *
 * Artwork is uploaded to the Supabase `comics` bucket (or dev fallback) and
 * the returned URL is stored in the DB — no React component ever hardcodes
 * an uploaded image path. The reader renders <img src={imagePath}> directly.
 */

import { useState, useEffect, useCallback, useRef, type DragEvent } from 'react';
import {
  BookOpen, Plus, Search, ArrowLeft, Trash2, Image as ImageIcon,
  Loader2, CheckCircle2, XCircle, AlertCircle, Upload, Eye, GripVertical,
  FileText, Languages, Rocket, ChevronRight, X, RefreshCw, ArrowUp, ArrowDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

// ── Shared types (mirror the API responses) ────────────────────────────────

type StoryStatus = 'draft' | 'review' | 'published';
type TranslationStatus = 'draft' | 'in_review' | 'published';

interface StatsResponse {
  stories: { total: number; published: number; review: number; draft: number };
  artwork: { totalAssets: number; spreadAssets: number; singleAssets: number };
  translations: {
    supportedLanguages: number; startedLanguages: number; publishedLanguages: number;
    publishedCount: number; inReviewCount: number; draftCount: number;
  };
}

interface StoryListItem {
  id: string; title: string; testament: string; category: string;
  bibleBook: string | null; bibleChapter: number | null; bibleVerse: number | null;
  coverImagePath: string | null; description: string | null;
  pageLayout: string; isKidsFriendly: boolean;
  status: StoryStatus; published: boolean;
  publishedAt: string | null;
  pageCount: number; spreadAssets: number;
  translationCount: number; translationsPublished: number;
  updatedAt: string; createdAt: string;
}

interface StoryListResponse {
  stories: StoryListItem[]; total: number;
}

interface PageRow {
  id: string; pageNumber: number; imagePath: string; isSpread: boolean;
  width: number | null; height: number | null; fileSize: number | null;
  originalName: string | null; createdAt: string;
}

interface TranslationRow {
  id: string; languageCode: string; title: string;
  introduction: string | null; narration: string | null; dialogue: string | null;
  captions: string | null; scripture: string | null;
  lesson: string | null; prayer: string | null;
  status: TranslationStatus; updatedAt: string;
}

interface LanguageCatalogEntry {
  code: string; name: string; native: string | null; bibleTranslationCount: number;
}

interface ValidationIssue { field: string; message: string; }
interface ValidationCheck { label: string; ok: boolean; detail?: string; }
interface ValidationResult {
  ok: boolean; issues: ValidationIssue[]; checks: ValidationCheck[];
}

interface StoryDetail {
  id: string; title: string; testament: string; category: string;
  bibleBook: string | null; bibleChapter: number | null; bibleVerse: number | null;
  coverImagePath: string | null; description: string | null;
  keyVerse: string | null; keyVerseRef: string | null;
  lesson: string | null; prayer: string | null;
  isKidsFriendly: boolean; ageGroup: string | null;
  pageLayout: string; status: StoryStatus; published: boolean;
  publishedAt: string | null; publishedBy: string | null;
  sortOrder: number;
  pages: PageRow[];
  translations: TranslationRow[];
}

interface StoryDetailResponse {
  story: StoryDetail; validation: ValidationResult;
}

// ── Status styling helpers ─────────────────────────────────────────────────

const STATUS_BADGE: Record<StoryStatus, { label: string; cls: string }> = {
  draft: { label: 'Draft', cls: 'bg-white/10 text-white/70 ring-1 ring-white/15' },
  review: { label: 'In Review', cls: 'bg-amber-500/15 text-amber-300 ring-1 ring-amber-500/30' },
  published: { label: 'Published', cls: 'bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/30' },
};

const TR_STATUS_BADGE: Record<TranslationStatus | 'not_started', { label: string; cls: string }> = {
  not_started: { label: 'Not Started', cls: 'bg-white/5 text-white/40 ring-1 ring-white/10' },
  draft: { label: 'Draft', cls: 'bg-white/10 text-white/70 ring-1 ring-white/15' },
  in_review: { label: 'In Review', cls: 'bg-amber-500/15 text-amber-300 ring-1 ring-amber-500/30' },
  published: { label: 'Published', cls: 'bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/30' },
};

// ── Top-level tab container ────────────────────────────────────────────────

type View = { kind: 'dashboard' } | { kind: 'list' } | { kind: 'editor'; storyId: string };

export function ComicCmsTab() {
  const [view, setView] = useState<View>({ kind: 'dashboard' });

  if (view.kind === 'editor') {
    return <StoryEditor storyId={view.storyId} onBack={() => setView({ kind: 'list' })} />;
  }
  if (view.kind === 'list') {
    return <StoryList onBack={() => setView({ kind: 'dashboard' })} onOpen={(id) => setView({ kind: 'editor', storyId: id })} />;
  }
  return <ComicDashboard onManage={() => setView({ kind: 'list' })} />;
}

// ── Dashboard ──────────────────────────────────────────────────────────────

function ComicDashboard({ onManage }: { onManage: () => void }) {
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/comics/stats')
      .then((r) => r.json())
      .then((d) => { if (!d.error) setStats(d); })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner />;
  if (!stats) return <ErrorState />;

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-saffron" />
          <h2 className="text-base font-bold text-white">Comic Bible</h2>
          <span className="text-xs text-muted-foreground">Content Management</span>
        </div>
        <button
          onClick={onManage}
          className="flex items-center gap-1.5 rounded-lg bg-saffron px-3 py-1.5 text-sm font-medium text-white hover:bg-saffron/90"
        >
          Manage Stories <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* Stories grid */}
      <section className="rounded-2xl border border-border bg-card p-4">
        <h3 className="mb-3 text-sm font-bold text-white">Stories</h3>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatTile label="Total" value={stats.stories.total} color="text-white" />
          <StatTile label="Published" value={stats.stories.published} color="text-emerald-400" />
          <StatTile label="In Review" value={stats.stories.review} color="text-amber-400" />
          <StatTile label="Drafts" value={stats.stories.draft} color="text-sky-400" />
        </div>
      </section>

      {/* Artwork grid */}
      <section className="rounded-2xl border border-border bg-card p-4">
        <h3 className="mb-3 text-sm font-bold text-white">Artwork Assets</h3>
        <div className="grid grid-cols-3 gap-3">
          <StatTile label="Total Assets" value={stats.artwork.totalAssets} color="text-white" />
          <StatTile label="Pre-composed Spreads" value={stats.artwork.spreadAssets} color="text-violet-400" />
          <StatTile label="Single Pages" value={stats.artwork.singleAssets} color="text-sky-400" />
        </div>
      </section>

      {/* Translations grid */}
      <section className="rounded-2xl border border-border bg-card p-4">
        <h3 className="mb-3 text-sm font-bold text-white">Translations</h3>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <StatTile label="Supported Languages" value={stats.translations.supportedLanguages} color="text-white" />
          <StatTile label="Languages Started" value={stats.translations.startedLanguages} color="text-sky-400" />
          <StatTile label="Languages Published" value={stats.translations.publishedLanguages} color="text-emerald-400" />
          <StatTile label="Published Rows" value={stats.translations.publishedCount} color="text-emerald-400" />
          <StatTile label="In Review Rows" value={stats.translations.inReviewCount} color="text-amber-400" />
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Supported languages are derived from the Lordsbook Bible translation system — a language
          appears here only if at least one Bible translation is available in it. Artwork is shared
          across all languages; only text is translated.
        </p>
      </section>
    </div>
  );
}

function StatTile({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="rounded-xl border border-border bg-background/40 p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={cn('mt-1 text-2xl font-bold tabular-nums', color)}>{value}</p>
    </div>
  );
}

// ── Story list ─────────────────────────────────────────────────────────────

function StoryList({ onBack, onOpen }: { onBack: () => void; onOpen: (id: string) => void }) {
  const [stories, setStories] = useState<StoryListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [creating, setCreating] = useState(false);
  const { toast } = useToast();

  const load = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filter !== 'all') params.set('status', filter);
    if (search.trim()) params.set('search', search.trim());
    fetch(`/api/admin/comics?${params.toString()}`)
      .then((r) => r.json())
      .then((d: StoryListResponse) => { if (d.stories) setStories(d.stories); })
      .finally(() => setLoading(false));
  }, [filter, search]);

  useEffect(() => { load(); }, [load]);

  async function createStory() {
    const title = prompt('Story title:');
    if (!title || !title.trim()) return;
    const testament = confirm('OK = Old Testament, Cancel = New Testament') ? 'OT' : 'NT';
    setCreating(true);
    try {
      const res = await fetch('/api/admin/comics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title.trim(), testament }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || 'Failed');
      toast({ title: 'Story created', description: `"${title}" started as a draft.` });
      onOpen(d.story.id);
    } catch (e) {
      toast({ title: 'Error', description: e instanceof Error ? e.message : 'Failed', variant: 'destructive' });
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="space-y-3 p-4">
      <div className="flex items-center gap-2">
        <button onClick={onBack} className="rounded-lg p-1.5 text-white/60 hover:bg-white/5 hover:text-white">
          <ArrowLeft className="h-4 w-4" />
        </button>
        <h2 className="text-base font-bold text-white">Comic Bible Stories</h2>
        <button
          onClick={createStory}
          disabled={creating}
          className="ml-auto flex items-center gap-1.5 rounded-lg bg-saffron px-3 py-1.5 text-sm font-medium text-white hover:bg-saffron/90 disabled:opacity-50"
        >
          {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          New Story
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        {[
          { key: 'all', label: 'All' },
          { key: 'draft', label: 'Drafts' },
          { key: 'review', label: 'In Review' },
          { key: 'published', label: 'Published' },
        ].map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={cn(
              'rounded-full px-3 py-1 text-xs font-medium transition-colors',
              filter === f.key ? 'bg-saffron text-white' : 'bg-card border border-border text-white/60 hover:bg-white/5',
            )}
          >
            {f.label}
          </button>
        ))}
        <div className="relative ml-auto">
          <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white/40" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') load(); }}
            placeholder="Search title or category…"
            className="w-48 rounded-lg border border-border bg-card py-1.5 pl-7 pr-2 text-sm text-white placeholder:text-white/30 focus:border-saffron focus:outline-none"
          />
        </div>
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : stories.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-8 text-center">
          <BookOpen className="mx-auto mb-2 h-8 w-8 text-white/30" />
          <p className="text-sm text-muted-foreground">No stories yet. Click “New Story” to begin.</p>
        </div>
      ) : (
        <div className="grid gap-2">
          {stories.map((s) => (
            <StoryRow key={s.id} story={s} onOpen={() => onOpen(s.id)} />
          ))}
        </div>
      )}
    </div>
  );
}

function StoryRow({ story, onOpen }: { story: StoryListItem; onOpen: () => void }) {
  const spreadCount = story.spreadAssets;
  const singleCount = story.pageCount - spreadCount;
  const badge = STATUS_BADGE[story.status];
  return (
    <button
      onClick={onOpen}
      className="flex w-full items-center gap-3 rounded-2xl border border-border bg-card p-3 text-left transition-colors hover:border-saffron/40 hover:bg-saffron-soft/10"
    >
      {/* Cover thumbnail */}
      <div className="h-16 w-12 shrink-0 overflow-hidden rounded-md bg-black/30 ring-1 ring-white/10">
        {story.coverImagePath ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={story.coverImagePath} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <ImageIcon className="h-5 w-5 text-white/20" />
          </div>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-semibold text-white">{story.title}</p>
          <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-medium', badge.cls)}>{badge.label}</span>
        </div>
        <p className="truncate text-xs text-muted-foreground">
          {story.testament === 'OT' ? 'Old Testament' : 'New Testament'}
          {story.bibleBook ? ` · ${story.bibleBook}${story.bibleChapter ? ` ${story.bibleChapter}` : ''}` : ''}
          {story.category ? ` · ${story.category}` : ''}
        </p>
        <p className="mt-0.5 text-xs text-white/50">
          {story.pageCount === 0 ? 'No artwork yet' : `${story.pageCount} asset${story.pageCount === 1 ? '' : 's'}`}
          {spreadCount > 0 ? ` · ${spreadCount} spread${spreadCount === 1 ? '' : 's'}` : ''}
          {singleCount > 0 ? ` · ${singleCount} single${singleCount === 1 ? '' : 's'}` : ''}
          {' · '} {story.translationCount} translation{story.translationCount === 1 ? '' : 's'}
          {story.translationsPublished > 0 ? ` (${story.translationsPublished} published)` : ''}
        </p>
      </div>

      <ChevronRight className="h-4 w-4 shrink-0 text-white/30" />
    </button>
  );
}

// ── Story editor (the heart of the CMS) ────────────────────────────────────

type EditorSection = 'details' | 'artwork' | 'translations' | 'publish';

function StoryEditor({ storyId, onBack }: { storyId: string; onBack: () => void }) {
  const [data, setData] = useState<StoryDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [section, setSection] = useState<EditorSection>('details');
  const { toast } = useToast();

  const reload = useCallback(() => {
    setLoading(true);
    fetch(`/api/admin/comics/${storyId}`)
      .then((r) => r.json())
      .then((d: StoryDetailResponse) => { if (d.story) setData(d); })
      .finally(() => setLoading(false));
  }, [storyId]);

  // Initial load — inlined so the effect body only fetches (loading already
  // starts true). `reload` is still used for manual refreshes via onSaved.
  useEffect(() => {
    let cancelled = false;
    fetch(`/api/admin/comics/${storyId}`)
      .then((r) => r.json())
      .then((d: StoryDetailResponse) => { if (!cancelled && d.story) setData(d); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [storyId]);

  if (loading) return <LoadingSpinner />;
  if (!data) return <ErrorState />;

  const { story, validation } = data;
  const badge = STATUS_BADGE[story.status];

  return (
    <div className="flex min-h-full flex-col">
      {/* Editor header */}
      <div className="sticky top-0 z-10 border-b border-border bg-background/90 backdrop-blur">
        <div className="flex items-center gap-2 px-4 py-2.5">
          <button onClick={onBack} className="rounded-lg p-1.5 text-white/60 hover:bg-white/5 hover:text-white">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="truncate text-sm font-bold text-white">{story.title}</p>
              <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-medium', badge.cls)}>{badge.label}</span>
              {validation.ok && story.status !== 'published' && (
                <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-medium text-emerald-300 ring-1 ring-emerald-500/30">
                  Ready to publish
                </span>
              )}
            </div>
            <p className="truncate text-xs text-muted-foreground">
              {story.testament === 'OT' ? 'Old Testament' : 'New Testament'}
              {story.bibleBook ? ` · ${story.bibleBook}${story.bibleChapter ? ` ${story.bibleChapter}:${story.bibleVerse ?? ''}` : ''}` : ''}
              {' · '}{story.pages.length} page asset(s)
            </p>
          </div>
        </div>
        {/* Section tabs */}
        <div role="tablist" className="flex overflow-x-auto">
          {([
            { key: 'details', label: 'Story Details', icon: FileText },
            { key: 'artwork', label: 'Artwork & Pages', icon: ImageIcon },
            { key: 'translations', label: 'Translations', icon: Languages },
            { key: 'publish', label: 'Publish', icon: Rocket },
          ] as { key: EditorSection; label: string; icon: React.ComponentType<{ className?: string }> }[]).map(({ key, label, icon: Icon }) => {
            const active = section === key;
            return (
              <button
                key={key}
                role="tab"
                aria-selected={active}
                onClick={() => setSection(key)}
                className="group relative flex shrink-0 items-center gap-1.5 px-4 py-2.5 text-sm font-medium transition-colors hover:bg-saffron-soft/20 focus-visible:outline-none"
              >
                <Icon className={cn('h-4 w-4', active ? 'text-saffron' : 'text-white/50')} />
                <span className={cn(active ? 'text-white font-semibold' : 'text-white/50')}>{label}</span>
                <span className={cn('absolute inset-x-0 -bottom-px h-[3px] bg-saffron transition-transform', active ? 'scale-x-100' : 'scale-x-0')} aria-hidden />
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex-1">
        {section === 'details' && <DetailsSection story={story} onSaved={reload} />}
        {section === 'artwork' && <ArtworkSection story={story} onSaved={reload} />}
        {section === 'translations' && <TranslationsSection story={story} onSaved={reload} />}
        {section === 'publish' && <PublishSection story={story} validation={validation} onSaved={reload} />}
      </div>
    </div>
  );
}

// ── Section: Story details ─────────────────────────────────────────────────

function DetailsSection({ story, onSaved }: { story: StoryDetail; onSaved: () => void }) {
  const [form, setForm] = useState({
    title: story.title,
    testament: story.testament,
    category: story.category,
    bibleBook: story.bibleBook ?? '',
    bibleChapter: story.bibleChapter ?? '',
    bibleVerse: story.bibleVerse ?? '',
    description: story.description ?? '',
    keyVerse: story.keyVerse ?? '',
    keyVerseRef: story.keyVerseRef ?? '',
    lesson: story.lesson ?? '',
    prayer: story.prayer ?? '',
    isKidsFriendly: story.isKidsFriendly,
    ageGroup: story.ageGroup ?? '',
    pageLayout: story.pageLayout,
    sortOrder: String(story.sortOrder),
  });
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function save() {
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        title: form.title.trim(),
        testament: form.testament,
        category: form.category.trim(),
        bibleBook: form.bibleBook.trim() || null,
        bibleChapter: form.bibleChapter === '' ? null : Number(form.bibleChapter),
        bibleVerse: form.bibleVerse === '' ? null : Number(form.bibleVerse),
        description: form.description.trim() || null,
        keyVerse: form.keyVerse.trim() || null,
        keyVerseRef: form.keyVerseRef.trim() || null,
        lesson: form.lesson.trim() || null,
        prayer: form.prayer.trim() || null,
        isKidsFriendly: form.isKidsFriendly,
        ageGroup: form.ageGroup || null,
        pageLayout: form.pageLayout,
        sortOrder: Number(form.sortOrder) || 0,
      };
      const res = await fetch(`/api/admin/comics/${story.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || 'Failed');
      toast({ title: 'Saved', description: 'Story details updated.' });
      onSaved();
    } catch (e) {
      toast({ title: 'Error', description: e instanceof Error ? e.message : 'Failed', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4 p-4">
      <div className="rounded-2xl border border-border bg-card p-4">
        <h3 className="mb-3 text-sm font-bold text-white">Basic Information</h3>
        <div className="grid gap-3">
          <Field label="Story title *">
            <input
              value={form.title}
              onChange={(e) => set('title', e.target.value)}
              className={inputCls}
              maxLength={200}
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Testament *">
              <select
                value={form.testament}
                onChange={(e) => { set('testament', e.target.value as 'OT' | 'NT'); set('bibleBook', ''); set('bibleChapter', ''); set('bibleVerse', ''); }}
                className={inputCls}
              >
                <option value="OT">Old Testament</option>
                <option value="NT">New Testament</option>
              </select>
            </Field>
            <Field label="Category">
              <input
                value={form.category}
                onChange={(e) => set('category', e.target.value)}
                className={inputCls}
                maxLength={100}
                placeholder="e.g. David and Goliath"
              />
            </Field>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-4">
        <h3 className="mb-3 text-sm font-bold text-white">Bible Reference</h3>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Book">
            <input
              value={form.bibleBook}
              onChange={(e) => set('bibleBook', e.target.value.toUpperCase())}
              className={inputCls}
              placeholder="e.g. 1SA"
              maxLength={10}
            />
          </Field>
          <Field label="Chapter">
            <input
              value={form.bibleChapter}
              onChange={(e) => set('bibleChapter', e.target.value.replace(/[^0-9]/g, ''))}
              className={inputCls}
              inputMode="numeric"
              placeholder="e.g. 17"
            />
          </Field>
          <Field label="Verse">
            <input
              value={form.bibleVerse}
              onChange={(e) => set('bibleVerse', e.target.value.replace(/[^0-9]/g, ''))}
              className={inputCls}
              inputMode="numeric"
              placeholder="e.g. 45"
            />
          </Field>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Use a USFM book code (GEN, EXO, 1SA, JHN, ROM…). The book must belong to the chosen testament.
        </p>
      </div>

      <div className="rounded-2xl border border-border bg-card p-4">
        <h3 className="mb-3 text-sm font-bold text-white">Story Content</h3>
        <div className="grid gap-3">
          <Field label="Description">
            <textarea
              value={form.description}
              onChange={(e) => set('description', e.target.value)}
              className={textareaCls}
              rows={3}
              maxLength={4000}
              placeholder="Short story description shown on the library card."
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Key Verse (text)">
              <textarea
                value={form.keyVerse}
                onChange={(e) => set('keyVerse', e.target.value)}
                className={textareaCls}
                rows={2}
                maxLength={4000}
              />
            </Field>
            <Field label="Key Verse Reference">
              <input
                value={form.keyVerseRef}
                onChange={(e) => set('keyVerseRef', e.target.value)}
                className={inputCls}
                placeholder="e.g. 1 Samuel 17:45"
              />
            </Field>
          </div>
          <Field label="What We Learn (lesson)">
            <textarea
              value={form.lesson}
              onChange={(e) => set('lesson', e.target.value)}
              className={textareaCls}
              rows={4}
              maxLength={4000}
            />
          </Field>
          <Field label="Prayer">
            <textarea
              value={form.prayer}
              onChange={(e) => set('prayer', e.target.value)}
              className={textareaCls}
              rows={3}
              maxLength={4000}
            />
          </Field>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-4">
        <h3 className="mb-3 text-sm font-bold text-white">Display & Layout</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Page layout">
            <select
              value={form.pageLayout}
              onChange={(e) => set('pageLayout', e.target.value)}
              className={inputCls}
            >
              <option value="spread">Spread (pair singles on desktop)</option>
              <option value="single">Single page (one per view)</option>
            </select>
          </Field>
          <Field label="Sort order">
            <input
              value={form.sortOrder}
              onChange={(e) => set('sortOrder', e.target.value.replace(/[^0-9]/g, ''))}
              className={inputCls}
              inputMode="numeric"
            />
          </Field>
          <label className="flex items-center gap-2 sm:col-span-2">
            <input
              type="checkbox"
              checked={form.isKidsFriendly}
              onChange={(e) => set('isKidsFriendly', e.target.checked)}
              className="h-4 w-4 rounded border-border accent-saffron"
            />
            <span className="text-sm text-white">Kids-friendly story</span>
          </label>
          {form.isKidsFriendly && (
            <Field label="Age group">
              <select
                value={form.ageGroup}
                onChange={(e) => set('ageGroup', e.target.value)}
                className={inputCls}
              >
                <option value="">—</option>
                <option value="3-5">3–5</option>
                <option value="6-8">6–8</option>
                <option value="9-12">9–12</option>
              </select>
            </Field>
          )}
        </div>
      </div>

      <div className="sticky bottom-0 flex justify-end gap-2 border-t border-border bg-background/90 p-3 backdrop-blur">
        <button
          onClick={save}
          disabled={saving}
          className="flex items-center gap-1.5 rounded-lg bg-saffron px-4 py-2 text-sm font-medium text-white hover:bg-saffron/90 disabled:opacity-50"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
          Save Details
        </button>
      </div>
    </div>
  );
}

// ── Section: Artwork (cover + pages) ───────────────────────────────────────

function ArtworkSection({ story, onSaved }: { story: StoryDetail; onSaved: () => void }) {
  return (
    <div className="space-y-4 p-4">
      <CoverCard story={story} onSaved={onSaved} />
      <PagesCard story={story} onSaved={onSaved} />
    </div>
  );
}

function CoverCard({ story, onSaved }: { story: StoryDetail; onSaved: () => void }) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  async function uploadCover(file: File) {
    setUploading(true);
    setProgress(0);
    try {
      const form = new FormData();
      form.append('file', file);
      // XMLHttpRequest for upload progress (fetch lacks progress events).
      const res = await new Promise<Response>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', `/api/admin/comics/${story.id}/cover`);
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) setProgress(Math.round((e.loaded / e.total) * 100));
        };
        xhr.onload = () => resolve(new Response(xhr.responseText, { status: xhr.status }));
        xhr.onerror = () => reject(new Error('Network error'));
        xhr.send(form);
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || 'Failed');
      toast({ title: 'Cover uploaded', description: d.cover?.reachable ? 'Reachable and ready.' : 'Uploaded — verify reachability before publishing.' });
      onSaved();
    } catch (e) {
      toast({ title: 'Error', description: e instanceof Error ? e.message : 'Failed', variant: 'destructive' });
    } finally {
      setUploading(false);
      setProgress(0);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-bold text-white">Cover Image</h3>
        <span className="text-xs text-muted-foreground">JPEG / PNG / WebP / GIF · ≤ 25 MB · original quality</span>
      </div>
      <div className="flex flex-wrap items-start gap-4">
        <div className="h-32 w-24 shrink-0 overflow-hidden rounded-lg bg-black/30 ring-1 ring-white/10">
          {story.coverImagePath ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={story.coverImagePath} alt="Cover" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <ImageIcon className="h-8 w-8 text-white/20" />
            </div>
          )}
        </div>
        <div className="flex-1">
          {story.coverImagePath && (
            <p className="mb-2 break-all text-xs text-white/50">{story.coverImagePath}</p>
          )}
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) uploadCover(f);
            }}
          />
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-1.5 rounded-lg border border-border bg-background/40 px-3 py-1.5 text-sm font-medium text-white hover:bg-white/5 disabled:opacity-50"
          >
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            {story.coverImagePath ? 'Replace cover' : 'Upload cover'}
          </button>
          {uploading && (
            <div className="mt-2 h-1.5 w-48 overflow-hidden rounded-full bg-white/10">
              <div className="h-full bg-saffron transition-all" style={{ width: `${progress}%` }} />
            </div>
          )}
          <p className="mt-2 text-xs text-muted-foreground">
            The original file is stored byte-for-byte — never recompressed or resized.
          </p>
        </div>
      </div>
    </div>
  );
}

function PagesCard({ story, onSaved }: { story: StoryDetail; onSaved: () => void }) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [uploadLayout, setUploadLayout] = useState<'single' | 'spread'>('spread');
  const [results, setResults] = useState<Array<{ filename: string; ok: boolean; error?: string }> | null>(null);
  const [reordering, setReordering] = useState(false);
  const [previewPage, setPreviewPage] = useState<PageRow | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  async function uploadPages(files: FileList) {
    if (files.length === 0) return;
    setUploading(true);
    setProgress(0);
    setResults(null);
    try {
      const form = new FormData();
      const layouts: string[] = [];
      for (const f of Array.from(files)) {
        form.append('files', f);
        layouts.push(uploadLayout);
      }
      form.append('layouts', JSON.stringify(layouts));
      const res = await new Promise<Response>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', `/api/admin/comics/${story.id}/pages`);
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) setProgress(Math.round((e.loaded / e.total) * 100));
        };
        xhr.onload = () => resolve(new Response(xhr.responseText, { status: xhr.status }));
        xhr.onerror = () => reject(new Error('Network error'));
        xhr.send(form);
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || 'Failed');
      setResults(d.results || []);
      const failed = d.failed || 0;
      toast({
        title: failed === 0 ? 'Upload complete' : `${failed} file(s) failed`,
        description: `${d.created} of ${files.length} page asset(s) added.`,
        variant: failed > 0 ? 'destructive' : 'default',
      });
      onSaved();
    } catch (e) {
      toast({ title: 'Error', description: e instanceof Error ? e.message : 'Failed', variant: 'destructive' });
    } finally {
      setUploading(false);
      setProgress(0);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  // ── Drag-and-drop reorder ──
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  function onDragStart(e: DragEvent, id: string) {
    setDragId(id);
    e.dataTransfer.effectAllowed = 'move';
  }
  function onDragOver(e: DragEvent, id: string) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverId !== id) setDragOverId(id);
  }
  async function onDrop(e: DragEvent, targetId: string) {
    e.preventDefault();
    if (!dragId || dragId === targetId) { setDragId(null); setDragOverId(null); return; }
    const ordered = [...story.pages].sort((a, b) => a.pageNumber - b.pageNumber);
    const fromIdx = ordered.findIndex((p) => p.id === dragId);
    const toIdx = ordered.findIndex((p) => p.id === targetId);
    if (fromIdx === -1 || toIdx === -1) { setDragId(null); setDragOverId(null); return; }
    const [moved] = ordered.splice(fromIdx, 1);
    ordered.splice(toIdx, 0, moved);
    const newOrder = ordered.map((p) => p.id);
    setDragId(null);
    setDragOverId(null);
    setReordering(true);
    try {
      const res = await fetch(`/api/admin/comics/${story.id}/pages/reorder`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order: newOrder }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || 'Failed');
      toast({ title: 'Order saved', description: 'Reading order updated — the reader will use this order.' });
      onSaved();
    } catch (err) {
      toast({ title: 'Error', description: err instanceof Error ? err.message : 'Failed', variant: 'destructive' });
    } finally {
      setReordering(false);
    }
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-bold text-white">Comic Pages</h3>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>{story.pages.length} asset(s)</span>
          <span>·</span>
          <span>{story.pages.filter((p) => p.isSpread).length} spread(s)</span>
        </div>
      </div>

      {/* Upload zone */}
      <div className="mb-4 rounded-xl border border-dashed border-border bg-background/30 p-4">
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-white">
            <input
              type="radio"
              checked={uploadLayout === 'spread'}
              onChange={() => setUploadLayout('spread')}
              className="h-4 w-4 accent-saffron"
            />
            Pre-composed spread (full landscape)
          </label>
          <label className="flex items-center gap-2 text-sm text-white">
            <input
              type="radio"
              checked={uploadLayout === 'single'}
              onChange={() => setUploadLayout('single')}
              className="h-4 w-4 accent-saffron"
            />
            Single page (portrait)
          </label>
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="ml-auto flex items-center gap-1.5 rounded-lg bg-saffron px-3 py-1.5 text-sm font-medium text-white hover:bg-saffron/90 disabled:opacity-50"
          >
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            {uploading ? 'Uploading…' : 'Add pages'}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            multiple
            className="hidden"
            onChange={(e) => { if (e.target.files) uploadPages(e.target.files); }}
          />
        </div>
        {uploading && (
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
            <div className="h-full bg-saffron transition-all" style={{ width: `${progress}%` }} />
          </div>
        )}
        <p className="mt-2 text-xs text-muted-foreground">
          Batch upload — files are added in selection order. Page numbers auto-assign (append); reorder afterwards by drag.
          {uploadLayout === 'spread' && ' Each spread renders as one full-width view — never cropped or split.'}
        </p>
        {results && (
          <div className="mt-2 space-y-1">
            {results.map((r, i) => (
              <div key={i} className="flex items-center gap-2 text-xs">
                {r.ok ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> : <XCircle className="h-3.5 w-3.5 text-rose-400" />}
                <span className={r.ok ? 'text-white/70' : 'text-rose-300'}>{r.filename}</span>
                {!r.ok && r.error && <span className="text-rose-400">— {r.error}</span>}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pages grid (drag to reorder) */}
      {story.pages.length === 0 ? (
        <div className="rounded-xl border border-border bg-background/30 p-8 text-center">
          <ImageIcon className="mx-auto mb-2 h-8 w-8 text-white/30" />
          <p className="text-sm text-muted-foreground">No pages uploaded yet. Use “Add pages” above.</p>
        </div>
      ) : (
        <>
          <p className="mb-2 text-xs text-muted-foreground">Drag to reorder · click a page to preview / replace / delete.</p>
          {reordering && <p className="mb-2 text-xs text-saffron"><Loader2 className="mr-1 inline h-3 w-3 animate-spin" />Saving new order…</p>}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {[...story.pages].sort((a, b) => a.pageNumber - b.pageNumber).map((p) => (
              <div
                key={p.id}
                draggable
                onDragStart={(e) => onDragStart(e, p.id)}
                onDragOver={(e) => onDragOver(e, p.id)}
                onDrop={(e) => onDrop(e, p.id)}
                onDragEnd={() => { setDragId(null); setDragOverId(null); }}
                onClick={() => setPreviewPage(p)}
                className={cn(
                  'group relative cursor-pointer rounded-xl border bg-background/40 p-2 transition-colors',
                  dragOverId === p.id ? 'border-saffron ring-2 ring-saffron/40' : 'border-border hover:border-saffron/40',
                  dragId === p.id && 'opacity-40',
                )}
              >
                <div className="relative aspect-[3/4] overflow-hidden rounded-md bg-black/30">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.imagePath} alt={`Page ${p.pageNumber}`} className="h-full w-full object-contain" />
                  <div className="absolute left-1 top-1 flex items-center gap-1 rounded bg-black/70 px-1.5 py-0.5 text-[10px] font-bold text-white">
                    <GripVertical className="h-3 w-3" />#{p.pageNumber}
                  </div>
                  {p.isSpread && (
                    <div className="absolute right-1 top-1 rounded bg-violet-500/80 px-1.5 py-0.5 text-[10px] font-bold text-white">
                      SPREAD
                    </div>
                  )}
                </div>
                <p className="mt-1 truncate text-[10px] text-white/50">
                  {p.width && p.height ? `${p.width}×${p.height}` : '?'}
                  {p.fileSize ? ` · ${(p.fileSize / 1024).toFixed(0)} KB` : ''}
                </p>
                <p className="truncate text-[10px] text-white/30">{p.originalName}</p>
              </div>
            ))}
          </div>
        </>
      )}

      {previewPage && (
        <PagePreviewDialog
          storyId={story.id}
          page={previewPage}
          onClose={() => setPreviewPage(null)}
          onChanged={() => { setPreviewPage(null); onSaved(); }}
        />
      )}
    </div>
  );
}

function PagePreviewDialog({
  storyId, page, onClose, onChanged,
}: {
  storyId: string; page: PageRow; onClose: () => void; onChanged: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [editNumber, setEditNumber] = useState(String(page.pageNumber));
  const [isSpread, setIsSpread] = useState(page.isSpread);
  const replaceRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  async function saveNumber() {
    const target = Number(editNumber);
    if (!Number.isInteger(target) || target < 1) {
      toast({ title: 'Invalid', description: 'Page number must be a positive integer.', variant: 'destructive' });
      return;
    }
    if (target === page.pageNumber) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/comics/${storyId}/pages/${page.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pageNumber: target }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || 'Failed');
      toast({ title: 'Page number saved' });
      onChanged();
    } catch (e) {
      toast({ title: 'Error', description: e instanceof Error ? e.message : 'Failed', variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  }

  async function toggleSpread() {
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/comics/${storyId}/pages/${page.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isSpread: !isSpread }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || 'Failed');
      setIsSpread(!isSpread);
      toast({ title: 'Layout updated', description: `Now ${!isSpread ? 'a spread' : 'a single page'}.` });
      onChanged();
    } catch (e) {
      toast({ title: 'Error', description: e instanceof Error ? e.message : 'Failed', variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  }

  async function replaceArtwork(file: File) {
    setBusy(true);
    try {
      const form = new FormData();
      form.append('file', file);
      const res = await fetch(`/api/admin/comics/${storyId}/pages/${page.id}`, {
        method: 'PATCH',
        body: form,
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || 'Failed');
      toast({ title: 'Artwork replaced', description: 'Original quality preserved.' });
      onChanged();
    } catch (e) {
      toast({ title: 'Error', description: e instanceof Error ? e.message : 'Failed', variant: 'destructive' });
    } finally {
      setBusy(false);
      if (replaceRef.current) replaceRef.current.value = '';
    }
  }

  async function deletePage() {
    if (!confirm(`Delete page ${page.pageNumber}? The artwork will be removed and remaining pages renumbered.`)) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/comics/${storyId}/pages/${page.id}`, {
        method: 'DELETE',
        headers: { 'x-confirm-delete': 'true' },
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || 'Failed');
      toast({ title: 'Page deleted', description: `${d.remainingPages} page(s) remain.` });
      onChanged();
    } catch (e) {
      toast({ title: 'Error', description: e instanceof Error ? e.message : 'Failed', variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" onClick={onClose}>
      <div
        className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-border bg-card"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border p-3">
          <h3 className="text-sm font-bold text-white">Page {page.pageNumber} {page.isSpread ? '· Spread' : '· Single'}</h3>
          <button onClick={onClose} className="rounded-lg p-1 text-white/60 hover:bg-white/5 hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex-1 overflow-auto bg-black/40 p-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={page.imagePath} alt={`Page ${page.pageNumber}`} className="mx-auto max-h-[50vh] object-contain" />
          <div className="mt-3 text-center text-xs text-white/50">
            {page.width && page.height ? `${page.width} × ${page.height} px` : 'Unknown dimensions'}
            {page.fileSize ? ` · ${(page.fileSize / 1024).toFixed(0)} KB` : ''}
            {page.originalName ? ` · ${page.originalName}` : ''}
          </div>
          <div className="mx-auto mt-2 max-w-md break-all rounded bg-black/30 p-2 text-[10px] text-white/40">
            {page.imagePath}
          </div>
        </div>
        <div className="space-y-3 border-t border-border p-3">
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">Page number</label>
              <div className="flex items-center gap-1">
                <input
                  value={editNumber}
                  onChange={(e) => setEditNumber(e.target.value.replace(/[^0-9]/g, ''))}
                  className="w-20 rounded-lg border border-border bg-background/40 px-2 py-1.5 text-sm text-white focus:border-saffron focus:outline-none"
                  inputMode="numeric"
                />
                <button
                  onClick={saveNumber}
                  disabled={busy || editNumber === String(page.pageNumber)}
                  className="rounded-lg bg-saffron px-2.5 py-1.5 text-xs font-medium text-white hover:bg-saffron/90 disabled:opacity-50"
                >
                  Set
                </button>
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">Layout</label>
              <button
                onClick={toggleSpread}
                disabled={busy}
                className={cn(
                  'rounded-lg px-3 py-1.5 text-xs font-medium disabled:opacity-50',
                  isSpread ? 'bg-violet-500/20 text-violet-200 ring-1 ring-violet-500/40' : 'bg-white/10 text-white ring-1 ring-white/15',
                )}
              >
                {isSpread ? 'Spread (full width)' : 'Single page'}
              </button>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <input
              ref={replaceRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) replaceArtwork(f); }}
            />
            <button
              onClick={() => replaceRef.current?.click()}
              disabled={busy}
              className="flex items-center gap-1.5 rounded-lg border border-border bg-background/40 px-3 py-1.5 text-sm font-medium text-white hover:bg-white/5 disabled:opacity-50"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Replace artwork
            </button>
            <button
              onClick={deletePage}
              disabled={busy}
              className="ml-auto flex items-center gap-1.5 rounded-lg bg-rose-500/15 px-3 py-1.5 text-sm font-medium text-rose-300 ring-1 ring-rose-500/30 hover:bg-rose-500/25 disabled:opacity-50"
            >
              <Trash2 className="h-4 w-4" />
              Delete page
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Section: Translations ──────────────────────────────────────────────────

function TranslationsSection({ story, onSaved }: { story: StoryDetail; onSaved: () => void }) {
  const [catalog, setCatalog] = useState<LanguageCatalogEntry[] | null>(null);
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/admin/comics/${story.id}/translations`)
      .then((r) => r.json())
      .then((d) => {
        if (d.catalog) {
          setCatalog(d.catalog);
          // Default to English (source language), or the first non-published.
          const en = d.catalog.find((c: LanguageCatalogEntry) => c.code === 'en');
          setSelected(en ? en.code : d.catalog[0]?.code ?? null);
        }
      });
  }, [story.id]);

  if (!catalog) return <LoadingSpinner />;

  const rowsByCode = new Map(story.translations.map((t) => [t.languageCode, t]));

  return (
    <div className="space-y-3 p-4">
      <div className="rounded-2xl border border-border bg-card p-4">
        <h3 className="mb-1 text-sm font-bold text-white">Translations</h3>
        <p className="mb-3 text-xs text-muted-foreground">
          Artwork is shared across all languages — only the text is translated. Supported languages come
          from the Lordsbook Bible translation system (a language appears only if at least one Bible
          translation is available in it).
        </p>
        <div className="flex flex-wrap gap-2">
          {catalog.map((lang) => {
            const row = rowsByCode.get(lang.code);
            const status: TranslationStatus | 'not_started' = row?.status ?? 'not_started';
            const badge = TR_STATUS_BADGE[status];
            const active = selected === lang.code;
            return (
              <button
                key={lang.code}
                onClick={() => setSelected(lang.code)}
                className={cn(
                  'flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors',
                  active ? 'border-saffron bg-saffron/15 text-white' : 'border-border bg-background/40 text-white/60 hover:bg-white/5',
                )}
              >
                <span>{lang.name}</span>
                {lang.native && <span className="text-white/40">{lang.native}</span>}
                <span className={cn('rounded-full px-1.5 py-0.5 text-[9px] font-bold', badge.cls)}>{badge.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {selected && (
        <TranslationEditor
          key={selected}
          storyId={story.id}
          languageCode={selected}
          existing={rowsByCode.get(selected) ?? null}
          defaultTitle={story.title}
          onSaved={onSaved}
        />
      )}
    </div>
  );
}

function TranslationEditor({
  storyId, languageCode, existing, defaultTitle, onSaved,
}: {
  storyId: string; languageCode: string;
  existing: TranslationRow | null; defaultTitle: string;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    title: existing?.title ?? defaultTitle,
    introduction: existing?.introduction ?? '',
    narration: existing?.narration ?? '',
    dialogue: existing?.dialogue ?? '',
    captions: existing?.captions ?? '',
    scripture: existing?.scripture ?? '',
    lesson: existing?.lesson ?? '',
    prayer: existing?.prayer ?? '',
    status: (existing?.status ?? 'draft') as TranslationStatus,
  });
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function save() {
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        title: form.title.trim() || defaultTitle,
        introduction: form.introduction.trim() || null,
        narration: form.narration.trim() || null,
        dialogue: form.dialogue.trim() || null,
        captions: form.captions.trim() || null,
        scripture: form.scripture.trim() || null,
        lesson: form.lesson.trim() || null,
        prayer: form.prayer.trim() || null,
        status: form.status,
      };
      const res = await fetch(`/api/admin/comics/${storyId}/translations/${languageCode}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || 'Failed');
      toast({ title: 'Translation saved', description: `${languageCode} — ${form.status}` });
      onSaved();
    } catch (e) {
      toast({ title: 'Error', description: e instanceof Error ? e.message : 'Failed', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!confirm(`Remove the ${languageCode} translation? It will go back to "Not Started".`)) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/comics/${storyId}/translations/${languageCode}`, {
        method: 'DELETE',
        headers: { 'x-confirm-delete': 'true' },
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || 'Failed');
      }
      toast({ title: 'Translation removed' });
      onSaved();
    } catch (e) {
      toast({ title: 'Error', description: e instanceof Error ? e.message : 'Failed', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-bold text-white">
          {languageCode.toUpperCase()} translation
          {existing && <span className="ml-2 text-xs text-white/40">last updated {new Date(existing.updatedAt).toLocaleString()}</span>}
        </h3>
        <select
          value={form.status}
          onChange={(e) => set('status', e.target.value as TranslationStatus)}
          className="rounded-lg border border-border bg-background/40 px-2 py-1 text-xs text-white focus:border-saffron focus:outline-none"
        >
          <option value="draft">Draft</option>
          <option value="in_review">In Review</option>
          <option value="published">Published</option>
        </select>
      </div>
      <div className="grid gap-3">
        <Field label="Title *">
          <input value={form.title} onChange={(e) => set('title', e.target.value)} className={inputCls} maxLength={300} />
        </Field>
        <Field label="Introduction">
          <textarea value={form.introduction} onChange={(e) => set('introduction', e.target.value)} className={textareaCls} rows={3} />
        </Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Narration">
            <textarea value={form.narration} onChange={(e) => set('narration', e.target.value)} className={textareaCls} rows={4} />
          </Field>
          <Field label="Dialogue">
            <textarea value={form.dialogue} onChange={(e) => set('dialogue', e.target.value)} className={textareaCls} rows={4} />
          </Field>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Captions / Subtitles">
            <textarea value={form.captions} onChange={(e) => set('captions', e.target.value)} className={textareaCls} rows={3} />
          </Field>
          <Field label="Scripture quotation & reference">
            <textarea value={form.scripture} onChange={(e) => set('scripture', e.target.value)} className={textareaCls} rows={3} />
          </Field>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="What We Learn (lesson)">
            <textarea value={form.lesson} onChange={(e) => set('lesson', e.target.value)} className={textareaCls} rows={4} />
          </Field>
          <Field label="Prayer">
            <textarea value={form.prayer} onChange={(e) => set('prayer', e.target.value)} className={textareaCls} rows={3} />
          </Field>
        </div>
      </div>
      <div className="mt-4 flex justify-end gap-2">
        {existing && (
          <button
            onClick={remove}
            disabled={saving}
            className="flex items-center gap-1.5 rounded-lg bg-rose-500/15 px-3 py-2 text-sm font-medium text-rose-300 ring-1 ring-rose-500/30 hover:bg-rose-500/25 disabled:opacity-50"
          >
            <Trash2 className="h-4 w-4" /> Remove
          </button>
        )}
        <button
          onClick={save}
          disabled={saving}
          className="flex items-center gap-1.5 rounded-lg bg-saffron px-4 py-2 text-sm font-medium text-white hover:bg-saffron/90 disabled:opacity-50"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
          Save Translation
        </button>
      </div>
    </div>
  );
}

// ── Section: Publish workflow ──────────────────────────────────────────────

function PublishSection({
  story, validation, onSaved,
}: {
  story: StoryDetail; validation: ValidationResult; onSaved: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const { toast } = useToast();

  async function workflow(action: 'submit_review' | 'revert_to_draft' | 'publish' | 'unpublish') {
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/comics/${story.id}/workflow`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      const d = await res.json();
      if (!res.ok) {
        if (d.issues) {
          toast({
            title: 'Cannot publish yet',
            description: d.issues.map((i: ValidationIssue) => i.message).join(' · '),
            variant: 'destructive',
          });
        } else {
          throw new Error(d.error || 'Failed');
        }
        return;
      }
      const labels: Record<string, string> = {
        submit_review: 'Submitted for review',
        revert_to_draft: 'Moved back to draft',
        publish: 'Story is now live',
        unpublish: 'Unpublished — hidden from the library',
      };
      toast({ title: labels[action] });
      onSaved();
    } catch (e) {
      toast({ title: 'Error', description: e instanceof Error ? e.message : 'Failed', variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4 p-4">
      {/* Current status */}
      <div className="rounded-2xl border border-border bg-card p-4">
        <div className="flex items-center gap-3">
          <div className={cn(
            'flex h-10 w-10 items-center justify-center rounded-full',
            story.status === 'published' ? 'bg-emerald-500/20' : story.status === 'review' ? 'bg-amber-500/20' : 'bg-white/10',
          )}>
            {story.status === 'published' ? <CheckCircle2 className="h-5 w-5 text-emerald-400" />
              : story.status === 'review' ? <AlertCircle className="h-5 w-5 text-amber-400" />
              : <FileText className="h-5 w-5 text-white/60" />}
          </div>
          <div className="flex-1">
            <p className="text-sm font-bold text-white">{STATUS_BADGE[story.status].label}</p>
            <p className="text-xs text-muted-foreground">
              {story.publishedAt ? `Published ${new Date(story.publishedAt).toLocaleString()}` : 'Not yet visible to readers.'}
            </p>
          </div>
        </div>
        {/* Workflow step indicator */}
        <div className="mt-3 flex items-center gap-1 text-[10px]">
          {(['draft', 'review', 'published'] as StoryStatus[]).map((s, i) => {
            const active = story.status === s;
            const passed = ['draft', 'review', 'published'].indexOf(story.status) >= i;
            return (
              <div key={s} className="flex flex-1 items-center gap-1">
                <div className={cn(
                  'flex h-5 items-center rounded-full px-2 font-bold uppercase tracking-wide',
                  active ? 'bg-saffron text-white' : passed ? 'bg-emerald-500/20 text-emerald-300' : 'bg-white/5 text-white/30',
                )}>
                  {s}
                </div>
                {i < 2 && <div className={cn('h-px flex-1', passed ? 'bg-emerald-500/40' : 'bg-white/10')} />}
              </div>
            );
          })}
        </div>
      </div>

      {/* Readiness checklist */}
      <div className="rounded-2xl border border-border bg-card p-4">
        <h3 className="mb-3 text-sm font-bold text-white">Publish Readiness</h3>
        {validation.checks.length === 0 ? (
          <p className="text-sm text-muted-foreground">No checks run.</p>
        ) : (
          <ul className="space-y-1.5">
            {validation.checks.map((c, i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                {c.ok ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                  : <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" />}
                <div className="min-w-0 flex-1">
                  <span className={c.ok ? 'text-white' : 'text-rose-200'}>{c.label}</span>
                  {c.detail && <span className="ml-1 text-xs text-white/40">— {c.detail}</span>}
                </div>
              </li>
            ))}
          </ul>
        )}
        {validation.issues.length > 0 && (
          <div className="mt-3 rounded-lg bg-rose-500/10 p-3 ring-1 ring-rose-500/20">
            <p className="text-xs font-bold text-rose-300">Blocking issues:</p>
            <ul className="mt-1 list-disc pl-4 text-xs text-rose-200">
              {validation.issues.map((iss, i) => <li key={i}>{iss.message}</li>)}
            </ul>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="rounded-2xl border border-border bg-card p-4">
        <h3 className="mb-3 text-sm font-bold text-white">Workflow Actions</h3>
        <div className="flex flex-wrap gap-2">
          {story.status === 'draft' && (
            <button
              onClick={() => workflow('submit_review')}
              disabled={busy}
              className="flex items-center gap-1.5 rounded-lg bg-amber-500/15 px-3 py-2 text-sm font-medium text-amber-300 ring-1 ring-amber-500/30 hover:bg-amber-500/25 disabled:opacity-50"
            >
              <ArrowUp className="h-4 w-4" /> Submit for Review
            </button>
          )}
          {story.status === 'review' && (
            <button
              onClick={() => workflow('revert_to_draft')}
              disabled={busy}
              className="flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-2 text-sm font-medium text-white ring-1 ring-white/15 hover:bg-white/15 disabled:opacity-50"
            >
              <ArrowDown className="h-4 w-4" /> Back to Draft
            </button>
          )}
          {story.status !== 'published' && (
            <button
              onClick={() => workflow('publish')}
              disabled={busy || !validation.ok}
              className="flex items-center gap-1.5 rounded-lg bg-emerald-500/20 px-3 py-2 text-sm font-medium text-emerald-300 ring-1 ring-emerald-500/40 hover:bg-emerald-500/30 disabled:opacity-50"
              title={validation.ok ? 'Publish to the public library' : 'Resolve blocking issues first'}
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Rocket className="h-4 w-4" />}
              Publish
            </button>
          )}
          {story.status === 'published' && (
            <button
              onClick={() => workflow('unpublish')}
              disabled={busy}
              className="flex items-center gap-1.5 rounded-lg bg-rose-500/15 px-3 py-2 text-sm font-medium text-rose-300 ring-1 ring-rose-500/30 hover:bg-rose-500/25 disabled:opacity-50"
            >
              <ArrowDown className="h-4 w-4" /> Unpublish
            </button>
          )}
          <button
            onClick={() => setShowPreview(true)}
            className="ml-auto flex items-center gap-1.5 rounded-lg border border-border bg-background/40 px-3 py-2 text-sm font-medium text-white hover:bg-white/5"
          >
            <Eye className="h-4 w-4" /> Preview
          </button>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Publishing validates the title, testament, Bible references, cover artwork, and every page
          asset — broken or missing artwork can never be published. Only published stories with valid
          artwork appear in the public Comic Bible library.
        </p>
      </div>

      {showPreview && <StoryPreviewDialog story={story} onClose={() => setShowPreview(false)} />}
    </div>
  );
}

function StoryPreviewDialog({ story, onClose }: { story: StoryDetail; onClose: () => void }) {
  // Reuse the public reader's view model so admins preview exactly what readers see.
  const pages = [...story.pages].sort((a, b) => a.pageNumber - b.pageNumber);
  const [idx, setIdx] = useState(0);
  // Simple sequential preview (one asset per step) — full spread-aware reader
  // lives in ComicReader; here we just show the assets in reading order.
  const current = pages[idx];

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black" onClick={onClose}>
      <div className="flex items-center justify-between p-3" onClick={(e) => e.stopPropagation()}>
        <div>
          <p className="text-sm font-bold text-white">{story.title}</p>
          <p className="text-xs text-white/50">Preview · asset {idx + 1} of {pages.length}</p>
        </div>
        <button onClick={onClose} className="rounded-lg p-1.5 text-white/60 hover:bg-white/10 hover:text-white">
          <X className="h-5 w-5" />
        </button>
      </div>
      <div className="flex flex-1 items-center justify-center px-4 pb-4" onClick={(e) => e.stopPropagation()}>
        {current ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={current.imagePath}
            alt={`Page ${current.pageNumber}`}
            className="max-h-full max-w-full object-contain"
          />
        ) : (
          <p className="text-white/50">No pages to preview.</p>
        )}
      </div>
      {pages.length > 1 && (
        <div className="flex items-center justify-center gap-4 p-3" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => setIdx((i) => Math.max(0, i - 1))}
            disabled={idx === 0}
            className="rounded-lg bg-white/10 px-3 py-1.5 text-sm text-white disabled:opacity-30"
          >
            ← Prev
          </button>
          <span className="text-xs text-white/50">Page {current?.pageNumber ?? '—'}</span>
          <button
            onClick={() => setIdx((i) => Math.min(pages.length - 1, i + 1))}
            disabled={idx === pages.length - 1}
            className="rounded-lg bg-white/10 px-3 py-1.5 text-sm text-white disabled:opacity-30"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}

// ── Shared UI helpers ──────────────────────────────────────────────────────

const inputCls = 'w-full rounded-lg border border-border bg-background/40 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-saffron focus:outline-none';
const textareaCls = 'w-full rounded-lg border border-border bg-background/40 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-saffron focus:outline-none resize-y';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center py-12">
      <Loader2 className="h-6 w-6 animate-spin text-saffron" />
    </div>
  );
}

function ErrorState() {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <AlertCircle className="mb-2 h-8 w-8 text-rose-400" />
      <p className="text-sm text-white/60">Failed to load. Check your connection and try again.</p>
    </div>
  );
}
