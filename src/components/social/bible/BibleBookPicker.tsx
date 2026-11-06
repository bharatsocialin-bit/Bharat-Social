'use client';

import { useState, useMemo } from 'react';
import { ChevronDown, BookOpen, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  BIBLE_BOOKS,
  booksByTestamentGrouped,
  type Testament,
  type BibleBook,
} from '@/lib/bible/books';

interface BibleBookPickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Currently selected book USFM ID. */
  currentBook: string;
  /** Called when the user picks a book + chapter. */
  onSelect: (book: BibleBook, chapter: number) => void;
}

/**
 * Book + chapter picker modal — matches the Koino Bible library layout.
 * Shows OT (39 books grouped by Law/History/Wisdom/Prophets) and NT (27
 * books grouped by Gospels/Acts/Epistles/Revelation) as tabs. Clicking a
 * book expands its chapter list (1..N). Clicking a chapter fires onSelect.
 */
export function BibleBookPicker({
  open,
  onOpenChange,
  currentBook,
  onSelect,
}: BibleBookPickerProps) {
  const [testament, setTestament] = useState<Testament>(() => {
    const book = BIBLE_BOOKS.find((b) => b.usfm === currentBook.toUpperCase());
    return book?.testament ?? 'OT';
  });
  const [expandedBook, setExpandedBook] = useState<string | null>(
    currentBook.toUpperCase(),
  );

  const groups = useMemo(() => booksByTestamentGrouped(testament), [testament]);

  function handleBookClick(book: BibleBook) {
    setExpandedBook((prev) => (prev === book.usfm ? null : book.usfm));
  }

  function handleChapterClick(book: BibleBook, chapter: number) {
    onSelect(book, chapter);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg border-border bg-card p-0 sm:rounded-2xl">
        <DialogTitle className="sr-only">Select a Bible book</DialogTitle>

        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="flex items-center gap-2 text-base font-bold text-white">
            <BookOpen className="h-4 w-4 text-saffron" />
            Select Book &amp; Chapter
          </h2>
          <button
            onClick={() => onOpenChange(false)}
            className="rounded-full p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Testament tabs */}
        <div className="flex border-b border-border">
          {(['OT', 'NT'] as const).map((t) => (
            <button
              key={t}
              onClick={() => {
                setTestament(t);
                setExpandedBook(null);
              }}
              className={cn(
                'flex-1 py-2.5 text-sm font-medium transition-colors',
                testament === t
                  ? 'border-b-2 border-saffron text-saffron'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {t === 'OT' ? 'Old Testament (39)' : 'New Testament (27)'}
            </button>
          ))}
        </div>

        {/* Books list */}
        <div className="max-h-[60vh] overflow-y-auto px-5 py-3">
          {groups.map(({ group, books }) => (
            <div key={group} className="mb-4">
              <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-saffron/70">
                {group}
              </h3>
              <ul className="space-y-0.5">
                {books.map((book) => {
                  const isExpanded = expandedBook === book.usfm;
                  const isCurrent = book.usfm === currentBook.toUpperCase();
                  return (
                    <li key={book.usfm}>
                      <button
                        onClick={() => handleBookClick(book)}
                        className={cn(
                          'flex w-full items-center justify-between rounded-lg px-3 py-2 text-left transition-colors',
                          isCurrent ? 'bg-saffron-soft/50' : 'hover:bg-white/5',
                        )}
                      >
                        <span className={cn('text-sm font-medium', isCurrent ? 'text-saffron' : 'text-white')}>
                          {book.name}
                        </span>
                        <span className="flex items-center gap-2 text-[11px] text-muted-foreground">
                          {book.chapters} ch
                          <ChevronDown
                            className={cn(
                              'h-3.5 w-3.5 transition-transform',
                              isExpanded && 'rotate-180',
                            )}
                          />
                        </span>
                      </button>
                      {isExpanded && (
                        <div className="grid grid-cols-8 gap-1 px-3 py-2 sm:grid-cols-10">
                          {Array.from({ length: book.chapters }, (_, i) => i + 1).map((ch) => (
                            <button
                              key={ch}
                              onClick={() => handleChapterClick(book, ch)}
                              className="flex h-8 items-center justify-center rounded-md bg-white/5 text-xs font-medium text-white/80 transition-colors hover:bg-saffron hover:text-white"
                            >
                              {ch}
                            </button>
                          ))}
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
