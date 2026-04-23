/**
 * Objection-outcome learning loop.
 *
 * The dynamic objection router picks a technique based on heuristics; this
 * module closes the loop by observing which (objectionType × emotion × technique)
 * combinations actually convert. Over time the weighted win-rates feed back
 * into router selection so the agent learns from its own history.
 *
 * Two layers:
 *   1. WRITE — `recordObjectionOutcome()` persists one row per objection event
 *      per call. Call this from post-call analysis with all objection events
 *      and the final outcome.
 *   2. READ  — `getTechniqueWinRates()` returns per-key win rates the router
 *      can use to re-rank its candidate responses.
 *
 * Storage: one row per (workspace, objection_event). Aggregation is computed
 * on demand; a small in-memory cache (60s TTL) keeps hot reads cheap.
 *
 * Privacy: nothing PII is stored on these rows — only structural metadata
 * (type, emotion, technique, outcome, timestamp, call_session_id).
 */

import { getDb } from "@/lib/db/queries";
import { log } from "@/lib/logger";

export type ObjectionType = "price" | "timing" | "competitor" | "authority" | "need" | "trust" | "general";
export type CallerEmotion = "frustrated" | "hesitant" | "curious" | "skeptical" | "interested";

export interface ObjectionOutcomeEvent {
  objectionType: ObjectionType;
  callerEmotion: CallerEmotion;
  /** Technique name used by the router (e.g. "feel-felt-found", "reframe-timeline"). */
  technique: string;
  /** Whether the objection was resolved in-call (caller moved forward). */
  handled: boolean;
  /** Optional per-objection sentiment shift after the response (-1..1). */
  sentimentShift?: number;
}

/**
 * Record all objection events + final outcome for one call in a single batch.
 * Idempotent if the caller passes the same call_session_id — we clear prior
 * rows for this session before inserting (so re-runs of post-call analysis
 * don't duplicate).
 */
export async function recordCallObjectionOutcomes(params: {
  workspaceId: string;
  callSessionId: string;
  events: ObjectionOutcomeEvent[];
  finalOutcome: string;
}): Promise<{ ok: boolean; inserted: number }> {
  const { workspaceId, callSessionId, events, finalOutcome } = params;
  if (events.length === 0) return { ok: true, inserted: 0 };

  const db = getDb();

  // Clear prior rows for this session for idempotency
  try {
    await db
      .from("objection_outcomes")
      .delete()
      .eq("workspace_id", workspaceId)
      .eq("call_session_id", callSessionId);
  } catch {
    // Table may not exist yet — swallow.
  }

  const rows = events.map((e) => ({
    workspace_id: workspaceId,
    call_session_id: callSessionId,
    objection_type: e.objectionType,
    caller_emotion: e.callerEmotion,
    technique: e.technique,
    handled: e.handled,
    sentiment_shift: e.sentimentShift ?? null,
    final_call_outcome: finalOutcome,
    recorded_at: new Date().toISOString(),
  }));

  try {
    const { error } = await db.from("objection_outcomes").insert(rows);
    if (error) {
      log("warn", "objection_outcomes.insert_failed", { error: error.message, workspaceId, callSessionId });
      return { ok: false, inserted: 0 };
    }
    // Invalidate cache on successful write
    cacheClear();
    return { ok: true, inserted: rows.length };
  } catch (err) {
    log("warn", "objection_outcomes.unexpected", {
      workspaceId,
      error: err instanceof Error ? err.message : String(err),
    });
    return { ok: false, inserted: 0 };
  }
}

export interface TechniqueWinRate {
  technique: string;
  handled: number;
  total: number;
  handleRate: number;
  /** Correlation with a winning final outcome (booked/callback/sold). */
  winRate: number;
  /** Expected impact score (0-1) — we blend handle rate and win rate. */
  score: number;
}

const CACHE_TTL_MS = 60_000;
type CacheEntry = { ts: number; data: TechniqueWinRate[] };
const winRateCache = new Map<string, CacheEntry>();

