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
 * Desily brand mark — the circular chakra badge from the official Desily
 * logo (Ashoka-Chakra-inspired wheel surrounded by tricolor ribbons and
 * three "people" dots in saffron, blue, and green).
 *
 * Renders the cropped icon PNG (/desily-icon.png) so the user's actual
 * brand artwork is shown — not a vector approximation. The PNG has a
 * transparent background and renders cleanly on both dark and light surfaces.
 *
 * For tight spaces (mobile header, collapsed sidebar) use this. For wide
 * containers (desktop sidebar, hero) use <LogoFull /> which renders the
 * full lockup (icon + "Desily" wordmark + "One India. Every Voice." tagline).
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <img
      src="/desily-icon.png"
      alt="Desily logo"
      className={cn('h-9 w-9 object-contain', className)}
      // The chakra badge has transparent margins around it, so object-contain
      // keeps the full mark visible without clipping the ribbon tips.
    />
  );
}

/**
 * Full horizontal Desily logo image (icon + wordmark + tagline).
 *
 * Renders the user's official wide lockup at /desily-logo-wide.jpg — a
 * 1400×400 landscape image containing the icon, "Desily" wordmark, and
 * "One India. Every Voice." tagline. Best used in wide containers like
 * the desktop sidebar and the homepage hero.
 *
 * @param heightPx - pixel height; width auto-scales to preserve the 3.5:1 ratio.
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
      src="/desily-logo-wide.jpg"
      alt="Desily — One India. Every Voice."
      className={cn('object-contain', className)}
      style={{ height: `${heightPx}px`, width: 'auto' }}
    />
  );
}

/**
 * Full square lockup (icon + wordmark + tagline stacked vertically).
 * Use in large square containers like auth dialogs, onboarding screens,
 * or about pages. Renders the original 1254×1254 user-provided PNG.
 */
export function LogoSquare({ className }: { className?: string }) {
  return (
    <img
      src="/desily-logo.png"
      alt="Desily — One India. Every Voice."
      className={cn('object-contain', className)}
    />
  );
}

export function Logo({ className, withWordmark = true, wordmark = 'Desily' }: LogoProps) {
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
