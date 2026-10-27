import { cn } from '@/lib/utils';

interface LogoProps {
  /** Tailwind text-size class, e.g. "text-2xl". */
  className?: string;
  /** Whether to show the wordmark next to the mark. */
  withWordmark?: boolean;
  /** Override the wordmark text (useful when rebranding later). */
  wordmark?: string;
}

/**
 * Desily brand mark — a stylized "D" formed by a navy arc and a saffron
 * vertical bar, with a green accent dot. Indian-inspired geometric form
 * (lotus-petal curve + chakra dot) without copying the national flag or
 * national emblem.
 *
 * The mark uses the brand palette directly via CSS custom properties
 * declared in globals.css (--saffron, --india-green, --navy). To re-palette
 * the brand, change those tokens once in globals.css.
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Desily logo"
      className={cn('h-9 w-9', className)}
    >
      <defs>
        <linearGradient id="desily-petal-inline" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="var(--saffron)" />
          <stop offset="100%" stopColor="var(--india-green)" />
        </linearGradient>
      </defs>
      {/* Navy "D" — straight bar + curved arc */}
      <path
        d="M 8 6 L 8 34 L 14 34 L 14 6 Z M 14 6 A 14 14 0 1 1 14 34 L 14 28 A 8 8 0 1 0 14 12 Z"
        fill="var(--navy)"
      />
      {/* Saffron vertical bar (the straight stroke of the "D") */}
      <rect x="14" y="6" width="3.4" height="28" fill="var(--saffron)" />
      {/* Green accent dot inside the curve — chakra-inspired punctuation */}
      <circle cx="26" cy="20" r="3.4" fill="url(#desily-petal-inline)" />
    </svg>
  );
}

/**
 * Full horizontal Desily logo image (icon + wordmark + tagline).
 *
 * Renders the SVG lockup at /desily-logo.svg — a 3:1 landscape image
 * containing the icon, "Desily" wordmark, and "One India. Every Voice."
 * tagline. Best used in wide containers like the desktop sidebar and the
 * homepage hero.
 *
 * @param heightPx - pixel height; width auto-scales to preserve the 3:1 ratio.
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
      src="/desily-logo.svg"
      alt="Desily — One India. Every Voice."
      className={cn('object-contain', className)}
      style={{ height: `${heightPx}px`, width: 'auto' }}
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
