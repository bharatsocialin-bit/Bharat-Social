import { cn } from '@/lib/utils';

interface LogoProps {
  /** Tailwind text-size class, e.g. "text-2xl". */
  className?: string;
  /** Whether to show the wordmark next to the mark. */
  withWordmark?: boolean;
  /** Override the wordmark text. */
  wordmark?: string;
}

/**
 * Lordsbook brand mark — the shield emblem (blue border + silver interior
 * + gold cross) cropped from the official Lordsbook logo.
 *
 * Renders /lordsbook-shield.png — a transparent PNG that renders cleanly
 * on both dark and light surfaces. The shield has a flat bottom (the
 * pointed tip is hidden behind the banner in the source logo and cannot
 * be cleanly extracted); this is standard for shield logos in compact UI.
 *
 * For tight spaces (mobile header, collapsed sidebar) use this. For wide
 * containers (desktop sidebar, hero) use <LogoFull />.
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <img
      src="/lordsbook-shield.png"
      alt="Lordsbook logo"
      className={cn('h-9 w-9 object-contain', className)}
    />
  );
}

/**
 * Full horizontal Lordsbook logo image (shield + "LORDSBOOK" banner).
 *
 * Renders the user's official wide lockup at /lordsbook-logo.png — the
 * original 1254×1254 square logo containing both the shield emblem and
 * the "LORDS / BOOK" banner. Best used in auth dialogs, onboarding
 * screens, OG/Twitter cards, and about pages where the full brand lockup
 * is appropriate.
 */
export function LogoFull({
  className,
  heightPx = 40,
}: {
  className?: string;
  heightPx?: number;
}) {
  return (
    <img
      src="/lordsbook-shield.png"
      alt="Lordsbook"
      className={cn('object-contain', className)}
      style={{ height: `${heightPx}px`, width: 'auto' }}
    />
  );
}

/**
 * Full square lockup (shield + banner). Use in large square containers
 * like auth dialogs, onboarding screens, or about pages. Renders the
 * original 1254×1254 user-provided PNG.
 */
export function LogoSquare({ className }: { className?: string }) {
  return (
    <img
      src="/lordsbook-logo.png"
      alt="Lordsbook"
      className={cn('object-contain', className)}
    />
  );
}

export function Logo({ className, withWordmark = true, wordmark = 'Lordsbook' }: LogoProps) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <LogoMark className="h-9 w-9" />
      {withWordmark && (
        <span className="font-bold tracking-tight text-white text-xl">
          {wordmark}
        </span>
      )}
    </div>
  );
}
