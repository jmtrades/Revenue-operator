/**
 * Supabase client for Revenue Operator
 * Uses revenue_operator schema. Add it to Exposed schemas in Supabase Dashboard:
 * Project Settings > API > Exposed schemas
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let _client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (_client) return _client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are required"
    );
  }
  _client = createClient(url, key);
  return _client;
}

/**
 * Server-side admin client: REMOVED.
 *
 * The previous `createServerClient()` factory silently bypassed RLS by
 * falling back to the service-role key. That is an RLS-bypass footgun in
 * any user-facing code path. Service-role access is now quarantined to
 * `src/lib/supabase/admin.ts` (see JSDoc there for sanctioned call-sites)
 * and enforced by `__tests__/security/supabase-admin-scope.test.ts`.
 *
 * Callers that legitimately need admin access should import
 * `getSupabaseAdmin` from `@/lib/supabase/admin` directly — but only if
 * their path is on the allow-list.
 */

export const SCHEMA = "revenue_operator";
