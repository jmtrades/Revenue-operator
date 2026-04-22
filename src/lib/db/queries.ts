/**
 * Revenue Operator — Database queries.
 *
 * Uses the `revenue_operator` schema. Unsafe-write guard is on by default in
 * production unless `DISABLE_UNSAFE_WRITE_GUARD=true`; outside production,
 * opt in with `ENABLE_UNSAFE_WRITE_GUARD=true`.
 *
 * SECURITY NOTE (Phase 2 remediation):
 *
 * `getDb()` returns a SERVICE-ROLE (RLS-bypass) client. Historically, this was
 * implicit — every call site that imported `getDb` was silently bypassing RLS,
 * which is a D1 RLS-bypass footgun.
 *
 * Phase 2 narrowed the *construction* site to `@/lib/supabase/admin` (enforced
 * by `__tests__/security/supabase-admin-scope.test.ts`), so there is a single
 * audited factory. Phase 8 (RLS audit) will split this into:
 *
 *   - `getDbAdmin()`: explicit admin access for webhooks, cron, migrations
 *   - `getDbAuthed()`: cookie-bound per-request client for user-facing handlers
 *
 * Until Phase 8 lands, treat every `getDb()` caller as holding an admin client
 * and audit query scoping by hand (`.eq('workspace_id', ...)`, etc.).
 */

import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { wrapSchemaForGuards } from "@/lib/safety/unsafe-write-guard";

function shouldEnableUnsafeWriteGuard(): boolean {
  if (process.env.NODE_ENV === "production") {
    return process.env.DISABLE_UNSAFE_WRITE_GUARD !== "true";
  }
  return process.env.ENABLE_UNSAFE_WRITE_GUARD === "true";
}

export function getDb() {
  const client = getSupabaseAdmin();
  const schema = client.schema("revenue_operator");
  if (shouldEnableUnsafeWriteGuard()) {
    return wrapSchemaForGuards(schema);
  }
  return schema;
}
