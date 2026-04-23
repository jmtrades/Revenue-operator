/**
 * Phase 78 Task 10.3 — /onboarding state-aware wayfinding.
 *
 * This route used to be a 5-line unconditional `redirect("/activate")` —
 * a returning user with a fully-provisioned workspace who hit /onboarding
 * (stale email link, bookmark, shared URL) got bounced back into the
 * activation wizard's "set up your AI" pitch instead of their dashboard.
 *
 * Now we consult the onboarding state machine server-side and branch:
 *
 *   - unauthenticated        → /activate (entry point of the real wizard)
 *   - no workspace yet       → /activate (owner_id lookup missed)
 *   - setup complete         → ROUTES.APP_HOME (/app/dashboard)
 *   - setup incomplete       → /activate (continue the wizard where they
 *                               left off — the wizard itself jumps to the
 *                               correct step based on its own state)
 *
 * This mirrors the logic at `src/app/app/onboarding/page.tsx` (Phase 69)
 * so both onboarding entry points behave identically.
 *
 * `?step=` and other search params are forwarded so deep-links survive.
 */

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSessionFromCookie } from "@/lib/auth/session";
import { getDb } from "@/lib/db/queries";
import { getOnboardingState } from "@/lib/onboarding/state-machine";
import { ROUTES } from "@/lib/constants";
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

export default async function OnboardingPage({
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
      redirect(ROUTES.APP_HOME);
    }
  } catch (err) {
    log("error", "onboarding.page.state_failed", {
      workspace_id: workspaceId,
      error: err instanceof Error ? err.message : String(err),
    });
  }

  // Setup still pending — send the user back into the canonical activation
  // wizard, preserving any deep-link params (e.g. ?step=agent). The wizard
  // itself jumps the user to the correct step based on its internal state.
  redirect(`/activate${query}`);
}
