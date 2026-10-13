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
 * BharatSocial brand mark — Ashoka Chakra-inspired SVG icon.
 *
 * A navy ring with 8 spokes (referencing the Ashoka Chakra on the Indian
 * flag) surrounding a saffron center. Used in compact spots like the
 * mobile header and collapsed sidebar.
 *
 * The whole identity flows from the CSS variables in globals.css, so to
 * rebrand you only need to change those tokens.
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="BharatSocial logo"
      className={cn('h-9 w-9', className)}
    >
      {/* Navy outer ring (the chakra wheel) */}
      <circle cx="20" cy="20" r="17" fill="none" stroke="var(--navy)" strokeWidth="2.5" />
      {/* 8 spokes radiating from the center — Ashoka Chakra inspired */}
      {Array.from({ length: 8 }).map((_, i) => {
        const angle = (i * 45 * Math.PI) / 180;
        const x1 = 20 + Math.cos(angle) * 4;
        const y1 = 20 + Math.sin(angle) * 4;
        const x2 = 20 + Math.cos(angle) * 15.5;
        const y2 = 20 + Math.sin(angle) * 15.5;
        return (
          <line
            key={i}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke="var(--navy)"
            strokeWidth="1.3"
            strokeLinecap="round"
          />
        );
      })}
      {/* Saffron center dot */}
      <circle cx="20" cy="20" r="4.5" fill="var(--saffron)" />
      {/* Small green accent ring inside the saffron dot */}
      <circle cx="20" cy="20" r="1.5" fill="var(--india-green)" />
    </svg>
  );
}

/**
 * Full horizontal BharatSocial logo image (icon + wordmark + tagline).
 *
 * Uses the uploaded community logo PNG which is a 3:1 landscape image
 * (2172×724) containing the icon, "BharatSocial" wordmark, and "One India.
 * Every Voice." tagline. Best used in wide containers like the desktop sidebar
 * and the homepage hero.
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
      src="/bharatsocial-logo.png"
      alt="BharatSocial — One India. Every Voice."
      className={cn('object-contain', className)}
      style={{ height: `${heightPx}px`, width: 'auto' }}
    />
  );
}

export function Logo({ className, withWordmark = true, wordmark = 'BharatSocial' }: LogoProps) {
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