function cacheClear(): void {
  winRateCache.clear();
}

const WIN_OUTCOMES = new Set([
  "booked",
  "appointment_scheduled",
  "callback_scheduled",
  "sold",
  "closed_won",
  "qualified",
]);

/**
 * Return per-technique win rates for the given (type, emotion) pair over the
 * last 90 days. Used by the objection router to rank candidate techniques.
 *
 * Returned list is sorted by `score` descending. Techniques with fewer than
 * `minSamples` observations are omitted so we don't overfit on noise.
 */
export async function getTechniqueWinRates(params: {
  workspaceId: string;
  objectionType: ObjectionType;
  callerEmotion: CallerEmotion;
  minSamples?: number;
  windowDays?: number;
}): Promise<TechniqueWinRate[]> {
  const { workspaceId, objectionType, callerEmotion } = params;
  const minSamples = params.minSamples ?? 5;
  const windowDays = params.windowDays ?? 90;
  const cacheKey = `${workspaceId}:${objectionType}:${callerEmotion}:${minSamples}:${windowDays}`;

  const cached = winRateCache.get(cacheKey);
  if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
    return cached.data;
  }

  const since = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000).toISOString();
  const db = getDb();

  try {
    const { data, error } = await db
      .from("objection_outcomes")
      .select("technique, handled, final_call_outcome")
      .eq("workspace_id", workspaceId)
      .eq("objection_type", objectionType)
      .eq("caller_emotion", callerEmotion)
      .gte("recorded_at", since)
      .limit(10_000);

    if (error) {
      log("warn", "objection_outcomes.read_failed", { error: error.message });
      return [];
    }

    const rows = (data ?? []) as Array<{
      technique: string;
      handled: boolean;
      final_call_outcome: string;
    }>;

    const agg = new Map<string, { handled: number; total: number; wins: number }>();
    for (const r of rows) {
      const prev = agg.get(r.technique) ?? { handled: 0, total: 0, wins: 0 };
      prev.total += 1;
      if (r.handled) prev.handled += 1;
      if (WIN_OUTCOMES.has((r.final_call_outcome ?? "").toLowerCase())) prev.wins += 1;
      agg.set(r.technique, prev);
    }

    const results: TechniqueWinRate[] = [];
    for (const [technique, v] of agg) {
      if (v.total < minSamples) continue;
      const handleRate = v.handled / v.total;
      const winRate = v.wins / v.total;
      // Blend: handleRate weighted slightly higher because in-call resolution
      // is a causal signal; final outcome can be noisier (many confounders).
      const score = handleRate * 0.6 + winRate * 0.4;
      results.push({ technique, handled: v.handled, total: v.total, handleRate, winRate, score });
    }

    results.sort((a, b) => b.score - a.score);
    winRateCache.set(cacheKey, { ts: Date.now(), data: results });
    return results;
  } catch (err) {
    log("warn", "objection_outcomes.unexpected_read", {
      workspaceId,
      error: err instanceof Error ? err.message : String(err),
    });
    return [];
  }
}

/**
 * Convenience helper: given a candidate set of techniques the router is
 * considering, return them re-ranked by historical win rate. Techniques not
 * yet observed keep their original position (prior = uniform).
 *
 * Pure function — no DB call. Pass the win-rate table from getTechniqueWinRates.
 */
export function rerankTechniques(candidates: string[], winRates: TechniqueWinRate[]): string[] {
  if (winRates.length === 0) return candidates;
  const scoreByTechnique = new Map(winRates.map((w) => [w.technique, w.score]));
  return [...candidates].sort((a, b) => {
    const sa = scoreByTechnique.get(a);
    const sb = scoreByTechnique.get(b);
    // Unseen → 0.5 prior (neutral)
    const va = sa ?? 0.5;
    const vb = sb ?? 0.5;
    return vb - va;
  });
}
