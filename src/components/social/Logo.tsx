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
 * + gold cross) from the shield-only source.
 *
 * Renders /lordsbook-shield.png — a 1254×1254 transparent PNG that
 * renders cleanly on both dark and light surfaces. The shield is complete
 * with the full pointed tip preserved.
 *
 * Use in: mobile header, collapsed tablet sidebar, favicon, PWA icons.
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
 * Full horizontal Lordsbook logo (shield + "LORDSBOOK" banner side-by-side).
 *
 * Renders /lordsbook-logo.png — the wide landscape lockup (2172×724)
 * from the Glossy LORDSBOOK Shield Emblem source. The shield is on the
 * LEFT and the "LORDS / BOOK" banner is on the RIGHT.
 *
 * Use in: desktop sidebar (expanded view), homepage hero, anywhere a
 * wide landscape logo with the full wordmark is appropriate.
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
      src="/lordsbook-logo.png"
      alt="Lordsbook"
      className={cn('object-contain', className)}
      style={{ height: `${heightPx}px`, width: 'auto' }}
    />
  );
}

/**
 * Full square lockup (shield on TOP + "LORDSBOOK" banner on BOTTOM).
 *
 * Renders /lordsbook-logo-stacked.png — the square stacked lockup
 * (1254×1254) from the Luminous Lordsbook Shield Emblem source. The
 * shield is stacked above the banner in a 1:1 square format.
 *
 * Use in: auth dialog (login/signup), onboarding screen, about page,
 * email headers — anywhere a square logo with the full wordmark works
 * better than a wide landscape one.
 */
export function LogoSquare({ className }: { className?: string }) {
  return (
    <img
      src="/lordsbook-logo-stacked.png"
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
