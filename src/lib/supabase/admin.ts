/**
 * WARNING: This client bypasses Row Level Security.
 *
 * The service-role key grants unrestricted access to every table in the
 * database, ignoring all RLS policies. Use of this client in a handler
 * reachable by a user is a RLS bypass — every user can read every row.
 *
 * ALLOWED call-sites (enforced by __tests__/security/supabase-admin-scope.test.ts):
 *   - src/app/api/webhooks/**              Stripe/Twilio/Telnyx signed webhooks
 *   - scripts/**                           Migration, seed, verify tooling
 *   - src/app/api/auth/signup/**           auth.admin.createUser bootstrap
 *   - src/app/api/auth/google/callback/**  Same (OAuth user provisioning)
 *   - src/app/api/brain/bootstrap/**       DDL via RPC (CREATE TABLE IF NOT EXISTS)
 *   - src/lib/intelligence/brain-migration.ts  Consumer of bootstrap DDL
 *   - src/app/api/cron/**                  Server-only scheduled jobs
 *   - src/lib/workflows/scheduler.ts       Cross-workspace workflow-step runner (cron-invoked)
 *   - src/lib/db/queries.ts                Legacy `getDb()` admin wrapper — Phase 8 will split into admin/authed
 *   - __tests__/**                         Test harness
 *
 * FORBIDDEN call-sites:
 *   - Any user-facing route handler or server action
 *   - Any server component rendered for an end user
 *   - Any client component
 *
 * For user-facing code, use createClient() from ./server.ts (per-request
 * anon-key client that honors RLS via cookies).
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let cached: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient {
  if (cached) return cached;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "getSupabaseAdmin: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set"
    );
  }
  cached = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { headers: { "X-Client-Info": "revenue-operator-admin" } },
  });
  return cached;
}

/**
 * Reset the cached admin client. Tests only.
 */
export function __resetAdminClientForTests(): void {
  cached = null;
}

/**
 * True when the service-role admin client can be constructed (both env vars set).
 *
 * Callers that conditionally use admin access (e.g. the signup bootstrap path
 * which falls back to anon `auth.signUp` when the service role is absent) must
 * NOT reference `SUPABASE_SERVICE_ROLE_KEY` directly — the RLS scope test
 * (tests/security/supabase-admin-scope.test.ts) flags any file that both
 * names that env var AND calls `createClient(...)`. Use this helper instead.
 */
export function isSupabaseAdminAvailable(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return Boolean(url && key);
}
