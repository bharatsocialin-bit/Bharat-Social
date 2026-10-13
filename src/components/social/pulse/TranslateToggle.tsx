'use client';

import { Languages, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSocialStore } from '@/store/useSocialStore';
import { languageLabel } from '@/lib/format';
import type { Language } from '@/lib/types';

interface TranslateToggleProps {
  /** The post or report id — used as the key in the translatedPostIds set. */
  itemId: string;
  /** The original language of the item. */
  originalLanguage: Language;
  /** Whether a demonstration translation is available for this item. */
  hasTranslation: boolean;
  className?: string;
}

/**
 * Bhasha Bridge — per-post Translate toggle.
 *
 * Behaviour:
 *  - If the post is already in English, the toggle is hidden (nothing to translate to).
 *  - If a demonstration translation exists, clicking "Translate" reveals it
 *    and the toggle becomes a segmented Original / Translated switch.
 *  - If no demonstration translation exists, clicking "Translate" shows a
 *    clear inline notice explaining that the translation service is not yet
 *    configured — we never pretend a translation succeeded.
 *
 * The translated / original state is tracked per-item in the Zustand store
 * so it persists across re-renders and tab switches within a session.
 */
export function TranslateToggle({
  itemId,
  originalLanguage,
  hasTranslation,
  className,
}: TranslateToggleProps) {
  const isTranslated = useSocialStore((s) => s.translatedPostIds.has(itemId));
  const toggleTranslation = useSocialStore((s) => s.toggleTranslation);

  // English posts have nothing to translate to — hide the control entirely.
  if (originalLanguage === 'en') return null;

  if (!isTranslated) {
    return (
      <button
        type="button"
        onClick={() => toggleTranslation(itemId)}
        className={cn(
          'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium text-brand transition-colors',
          'hover:bg-brand/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          className,
        )}
        aria-label={`Translate from ${languageLabel(originalLanguage)} to English`}
      >
        <Languages className="h-3.5 w-3.5" />
        Translate
      </button>
    );
  }

  // Translated mode — show a small notice when no real translation is available,
  // otherwise let the caller render the actual translation content above us.
  return (
    <div
      className={cn(
        'flex flex-wrap items-center gap-2 rounded-full bg-muted/60 px-1.5 py-1',
        className,
      )}
    >
      {/* Segmented Original / Translated switch */}
      <div className="flex items-center rounded-full bg-background p-0.5 ring-1 ring-border" role="group" aria-label="Translation view">
        <button
          type="button"
          onClick={() => toggleTranslation(itemId)}
          className="rounded-full px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {languageLabel(originalLanguage)}
        </button>
        <button
          type="button"
          onClick={() => toggleTranslation(itemId)}
          aria-pressed={true}
          className="rounded-full bg-brand px-2.5 py-0.5 text-[11px] font-medium text-brand-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          English
        </button>
      </div>

      {!hasTranslation && (
        <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
          <Loader2 className="h-3 w-3" />
          No translation available — demonstration only.
        </span>
      )}
    </div>
  );
}
