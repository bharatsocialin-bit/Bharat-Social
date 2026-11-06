'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  BookImage, Search, Loader2, BookOpen, Bookmark, ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { ComicReader } from './ComicReader';

// ── Types ──────────────────────────────────────────────────────────────────

interface ComicStory {
  id: string;
  title: string;
  testament: string;
  category: string;
  bibleBook: string | null;
  bibleChapter: number | null;
  bibleVerse: number | null;
  coverImagePath: string | null;
  description: string | null;
  isKidsFriendly: boolean;
  ageGroup: string | null;
  pageLayout: string;
  pageCount: number;
  readingProgress: number | null;
  bookmarked: boolean;
}

type Tab = 'all' | 'OT' | 'NT' | 'kids';

// ── Component ──────────────────────────────────────────────────────────────

export function ComicBibleView() {
  const [stories, setStories] = useState<ComicStory[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('all');
  const [search, setSearch] = useState('');
  const [readerStoryId, setReaderStoryId] = useState<string | null>(null);

  const loadStories = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (tab === 'OT') params.set('testament', 'OT');
    if (tab === 'NT') params.set('testament', 'NT');
    if (tab === 'kids') params.set('kids', '1');
    if (search) params.set('search', search);
    try {
      const res = await fetch(`/api/comics?${params}`);
      if (res.ok) {
        const data = await res.json();
        setStories(data.stories || []);
      }
    } catch {
      // Non-fatal.
    } finally {
      setLoading(false);
    }
  }, [tab, search]);

  useEffect(() => {
    const timer = setTimeout(loadStories, 300);
    return () => clearTimeout(timer);
  }, [loadStories]);

  // ── Render reader if a story is selected ──
  if (readerStoryId) {
    return (
      <ComicReader
        storyId={readerStoryId}
        onClose={() => {
          setReaderStoryId(null);
          // Refresh stories to update progress.
          void loadStories();
        }}
      />
    );
  }

  return (
    <div className="min-h-full">
      {/* Hero banner */}
      <div className="relative overflow-hidden border-b border-border bg-gradient-to-br from-[#1a0a2e] via-[#16213e] to-[#0B2545]">
        <div className="relative z-10 px-4 py-8 sm:px-6 sm:py-12">
          <h1 className="flex items-center gap-2 text-2xl font-bold text-white sm:text-3xl">
            <BookImage className="h-7 w-7 text-saffron" />
            Lordsbook Comic Bible
          </h1>
          <p className="mt-1 text-lg font-semibold text-saffron sm:text-xl">
            The Bible in Graphic Stories
          </p>
          <p className="mt-2 max-w-xl text-sm text-white/70">
            Experience God&rsquo;s Word through powerful illustrated comics — for all ages.
          </p>
        </div>
      </div>

      {/* Filter tabs + search */}
      <div className="sticky top-0 z-10 border-b border-border bg-card/95 px-4 py-3 backdrop-blur">
        <div className="flex flex-wrap items-center gap-2">
          {([
            { key: 'all', label: 'All Stories' },
            { key: 'OT', label: 'Old Testament' },
            { key: 'NT', label: 'New Testament' },
            { key: 'kids', label: 'For Kids' },
          ] as const).map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={cn(
                'rounded-full px-4 py-1.5 text-xs font-medium transition-colors',
                tab === key
                  ? 'bg-saffron text-white'
                  : 'bg-white/5 text-white/60 hover:bg-white/10',
              )}
            >
              {label}
            </button>
          ))}
          <div className="ml-auto flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1.5">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search stories..."
              className="w-32 bg-transparent text-sm text-white placeholder:text-muted-foreground focus:outline-none sm:w-48"
            />
          </div>
        </div>
      </div>

      {/* Story grid */}
      <div className="p-4">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-saffron" />
          </div>
        ) : stories.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
            <BookImage className="h-12 w-12 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              {search ? `No stories match "${search}".` : 'No stories published yet.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {stories.map((story) => (
              <StoryCard key={story.id} story={story} onRead={() => setReaderStoryId(story.id)} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Story Card ─────────────────────────────────────────────────────────────

function StoryCard({ story, onRead }: { story: ComicStory; onRead: () => void }) {
  const progress = story.readingProgress
    ? Math.round((story.readingProgress / Math.max(story.pageCount, 1)) * 100)
    : 0;
  const isContinue = progress > 0 && progress < 100;
  const isComplete = progress >= 100;

  return (
    <div
      onClick={onRead}
      className="group cursor-pointer overflow-hidden rounded-2xl border border-border bg-card transition-all hover:border-saffron/40 hover:shadow-lg"
    >
      {/* Cover image */}
      <div className="relative aspect-[16/10] overflow-hidden bg-background">
        {story.coverImagePath ? (
          <img
            src={story.coverImagePath}
            alt={story.title}
            className="h-full w-full object-cover transition-transform group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#1a0a2e] to-[#0B2545]">
            <BookImage className="h-10 w-10 text-white/20" />
          </div>
        )}
        {/* Testament badge */}
        <span className="absolute left-2 top-2 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-semibold text-white">
          {story.testament === 'OT' ? 'Old Testament' : 'New Testament'}
        </span>
        {/* Kids badge */}
        {story.isKidsFriendly && (
          <span className="absolute right-2 top-2 rounded-full bg-saffron px-2 py-0.5 text-[10px] font-semibold text-white">
            Kids
          </span>
        )}
        {/* Reading progress bar */}
        {progress > 0 && (
          <div className="absolute inset-x-0 bottom-0 h-1 bg-black/40">
            <div
              className={cn('h-full', isComplete ? 'bg-green-500' : 'bg-saffron')}
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
      </div>

      {/* Card body */}
      <div className="p-4">
        <h3 className="text-sm font-bold text-white">{story.title}</h3>
        {story.bibleBook && (
          <p className="mt-0.5 text-xs text-saffron">
            {story.bibleBook} {story.bibleChapter}{story.bibleVerse ? `:${story.bibleVerse}` : ''}
          </p>
        )}
        {story.description && (
          <p className="mt-1.5 line-clamp-2 text-xs text-muted-foreground">{story.description}</p>
        )}
        <div className="mt-3 flex items-center justify-between">
          <span className="text-[11px] text-muted-foreground">
            {story.pageCount} {story.pageCount === 1 ? 'page' : 'pages'}
            {progress > 0 && ` · ${progress}% read`}
          </span>
          <button
            className="flex items-center gap-1 rounded-full bg-saffron/10 px-3 py-1 text-xs font-semibold text-saffron transition-colors hover:bg-saffron hover:text-white"
          >
            {isComplete ? 'Read Again' : isContinue ? 'Continue' : 'Start Reading'}
            <ChevronRight className="h-3 w-3" />
          </button>
        </div>
      </div>
    </div>
  );
}
