'use client';

import { useState, useEffect, useMemo } from 'react';
import { Search, X, Check, Globe } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { TRANSLATIONS, type BibleTranslation } from '@/lib/bible/translations';

interface BibleTranslationPickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Currently selected translation ID. */
  currentTranslationId: string;
  /** Called when the user picks a translation. */
  onSelect: (translation: BibleTranslation) => void;
}

/**
 * Translation picker modal — matches the Koino "Choose a Bible Version"
 * screenshot. Lists all available translations grouped by language. Search
 * filters by translation name, abbreviation, or language.
 */
export function BibleTranslationPicker({
  open,
  onOpenChange,
  currentTranslationId,
  onSelect,
}: BibleTranslationPickerProps) {
  const [query, setQuery] = useState('');

  // Group translations by language.
  const groups = useMemo(() => {
    const map = new Map<string, { languageName: string; languageNative?: string; translations: BibleTranslation[] }>();
    for (const t of TRANSLATIONS) {
      const existing = map.get(t.languageCode);
      if (existing) {
        existing.translations.push(t);
      } else {
        map.set(t.languageCode, {
          languageName: t.languageName,
          languageNative: t.languageNative,
          translations: [t],
        });
      }
    }
    // Sort: English first, then alphabetical by language name.
    const arr = Array.from(map.values()).sort((a, b) => {
      if (a.languageName === 'English') return -1;
      if (b.languageName === 'English') return 1;
      return a.languageName.localeCompare(b.languageName);
    });

    // Apply search filter.
    if (!query.trim()) return arr;
    const q = query.toLowerCase().trim();
    return arr
      .map((g) => ({
        ...g,
        translations: g.translations.filter(
          (t) =>
            t.name.toLowerCase().includes(q) ||
            t.abbr.toLowerCase().includes(q) ||
            t.id.toLowerCase().includes(q) ||
            t.languageName.toLowerCase().includes(q) ||
            (t.languageNative?.toLowerCase().includes(q) ?? false) ||
            (t.nativeName?.toLowerCase().includes(q) ?? false),
        ),
      }))
      .filter((g) => g.translations.length > 0);
  }, [query]);

  function handleSelect(t: BibleTranslation) {
    onSelect(t);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md border-border bg-card p-0 sm:rounded-2xl">
        <DialogTitle className="sr-only">Choose a Bible Version</DialogTitle>

        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="text-base font-bold text-white">Choose a Bible Version</h2>
          <button
            onClick={() => onOpenChange(false)}
            className="rounded-full p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Search */}
        <div className="border-b border-border px-5 py-3">
          <div className="flex items-center gap-2 rounded-full border border-border bg-background px-3 py-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search translations or languages..."
              className="w-full bg-transparent text-sm text-white placeholder:text-muted-foreground focus:outline-none"
            />
          </div>
        </div>

        {/* List */}
        <ScrollArea className="max-h-[60vh]">
          <div className="px-5 py-3">
            {groups.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No translations match &ldquo;{query}&rdquo;.
              </p>
            ) : (
              groups.map((g) => (
                <div key={g.languageName} className="mb-4">
                  <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-saffron/80">
                    {g.languageNative ? `${g.languageNative} · ${g.languageName}` : g.languageName}
                  </h3>
                  <ul className="space-y-0.5">
                    {g.translations.map((t) => {
                      const isActive = t.id === currentTranslationId;
                      return (
                        <li key={t.id}>
                          <button
                            onClick={() => handleSelect(t)}
                            className={cn(
                              'flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left transition-colors',
                              isActive
                                ? 'bg-saffron-soft text-saffron'
                                : 'hover:bg-white/5',
                            )}
                          >
                            <div className="min-w-0 flex-1">
                              <p className={cn('text-sm font-medium', isActive ? 'text-saffron' : 'text-white')}>
                                {t.nativeName || t.name}
                              </p>
                              <p className="text-[11px] text-muted-foreground">
                                {t.abbr} · {t.attribution || 'Bible text'}
                              </p>
                            </div>
                            {isActive && (
                              <span className="ml-2 flex items-center gap-1 rounded-full bg-saffron/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-saffron">
                                <Check className="h-3 w-3" /> Current
                              </span>
                            )}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))
            )}
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="border-t border-border px-5 py-3">
          <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <Globe className="h-3 w-3" />
            {TRANSLATIONS.length} translations across {groups.length} languages · Free to read
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
