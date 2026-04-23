/**
 * Phase 69 — Onboarding state machine.
 *
 * The onboarding flow has five user-facing steps that must be completed in
 * order. Rather than adding a new `onboarding_progress` table, we *derive*
 * the completion state from rows that each step actually writes — so the
 * source of truth is the artefacts the user has created, not a progress
 * flag we could drift against.
 *
 *   Step         Completion rule
 *   ----         ---------------
 *   identity     workspaces row exists  (id = workspaceId)
 *   scrape       workspaces.website is non-empty
 *                  OR workspace_knowledge has scrape_source rows
 *   agent        an agents row exists for the workspace
 *   teach        agents.knowledge_base has non-empty faq[]
 *                  OR workspace_knowledge has manual rows
 *   number       phone_configs row exists for the workspace
 *
 * The state machine exposes three things:
 *
 *   1. `getOnboardingState(workspaceId)` — full snapshot: which steps are
 *      done, which is next, whether the flow is complete, and which route
 *      to send the user to next (post-setup wayfinding).
 *
 *   2. `assertStepAllowed(workspaceId, step)` — server-side guard used by
 *      the `/api/onboarding/*` routes to refuse requests that skip ahead.
 *      e.g. calling /api/onboarding/agent before the workspace exists will
 *      return { ok: false, reason: "previous_step_incomplete", missing: [...] }.
 *
 *   3. Post-setup wayfinding — `nextRoute` on the snapshot points at the
 *      UI surface to send the user to (step page, or the overview once
 *      everything is done).
 *
 * Everything is driven off the Supabase client returned by `getDb()`. No
 * new schema is required.
 */

import { getDb } from "@/lib/db/queries";
import { ROUTES } from "@/lib/constants";

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export type OnboardingStep = "identity" | "scrape" | "agent" | "teach" | "number";

/** Canonical, ordered step list. The order defines the state machine. */
export const ONBOARDING_STEPS: readonly OnboardingStep[] = [
  "identity",
  "scrape",
  "agent",
  "teach",
  "number",
] as const;

export interface OnboardingState {
  /** Workspace id this state belongs to. */
  readonly workspaceId: string;
  /** Per-step completion status in canonical order. */
  readonly steps: ReadonlyArray<{
    readonly step: OnboardingStep;
    readonly complete: boolean;
  }>;
  /** First non-complete step, or null if everything is done. */
  readonly nextStep: OnboardingStep | null;
  /** True when every step's completion rule has been satisfied. */
  readonly isComplete: boolean;
  /**
   * Route the UI should point the user at. Steps map to
   * `/app/onboarding?step=<name>`; once complete we send them to the main
   * product surface at `/app/overview`.
   */
  readonly nextRoute: string;
  /** Fraction complete (0..1), handy for progress bars. */
  readonly progress: number;
}

export type AssertStepResult =
  | { ok: true }
  | { ok: false; reason: "previous_step_incomplete"; missing: readonly OnboardingStep[] };

// -----------------------------------------------------------------------------
// Completion detection per step — each helper returns true when the step's
// rule is satisfied. All helpers are best-effort: if a table doesn't exist
// or the query errors out, the step is treated as NOT complete so we fail
// closed (better to re-prompt than to silently skip a step).
// -----------------------------------------------------------------------------

type Db = ReturnType<typeof getDb>;

async function hasIdentity(db: Db, workspaceId: string): Promise<boolean> {
  try {
    const { data } = await db
      .from("workspaces")
      .select("id")
      .eq("id", workspaceId)
      .maybeSingle();
    return Boolean((data as { id?: string } | null)?.id);
  } catch {
    return false;
  }
}

async function hasScrape(db: Db, workspaceId: string): Promise<boolean> {
  try {
    const { data: ws } = await db
      .from("workspaces")
      .select("website")
      .eq("id", workspaceId)
      .maybeSingle();
    const website = (ws as { website?: string | null } | null)?.website;
    if (website && website.trim().length > 0) return true;
  } catch {
    /* fall through */
  }
  try {
    const { data } = await db
      .from("workspace_knowledge")
      .select("id")
      .eq("workspace_id", workspaceId)
      .eq("source", "scrape")
      .limit(1);
    const rows = Array.isArray(data) ? (data as Array<{ id?: string }>) : [];
    return rows.length > 0;
  } catch {
    return false;
  }
}

async function hasAgent(db: Db, workspaceId: string): Promise<boolean> {
  try {
    const { data } = await db
      .from("agents")
      .select("id")
      .eq("workspace_id", workspaceId)
      .limit(1);
    const rows = Array.isArray(data) ? (data as Array<{ id?: string }>) : [];
    return rows.length > 0;
  } catch {
    return false;
  }
}

