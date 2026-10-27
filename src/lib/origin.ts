/**
 * Resolve the PUBLIC origin of an incoming request, even when the app runs
 * behind a reverse proxy (Vercel, preview proxies, ngrok, containers...).
 *
 * Why this exists (bug seen in production, Oct 2026):
 * `request.url` inside a proxied Next.js server resolves to the INTERNAL
 * upstream address (e.g. http://localhost:3000) — using it for redirects
 * sends the user's browser to localhost, which dies with
 * ERR_CONNECTION_REFUSED on their machine.
 *
 * Proxy headers take priority (x-forwarded-host / x-forwarded-proto are set
 * by Vercel and standard preview proxies). When no proxy headers exist we
 * are on direct localhost dev access and can fall back to request.url.
 */
export function getPublicOrigin(request: Request): string {
  // Explicit override — needed in environments where the proxy forwards to
  // the app without any x-forwarded-* headers (e.g. preview proxies), which
  // would otherwise make every redirect land on http://localhost:3000.
  // Set PUBLIC_ORIGIN in the container's .env (NOT on Vercel — there the
  // forwarded headers are always present and correct).
  const override = process.env.PUBLIC_ORIGIN?.trim();
  if (override) return override.replace(/\/+$/, '');

  const forwardedHost = request.headers.get('x-forwarded-host');
  const host = (forwardedHost ?? request.headers.get('host'))?.split(',')[0]?.trim();

  if (host) {
    const forwardedProto = request.headers.get('x-forwarded-proto');
    const proto =
      forwardedProto?.split(',')[0]?.trim() ??
      (host.startsWith('localhost') || host.startsWith('127.0.0.1') || host.startsWith('[::1]')
        ? 'http'
        : 'https');
    return `${proto}://${host}`;
  }

  return new URL(request.url).origin;
}
