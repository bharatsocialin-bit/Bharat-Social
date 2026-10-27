import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * Server-side Supabase clients for Supabase Auth (migration gate G7).
 *
 * Two flavors:
 *
 * 1. getSupabaseAuthClient() — plain anon client with storage disabled.
 *    Used for password grants (signInWithPassword) inside the NextAuth
 *    credentials provider and for signUp in the register route. No cookies,
 *    no session persistence — each call is stateless.
 *
 * 2. getSupabaseRouteClient() — cookie-aware client used in the OAuth
 *    start/callback routes so that the PKCE code verifier survives the
 *    round-trip to Supabase/Google. Lives in
 *    src/lib/supabase/route-client.ts (separate module because it imports
 *    next/headers, which is server-route-only).
 *
 * Required env vars:
 *   NEXT_PUBLIC_SUPABASE_URL      — project URL (safe to expose)
 *   NEXT_PUBLIC_SUPABASE_ANON_KEY — anon key (safe to expose; RLS applies)
 *
 * If they are missing, getSupabaseAuthClient() returns null and the auth
 * paths gracefully fall back to legacy local bcrypt verification, so the
 * app keeps working before the Supabase keys are configured.
 */

export function supabaseConfig(): { url: string; anonKey: string } | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return null;
  return { url, anonKey };
}

let authClient: SupabaseClient | null = null;

export function getSupabaseAuthClient(): SupabaseClient | null {
  const config = supabaseConfig();
  if (!config) return null;
  if (!authClient) {
    authClient = createClient(config.url, config.anonKey, {
      auth: {
        // Stateless server usage — never persist a session server-side.
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    });
  }
  return authClient;
}