async function hasTeach(db: Db, workspaceId: string): Promise<boolean> {
  // Prefer the agents.knowledge_base.faq array since that's what the agent
  // actually serves. Fall back to workspace_knowledge manual rows.
  try {
    const { data } = await db
      .from("agents")
      .select("knowledge_base")
      .eq("workspace_id", workspaceId)
      .limit(1);
    const rows = Array.isArray(data)
      ? (data as Array<{ knowledge_base?: unknown }>)
      : [];
    for (const row of rows) {
      const kb = row.knowledge_base;
      if (kb && typeof kb === "object" && "faq" in kb) {
        const faq = (kb as { faq?: unknown }).faq;
        if (Array.isArray(faq) && faq.length > 0) return true;
      }
    }
  } catch {
    /* fall through */
  }
  try {
    const { data } = await db
      .from("workspace_knowledge")
      .select("id")
      .eq("workspace_id", workspaceId)
      .eq("source", "manual")
      .limit(1);
    const rows = Array.isArray(data) ? (data as Array<{ id?: string }>) : [];
    return rows.length > 0;
  } catch {
    return false;
  }
}

async function hasNumber(db: Db, workspaceId: string): Promise<boolean> {
  // Accept EITHER a phone_configs row (the provisioning path) OR
  // workspaces.verified_phone / workspaces.phone (the activate-wizard path
  // that never inserted a phone_configs row). Without this OR, every
  // wizard-completed workspace was stuck reporting isComplete=false and
  // bouncing users back into /activate.
  try {
    const { data } = await db
      .from("phone_configs")
      .select("id")
      .eq("workspace_id", workspaceId)
      .limit(1);
    const rows = Array.isArray(data) ? (data as Array<{ id?: string }>) : [];
    if (rows.length > 0) return true;
  } catch {
    /* fall through to workspaces columns */
  }
  try {
    const { data: ws } = await db
      .from("workspaces")
      .select("phone, verified_phone")
      .eq("id", workspaceId)
      .maybeSingle();
    const row = ws as { phone?: string | null; verified_phone?: string | null } | null;
    const phone = (row?.verified_phone ?? row?.phone ?? "").toString().trim();
    return phone.length > 0;
  } catch {
    return false;
  }
}

const COMPLETION_CHECKS: Record<
  OnboardingStep,
  (db: Db, workspaceId: string) => Promise<boolean>
> = {
  identity: hasIdentity,
  scrape: hasScrape,
  agent: hasAgent,
  teach: hasTeach,
  number: hasNumber,
};

// -----------------------------------------------------------------------------
// Public API
// -----------------------------------------------------------------------------

function routeForStep(step: OnboardingStep | null): string {
  // Post-setup wayfinding targets the canonical logged-in home. Hard-coding
  // "/app/overview" here (as the first cut of Phase 69 did) broke users
  // because that route does not exist — they'd land on a 404 right after
  // completing onboarding. ROUTES.APP_HOME is the single source of truth.
  if (step === null) return ROUTES.APP_HOME;
  return `/app/onboarding?step=${step}`;
}

/**
 * Derive the full onboarding state from DB rows.
 */
export async function getOnboardingState(
  workspaceId: string,
): Promise<OnboardingState> {
  const db = getDb();
  const flags = await Promise.all(
    ONBOARDING_STEPS.map((step) => COMPLETION_CHECKS[step](db, workspaceId)),
  );

  const steps = ONBOARDING_STEPS.map((step, i) => ({
    step,
    complete: flags[i] === true,
  }));

  const nextStep = steps.find((s) => !s.complete)?.step ?? null;
  const isComplete = nextStep === null;
  const completedCount = steps.filter((s) => s.complete).length;
  const progress = completedCount / ONBOARDING_STEPS.length;

  return {
    workspaceId,
    steps,
    nextStep,
    isComplete,
    nextRoute: routeForStep(nextStep),
    progress,
  };
}

/**
 * Guard used by /api/onboarding/<step> routes to refuse out-of-order calls.
 *
 * A step is allowed when all *strictly earlier* steps in ONBOARDING_STEPS
 * are complete. The step itself is allowed to be re-run (idempotent) — we
 * only block skipping ahead.
 */
export async function assertStepAllowed(
  workspaceId: string,
  step: OnboardingStep,
): Promise<AssertStepResult> {
  const stepIdx = ONBOARDING_STEPS.indexOf(step);
  if (stepIdx < 0) {
    return { ok: false, reason: "previous_step_incomplete", missing: [] };
  }
  if (stepIdx === 0) return { ok: true };

  const db = getDb();
  const earlier = ONBOARDING_STEPS.slice(0, stepIdx);
  const flags = await Promise.all(
    earlier.map((s) => COMPLETION_CHECKS[s](db, workspaceId)),
  );
  const missing = earlier.filter((_s, i) => flags[i] !== true);
  if (missing.length === 0) return { ok: true };
  return { ok: false, reason: "previous_step_incomplete", missing };
}

/** Exposed for testing — counts checks, not DB rows. */
export const ONBOARDING_STEP_COUNT = ONBOARDING_STEPS.length;
