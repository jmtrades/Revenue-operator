/**
 * Phase 69 — /app/onboarding server redirect.
 *
 * The canonical new-user setup wizard lives at `/activate`. Historically this
 * route hosted a ~985-line duplicate client wizard that diverged from
 * `/activate` (different voice catalog, different step model, no
 * starter-knowledge integration) and then just redirected via
 * `window.location.href` in a useEffect — causing a visible flicker.
 *
 * We now resolve wayfinding server-side using the onboarding state machine:
 *
 *   - unauthenticated      → /activate (entry point of the real wizard)
 *   - no workspace yet     → /activate (owner_id lookup missed)
 *   - setup complete       → /app/overview  (post-setup wayfinding)
 *   - setup incomplete     → /activate (continue the wizard where they left off)
 *
 * Any `?step=` or other search params are forwarded so deep-links survive
 * the redirect.
 */

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSessionFromCookie } from "@/lib/auth/session";
import { getDb } from "@/lib/db/queries";
import { getOnboardingState } from "@/lib/onboarding/state-machine";
import { log } from "@/lib/logger";

export const dynamic = "force-dynamic";

type SearchParams = Record<string, string | string[] | undefined>;

function buildQuery(params: SearchParams): string {
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined) continue;
    if (Array.isArray(value)) {
      for (const v of value) qs.append(key, v);
    } else {
      qs.set(key, value);
    }
  }
  const s = qs.toString();
  return s ? `?${s}` : "";
}

async function resolveUserId(): Promise<string | null> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user?.id) return user.id;
  } catch {
    /* fall through to revenue_session cookie */
  }
  try {
    const cookieStore = await cookies();
    const cookieHeader = cookieStore
      .getAll()
      .map(({ name, value }) => `${name}=${value}`)
      .join("; ");
    const session = getSessionFromCookie(cookieHeader);
    return session?.userId ?? null;
  } catch {
    return null;
  }
}

export default async function AppOnboardingPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const query = buildQuery(params);

  const userId = await resolveUserId();
  if (!userId) {
    redirect(`/activate${query}`);
  }

  const db = getDb();
  let workspaceId: string | null = null;
  try {
    const { data } = await db
      .from("workspaces")
      .select("id")
      .eq("owner_id", userId)
      .order("created_at", { ascending: false })
      .limit(1);
    const rows = Array.isArray(data) ? (data as Array<{ id?: string }>) : [];
    workspaceId = rows[0]?.id ?? null;
  } catch (err) {
    log("error", "onboarding.page.workspace_lookup_failed", {
      user_id: userId,
      error: err instanceof Error ? err.message : String(err),
    });
  }

  if (!workspaceId) {
    redirect(`/activate${query}`);
  }

  try {
    const state = await getOnboardingState(workspaceId);
    if (state.isComplete) {
      redirect("/app/overview");
    }
  } catch (err) {
    log("error", "onboarding.page.state_failed", {
      workspace_id: workspaceId,
      error: err instanceof Error ? err.message : String(err),
    });
  }

  // Setup still pending — send the user back into the canonical activation
  // wizard, preserving any deep-link params (e.g. ?step=agent).
  redirect(`/activate${query}`);
}
